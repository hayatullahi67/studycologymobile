const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const srcPath = 'C:\\Users\\USER\\.gemini\\antigravity-ide\\brain\\01661172-5e8f-4634-8898-b794c77633d8\\media__1781765159974.png';
const assetsDir = 'C:\\Users\\USER\\Desktop\\studycologymobile\\assets';
const bgColor = '#22483b'; // The exact dark green from the logo image

async function generateAssets() {
  console.log('Starting asset generation...');

  if (!fs.existsSync(srcPath)) {
    console.error(`Source image not found: ${srcPath}`);
    return;
  }

  // 1. icon.png (1024x1024)
  // We want the vertical logo to be centered, scaled to fit inside a 800px height box to ensure professional padding/margins.
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: bgColor
    }
  })
  .composite([
    {
      input: await sharp(srcPath).resize({ height: 800, fit: 'contain' }).toBuffer(),
      gravity: 'center'
    }
  ])
  .png()
  .toFile(path.join(assetsDir, 'icon.png'));
  console.log('✅ Generated assets/icon.png');

  // 2. adaptive-icon.png (1024x1024)
  // Android adaptive icon has a safe-zone circle in the center. We scale the content to fit within a 640px height box.
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: bgColor
    }
  })
  .composite([
    {
      input: await sharp(srcPath).resize({ height: 640, fit: 'contain' }).toBuffer(),
      gravity: 'center'
    }
  ])
  .png()
  .toFile(path.join(assetsDir, 'adaptive-icon.png'));
  console.log('✅ Generated assets/adaptive-icon.png');

  // 3. splash-icon.png (2732x2732 for high-res splash screens, or standard size)
  // We want the logo centered inside a large splash screen image so it aligns beautifully.
  await sharp({
    create: {
      width: 2732,
      height: 2732,
      channels: 4,
      background: bgColor
    }
  })
  .composite([
    {
      input: await sharp(srcPath).resize({ height: 1200, fit: 'contain' }).toBuffer(),
      gravity: 'center'
    }
  ])
  .png()
  .toFile(path.join(assetsDir, 'splash-icon.png'));
  console.log('✅ Generated assets/splash-icon.png');

  // 4. logo.png (In-app badge: keep vertical aspect ratio, but high resolution, e.g., height 512)
  await sharp(srcPath)
    .resize({ height: 512, fit: 'contain' })
    .png()
    .toFile(path.join(assetsDir, 'logo.png'));
  console.log('✅ Generated assets/logo.png');

  // 5. favicon.png (48x48)
  await sharp({
    create: {
      width: 48,
      height: 48,
      channels: 4,
      background: bgColor
    }
  })
  .composite([
    {
      input: await sharp(srcPath).resize({ height: 38, fit: 'contain' }).toBuffer(),
      gravity: 'center'
    }
  ])
  .png()
  .toFile(path.join(assetsDir, 'favicon.png'));
  console.log('✅ Generated assets/favicon.png');

  console.log('🎉 All assets successfully resized and written to assets directory!');
}

generateAssets().catch(err => {
  console.error('Error generating assets:', err);
});
