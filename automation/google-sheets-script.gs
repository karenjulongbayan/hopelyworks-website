// HopelyWorks - lead intake receiver (hardened)
// Paste into Extensions > Apps Script on your Google Sheet.
// Deploy as Web app (Execute as: Me, Who has access: Anyone).
// After ANY edit: Deploy > Manage deployments > pencil > Version: New version > Deploy
//
// SECURITY NOTES
// This endpoint is public by necessity - a static site has no server to hide it
// behind, so the /exec URL is visible in the page source and anyone can POST to it.
// Because Apps Script web apps cannot read request headers, an Origin check is not
// possible here. Abuse is contained with four server-side layers instead:
//   1. honeypot      - silently drops naive spam bots
//   2. Turnstile     - blocks scripted POSTs that never loaded the page
//   3. rate limits   - per-sender and site-wide caps
//   4. quota reserve - stops a flood from burning the daily Gmail send limit
// Layers 2-4 are what keep the auto-reply from being used as a spam relay.

var NOTIFY_EMAIL = 'hopelyworks@gmail.com';

// Where the "Book a discovery call" button points.
// Paste a Google Calendar appointment page or Calendly link here when you have one.
// Until then it falls back to your website contact section.
var BOOKING_URL = 'https://hopelyworks.com/#contact';

// Send an instant confirmation to the person who filled the form
var SEND_AUTOREPLY = true;

// -- Abuse limits ----------------------------------------------------------
var RATE_WINDOW_SEC   = 600;  // per-sender window: 10 minutes
var RATE_MAX_PER_USER = 3;    // max submissions per email address per window
var GLOBAL_WINDOW_SEC = 3600; // site-wide window: 1 hour
var GLOBAL_MAX        = 40;   // max submissions site-wide per hour
var QUOTA_RESERVE     = 20;   // stop auto-replies when daily send quota drops here
var QUOTA_HARD_FLOOR  = 5;    // stop all mail (still records the row) below this
var MAX_BODY_BYTES    = 20000;

// -- Field length caps (values are truncated, never rejected) ---------------
var MAX_LEN = {
  name: 120, email: 254, needs: 300, business: 5000,
  timing: 60, budget: 60, site: 500, source: 120
};

// Set TURNSTILE_SECRET_KEY in Apps Script:
//   Project Settings > Script Properties > Add script property
// Until it is set, verification is skipped so the form keeps working.
function turnstileSecret() {
  try {
    return PropertiesService.getScriptProperties().getProperty('TURNSTILE_SECRET_KEY') || '';
  } catch (e) {
    return '';
  }
}

var HEADERS = [
  'Timestamp',
  'Name',
  'Email',
  'Needs help with',
  'About the business',
  'Timeline',
  'Budget',
  'Website or social',
  'Source',
  'Status'
];

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonOut({ result: 'error', message: 'Bad request' });
    }
    // Reject oversized bodies before parsing them.
    if (e.postData.contents.length > MAX_BODY_BYTES) {
      return jsonOut({ result: 'error', message: 'Payload too large' });
    }

    var raw;
    try {
      raw = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return jsonOut({ result: 'error', message: 'Bad request' });
    }
    if (!raw || typeof raw !== 'object') {
      return jsonOut({ result: 'error', message: 'Bad request' });
    }

    // 1. Honeypot - a hidden field no human ever fills. Pretend success.
    if (raw.company && String(raw.company).trim()) {
      return jsonOut({ result: 'success' });
    }

    // 2. Turnstile - proves the POST came from a browser that loaded the page.
    if (!verifyTurnstile(raw.turnstileToken)) {
      return jsonOut({ result: 'error', message: 'Verification failed' });
    }

    // 3. Validate and clamp every field before it touches the sheet or an email.
    var data = sanitize(raw);
    if (!data.email) {
      return jsonOut({ result: 'error', message: 'A valid email is required' });
    }

    // 4. Rate limit per sender and site-wide.
    if (!checkRateLimit(data.email)) {
      return jsonOut({ result: 'error', message: 'Too many requests. Please try again later.' });
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      var head = sheet.getRange(1, 1, 1, HEADERS.length);
      head.setFontWeight('bold');
      head.setBackground('#22352F');
      head.setFontColor('#F8F5F0');
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(1, 160);
      sheet.setColumnWidth(2, 150);
      sheet.setColumnWidth(3, 210);
      sheet.setColumnWidth(4, 240);
      sheet.setColumnWidth(5, 420);
      sheet.setColumnWidth(8, 220);
      sheet.setColumnWidth(10, 120);
    }

    sheet.appendRow([
      new Date(),
      data.name,
      data.email,
      data.needs,
      data.business,
      data.timing,
      data.budget,
      data.site,
      data.source,
      'New'
    ]);

    var r = sheet.getLastRow();
    sheet.getRange(r, 1, 1, HEADERS.length).setVerticalAlignment('top');
    sheet.getRange(r, 5).setWrap(true);

    // 5. Send mail only while there is comfortable quota left. The lead is
    //    already saved above, so a flood costs notifications, never data.
    var quota = remainingQuota();

    if (NOTIFY_EMAIL && quota > QUOTA_HARD_FLOOR) {
      sendNotification(data, r);
    }

    if (SEND_AUTOREPLY && data.email && quota > QUOTA_RESERVE) {
      sendAutoReply(data);
    }

    return jsonOut({ result: 'success', row: r });
  } catch (err) {
    // Log the detail for the owner; return nothing useful to the caller.
    console.error('doPost failed: ' + err);
    return jsonOut({ result: 'error', message: 'Something went wrong' });
  }
}

