// Generates all branded image assets from the real logo + onboarding art.
//   node scripts/gen-brand-assets.mjs
// Requires: sharp (already resolvable in this workspace).
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const RES = path.join(ROOT, 'android/app/src/main/res');
const LOGO = path.join(ROOT, 'assets/splash/logo.png');

const BLUE = { r: 28, g: 116, b: 224, alpha: 1 };   // #1C74E0
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

const ensure = (p) => fs.mkdir(path.dirname(p), { recursive: true });
const write = async (p, buf) => { await ensure(p); await fs.writeFile(p, buf); };

// Trimmed logo (drops the flat white margin, keeps interior white figure)
const trimmed = await sharp(await fs.readFile(LOGO)).trim().png().toBuffer();

const fit = (px) =>
  sharp(trimmed).resize(px, px, { fit: 'contain', background: CLEAR }).png().toBuffer();

// Square icon: logo centered on a solid background with symmetric padding.
async function squareIcon(size, pad, bg) {
  const inner = Math.round(size * (1 - pad * 2));
  return sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: await fit(inner), gravity: 'center' }]).png().toBuffer();
}
// Adaptive foreground: logo in the ~60% safe zone on transparency.
async function foreground(size) {
  return sharp({ create: { width: size, height: size, channels: 4, background: CLEAR } })
    .composite([{ input: await fit(Math.round(size * 0.6)), gravity: 'center' }]).png().toBuffer();
}
// Branded splash: blue vertical gradient + centered white rounded badge holding the logo.
async function splash(w, h) {
  const m = Math.min(w, h);
  const badge = Math.round(m * 0.44);
  const radius = Math.round(badge * 0.26);
  const bgSvg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2E86F0"/><stop offset="0.55" stop-color="#1C74E0"/><stop offset="1" stop-color="#1560C6"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/></svg>`;
  const badgeSvg = `<svg width="${badge}" height="${badge}" xmlns="http://www.w3.org/2000/svg"><rect width="${badge}" height="${badge}" rx="${radius}" ry="${radius}" fill="#ffffff"/></svg>`;
  const badgeImg = await sharp(Buffer.from(badgeSvg))
    .composite([{ input: await fit(Math.round(badge * 0.68)), gravity: 'center' }]).png().toBuffer();
  return sharp(Buffer.from(bgSvg)).composite([{ input: badgeImg, gravity: 'center' }]).png().toBuffer();
}

// ── Android launcher icons ────────────────────────────────────────────────
const DENS = { mdpi: [48, 108], hdpi: [72, 162], xhdpi: [96, 216], xxhdpi: [144, 324], xxxhdpi: [192, 432] };
for (const [d, [ic, fg]] of Object.entries(DENS)) {
  await write(path.join(RES, `mipmap-${d}/ic_launcher.png`), await squareIcon(ic, 0.16, { r: 255, g: 255, b: 255, alpha: 1 }));
  await write(path.join(RES, `mipmap-${d}/ic_launcher_round.png`), await squareIcon(ic, 0.16, { r: 255, g: 255, b: 255, alpha: 1 }));
  await write(path.join(RES, `mipmap-${d}/ic_launcher_foreground.png`), await foreground(fg));
}

// ── Android splash (regenerate each existing file at its own dimensions) ───
const splashDirs = (await fs.readdir(RES)).filter((n) => n === 'drawable' || n.startsWith('drawable-'));
for (const d of splashDirs) {
  const p = path.join(RES, d, 'splash.png');
  try {
    const { width, height } = await sharp(await fs.readFile(p)).metadata();
    await write(p, await splash(width, height));
  } catch { /* no splash.png in this bucket */ }
}

// ── Web assets ─────────────────────────────────────────────────────────────
await write(path.join(ROOT, 'public/brand/logo.png'),
  await sharp(trimmed).resize(512, 512, { fit: 'contain', background: CLEAR }).png().toBuffer());
await write(path.join(ROOT, 'app/icon.png'), await squareIcon(512, 0.1, { r: 255, g: 255, b: 255, alpha: 1 }));
await write(path.join(ROOT, 'app/apple-icon.png'), await squareIcon(180, 0.12, { r: 255, g: 255, b: 255, alpha: 1 }));

// ── Onboarding illustrations (optimize, keep transparency) ─────────────────
for (const name of ['first', 'second', 'third']) {
  const src = path.join(ROOT, `assets/onboarding/${name}.png`);
  await write(path.join(ROOT, `public/onboarding/${name}.png`),
    await sharp(await fs.readFile(src)).resize(960, 960, { fit: 'inside' }).png({ compressionLevel: 9, quality: 90 }).toBuffer());
}

console.log('Brand assets generated: launcher icons, splash x' + splashDirs.length + ', web logo/icons, 3 onboarding images.');
