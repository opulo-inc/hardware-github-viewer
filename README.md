# hardware-github-viewer

Firefox and Chromium extension for viewing KiCad and mechanical CAD files on GitHub.

- Public `.kicad_pcb` and `.kicad_sch` files open in an inline KiCanvas viewer.
- Directory listings include KiCanvas links for KiCad files (including `.kicad_pro`),
  and 3dviewer.net links for FreeCAD, STEP and STP files.
- The original GitHub file content remains available below the viewer.

## Install for development

### Firefox (140 or later)

1. Open `about:debugging#/runtime/this-firefox`.
2. Choose **Load Temporary Add-on** and select this repository's `manifest.json`.
3. Allow access to GitHub if Firefox asks, then reload the GitHub tab.

Temporary installations disappear when Firefox exits. A normal, persistent
installation requires a Mozilla-signed package. The Gecko UUID in the manifest
is a proposed extension identifier; the upstream maintainer should confirm it
before the first signed release. Android's declared minimum is 142; Android has
not been tested.

### Chromium

Open `chrome://extensions`, enable developer mode, select **Load unpacked**, and
choose this directory. The same manifest and scripts are used by both browsers.
Chromium should ignore the Firefox-specific manifest settings; this port's
browser smoke test currently covers Firefox only.

## Implementation

KiCanvas runs in a packaged extension iframe. This gives its custom elements a
normal document context without Firefox's content-script Xray boundary or a
Web Components polyfill. No scripts are injected into GitHub's JavaScript realm.
The bundled `scripts/kicanvas.js` is unchanged.

The content scripts observe GitHub navigation and delayed file controls rather
than waiting for a fixed timeout. They use the Raw link to preserve branch names
containing slashes, ignore stale links during navigation, and avoid duplicates.

Only public raw GitHub URLs are accepted by the embedded viewer. Private raw
links containing access tokens are deliberately not forwarded to the iframe.
Private repository viewing is not supported. A project file alone may not supply
all schematics/boards needed by KiCanvas; multi-file projects and hierarchical
schematics retain the bundled viewer's limitations. WebGL2 must be available.
GitHub's page markup can change and may require selector updates.

## Data and dependencies

The inline viewer fetches the selected file from `raw.githubusercontent.com` and
renders it locally. Clicking an external viewer link passes the selected GitHub
URL to KiCanvas or 3dviewer.net. The existing KiCanvas bundle also loads its fonts
from Google Fonts (`fonts.googleapis.com` and `fonts.gstatic.com`). There is no
extension analytics backend. The Firefox manifest declares browsing activity
and website content transmission to describe these viewer interactions.

- `scripts/kicanvas.js`: bundled KiCanvas renderer; see https://kicanvas.org/.

## Validation and packaging

With Node.js 22+ and a Firefox binary, run the real-browser smoke test using a
new, dedicated profile directory (the test refuses an existing profile):

```sh
FIREFOX_BIN=/path/to/firefox FIREFOX_PROFILE=/path/to/new-test-profile \
  npm run test:firefox
```

The test installs the actual extension using WebDriver BiDi and intercepts
GitHub/raw responses with small local fixtures. It checks PCB and schematic
rendering, links, page navigation, stale Raw links, duplicate prevention, and
source URL restrictions. No test hardware repository or account is needed.
The profile is retained for inspection. Set `SCREENSHOT_PATH` to save a PNG.
For Linux environments without headless WebGL, use an existing virtual display:

```sh
HEADLESS=0 FIREFOX_BIN=/path/to/firefox FIREFOX_PROFILE=/path/to/new-test-profile \
  xvfb-run -a node tests/firefox.mjs
```

Use Mozilla's `web-ext` to lint and build a source package:

```sh
npx web-ext lint --ignore-files 'tests/**'
npx web-ext build --artifacts-dir ../hardware-viewer-artifacts \
  --ignore-files 'tests/**' 'package*.json' 'README.md'
```

The bundled KiCanvas dependency produces an existing `innerHTML` lint warning.
The ZIP is unsigned and can be loaded temporarily; it is not a signed Firefox
release. Mozilla publication and a Chromium browser regression run remain
separate release checks.
