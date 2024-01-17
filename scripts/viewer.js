

function displayKiCanvas() {
    if(document.location.href.match(/blob.+?(kicad_pcb|kicad_sch|kicad_pro)/) !== null) {

        setTimeout(()=>{
            const b = document.querySelector(`[data-target="react-app.reactRoot"]>div>div>div>div>div:last-child>div>div>div:last-child>div:last-child>div.container>div:last-child`)

            ke = document.createElement(`kicanvas-embed`);
            ke.src=document.querySelector(`.react-blob-header-edit-and-raw-actions>div>a`).href;
            console.log(`Src File: ${ke.src}`);
            ke.setAttribute('controls', 'full');
            ke.style.zIndex = "10000";
            ke.style.position = "relative";
            ke.style.top = "0px";
            ke.style.left = "0px";
            b.prepend(ke);    
        },500);
    }
}

//When the URL changes, we want to rerun displayKiCanvas.
let lastUrl = location.href; 
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    onUrlChange();
  }
}).observe(document, {subtree: true, childList: true});

function onUrlChange() {
    //Remove any existing kicanvas.
    document.querySelectorAll("kicanvas-embed").forEach(e=>e.remove());

    displayKiCanvas();
}

displayKiCanvas();
