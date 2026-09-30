import http from "node:http";
import { readFileSync } from "node:fs";
import { randomBytes, scryptSync, timingSafeEqual, createHmac, createHash } from "node:crypto";
import QRCode from "qrcode";
import { q } from "./db.js";
import { suggest, LANGS } from "./ai.js";
import * as V from "./views.js";
import { logo } from "./art.js";

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`; // set to https://dukanreviews.com in production
const UPI_ID = process.env.UPI_ID || "9772883504@ybl";
const GOOGLE_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT = `${BASE_URL}/auth/google/callback`;
const DAY = 864e5;
const TRIAL_DAYS = 14;
const reviewPage = readFileSync(new URL("./review.html", import.meta.url), "utf8")
  .replace("/*BASE*/", V.BASE).replace("__LOGO__", logo(18));

// ---------- helpers ----------
const send = (res, code, body, type = "text/html; charset=utf-8", headers = {}) => {
  res.writeHead(code, { "content-type": type, ...headers });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : String(body));
};
const json = (res, code, body) => send(res, code, JSON.stringify(body), "application/json");
const redirect = (res, to, headers = {}) => { res.writeHead(303, { location: to, ...headers }); res.end(); };

async function readBody(req) {
  let data = "";
  for await (const chunk of req) {
    data += chunk;
    if (data.length > 20_000) throw new Error("body too large");
  }
  if ((req.headers["content-type"] || "").includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(data));
  }
  try { return JSON.parse(data || "{}"); } catch { return {}; }
}

const cookies = (req) => Object.fromEntries((req.headers.cookie || "").split(";").map((c) => c.trim().split("=")).filter((c) => c[0]));
const secure = BASE_URL.startsWith("https") ? "; Secure" : "";

// ponytail: in-memory per-IP limiter, resets on restart and isn't shared across instances. Move to Redis if you scale out.
const hits = new Map();
function limited(req, bucket, max = 30, windowMs = 10 * 60e3) {
  const fwd = process.env.TRUST_PROXY && req.headers["x-forwarded-for"]?.split(",")[0].trim();
  const ip = `${bucket}:${fwd || req.socket?.remoteAddress || ""}`;
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || h.reset < now) { hits.set(ip, { n: 1, reset: now + windowMs }); return false; }
  return ++h.n > max;
}

// ---------- auth ----------
const hashPassword = (pw) => {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(pw, salt, 64).toString("hex")}`;
};
const checkPassword = (pw, stored) => {
  const [salt, hash] = stored.split(":");
  return timingSafeEqual(scryptSync(pw, Buffer.from(salt, "hex"), 64), Buffer.from(hash, "hex"));
};
function startSession(ownerId) {
  const token = randomBytes(32).toString("hex");
  q("INSERT INTO sessions (token, owner_id, expires) VALUES (?, ?, ?)").run(token, ownerId, Date.now() + 30 * DAY);
  return { "set-cookie": `sid=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${30 * 86400}${secure}` };
}
const currentOwner = (req) => {
  const sid = cookies(req).sid;
  return sid ? q(`SELECT o.*, NOT EXISTS (SELECT 1 FROM payments p WHERE p.owner_id = o.id AND p.status = 'paid') AS trial
    FROM sessions s JOIN owners o ON o.id = s.owner_id WHERE s.token = ? AND s.expires > ?`).get(sid, Date.now()) : undefined;
};

const sha256 = (s) => createHash("sha256").update(s).digest("hex");

// Sends via Resend when configured; otherwise prints to the console (demo mode, like billing).
async function sendEmail(to, subject, body) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    console.log(`[email to ${to}] ${subject}\n${body}`);
    return;
  }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, html: body }),
  });
  if (!r.ok) throw new Error(`Email failed: ${r.status} ${await r.text()}`);
}

// Exchanges the one-time code for the user's verified identity.
async function googleClaims(code) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: GOOGLE_ID, client_secret: GOOGLE_SECRET, redirect_uri: GOOGLE_REDIRECT, grant_type: "authorization_code" }),
  });
  if (!r.ok) throw new Error(`Google token exchange failed: ${r.status} ${await r.text()}`);
  // The ID token came straight from Google over TLS in exchange for our client secret, so per Google's
  // OpenID docs its signature needn't be re-verified; we still check who it's for, who issued it, and expiry.
  const c = JSON.parse(Buffer.from(String((await r.json()).id_token).split(".")[1] || "", "base64url"));
  const ok = c.aud === GOOGLE_ID && ["accounts.google.com", "https://accounts.google.com"].includes(c.iss)
    && c.exp * 1000 > Date.now() && (c.email_verified === true || c.email_verified === "true") && c.email && c.sub;
  return ok ? c : null;
}