// -- Validation ------------------------------------------------------------

// Drop C0 control characters and DEL, keeping tab / newline / carriage return.
// Written as a loop rather than a regex literal so this file stays plain ASCII
// and survives copy-paste into the Apps Script editor.
function stripControl(s) {
  var out = '';
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i);
    if (c === 9 || c === 10 || c === 13) { out += s.charAt(i); continue; }
    if (c < 32 || c === 127) continue;
    out += s.charAt(i);
  }
  return out;
}

function clamp(value, max) {
  if (value === null || value === undefined) return '';
  var s = stripControl(String(value));
  return s.length > max ? s.substring(0, max) : s;
}

function validEmail(s) {
  if (!s) return '';
  var v = String(s).trim();
  if (v.length > MAX_LEN.email) return '';
  // Deliberately strict: no whitespace, no commas/semicolons/brackets, one @.
  return /^[^\s@,;<>"']+@[^\s@,;<>"']+\.[^\s@,;<>"']+$/.test(v) ? v : '';
}

function sanitize(raw) {
  return {
    name:     clamp(raw.name, MAX_LEN.name).trim(),
    email:    validEmail(raw.email),
    needs:    clamp(raw.needs, MAX_LEN.needs).trim(),
    business: clamp(raw.business, MAX_LEN.business).trim(),
    timing:   clamp(raw.timing, MAX_LEN.timing).trim(),
    budget:   clamp(raw.budget, MAX_LEN.budget).trim(),
    site:     clamp(raw.site, MAX_LEN.site).trim(),
    source:   clamp(raw.source, MAX_LEN.source).trim() || 'hopelyworks.com'
  };
}

// -- Anti-abuse ------------------------------------------------------------

function verifyTurnstile(token) {
  var secret = turnstileSecret();
  if (!secret) return true; // not configured yet - fail open so the form works

  try {
    var res = UrlFetchApp.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'post',
      payload: { secret: secret, response: token || '' },
      muteHttpExceptions: true
    });
    var body = JSON.parse(res.getContentText() || '{}');
    return body.success === true;
  } catch (err) {
    console.error('Turnstile verify failed: ' + err);
    return false; // configured but unreachable - fail closed
  }
}

// Returns true if the submission is allowed through.
function checkRateLimit(email) {
  var cache;
  try {
    cache = CacheService.getScriptCache();
  } catch (e) {
    return true; // cache unavailable - do not lose the lead
  }

  var lock = LockService.getScriptLock();
  var haveLock = false;
  try {
    haveLock = lock.tryLock(5000);
  } catch (e) {
    haveLock = false;
  }
  if (!haveLock) {
    // Contended. Let it through rather than drop a real enquiry; the mail
    // quota reserve still bounds the damage.
    return true;
  }

  try {
    var key = 'rl_' + md5(email.toLowerCase());
    var mine = parseInt(cache.get(key) || '0', 10);
    if (mine >= RATE_MAX_PER_USER) return false;

    var all = parseInt(cache.get('rl_global') || '0', 10);
    if (all >= GLOBAL_MAX) return false;

    cache.put(key, String(mine + 1), RATE_WINDOW_SEC);
    cache.put('rl_global', String(all + 1), GLOBAL_WINDOW_SEC);
    return true;
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function md5(s) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, s);
  var out = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
    out += (b < 16 ? '0' : '') + b.toString(16);
  }
  return out;
}

function remainingQuota() {
  try {
    return MailApp.getRemainingDailyQuota();
  } catch (e) {
    return 0;
  }
}

