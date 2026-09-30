export const SITE_NAME = "DukanReviews";
export const SITE_URL = "https://dukanreviews.com";

export const LANGS = ["English", "Hindi", "Marathi", "Gujarati", "Tamil", "Telugu", "Kannada", "Malayalam", "Bengali", "Punjabi", "Odia"];

const TONE = {
  1: "very disappointed, but calm and specific, not abusive",
  2: "disappointed, mentions what went wrong and what could improve",
  3: "mixed: some good, some not so good",
  4: "happy, with one small nitpick at most",
  5: "delighted and enthusiastic",
};

// `liked` = highlights the customer tapped themselves, so the review reflects their visit.
export function buildPrompt(outlet, rating, lang, liked) {
  return `Write 3 different short Google reviews (1-3 sentences each) a real customer might post.
Business: ${outlet.name} (${outlet.category})
${liked.length ? `The customer said they liked: ${liked.join(", ")}.` : "The customer didn't pick any highlights."}
Star rating: ${rating}/5 — tone: ${TONE[rating]}.
Language: ${lang}${lang === "English" ? "" : " (natural everyday script and phrasing, not a stiff translation)"}.
First person, casual, varied openings, no hashtags or emojis, no made-up specifics like staff names or prices.
Reply with JSON only, in this shape: {"reviews": ["...", "...", "..."]}`;
}

// Canned reviews used when no OPENROUTER_API_KEY is set (demo mode, English only).
const SAMPLES = {
  1: ["Really disappointing visit to {name}. The wait was long and the order came out wrong.",
      "Not what I expected from {name}. Service felt rushed and nobody checked on us.",
      "Sadly wouldn't come back. The {category} basics just weren't there this time."],
  2: ["{name} has potential, but this visit fell short. Slow service and so-so quality.",
      "A couple of good things, but overall below average for a {category}. Hope they improve.",
      "Staff were polite, but the experience at {name} didn't live up to the price."],
  3: ["Decent {category}. Some things were great, others just okay.",
      "An average visit to {name}. Nothing wrong, nothing that stood out either.",
      "Good enough for a quick stop. Would maybe try {name} again on a less busy day."],
  4: ["Really enjoyed {name}! Great quality, just a slightly long wait.",
      "Solid {category} with friendly staff. I'll be back.",
      "Good experience overall at {name}. Fair prices and nice atmosphere."],
  5: ["Absolutely loved {name}! Everything was spot on and the staff were lovely.",
      "Best {category} around, hands down. Can't wait to come back!",
      "Fantastic experience at {name}. Highly recommend to anyone nearby."],
};

export function sampleReviews(outlet, rating) {
  return SAMPLES[rating].map((t) => t.replaceAll("{name}", outlet.name).replaceAll("{category}", outlet.category.toLowerCase()));
}

const SCHEMA = {
  type: "object",
  properties: { reviews: { type: "array", items: { type: "string" } } },
  required: ["reviews"],
  additionalProperties: false,
};

// OpenRouter speaks the OpenAI chat-completions format, so a plain fetch is all we need.
export async function suggest(outlet, rating, lang, liked) {
  if (!process.env.OPENROUTER_API_KEY) return sampleReviews(outlet, rating);
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(20_000),
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": SITE_URL, // optional: credits the app in OpenRouter's rankings
      "X-OpenRouter-Title": SITE_NAME,
    },
    body: JSON.stringify({
      model: process.env.MODEL || "~openai/gpt-sol-latest",
      messages: [{ role: "user", content: buildPrompt(outlet, rating, lang, liked) }],
      response_format: { type: "json_schema", json_schema: { name: "reviews", strict: true, schema: SCHEMA } },
    }),
  });
  if (!r.ok) throw new Error(`OpenRouter ${r.status}: ${await r.text()}`);
  const text = (await r.json()).choices?.[0]?.message?.content || "";
  // Models that ignore response_format sometimes wrap the JSON in prose or code fences.
  const reviews = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || "{}").reviews;
  return Array.isArray(reviews) ? reviews.filter((x) => typeof x === "string" && x.trim()).slice(0, 5) : [];
}