// ---------- outlets & analytics ----------
const cleanKeywords = (s = "") => [...new Set(String(s).split(",").map((k) => k.replace(/\|/g, "").trim().slice(0, 40)).filter(Boolean))].slice(0, 12).join(", ");
const keywordList = (o) => (o.keywords ? o.keywords.split(", ") : []);

// Only https links or bare Place IDs, so a stored value can never become a javascript: or http: redirect.
function validGoogleTarget(v) {
  if (/^[\w-]{10,}$/.test(v)) return true;
  try { return new URL(v).protocol === "https:"; } catch { return false; }
}

function validateOutlet(b) {
  const o = {
    name: String(b.name || "").trim().slice(0, 100),
    category: String(b.category || "").trim().slice(0, 60),
    keywords: cleanKeywords(b.keywords),
    place_id: String(b.place_id || "").trim().slice(0, 300),
  };
  const error = !o.name || !o.category || !o.place_id ? "Business name, type and Google review link are required."
    : !validGoogleTarget(o.place_id) ? "That doesn't look like a Google review link (starting with https://) or a Place ID." : "";
  return { o, error };
}

function outletStats(id, since) {
  const count = (type) => q("SELECT COUNT(*) n FROM events WHERE outlet_id = ? AND type = ? AND ts > ?").get(id, type, since).n;
  return {
    scans: count("scan"),
    copies: count("copy"),
    feedback: q("SELECT COUNT(*) n FROM feedback WHERE outlet_id = ? AND ts > ?").get(id, since).n,
    stars: q("SELECT rating, COUNT(*) n FROM (SELECT rating FROM events WHERE outlet_id = ? AND type = 'copy' AND ts > ? UNION ALL SELECT rating FROM feedback WHERE outlet_id = ? AND ts > ?) WHERE rating BETWEEN 1 AND 5 GROUP BY rating").all(id, since, id, since),
    langs: q("SELECT lang, COUNT(*) n FROM events WHERE outlet_id = ? AND type = 'copy' AND ts > ? AND lang IS NOT NULL GROUP BY lang ORDER BY n DESC").all(id, since),
  };
}

// A public outlet is only live while its owner's plan (or trial) is paid up.
const liveOutlet = (slug) => q("SELECT t.* FROM outlets t JOIN owners o ON o.id = t.owner_id WHERE t.slug = ? AND o.paid_until > ?").get(String(slug || ""), Date.now());

// ---------- billing ----------
// Generate UPI string for QR code
function generateUPIString(upiId, name, amount, transactionRef) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: encodeURIComponent(name),
    am: (amount / 100).toFixed(2),
    tn: encodeURIComponent(`Payment for ${transactionRef}`),
    tr: transactionRef,
  });
  return `upi://pay?${params.toString()}`;
}

// Generate UPI QR code
async function generateUPIQRCode(upiString) {
  return await QRCode.toDataURL(upiString, { errorCorrectionLevel: "M", type: "image/png", width: 300, margin: 2 });
}