// -- Escaping --------------------------------------------------------------

function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// For values placed inside an href="..." attribute.
function escapeAttr(s) {
  return escapeHtml(s);
}

// Only ever emit http(s) links. Anything else is rendered as plain text so a
// javascript: or data: URL can never become a clickable link in the email.
function safeUrl(url) {
  if (!url) return '';
  var v = String(url).trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return ''; // some other scheme - refuse
  return 'https://' + v;
}

function linkify(site) {
  if (!site) return '';
  var href = safeUrl(site);
  if (!href) return escapeHtml(site); // unsafe scheme - show it, do not link it
  return '<a href="' + escapeAttr(href) + '" style="color:#B8935A;text-decoration:none">' +
    escapeHtml(site) + '</a>';
}

// -- Email templates -------------------------------------------------------

function sendNotification(data, rowNum) {
  var name = data.name || 'Someone';
  var first = name.split(' ')[0];
  var needs = data.needs || '';
  var timing = data.timing || '';

  // Priority flag based on how urgent and how big
  var hot = (timing === 'ASAP') || (data.budget === '$3k+');
  var flag = hot ? 'PRIORITY' : 'New enquiry';

  // Strip newlines so a crafted name cannot inject extra mail headers.
  var subject = (flag + ': ' + name + (needs ? ' - ' + needs : '')).replace(/[\r\n]+/g, ' ');

  var sheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  var replyBody = 'Hi ' + first + ',%0D%0A%0D%0A' +
    'Thank you for reaching out to HopelyWorks. ' +
    'I read through what you shared about your business.%0D%0A%0D%0A' +
    '%0D%0A%0D%0A' +
    'Would you be free for a short call this week? Happy to work around your timezone.%0D%0A%0D%0A' +
    'Warm regards,%0D%0AKaren%0D%0AHopelyWorks%0D%0Ahopelyworks.com';
  var replyLink = 'mailto:' + encodeURIComponent(data.email || '') +
    '?subject=' + encodeURIComponent('Re: your enquiry - HopelyWorks') +
    '&body=' + replyBody;

  var html =
  '<div style="margin:0;padding:24px;background:#F8F5F0;font-family:Helvetica,Arial,sans-serif">' +
    '<div style="max-width:600px;margin:0 auto;background:#FFFFFF;border:1px solid #E3DDD2;border-radius:16px;overflow:hidden">' +

      // Header band
      '<div style="background:#22352F;padding:28px 32px">' +
        '<div style="color:#CFB68C;font-size:11px;letter-spacing:3px;text-transform:uppercase">' +
          (hot ? 'Priority enquiry' : 'New enquiry') +
        '</div>' +
        '<div style="color:#F8F5F0;font-size:26px;font-family:Georgia,serif;margin-top:8px">' +
          escapeHtml(name) +
        '</div>' +
        '<div style="color:rgba(248,245,240,0.65);font-size:13px;margin-top:6px">' +
          escapeHtml(data.email || '') +
        '</div>' +
      '</div>' +

      // Needs chips
      (needs ?
      '<div style="padding:22px 32px 4px 32px">' +
        '<div style="color:#8A8880;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:10px">Needs help with</div>' +
        chips(needs) +
      '</div>' : '') +

      // Their words
      (data.business ?
      '<div style="padding:20px 32px 0 32px">' +
        '<div style="color:#8A8880;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:10px">In their words</div>' +
        '<div style="border-left:3px solid #B8935A;padding:4px 0 4px 16px;color:#2B2B2B;font-size:15px;line-height:1.65">' +
          escapeHtml(data.business).replace(/\n/g, '<br>') +
        '</div>' +
      '</div>' : '') +

      // Facts grid
      '<div style="padding:24px 32px 8px 32px">' +
        '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">' +
          factRow('Timeline', escapeHtml(timing)) +
          factRow('Budget', escapeHtml(data.budget)) +
          factRow('Website / social', linkify(data.site)) +
          factRow('Source', escapeHtml(data.source || 'hopelyworks.com')) +
          factRow('Received', Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMM d, yyyy - h:mm a')) +
        '</table>' +
      '</div>' +

      // Actions
      '<div style="padding:12px 32px 30px 32px">' +
        '<a href="' + escapeAttr(replyLink) + '" ' +
          'style="display:inline-block;background:#22352F;color:#F8F5F0;text-decoration:none;' +
          'padding:14px 26px;border-radius:999px;font-size:14px;font-weight:bold">Reply to ' + escapeHtml(first) + '</a>' +
        '<a href="' + escapeAttr(sheetUrl) + '" ' +
          'style="display:inline-block;margin-left:10px;color:#22352F;text-decoration:none;' +
          'padding:14px 22px;border:1px solid #E3DDD2;border-radius:999px;font-size:14px">Open sheet (row ' + rowNum + ')</a>' +
      '</div>' +

      // Footer
      '<div style="background:#EFEAE2;padding:16px 32px;border-top:1px solid #E3DDD2">' +
        '<div style="color:#8A8880;font-size:12px">' +
          'Reply within one business day &nbsp;|&nbsp; hopelyworks.com' +
        '</div>' +
      '</div>' +

    '</div>' +
  '</div>';

  var plain =
    (hot ? 'PRIORITY ENQUIRY' : 'NEW ENQUIRY') + '\n\n' +
    'Name: ' + name + '\n' +
    'Email: ' + (data.email || '-') + '\n' +
    'Needs: ' + (needs || '-') + '\n\n' +
    'About the business:\n' + (data.business || '-') + '\n\n' +
    'Timeline: ' + (timing || '-') + '\n' +
    'Budget: ' + (data.budget || '-') + '\n' +
    'Website: ' + (data.site || '-') + '\n\n' +
    'Sheet: ' + sheetUrl;

  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: subject,
    body: plain,
    htmlBody: html,
    replyTo: data.email || NOTIFY_EMAIL,
    name: 'HopelyWorks Website'
  });
}

