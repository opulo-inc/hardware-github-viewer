

if(document.location.href.match(/blob.+?(FCStd|step|stp|kicad_pcb|kicad_sch|kicad_pro)/) !== null) {
    console.log("trying to create KiCanvas display");

    const b = document.querySelector(`[data-target="react-app.reactRoot"]>div>div>div>div>div:last-child>div>div>div:last-child>div:last-child>div.container>div:last-child`)

    ke = document.createElement(`kicanvas-embed`);
    ke.src=document.querySelector(`.react-blob-header-edit-and-raw-actions>div>a`).href;
    ke.setAttribute('controls', 'full');
    ke.style.zIndex = "10000";
    ke.style.position = "relative";
    ke.style.top = "0px";
    ke.style.left = "0px";
    b.prepend(ke);    
}

