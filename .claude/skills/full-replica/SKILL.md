---
name: full-replica
description: One command for the whole website job. Runs all four stages in order, one by one, from a URL to a live, measured site. The stages are website-capture-zip (screenshot capture), zip-to-nextjs-replica (build), deploy-website-vercel (deploy) and pagespeed-improve-deploy (PageSpeed Insights). Use when the user types /full-replica followed by a URL, asks to "run all 4 skills", or asks to "capture, build, deploy and PageSpeed" a site. Also use for requests like "recreate this site and put it live".
---

# Full replica: capture → build → deploy → PageSpeed

This command runs the four stages one by one. The detailed steps live in two skills; this command orders them, collects the user's decisions up front and adds fixes learned on earlier runs. Every stage ends with a gate: do not start the next stage until the gate passes.

| # | Stage | Skill to load | Section |
|---|---|---|---|
| 1 | website-capture-zip (screenshot capture) | `website-replica-pipeline` | Stage 1 |
| 2 | zip-to-nextjs-replica (build) | `website-replica-pipeline` | Stage 2 |
| 3 | deploy-website-vercel (deploy) | `deploy-website-vercel` | Deploy |
| 4 | pagespeed-improve-deploy (PageSpeed Insights) | `deploy-website-vercel` | PageSpeed loop |

Load each skill with the Skill tool. Some sessions list it with a prefix, such as `anthropic-skills:website-replica-pipeline`. Each skill covers two stages and stays in context once loaded, so load it only once.

## Input

`/full-replica <url> [pages] [content file]`

- `url` is required. If it is missing, ask for it.
- `pages` is optional: `all`, `home`, or a list of routes.
- `content file` is optional: a PDF or document to rebrand the replica with. See "Rebrand" below.

## 0. Ask once, then run unattended

Read `<url>/sitemap.xml` and count the pages. Then ask every open question in a single AskUserQuestion call, with the recommended option first:

1. **Pages:** all pages, or only the main pages. Ask only if the site has more than 10 pages; otherwise take all of them.
2. **Where the code goes:** a new private repo under varunisrani, or an existing repo and branch. If creating the repo fails, use the current repo and branch and say so.
3. **Vercel project:** reuse an existing project (name it), or create a new one called `<site>-replica`.
4. **Contact form:** a mock that is clearly labelled and stores nothing (recommended), or a real destination such as Supabase.

After that, ask again only when blocked:
- a secret is needed;
- a step the skills reserve for the user (for example changing a public URL or domain);
- a stage has failed twice.

Create one task per stage with TaskCreate and keep it updated. After each gate, post one short line with the stage, the result and what comes next.

## 1. Screenshot capture (website-capture-zip)

Follow Stage 1 of `website-replica-pipeline`.

- In a cloud session there is no Google Chrome. Point `CHROME` at the preinstalled Chromium (`/opt/pw-browsers/chromium`).
- To deliver the ZIP, send it with the file tool if it is under the upload limit (about 30 MB). If it is larger, commit it or leave it in the session folder, and give the path. Do not split it unless asked.

**Gate:**
- `unzip -tq` passes.
- The page, screenshot and asset counts match `index.md`.
- There are no zero-byte files.

## 2. Build (zip-to-nextjs-replica)

Follow Stage 2 of `website-replica-pipeline`.

Lessons from earlier runs:
- **Replica inside another repo:** give it its own `postcss.config.mjs` (`plugins: []`) and exclude its folder from the parent `tsconfig.json`. Without this, Vercel picks up the parent's PostCSS or Tailwind config and the build fails.
- **Scroll-reveal effects** must not leave content hidden when a list re-renders (tabs, filters). Watch for added nodes, not only the first render.
- **Search engines:** keep the site `noindex` until it is on its own domain, and turn indexing on with an environment variable.

**Gate:**
- `npm run build` and the typecheck pass.
- Every route returns 200 and an unknown route returns 404.
- No assets are missing.
- Desktop (1440 px) and narrow (390 px) screenshots match the capture.
- No page scrolls sideways.
- After scrolling every page to the bottom, every element is visible.

## 3. Deploy (deploy-website-vercel)

Follow "Deploy" in `deploy-website-vercel`.

- Commit and push first, then deploy from that commit: use `gitSource` with the repo, branch and sha.
- If the replica sits in a subfolder of the repo, set `rootDirectory` to that folder.

**Gate:**
- The deployment is READY.
- The live checks pass: routes, assets, the form does what it says, and no demo or placeholder text is left.
- The stage-2 interaction and reveal checks pass against the live URL.
- Desktop and narrow screenshots of the live home page are sent to the user next to the original.

## 4. PageSpeed Insights (pagespeed-improve-deploy)

Follow "PageSpeed loop" in `deploy-website-vercel`.

- **Where scores come from.** Try these in order:
  1. The PageSpeed API.
  2. pagespeed.web.dev in the browser.
  3. Local Lighthouse: `npx lighthouse` with Chromium; mobile by default, desktop with `--preset=desktop`.

  For every number, say which of these produced it.
- **Local Lighthouse is noisy.** Run mobile three times and report the median.
- **Fair comparison.** Measure the original site the same way.
- **SEO:** a score below 100 caused by `noindex` is expected. Say so; do not "fix" it.

**Gate:**
- Mobile and desktop scores are measured, with timestamps.
- Any fix has been redeployed and measured again.

## Rebrand (only when a content file is given)

Do this after stage 2 and before stage 3.

- Replace all copy with the file's content, kept in one data module.
- Use only facts from the file. Do not invent jobs, posts, testimonials or client names; remove template pages that would need them.
- If no vector logo is supplied, cut the logo out of the file and ask for the original.
- Take the colours from the logo.
- Do not publish personal emails or details that look wrong; list them for the user to confirm.

## Final report (one message)

- **Capture:** pages, screenshots and assets, and where the ZIP is.
- **Code:** repo, branch and commit.
- **Live site:** URL, deployment ID and what was checked.
- **PageSpeed:** original vs replica, mobile and desktop, with the source and time of each number.
- **Open items:**
  - approximations and anything untested;
  - decisions left to the user: licences for third-party images and copy, the domain, search indexing, and where the form should send.

## Never

- Anything listed under "Never" in either skill.
- Fake a successful form submit.
- Present estimated scores as measured.
- Call a narrow-window check a phone test.
- Touch a database the user said not to use.
