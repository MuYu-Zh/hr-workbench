/* 生成 PWA 图标 PNG（纯 Node，无第三方依赖：zlib deflate + 手写 PNG 编码）
 * 图标：琥珀渐变底 + 深色几何 "HR" 字母
 * 用法：node tools/gen-icon.js <size> <out>
 */
'use strict';
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function makePng(size, pixels) {
  // pixels: Uint8Array RGBA, size*size
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  // filter: 每行前加 0
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    raw.set(pixels.subarray(y * size * 4, (y + 1) * size * 4), y * (size * 4 + 1) + 1);
  }
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function render(size) {
  const px = new Uint8Array(size * size * 4);
  const S = size;
  const at = (x, y) => (y * S + x) * 4;

  // 渐变背景：顶部 #e6b95c → 底部 #b9842c
  const top = [230, 185, 92], bot = [185, 132, 44];
  for (let y = 0; y < S; y++) {
    const t = y / S;
    const r = Math.round(top[0] + (bot[0] - top[0]) * t);
    const g = Math.round(top[1] + (bot[1] - top[1]) * t);
    const b = Math.round(top[2] + (bot[2] - top[2]) * t);
    for (let x = 0; x < S; x++) {
      const i = at(x, y);
      px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
    }
  }

  // 圆角遮罩（半径 18%）
  const radius = S * 0.18;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      // 四角距离
      const cx = Math.min(x, S - 1 - x), cy = Math.min(y, S - 1 - y);
      const d = Math.sqrt(Math.pow(Math.max(0, cx - (S / 2 - radius)), 2) + Math.pow(Math.max(0, cy - (S / 2 - radius)), 2));
      if (d > radius) {
        const i = at(x, y);
        px[i + 3] = 0; // 透明
      }
    }
  }

  // 深色几何 "HR"（深墨绿 #13201c）
  const ink = [19, 32, 28];
  const u = S / 512; // 以 512 设计坐标缩放

  function fillRect(x0, y0, x1, y1) {
    x0 = Math.round(x0 * u); x1 = Math.round(x1 * u);
    y0 = Math.round(y0 * u); y1 = Math.round(y1 * u);
    for (let y = Math.max(0, y0); y < Math.min(S, y1); y++) {
      for (let x = Math.max(0, x0); x < Math.min(S, x1); x++) {
        const i = at(x, y);
        if (px[i + 3] > 0) { px[i] = ink[0]; px[i + 1] = ink[1]; px[i + 2] = ink[2]; }
      }
    }
  }

  // H：左竖、右竖、中横
  fillRect(110, 130, 180, 382);
  fillRect(332, 130, 402, 382);
  fillRect(110, 232, 402, 292);

  // R：竖 + 上半圆环 + 斜腿
  fillRect(462, 130, 532, 382);
  // 上半圆（实心圆减去内圆 = 环形）
  const cx = 532, cy = 256, ro = 96, ri = 44;
  for (let y = 130; y <= 300; y++) {
    for (let x = 532; x <= 640; x++) {
      const dx = x - cx, dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= ro && d >= ri && px[at(Math.round(x * u), Math.round(y * u)) + 3] > 0) {
        const i = at(Math.round(x * u), Math.round(y * u));
        px[i] = ink[0]; px[i + 1] = ink[1]; px[i + 2] = ink[2];
      }
    }
  }
  // 斜腿
  fillRect(520, 300, 590, 340);
  fillRect(560, 320, 630, 382);

  return px;
}

const size = parseInt(process.argv[2] || '512', 10);
const out = process.argv[3] || path.join(__dirname, '..', 'icons', 'icon-' + size + '.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, makePng(size, render(size)));
console.log('生成图标: ' + out + ' (' + size + 'x' + size + ', ' + fs.statSync(out).size + ' bytes)');
