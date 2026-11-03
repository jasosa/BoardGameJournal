// Generated stand-in box art for the concepts: a palette plus a simple motif, as an SVG data
// URI. Not real covers. `ratio` is width / height.
window.coverArt = function coverArt(game, size) {
  const ratio = size && size.ratio ? size.ratio : game.ratio;
  const h = 600;
  const w = Math.round(h * ratio);
  const [a, b, c] = game.palette;
  const m = {
    sun: `<circle cx="${w * 0.5}" cy="${h * 0.42}" r="${h * 0.22}" fill="${c}" opacity=".92"/><circle cx="${w * 0.5}" cy="${h * 0.42}" r="${h * 0.32}" fill="none" stroke="${c}" stroke-width="3" opacity=".6"/>`,
    stripes: Array.from({ length: 9 }, (_, i) => `<rect x="${-w * 0.2 + i * w * 0.16}" y="0" width="${w * 0.07}" height="${h * 1.3}" fill="${c}" opacity="${0.35 + (i % 3) * 0.2}" transform="rotate(18 ${w / 2} ${h / 2})"/>`).join(""),
    mountains: `<polygon points="0,${h} ${w * 0.3},${h * 0.45} ${w * 0.55},${h} " fill="${b}" opacity=".85"/><polygon points="${w * 0.35},${h} ${w * 0.68},${h * 0.32} ${w},${h}" fill="${c}" opacity=".9"/>`,
    waves: Array.from({ length: 5 }, (_, i) => `<path d="M0 ${h * (0.45 + i * 0.1)} Q ${w * 0.25} ${h * (0.35 + i * 0.1)} ${w * 0.5} ${h * (0.45 + i * 0.1)} T ${w} ${h * (0.45 + i * 0.1)}" fill="none" stroke="${c}" stroke-width="${6 - i}" opacity="${0.9 - i * 0.15}"/>`).join(""),
    circles: `<circle cx="${w * 0.32}" cy="${h * 0.5}" r="${h * 0.2}" fill="${c}" opacity=".9"/><circle cx="${w * 0.66}" cy="${h * 0.5}" r="${h * 0.2}" fill="none" stroke="${c}" stroke-width="10"/><circle cx="${w * 0.5}" cy="${h * 0.5}" r="${h * 0.34}" fill="none" stroke="${b}" stroke-width="3" opacity=".7"/>`,
    grid: Array.from({ length: 4 }, (_, r) => Array.from({ length: 3 }, (_, k) => `<rect x="${w * (0.14 + k * 0.28)}" y="${h * (0.16 + r * 0.19)}" width="${w * 0.24}" height="${h * 0.15}" fill="${(r + k) % 2 ? c : b}" opacity=".9"/>`).join("")).join(""),
  }[game.motif];
  const label = game.title.length > 26 ? game.title.split(":")[0] : game.title;
  const fs = Math.max(30, Math.min(54, Math.round((w * 0.86) / Math.max(8, label.length) * 1.7)));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>${m}<text x="${w / 2}" y="${h * 0.9}" font-family="Georgia, serif" font-size="${fs}" fill="${c}" text-anchor="middle" font-weight="700">${label.replace(/&/g, "&amp;")}</text></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
};
