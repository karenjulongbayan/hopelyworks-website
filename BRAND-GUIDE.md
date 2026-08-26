# Hopely Works — Brand, Strategy & Design System

The strategic companion to the codebase. Everything here is already implemented in the site or ready to hand to a designer, writer, or VA.

---

## 1. Sitemap

```
/
├── /services                  Pillar overview
│   ├── /services/launch       Pillar I  — Launch
│   ├── /services/optimize     Pillar II — Optimize
│   └── /services/support      Pillar III — Support
├── /work                      Portfolio / case studies
├── /products                  Digital products (shop, coming soon)
├── /about                     Story, values, philosophy
├── /blog                      Journal (index; posts to follow)
├── /faq                       Grouped FAQ + FAQPage schema
├── /contact                   Form + expectations + channels
├── /privacy                   Privacy Policy (noindex)
├── /terms                     Terms of Service (noindex)
└── 404                        Branded not-found page
```

Auto-generated: `sitemap.xml`, `robots.txt` (see `app/sitemap.js`, `app/robots.js`).

## 2. User journey

**Primary journey — the founder who needs a website (Launch):**
Google/referral → Homepage hero (positioning in 5 seconds) → Three pillars → clicks *Launch* → sees services, outcomes, process, pricing → FAQ objections resolved inline → *Book a discovery call* → Contact form (low-friction pill selectors) → confirmation promising 1-business-day reply.

**Secondary journey — the overwhelmed operator (Optimize):**
Journal post or referral → *Optimize* pillar → Systems Audit ($450 low-risk entry) → Automation Build upsell after audit.

**Tertiary journey — the researcher:**
Homepage → About (trust) → Work (proof) → FAQ (objections) → Newsletter (nurture) → returns weeks later via the letter → Contact.

**Retention loop:** Every Launch client is cross-linked to Optimize; every Optimize client to Support. The three pillars are deliberately framed as *chapters*, making the next engagement feel like the natural next page.

## 3. Homepage wireframe (as built)

```
┌────────────────────────────────────────────┐
│ NAV  Hopely | Works      links   [Start]   │  fixed, blurs on scroll
├────────────────────────────────────────────┤
│ HERO                          ◜ gold arcs  │  eyebrow / H1 (2 lines)
│ "The calm behind well-run businesses."     │  sub / 2 CTAs / trust line
├────────────────────────────────────────────┤
│ POSITIONING STATEMENT (ivory-deep band)    │  one serif sentence
├────────────────────────────────────────────┤
│ THREE PILLARS   Launch │ Optimize │ Support│  vertical hairlines = H|W
│ icon, name, italic tagline, 4 services, →  │
├────────────────────────────────────────────┤
│ PROCESS (forest band)  01 │ 02 │ 03        │  Discover / Build / Refine
├────────────────────────────────────────────┤
│ SELECTED WORK   2 cards + "view all" →     │
├────────────────────────────────────────────┤
│ TESTIMONIALS    2 serif pull-quote cards   │
├────────────────────────────────────────────┤
│ PRODUCTS TEASER (single wide card)         │
├────────────────────────────────────────────┤
│ NEWSLETTER (ivory-deep, centered)          │
├────────────────────────────────────────────┤
│ CTA BAND (forest, rounded 2rem, arcs)      │
├────────────────────────────────────────────┤
│ FOOTER (forest) brand / 3 columns / legal  │
└────────────────────────────────────────────┘
```

## 4. Navigation

- **Desktop:** wordmark left ("Hopely | Works" with the gold hairline from the logo), 5 links + Services dropdown (Launch / Optimize / Support with one-line notes), pill CTA right.
- **Mobile:** two-line hamburger morphing to ×, full-width sheet, serif links with indented pillar sub-links.
- Fixed header; transparent at top, `ivory/90 + backdrop-blur + hairline border` after 12px scroll.
- Skip-to-content link for keyboard users.

## 5. CTA library

| Context | Primary | Secondary |
|---|---|---|
| Hero | Start a project | Explore services |
| Pillar pages | Book a discovery call | See our work |
| Pricing cards | Start with {Package} | — |
| CTA band | Book a discovery call | Explore services |
| Products | Browse the shop | See services |
| FAQ | Ask a question | — |
| Newsletter | Subscribe | — |

Voice rules: verbs first, no "Submit", no fake urgency, the same action keeps the same name across the flow.

## 6. SEO titles & descriptions (implemented per page)

