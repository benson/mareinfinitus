import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const publicDir = path.join(projectRoot, "public");
const svgPath = path.join(publicDir, "favicon.svg");
const checkOnly = process.argv.includes("--check");

function parseColor(value) {
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (!match) throw new Error(`Unsupported SVG fill color: ${value}`);
  const number = Number.parseInt(match[1], 16);
  return [(number >>> 16) & 255, (number >>> 8) & 255, number & 255, 255];
}

function parseIconSvg(source) {
  const viewBox = /viewBox=["']([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)["']/i.exec(source);
  if (!viewBox) throw new Error("favicon.svg is missing a numeric viewBox.");
  const minX = Number(viewBox[1]);
  const minY = Number(viewBox[2]);
  const width = Number(viewBox[3]);
  const height = Number(viewBox[4]);
  const rects = [];
  for (const match of source.matchAll(/<rect\b([^>]*)\/?\s*>/gi)) {
    const attributes = Object.create(null);
    for (const attribute of match[1].matchAll(/([\w:-]+)=["']([^"']+)["']/g)) {
      attributes[attribute[1]] = attribute[2];
    }
    rects.push({
      x: Number(attributes.x || 0),
      y: Number(attributes.y || 0),
      width: Number(attributes.width),
      height: Number(attributes.height),
      color: parseColor(attributes.fill),
    });
  }
  if (!rects.length || rects.some((rect) => !Number.isFinite(rect.width) || !Number.isFinite(rect.height))) {
    throw new Error("favicon.svg must contain finite, filled rectangles.");
  }
  return { minX, minY, width, height, rects };
}

const crcTable = new Uint32Array(256);
for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  crcTable[index] = value >>> 0;
}

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) value = crcTable[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data = Buffer.alloc(0)) {
  const name = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])), 0);
  return Buffer.concat([length, name, data, checksum]);
}

function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const scanlines = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const scanlineOffset = y * (width * 4 + 1);
    scanlines[scanlineOffset] = 0;
    rgba.copy(scanlines, scanlineOffset + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    pngChunk("IHDR", header),
    pngChunk("IDAT", zlib.deflateSync(scanlines, { level: 9 })),
    pngChunk("IEND"),
  ]);
}

function rasterize(icon, size) {
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    const sourceY = icon.minY + (y + 0.5) * icon.height / size;
    for (let x = 0; x < size; x += 1) {
      const sourceX = icon.minX + (x + 0.5) * icon.width / size;
      let color = [0, 0, 0, 0];
      for (const rect of icon.rects) {
        if (sourceX >= rect.x && sourceX < rect.x + rect.width && sourceY >= rect.y && sourceY < rect.y + rect.height) {
          color = rect.color;
        }
      }
      const offset = (y * size + x) * 4;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = color[3];
    }
  }
  return encodePng(size, size, pixels);
}

const icon = parseIconSvg(fs.readFileSync(svgPath, "utf8"));
const outputs = [
  [32, "favicon-32.png"],
  [180, "apple-touch-icon.png"],
  [192, "icon-192.png"],
  [512, "icon-512.png"],
];
for (const [size, filename] of outputs) {
  const outputPath = path.join(publicDir, filename);
  const generated = rasterize(icon, size);
  if (checkOnly) {
    if (!fs.existsSync(outputPath) || !fs.readFileSync(outputPath).equals(generated)) {
      throw new Error(`public/${filename} is stale; run npm run assets.`);
    }
    console.log(`verified public/${filename} (${size}x${size})`);
  } else {
    fs.writeFileSync(outputPath, generated);
    console.log(`generated public/${filename} (${size}x${size})`);
  }
}
