// End-to-end check: drives the real request handler with an in-memory DB (no port needed).
import assert from "node:assert";
import { Readable } from "node:stream";

process.env.DB_PATH = ":memory:";
process.env.GOOGLE_CLIENT_ID = "test-client.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_SECRET = "test-secret";
delete process.env.OPENROUTER_API_KEY;
delete process.env.RAZORPAY_KEY_ID;
const { handle } = await import("./server.js");
const { buildPrompt } = await import("./ai.js");
const { q } = await import("./db.js");

let cookie = "";
async function call(method, url, body, type = "application/json") {
  const payload = body === undefined ? "" : type === "application/json" ? JSON.stringify(body) : new URLSearchParams(body).toString();
  const req = Object.assign(Readable.from(payload ? [payload] : []), {
    method, url, headers: { "content-type": type, cookie }, socket: { remoteAddress: "1.2.3.4" },
  });
  return new Promise((resolve) => {
    const res = {
      code: 200, headers: {}, headersSent: false,
      writeHead(code, h = {}) { this.code = code; this.headers = h; this.headersSent = true; return this; },
      end(b = "") {
        // tiny cookie jar: apply every set-cookie, dropping ones that are cleared
        const jar = Object.fromEntries(cookie.split("; ").filter(Boolean).map((c) => c.split("=")));
        for (const sc of [].concat(this.headers["set-cookie"] || [])) {
          const [k, v] = sc.split(";")[0].split("=");
          if (v) jar[k] = v; else delete jar[k];
        }
        cookie = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
        const text = Buffer.isBuffer(b) ? b : String(b);
        resolve({ code: this.code, headers: this.headers, text, json: () => JSON.parse(text) });
      },
    };
    handle(req, res);
  });
}
const form = (url, body) => call("POST", url, body, "application/x-www-form-urlencoded");

// prompt only includes what the customer picked, in their language
const p = buildPrompt({ name: "Joe's", category: "Cafe" }, 5, "Tamil", ["Filter coffee"]);
assert(p.includes("5/5") && p.includes("Tamil") && p.includes("Filter coffee") && !p.includes("undefined"));

// auth
assert.equal((await call("GET", "/dashboard")).headers.location, "/login");
assert.equal((await form("/signup", { email: "bad", password: "short" })).code, 400);
let r = await form("/signup", { email: "Owner@Cafe.in", password: "password123" });
assert.equal(r.headers.location, "/outlets/new");
assert.equal((await form("/signup", { email: "owner@cafe.in", password: "password123" })).code, 400, "duplicate email");
await call("POST", "/logout");
assert.equal((await form("/login", { email: "owner@cafe.in", password: "wrongpass1" })).code, 401);
assert.equal((await form("/login", { email: "owner@cafe.in", password: "password123" })).headers.location, "/dashboard");
const ownerCookie = cookie;

// outlet: escaping + keyword cleanup
r = await form("/outlets/new", { name: "<script>x</script> Cafe", category: "Café", keywords: "Coffee, coffee|, , Quick service", place_id: "javascript:alert(1)" });
assert.equal(r.code, 400, "non-https links rejected");
r = await form("/outlets/new", { name: "<script>x</script> Cafe", category: "Café", keywords: "Coffee, coffee|, , Quick service", place_id: "ChIJN1t_tDeuEmsRUsoyG83frY4" });
const outletPath = r.headers.location;
const base = outletPath.split("?")[0];
assert.match(outletPath, /^\/outlets\/\d+\?new=1$/);
const outlet = q("SELECT * FROM outlets").get();
assert.equal(outlet.keywords, "Coffee, coffee, Quick service");
r = await call("GET", outletPath);
assert(!r.text.includes("<script>x</script>") && r.text.includes("&lt;script&gt;"), "outlet name is escaped");
assert.equal((await form("/outlets/new", { name: "Second", category: "Cafe", place_id: "P2" })).headers.location, "/billing", "trial allows 1 outlet");
assert.equal((await call("GET", `${base}/qr.png`)).headers["content-type"], "image/png");

// owner viewing their own page doesn't count
await call("POST", "/api/event", { slug: outlet.slug, type: "scan" });
assert.equal(q("SELECT COUNT(*) n FROM events").get().n, 0);