| Page | Title | Meta description |
|---|---|---|
| Home | Hopely Works — Launch, Optimize & Support Your Business | A boutique digital systems studio helping entrepreneurs launch beautiful websites, automate operations, and grow with ongoing support. Serving the US, Australia & Europe. |
| Services | Services — Launch, Optimize & Support \| Hopely Works | Three service pillars for growing businesses: Launch (websites, funnels, branding), Optimize (CRM, automation, AI), and Support (ongoing operations and marketing). |
| Launch | Launch — Website Design, Funnels & Brand Foundations \| Hopely Works | Launch your business with a premium website, high-converting landing pages, branding support, and complete email & domain setup. |
| Optimize | Optimize — CRM Setup, Workflow Automation & AI Solutions \| Hopely Works | Streamline your operations with GoHighLevel setup, CRM configuration, workflow automation, and practical AI solutions. |
| Support | Support — Social Media, Virtual Assistance & Systems Care \| Hopely Works | Ongoing operational and marketing support: social media, admin, virtual assistance, SOPs, and systems maintenance. |
| Work | Work — Selected Projects & Case Studies \| Hopely Works | Premium websites, automation builds, and support engagements across the US, Australia, and Europe. |
| Products | Digital Products — Templates & Business Resources \| Hopely Works | Premium templates, SOP libraries, and business resources — the systems we build for clients, packaged for you. |
| About | About — The Studio Behind the Systems \| Hopely Works | Learn the story, values, and philosophy of Hopely Works. |
| Journal | Journal — Notes on Launching, Automating & Growing \| Hopely Works | Practical, calm writing on launching businesses, automating operations, and building systems that last. |
| FAQ | FAQ — Working with Hopely Works | Pricing, timelines, tools, time zones, and what it's like to work with us. (FAQPage JSON-LD included.) |
| Contact | Contact — Start a Project or Book a Discovery Call \| Hopely Works | We reply within one business day; every enquiry begins with a free discovery call. |

Keyword clusters to grow into via the journal: *GoHighLevel setup service, small business automation, boutique web design studio, virtual assistant for entrepreneurs, SOP templates, business launch checklist.*

## 7. Blog structure

- **Name:** *The Journal* (matches quiet-luxury register better than "Blog").
- **Categories mirror the pillars** — Launch, Optimize, Support — plus *Studio notes* for POV pieces. This means every post naturally internal-links to a service page.
- **Cadence:** 2 posts/month, matching the newsletter promise.
- **Post template (when you add posts):** eyebrow category → serif H1 → read time → prose at `max-w-prose` → inline CTA card for the matching pillar → related posts → newsletter block.
- Six launch-ready titles are already stubbed on `/blog` as drafts.
- **Recommended next step:** add MDX (`@next/mdx`) or a headless CMS; the index is already structured for a `posts` collection.

## 8. Design system

### Color tokens (in `tailwind.config.js`)
| Token | Hex | Use |
|---|---|---|
| `forest` | #22352F | Primary — headings, buttons, dark bands |
| `forest-deep` | #182620 | Hover states, footer depth |
| `bronze` | #B8935A | Accent — eyebrows, hairlines, italic taglines |
| `bronze-soft` | #CFB68C | Borders, accents on dark |
| `bronze-wash` | #F1E9DC | Badges, subtle highlights |
| `ivory` | #F8F5F0 | Page background |
| `ivory-raised` | #FFFFFF | Cards |
| `ivory-deep` | #EFEAE2 | Alternate section bands |
| `ink` / `ink-soft` / `ink-faint` | #2B2B2B / #5C5C58 / #8A8880 | Text hierarchy |
| `line` | #E3DDD2 | Hairline borders |

Rule of thumb: **bronze is a seasoning, never a meal** — it appears in hairlines, eyebrows, and italics, and fills a surface only in the CTA band button and "Most chosen" badge.

### Typography
- **Display:** Cormorant Garamond (400–700 + italics) — headings, pull quotes, package prices, italic taglines.
- **Body:** Manrope — everything else.
- Fluid scale: `display-xl` (44→76px) / `display-lg` / `display-md` / `display-sm` / `eyebrow` (12px, 0.22em tracking, uppercase, semibold, bronze).
- Serif *italic* in bronze is the brand's "voice of warmth" — used for taglines and phase labels only.

### Spacing system (8-pt base)
- Section rhythm: `section-sm` 64px → `section` 96px → `section-lg` 136px.
- Container: `max-w-wrap` (1152px) with 24px/40px gutters; reading width `max-w-prose` (672px).
- Card padding: 32px (48–56px for feature cards).

