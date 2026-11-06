# Publish the extension so anyone can install it

`chrome://extensions` only manages extensions already installed — nobody can find new ones there.
People find and install extensions in the **Chrome Web Store** (also works in Edge, Brave, Opera,
Arc and other Chromium browsers). Edge users can also get it from **Microsoft Edge Add-ons** (free).

Everything to upload is in this folder:
- `live-character-voice-extension.zip` — the upload file (`make extension-zip` rebuilds it)
- `LISTING.md` — name, summary, description, category, permission reasons, privacy answers, reviewer notes
- `screenshot-1.png` … `screenshot-4.png` (1280×800) and `promo-small-440x280.png`
- Privacy policy (hosted): https://manishvk18-live-character-voice.hf.space/privacy.html

## Chrome Web Store (one-time $5, ~15 minutes, review usually takes a few days)
1. Go to https://chrome.google.com/webstore/devconsole and sign in with the Google account that
   should own it. Accept the developer agreement and pay the one-time **$5** registration fee.
2. Click **New item** → upload `live-character-voice-extension.zip`.
3. **Store listing** tab: paste name, summary and description from LISTING.md; category
   *Accessibility*; language English; upload the 4 screenshots, the 440×280 promo tile; icon is
   taken from the zip.
4. **Privacy** tab: single purpose and every permission reason from LISTING.md; data usage:
   tick *Website content*; certify the three statements; privacy policy URL above.
5. **Distribution**: *Public* (anyone can find it) or *Unlisted* (only people with the link).
6. In *Test instructions*, give the reviewer an access code made for them.
7. **Submit for review.** When approved you get a public link
   `https://chromewebstore.google.com/detail/<id>` — anyone clicks **Add to Chrome**.
8. Updates: bump `version` in `extension/manifest.json`, run `make extension-zip`, upload the new
   zip under **Package**, submit. Users get it automatically.

## Microsoft Edge Add-ons (free)
https://partner.microsoft.com/dashboard/microsoftedge → register (free) → **Create new extension**
→ upload the same zip → same listing text and images → submit.

## Before going public
- Users need an engine: the hosted one (with an access code you give them) or their own.
  Without a code, the popup tells them the engine needs one.
- Everyone using the hosted engine shares it (one session at a time) and your API credit.
- Consider **Unlisted** first and share the link with clients.
