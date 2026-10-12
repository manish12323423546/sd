# Capture: https://verixa.framer.media/

Headless Chrome (puppeteer-core). Desktop 1440x900, narrow 390x844, full-page screenshots at 1x (viewport grown to page height, see notes) after scrolling to trigger reveal animations. Framer preview chrome (badge, template promo, editor bar) removed before screenshots.

Pages: 37 | Screenshots: 74 | Assets: 100 (3 font, 61 image, 36 svg) | Failed assets: 0

## Site-wide

- Fonts loaded (home): Inter Display 400 normal, Inter Display 500 normal, Inter Display 600 normal
- Most-used colours (home, by element count): rgb(0, 0, 0), rgb(0, 0, 238), rgb(4, 4, 4), rgb(255, 255, 255), rgb(45, 53, 49), rgba(0, 0, 0, 0.2), rgb(245, 245, 244), rgb(49, 49, 49), rgba(0, 0, 0, 0.12), rgb(247, 247, 242), rgb(34, 34, 34)
- Page CSS (all <style> tags, deduplicated): 14 files in `styles/`; holds the exact transitions and @keyframes.

## Notes for the rebuild

- **How screenshots were taken.** Puppeteer's `fullPage` mode fires a 1x1 resize on this site, which makes Framer swap to its phone layout partway through the capture (hamburger nav, wrapped hero row, missing footer). Instead, the viewport was grown to the page height at the same width (1440 or 390), left to settle, then captured as a plain viewport screenshot. As a side effect, everything is in view, so all appear-on-scroll effects show their final state.
- **No canvas, WebGL, video or iframes** on any page. All motion is CSS transitions plus Framer's JS-driven appear and hover effects.
- **Header** is `position: fixed` (z-index 10) on every page. Desktop: logo, pill nav (Home, About, Case Studies, Pages dropdown, Service) and a black "Get Started" button. On phone widths it collapses to a hamburger menu. Framer's breakpoints in the page CSS are desktop at 1200 px and up, tablet from 810 to 1199 px, and phone below 810 px; only desktop and phone were captured. The "Pages" dropdown lists Main Pages, Inner Pages (CMS templates) and Utilities.
- **Hero (home):** a rounded card with a soft orange/cream gradient wash. The image grid is 3 columns on desktop (photo, "Job Success" progress card, photo) with a black "Boost Your Career Success" card under columns 2–3. It stacks to one column on narrow screens.
- **Live counters (About > Rating):** 6.5M+, 150k+ and 50k+ count up from 0 when scrolled into view, ease-out over about 1.2 s. The screenshot and `content.md` show the final values.
- **Card hovers** (exact values in the page CSS, `[data-framer-name="Job Card" | "Blog Card" | "Case Card"]`): the card lifts `translateY(-4px)` with shadow `0 18px 40px rgba(4,4,4,.08)` over 0.6 s `cubic-bezier(.22,1,.36,1)`, and the image scales to 1.05 over 0.8 s on the same curve.
- **Popular Jobs (home):** each job row has a hidden "Category Box" label (Designer, Developer, Marketing, Human Resources) at opacity 0. It is a hover reveal and is not visible in the screenshots.
- **FAQ** is a custom code component (`.vxf-root`). It has tabs (General, Customer Service, Product Help) and accordion items, with the first item open. The content fades in with `vxf-fade-in` (300 ms ease). Responsive sizes are set as CSS variables per breakpoint (1200 / 810 / 480 px), and it honours `prefers-reduced-motion`. Only the open item's answer text is in `content.md`; the other answers and the other tabs need clicking to read.
- **Accordion and plus icons** use `rotate(0/90/180deg)`, and small dots or icons start at `scale(0)`. These are Framer variant transitions on hover and open.
- **Forms:** the "Ready to Get Started" contact block (Name, Phone, Subject, Message, Send Message) appears at the bottom of most pages. The Jobs list page also has a left sidebar with a job search box and category filter chips (All Jobs, Designer, Developer, Marketing, Human Resources, Customer Support, Sales, Content). These filter the CMS job list. In a rebuild, do not fake a successful submit: either label the form as not connected or wire a real endpoint.
- **Footer:** a tagline, Company / Support / Social link columns, a photo on the right (hidden on narrow screens), the copyright line and a large faded "VERIXA" wordmark cut off at the bottom.
- **Section labels:** the contact block and footer are unnamed Framer component instances, so `content.md` labels them by their first line of text (`"Ready to Get Started" block`, `"Discover Job Opportunities…" block`).
- **CMS templates:** 10 blog posts share one layout (article plus a "Related Blog" sidebar and Previous/Next links), 6 case studies share one (stats row, Challenge/Solution/Results and a "Related Case Studies" sidebar), and 10 jobs share one (job sections plus a company info sidebar and "Apply Now").
- **`/404` returns HTTP 404 on purpose**; it is the site's not-found page.
- **Licences:** the site's own `/utility/licenses` page credits Freepik (images), Inter Display (font; Inter is SIL OFL 1.1) and Hugeicons (icons). Treat every image as reference only; the template's licence does not pass to a replica.

