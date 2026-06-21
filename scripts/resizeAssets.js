// scripts/resizeAssets.js
// Run this script to generate correctly sized assets for Android & iOS Expo apps.
// Requires Node.js and the 'sharp' library.
// Install sharp first: npm install sharp

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Define source assets folder (replace with your actual assets path if different)
const srcDir = path.join(__dirname, '..', 'assets');
// Ensure output folder exists (you can overwrite original files if you wish)
const outDir = srcDir; // write back to same folder

// Asset definitions: target width x height (pixels)
const assets = [
  { file: 'icon.png', size: 1024 }, // app icon (Android & iOS) – 1024x1024 recommended
  { file: 'adaptive-icon.png', size: 1024 }, // adaptive icon foreground (transparent PNG)
  { file: 'splash-icon.png', size: 2732 }, // splash screen (Android) – typical 2732x2732 (portrait) or 1242x2436 (iOS)
  { file: 'logo.png', maxSize: 512 }, // logo used inside app – keep <=512px
  { file: 'favicon.png', size: 48 }, // favicon – 48x48 or 32x32
];

function resizeImage(srcPath, outPath, options) {
  return sharp(srcPath)
    .resize(options)
    .toFile(outPath)
    .then(() => console.log(`Resized ${path.basename(srcPath)} → ${path.basename(outPath)}`))
    .catch(err => console.error(`Error processing ${srcPath}:`, err.message));
}

(async () => {
  for (const asset of assets) {
    const srcPath = path.join(srcDir, asset.file);
    if (!fs.existsSync(srcPath)) {
      console.warn(`⚠️  ${asset.file} not found in ${srcDir}. Skipping.`);
      continue;
    }
    const outPath = path.join(outDir, asset.file); // overwrite
    if (asset.size) {
      await resizeImage(srcPath, outPath, { width: asset.size, height: asset.size, fit: 'contain' });
    } else if (asset.maxSize) {
      // keep aspect ratio, limit longest side to maxSize
      await resizeImage(srcPath, outPath, { width: asset.maxSize, height: asset.maxSize, fit: 'inside' });
    }
  }
  console.log('✅ All assets processed.');
})();
