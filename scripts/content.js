(() => {
    let scheduled = false;
    function insert() {
        scheduled = false;
        const elements = document.querySelectorAll(".react-directory-filename-column a.Link--primary");
        for (const element of elements) {
            const existing = element.nextElementSibling;
            const source = new URL(element.href, location.href);
            let target;
            let label;
            if (/\.(FCStd|step|stp)$/i.test(source.pathname)) {
                target = `https://3dviewer.net/#model=${source.href}`;
                label = "View 3D Model";
            } else if (/\.kicad_(pcb|sch|pro)$/i.test(source.pathname)) {
                target = `https://kicanvas.org/?github=${encodeURIComponent(source.href)}`;
                label = "View PCB";
            }
            // React can reuse a filename anchor when navigating between folders.
            if (existing?.classList.contains("oshw-viewer-link")) {
                if (existing.getAttribute("href") === target) continue;
                existing.remove();
            }
            if (!target) continue;
            const viewerButton = document.createElement("a");
            viewerButton.className = "oshw-viewer-link";
            viewerButton.target = "_blank";
            viewerButton.rel = "noopener noreferrer";
            viewerButton.style.display = "block";
            viewerButton.href = target;
            viewerButton.textContent = label;
            element.insertAdjacentElement("afterend", viewerButton);
        }
    }
    function schedule() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(insert);
    }
    new MutationObserver(schedule).observe(document.body, {
        childList: true, subtree: true, attributes: true, attributeFilter: ["href"]
    });
    schedule();
})();
