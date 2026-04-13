const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ===== COLOR PALETTE =====
const COLORS = {
  bgDark:     '#1a1a2e',
  bgMid:      '#16213e',
  bgPanel:    '#0f3460',
  accent:     '#e94560',
  accentGlow: '#ff6b81',
  green:      '#4ecca3',
  yellow:     '#ffd369',
  blue:       '#48dbfb',
  purple:     '#a29bfe',
  text:       '#eaeaea',
  textDim:    '#7f8fa6',
  border:     '#2c3e6d',
};

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size / 32; // scale factor (design on 32x32 grid)

  ctx.imageSmoothingEnabled = false;

  // ===== BACKGROUND: Rounded square with gradient =====
  const radius = size * 0.18;
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#0b0e2a');
  grad.addColorStop(0.4, COLORS.bgDark);
  grad.addColorStop(1, '#0d1b3e');

  roundRect(ctx, 0, 0, size, size, radius);
  ctx.fillStyle = grad;
  ctx.fill();

  // ===== SUBTLE BORDER =====
  roundRect(ctx, 0, 0, size, size, radius);
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = Math.max(1, s * 0.5);
  ctx.stroke();

  // ===== CALENDAR GRID (centered, upper portion) =====
  const gridX = Math.round(4 * s);
  const gridY = Math.round(6 * s);
  const gridW = Math.round(24 * s);
  const gridH = Math.round(18 * s);
  const cellW = Math.round(gridW / 7);
  const cellH = Math.round(gridH / 5);

  // Calendar background
  ctx.fillStyle = COLORS.bgPanel;
  ctx.fillRect(gridX, gridY, gridW, gridH);

  // Calendar border
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = Math.max(1, s * 0.4);
  ctx.strokeRect(gridX, gridY, gridW, gridH);

  // Calendar header bar (top row — month bar)
  const headerH = Math.round(cellH * 1.1);
  ctx.fillStyle = COLORS.accent;
  ctx.fillRect(gridX, gridY, gridW, headerH);

  // Small dots on header (month indicator pixels)
  ctx.fillStyle = '#fff';
  const dotSize = Math.max(1, Math.round(s * 0.8));
  for (let i = 0; i < 5; i++) {
    const dx = gridX + Math.round((3 + i * 4) * s);
    const dy = gridY + Math.round(headerH / 2 - dotSize / 2);
    ctx.fillRect(dx, dy, dotSize, dotSize);
  }

  // Calendar grid lines
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = Math.max(1, s * 0.2);
  const bodyY = gridY + headerH;
  const bodyH = gridH - headerH;
  const rows = 4;
  const cols = 7;

  for (let r = 1; r < rows; r++) {
    const y = bodyY + Math.round((bodyH / rows) * r);
    ctx.beginPath();
    ctx.moveTo(gridX, y);
    ctx.lineTo(gridX + gridW, y);
    ctx.stroke();
  }
  for (let c = 1; c < cols; c++) {
    const x = gridX + Math.round((gridW / cols) * c);
    ctx.beginPath();
    ctx.moveTo(x, bodyY);
    ctx.lineTo(x, gridY + gridH);
    ctx.stroke();
  }

  // Highlight "today" cell — a single cell stands out
  const todayCellCol = 3;
  const todayCellRow = 1;
  const tx = gridX + Math.round((gridW / cols) * todayCellCol);
  const ty = bodyY + Math.round((bodyH / rows) * todayCellRow);
  const tw = Math.round(gridW / cols);
  const th = Math.round(bodyH / rows);
  ctx.fillStyle = 'rgba(233, 69, 96, 0.3)';
  ctx.fillRect(tx, ty, tw, th);
  ctx.strokeStyle = COLORS.accent;
  ctx.lineWidth = Math.max(1, s * 0.4);
  ctx.strokeRect(tx, ty, tw, th);

  // Task dots on some cells (colored priority indicators)
  const taskDots = [
    { col: 1, row: 0, color: COLORS.green },
    { col: 4, row: 0, color: COLORS.yellow },
    { col: 2, row: 1, color: COLORS.accent },
    { col: 5, row: 1, color: COLORS.green },
    { col: 3, row: 1, color: COLORS.yellow }, // today cell
    { col: 0, row: 2, color: COLORS.purple },
    { col: 3, row: 2, color: COLORS.green },
    { col: 6, row: 2, color: COLORS.accent },
    { col: 1, row: 3, color: COLORS.yellow },
    { col: 4, row: 3, color: COLORS.blue },
  ];

  const tdSize = Math.max(1, Math.round(s * 0.9));
  taskDots.forEach(({ col, row, color }) => {
    const cx = gridX + Math.round((gridW / cols) * col + gridW / cols / 2 - tdSize / 2);
    const cy = bodyY + Math.round((bodyH / rows) * row + bodyH / rows * 0.65);
    ctx.fillStyle = color;
    ctx.fillRect(cx, cy, tdSize, tdSize);
  });

  // ===== CLOCK/TIMER OVERLAY (bottom-right corner) =====
  const clockR = Math.round(5 * s);
  const clockCx = Math.round(25 * s);
  const clockCy = Math.round(26 * s);

  // Clock background circle (filled)
  ctx.fillStyle = COLORS.bgDark;
  ctx.beginPath();
  ctx.arc(clockCx, clockCy, clockR + Math.round(s * 0.5), 0, Math.PI * 2);
  ctx.fill();

  // Clock ring (like the timer in the app)
  const segments = 12;
  const segAngle = (Math.PI * 2) / segments;
  const ringWidth = Math.max(1.5, s * 0.7);

  for (let i = 0; i < segments; i++) {
    const startAngle = -Math.PI / 2 + i * segAngle + 0.05;
    const endAngle = startAngle + segAngle - 0.1;
    ctx.beginPath();
    ctx.arc(clockCx, clockCy, clockR, startAngle, endAngle);
    // First 8 segments filled (progress), rest dim
    ctx.strokeStyle = i < 8 ? COLORS.accent : COLORS.border;
    ctx.lineWidth = ringWidth;
    ctx.stroke();
  }

  // Clock center dot
  ctx.fillStyle = COLORS.accent;
  const centerDot = Math.max(1, Math.round(s * 0.6));
  ctx.fillRect(clockCx - centerDot / 2, clockCy - centerDot / 2, centerDot, centerDot);

  // Clock hands (hour + minute, pixel style)
  ctx.strokeStyle = COLORS.text;
  ctx.lineWidth = Math.max(1, s * 0.5);

  // Minute hand (pointing up-right)
  ctx.beginPath();
  ctx.moveTo(clockCx, clockCy);
  ctx.lineTo(clockCx + Math.round(2.5 * s), clockCy - Math.round(3 * s));
  ctx.stroke();

  // Hour hand (pointing right)
  ctx.beginPath();
  ctx.moveTo(clockCx, clockCy);
  ctx.lineTo(clockCx + Math.round(2 * s), clockCy - Math.round(0.5 * s));
  ctx.stroke();

  // ===== PIXEL CORNER ACCENTS (matching app aesthetic) =====
  const cornerSize = Math.max(1, Math.round(s * 0.8));
  ctx.fillStyle = COLORS.accent;

  // Top-left corner pixels
  ctx.fillRect(Math.round(2 * s), Math.round(2 * s), cornerSize, cornerSize);
  ctx.fillRect(Math.round(3.2 * s), Math.round(2 * s), cornerSize, cornerSize);
  ctx.fillRect(Math.round(2 * s), Math.round(3.2 * s), cornerSize, cornerSize);

  // Top-right corner pixels
  ctx.fillRect(Math.round(29 * s), Math.round(2 * s), cornerSize, cornerSize);
  ctx.fillRect(Math.round(27.8 * s), Math.round(2 * s), cornerSize, cornerSize);
  ctx.fillRect(Math.round(29 * s), Math.round(3.2 * s), cornerSize, cornerSize);

  // Bottom-left corner pixels
  ctx.fillRect(Math.round(2 * s), Math.round(29 * s), cornerSize, cornerSize);
  ctx.fillRect(Math.round(3.2 * s), Math.round(29 * s), cornerSize, cornerSize);
  ctx.fillRect(Math.round(2 * s), Math.round(27.8 * s), cornerSize, cornerSize);

  return canvas;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ===== GENERATE ALL SIZES =====
