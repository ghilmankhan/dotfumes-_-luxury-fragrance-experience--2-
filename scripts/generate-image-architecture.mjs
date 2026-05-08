import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const publicDir = path.join(root, "public", "images");

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

const writeSvg = async (targetPath, markup) => {
  await fs.writeFile(targetPath, markup.trimStart(), "utf8");
};

const renderSvgToPng = async (svgPath, pngPath, size) => {
  const outputDir = path.dirname(pngPath);
  await execFileAsync("/usr/bin/qlmanage", ["-t", "-s", String(size), "-o", outputDir, svgPath]);
  const generated = path.join(outputDir, `${path.basename(svgPath)}.png`);
  await fs.rename(generated, pngPath);
};

const convertToWebp = async (pngPath, webpPath) => {
  await sharp(pngPath).webp({ quality: 92, alphaQuality: 100 }).toFile(webpPath);
};

const heroBackground = ({ palette, glow, accent, textureOpacity = 0.2, title }) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1600" height="1100" viewBox="0 0 1600 1100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="80" y1="80" x2="1520" y2="1040" gradientUnits="userSpaceOnUse">
      <stop stop-color="${palette[0]}"/>
      <stop offset="0.45" stop-color="${palette[1]}"/>
      <stop offset="1" stop-color="${palette[2]}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1110 320) rotate(136.26) scale(520 400)">
      <stop stop-color="${glow}" stop-opacity="0.85"/>
      <stop offset="1" stop-color="${glow}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="mist" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(500 720) rotate(25) scale(780 380)">
      <stop stop-color="#FFFFFF" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <filter id="blur-xl" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="36"/>
    </filter>
  </defs>
  <rect width="1600" height="1100" fill="url(#bg)"/>
  <ellipse cx="1100" cy="320" rx="520" ry="400" fill="url(#glow)"/>
  <ellipse cx="500" cy="720" rx="780" ry="380" fill="url(#mist)"/>
  <g opacity="${textureOpacity}" filter="url(#blur-xl)">
    <path d="M-160 892C182 705 420 686 735 772C1028 851 1344 720 1776 417V1210H-160V892Z" fill="${accent}"/>
    <path d="M1512 140C1247 315 1037 385 812 360C587 335 368 225 118 145" stroke="#FFFFFF" stroke-opacity="0.16" stroke-width="18" stroke-linecap="round"/>
    <path d="M162 318C370 432 557 453 767 396C1019 327 1197 344 1507 531" stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="12" stroke-linecap="round"/>
  </g>
  <text x="110" y="986" fill="#FFFFFF" fill-opacity="0.08" font-size="96" font-style="italic" font-family="Georgia, 'Times New Roman', serif" letter-spacing="12">${title}</text>
</svg>
`;

const bottleRender = ({ liquid, glass, label, cap, name, subtitle }) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="900" height="1400" viewBox="0 0 900 1400" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="glass" x1="185" y1="110" x2="725" y2="1220" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFFFFF" stop-opacity="0.92"/>
      <stop offset="0.3" stop-color="${glass}" stop-opacity="0.72"/>
      <stop offset="0.7" stop-color="#DAE4EA" stop-opacity="0.48"/>
      <stop offset="1" stop-color="#A6B7C3" stop-opacity="0.34"/>
    </linearGradient>
    <linearGradient id="liquid" x1="265" y1="440" x2="635" y2="1125" gradientUnits="userSpaceOnUse">
      <stop stop-color="${liquid}" stop-opacity="0.8"/>
      <stop offset="1" stop-color="#0D1017" stop-opacity="0.26"/>
    </linearGradient>
    <linearGradient id="cap" x1="338" y1="108" x2="562" y2="220" gradientUnits="userSpaceOnUse">
      <stop stop-color="${cap}"/>
      <stop offset="1" stop-color="#1A1A1A"/>
    </linearGradient>
    <radialGradient id="shine" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(300 428) rotate(90) scale(550 260)">
      <stop stop-color="#FFFFFF" stop-opacity="0.56"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow" x="80" y="180" width="740" height="1140" filterUnits="userSpaceOnUse">
      <feGaussianBlur stdDeviation="22"/>
    </filter>
  </defs>
  <ellipse cx="452" cy="1222" rx="244" ry="42" fill="#020304" fill-opacity="0.28" filter="url(#shadow)"/>
  <rect x="356" y="128" width="188" height="112" rx="28" fill="url(#cap)"/>
  <rect x="394" y="82" width="112" height="86" rx="24" fill="#1C1F24"/>
  <path d="M262 264C262 202 312 152 374 152H530C592 152 642 202 642 264V1038C642 1139 560 1221 459 1221H445C344 1221 262 1139 262 1038V264Z" fill="url(#glass)"/>
  <path d="M292 438C292 403 320 375 355 375H549C584 375 612 403 612 438V1026C612 1090 560 1142 496 1142H408C344 1142 292 1090 292 1026V438Z" fill="url(#liquid)"/>
  <rect x="300" y="520" width="304" height="294" rx="18" fill="${label}" fill-opacity="0.84"/>
  <rect x="324" y="544" width="256" height="246" rx="12" stroke="#F8F1E4" stroke-opacity="0.44"/>
  <text x="452" y="616" text-anchor="middle" fill="#F8F1E4" font-size="34" letter-spacing="12" font-family="Arial, Helvetica, sans-serif">${subtitle}</text>
  <text x="452" y="694" text-anchor="middle" fill="#FFFFFF" font-size="72" font-style="italic" font-family="Georgia, 'Times New Roman', serif">${name}</text>
  <text x="452" y="756" text-anchor="middle" fill="#EEE7DB" font-size="22" letter-spacing="10" font-family="Arial, Helvetica, sans-serif">EAU DE PARFUM</text>
  <path d="M262 264C262 202 312 152 374 152H530C592 152 642 202 642 264V1038C642 1139 560 1221 459 1221H445C344 1221 262 1139 262 1038V264Z" stroke="#FFFFFF" stroke-opacity="0.34" stroke-width="10"/>
  <path d="M326 260C341 219 370 174 412 152" stroke="#FFFFFF" stroke-opacity="0.52" stroke-width="18" stroke-linecap="round"/>
  <rect x="284" y="216" width="52" height="760" rx="26" fill="url(#shine)"/>
</svg>
`;

