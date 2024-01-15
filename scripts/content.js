// only supports .kicad_sch, .kicad_pcb, .FCStd .step
console.log("we're running");



function insert(){
    const mcadRegex = new RegExp('\.(FCStd|step|stp)$');
    const ecadRegex = new RegExp('\.(kicad_pcb|kicad_sch|kicad_pro)$');

    const elements = document.querySelectorAll(".react-directory-filename-column");

    // `document.querySelector` may return null if the selector doesn't match anything.
    if (elements) {
        for(var i=0; i< elements.length; i++){
            //if element has an innerhtml of one of the mcad filetypes
            console.log(elements[i].querySelector("div > h3 > div > a").innerHTML);
            console.log(mcadRegex.test(elements[i].querySelector("div > h3 > div > a").innerHTML));


            if(mcadRegex.test(elements[i].querySelector("div > h3 > div > a").innerHTML)){
                //only in here if we had a match on regex
                console.log("we got a match: ", elements[i].querySelector("div > h3 > div > a").innerHTML);

                const viewerButton = document.createElement("a");
                viewerButton.href = "https://3dviewer.net/#model=" + elements[i].querySelector("div > h3 > div > a").href;
                viewerButton.innerText = "View 3D Model";
                viewerButton.target = "_blank";

                // const mcadImage = document.createElement("img");
                // mcadImage.src = "https://cdn.shopify.com/s/files/1/0570/4256/7355/files/opulo-icon-gold-alpha.png?v=1689358351";
                // mcadImage.style.height = "16px";
                //mcadImage.src = chrome.extension.getURL('opulo.png');
                //viewerButton.appendChild(mcadImage);

                elements[i].querySelector("div > h3").insertAdjacentElement("afterend", viewerButton);
             
            }

            //if element has innerhtml of ecad filetypes
            if(ecadRegex.test(elements[i].querySelector("div > h3 > div > a").innerHTML)){
                //only in here if we had a match on regex
                console.log("we got a match: ", elements[i].querySelector("div > h3 > div > a").innerHTML);

                const viewerButton = document.createElement("a");
                viewerButton.href = "https://kicanvas.org/?github=" + elements[i].querySelector("div > h3 > div > a").href;
                viewerButton.innerText = "View PCB";
                viewerButton.target = "_blank";

                // const mcadImage = document.createElement("img");
                // mcadImage.src = "https://cdn.shopify.com/s/files/1/0570/4256/7355/files/opulo-icon-gold-alpha.png?v=1689358351";
                // mcadImage.style.height = "16px";
                //mcadImage.src = chrome.extension.getURL('opulo.png');
                //viewerButton.appendChild(mcadImage);

                elements[i].querySelector("div > h3").insertAdjacentElement("afterend", viewerButton);
             
            }

        }

    // [...document.querySelectorAll('.react-directory-filename-column')].filter(e => e.querySelector('a.Link--primary[href$=\\.kicad_sch], a.Link--primary[href$=\\.kicad_pcb]'))
            
    
    }
}

setTimeout(insert, 5000);