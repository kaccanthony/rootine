## Draft Chrome extension

The `rootine-extension` folder contains an unpacked Manifest V3 extension draft.
It runs while the Rootine dashboard is open from `localhost`, `127.0.0.1`, or
a local `.html` file. It checks the active tab's domain against an editable
whitelist and does not save URL paths, query strings, fragments, page content,
or browsing-domain history.

Continuous time on a non-whitelisted website is treated as distraction time.
Risk rises by 1% every six minutes so the counter changes gradually. A full
30-minute distraction block therefore adds 5% total and performs one random
roll against the new risk percentage. Returning to Rootine or an
allowed website stops the timer but keeps the accumulated risk. If the roll is
fatal, the popup and dashboard show the lost plant until **Start a new seed**
is selected.

To try it:

1. Open `[browser]://extensions` in a browser.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select the `rootine-extension` folder.
4. Start the Rootine server and keep `http://localhost:3000` open.
5. Visit a website, then click the Rootine extension icon to see the plant
   status or edit the whitelist.

If Chrome does not detect the local page, open the extension's **Details** page
and enable **Allow access to file URLs**.
