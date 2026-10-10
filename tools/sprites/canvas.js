// Distributed under the NetHack General Public License.
// Pixel Canvas supporting primitives, outline generation, compositing, scaling, and tinting

const { OUTLINE } = require('./palette');
const { renderText, getTextWidth } = require('./font');

class Canvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = Buffer.alloc(width * height * 4); // all 0 = transparent RGBA
  }

  setPixel(x, y, color) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const idx = (y * this.width + x) * 4;
    const a = color[3] !== undefined ? color[3] : 255;
    if (a === 0) {
      this.data[idx] = 0;
      this.data[idx + 1] = 0;
      this.data[idx + 2] = 0;
      this.data[idx + 3] = 0;
      return;
    }
    this.data[idx] = color[0];
    this.data[idx + 1] = color[1];
    this.data[idx + 2] = color[2];
    this.data[idx + 3] = a;
  }

  getPixel(x, y) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return [0, 0, 0, 0];
    const idx = (y * this.width + x) * 4;
    return [
      this.data[idx],
      this.data[idx + 1],
      this.data[idx + 2],
      this.data[idx + 3]
    ];
  }

  fillRect(rx, ry, rw, rh, color) {
    rx = Math.round(rx);
    ry = Math.round(ry);
    rw = Math.round(rw);
    rh = Math.round(rh);
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        this.setPixel(x, y, color);
      }
    }
  }

  fillCircle(cx, cy, r, color) {
    cx = Math.round(cx);
    cy = Math.round(cy);
    r = Math.round(r);
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r * r) {
          this.setPixel(x, y, color);
        }
      }
    }
  }

  fillEllipse(cx, cy, rx, ry, color) {
    cx = Math.round(cx);
    cy = Math.round(cy);
    rx = Math.round(rx);
    ry = Math.round(ry);
    for (let y = cy - ry; y <= cy + ry; y++) {
      for (let x = cx - rx; x <= cx + rx; x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1.0) {
          this.setPixel(x, y, color);
        }
      }
    }
  }

  drawLine(x0, y0, x1, y1, color) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = (x0 < x1) ? 1 : -1;
    const sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;

    while (true) {
      this.setPixel(x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }

  // Draw polygon with scanline fill
  fillPolygon(points, color) {
    if (points.length < 3) return;
    let minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.y < minY) minY = Math.round(p.y);
      if (p.y > maxY) maxY = Math.round(p.y);
    }
    minY = Math.max(0, minY);
    maxY = Math.min(this.height - 1, maxY);

    for (let y = minY; y <= maxY; y++) {
      const intersections = [];
      for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        const p1 = points[i];
        const p2 = points[j];
        if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
          const x = p1.x + (y - p1.y) * (p2.x - p1.x) / (p2.y - p1.y);
          intersections.push(Math.round(x));
        }
      }
      intersections.sort((a, b) => a - b);
      for (let k = 0; k < intersections.length; k += 2) {
        if (k + 1 < intersections.length) {
          const xStart = Math.max(0, intersections[k]);
          const xEnd = Math.min(this.width - 1, intersections[k + 1]);
          for (let x = xStart; x <= xEnd; x++) {
            this.setPixel(x, y, color);
          }
        }
      }
    }
  }

  // Copy another canvas onto this one at dx, dy (with alpha compositing)
  blit(src, dx = 0, dy = 0) {
    for (let y = 0; y < src.height; y++) {
      const dstY = dy + y;
      if (dstY < 0 || dstY >= this.height) continue;
      for (let x = 0; x < src.width; x++) {
        const dstX = dx + x;
        if (dstX < 0 || dstX >= this.width) continue;
        const sColor = src.getPixel(x, y);
        const sa = sColor[3];
        if (sa === 0) continue;

        if (sa === 255) {
          this.setPixel(dstX, dstY, sColor);
        } else {
          const dColor = this.getPixel(dstX, dstY);
          const da = dColor[3];
          const outA = sa + (da * (255 - sa)) / 255;
          if (outA > 0) {
            const outR = Math.round((sColor[0] * sa + dColor[0] * da * (255 - sa) / 255) / outA);
            const outG = Math.round((sColor[1] * sa + dColor[1] * da * (255 - sa) / 255) / outA);
            const outB = Math.round((sColor[2] * sa + dColor[2] * da * (255 - sa) / 255) / outA);
            this.setPixel(dstX, dstY, [outR, outG, outB, Math.round(outA)]);
          }
        }
      }
    }
  }

  // Draw 4-neighbour pixel outline around all solid pixels
  addOutline(outlineColor = OUTLINE) {
    const copy = Buffer.from(this.data);
    const getCopyAlpha = (x, y) => {
      if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
      return copy[(y * this.width + x) * 4 + 3];
    };

    const offsets = [
      [-1, 0], [1, 0], [0, -1], [0, 1]
    ];

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const a = copy[(y * this.width + x) * 4 + 3];
        if (a === 0) {
          // Check if any neighbor is opaque
          for (const [ox, oy] of offsets) {
            if (getCopyAlpha(x + ox, y + oy) > 0) {
              this.setPixel(x, y, outlineColor);
              break;
            }
          }
        }
      }
    }
  }

  // Scale nearest neighbour by integer factor
  scaleNearest(factor) {
    const dst = new Canvas(this.width * factor, this.height * factor);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const color = this.getPixel(x, y);
        if (color[3] === 0) continue;
        for (let dy = 0; dy < factor; dy++) {
          for (let dx = 0; dx < factor; dx++) {
            dst.setPixel(x * factor + dx, y * factor + dy, color);
          }
        }
      }
    }
    return dst;
  }

  // Clone this canvas
  clone() {
    const c = new Canvas(this.width, this.height);
    this.data.copy(c.data);
    return c;
  }

  // Tint neutral grays to a target color palette (for cape alignment)
  tintGrays(targetPalette) {
    // targetPalette: { hi, mid, shadow, deep }
    const res = this.clone();
    for (let y = 0; y < res.height; y++) {
      for (let x = 0; x < res.width; x++) {
        const [r, g, b, a] = res.getPixel(x, y);
        if (a === 0) continue;

        // Skip exact outline color #1a1414
        if (r === OUTLINE[0] && g === OUTLINE[1] && b === OUTLINE[2]) continue;

        // If it's a neutral gray (r ≈ g ≈ b)
        if (Math.abs(r - g) <= 8 && Math.abs(g - b) <= 8) {
          const lum = (r + g + b) / 3;
          let newColor;
          if (lum >= 200) {
            newColor = targetPalette.hi;
          } else if (lum >= 140) {
            newColor = targetPalette.mid;
          } else if (lum >= 80) {
            newColor = targetPalette.shadow;
          } else {
            newColor = targetPalette.deep;
          }
          res.setPixel(x, y, newColor);
        }
      }
    }
    return res;
  }

  drawText(text, x, y, color = [255, 255, 255, 255], scale = 1, shadowColor = [0, 0, 0, 255]) {
    renderText(this, text, x, y, color, scale, shadowColor);
  }
}

module.exports = Canvas;