// ---------- routes ----------
export async function handle(req, res) {
  const url = new URL(req.url, BASE_URL);
  const path = url.pathname;
  const method = req.method || "GET";
  const now = Date.now();
  const owner = currentOwner(req);
  const page = (title, body, code = 200) => send(res, code, V.layout(title, body, owner));

  // --- public: customer review flow ---
  if (method === "GET" && path.startsWith("/r/")) {
    const o = liveOutlet(path.slice(3));
    if (!o) return send(res, 404, V.message("Page unavailable", "This review page isn't active right now."));
    const data = JSON.stringify({ slug: o.slug, name: o.name, googleUrl: V.googleUrl(o), keywords: keywordList(o) }).replace(/</g, "\\u003c");
    return send(res, 200, reviewPage.replace("__DATA__", data));
  }
  if (method === "GET" && path === "/api/suggest") {
    const o = liveOutlet(url.searchParams.get("slug"));
    const rating = Number(url.searchParams.get("rating"));
    const lang = url.searchParams.get("lang");
    if (!o || ![1, 2, 3, 4, 5].includes(rating) || !LANGS.includes(lang)) return json(res, 400, { error: "Invalid request" });
    if (limited(req, "suggest")) return json(res, 429, { error: "Too many requests, please write your own review below." });
    // Only highlights the owner configured can reach the prompt.
    const allowed = keywordList(o);
    const liked = (url.searchParams.get("liked") || "").split("|").filter((k) => allowed.includes(k));
    try {
      return json(res, 200, { reviews: await suggest(o, rating, lang, liked) });
    } catch (e) {
      console.error(e);
      return json(res, 502, { error: "Couldn't load suggestions — write your own below." });
    }
  }
  if (method === "POST" && path === "/api/event") {
    const b = await readBody(req);
    const o = liveOutlet(b.slug);
    if (!o) return json(res, 400, { error: "Invalid request" });
    if (!["scan", "copy"].includes(b.type)) return json(res, 400, { error: "Invalid request" });
    if (limited(req, "event", 60)) return json(res, 429, { error: "Too many requests" });
    if (owner) return json(res, 200, { ok: true }); // owners checking their own page don't skew stats
    const rating = [1, 2, 3, 4, 5].includes(b.rating) ? b.rating : null;
    q("INSERT INTO events (outlet_id, type, rating, lang, ts) VALUES (?, ?, ?, ?, ?)").run(o.id, b.type, rating, LANGS.includes(b.lang) ? b.lang : null, now);
    return json(res, 200, { ok: true });
  }
  if (method === "POST" && path === "/api/feedback") {
    const b = await readBody(req);
    const o = liveOutlet(b.slug);
    const message = String(b.message || "").trim().slice(0, 2000);
    if (!o || !message) return json(res, 400, { error: "Message is required" });
    if (limited(req, "feedback", 10)) return json(res, 429, { error: "Too many requests" });
    const rating = [1, 2, 3, 4, 5].includes(b.rating) ? b.rating : null;
    q("INSERT INTO feedback (outlet_id, rating, message, contact, ts) VALUES (?, ?, ?, ?, ?)").run(o.id, rating, message, String(b.contact || "").trim().slice(0, 200), now);
    return json(res, 200, { ok: true });
  }

  // --- public: marketing & auth ---
  if (method === "GET" && path === "/") return owner ? redirect(res, "/dashboard") : page("Home", V.landing());
  if (method === "GET" && path === "/auth/google") {
    if (!GOOGLE_ID) return redirect(res, "/login");
    const state = randomBytes(16).toString("hex"); // ties Google's reply to this browser (CSRF protection)
    const qs = new URLSearchParams({ client_id: GOOGLE_ID, redirect_uri: GOOGLE_REDIRECT, response_type: "code", scope: "openid email", state, prompt: "select_account" });
    return redirect(res, `https://accounts.google.com/o/oauth2/v2/auth?${qs}`,
      { "set-cookie": `g_state=${state}; HttpOnly; SameSite=Lax; Path=/auth/google; Max-Age=600${secure}` });
  }
  if (method === "GET" && path === "/auth/google/callback") {
    const clear = `g_state=; HttpOnly; SameSite=Lax; Path=/auth/google; Max-Age=0${secure}`;
    const fail = () => redirect(res, "/login?e=google", { "set-cookie": clear });
    const state = cookies(req).g_state;
    if (!GOOGLE_ID || !state || url.searchParams.get("state") !== state || !url.searchParams.get("code")) return fail();
    const claims = await googleClaims(url.searchParams.get("code")).catch((e) => { console.error(e); return null; });
    if (!claims) return fail();
    const email = claims.email.toLowerCase();
    // Same Google account, or an email-signup account not yet linked to Google.
    let o = q("SELECT id FROM owners WHERE google_sub = ?").get(claims.sub) || q("SELECT id FROM owners WHERE email = ? AND google_sub IS NULL").get(email);
    const isNew = !o;
    if (o) q("UPDATE owners SET google_sub = ? WHERE id = ?").run(claims.sub, o.id);
    else if (q("SELECT 1 FROM owners WHERE email = ?").get(email)) return fail(); // email already linked to a different Google account
    else o = { id: Number(q("INSERT INTO owners (email, pass, paid_until, created, google_sub) VALUES (?, '', ?, ?, ?)").run(email, now + TRIAL_DAYS * DAY, now, claims.sub).lastInsertRowid) };
    return redirect(res, isNew ? "/outlets/new" : "/dashboard", { "set-cookie": [startSession(o.id)["set-cookie"], clear] });
  }
  if (path === "/signup" || path === "/login") {
    const mode = path.slice(1);
    if (method === "GET") {
      if (owner) return redirect(res, "/dashboard");
      return page(mode, V.authForm(mode, url.searchParams.get("e") === "google" ? "Google sign-in didn't work. Please try again or use your email." : ""));
    }
    const b = await readBody(req);
    const email = String(b.email || "").trim().toLowerCase();
    const password = String(b.password || "");
    if (limited(req, "auth", 20)) return page(mode, V.authForm(mode, "Too many attempts, try again in a few minutes.", email), 429);
    if (mode === "signup") {
      if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return page(mode, V.authForm(mode, "Enter a valid email and a password of at least 8 characters.", email), 400);
      if (q("SELECT 1 FROM owners WHERE email = ?").get(email)) return page(mode, V.authForm(mode, "That email already has an account.", email), 400);
      const { lastInsertRowid } = q("INSERT INTO owners (email, pass, paid_until, created) VALUES (?, ?, ?, ?)").run(email, hashPassword(password), now + TRIAL_DAYS * DAY, now);
      return redirect(res, "/outlets/new", startSession(Number(lastInsertRowid)));
    }
    const o = q("SELECT * FROM owners WHERE email = ?").get(email);
    if (o && !o.pass) return page(mode, V.authForm(mode, "This account uses Google sign-in. Tap \"Continue with Google\", or reset your password to add one.", email), 401);
    if (!o || !checkPassword(password, o.pass)) return page(mode, V.authForm(mode, "Wrong email or password.", email), 401);
    return redirect(res, "/dashboard", startSession(o.id));
  }
  if (path === "/forgot") {
    if (method === "GET") return page("Reset password", V.forgotForm());
    const email = String((await readBody(req)).email || "").trim().toLowerCase();
    if (limited(req, "forgot", 5)) return page("Reset password", V.forgotForm(false, "Too many attempts, try again in a few minutes."), 429);
    const o = q("SELECT id FROM owners WHERE email = ?").get(email);
    if (o) {
      const token = randomBytes(32).toString("hex");
      q("DELETE FROM resets WHERE owner_id = ?").run(o.id);
      q("INSERT INTO resets (token_hash, owner_id, expires) VALUES (?, ?, ?)").run(sha256(token), o.id, now + 3600e3);
      await sendEmail(email, "Reset your DukanReviews password", String(V.resetEmail(`${BASE_URL}/reset?token=${token}`))).catch(console.error);
    }
    return page("Reset password", V.forgotForm(true)); // same answer either way, so emails can't be probed
  }
  if (path === "/reset") {
    const b = method === "POST" ? await readBody(req) : {};
    const token = String(b.token || url.searchParams.get("token") || "");
    const r = token && q("SELECT * FROM resets WHERE token_hash = ? AND expires > ?").get(sha256(token), now);
    if (!r) return page("Reset password", V.resetForm("", "This reset link is invalid or has expired."), 400);
    if (method === "GET") return page("Reset password", V.resetForm(token));
    const password = String(b.password || "");
    if (password.length < 8) return page("Reset password", V.resetForm(token, "Use at least 8 characters."), 400);
    q("UPDATE owners SET pass = ? WHERE id = ?").run(hashPassword(password), r.owner_id);
    q("DELETE FROM resets WHERE owner_id = ?").run(r.owner_id);
    q("DELETE FROM sessions WHERE owner_id = ?").run(r.owner_id); // log out everywhere else
    return redirect(res, "/dashboard", startSession(r.owner_id));
  }
  if (method === "POST" && path === "/logout") {
    q("DELETE FROM sessions WHERE token = ?").run(cookies(req).sid || "");
    return redirect(res, "/", { "set-cookie": `sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}` });
  }

  // --- everything below needs a logged-in owner ---
  if (!owner) return method === "GET" ? redirect(res, "/login") : json(res, 401, { error: "Log in first" });

  if (method === "GET" && path === "/dashboard") {
    const outlets = q("SELECT * FROM outlets WHERE owner_id = ? ORDER BY id").all(owner.id).map((o) => ({ ...o, ...outletStats(o.id, now - 30 * DAY) }));
    return page("Dashboard", V.dashboard(owner, outlets, now));
  }

  if (path === "/outlets/new") {
    const count = q("SELECT COUNT(*) n FROM outlets WHERE owner_id = ?").get(owner.id).n;
    if (count >= owner.outlet_limit) return redirect(res, "/billing");
    if (method === "GET") return page("New outlet", V.outletForm());
    const { o, error } = validateOutlet(await readBody(req));
    if (error) return page("New outlet", V.outletForm(o, error), 400);
    const { lastInsertRowid } = q("INSERT INTO outlets (owner_id, slug, name, category, keywords, place_id, created) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(owner.id, randomBytes(5).toString("hex"), o.name, o.category, o.keywords, o.place_id, now);
    return redirect(res, `/outlets/${lastInsertRowid}?new=1`);
  }

  const m = path.match(/^\/outlets\/(\d+)(\/qr\.png|\/flyer|\/delete)?$/);
  if (m) {
    const o = q("SELECT * FROM outlets WHERE id = ? AND owner_id = ?").get(Number(m[1]), owner.id);
    if (!o) return page("Not found", V.html`<p>Outlet not found.</p>`, 404);
    const reviewUrl = `${BASE_URL}/r/${o.slug}`;
    if (method === "GET" && m[2] === "/qr.png") return send(res, 200, await QRCode.toBuffer(reviewUrl, { width: 1000, margin: 2 }), "image/png");
    if (method === "GET" && m[2] === "/flyer") return send(res, 200, V.flyer(o, reviewUrl));
    if (method === "POST" && m[2] === "/delete") {
      q("DELETE FROM outlets WHERE id = ?").run(o.id);
      return redirect(res, "/dashboard");
    }
    if (method === "POST" && !m[2]) {
      const { o: upd, error } = validateOutlet(await readBody(req));
      if (error) return page(o.name, V.outletForm({ ...o, ...upd }, error), 400);
      q("UPDATE outlets SET name = ?, category = ?, keywords = ?, place_id = ? WHERE id = ?").run(upd.name, upd.category, upd.keywords, upd.place_id, o.id);
      return redirect(res, `/outlets/${o.id}`);
    }
    if (method === "GET" && !m[2]) {
      const feedback = q("SELECT * FROM feedback WHERE outlet_id = ? ORDER BY ts DESC LIMIT 100").all(o.id);
      return page(o.name, V.outletPage(o, outletStats(o.id, now - 30 * DAY), feedback, reviewUrl, url.searchParams.has("new")));
    }
  }

  if (method === "GET" && path === "/billing") {
    const count = q("SELECT COUNT(*) n FROM outlets WHERE owner_id = ?").get(owner.id).n;
    return page("Billing", V.billing(owner, count, now, UPI_ID, url.searchParams.has("paid") ? "Payment received, thank you!" : ""));
  }
  if (method === "POST" && path === "/billing/order") {
    const count = q("SELECT COUNT(*) n FROM outlets WHERE owner_id = ?").get(owner.id).n;
    const outlets = Number((await readBody(req)).outlets);
    if (!Number.isInteger(outlets) || outlets < Math.max(1, count) || outlets > 50) {
      return json(res, 400, { error: `Choose between ${Math.max(1, count)} and 50 outlets.` });
    }
    const amount = V.price(outlets);
    try {
      const orderId = `upi_${randomBytes(8).toString("hex")}`;
      const upiString = generateUPIString(UPI_ID, "DukanReviews", amount, orderId);
      const qrCode = await generateUPIQRCode(upiString);
      q("INSERT INTO payments (owner_id, order_id, outlets, amount, ts) VALUES (?, ?, ?, ?, ?)").run(owner.id, orderId, outlets, amount, now);
      return json(res, 200, { orderId, amount, qrCode, upiString });
    } catch (e) {
      console.error(e);
      return json(res, 502, { error: "Couldn't generate QR code, please try again." });
    }
  }
  if (method === "POST" && path === "/billing/verify") {
    const b = await readBody(req);
    const p = q("SELECT * FROM payments WHERE order_id = ? AND owner_id = ? AND status = 'created'").get(String(b.orderId || ""), owner.id);
    if (!p) return json(res, 400, { error: "Unknown or already processed order" });
    // UPI verification: receipt ID is sent by user after payment
    const receiptId = String(b.receiptId || "");
    if (!receiptId) return json(res, 400, { error: "Receipt ID required" });
    q("UPDATE payments SET status = 'paid', payment_id = ? WHERE id = ?").run(receiptId, p.id);
    q("UPDATE owners SET paid_until = MAX(paid_until, ?) + ?, outlet_limit = ? WHERE id = ?").run(now, 30 * DAY, p.outlets, owner.id);
    return json(res, 200, { ok: true });
  }

  return page("Not found", V.html`<p>Page not found.</p>`, 404);
}

const server = http.createServer((req, res) =>
  handle(req, res).catch((e) => {
    console.error(e);
    if (!res.headersSent) json(res, 500, { error: "Something went wrong" });
  }));

if (process.argv[1] === new URL(import.meta.url).pathname) {
  if (!process.env.OPENROUTER_API_KEY) console.warn("⚠ OPENROUTER_API_KEY not set: customers see sample reviews.");
  if (!GOOGLE_ID) console.warn("⚠ GOOGLE_CLIENT_ID not set: the \"Continue with Google\" button is hidden.");
  if (!process.env.RESEND_API_KEY) console.warn("⚠ RESEND_API_KEY not set: password reset emails are printed here instead of sent.");
  console.log(`✓ UPI payments enabled: ${UPI_ID}`);
  server.listen(PORT, () => console.log(`DukanReviews running at ${BASE_URL}`));
}
