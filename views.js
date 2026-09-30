// Server-rendered pages. Every ${value} in html`` is HTML-escaped unless wrapped in raw().
import { icon, logo, counterArt, mailArt, googleG } from "./art.js";

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = (s) => new Raw(s);
const fmt = (v) => (v instanceof Raw ? v.s : Array.isArray(v) ? v.map(fmt).join("") : esc(v));
export const html = (strs, ...vals) => raw(strs.reduce((out, s, i) => out + s + (i < vals.length ? fmt(vals[i]) : ""), ""));
const ic = (name, size) => raw(icon(name, size));

export const BASE_PRICE = 39900; // paise, includes 1 outlet
export const EXTRA_OUTLET = 29900;
export const price = (outlets) => BASE_PRICE + EXTRA_OUTLET * (outlets - 1);
const rupees = (paise) => `₹${(paise / 100).toLocaleString("en-IN")}`;
const date = (ms) => new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const DAY = 864e5;
const initial = (name) => [...String(name).trim()][0]?.toUpperCase() || "?";

// Owners can paste their Google "Ask for reviews" link (validated https) or a Place ID.
export const googleUrl = (o) => o.place_id.startsWith("https://")
  ? o.place_id
  : `https://search.google.com/local/writereview?placeid=${encodeURIComponent(o.place_id)}`;

// Design tokens + base elements, shared with review.html (spliced in at startup).
export const BASE = `
:root{--p:#0F766E;--p2:#0B5F58;--pt:#E6F2F0;--bg:#FBF7F1;--s:#fff;--t:#2B211A;--m:#6B5D52;--b:#E6DCCF;--b2:#8C7C6C;
--ok:#15803D;--bad:#B42318;--star:#D17000;--star0:#9A8A7B;--warm:#FFF4E0;--warmb:#F0D9B0;--track:#F1EBE3;--r:14px;--tap:44px;
--shadow:0 1px 2px rgba(43,33,26,.06),0 8px 24px rgba(43,33,26,.07);color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--p2:#5EEAD4;--pt:#133A36;--bg:#171310;--s:#221D19;--t:#F3ECE4;--m:#B8A99A;--b:#3A322B;
--b2:#7A6B5D;--ok:#4ADE80;--bad:#F87171;--star:#F59E0B;--star0:#7A6B5D;--warm:#2E2518;--warmb:#5C4A2E;--track:#332B24;
--shadow:0 1px 2px rgba(0,0,0,.4),0 8px 24px rgba(0,0,0,.3)}}
*{box-sizing:border-box}
body{margin:0;font:1rem/1.55 system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans","Noto Sans Devanagari","Noto Sans Tamil",
"Noto Sans Telugu","Noto Sans Kannada","Noto Sans Malayalam","Noto Sans Bengali","Noto Sans Gurmukhi","Noto Sans Gujarati",
"Noto Sans Oriya","Nirmala UI",sans-serif;color:var(--t);background:var(--bg)}
:focus-visible{outline:3px solid var(--p);outline-offset:2px}
a{color:var(--p2)}
label{display:block;margin:1rem 0 .3rem;font-weight:600}
input,select,textarea{width:100%;min-height:var(--tap);padding:.6rem .75rem;font:inherit;color:inherit;background:var(--s);border:1px solid var(--b2);border-radius:10px}
button,.btn{display:inline-flex;align-items:center;justify-content:center;gap:.45rem;min-height:var(--tap);padding:0 1.15rem;
font:inherit;font-weight:600;color:#fff;background:var(--p);border:0;border-radius:10px;cursor:pointer;text-decoration:none}
button:hover,.btn:hover{filter:brightness(.92)}
button:disabled{opacity:.55;cursor:default}
.light{background:var(--pt);color:var(--p2)}
.danger{background:var(--s);color:var(--bad);border:1px solid var(--bad)}
.card{background:var(--s);border:1px solid var(--b);border-radius:var(--r);padding:1.25rem;margin-bottom:1rem;box-shadow:var(--shadow)}
.banner{display:flex;gap:.75rem;align-items:flex-start;background:var(--warm);border:1px solid var(--warmb);border-radius:var(--r);padding:.9rem 1rem;margin-bottom:1rem}
.banner svg{flex:none;color:var(--star);margin-top:.15rem}
.muted{color:var(--m);font-size:.9375rem} .err{color:var(--bad)} .ok{color:var(--ok)}
.ic{display:inline-grid;place-items:center;flex:none;width:40px;height:40px;border-radius:12px;background:var(--pt);color:var(--p2)}
.ic.warm{background:var(--warm);color:var(--star)}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
`;