const outputDir = path.join(__dirname, '..', 'src', 'assets', 'icons');

// Sizes needed for all platforms
const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];

console.log('Generating icons...\n');

sizes.forEach(size => {
  const canvas = generateIcon(size);
  const buffer = canvas.toBuffer('image/png');
  const filename = `icon_${size}x${size}.png`;
  fs.writeFileSync(path.join(outputDir, filename), buffer);
  console.log(`  ✓ ${filename}`);
});

// Also save master as icon.png (256x256 for Linux)
const master256 = generateIcon(256);
fs.writeFileSync(path.join(outputDir, 'icon.png'), master256.toBuffer('image/png'));
console.log('  ✓ icon.png (256x256 default)');

console.log('\nAll PNG icons generated in src/assets/icons/');

// ===== GENERATE .ICNS (macOS) =====
console.log('\nGenerating macOS .icns...');
const iconsetDir = path.join(outputDir, 'icon.iconset');
if (!fs.existsSync(iconsetDir)) fs.mkdirSync(iconsetDir);

const icnsSizes = [
  { name: 'icon_16x16.png', size: 16 },
  { name: 'icon_16x16@2x.png', size: 32 },
  { name: 'icon_32x32.png', size: 32 },
  { name: 'icon_32x32@2x.png', size: 64 },
  { name: 'icon_128x128.png', size: 128 },
  { name: 'icon_128x128@2x.png', size: 256 },
  { name: 'icon_256x256.png', size: 256 },
  { name: 'icon_256x256@2x.png', size: 512 },
  { name: 'icon_512x512.png', size: 512 },
  { name: 'icon_512x512@2x.png', size: 1024 },
];

