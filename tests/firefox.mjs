// Real Firefox WebDriver BiDi smoke test. Requires Node 22+ and Firefox 140+.
// All GitHub/raw requests are intercepted; no third-party hardware files needed.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const firefox = process.env.FIREFOX_BIN;
const profile = process.env.FIREFOX_PROFILE;
if (!firefox || !profile) throw new Error("Set FIREFOX_BIN and a new FIREFOX_PROFILE directory");
await mkdir(profile); // Never modify an existing browser profile.
await writeFile(`${profile}/user.js`, 'user_pref("remote.active-protocols", 1);\n');
const extensionPath = fileURLToPath(new URL("..", import.meta.url));
const base = "https://github.com/opulo-inc/hardware-github-viewer";
const rawBase = "https://raw.githubusercontent.com/opulo-inc/hardware-github-viewer";
const fixture = `<!doctype html><html><body>
<div class="react-directory-filename-column"><a class="Link--primary" href="${base}/blob/main/board.kicad_pcb">board.kicad_pcb</a></div>
<div class="react-directory-filename-column"><a class="Link--primary" href="${base}/blob/main/model.STEP">model.STEP</a></div>
<div class="container"><div class="react-blob-view-header-sticky">
<a data-testid="raw-button" href="${base}/raw/refs/heads/main/board.kicad_pcb">Raw</a>
</div><pre>Original file content</pre></div></body></html>`;
const board = `(kicad_pcb (version 20221018) (generator pcbnew)
(general (thickness 1.6)) (paper "A4")
(layers (0 "F.Cu" signal) (31 "B.Cu" signal) (44 "Edge.Cuts" user))
(setup (pad_to_mask_clearance 0)) (net 0 "")
(gr_rect (start 10 10) (end 50 35) (stroke (width 0.1) (type default))
(fill none) (layer "Edge.Cuts") (tstamp 11111111-1111-4111-8111-111111111111)))`;
const schematic = `(kicad_sch (version 20230121) (generator eeschema)
(uuid 22222222-2222-4222-8222-222222222222) (paper "A4") (lib_symbols)
(wire (pts (xy 10 10) (xy 50 10)) (stroke (width 0) (type default))
(uuid 33333333-3333-4333-8333-333333333333)) (sheet_instances (path "/" (page "1"))))`;
let socket, sequence = 0;
const pending = new Map();
const errors = [];
const rawRequests = [];
const processHandle = spawn(firefox, [...(process.env.HEADLESS === "0" ? [] : ["--headless"]), "--no-remote", "--profile", resolve(profile), "--remote-debugging-port", "0"], {stdio: ["ignore", "ignore", "pipe"]});
function call(method, params = {}) {
    const id = ++sequence;
    return new Promise((resolveCall, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timeout: ${method}`)), 20000);
        pending.set(id, {resolve: value => {clearTimeout(timer); resolveCall(value);}, reject: error => {clearTimeout(timer); reject(error);}});
        socket.send(JSON.stringify({id, method, params}));
    });
}
const delay = ms => new Promise(resolveDelay => setTimeout(resolveDelay, ms));
try {
    const endpoint = await new Promise((resolveEndpoint, reject) => {
        const timer = setTimeout(() => reject(new Error("Firefox startup timeout")), 20000);
        processHandle.once("error", reject);
        processHandle.once("exit", code => reject(new Error(`Firefox exited: ${code}`)));
        processHandle.stderr.on("data", data => {
            const match = String(data).match(/WebDriver BiDi listening on (ws:\/\/[^\s]+)/);
            if (match) {clearTimeout(timer); resolveEndpoint(`${match[1]}/session`);}
        });
    });
    socket = new WebSocket(endpoint);
    await new Promise(resolveOpen => socket.addEventListener("open", resolveOpen, {once: true}));
    socket.addEventListener("message", async event => {
        const message = JSON.parse(event.data);
        if (message.id) {
            const request = pending.get(message.id);
            pending.delete(message.id);
            if (message.type === "error") request?.reject(new Error(JSON.stringify(message)));
            else request?.resolve(message.result);
        } else if (message.method === "log.entryAdded") {
            if (message.params.level === "error") errors.push(message.params.text);
        } else if (message.method === "network.beforeRequestSent" && message.params.isBlocked) {
            const {request} = message.params;
            const isRaw = request.url.startsWith(rawBase);
            if (isRaw) rawRequests.push(request.url);
            try {
                await call("network.provideResponse", {
                    request: request.request, statusCode: 200,
                    headers: [
                        {name: "Content-Type", value: {type: "string", value: isRaw ? "text/plain" : "text/html"}},
                        {name: "Access-Control-Allow-Origin", value: {type: "string", value: "*"}},
                        {name: "Content-Security-Policy", value: {type: "string", value: "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; frame-src 'self'; img-src 'self'; connect-src 'self' https://raw.githubusercontent.com"}},
                    ],
                    body: {type: "string", value: isRaw ? (request.url.endsWith(".kicad_sch") ? schematic : board) : fixture},
                });
            } catch (error) { errors.push(error.message); }
        }
    });
    const session = await call("session.new", {capabilities: {alwaysMatch: {acceptInsecureCerts: true}}});
    console.log(`Firefox ${session.capabilities.browserVersion}`);
    await call("session.subscribe", {events: ["log.entryAdded", "network.beforeRequestSent"]});
    await call("network.addIntercept", {phases: ["beforeRequestSent"], urlPatterns: [
        {type: "pattern", protocol: "https", hostname: "github.com"},
        {type: "pattern", protocol: "https", hostname: "raw.githubusercontent.com"},
    ]});
    console.log("Installed", await call("webExtension.install", {extensionData: {type: "path", path: extensionPath}}));
    const {contexts} = await call("browsingContext.getTree");
    const context = contexts[0].context;
    async function evaluate(expression, target = context) {
        const result = await call("script.evaluate", {expression, target: {context: target}, awaitPromise: true});
        assert.equal(result.type, "success", JSON.stringify(result));
        return result.result.value;
    }
    async function until(expression, target = context) {
        for (let i = 0; i < 100; i++) {
            if (await evaluate(expression, target)) return;
            await delay(100);
        }
        throw new Error(`Condition not reached: ${expression}; browser errors: ${errors.join("; ")}`);
    }
    await call("browsingContext.navigate", {context, url: `${base}/blob/main/board.kicad_pcb`, wait: "complete"});
    await until('document.querySelectorAll(".oshw-viewer-link").length === 2 && !!document.querySelector("iframe#hardware-github-viewer")');
    assert.equal(await evaluate('document.querySelectorAll("pre").length'), 1);
    console.log("PASS initial links, uppercase STEP, inline iframe, original content preserved");
    const tree = await call("browsingContext.getTree", {root: context});
    const frame = tree.contexts[0].children.find(child => child.url.startsWith("moz-extension:"));
    assert.ok(frame, JSON.stringify(tree));
    await until('!!document.querySelector("kicanvas-embed")?.shadowRoot', frame.context);
    await until(`(() => {function all(root){return [...root.querySelectorAll('*')].flatMap(e=>[e,...(e.shadowRoot?all(e.shadowRoot):[])]);}return all(document).some(e=>e.tagName==='CANVAS' && e.width>0 && e.height>0);})()`, frame.context);
    await until('document.querySelector("kicanvas-embed")?.shadowRoot.querySelector("kc-board-app")?.hidden === false', frame.context);
    assert.equal(await evaluate('document.querySelector("kicanvas-embed").shadowRoot.querySelector("kc-board-app").viewer.board.drawings.length', frame.context), 1);
    await delay(500);
    assert.ok(rawRequests.length > 0);
    console.log("PASS native KiCanvas elements and canvas rendered; public raw file fetched");
    if (process.env.SCREENSHOT_PATH) {
        const screenshot = await call("browsingContext.captureScreenshot", {context});
        await writeFile(process.env.SCREENSHOT_PATH, Buffer.from(screenshot.data, "base64"));
    }
    await evaluate(`history.pushState({}, '', '${base}/blob/main/other.kicad_pcb'); document.body.append(document.createElement('span'));`);
    await until('!document.querySelector("iframe#hardware-github-viewer")');
    await evaluate(`document.querySelector('[data-testid="raw-button"]').href='${base}/raw/refs/heads/main/other.kicad_pcb'`);
    await until('document.querySelector("iframe#hardware-github-viewer")?.src.includes("other.kicad_pcb")');
    assert.equal(await evaluate('document.querySelectorAll("iframe#hardware-github-viewer").length'), 1);
    console.log("PASS SPA navigation ignores stale Raw link and inserts one updated viewer");
    await evaluate(`history.pushState({}, '', '${base}/blob/main/circuit.kicad_sch'); document.querySelector('[data-testid="raw-button"]').href='${base}/raw/refs/heads/main/circuit.kicad_sch'`);
    await until('document.querySelector("iframe#hardware-github-viewer")?.src.includes("circuit.kicad_sch")');
    let schematicFrame;
    for (let i = 0; i < 50 && !schematicFrame; i++) {
        const currentTree = await call("browsingContext.getTree", {root: context});
        schematicFrame = currentTree.contexts[0].children.find(child => child.url.includes("circuit.kicad_sch"));
        if (!schematicFrame) await delay(100);
    }
    assert.ok(schematicFrame);
    await until('document.querySelector("kicanvas-embed")?.shadowRoot?.querySelector("kc-schematic-app")?.hidden === false', schematicFrame.context);
    console.log("PASS schematic loaded and rendered after navigation from PCB");
    await evaluate(`history.pushState({}, '', '${base}/tree/main'); document.body.append(document.createElement('span')); document.querySelector('.Link--primary').href='${base}/blob/main/README.md'`);
    await until('!document.querySelector("iframe#hardware-github-viewer") && document.querySelectorAll(".oshw-viewer-link").length === 1');
    console.log("PASS navigation removes viewer; reused directory anchor removes obsolete link");
    await evaluate(`history.pushState({}, '', '${base}/blob/main/private.kicad_pcb'); document.querySelector('[data-testid="raw-button"]').href='${base}/raw/refs/heads/main/private.kicad_pcb?token=secret'`);
    await delay(300);
    assert.equal(await evaluate('document.querySelectorAll("iframe#hardware-github-viewer").length'), 0);
    console.log("PASS private raw token not passed into frame");
    const invalidUrl = new URL(frame.url);
    invalidUrl.search = '?src=https://example.com/untrusted.kicad_pcb';
    await evaluate(`(() => {const iframe=document.createElement('iframe'); iframe.id='invalid-test'; iframe.src=${JSON.stringify(invalidUrl.href)}; document.body.append(iframe);})()`);
    let invalidFrame;
    for (let i = 0; i < 50 && !invalidFrame; i++) {
        const currentTree = await call("browsingContext.getTree", {root: context});
        invalidFrame = currentTree.contexts[0].children.find(child => child.url === invalidUrl.href);
        if (!invalidFrame) await delay(100);
    }
    assert.ok(invalidFrame);
    await until('document.getElementById("status")?.textContent.includes("Unsupported source URL")', invalidFrame.context);
    console.log("PASS untrusted source URL rejected");
    assert.deepEqual(errors, [], "Browser console errors");
    console.log("PASS no browser JavaScript errors");
    await call("session.end");
} finally {
    socket?.close();
    if (processHandle.exitCode === null) {
        const exited = new Promise(resolveExit => processHandle.once("exit", resolveExit));
        processHandle.kill("SIGTERM");
        await exited;
    }
    // Keep the dedicated profile for inspection. The caller owns its lifecycle.
}