const CSS = `
body{overflow-x:clip} /* the hero glow extends past the viewport edges */
header{position:sticky;top:0;z-index:5;background:color-mix(in srgb,var(--s) 88%,transparent);backdrop-filter:blur(8px);
border-bottom:1px solid var(--b);padding:.35rem 1rem;display:flex;flex-wrap:wrap;gap:0 1rem;align-items:center}
header a:not(.btn){display:inline-flex;align-items:center;gap:.5rem;min-height:var(--tap);color:inherit;text-decoration:none}
header .brand{font-weight:800;font-size:1.1rem;margin-right:auto;letter-spacing:-.01em} header form{margin:0}
main{max-width:1040px;margin:1.5rem auto;padding:0 1rem}
main :is(button,.btn){margin-top:1rem} :is(.row,.hero,.cta-band,.acts) :is(button,.btn){margin:0}
h1{font-size:1.7rem;line-height:1.2;margin:0 0 .5rem;letter-spacing:-.01em} h2{font-size:1.25rem;margin:0 0 .75rem}
.row{display:flex;gap:.6rem;align-items:center;flex-wrap:wrap} .row>:first-child{margin-right:auto}
.acts{display:flex;gap:.5rem;flex-wrap:wrap}
table{width:100%;border-collapse:collapse} td,th{text-align:left;padding:.6rem .4rem;border-bottom:1px solid var(--b)}
.num{text-align:right;font-variant-numeric:tabular-nums;width:1%;white-space:nowrap}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(10rem,1fr));gap:.75rem}
.stat{display:flex;flex-direction:column;gap:.15rem;border:1px solid var(--b);border-radius:var(--r);padding:1rem;color:var(--m);font-size:.875rem;background:var(--s)}
.stat .ic{margin-bottom:.5rem}
.stat b{font-size:2rem;line-height:1.1;color:var(--t);font-variant-numeric:tabular-nums}
.stat.key{background:var(--p);border-color:var(--p);color:#E6F2F0} .stat.key b{color:#fff} .stat.key .ic{background:rgba(255,255,255,.16);color:#fff}
.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(18rem,1fr));gap:1rem}
.track{background:var(--track);border-radius:6px} .bar{height:12px;border-radius:6px;background:var(--p);min-width:3px} .bar.star{background:var(--star)}
.narrow{max-width:32rem;margin-inline:auto}
details>summary{cursor:pointer;min-height:var(--tap);display:flex;align-items:center;gap:.5rem;font-weight:600;color:var(--p2)}
.empty{text-align:center;padding:2rem 1rem} .empty p{max-width:34ch;margin:.5rem auto 0}
.avatar{display:inline-grid;place-items:center;flex:none;width:48px;height:48px;border-radius:14px;font-weight:800;font-size:1.3rem;
color:#fff;background:linear-gradient(135deg,var(--p),#14B8A6)}
.outlets{display:grid;grid-template-columns:repeat(auto-fill,minmax(19rem,1fr));gap:1rem}
.outlet{display:flex;flex-direction:column;gap:1rem;margin:0}
.outlet-head{display:flex;gap:.8rem;align-items:center} .outlet-head a{font-weight:700;font-size:1.1rem;color:var(--t);text-decoration:none}
.mini{display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;text-align:center}
.mini div{background:var(--bg);border-radius:10px;padding:.5rem .25rem;font-size:.8rem;color:var(--m)}
.mini b{display:block;font-size:1.3rem;color:var(--t);font-variant-numeric:tabular-nums}
.fb{display:flex;gap:.8rem;padding:.9rem 0;border-bottom:1px solid var(--b)} .fb:last-child{border:0}
.fb .ic{width:36px;height:36px}
.stars-sm{color:var(--star);letter-spacing:.05em}
/* landing */
.hero{position:relative;display:grid;gap:2.5rem;align-items:center;padding:2.5rem 0 3rem;grid-template-columns:1fr}
@media (min-width:860px){.hero{grid-template-columns:1.1fr .9fr}}
.hero::before{content:"";position:absolute;inset:-2rem -50vw;z-index:-1;
background:radial-gradient(38rem 24rem at 80% 30%,rgba(20,184,166,.16),transparent 70%),radial-gradient(30rem 20rem at 10% 80%,rgba(245,179,1,.14),transparent 70%),
radial-gradient(circle,var(--b) 1px,transparent 1.2px) 0 0/22px 22px}
.pill{display:inline-flex;align-items:center;gap:.4rem;padding:.3rem .8rem;border-radius:999px;background:var(--s);border:1px solid var(--b);font-size:.875rem;font-weight:600;color:var(--p2)}
.hero h1{font-size:clamp(2rem,5.5vw,3.3rem);line-height:1.08;margin:1rem 0;letter-spacing:-.025em}
.hero h1 em{font-style:normal;color:var(--p);background:linear-gradient(transparent 62%,rgba(245,179,1,.35) 62%)}
.lead{font-size:1.15rem;color:var(--m);max-width:36rem}
.checks{list-style:none;padding:0;margin:1.2rem 0;display:grid;gap:.4rem}
.checks li{display:flex;gap:.5rem;align-items:center} .checks svg{color:var(--ok);flex:none}
.big{min-height:52px;padding:0 1.5rem;font-size:1.05rem}
.stage{position:relative;display:grid;place-items:center;min-height:30rem}
.phone{width:17.5rem;border-radius:2.4rem;padding:.7rem;background:#1F1A16;box-shadow:0 30px 60px -20px rgba(43,33,26,.45);transform:rotate(-3deg)}
.screen{border-radius:1.8rem;overflow:hidden;background:#FBF7F1;color:#2B211A;font-size:.8rem}
.screen .top{background:linear-gradient(135deg,#0F766E,#14B8A6);color:#fff;padding:1.4rem 1rem 1rem;display:flex;gap:.6rem;align-items:center}
.screen .top span{display:grid;place-items:center;width:2.2rem;height:2.2rem;border-radius:.7rem;background:#fff;color:#0F766E;font-weight:800}
.screen .body{padding:.8rem .9rem 1rem;display:grid;gap:.55rem}
.screen .st{color:#D17000;font-size:1.6rem;letter-spacing:.08em;line-height:1}
.screen .chips{display:flex;gap:.3rem;flex-wrap:wrap} .screen .chips i{font-style:normal;padding:.2rem .55rem;border-radius:99px;border:1px solid #8C7C6C}
.screen .chips i.on{background:#0F766E;border-color:#0F766E;color:#fff}
.screen .sg{background:#fff;border:1px solid #E6DCCF;border-radius:.7rem;padding:.55rem .65rem;line-height:1.4}
.screen .sg.on{border-color:#0F766E;box-shadow:0 0 0 1px #0F766E;background:#E6F2F0}
.screen .go{background:#0F766E;color:#fff;border-radius:.7rem;padding:.65rem;text-align:center;font-weight:700}
.float{position:absolute;display:flex;gap:.5rem;align-items:center;padding:.55rem .8rem;border-radius:14px;background:var(--s);border:1px solid var(--b);
box-shadow:var(--shadow);font-size:.875rem;font-weight:600;animation:bob 5s ease-in-out infinite}
.float .ic{width:32px;height:32px;border-radius:9px}
.f1{top:12%;left:0} .f2{top:45%;right:-.5rem;animation-delay:-1.6s} .f3{bottom:10%;left:4%;animation-delay:-3.2s}
@keyframes bob{50%{transform:translateY(-8px)}}
.langs{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;margin:1rem 0 3rem}
.langs span{padding:.45rem .9rem;border-radius:999px;background:var(--s);border:1px solid var(--b);font-size:.95rem}
.section{text-align:center;max-width:40rem;margin:3rem auto 1.5rem} .section h2{font-size:clamp(1.5rem,3.5vw,2rem);margin:.5rem 0}
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:1rem;padding:0;margin:0;list-style:none;counter-reset:s}
.steps li{position:relative;counter-increment:s;background:var(--s);border:1px solid var(--b);border-radius:var(--r);padding:1.4rem;box-shadow:var(--shadow)}
.steps li::after{content:counter(s);position:absolute;top:1rem;right:1.2rem;font-size:2.4rem;font-weight:800;color:var(--track);line-height:1}
.steps h3,.features h3{margin:.8rem 0 .3rem;font-size:1.05rem}
.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:1rem}
.features .card{margin:0}
.price-card{max-width:26rem;margin:0 auto 1rem;text-align:center;border:2px solid var(--p)}
.price{font-size:2.6rem;font-weight:800;color:var(--t);letter-spacing:-.02em}
.price-card .checks{text-align:left;width:fit-content;margin-inline:auto}
.cta-band{margin:3rem 0 1rem;padding:2.5rem 1.5rem;border-radius:22px;text-align:center;color:#fff;
background:radial-gradient(30rem 14rem at 85% 0%,rgba(245,179,1,.35),transparent 70%),linear-gradient(135deg,#0B5F58,#0F766E 55%,#14B8A6)}
.cta-band h2{font-size:clamp(1.4rem,3.5vw,2rem);margin:0 0 .5rem} .cta-band p{color:#E6F2F0;margin:0 0 1.2rem}
.cta-band .btn{background:#fff;color:#0B5F58}
footer{max-width:1040px;margin:0 auto;padding:1.5rem 1rem 2.5rem;display:flex;gap:.5rem;align-items:center;color:var(--m);font-size:.875rem}
/* auth */
.auth{display:grid;max-width:56rem;margin:1rem auto;border-radius:22px;overflow:hidden;background:var(--s);border:1px solid var(--b);box-shadow:var(--shadow)}
@media (min-width:800px){.auth{grid-template-columns:1fr 1fr}}
.auth-side{display:none;padding:2.5rem;color:#fff;background:radial-gradient(22rem 14rem at 100% 100%,rgba(245,179,1,.35),transparent 70%),linear-gradient(160deg,#0B5F58,#0F766E 60%,#14B8A6)}
@media (min-width:800px){.auth-side{display:flex;flex-direction:column;gap:1rem}}
.auth-side h2{font-size:1.6rem;line-height:1.2;margin:1rem 0 0} .auth-side .checks svg{color:#FCD34D}
.auth-side .quote{margin-top:auto;padding:1rem;border-radius:14px;background:rgba(255,255,255,.12);font-size:.95rem}
.auth-form{padding:2rem 1.5rem} @media (min-width:800px){.auth-form{padding:2.5rem}}
.art{display:block;max-width:100%;height:auto;margin:0 auto}
/* Google sign-in button, per Google's branding guidelines */
.gbtn{width:100%;margin-top:1rem;gap:.75rem;background:#fff;color:#1F1F1F;border:1px solid #747775;font-family:Roboto,system-ui,sans-serif;font-weight:500}
@media (prefers-color-scheme:dark){.gbtn{background:#131314;color:#E3E3E3;border-color:#8E918F}}
.or{display:flex;align-items:center;gap:.75rem;margin:1.2rem 0 .2rem;color:var(--m);font-size:.875rem}
.or::before,.or::after{content:"";flex:1;border-top:1px solid var(--b)}
`;