function chips(needsString) {
  var parts = needsString.split(',');
  var out = '';
  for (var i = 0; i < parts.length; i++) {
    var t = parts[i].replace(/^\s+|\s+$/g, '');
    if (!t) continue;
    out += '<span style="display:inline-block;background:#F1E9DC;color:#22352F;' +
           'border-radius:999px;padding:7px 15px;font-size:13px;font-weight:bold;' +
           'margin:0 6px 8px 0">' + escapeHtml(t) + '</span>';
  }
  return out;
}

// NOTE: `value` is inserted as HTML. Callers must pass already-escaped text, or
// markup they built themselves and know to be safe (see linkify).
function factRow(label, value) {
  var v = value ? value : '-';
  return '<tr>' +
    '<td style="padding:11px 0;border-bottom:1px solid #EFEAE2;color:#8A8880;font-size:13px;width:40%">' +
      escapeHtml(label) +
    '</td>' +
    '<td style="padding:11px 0;border-bottom:1px solid #EFEAE2;color:#2B2B2B;font-size:14px;font-weight:bold">' +
      v +
    '</td>' +
  '</tr>';
}

function sendAutoReply(data) {
  var name = data.name || '';
  var first = name ? name.split(' ')[0] : 'there';
  var needs = data.needs || '';

  var html =
  '<div style="margin:0;padding:24px;background:#F8F5F0;font-family:Helvetica,Arial,sans-serif">' +
    '<div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E3DDD2;border-radius:16px;overflow:hidden">' +

      // Brand header
      '<div style="background:#22352F;padding:34px 34px 30px 34px;text-align:center">' +
        '<div style="font-family:Georgia,serif;font-size:28px;color:#F8F5F0;letter-spacing:1px">' +
          'Hopely <span style="color:#B8935A">|</span> <span style="color:#CFB68C">Works</span>' +
        '</div>' +
        '<div style="color:rgba(248,245,240,0.55);font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-top:10px">' +
          'Websites . Brand design . Automation . Lead generation' +
        '</div>' +
      '</div>' +

      // Body
      '<div style="padding:34px">' +
        '<div style="font-family:Georgia,serif;font-size:24px;color:#22352F;line-height:1.3">' +
          'Thank you, ' + escapeHtml(first) + '.' +
        '</div>' +

        '<p style="color:#5C5C58;font-size:15px;line-height:1.7;margin:18px 0 0 0">' +
          'We have received your enquiry and it is already with us. ' +
          'A real person reads every message that comes through, and you will hear ' +
          'back from us within one business day with a clear next step.' +
        '</p>' +

        (needs ?
        '<div style="margin-top:24px;background:#F8F5F0;border-radius:12px;padding:18px 20px">' +
          '<div style="color:#8A8880;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:8px">' +
            'What you asked about' +
          '</div>' +
          '<div style="color:#22352F;font-size:14px;font-weight:bold">' + escapeHtml(needs) + '</div>' +
        '</div>' : '') +

        // Divider with dot
        '<div style="text-align:center;margin:30px 0 24px 0">' +
          '<span style="display:inline-block;width:60px;height:1px;background:#CFB68C;vertical-align:middle"></span>' +
          '<span style="display:inline-block;width:6px;height:6px;background:#B8935A;border-radius:50%;margin:0 10px;vertical-align:middle"></span>' +
          '<span style="display:inline-block;width:60px;height:1px;background:#CFB68C;vertical-align:middle"></span>' +
        '</div>' +

        '<p style="color:#5C5C58;font-size:15px;line-height:1.7;margin:0 0 22px 0;text-align:center">' +
          'Would you like to talk sooner? Pick a time that suits you ' +
          'and we will come prepared.' +
        '</p>' +

        // CTA
        '<div style="text-align:center">' +
          '<a href="' + escapeAttr(BOOKING_URL) + '" ' +
            'style="display:inline-block;background:#22352F;color:#F8F5F0;text-decoration:none;' +
            'padding:15px 34px;border-radius:999px;font-size:14px;font-weight:bold">' +
            'Book a discovery call' +
          '</a>' +
          '<div style="color:#8A8880;font-size:12px;margin-top:12px">' +
            '20 minutes . No obligation . No sales pitch' +
          '</div>' +
        '</div>' +

        // What happens next
        '<div style="margin-top:32px;border-top:1px solid #EFEAE2;padding-top:24px">' +
          '<div style="color:#8A8880;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:14px">' +
            'What happens next' +
          '</div>' +
          nextStep('1', 'We read your enquiry properly', 'No template replies. We look at your business first.') +
          nextStep('2', 'You get an honest response', 'Within one business day, with a clear recommendation.') +
          nextStep('3', 'We talk it through', 'A short call, then a fixed quote before any work begins.') +
        '</div>' +
      '</div>' +

      // Footer
      '<div style="background:#EFEAE2;padding:22px 34px;text-align:center;border-top:1px solid #E3DDD2">' +
        '<div style="font-family:Georgia,serif;font-style:italic;color:#B8935A;font-size:14px">' +
          'Helping small businesses look the part and grow into it.' +
        '</div>' +
        '<div style="color:#8A8880;font-size:12px;margin-top:10px">' +
          'hopelyworks.com &nbsp;|&nbsp; hopelyworks@gmail.com' +
        '</div>' +
      '</div>' +

    '</div>' +
  '</div>';

  var plain =
    'Thank you, ' + first + '.\n\n' +
    'We have received your enquiry and it is already with us. A real person reads ' +
    'every message that comes through, and you will hear back within one business day.\n\n' +
    (needs ? 'What you asked about: ' + needs + '\n\n' : '') +
    'Would you like to talk sooner? Book a discovery call here:\n' + BOOKING_URL + '\n\n' +
    'What happens next:\n' +
    '1. We read your enquiry properly\n' +
    '2. You get an honest response within one business day\n' +
    '3. We talk it through, then a fixed quote before any work begins\n\n' +
    'Helping small businesses look the part and grow into it.\n' +
    'hopelyworks.com | hopelyworks@gmail.com';

  MailApp.sendEmail({
    to: data.email,
    subject: ('We have your enquiry, ' + first + ' - HopelyWorks').replace(/[\r\n]+/g, ' '),
    body: plain,
    htmlBody: html,
    replyTo: NOTIFY_EMAIL,
    name: 'HopelyWorks'
  });
}

