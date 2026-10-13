# upwords-replica

A Next.js 16 + Framer Motion rebuild of the layout of the Upword Framer template (upwords.framer.website), made as a demo.

- **Original content.** All copy, names, quotes, prices and figures are sample text written for this build (`lib/content.ts`, `lib/posts.ts`). The brand is a made-up one, "Climbwell", with its own logo mark.
- **Photos.** Public-domain (CC0) images from StockSnap via Openverse. Credits are listed in `lib/photo-credits.json` and on `/credits`.
- **Fonts.** Instrument Serif and Inter (SIL Open Font Licence), loaded with `next/font`.
- **Contact form.** A labelled demo. It sends and stores nothing.
- **Search engines.** Blocked by default (robots meta, `X-Robots-Tag` header and `robots.txt`). Set `ALLOW_INDEXING=true` once the site is on its own domain, and `SITE_URL` to that domain.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm run types
```
