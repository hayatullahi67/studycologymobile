const sharp = require('sharp');
const path = require('path');

const srcPath = 'C:\\Users\\USER\\.gemini\\antigravity-ide\\brain\\01661172-5e8f-4634-8898-b794c77633d8\\media__1781765159974.png';

sharp(srcPath)
  .metadata()
  .then(metadata => {
    console.log('Metadata:', metadata);
    // Let's get the color of top-left corner (5, 5)
    return sharp(srcPath)
      .raw()
      .toBuffer({ resolveWithObject: true });
  })
  .then(({ data, info }) => {
    // 3 channels (RGB) or 4 channels (RGBA)
    const channels = info.channels;
    const pixelIndex = (5 * info.width + 5) * channels;
    const r = data[pixelIndex];
    const g = data[pixelIndex + 1];
    const b = data[pixelIndex + 2];
    console.log(`Pixel color at (5,5): RGB(${r}, ${g}, ${b}) -> Hex: #${[r,g,b].map(x => x.toString(16).padStart(2, '0')).join('')}`);
  })
  .catch(err => {
    console.error('Error:', err);
  });
