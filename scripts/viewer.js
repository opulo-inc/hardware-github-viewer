(() => {
    const extension = typeof browser === "undefined" ? chrome : browser;
    const viewerId = "hardware-github-viewer";
    let lastUrl = "";
    let scheduled = false;

    function displayKiCanvas() {
        scheduled = false;
        if (lastUrl !== location.href) {
            document.getElementById(viewerId)?.remove();
            lastUrl = location.href;
        }
        if (!/^\/[^/]+\/[^/]+\/blob\/.+\.kicad_(pcb|sch|pro)$/i.test(location.pathname)) return;

        // Wait for GitHub's actual Raw link instead of guessing the branch/path
        // boundary (branch names can contain slashes), or using a fixed timeout.
        const rawLink = document.querySelector(
            '#raw-url, a[data-testid="raw-button"], .react-blob-header-edit-and-raw-actions a[href*="/raw/"]'
        );
        if (!rawLink) return;
        const raw = new URL(rawLink.href, location.href);
        if (raw.origin === "https://github.com") {
            const parts = raw.pathname.split("/");
            if (parts[3] !== "raw") return;
            parts.splice(3, 1);
            raw.hostname = "raw.githubusercontent.com";
            raw.pathname = parts.join("/");
        }
        if (raw.origin !== "https://raw.githubusercontent.com") return;
        // Do not forward private-repository tokens to a web-accessible frame.
        if (raw.search || raw.hash) return;
        // Ignore the previous page's Raw link during GitHub's partial navigation.
        const expectedPath = location.pathname.replace("/blob/", "/");
        const sourcePath = raw.pathname.replace(/^(\/[^/]+\/[^/]+)\/refs\/(heads|tags)\//, "$1/");
        if (sourcePath !== expectedPath) return;
        const frameUrl = `${extension.runtime.getURL("viewer.html")}?src=${encodeURIComponent(raw.href)}`;
        const existing = document.getElementById(viewerId);
        if (existing?.getAttribute("src") === frameUrl) return;
        existing?.remove();
        const header = rawLink.closest(".react-blob-view-header-sticky");
        const container = header?.parentElement || document.querySelector('[data-testid="file-content"], .react-code-view, .js-file');
        if (!container) return;
        const frame = document.createElement("iframe");
        frame.id = viewerId;
        frame.title = "KiCad schematic and PCB viewer";
        frame.src = frameUrl;
        frame.style.cssText = "display:block;width:100%;height:650px;border:0;";
        if (header) header.after(frame);
        else container.prepend(frame);
    }

    function schedule() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(displayKiCanvas);
    }
    new MutationObserver(schedule).observe(document, {subtree: true, childList: true, attributes: true, attributeFilter: ["href"]});
    document.addEventListener("turbo:load", schedule);
    window.addEventListener("popstate", schedule);
    schedule();
})();
