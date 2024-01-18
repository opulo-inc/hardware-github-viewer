# hardware-github-viewer
Chrome extension for viewing Kicad and FreeCAD files in github

## Dependencies
In Scripts you'll find a couple of dependencies: 

* `webcomponents-bundle.js`
This is from the WebComponents polyfill, because Chrome Extensions don't support WebComponents. 
More info here: 
https://github.com/webcomponents/polyfills?tab=readme-ov-file#packages

* `kiCanvas.js`
This renders the Schematic and PCB files in a Canvas. 
More info here:
https://github.com/theacodes/kicanvas