## Pages

| Page | Route | Status | Height | Sections | Images | SVG files | Video |
|---|---|---|---|---|---|---|---|
| home | `/` | 200 | 9225 | 11 | 13 | 8 | 0 |
| about-us | `/about-us` | 200 | 5203 | 7 | 14 | 9 | 0 |
| service | `/service` | 200 | 4802 | 6 | 7 | 5 | 0 |
| case-studies | `/case-studies` | 200 | 3725 | 5 | 8 | 6 | 0 |
| blog | `/blog` | 200 | 4316 | 5 | 12 | 5 | 0 |
| jobs | `/jobs` | 200 | 3227 | 4 | 2 | 6 | 0 |
| contact | `/contact` | 200 | 1784 | 4 | 2 | 8 | 0 |
| 404 | `/404` | 404 | 1413 | 3 | 2 | 3 | 0 |
| blog--breaking-into-a-new-industry-without-experience | `/blog/breaking-into-a-new-industry-without-experience` | 200 | 3470 | 4 | 10 | 5 | 0 |
| blog--building-confidence-during-a-career-transition | `/blog/building-confidence-during-a-career-transition` | 200 | 3470 | 4 | 10 | 5 | 0 |
| blog--emerging-skills-employers-will-demand-in-2026 | `/blog/emerging-skills-employers-will-demand-in-2026` | 200 | 3498 | 4 | 10 | 5 | 0 |
| blog--future-of-work-2026-trends-that-will-shape-careers | `/blog/future-of-work-2026-trends-that-will-shape-careers` | 200 | 3470 | 4 | 10 | 5 | 0 |
| blog--how-to-stand-out-in-todays-competitive-job-market | `/blog/how-to-stand-out-in-todays-competitive-job-market` | 200 | 3442 | 4 | 10 | 5 | 0 |
| blog--navigating-a-career-change-how-to-transition-into-a-new-industry | `/blog/navigating-a-career-change-how-to-transition-into-a-new-industry` | 200 | 3526 | 4 | 10 | 5 | 0 |
| blog--networking-secrets-to-land-your-next-opportunity | `/blog/networking-secrets-to-land-your-next-opportunity` | 200 | 3442 | 4 | 10 | 5 | 0 |
| blog--preparing-for-tomorrows-workplace-today | `/blog/preparing-for-tomorrows-workplace-today` | 200 | 3470 | 4 | 10 | 5 | 0 |
| blog--smart-job-search-strategies-that-actually-work | `/blog/smart-job-search-strategies-that-actually-work` | 200 | 3470 | 4 | 10 | 5 | 0 |
| blog--switching-careers-successfully-a-step-by-step-guide | `/blog/switching-careers-successfully-a-step-by-step-guide` | 200 | 3442 | 4 | 10 | 5 | 0 |
| case-studies--an-overview-of-how-verixa-simplified-their-hiring-process | `/case-studies/an-overview-of-how-verixa-simplified-their-hiring-process` | 200 | 3532 | 4 | 3 | 12 | 0 |
| case-studies--how-we-enhanced-diversity-hiring-and-achieved-50-increase | `/case-studies/how-we-enhanced-diversity-hiring-and-achieved-50-increase` | 200 | 3616 | 4 | 3 | 12 | 0 |
| case-studies--how-we-landed-a-senior-product-designer-role-in-less-than-30-day | `/case-studies/how-we-landed-a-senior-product-designer-role-in-less-than-30-day` | 200 | 3616 | 4 | 3 | 12 | 0 |
| case-studies--reduced-cost-per-hire-by-35-with-recruits-hiring-tools | `/case-studies/reduced-cost-per-hire-by-35-with-recruits-hiring-tools` | 200 | 3616 | 4 | 3 | 12 | 0 |
| case-studies--transitioned-to-a-new-industry-with-verixa-career-tools | `/case-studies/transitioned-to-a-new-industry-with-verixa-career-tools` | 200 | 3588 | 4 | 3 | 12 | 0 |
| case-studies--what-they-did-to-meet-seasonal-demand-by-scaling-up-their-hiring | `/case-studies/what-they-did-to-meet-seasonal-demand-by-scaling-up-their-hiring` | 200 | 3588 | 4 | 3 | 12 | 0 |
| jobs--backend-engineer-node-js | `/jobs/backend-engineer-node-js` | 200 | 3251 | 4 | 2 | 18 | 0 |
| jobs--content-writer-editor | `/jobs/content-writer-editor` | 200 | 3251 | 4 | 2 | 18 | 0 |
| jobs--customer-support-associate | `/jobs/customer-support-associate` | 200 | 3251 | 4 | 2 | 18 | 0 |
| jobs--digital-marketing-specialist | `/jobs/digital-marketing-specialist` | 200 | 3283 | 4 | 2 | 18 | 0 |
| jobs--frontend-developer-react | `/jobs/frontend-developer-react` | 200 | 3315 | 4 | 2 | 18 | 0 |
| jobs--junior-hr-executive | `/jobs/junior-hr-executive` | 200 | 3283 | 4 | 2 | 18 | 0 |
| jobs--mid-level-ui-ux-designer | `/jobs/mid-level-ui-ux-designer` | 200 | 3315 | 4 | 2 | 18 | 0 |
| jobs--mobile-app-developer-flutter | `/jobs/mobile-app-developer-flutter` | 200 | 3219 | 4 | 2 | 18 | 0 |
| jobs--sales-business-executive | `/jobs/sales-business-executive` | 200 | 3251 | 4 | 2 | 18 | 0 |
| jobs--softserve-bd | `/jobs/softserve-bd` | 200 | 3251 | 4 | 2 | 18 | 0 |
| utility--changelog | `/utility/changelog` | 200 | 1302 | 4 | 2 | 3 | 0 |
| utility--licenses | `/utility/licenses` | 200 | 1628 | 4 | 2 | 3 | 0 |
| utility--style-guide | `/utility/style-guide` | 200 | 3214 | 4 | 2 | 4 | 0 |