### Signature device
The **H|W hairline** from the logo: a short vertical bronze rule (`​.hairline-v`) opens every centered section, the wordmark, and the pillar grid (columns divided by hairlines). It's the one element that makes the site unmistakably Hopely Works.

### Buttons
- **Primary:** forest pill, ivory text → deepens + soft shadow on hover.
- **Secondary:** transparent pill, forest hairline border → fills 5% on hover.
- **Ghost:** text + arrow, forest → bronze on hover, arrow nudges 4px.
- **On dark:** bronze fill (forest-deep text) and ivory-outline variants.
- Radius `999px`, 300ms `cubic-bezier(0.22,1,0.36,1)` ("calm" easing).

### Cards
White on ivory, 20px radius, hairline border, dual-layer soft green-tinted shadow; hover: −4px lift + deeper shadow. Variants: service, project (16:10 image), testimonial (serif quote), pricing (featured = forest fill + bronze border), product, post.

### Forms
Soft-white fields, 12px radius, hairline border → bronze border + faint ring on focus. **Pill selectors instead of dropdowns** for interest/budget (lower friction, feels editorial). Errors in bronze, written as gentle directions ("Enter a valid email so we can reply."), never red alarm text. Success states swap the form for a confirmation card.

### Pricing cards
Three tiers per pillar; middle tier featured (forest fill, bronze "Most chosen" badge). Serif prices, "from" qualifiers, per-card CTA, sub-footnote that final quotes follow discovery. Entry offers de-risk each pillar (Foundation $950 / Systems Audit $450 / Essentials $600mo).

### Testimonials
Serif pull-quote at display size, bronze quote icon, name | region separated by a hairline pipe (the H|W again). No star ratings, no headshot grids — quiet luxury implies, never begs.

### Badges
`bronze-wash` pill, forest text, 12px semibold — used for pillar tags, product status, "Most chosen". One badge per card maximum.

## 9. Icon recommendations
Custom inline 1.5px-stroke line icons ship in `components/Icons.jsx` (arrow, launch, optimize, support, sprig, check, mail, globe, quote, plus/minus). If you outgrow them, use **Lucide** (already matches the stroke weight) or **Phosphor Thin** — never filled or two-tone icon sets; they'd break the hairline language.

## 10. Illustration style
- Abstract, geometric, botanical — thin bronze line arcs and circles (echoing the logo ring) and single-line leaf sprigs. No mascots, no isometric people, no 3D blobs.
- Illustrations sit at ≤ 25% opacity as ambient background geometry (see hero and CTA band arcs) — never as the subject.

## 11. Image direction
When replacing the placeholder blocks on Work/Home:
- **Palette-matched photography:** warm neutrals, sage, cream, walnut; avoid saturated blues/reds.
- **Subjects:** softly-lit workspaces, hands at keyboards, paper and linen textures, device mock-ups of your actual builds framed in generous negative space (Kinfolk × Aesop energy).
- **Treatment:** natural light, shallow depth of field, slight warm grade. No stocky handshakes, no neon gradients, no fake dashboards.
- Format: 16:10 for project cards, export WebP/AVIF via `next/image` when you swap them in.

## 12. Animation ideas (implemented + optional)
Implemented: staggered hero fade-up (90ms steps), IntersectionObserver scroll reveals, nav blur-on-scroll, card lifts, ghost-arrow nudges, accordion grid-rows easing, mobile-menu morphing icon — all honoring `prefers-reduced-motion`.
Tasteful additions if desired: a slow (60s) rotation on the hero arcs; number count-up on About stats; a hairline that "draws" downward on section entry; subtle parallax (≤ 20px) on project imagery. Skip: cursor followers, marquees, confetti, typewriter effects.

## 13. Conversion notes
- One primary action per screen; secondary actions are visually quieter.
- Objection handling travels with the offer (FAQ on every pillar page).
- Low-risk entry points per pillar; "Most chosen" anchors the middle tier.
- Reply-time promise ("one business day") repeated at form, footer, and confirmation.
- Newsletter positioned as a *letter* with a cadence promise — a nurture path for the 97% not ready to buy.

## 14. Launch checklist
1. `npm install && npm run dev`
2. Replace placeholder imagery (§11) and testimonial attributions with real ones.
3. Wire `ContactForm` and `Newsletter` TODOs to GoHighLevel webhooks / an API route / Supabase.
4. Point `metadataBase` at the final domain; add OG image (1200×630: ivory field, wordmark, hairline).
5. Legal pages reviewed by a professional for US/AU/EU.
6. Deploy to Vercel; verify sitemap.xml, robots.txt, FAQ rich results in Search Console.
