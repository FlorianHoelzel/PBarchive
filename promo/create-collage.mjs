import sharp from "sharp";

const width = 1920;
const height = 1080;
const ink = "#090a09";
const paper = "#f3f0e9";
const pink = "#ff9bea";

const cardWidth = 844;
const cardHeight = 474;
const cards = [
  { file: "promo/volpey-overview.png", x: 104, y: 104 },
  { file: "promo/volpey-analytics.png", x: 972, y: 104 },
  { file: "promo/volpey-progression.png", x: 104, y: 602 },
  { file: "promo/volpey-passport-spread.png", x: 972, y: 602 },
];

const background = Buffer.from(`
  <svg width="${width}" height="${height}">
    <defs>
      <pattern id="grid" width="38" height="38" patternUnits="userSpaceOnUse">
        <path d="M 38 0 L 0 0 0 38" fill="none" stroke="#fff" stroke-opacity=".035"/>
      </pattern>
      <linearGradient id="accent" x1="0" x2="1">
        <stop offset="0" stop-color="${pink}"/>
        <stop offset="1" stop-color="#98e7a7"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="${ink}"/>
    <rect width="${width}" height="${height}" fill="url(#grid)"/>
    <rect x="104" y="28" width="42" height="42" rx="5" fill="url(#accent)"/>
    <text x="114" y="57" fill="${ink}" font-family="Arial, sans-serif"
      font-size="18" font-weight="900">PB</text>
    <text x="164" y="54" fill="${paper}" font-family="Arial, sans-serif"
      font-size="27" font-weight="800" letter-spacing="2">PB ARCHIVE</text>
    <text x="1816" y="49" text-anchor="end" fill="${paper}" font-family="Arial, sans-serif"
      font-size="24" font-weight="700">Volpey’s complete speedrun history</text>
    <text x="1816" y="72" text-anchor="end" fill="${pink}" font-family="Arial, sans-serif"
      font-size="13" font-weight="700" letter-spacing="2">27 GAMES · 63 CATEGORIES · 152 PERSONAL BESTS</text>
  </svg>
`);

const composites = [{ input: background, left: 0, top: 0 }];

for (const card of cards) {
  const screenshot = await sharp(card.file)
    .resize(cardWidth, cardHeight, {
      fit: "contain",
      background: ink,
      position: "centre",
    })
    .png()
    .toBuffer();

  const border = Buffer.from(`
    <svg width="${cardWidth}" height="${cardHeight}">
      <rect x="1.5" y="1.5" width="${cardWidth - 3}" height="${cardHeight - 3}"
        rx="12" fill="none" stroke="#ffffff" stroke-opacity=".28" stroke-width="3"/>
    </svg>
  `);

  composites.push({ input: screenshot, left: card.x, top: card.y });
  composites.push({ input: border, left: card.x, top: card.y });
}

await sharp({
  create: {
    width,
    height,
    channels: 4,
    background: ink,
  },
})
  .composite(composites)
  .png()
  .toFile("promo/volpey-promo-collage.png");

console.log("Created promo/volpey-promo-collage.png");