export function layout(title, body, owner) {
  return html`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · DukanReviews</title>
<style>${raw(BASE + CSS)}</style></head><body>
<header><a class="brand" href="${owner ? "/dashboard" : "/"}">${raw(logo(30))} <span>Dukan<span style="color:var(--p)">Reviews</span></span></a>
${owner
    ? html`<a href="/dashboard">Outlets</a><a href="/billing">Billing</a><form method="post" action="/logout"><button class="light">Log out</button></form>`
    : html`<a href="/login">Log in</a><a class="btn" href="/signup">Start free trial</a>`}
</header><main>${body}</main>
${owner ? "" : html`<footer>${raw(logo(22))} dukanreviews.com · Made for India's local businesses</footer>`}
</body></html>`;
}

// ---------- landing ----------
const phoneMock = html`<div class="stage" aria-hidden="true">
<div class="phone"><div class="screen">
<div class="top"><span>S</span><div><b>Saravana Tiffin</b><br><small>Share your experience</small></div></div>
<div class="body"><div>How was your visit?</div><div class="st">★★★★★</div>
<div class="chips"><i class="on">✓ Filter coffee</i><i class="on">✓ Crispy dosa</i><i>Quick service</i></div>
<div class="sg on">Best filter coffee in the area, and the dosa was perfectly crispy. Will definitely come back!</div>
<div class="sg">Loved the quick service and friendly staff. A must-try breakfast spot.</div>
<div class="go">Copy &amp; open Google</div></div></div></div>
<div class="float f1"><span class="ic">${ic("sparkle", 18)}</span>3 drafts, instantly</div>
<div class="float f2"><span class="ic warm">${ic("globe", 18)}</span>தமிழ் · हिन्दी · বাংলা</div>
<div class="float f3"><span class="ic">${ic("lock", 18)}</span>Private feedback</div></div>`;

const FEATURES = [
  ["sparkle", "AI-written drafts", "3 natural review options based on the stars and what the customer liked."],
  ["globe", "11 Indian languages", "Hindi, Tamil, Telugu, Bengali, Marathi and more, in natural everyday wording."],
  ["lock", "Private messages", "Any customer can message you privately, so you can fix issues fast."],
  ["chart", "Simple analytics", "Scans, reviews, star ratings and languages, per outlet."],
  ["printer", "Print-ready flyer", "A counter flyer with your QR code, ready in one click."],
  ["rupee", "Fair INR pricing", "One fixed monthly price. No per-review charges, cancel anytime."],
];
const GREETINGS = ["आपका अनुभव कैसा रहा?", "உங்கள் அனுபவம் எப்படி இருந்தது?", "మీ అనుభవం ఎలా ఉంది?", "আপনার অভিজ্ঞতা কেমন ছিল?",
  "तुमचा अनुभव कसा होता?", "તમારો અનુભવ કેવો રહ્યો?", "ನಿಮ್ಮ ಅನುಭವ ಹೇಗಿತ್ತು?", "How was your visit?"];

export const landing = () => html`
<section class="hero"><div>
<span class="pill">${ic("star", 16)} For cafés, food carts, salons &amp; clinics</span>
<h1>Turn happy customers into <em>Google reviews</em></h1>
<p class="lead">Customers happily give stars but skip writing. One QR code on your counter, and DukanReviews helps them write a review in their own language in under a minute.</p>
<ul class="checks"><li>${ic("check")} No app for customers to install</li><li>${ic("check")} Customers pick or edit their own words</li><li>${ic("check")} Set up in 2 minutes</li></ul>
<div class="acts"><a class="btn big" href="/signup">Start 14-day free trial ${ic("arrow", 18)}</a><a class="btn big light" href="#how">See how it works</a></div>
<p class="muted">No card needed · ${rupees(BASE_PRICE)}/month after the trial</p></div>
${phoneMock}</section>
<div class="langs">${GREETINGS.map((g) => html`<span>${g}</span>`)}</div>

<div class="section" id="how"><span class="pill">${ic("scan", 16)} How it works</span><h2>From scan to review in 3 taps</h2></div>
<ol class="steps">
<li><span class="ic">${ic("qr")}</span><h3>Customer scans</h3><p class="muted">Your QR on the counter, menu or bill opens a fast mobile page.</p></li>
<li><span class="ic warm">${ic("star")}</span><h3>Taps stars &amp; what they liked</h3><p class="muted">AI suggests 3 short reviews in their language.</p></li>
<li><span class="ic">${ic("copy")}</span><h3>Posts on Google</h3><p class="muted">One tap copies the review and opens your Google page to paste.</p></li></ol>

<div class="section"><span class="pill">${ic("heart", 16)} Everything included</span><h2>Built for busy shop owners</h2></div>
<div class="features">${FEATURES.map(([i, title, text]) => html`<div class="card"><span class="ic">${ic(i)}</span><h3>${title}</h3><p class="muted">${text}</p></div>`)}</div>

<div class="section"><span class="pill">${ic("rupee", 16)} Pricing</span><h2>One simple plan</h2></div>
<div class="card price-card"><div class="price">${rupees(BASE_PRICE)}<span class="muted" style="font-size:1rem;font-weight:400">/month</span></div>
<p class="muted">for 1 outlet · ${rupees(EXTRA_OUTLET)}/month per extra outlet</p>
<ul class="checks">${["AI drafts in 11 languages", "QR code + print flyer", "Private message inbox", "Analytics dashboard", "14 days free"].map((f) => html`<li>${ic("check")} ${f}</li>`)}</ul>
<a class="btn big" href="/signup">Start free trial</a></div>

<div class="cta-band"><h2>Your next reviews are waiting at your counter</h2>
<p>Print your QR code today. It takes 2 minutes.</p><a class="btn big" href="/signup">Get started free ${ic("arrow", 18)}</a></div>`;

// ---------- auth ----------
const authSide = html`<aside class="auth-side">${raw(logo(44))}
<h2>More Google reviews, less asking</h2>
<ul class="checks"><li>${ic("check")} AI drafts in 11 Indian languages</li><li>${ic("check")} Private messages from customers</li><li>${ic("check")} Print-ready QR flyer</li></ul>
<div class="quote">Customers give stars but rarely write. With DukanReviews they pick a draft, tweak it and post before they leave.</div></aside>`;
const authShell = (body) => html`<div class="auth">${authSide}<div class="auth-form">${body}</div></div>`;

export const authForm = (mode, error = "", email = "") => authShell(html`
<h1>${mode === "signup" ? "Start your free trial" : "Welcome back"}</h1>
<p class="muted">${mode === "signup" ? "14 days free, no card needed." : "Log in to see your reviews and messages."}</p>
${error ? html`<p class="err" role="alert">${error}</p>` : ""}
${process.env.GOOGLE_CLIENT_ID ? html`<a class="btn gbtn" href="/auth/google">${raw(googleG)} Continue with Google</a>
<div class="or">or use email</div>` : ""}
<form method="post">
<label for="email">Email</label><input id="email" name="email" type="email" required value="${email}" autocomplete="email">
<label for="password">Password ${mode === "signup" ? html`<span class="muted">(min 8 characters)</span>` : ""}</label>
<input id="password" name="password" type="password" required minlength="8"
  autocomplete="${mode === "signup" ? "new-password" : "current-password"}">
<button style="width:100%">${mode === "signup" ? "Create account" : "Log in"}</button></form>
<p class="muted">${mode === "signup" ? html`Have an account? <a href="/login">Log in</a>`
  : html`<a href="/forgot">Forgot password?</a> · New here? <a href="/signup">Start a free trial</a>`}</p>`);

export const forgotForm = (sent = false, error = "") => html`
<div class="card narrow" style="text-align:center">${raw(mailArt)}<h1>Reset your password</h1>
${sent
    ? html`<p class="ok" role="status">If that email has an account, we've sent a reset link. It works for 1 hour.</p>
      <p class="muted">Didn't get it? Check spam, or <a href="/forgot">try again</a>.</p>`
    : html`${error ? html`<p class="err" role="alert">${error}</p>` : ""}
      <p class="muted">Enter your account email and we'll send you a link to set a new password.</p>
      <form method="post" style="text-align:left"><label for="email">Email</label><input id="email" name="email" type="email" required autocomplete="email">
      <button style="width:100%">Send reset link</button></form>`}
<p class="muted"><a href="/login">Back to log in</a></p></div>`;

export const resetForm = (token, error = "") => html`
<div class="card narrow"><h1>Set a new password</h1>
${error ? html`<p class="err" role="alert">${error}</p>` : ""}
${token
    ? html`<form method="post" action="/reset"><input type="hidden" name="token" value="${token}">
      <label for="password">New password <span class="muted">(min 8 characters)</span></label>
      <input id="password" name="password" type="password" required minlength="8" autocomplete="new-password">
      <button style="width:100%">Save password</button></form>`
    : html`<p><a href="/forgot">Request a new link</a></p>`}</div>`;

export const resetEmail = (link) => html`<p>Someone asked to reset your DukanReviews password.</p>
<p><a href="${link}">Set a new password</a> (this link works for 1 hour).</p>
<p>If this wasn't you, ignore this email and your password stays the same.</p>`;

// ---------- dashboard ----------
const daysLeft = (owner, now) => Math.ceil((owner.paid_until - now) / DAY);
const planLine = (owner, now) => owner.paid_until > now
  ? html`<span class="ok">${owner.trial ? "Free trial" : "Active"}</span> · ${daysLeft(owner, now)} day(s) left (until ${date(owner.paid_until)}) · ${owner.outlet_limit} outlet(s)`
  : html`<span class="err">Expired</span> on ${date(owner.paid_until)}. Your QR codes are paused. <a href="/billing">Renew</a>`;

export const renewBanner = (owner, now) => owner.paid_until > now && daysLeft(owner, now) <= 5
  ? html`<div class="banner" role="status">${ic("star")}<div>Your ${owner.trial ? "free trial" : "plan"} ends in ${daysLeft(owner, now)} day(s).
    When it ends, your printed QR codes stop working. <a href="/billing">Renew now</a></div></div>`
  : "";

const statCard = (i, label, n, cls = "") => html`<div class="stat ${cls}"><span class="ic">${ic(i)}</span>${label}<b>${n}</b></div>`;
const pct = (a, b) => `${b ? Math.round((100 * a) / b) : 0}%`;

export const dashboard = (owner, outlets, now) => {
  const sum = (k) => outlets.reduce((a, o) => a + o[k], 0);
  return html`
${renewBanner(owner, now)}
<div class="row" style="margin-bottom:1rem"><div><h1>Your outlets</h1><span class="muted">${planLine(owner, now)}</span></div>
${outlets.length < owner.outlet_limit
    ? html`<a class="btn" href="/outlets/new">${ic("plus", 18)} Add outlet</a>`
    : html`<a class="btn light" href="/billing">${ic("plus", 18)} Add more outlets</a>`}</div>
${outlets.length
    ? html`<div class="stats" style="margin-bottom:1rem">
      ${statCard("scan", "QR scans", sum("scans"))}${statCard("copy", "Reviews started", sum("copies"))}
      ${statCard("chart", "Scan → review", pct(sum("copies"), sum("scans")), "key")}${statCard("chat", "Private messages", sum("feedback"))}</div>
      <div class="outlets">${outlets.map((o) => html`<div class="card outlet">
        <div class="outlet-head"><span class="avatar">${initial(o.name)}</span><div><a href="/outlets/${o.id}">${o.name}</a><br><span class="muted">${o.category}</span></div></div>
        <div class="mini"><div><b>${o.scans}</b>Scans</div><div><b>${o.copies}</b>Reviews</div>
        <div>${o.feedback ? html`<a href="/outlets/${o.id}#feedback"><b>${o.feedback}</b></a>` : html`<b>0</b>`}Messages</div></div>
        <div class="acts"><a class="btn" href="/outlets/${o.id}">${ic("eye", 18)} Open</a><a class="btn light" href="/outlets/${o.id}/flyer">${ic("printer", 18)} Flyer</a></div></div>`)}</div>
      <p class="muted">All numbers are for the last 30 days.</p>`
    : html`<div class="card empty">${raw(counterArt)}<h2>Put your first QR code on the counter</h2>
      <p class="muted">Add your business and we'll make a QR code and a printable flyer for it. Takes about a minute.</p>
      <a class="btn big" href="/outlets/new">${ic("plus", 18)} Add your business</a></div>`}`;
};

export const outletForm = (o = {}, error = "") => html`
<form method="post" action="${o.id ? `/outlets/${o.id}` : "/outlets/new"}" class="card narrow">
${o.id ? "" : raw(counterArt)}
<h2>${o.id ? "Edit outlet" : "Add your business"}</h2>
${o.id ? "" : html`<p class="muted">Three steps: add your business → print the QR flyer → put it on your counter.</p>`}
${error ? html`<p class="err" role="alert">${error}</p>` : ""}
<label for="name">Business name</label><input id="name" name="name" required maxlength="100" value="${o.name}">
<label for="category">Type of business</label><input id="category" name="category" required maxlength="60" placeholder="Café, salon, clinic…" value="${o.category}">
<label for="keywords">Things customers can tap as "liked" <span class="muted">(comma separated, up to 12, any language)</span></label>
<input id="keywords" name="keywords" maxlength="400" placeholder="Filter coffee, Quick service, Friendly staff" value="${o.keywords}">
<label for="place_id">Your Google review link</label>
<input id="place_id" name="place_id" required maxlength="300" placeholder="https://g.page/r/…/review" value="${o.place_id}">
<p class="muted">Search your business on Google (or open the Google Business Profile app), tap <b>Ask for reviews</b>,
copy the link and paste it here. A Google <a target="_blank" rel="noopener" href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder">Place ID</a> works too.</p>
<button style="width:100%">${o.id ? "Save changes" : html`${ic("qr", 18)} Create my QR code`}</button></form>`;

// Phone numbers get call + WhatsApp links, emails a mailto link.
const contactLink = (c) => {
  if (/^\S+@\S+\.\S+$/.test(c)) return html`<a href="mailto:${c}">${c}</a>`;
  const d = c.replace(/\D/g, "");
  if (/^\+?[\d\s-]{8,}$/.test(c)) return html`<a href="tel:+${d.length === 10 ? `91${d}` : d}">${c}</a> · <a target="_blank" rel="noopener" href="https://wa.me/${d.length === 10 ? `91${d}` : d}">WhatsApp</a>`;
  return c;
};

const bars = (rows, cls = "") => {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return html`<table>${rows.map((r) => html`<tr><td class="num">${r.label}</td>
    <td><div class="track"><div class="bar ${cls}" style="width:${(100 * r.n) / max}%"></div></div></td><td class="num">${r.n}</td></tr>`)}</table>`;
};

export function outletPage(o, s, feedback, reviewUrl, isNew) {
  const stars = [5, 4, 3, 2, 1].map((r) => ({ label: `${r}★`, n: s.stars.find((x) => x.rating === r)?.n ?? 0 }));
  return html`
${isNew ? html`<div class="banner" role="status">${ic("check")}<div><b>Your QR code is ready!</b> Print the flyer and put it where customers pay.
  Then <a target="_blank" rel="noopener" href="${googleUrl(o)}">check your Google link</a> opens the right business.</div></div>` : ""}
<div class="card row"><div class="outlet-head"><span class="avatar">${initial(o.name)}</span><div><h1 style="margin:0">${o.name}</h1>
<span class="muted">Customer page: <a href="${reviewUrl}" target="_blank" rel="noopener">${reviewUrl}</a></span></div></div>
<div class="acts"><a class="btn light" href="/outlets/${o.id}/qr.png" download="qr-${o.slug}.png">${ic("download", 18)} QR image</a>
<a class="btn" href="/outlets/${o.id}/flyer">${ic("printer", 18)} Print flyer</a></div></div>
<div class="stats" style="margin-bottom:.5rem">
${statCard("scan", "QR scans", s.scans)}${statCard("copy", "Drafts copied to Google", s.copies)}
${statCard("chart", "Scan → review", pct(s.copies, s.scans), "key")}${statCard("chat", "Private messages", s.feedback)}</div>
<p class="muted" style="margin:0 0 1rem">Last 30 days. "Copied" means the customer took a draft to Google (Google doesn't tell us if they posted it).
Your own visits while logged in aren't counted.</p>
<div class="card" id="feedback"><h2>Private messages</h2>${feedback.length
    ? feedback.map((f) => html`<div class="fb"><span class="ic warm">${ic("chat", 18)}</span><div>
      <div class="muted">${date(f.ts)}${f.rating ? html` · <span class="stars-sm">${"★".repeat(f.rating)}</span>` : ""}</div>
      <div>${f.message}</div>${f.contact ? html`<div class="muted">Reply: ${contactLink(f.contact)}</div>` : ""}</div></div>`)
    : html`<p class="muted">No messages yet. Customers can message you privately from the review page.</p>`}</div>
<div class="cols">
<div class="card"><h2>Star ratings</h2>${bars(stars, "star")}</div>
<div class="card"><h2>Languages</h2>${s.langs.length ? bars(s.langs.map((l) => ({ label: l.lang, n: l.n }))) : html`<p class="muted">No data yet.</p>`}</div></div>
<details class="card"><summary>Edit or delete outlet</summary>
${outletForm(o)}
<form method="post" action="/outlets/${o.id}/delete" onsubmit="return confirm('Delete this outlet and all its data?')">
<p class="muted">Deleting stops the printed QR code from working.</p><button class="danger">Delete outlet</button></form></details>`;
}

export const flyer = (o, reviewUrl) => html`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>QR flyer · ${o.name}</title>
<style>
@page{size:A5;margin:10mm}
body{font-family:system-ui,"Noto Sans","Noto Sans Devanagari",sans-serif;color:#2B211A;text-align:center;margin:1rem;background:#fff;
-webkit-print-color-adjust:exact;print-color-adjust:exact}
.frame{max-width:130mm;margin:auto;border-radius:18px;overflow:hidden;border:2px solid #0F766E}
.band{padding:7mm 6mm 14mm;color:#fff;background:radial-gradient(60mm 30mm at 90% 0%,rgba(245,179,1,.45),transparent 70%),linear-gradient(135deg,#0B5F58,#0F766E 60%,#14B8A6)}
.band .st{color:#FCD34D;font-size:1.6rem;letter-spacing:.2em}
h1{font-size:2.3rem;line-height:1.1;margin:.2rem 0}
.ask{font-size:1.3rem;font-weight:700;margin:.3rem 0 0} .ask2{margin:.1rem 0 0;opacity:.92}
.qr{position:relative;display:inline-block;margin-top:-9mm;padding:5mm;background:#fff;border-radius:16px;box-shadow:0 4px 16px rgba(0,0,0,.12)}
.qr img{display:block;width:62mm;height:62mm}
.qr::before,.qr::after{content:"";position:absolute;width:12mm;height:12mm;border:4px solid #D17000}
.qr::before{top:-2px;left:-2px;border-right:0;border-bottom:0;border-radius:14px 0 0 0}
.qr::after{bottom:-2px;right:-2px;border-left:0;border-top:0;border-radius:0 0 14px 0}
.scan{display:inline-flex;gap:.5rem;align-items:center;margin:4mm 0 1mm;padding:.35rem 1rem;border-radius:99px;background:#FFF4E0;color:#8A4B00;font-weight:700}
.foot{padding:1mm 6mm 6mm} .url{font-size:.85rem;color:#6B5D52;word-break:break-all;margin:.3rem 0}
.by{display:inline-flex;gap:.4rem;align-items:center;font-size:.8rem;color:#6B5D52}
button{margin-top:1rem;min-height:44px;padding:0 1.2rem;font:inherit;font-weight:600;color:#fff;background:#0F766E;border:0;border-radius:10px;cursor:pointer}
@media print{button{display:none}body{margin:0}}
</style></head><body><div class="frame">
<div class="band"><div class="st" aria-hidden="true">★★★★★</div><h1>${o.name}</h1>
<p class="ask">Enjoyed your visit? Leave us a review</p><p class="ask2" lang="hi">रिव्यू देने के लिए स्कैन करें</p></div>
<div class="qr"><img src="/outlets/${o.id}/qr.png" alt="QR code for reviewing ${o.name}"></div>
<div class="foot"><div class="scan">${ic("scan", 18)} Scan with your phone camera</div>
<p>Takes under a minute. We read every one.</p>
<p class="url">${reviewUrl}</p><div class="by">${raw(logo(18))} dukanreviews.com</div></div></div>
<button onclick="print()">Print</button></body></html>`;

export const billing = (owner, outletCount, now, upiId, msg = "") => html`
${renewBanner(owner, now)}
<div class="card row"><div class="outlet-head"><span class="ic">${ic("card")}</span><div><h1 style="margin:0">Billing</h1><span class="muted">${planLine(owner, now)}</span></div></div></div>
${msg ? html`<div class="banner" role="status">${ic("check")}<div>${msg}</div></div>` : ""}
<div class="card price-card"><h2>Pay for 1 month via UPI</h2>
<p class="muted">${rupees(BASE_PRICE)}/month includes 1 outlet. Each extra outlet is ${rupees(EXTRA_OUTLET)}/month. Paying adds 30 days.</p>
<label for="outlets" style="text-align:left">Number of outlets</label>
<input id="outlets" type="number" inputmode="numeric" min="${Math.max(1, outletCount)}" max="50" value="${Math.max(owner.outlet_limit, outletCount, 1)}">
<p><span class="price" id="total"></span><span class="muted">/month</span></p>
<div id="qrContainer" style="display:none;text-align:center;margin:1.5rem 0">
  <p class="muted">Scan with any UPI app</p>
  <img id="qrCode" src="" alt="UPI QR Code" style="max-width:280px;border-radius:12px;border:2px solid var(--b);margin:.8rem 0">
  <p class="muted" id="upiId" style="word-break:break-all"></p>
  <p class="muted" style="font-size:.95rem">Enter your UPI payment reference below after paying</p>
  <input id="receiptId" type="text" placeholder="Transaction/Receipt ID from your UPI app" style="width:100%;margin:.8rem 0" />
  <button id="confirmPay" class="big" style="width:100%">${ic("check", 18)} Confirm Payment</button>
</div>
<button id="pay" class="big" style="width:100%">${ic("qr", 18)} Show UPI QR Code</button>
<p id="payerr" class="err" role="alert"></p>
<p class="muted">${ic("lock", 14)} Secure payment via UPI · Instant & safe</p></div>
<script>
const BASE = ${BASE_PRICE}, EXTRA = ${EXTRA_OUTLET}, n = document.getElementById("outlets"), pay = document.getElementById("pay");
const qrContainer = document.getElementById("qrContainer"), qrCode = document.getElementById("qrCode");
const confirmPay = document.getElementById("confirmPay"), receiptId = document.getElementById("receiptId");
const show = () => document.getElementById("total").textContent = "₹" + ((BASE + EXTRA * (Math.max(1, n.value) - 1)) / 100).toLocaleString("en-IN");
n.oninput = show; show();
const post = (url, body) => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json());
const busy = (on) => { pay.disabled = on; confirmPay.disabled = on; };
const done = (r) => {
  if (r.ok) return location.href = "/billing?paid=1";
  busy(false);
  document.getElementById("payerr").textContent = r.error || "Payment failed";
};
let currentOrderId = null;
pay.onclick = async () => {
  busy(true);
  document.getElementById("payerr").textContent = "";
  const order = await post("/billing/order", { outlets: Number(n.value) }).catch(() => ({ error: "Network error, please try again." }));
  if (order.error) {
    busy(false);
    document.getElementById("payerr").textContent = order.error;
    return;
  }
  currentOrderId = order.orderId;
  qrCode.src = order.qrCode;
  document.getElementById("upiId").textContent = "UPI: " + "${upiId}";
  qrContainer.style.display = "block";
  pay.style.display = "none";
  receiptId.focus();
  busy(false);
};
confirmPay.onclick = async () => {
  if (!receiptId.value.trim()) {
    document.getElementById("payerr").textContent = "Please enter your transaction ID";
    return;
  }
  busy(true);
  document.getElementById("payerr").textContent = "";
  const result = await post("/billing/verify", { orderId: currentOrderId, receiptId: receiptId.value }).catch(() => ({ error: "Network error, please try again." }));
  done(result);
};
</script>`;

export const message = (title, text) => html`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${raw(BASE)}</style></head>
<body style="text-align:center;padding:3rem 1rem">${raw(logo(48))}<h1>${title}</h1><p class="muted">${text}</p></body></html>`;
