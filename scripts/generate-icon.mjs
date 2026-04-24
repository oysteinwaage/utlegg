import { createCanvas, Path2D } from '@napi-rs/canvas';
import { writeFileSync } from 'fs';

const RECEIPT_OUTLINE = 'M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16l-3 -2l-2 2l-2 -2l-2 2l-2 -2l-3 2';
const RECEIPT_SYMBOL  = 'M14 8h-2.5a1.5 1.5 0 0 0 0 3h1a1.5 1.5 0 0 1 0 3h-2.5m2 0v1.5m0 -9v1.5';

function generateIcon(size) {
  const bgRadius = Math.round(40 * (size / 180));
  const canvas   = createCanvas(size, size);
  const ctx      = canvas.getContext('2d');

  // Purple rounded background
  ctx.fillStyle = '#6941C6';
  ctx.beginPath();
  ctx.moveTo(bgRadius, 0);
  ctx.lineTo(size - bgRadius, 0);
  ctx.quadraticCurveTo(size, 0, size, bgRadius);
  ctx.lineTo(size, size - bgRadius);
  ctx.quadraticCurveTo(size, size, size - bgRadius, size);
  ctx.lineTo(bgRadius, size);
  ctx.quadraticCurveTo(0, size, 0, size - bgRadius);
  ctx.lineTo(0, bgRadius);
  ctx.quadraticCurveTo(0, 0, bgRadius, 0);
  ctx.closePath();
  ctx.fill();

  // Scale the 24×24 Tabler icon — fills ~73 % of the canvas (same ratio at all sizes)
  const scale  = (size * 0.733) / 24;
  const offset = (size - 24 * scale) / 2;

  ctx.save();
  ctx.translate(offset, offset);
  ctx.scale(scale, scale);

  ctx.strokeStyle = 'white';
  ctx.lineWidth   = 1.5;   // in 24-unit space; rendered width scales with the icon
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';

  ctx.stroke(new Path2D(RECEIPT_OUTLINE));
  ctx.stroke(new Path2D(RECEIPT_SYMBOL));

  ctx.restore();
  return canvas.toBuffer('image/png');
}

writeFileSync('./public/apple-touch-icon.png', generateIcon(180));
console.log('✓ apple-touch-icon.png (180×180)');

writeFileSync('./public/icon-512.png', generateIcon(512));
console.log('✓ icon-512.png       (512×512)');
