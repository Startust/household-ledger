import sharp from 'sharp';
for (const [file, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  await sharp('web/public/icon.svg').resize(size, size).png().toFile(`web/public/${file}`);
}
console.log('Generated local PWA icons from the authored vector mark.');