## Sections and motion per page

### home (`/`)

Sections: Header > Hero > Process > Popular Jobs > Job Rating > Get Job > Testimonials > FAQ > Blog > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 4 elements hidden until scrolled into view; 7 links/buttons with hover transitions; 1 sticky/fixed elements

### about-us (`/about-us`)

Sections: Header > Hero > Solution > Rating > Team > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 1 sticky/fixed elements

### service (`/service`)

Sections: Header > Hero > Services > FAQ > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 7 links/buttons with hover transitions; 1 sticky/fixed elements

### case-studies (`/case-studies`)

Sections: Header > Hero > Case Studies > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 1 sticky/fixed elements

### blog (`/blog`)

Sections: Header > Hero > Blog > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 9 links/buttons with hover transitions; 1 sticky/fixed elements

### jobs (`/jobs`)

Sections: Header > Jobs > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 6 elements hidden until scrolled into view; 12 links/buttons with hover transitions; 2 sticky/fixed elements

### contact (`/contact`)

Sections: Header > Contact Address Section > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 1 sticky/fixed elements

### 404 (`/404`)

Sections: Header > Error Section > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 1 sticky/fixed elements

### blog--breaking-into-a-new-industry-without-experience (`/blog/breaking-into-a-new-industry-without-experience`)

Sections: Header > Blog Details > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 2 sticky/fixed elements

### blog--building-confidence-during-a-career-transition (`/blog/building-confidence-during-a-career-transition`)

Sections: Header > Blog Details > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 2 sticky/fixed elements

### blog--emerging-skills-employers-will-demand-in-2026 (`/blog/emerging-skills-employers-will-demand-in-2026`)

Sections: Header > Blog Details > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 2 sticky/fixed elements

### blog--future-of-work-2026-trends-that-will-shape-careers (`/blog/future-of-work-2026-trends-that-will-shape-careers`)

Sections: Header > Blog Details > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 2 sticky/fixed elements

### blog--how-to-stand-out-in-todays-competitive-job-market (`/blog/how-to-stand-out-in-todays-competitive-job-market`)

Sections: Header > Blog Details > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 2 sticky/fixed elements

