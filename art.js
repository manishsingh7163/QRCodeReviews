// Inline SVG artwork: icons, logo, illustrations. Everything is inline, so pages make no extra image requests.
const svg = (body, size) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const ICONS = {
  qr: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 14h3v3h-3zM21 14v.01M14 21h.01M17.5 21H21v-3.5"/>',
  star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/>',
  sparkle: '<path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  chart: '<path d="M3 21h18M6 17v-5M11 17V7M16 17v-8M21 17V4"/>',
  printer: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.7 7.1L4 20.5l1.4-5A8 8 0 1 1 21 12z"/>',
  store: '<path d="M4 10v10h16V10M3 10l2-6h14l2 6zM3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M10 20v-5h4v5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  scan: '<path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3M7 12h10"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  rupee: '<path d="M6 4h12M6 9h12M9 4c6.5 0 6.5 10 0 10H6l8.5 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20M6 15h4"/>',
  heart: '<path d="M12 20s-7.5-4.6-9.3-9.1C1.4 7.6 3.6 4 7 4c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.6 4.3 6.9C19.5 15.4 12 20 12 20z"/>',
};
export const icon = (name, size = 20) => svg(ICONS[name], size);

export const logo = (size = 30) => `<svg width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">
<rect width="32" height="32" rx="9" fill="#0F766E"/>
<g fill="none" stroke="#fff" stroke-width="2.2"><rect x="7" y="7" width="7" height="7" rx="1.5"/><rect x="18" y="7" width="7" height="7" rx="1.5"/><rect x="7" y="18" width="7" height="7" rx="1.5"/></g>
<path d="M21.5 17l1.4 2.9 3.1.4-2.3 2.2.6 3.1-2.8-1.5-2.8 1.5.6-3.1-2.3-2.2 3.1-.4z" fill="#F5B301"/></svg>`;

// Google's standard "G" mark, for the sign-in button.
export const googleG = `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;

// A QR stand on a shop counter with a chai cup: used for empty states.
export const counterArt = `<svg class="art" width="240" height="160" viewBox="0 0 240 160" aria-hidden="true">
<circle cx="120" cy="78" r="70" style="fill:var(--pt)"/>
<ellipse cx="120" cy="146" rx="100" ry="7" style="fill:var(--track)"/>
<rect x="22" y="124" width="196" height="16" rx="5" style="fill:var(--b2)"/>
<path d="M84 124l7-78h58l7 78z" style="fill:var(--s);stroke:var(--p)" stroke-width="3" stroke-linejoin="round"/>
<rect x="100" y="58" width="40" height="40" rx="4" style="fill:var(--s);stroke:var(--p)" stroke-width="2"/>
<g style="fill:var(--p)"><rect x="105" y="63" width="10" height="10" rx="1.5"/><rect x="125" y="63" width="10" height="10" rx="1.5"/><rect x="105" y="83" width="10" height="10" rx="1.5"/><rect x="125" y="83" width="4" height="4"/><rect x="131" y="89" width="4" height="4"/><rect x="119" y="77" width="4" height="4"/></g>
<rect x="102" y="104" width="36" height="5" rx="2.5" style="fill:var(--star)"/>
<path d="M166 98h28l-4 26h-20z" style="fill:var(--warm);stroke:var(--star)" stroke-width="3" stroke-linejoin="round"/>
<path d="M194 104h4a6 6 0 0 1 0 12h-6" fill="none" style="stroke:var(--star)" stroke-width="3"/>
<path d="M174 90c-3-4 3-6 0-10M184 90c-3-4 3-6 0-10" fill="none" style="stroke:var(--m)" stroke-width="2" stroke-linecap="round"/>
<g style="fill:var(--star)"><path d="M46 44l3 6 6.5.9-4.7 4.5 1.1 6.4L46 58.8l-5.9 3 1.1-6.4-4.7-4.5 6.5-.9z"/><path d="M190 30l2 4.2 4.6.6-3.3 3.2.8 4.5-4.1-2.2-4.1 2.2.8-4.5-3.3-3.2 4.6-.6z"/><path d="M66 90l1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.5z"/></g>
</svg>`;

// Envelope with a star: shown on the password reset screen.
export const mailArt = `<svg class="art" width="160" height="120" viewBox="0 0 160 120" aria-hidden="true">
<circle cx="80" cy="60" r="52" style="fill:var(--pt)"/>
<rect x="34" y="34" width="92" height="60" rx="8" style="fill:var(--s);stroke:var(--p)" stroke-width="3"/>
<path d="M36 38l44 32 44-32" fill="none" style="stroke:var(--p)" stroke-width="3" stroke-linejoin="round"/>
<circle cx="124" cy="34" r="14" style="fill:var(--star)"/>
<path d="M118 34l4 4 8-8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