// customer flow (logged out)
cookie = "";
r = await call("GET", `/r/${outlet.slug}`);
assert(r.text.includes("writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4") && !r.text.includes("<script>x</script>"), "data is embedded safely");
assert(r.text.includes("--p:#0F766E") && !r.text.includes("/*BASE*/"), "shared tokens spliced in");
assert.equal((await call("POST", "/api/event", { slug: outlet.slug, type: "scan" })).code, 200);
assert.equal((await call("POST", "/api/event", { slug: outlet.slug, type: "bogus" })).code, 400);
r = await call("GET", `/api/suggest?slug=${outlet.slug}&rating=5&lang=Hindi&liked=Coffee|Evil`);
assert.equal(r.json().reviews.length, 3);
assert.equal((await call("GET", `/api/suggest?slug=${outlet.slug}&rating=9&lang=Hindi`)).code, 400);
assert.equal((await call("GET", `/api/suggest?slug=${outlet.slug}&rating=5&lang=Klingon`)).code, 400);
assert.equal((await call("POST", "/api/event", { slug: outlet.slug, type: "copy", rating: 5, lang: "Hindi" })).code, 200);
assert.equal((await call("POST", "/api/feedback", { slug: outlet.slug, rating: 2, message: "Cold <b>tea</b>", contact: "98765 43210" })).code, 200);
assert.equal((await call("POST", "/api/feedback", { slug: outlet.slug, message: " " })).code, 400);

// analytics
cookie = ownerCookie;
r = await call("GET", outletPath);
assert(r.text.includes("QR scans<b>1</b>") && r.text.includes("Drafts copied to Google<b>1</b>") && r.text.includes("<b>100%</b>"));
assert(r.text.includes("Your QR code is ready") && r.text.includes("https://wa.me/919876543210"), "onboarding banner + WhatsApp reply link");
assert((await call("GET", "/dashboard")).text.includes("Free trial"));

// owner can switch to a Google review link
const id = outletPath.match(/\d+/)[0];
await form(`/outlets/${id}`, { name: "Cafe", category: "Cafe", place_id: "https://g.page/r/abc123/review" });
cookie = "";
assert((await call("GET", `/r/${outlet.slug}`)).text.includes('"googleUrl":"https://g.page/r/abc123/review"'));
cookie = ownerCookie;
assert(r.text.includes("Cold &lt;b&gt;tea&lt;/b&gt;") && r.text.includes("Hindi"), "feedback escaped, language shown");

// another owner can't see this outlet
cookie = "";
await form("/signup", { email: "other@x.in", password: "password123" });
assert.equal((await call("GET", outletPath)).code, 404);
cookie = ownerCookie;

// billing (demo mode): can't buy fewer outlets than you have; paying extends 30 days
assert.equal((await call("POST", "/billing/order", { outlets: 0 })).code, 400);
const before = q("SELECT paid_until FROM owners WHERE email = 'owner@cafe.in'").get().paid_until;
const order = (await call("POST", "/billing/order", { outlets: 2 })).json();
assert(order.demo);
assert.equal(q("SELECT amount FROM payments WHERE order_id = ?").get(order.orderId).amount, 39900 + 29900);
assert(( await call("POST", "/billing/verify", { razorpay_order_id: order.orderId })).json().ok);
assert.equal((await call("POST", "/billing/verify", { razorpay_order_id: order.orderId })).code, 400, "no double credit");
const after = q("SELECT paid_until, outlet_limit FROM owners WHERE email = 'owner@cafe.in'").get();
assert.equal(after.paid_until - before, 30 * 864e5);
assert.equal(after.outlet_limit, 2);

// password reset: link from the (console) email works once, logs out other sessions, never reveals if email exists
const logs = []; const origLog = console.log; console.log = (m) => logs.push(String(m));
cookie = "";
assert((await form("/forgot", { email: "nobody@x.in" })).text.includes("If that email has an account"));
assert.equal(logs.length, 0, "no email for unknown address");
assert((await form("/forgot", { email: "owner@cafe.in" })).text.includes("If that email has an account"));
console.log = origLog;
const resetToken = logs[0].match(/token=([a-f0-9]+)/)[1];
assert.equal(q("SELECT COUNT(*) n FROM resets WHERE token_hash = ?").get(resetToken).n, 0, "raw token not stored");
assert.equal((await form("/reset", { token: resetToken, password: "short" })).code, 400);
assert.equal((await form("/reset", { token: resetToken, password: "newpassword1" })).headers.location, "/dashboard");
assert.equal((await form("/reset", { token: resetToken, password: "another123" })).code, 400, "single use");
const fresh = cookie;
cookie = ownerCookie;
assert.equal((await call("GET", "/dashboard")).headers.location, "/login", "old sessions logged out");
cookie = "";
assert.equal((await form("/login", { email: "owner@cafe.in", password: "newpassword1" })).headers.location, "/dashboard");
assert.equal((await call("GET", "/reset?token=bogus")).code, 400);
cookie = fresh;

