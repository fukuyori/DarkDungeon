// Distributed under the NetHack General Public License.
// Pure Node.js GIF89a encoder supporting animations and transparency

function encodeGIF(width, height, frames, delayCentis = 16) {
  // frames is array of { data: Buffer (width*height palette indices), palette: [[r,g,b],...], transparentIndex: number|null }
  const out = [];

  // Header: GIF89a
  out.push(Buffer.from('GIF89a', 'ascii'));

  // Logical Screen Descriptor
  const lsd = Buffer.alloc(7);
  lsd.writeUInt16LE(width, 0);
  lsd.writeUInt16LE(height, 2);
  lsd[4] = 0x70; // No Global Color Table, 8 bits/pixel color resolution
  lsd[5] = 0;    // Background color index
  lsd[6] = 0;    // Pixel aspect ratio
  out.push(lsd);

  // Netscape 2.0 application extension for looping infinitely
  out.push(Buffer.from([0x21, 0xFF, 0x0B]));
  out.push(Buffer.from('NETSCAPE2.0', 'ascii'));
  out.push(Buffer.from([0x03, 0x01, 0x00, 0x00, 0x00])); // Loop count: 0 = forever

  for (const frame of frames) {
    const { data, palette, transparentIndex } = frame;

    // Calculate required Local Color Table size (power of 2, between 4 and 256)
    let palSize = 2;
    while (palSize < palette.length && palSize < 256) palSize *= 2;
    if (palSize < 4) palSize = 4;
    let sizeBits = 0;
    while ((1 << (sizeBits + 1)) < palSize) sizeBits++;

    // Graphic Control Extension (GCE)
    const gce = Buffer.alloc(8);
    gce[0] = 0x21; // Extension Introducer
    gce[1] = 0xF9; // Graphic Control Label
    gce[2] = 0x04; // Block Size
    const hasTrans = (transparentIndex !== null && transparentIndex !== undefined && transparentIndex >= 0);
    // Disposal method: 2 = Restore to background color
    gce[3] = (2 << 2) | (hasTrans ? 1 : 0);
    gce.writeUInt16LE(delayCentis, 4);
    gce[6] = hasTrans ? transparentIndex : 0;
    gce[7] = 0x00; // Block Terminator
    out.push(gce);

    // Image Descriptor
    const id = Buffer.alloc(10);
    id[0] = 0x2C; // Image Separator
    id.writeUInt16LE(0, 1); // Left
    id.writeUInt16LE(0, 3); // Top
    id.writeUInt16LE(width, 5); // Width
    id.writeUInt16LE(height, 7); // Height
    id[9] = 0x80 | sizeBits; // Local Color Table Present, sizeBits
    out.push(id);

    // Local Color Table
    const lct = Buffer.alloc(palSize * 3);
    for (let i = 0; i < palSize; i++) {
      if (i < palette.length) {
        lct[i * 3 + 0] = palette[i][0];
        lct[i * 3 + 1] = palette[i][1];
        lct[i * 3 + 2] = palette[i][2];
      }
    }
    out.push(lct);

    // LZW Compression
    const minCodeSize = Math.max(2, sizeBits + 1);
    out.push(Buffer.from([minCodeSize]));

    let curBit = 0;
    let curByte = 0;
    const subBlock = [];
    const subBlocks = [];

    function writeBits(val, numBits) {
      curByte |= (val << curBit);
      curBit += numBits;
      while (curBit >= 8) {
        subBlock.push(curByte & 0xFF);
        if (subBlock.length === 254) {
          subBlocks.push(Buffer.from([subBlock.length, ...subBlock]));
          subBlock.length = 0;
        }
        curByte >>= 8;
        curBit -= 8;
      }
    }

    function flushBits() {
      if (curBit > 0) {
        subBlock.push(curByte & 0xFF);
        curByte = 0;
        curBit = 0;
      }
      if (subBlock.length > 0) {
        subBlocks.push(Buffer.from([subBlock.length, ...subBlock]));
        subBlock.length = 0;
      }
    }

    const clearCode = 1 << minCodeSize;
    const eoiCode = clearCode + 1;
    let codeSize = minCodeSize + 1;
    let nextCode = clearCode + 2;
    let dict = new Map();

    writeBits(clearCode, codeSize);

    let prefix = data[0];
    for (let i = 1; i < data.length; i++) {
      const c = data[i];
      const key = (prefix << 16) | c;
      if (dict.has(key)) {
        prefix = dict.get(key);
      } else {
        writeBits(prefix, codeSize);
        if (nextCode < 4096) {
          dict.set(key, nextCode++);
          if (nextCode > (1 << codeSize) && codeSize < 12) {
            codeSize++;
          }
        } else {
          writeBits(clearCode, codeSize);
          dict.clear();
          codeSize = minCodeSize + 1;
          nextCode = clearCode + 2;
        }
        prefix = c;
      }
    }
    writeBits(prefix, codeSize);
    writeBits(eoiCode, codeSize);
    flushBits();

    for (const sb of subBlocks) {
      out.push(sb);
    }
    out.push(Buffer.from([0x00])); // Block Terminator
  }

  out.push(Buffer.from([0x3B])); // Trailer
  return Buffer.concat(out);
}

// Convert an RGBA Buffer to palette indices and color table
function quantizeRGBA(width, height, rgbaBuffer, maxColors = 255) {
  const colorMap = new Map();
  const palette = [];
  let transparentIndex = null;

  // Reserve index 0 for transparent if any transparent pixels exist
  let hasTrans = false;
  for (let i = 3; i < rgbaBuffer.length; i += 4) {
    if (rgbaBuffer[i] < 128) {
      hasTrans = true;
      break;
    }
  }

  if (hasTrans) {
    transparentIndex = 0;
    palette.push([0, 0, 0]); // transparent placeholder
  }

  const indices = Buffer.alloc(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const r = rgbaBuffer[offset];
      const g = rgbaBuffer[offset + 1];
      const b = rgbaBuffer[offset + 2];
      const a = rgbaBuffer[offset + 3];

      if (a < 128) {
        indices[y * width + x] = transparentIndex;
        continue;
      }

      const key = `${r},${g},${b}`;
      let idx;
      if (colorMap.has(key)) {
        idx = colorMap.get(key);
      } else {
        if (palette.length < maxColors) {
          idx = palette.length;
          palette.push([r, g, b]);
          colorMap.set(key, idx);
        } else {
          // Find closest color in palette
          let minDist = Infinity;
          idx = hasTrans ? 1 : 0;
          for (let p = (hasTrans ? 1 : 0); p < palette.length; p++) {
            const dr = r - palette[p][0];
            const dg = g - palette[p][1];
            const db = b - palette[p][2];
            const dist = dr * dr + dg * dg + db * db;
            if (dist < minDist) {
              minDist = dist;
              idx = p;
            }
          }
        }
      }
      indices[y * width + x] = idx;
    }
  }

  return { data: indices, palette, transparentIndex };
}

module.exports = { encodeGIF, quantizeRGBA };
