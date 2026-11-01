// Run KiCanvas in an extension document, where native custom elements work in
// both Firefox and Chromium without crossing a content-script/Xray boundary.
(() => {
    const status = document.getElementById("status");
    try {
        const source = new URL(new URLSearchParams(location.search).get("src"));
        if (source.origin !== "https://raw.githubusercontent.com" ||
            source.username || source.password || source.search || source.hash ||
            !/^\/[^/]+\/[^/]+\/.+\.kicad_(pcb|sch|pro)$/i.test(source.pathname)) {
            throw new Error("Unsupported source URL");
        }
        if (!customElements.get("kicanvas-embed")) {
            throw new Error("KiCanvas could not be loaded");
        }
        const viewer = document.createElement("kicanvas-embed");
        viewer.setAttribute("src", source.href);
        viewer.setAttribute("controls", "full");
        document.body.append(viewer);
        status.remove();
    } catch (error) {
        status.textContent = `Unable to open this KiCad file: ${error.message}`;
    }
})();