const editorialScene = ({ palette, accent, title, subtitle }) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="1600" viewBox="0 0 1200 1600" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="68" y1="94" x2="1113" y2="1496" gradientUnits="userSpaceOnUse">
      <stop stop-color="${palette[0]}"/>
      <stop offset="0.6" stop-color="${palette[1]}"/>
      <stop offset="1" stop-color="${palette[2]}"/>
    </linearGradient>
    <radialGradient id="spot" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(820 412) rotate(123) scale(520 420)">
      <stop stop-color="${accent}" stop-opacity="0.65"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="1600" fill="url(#bg)"/>
  <ellipse cx="820" cy="412" rx="520" ry="420" fill="url(#spot)"/>
  <rect x="156" y="244" width="628" height="984" rx="32" fill="#050608" fill-opacity="0.22"/>
  <path d="M132 1274C312 1148 432 1058 570 854C676 698 736 550 864 430C946 352 1018 308 1128 274" stroke="#FFFFFF" stroke-opacity="0.16" stroke-width="16" stroke-linecap="round"/>
  <path d="M264 1508C430 1286 532 1172 624 1026C722 872 764 780 920 610" stroke="#FFFFFF" stroke-opacity="0.09" stroke-width="10" stroke-linecap="round"/>
  <text x="158" y="1370" fill="#FFFFFF" fill-opacity="0.88" font-size="88" font-style="italic" font-family="Georgia, 'Times New Roman', serif">${title}</text>
  <text x="164" y="1444" fill="#F4E9D7" fill-opacity="0.7" font-size="24" letter-spacing="12" font-family="Arial, Helvetica, sans-serif">${subtitle}</text>
</svg>
`;

const ingredientScene = ({ palette, accent, title }) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="1600" viewBox="0 0 1200 1600" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="122" y1="92" x2="1098" y2="1510" gradientUnits="userSpaceOnUse">
      <stop stop-color="${palette[0]}"/>
      <stop offset="0.45" stop-color="${palette[1]}"/>
      <stop offset="1" stop-color="${palette[2]}"/>
    </linearGradient>
    <radialGradient id="halo" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(644 410) rotate(90) scale(392 392)">
      <stop stop-color="${accent}" stop-opacity="0.58"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="1600" fill="url(#bg)"/>
  <circle cx="644" cy="410" r="392" fill="url(#halo)"/>
  <ellipse cx="618" cy="882" rx="344" ry="444" fill="#101114" fill-opacity="0.28"/>
  <path d="M288 942C352 726 466 532 614 420C748 318 868 286 1010 326" stroke="#FFFFFF" stroke-opacity="0.15" stroke-width="18" stroke-linecap="round"/>
  <path d="M210 1196C354 1064 456 922 542 748C626 580 672 468 770 296" stroke="#FFFFFF" stroke-opacity="0.09" stroke-width="12" stroke-linecap="round"/>
  <text x="146" y="1420" fill="#FFFFFF" fill-opacity="0.86" font-size="86" font-style="italic" font-family="Georgia, 'Times New Roman', serif">${title}</text>
</svg>
`;

