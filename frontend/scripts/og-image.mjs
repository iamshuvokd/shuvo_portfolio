// Renders design/og-image.html to public/og-image.jpg (1200x630) using a locally installed Edge/Chrome,
// then compresses it: WhatsApp skips preview images over ~300 KB.
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync, statSync } from 'node:fs';
import sharp from 'sharp';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = pathToFileURL(resolve(root, 'design/og-image.html')).href;
const rawPng = resolve(root, 'design/.og-image.raw.png');
const output = resolve(root, 'public/og-image.jpg');

const candidates = [
  process.env.BROWSER_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

const browser = candidates.find((path) => existsSync(path));
if (!browser) {
  console.error('No Chrome/Edge found. Set BROWSER_PATH to a Chromium-based browser executable.');
  process.exit(1);
}

const result = spawnSync(
  browser,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=1200,630',
    '--virtual-time-budget=4000',
    `--screenshot=${rawPng}`,
    source,
  ],
  { stdio: 'inherit', timeout: 60_000 },
);

if (result.status !== 0 || !existsSync(rawPng)) {
  console.error('Screenshot failed.');
  process.exit(1);
}
await sharp(rawPng).jpeg({ quality: 84, mozjpeg: true, chromaSubsampling: '4:4:4' }).toFile(output);
rmSync(rawPng);
console.log(`Wrote ${output} (${Math.round(statSync(output).size / 1024)} KB)`);
