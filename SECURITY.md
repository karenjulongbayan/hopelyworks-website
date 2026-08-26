# Security

How this site is protected, and the two optional steps that make it stronger.

Everything here already works as-is. Nothing in this document is required for the
site to run — the optional steps are marked as such.

---

## The shape of the thing

```
visitor's browser  ──POST──▶  Google Apps Script  ──▶  Google Sheet
   (static page)                  (the "backend")        + 2 emails
   served by Vercel
```

There is no server of our own. The page is static files on Vercel, and the form
posts directly from the visitor's browser to a Google Apps Script web app. That
shapes every decision below:

- The Apps Script `/exec` URL **is visible in the page source**. It has to be —
  the browser needs it to post. It is not a secret and should never be treated as
  one. Protection comes from what the script does with a request, not from hiding
  its address.
- Apps Script **cannot read request headers**. So the usual `Origin` check is
  impossible here. The layers below exist because that one is unavailable.

---

## What protects the form

Four server-side layers, cheapest rejection first. All of them live in
`automation/google-sheets-script.gs`. None of them can be bypassed from the
browser, because none of them run in the browser.

| Layer | What it stops | Active by default |
|---|---|---|
| **Honeypot** | Naive spam bots that fill every field they find | Yes |
| **Turnstile** | Scripted POSTs straight to the `/exec` URL | Only once you add the keys (optional step 1) |
| **Rate limits** | One source hammering the form | Yes |
| **Quota reserve** | A flood burning the daily Gmail send limit | Yes |

The current limits, all near the top of the script if you want to change them:

```js
RATE_MAX_PER_USER = 3    // per email address, per 10 minutes
GLOBAL_MAX        = 40   // site-wide, per hour
QUOTA_RESERVE     = 20   // stop auto-replies when the daily send quota drops here
QUOTA_HARD_FLOOR  = 5    // stop all mail below this (the lead is still saved)
```

**The lead is always written to the sheet before any email is sent.** If the site
is flooded, you lose notification emails, never enquiries.

### Why the auto-reply needed protecting

The auto-reply emails whatever address the submitter typed. Without limits, anyone
could have pointed the form at any address and used the endpoint to send mail from
the HopelyWorks Gmail account — to strangers, repeatedly. That is the single
biggest reason the rate limits and Turnstile matter here. It is not a theoretical
concern; open form endpoints get found and abused by automated scanners.

---

## Optional step 1 — turn on Turnstile

Cloudflare Turnstile is a free, no-image-puzzle CAPTCHA. **You do not need to move
the site to Cloudflare** — just a free account for the keys. For normal visitors it
is completely invisible; the checkbox only appears when Cloudflare wants a human
check.

Until both keys are set, the form works exactly as it does today, with no
verification step. Adding the site key alone (without the secret) does nothing
harmful — it just shows the widget without verifying it.

**1. Get the keys** — [dash.cloudflare.com](https://dash.cloudflare.com) → Turnstile
→ Add widget → set the hostname to `hopelyworks.com` → Widget Mode: **Managed**.
Copy both keys.

**2. Site key** (public — safe in the page source) — in `site/index.html`, find:

```js
const TURNSTILE_SITE_KEY = '';
```

and paste the site key between the quotes. Commit and push; Vercel redeploys.

**3. Secret key** (private — never in this repo) — in the Apps Script editor:

> Project Settings → Script Properties → Add script property
> Property: `TURNSTILE_SECRET_KEY`   Value: *your secret key*

Then redeploy the script:

> Deploy → Manage deployments → pencil icon → Version: **New version** → Deploy

Editing the script without deploying a **new version** changes nothing — the old
version keeps serving. This is the single most common reason an Apps Script edit
"didn't work".

**A note on where the secret lives.** It has to sit wherever the code that verifies
it runs, and that is Apps Script. Putting it in Vercel's environment variables would
do nothing: the form posts from the visitor's browser straight to Google, so Vercel
never sees the submission and has no code to read the variable.

---

## Optional step 2 — enforce the Content-Security-Policy

`vercel.json` currently sends the CSP in **report-only** mode. It logs violations to
the browser console and blocks nothing, so it cannot break the site.

To promote it once you are confident:

1. Browse the site with DevTools open. Collect every `[Report Only]` violation.
2. Add any legitimate source it flags to the matching directive.
3. Rename the header from `Content-Security-Policy-Report-Only` to
   `Content-Security-Policy`.
4. Redeploy and click through every page, especially the form.

Expect inline `<script>` blocks to be reported — the pages have several. Each needs
its SHA-256 added to `script-src` before enforcing, or the policy will break the
site. This is why it ships report-only.

---

## Known gaps, deliberately left

Honest list. None of these are urgent for a brochure site with a contact form, but
they are real and worth knowing.

**Tailwind loads from a CDN.** `site/*.html` pull `https://cdn.tailwindcss.com` at
runtime. If that CDN were ever compromised, arbitrary JavaScript would run on the
site. It also cannot be pinned with Subresource Integrity, because the script
generates styles at runtime rather than serving a fixed file. Tailwind's own docs
say the Play CDN is not for production. The fix is a build step that compiles
Tailwind to a static CSS file — a change to how the site is built, well beyond a
security patch, so it is flagged rather than done here.

**The funnel and landing pages do not deliver leads.** `site/funnel.html` and
`site/landing.html` both collect a name, email and business description, show a
thank-you, and then discard everything. Neither posts anywhere — both still carry a
`TODO`. Anyone filling them in believes they have made contact and has not. This is
a data-loss bug rather than a security hole, but it is the most costly issue in the
repo, so it is recorded here. Only `site/index.html` actually delivers.

**Rate-limit counters are best-effort.** They live in the Apps Script cache, which
can be evicted early. A determined distributed flood could exceed the nominal caps.
The quota reserve is the backstop that protects the Gmail account regardless.

---

## Verifying the headers

```bash
curl -sI https://www.hopelyworks.com/ | grep -iE \
  'content-security|x-frame|x-content-type|referrer-policy|permissions-policy|strict-transport'
```

Or paste the URL into [securityheaders.com](https://securityheaders.com) for a
graded report.

---

## Reporting a problem

Found something? Email **hopelyworks@gmail.com** rather than opening a public issue.