const files = [
  ["hero", "hero-ice-bg", heroBackground({ palette: ["#09111A", "#102A3D", "#030507"], glow: "#9DC9F3", accent: "#5D92C5", title: "GLACIAL AURA" })],
  ["hero", "hero-water-bg", heroBackground({ palette: ["#07131E", "#0A2432", "#010406"], glow: "#79B8D9", accent: "#79C5D7", title: "LIQUID MIRROR" })],
  ["hero", "hero-desert-bg", heroBackground({ palette: ["#1A120C", "#513625", "#090403"], glow: "#E4A56F", accent: "#BB6F38", title: "EMBER DUNE" })],
  ["hero", "hero-smoke-bg", heroBackground({ palette: ["#050608", "#1B1B1F", "#090A0C"], glow: "#B3B8C4", accent: "#7F8798", title: "VELVET SMOKE" })],
  ["products", "wild-silence-cutout", bottleRender({ liquid: "#9DB9C6", glass: "#DBE7EF", label: "#1B212A", cap: "#383E46", name: "Wild Silence", subtitle: "DOTFUMES" })],
  ["products", "wild-silence-front", bottleRender({ liquid: "#B6CBD5", glass: "#E6EEF3", label: "#17212A", cap: "#454B53", name: "Wild Silence", subtitle: "ARCHIVE" })],
  ["products", "wild-silence-angle", bottleRender({ liquid: "#A2BBC3", glass: "#DDE7EC", label: "#1F252E", cap: "#414750", name: "Wild Silence", subtitle: "RESERVE" })],
  ["products", "wild-silence-hero", bottleRender({ liquid: "#9AB9C9", glass: "#E7F0F6", label: "#1C2430", cap: "#343A41", name: "Wild Silence", subtitle: "NO. 01" })],
  ["products", "midnight-echo-cutout", bottleRender({ liquid: "#6E473E", glass: "#E2D8D2", label: "#181011", cap: "#312629", name: "Midnight Echo", subtitle: "DOTFUMES" })],
  ["products", "midnight-echo-hero", bottleRender({ liquid: "#6C4A40", glass: "#E7DDDA", label: "#1E1415", cap: "#2A2022", name: "Midnight Echo", subtitle: "NO. 02" })],
  ["products", "velvet-dust-cutout", bottleRender({ liquid: "#CAB9B3", glass: "#F0EAEA", label: "#E4D8D2", cap: "#776E71", name: "Velvet Dust", subtitle: "DOTFUMES" })],
  ["products", "velvet-dust-hero", bottleRender({ liquid: "#D4C4BE", glass: "#F5EFEE", label: "#E2D8D3", cap: "#70686A", name: "Velvet Dust", subtitle: "NO. 03" })],
  ["campaign", "midnight-echo-campaign", editorialScene({ palette: ["#05070A", "#191F2A", "#09090B"], accent: "#6A7999", title: "Midnight Echo", subtitle: "SMOKE / OUD / VELVET" })],
  ["campaign", "velvet-dust-campaign", editorialScene({ palette: ["#E9DED6", "#BAA69D", "#77676B"], accent: "#F5EDE3", title: "Velvet Dust", subtitle: "IRIS / SUEDE / MUSK" })],
  ["campaign", "men-collection", editorialScene({ palette: ["#081018", "#223140", "#0A0B0D"], accent: "#7BB5D2", title: "Pour Homme", subtitle: "THE ARCHITECT" })],
  ["campaign", "women-collection", editorialScene({ palette: ["#3A2328", "#7A5960", "#140C11"], accent: "#D4B4B5", title: "Pour Femme", subtitle: "THE MUSE" })],
  ["ingredients", "bergamot-cinematic", ingredientScene({ palette: ["#08131B", "#133B4E", "#050709"], accent: "#7FD0E5", title: "Frozen Bergamot" })],
  ["ingredients", "cedar-cinematic", ingredientScene({ palette: ["#1A110D", "#65442D", "#080605"], accent: "#DE8A47", title: "Atlas Cedarwood" })],
  ["ingredients", "oud-cinematic", ingredientScene({ palette: ["#0A090A", "#272229", "#080708"], accent: "#B0A5A1", title: "Smoked Oud" })],
  ["story", "story-campaign", editorialScene({ palette: ["#0B1017", "#23384B", "#0A0D12"], accent: "#A5C5D5", title: "Silent Dialogue", subtitle: "MIST / MINERAL / MEMORY" })],
];

await Promise.all([
  ensureDir(path.join(publicDir, "hero")),
  ensureDir(path.join(publicDir, "products")),
  ensureDir(path.join(publicDir, "campaign")),
  ensureDir(path.join(publicDir, "ingredients")),
  ensureDir(path.join(publicDir, "story")),
]);

for (const [folder, name, markup] of files) {
  const dir = path.join(publicDir, folder);
  const svgPath = path.join(dir, `${name}.svg`);
  const pngPath = path.join(dir, `${name}.png`);
  const webpPath = path.join(dir, `${name}.webp`);
  await writeSvg(svgPath, markup);
  const size = folder === "products" ? 1800 : 1600;
  await renderSvgToPng(svgPath, pngPath, size);
  await convertToWebp(pngPath, webpPath);
}
