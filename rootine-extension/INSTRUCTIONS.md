## Draft Chrome extension

The `rootine-extension` folder contains an unpacked Manifest V3 extension draft.
It runs only while a local `.html` file is open in Chrome. It checks the active
tab's domain against an editable whitelist and does not save URL paths, query
strings, fragments, page content, or browsing-domain history.

To try it:

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select the `chrome-extension` folder.
4. Open `Rootine_Week1_Draft.html` directly in Chrome and keep that tab open.
5. Visit a website, then click the Rootine extension icon to see the plant
   status or edit the whitelist.

If Chrome does not detect the local page, open the extension's **Details** page
and enable **Allow access to file URLs**.
