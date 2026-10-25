// Generates the web-sized images from design/profile-source.jpg:
//   src/assets/profile-{sm,md,lg}.webp   header avatar / about card / 3D portrait
//   public/favicon.png, favicon.ico (PNG-in-ICO), apple-touch-icon.png
// Run after changing the source photo:  npm run images   (from frontend/)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'design/profile-source.jpg');
const assets = resolve(root, 'src/assets');
mkdirSync(assets, { recursive: true });

const sizes = { sm: 96, md: 256, lg: 900 }; // CSS px at 1x: ~36 / 112 / 3D texture. Widths cover 2x screens.
for (const [name, width] of Object.entries(sizes)) {
  const out = resolve(assets, `profile-${name}.webp`);
  const info = await sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality: name === 'lg' ? 82 : 85 }).toFile(out);
  console.log(`profile-${name}.webp  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} KB`);
}

// Square face crop for icons.
const square = (size) => sharp(source).resize(size, size, { fit: 'cover', position: 'attention' });
await square(64).png({ compressionLevel: 9 }).toFile(resolve(root, 'public/favicon.png'));
await square(180).png({ compressionLevel: 9 }).toFile(resolve(root, 'public/apple-touch-icon.png'));

// .ico can wrap a PNG: 6-byte header + one 16-byte directory entry + the PNG bytes.
const png32 = await square(32).png({ compressionLevel: 9 }).toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // image count
header.writeUInt8(32, 6); // width
header.writeUInt8(32, 7); // height
header.writeUInt16LE(1, 10); // colour planes
header.writeUInt16LE(32, 12); // bits per pixel
header.writeUInt32LE(png32.length, 14); // image size
header.writeUInt32LE(22, 18); // image offset
writeFileSync(resolve(root, 'public/favicon.ico'), Buffer.concat([header, png32]));
console.log(`favicon.png 64x64, apple-touch-icon.png 180x180, favicon.ico ${(png32.length / 1024).toFixed(1)} KB`);