icnsSizes.forEach(({ name, size }) => {
  const src = path.join(outputDir, `icon_${size}x${size}.png`);
  const dest = path.join(iconsetDir, name);
  fs.copyFileSync(src, dest);
});

try {
  execSync(`iconutil -c icns "${iconsetDir}" -o "${path.join(outputDir, 'icon.icns')}"`);
  console.log('  ✓ icon.icns generated');
  // Clean up iconset
  fs.rmSync(iconsetDir, { recursive: true });
} catch (e) {
  console.log('  ⚠ iconutil failed (macOS only):', e.message);
}

// ===== GENERATE .ICO (Windows) =====
// Using PNG-to-ICO format (modern ICO supports embedded PNGs)
console.log('\nGenerating Windows .ico...');
try {
  const icoSizes = [16, 32, 48, 256];
  const pngBuffers = icoSizes.map(size => {
    return fs.readFileSync(path.join(outputDir, `icon_${size}x${size}.png`));
  });

  const ico = createIco(pngBuffers);
  fs.writeFileSync(path.join(outputDir, 'icon.ico'), ico);
  console.log('  ✓ icon.ico generated');
} catch (e) {
  console.log('  ⚠ ICO generation failed:', e.message);
}

console.log('\n✅ Icon generation complete!\n');

// ===== ICO FILE FORMAT BUILDER =====
function createIco(pngBuffers) {
  // ICO header: 6 bytes
  // Each entry: 16 bytes
  // Then PNG data blocks

  const numImages = pngBuffers.length;
  const headerSize = 6 + numImages * 16;

  // Parse PNG dimensions from header
  const entries = pngBuffers.map((buf, i) => {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return {
      width: width >= 256 ? 0 : width,   // 0 means 256 in ICO format
      height: height >= 256 ? 0 : height,
      buf,
    };
  });

  let offset = headerSize;
  const header = Buffer.alloc(headerSize);

  // ICO header
  header.writeUInt16LE(0, 0);         // Reserved
  header.writeUInt16LE(1, 2);         // Type: 1 = ICO
  header.writeUInt16LE(numImages, 4); // Number of images

  entries.forEach((entry, i) => {
    const pos = 6 + i * 16;
    header.writeUInt8(entry.width, pos);       // Width
    header.writeUInt8(entry.height, pos + 1);  // Height
    header.writeUInt8(0, pos + 2);             // Color palette
    header.writeUInt8(0, pos + 3);             // Reserved
    header.writeUInt16LE(1, pos + 4);          // Color planes
    header.writeUInt16LE(32, pos + 6);         // Bits per pixel
    header.writeUInt32LE(entry.buf.length, pos + 8);  // Size of PNG data
    header.writeUInt32LE(offset, pos + 12);           // Offset to PNG data
    offset += entry.buf.length;
  });

  return Buffer.concat([header, ...pngBuffers.map(e => e)]);
}
