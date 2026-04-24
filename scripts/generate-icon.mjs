import { createCanvas, Path2D } from '@napi-rs/canvas';
import { writeFileSync } from 'fs';

const SIZE = 180;
const BG_RADIUS = 40;
const canvas = createCanvas(SIZE, SIZE);
const ctx = canvas.getContext('2d');

// ── Purple rounded background (same $color-primary as the app) ───
ctx.fillStyle = '#6941C6';
ctx.beginPath();
ctx.moveTo(BG_RADIUS, 0);
ctx.lineTo(SIZE - BG_RADIUS, 0);
ctx.quadraticCurveTo(SIZE, 0, SIZE, BG_RADIUS);
ctx.lineTo(SIZE, SIZE - BG_RADIUS);
ctx.quadraticCurveTo(SIZE, SIZE, SIZE - BG_RADIUS, SIZE);
ctx.lineTo(BG_RADIUS, SIZE);
ctx.quadraticCurveTo(0, SIZE, 0, SIZE - BG_RADIUS);
ctx.lineTo(0, BG_RADIUS);
ctx.quadraticCurveTo(0, 0, BG_RADIUS, 0);
ctx.closePath();
ctx.fill();

// ── Scale the 24×24 Tabler icon to fill the icon nicely ──────────
// The receipt content sits roughly within x5-19, y3-21 of the 24×24 viewBox.
// Scale 5.5 → viewBox occupies 132×132 px, centred in 180×180.
const SCALE = 5.5;
const offset = (SIZE - 24 * SCALE) / 2; // = 24 px each side

ctx.save();
ctx.translate(offset, offset);
ctx.scale(SCALE, SCALE);

ctx.strokeStyle = 'white';
ctx.lineWidth = 1.5;          // × SCALE → ~8.3 px visible
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

// Exact paths from @tabler/icons receipt-2:
// 1. Receipt outline with zigzag / torn bottom
ctx.stroke(new Path2D(
  'M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16l-3 -2l-2 2l-2 -2l-2 2l-2 -2l-3 2'
));

// 2. Currency / dollar symbol inside the receipt
ctx.stroke(new Path2D(
  'M14 8h-2.5a1.5 1.5 0 0 0 0 3h1a1.5 1.5 0 0 1 0 3h-2.5m2 0v1.5m0 -9v1.5'
));

ctx.restore();

writeFileSync('./public/apple-touch-icon.png', canvas.toBuffer('image/png'));
console.log('✓ apple-touch-icon.png generert (180×180)');