function nextStep(num, title, sub) {
  return '<table cellpadding="0" cellspacing="0" style="margin-bottom:14px"><tr>' +
    '<td valign="top" style="width:30px;font-family:Georgia,serif;color:#B8935A;font-size:16px">' + num + '</td>' +
    '<td valign="top">' +
      '<div style="color:#22352F;font-size:14px;font-weight:bold">' + title + '</div>' +
      '<div style="color:#8A8880;font-size:13px;margin-top:2px">' + sub + '</div>' +
    '</td></tr></table>';
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Minimal response - does not advertise what this endpoint is or who owns it.
function doGet() {
  return jsonOut({ ok: true });
}

// Run this once from the editor to send yourself a sample email
function testEmail() {
  var sample = sanitize({
    name: 'Jane Santos',
    email: 'jane@brightsmiledental.com',
    needs: 'Website Design, Business Automation',
    business: 'We run a small dental clinic with three chairs. Patients book by calling, which means we miss calls all day and my front desk is drowning. Our website is five years old and does not work on phones.',
    timing: 'ASAP',
    budget: '$3k+',
    site: 'brightsmiledental.com',
    source: 'hopelyworks.com'
  });
  sendNotification(sample, 2);
  // preview the visitor auto-reply in your own inbox
  sample.email = NOTIFY_EMAIL;
  sendAutoReply(sample);
}
