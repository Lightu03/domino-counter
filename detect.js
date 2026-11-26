/* Domino tile + pip detector. Pure JS, no dependencies.
 * detect(rgba, w, h, {maxPip, darkTiles}) -> [{a, b, rect:{x0,y0,x1,y1}, pips:[{x,y}]}]
 * Works best with light tiles / dark pips on a darker table (toggle darkTiles for black dominoes).
 */
(function (root) {
  function toGray(rgba, w, h, invert) {
    const g = new Uint8Array(w * h);
    for (let i = 0, j = 0; i < g.length; i++, j += 4) {
      const v = (rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8;
      g[i] = invert ? 255 - v : v;
    }
    return g;
  }

  // Otsu threshold over a rectangle; returns threshold plus the two class means.
  function otsu(g, w, x0, y0, x1, y1) {
    const hist = new Float64Array(256);
    let n = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { hist[g[y * w + x]]++; n++; }
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * hist[i];
    let sumB = 0, wB = 0, best = -1, t = 127, m0 = 0, m1 = 255;
    for (let i = 0; i < 256; i++) {
      wB += hist[i];
      if (!wB) continue;
      const wF = n - wB;
      if (!wF) break;
      sumB += i * hist[i];
      const mB = sumB / wB, mF = (sum - sumB) / wF;
      const between = wB * wF * (mB - mF) * (mB - mF);
      if (between > best) { best = between; t = i; m0 = mB; m1 = mF; }
    }
    return { t, m0, m1 };
  }

  // 4-connected component labelling of a 0/1 mask.
  function label(mask, w, h) {
    const lab = new Int32Array(w * h);
    const comps = [];
    const stack = new Int32Array(w * h);
    for (let start = 0; start < mask.length; start++) {
      if (!mask[start] || lab[start]) continue;
      const id = comps.length + 1;
      const c = { area: 0, minx: w, miny: h, maxx: 0, maxy: 0, sx: 0, sy: 0 };
      let sp = 0;
      stack[sp++] = start;
      lab[start] = id;
      while (sp) {
        const p = stack[--sp];
        const x = p % w, y = (p - x) / w;
        c.area++; c.sx += x; c.sy += y;
        if (x < c.minx) c.minx = x; if (x > c.maxx) c.maxx = x;
        if (y < c.miny) c.miny = y; if (y > c.maxy) c.maxy = y;
        if (x > 0 && mask[p - 1] && !lab[p - 1]) { lab[p - 1] = id; stack[sp++] = p - 1; }
        if (x < w - 1 && mask[p + 1] && !lab[p + 1]) { lab[p + 1] = id; stack[sp++] = p + 1; }
        if (y > 0 && mask[p - w] && !lab[p - w]) { lab[p - w] = id; stack[sp++] = p - w; }
        if (y < h - 1 && mask[p + w] && !lab[p + w]) { lab[p + w] = id; stack[sp++] = p + w; }
      }
      comps.push(c);
    }
    return comps;
  }

  // Square max-filter (dilation) of a mask; closes thin dark divider lines and pips.
  function dilate(mask, w, h, r) {
    if (r < 1) return mask;
    const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      let last = -1e9;
      for (let x = 0; x < w; x++) { if (mask[y * w + x]) last = x; if (x - last <= r) tmp[y * w + x] = 1; }
      last = 1e9;
      for (let x = w - 1; x >= 0; x--) { if (mask[y * w + x]) last = x; if (last - x <= r) tmp[y * w + x] = 1; }
    }
    for (let x = 0; x < w; x++) {
      let last = -1e9;
      for (let y = 0; y < h; y++) { if (tmp[y * w + x]) last = y; if (y - last <= r) out[y * w + x] = 1; }
      last = 1e9;
      for (let y = h - 1; y >= 0; y--) { if (tmp[y * w + x]) last = y; if (last - y <= r) out[y * w + x] = 1; }
    }
    return out;
  }

  function findTileRects(g, w, h) {
    const { t } = otsu(g, w, 0, 0, w - 1, h - 1);
    let mask = new Uint8Array(w * h);
    for (let i = 0; i < mask.length; i++) mask[i] = g[i] > t ? 1 : 0;
    const r = Math.max(1, Math.round(Math.min(w, h) / 160));
    mask = dilate(mask, w, h, r);
    const rects = [];
    for (const c of label(mask, w, h)) {
      const x0 = Math.min(w - 1, c.minx + r), y0 = Math.min(h - 1, c.miny + r);
      const x1 = Math.max(x0, c.maxx - r), y1 = Math.max(y0, c.maxy - r);
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      if (c.area < w * h * 0.003 || bw * bh > w * h * 0.97) continue;
      const L = Math.max(bw, bh), S = Math.min(bw, bh);
      if (S < 10) continue;
      const fill = c.area / ((c.maxx - c.minx + 1) * (c.maxy - c.miny + 1));
      if (fill < 0.6) continue;
      const ratio = L / S;
      const n = Math.max(1, Math.round(ratio / 2));
      if (ratio < 1.5 || Math.abs(ratio / n - 2) > 0.45) continue;
      // a straight chain of touching tiles -> split it evenly
      for (let k = 0; k < n; k++) {
        if (bw >= bh) {
          const step = bw / n;
          rects.push({ x0: Math.round(x0 + k * step), y0, x1: Math.round(x0 + (k + 1) * step) - 1, y1 });
        } else {
          const step = bh / n;
          rects.push({ x0, y0: Math.round(y0 + k * step), x1, y1: Math.round(y0 + (k + 1) * step) - 1 });
        }
      }
    }
    return rects;
  }

  function readTile(g, w, rc, maxPip) {
    const bw = rc.x1 - rc.x0 + 1, bh = rc.y1 - rc.y0 + 1;
    const horiz = bw >= bh;
    const S = Math.min(bw, bh);
    const inset = Math.max(1, Math.round(S * 0.05));
    const x0 = rc.x0 + inset, y0 = rc.y0 + inset, x1 = rc.x1 - inset, y1 = rc.y1 - inset;
    const rw = x1 - x0 + 1, rh = y1 - y0 + 1;
    const res = { a: 0, b: 0, rect: rc, pips: [], horiz };
    if (rw < 6 || rh < 6) return res;
    const { t, m0, m1 } = otsu(g, w, x0, y0, x1, y1);
    if (m1 - m0 < 35) return res; // blank tile (0|0) – no contrast
    const mask = new Uint8Array(rw * rh);
    for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) mask[y * rw + x] = g[(y + y0) * w + x + x0] < t ? 1 : 0;
    const counts = [0, 0];
    for (const c of label(mask, rw, rh)) {
      const d = 2 * Math.sqrt(c.area / Math.PI);
      if (d < S * 0.06 || d > S * 0.33) continue;
      const cw = c.maxx - c.minx + 1, ch = c.maxy - c.miny + 1;
      const asp = cw / ch;
      if (asp < 0.5 || asp > 2) continue;
      if (c.area / (cw * ch) < 0.45) continue;
      if (c.minx === 0 || c.miny === 0 || c.maxx === rw - 1 || c.maxy === rh - 1) continue; // edge shadow
      const cx = c.sx / c.area + x0, cy = c.sy / c.area + y0;
      const along = horiz ? (cx - rc.x0) / bw : (cy - rc.y0) / bh;
      if (Math.abs(along - 0.5) < 0.05) continue; // centre brad / spinner pin
      counts[along < 0.5 ? 0 : 1]++;
      res.pips.push({ x: cx, y: cy });
    }
    res.a = Math.min(maxPip, counts[0]);
    res.b = Math.min(maxPip, counts[1]);
    return res;
  }

  function detect(rgba, w, h, opt) {
    opt = opt || {};
    const maxPip = opt.maxPip == null ? 6 : opt.maxPip;
    const g = toGray(rgba, w, h, !!opt.darkTiles);
    let rects = findTileRects(g, w, h);
    let fallback = false;
    if (!rects.length) { rects = [{ x0: 0, y0: 0, x1: w - 1, y1: h - 1 }]; fallback = true; }
    const tiles = rects.map(rc => readTile(g, w, rc, maxPip));
    tiles.fallback = fallback;
    return tiles;
  }

  const api = { detect, toGray, otsu, label };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DominoDetect = api;
})(this);
