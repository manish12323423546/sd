# upwords-replica: Clarivyn Advisory site

A Next.js 16 + Framer Motion site for **Clarivyn Advisory** (Jay Modi, Ahmedabad), built on a rebuild of the Upword Framer template layout (upwords.framer.website).

- **Content.** Facts come from clarivynadvisory.com (captured 13 Oct 2026), condensed into one data module, `lib/content.ts`. Nothing is invented.
- **Images.** The photo of Jay Modi and the logo were supplied by Clarivyn. The other photos are public-domain (CC0) images from StockSnap via Openverse, credited in `lib/photo-credits.json` and on `/credits`.
- **Colours.** Taken from the Clarivyn logo: navy `#0d2440` and gold `#c9933a`, on a cream background.
- **Contact form.** Not connected yet. It sends and stores nothing, says so on screen and points people to WhatsApp.
- **Search engines.** Blocked by default. Set `ALLOW_INDEXING=true` and `SITE_URL` once the site is on its own domain.

Routes: `/`, `/about`, `/pharma`, `/clinic`, `/startups`, `/quick-services`, `/registry`, `/partner`, `/packages`, `/contact`, `/credits`.

```bash
npm install
npm run dev
npm run build && npm run types
```
