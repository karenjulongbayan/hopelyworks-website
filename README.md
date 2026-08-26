# HopelyWorks

Website, funnel, and brand assets for **HopelyWorks** — a boutique digital studio
helping small businesses look the part and grow into it.

🌐 [hopelyworks.com](https://hopelyworks.com) · ✉️ hopelyworks@gmail.com

---

## What's in here

```
site/
  index.html      Main website — hero, services, portfolio, lead intake form
  funnel.html     Multi-step funnel: "What does your business need help with?"
  landing.html    Single-offer landing page for website design enquiries
assets/
  logo/           Transparent logo variants + brand QR codes
  social/         Facebook profile, covers, and post graphics
  print/          Business card (print-ready PDF with bleed) + previews
automation/
  google-sheets-script.gs   Apps Script: form → Google Sheet + notification + auto-reply
BRAND-GUIDE.md    Design system, colours, type scale, copy direction
```

## Services

Website Design · Landing Pages · Canva & Brand Design · Lead Generation · Business Setup · Business Automation

## Tech

Static HTML with Tailwind (CDN), Cormorant Garamond + Manrope via Google Fonts.
No build step — every page is self-contained and deploys as-is.

## Deploy

Any static host. On Vercel: import this repo and set the output directory to `site`.

```bash
# local preview
cd site && python3 -m http.server 8000
```

## Lead intake setup

The form in `site/index.html` posts to a Google Apps Script endpoint.

1. Create a Google Sheet → Extensions → Apps Script
2. Paste `automation/google-sheets-script.gs`, save
3. Deploy → New deployment → Web app (Execute as: Me · Access: Anyone)
4. Copy the `/exec` URL into the `SHEET_URL` constant in `site/index.html`

Each submission appends a row, emails a formatted lead card, and sends the
enquirer a branded confirmation with a booking CTA.

## Brand

| Token | Hex |
|---|---|
| Forest (primary) | `#22352F` |
| Bronze (accent) | `#B8935A` |
| Ivory (background) | `#F8F5F0` |
| Ink (text) | `#2B2B2B` |

Headings: Cormorant Garamond · Body: Manrope

---

© HopelyWorks. All rights reserved. Brand assets are not licensed for reuse.