### blog--navigating-a-career-change-how-to-transition-into-a-new-industry (`/blog/navigating-a-career-change-how-to-transition-into-a-new-industry`)

Sections: Header > Blog Details > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 2 sticky/fixed elements

### blog--networking-secrets-to-land-your-next-opportunity (`/blog/networking-secrets-to-land-your-next-opportunity`)

Sections: Header > Blog Details > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 2 sticky/fixed elements

### blog--preparing-for-tomorrows-workplace-today (`/blog/preparing-for-tomorrows-workplace-today`)

Sections: Header > Blog Details > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 2 sticky/fixed elements

### blog--smart-job-search-strategies-that-actually-work (`/blog/smart-job-search-strategies-that-actually-work`)

Sections: Header > Blog Details > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 2 sticky/fixed elements

### blog--switching-careers-successfully-a-step-by-step-guide (`/blog/switching-careers-successfully-a-step-by-step-guide`)

Sections: Header > Blog Details > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 2 sticky/fixed elements

### case-studies--an-overview-of-how-verixa-simplified-their-hiring-process (`/case-studies/an-overview-of-how-verixa-simplified-their-hiring-process`)

Sections: Header > Case Details Section > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 2 sticky/fixed elements

### case-studies--how-we-enhanced-diversity-hiring-and-achieved-50-increase (`/case-studies/how-we-enhanced-diversity-hiring-and-achieved-50-increase`)

Sections: Header > Case Details Section > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 2 sticky/fixed elements

### case-studies--how-we-landed-a-senior-product-designer-role-in-less-than-30-day (`/case-studies/how-we-landed-a-senior-product-designer-role-in-less-than-30-day`)

Sections: Header > Case Details Section > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 2 sticky/fixed elements

### case-studies--reduced-cost-per-hire-by-35-with-recruits-hiring-tools (`/case-studies/reduced-cost-per-hire-by-35-with-recruits-hiring-tools`)

Sections: Header > Case Details Section > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 2 sticky/fixed elements

### case-studies--transitioned-to-a-new-industry-with-verixa-career-tools (`/case-studies/transitioned-to-a-new-industry-with-verixa-career-tools`)

Sections: Header > Case Details Section > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 2 sticky/fixed elements

### case-studies--what-they-did-to-meet-seasonal-demand-by-scaling-up-their-hiring (`/case-studies/what-they-did-to-meet-seasonal-demand-by-scaling-up-their-hiring`)

Sections: Header > Case Details Section > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 2 sticky/fixed elements

### jobs--backend-engineer-node-js (`/jobs/backend-engineer-node-js`)

Sections: Header > Job Details > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 2 sticky/fixed elements

### jobs--content-writer-editor (`/jobs/content-writer-editor`)

Sections: Header > Job Details > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 2 sticky/fixed elements

### jobs--customer-support-associate (`/jobs/customer-support-associate`)

Sections: Header > Job Details > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 2 sticky/fixed elements

### jobs--digital-marketing-specialist (`/jobs/digital-marketing-specialist`)

Sections: Header > Job Details > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 2 sticky/fixed elements

### jobs--frontend-developer-react (`/jobs/frontend-developer-react`)

Sections: Header > Job Details > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 2 sticky/fixed elements

### jobs--junior-hr-executive (`/jobs/junior-hr-executive`)

Sections: Header > Job Details > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 2 sticky/fixed elements

### jobs--mid-level-ui-ux-designer (`/jobs/mid-level-ui-ux-designer`)

Sections: Header > Job Details > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 2 sticky/fixed elements

### jobs--mobile-app-developer-flutter (`/jobs/mobile-app-developer-flutter`)

Sections: Header > Job Details > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 2 sticky/fixed elements

### jobs--sales-business-executive (`/jobs/sales-business-executive`)

Sections: Header > Job Details > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 2 sticky/fixed elements

### jobs--softserve-bd (`/jobs/softserve-bd`)

Sections: Header > Job Details > "Ready to Get Started" block > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 2 sticky/fixed elements

### utility--changelog (`/utility/changelog`)

Sections: Header > Hero > Utility Section > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 1 sticky/fixed elements

### utility--licenses (`/utility/licenses`)

Sections: Header > Hero > Utility Section > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 1 sticky/fixed elements

### utility--style-guide (`/utility/style-guide`)

Sections: Header > Hero > Style Guide Section > "Discover Job Opportunities That Match Yo" block

Motion: 0 elements hidden until scrolled into view; 4 links/buttons with hover transitions; 1 sticky/fixed elements