// OpenRouter call: right endpoint, headers and model; tolerant of models that wrap JSON in prose
{
  const { suggest } = await import("./ai.js");
  const realFetch = globalThis.fetch;
  let sent;
  globalThis.fetch = async (u, opts) => {
    sent = { u, opts, body: JSON.parse(opts.body) };
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'Sure! ```json\n{"reviews":["Great dosa!","Loved it.",7]}\n```' } }] }) };
  };
  process.env.OPENROUTER_API_KEY = "sk-or-test";
  const reviews = await suggest({ name: "Joe's", category: "Cafe" }, 5, "Hindi", []);
  delete process.env.OPENROUTER_API_KEY;
  globalThis.fetch = realFetch;
  assert.deepEqual(reviews, ["Great dosa!", "Loved it."]);
  assert.equal(sent.u, "https://openrouter.ai/api/v1/chat/completions");
  assert.equal(sent.opts.headers.authorization, "Bearer sk-or-test");
  assert.equal(sent.opts.headers["HTTP-Referer"], "https://dukanreviews.com");
  assert.equal(sent.body.model, "~openai/gpt-sol-latest");
  assert(sent.body.messages[0].content.includes("Hindi"));
}

// Continue with Google
const realFetch = globalThis.fetch;
const idToken = (claims) => `x.${Buffer.from(JSON.stringify({ aud: process.env.GOOGLE_CLIENT_ID, iss: "https://accounts.google.com",
  exp: Date.now() / 1000 + 600, email_verified: true, ...claims })).toString("base64url")}.sig`;
let googleReply;
globalThis.fetch = async (u, opts) => {
  assert.equal(u, "https://oauth2.googleapis.com/token");
  assert(String(opts.body).includes("client_secret=test-secret") && String(opts.body).includes("code=abc"));
  return { ok: true, json: async () => ({ id_token: idToken(googleReply) }) };
};
async function googleLogin(claims) {
  googleReply = claims;
  const start = await call("GET", "/auth/google");
  const auth = new URL(start.headers.location);
  assert.equal(auth.origin, "https://accounts.google.com");
  return call("GET", `/auth/google/callback?code=abc&state=${auth.searchParams.get("state")}`);
}
cookie = "";
assert((await call("GET", "/login")).text.includes("Continue with Google"));
r = await googleLogin({ sub: "g-new", email: "New@Gmail.com" });
assert.equal(r.headers.location, "/outlets/new", "new Google user gets an account + trial");
assert(cookie.includes("sid=") && !cookie.includes("g_state"), "logged in, state cookie cleared");
assert.equal(q("SELECT google_sub FROM owners WHERE email = 'new@gmail.com'").get().google_sub, "g-new");
cookie = "";
assert.equal((await googleLogin({ sub: "g-new", email: "new@gmail.com" })).headers.location, "/dashboard", "returning Google user");
cookie = "";
assert.equal((await googleLogin({ sub: "g-owner", email: "owner@cafe.in" })).headers.location, "/dashboard", "links existing email account");
assert.equal(q("SELECT COUNT(*) n FROM owners WHERE email = 'owner@cafe.in'").get().n, 1);
cookie = "";
assert.equal((await googleLogin({ sub: "g-other", email: "owner@cafe.in" })).headers.location, "/login?e=google", "email owned by another Google account");
cookie = "";
assert.equal((await googleLogin({ sub: "g-x", email: "x@gmail.com", email_verified: false })).headers.location, "/login?e=google", "unverified email rejected");
cookie = "";
assert.equal((await googleLogin({ sub: "g-y", email: "y@gmail.com", aud: "someone-else" })).headers.location, "/login?e=google", "token for another app rejected");
cookie = "";
await call("GET", "/auth/google");
assert.equal((await call("GET", "/auth/google/callback?code=abc&state=forged")).headers.location, "/login?e=google", "state must match");
cookie = "";
assert((await form("/login", { email: "new@gmail.com", password: "whatever1" })).text.includes("uses Google sign-in"), "no crash for Google-only account");
globalThis.fetch = realFetch;
cookie = fresh;

// expired plan pauses the public page
q("UPDATE owners SET paid_until = 0").run();
assert.equal((await call("GET", `/r/${outlet.slug}`)).code, 404);

console.log("ok");
