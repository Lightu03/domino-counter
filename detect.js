/* Domino tile + pip detector (v2). Pure JS, no dependencies.
 * detect(rgba, w, h, {maxPip, darkTiles, fallback}) ->
 *   [{a, b, ok, corners:[[x,y]x4], pips:[{x,y}]}]   (tiles.fallback = true when the whole image was read as one tile)
 * - finds tiles at any rotation (principal-axis fit), splits straight chains of touching tiles
 * - thresholds pips per tile against that tile's own white level (handles uneven light)
 * - keeps only round blobs of a consistent size, fully inside the tile (ignores shadows, divider, centre pin)
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

  function otsu(g) {
    const hist = new Float64Array(256);
    for (let i = 0; i < g.length; i++) hist[g[i]]++;
    const n = g.length;
    let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
    let sumB = 0, wB = 0, best = -1, t = 127;
    for (let i = 0; i < 256; i++) {
      wB += hist[i]; if (!wB) continue;
      const wF = n - wB; if (!wF) break;
      sumB += i * hist[i];
      const d = sumB / wB - (sum - sumB) / wF;
      const between = wB * wF * d * d;
      if (between > best) { best = between; t = i; }
    }
    return t;
  }

  // 4-connected labelling. Returns {lab, comps}; comps[id-1] has area + bbox.
  function label(mask, w, h) {
    const lab = new Int32Array(w * h), comps = [], stack = new Int32Array(w * h);
    for (let s = 0; s < mask.length; s++) {
      if (!mask[s] || lab[s]) continue;
      const id = comps.length + 1, c = { id, area: 0, minx: w, miny: h, maxx: 0, maxy: 0, sx: 0, sy: 0 };
      let sp = 0; stack[sp++] = s; lab[s] = id;
      while (sp) {
        const p = stack[--sp], x = p % w, y = (p - x) / w;
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
    return { lab, comps };
  }

  function dilate(mask, w, h, r) {
    const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      const o = y * w; let last = -1e9;
      for (let x = 0; x < w; x++) { if (mask[o + x]) last = x; if (x - last <= r) tmp[o + x] = 1; }
      last = 1e9;
      for (let x = w - 1; x >= 0; x--) { if (mask[o + x]) last = x; if (last - x <= r) tmp[o + x] = 1; }
    }
    for (let x = 0; x < w; x++) {
      let last = -1e9;
      for (let y = 0; y < h; y++) { if (tmp[y * w + x]) last = y; if (y - last <= r) out[y * w + x] = 1; }
      last = 1e9;
      for (let y = h - 1; y >= 0; y--) { if (tmp[y * w + x]) last = y; if (last - y <= r) out[y * w + x] = 1; }
    }
    return out;
  }

  // Fit an oriented rectangle to each bright blob; keep the ones shaped like 1..n tiles in a row.
  function findTiles(g, w, h) {
    const t = otsu(g);
    const light = new Uint8Array(w * h);
    for (let i = 0; i < light.length; i++) light[i] = g[i] > t ? 1 : 0;
    const r = Math.max(1, Math.round(Math.min(w, h) / 220));
    const { lab, comps } = label(dilate(light, w, h, r), w, h);
    const geos = [];
    for (const c of comps) {
      const bw = c.maxx - c.minx + 1, bh = c.maxy - c.miny + 1;
      if (c.area < w * h * 0.0015 || bw * bh > w * h * 0.9) continue;
      const mx = c.sx / c.area, my = c.sy / c.area;
      let xx = 0, yy = 0, xy = 0;
      for (let y = c.miny; y <= c.maxy; y++) for (let x = c.minx; x <= c.maxx; x++) {
        if (lab[y * w + x] !== c.id) continue;
        const dx = x - mx, dy = y - my; xx += dx * dx; yy += dy * dy; xy += dx * dy;
      }
      const th = 0.5 * Math.atan2(2 * xy, xx - yy);
      const ux = Math.cos(th), uy = Math.sin(th), vx = -uy, vy = ux;
      let t0 = 1e9, t1 = -1e9, s0 = 1e9, s1 = -1e9;
      for (let y = c.miny; y <= c.maxy; y++) for (let x = c.minx; x <= c.maxx; x++) {
        if (lab[y * w + x] !== c.id) continue;
        const dx = x - mx, dy = y - my, pt = dx * ux + dy * uy, ps = dx * vx + dy * vy;
        if (pt < t0) t0 = pt; if (pt > t1) t1 = pt; if (ps < s0) s0 = ps; if (ps > s1) s1 = ps;
      }
      const fill = c.area / ((t1 - t0 + 1) * (s1 - s0 + 1));
      if (fill < 0.72) continue;                      // not a solid rectangle
      const L = t1 - t0 + 1 - 2 * r, W = s1 - s0 + 1 - 2 * r;
      if (W < 12) continue;
      const ratio = L / W, n = Math.max(1, Math.round(ratio / 2));
      if (ratio < 1.55 || Math.abs(ratio / n - 2) > 0.4) continue;
      const tc = (t0 + t1) / 2, sc = (s0 + s1) / 2;
      geos.push({ cx: mx + tc * ux + sc * vx, cy: my + tc * uy + sc * vy, ux, uy, L, W, n });
    }
    return geos;
  }

  function readGeo(g, w, h, geo, maxPip) {
    const { cx, cy, ux, uy, L, W, n } = geo, vx = -uy, vy = ux;
    const hl = L / 2, hw = W / 2;
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [cx + a * hl * ux + b * hw * vx, cy + a * hl * uy + b * hw * vy]);
    const x0 = Math.max(0, Math.floor(Math.min(...corners.map(p => p[0])))), x1 = Math.min(w - 1, Math.ceil(Math.max(...corners.map(p => p[0]))));
    const y0 = Math.max(0, Math.floor(Math.min(...corners.map(p => p[1])))), y1 = Math.min(h - 1, Math.ceil(Math.max(...corners.map(p => p[1]))));
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    const mT = hl - W * 0.04, mS = hw - W * 0.05;   // shrink a little: ignore the tile's rim
    const inR = new Uint8Array(bw * bh), hist = new Uint32Array(256);
    let cnt = 0;
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      const dx = x + x0 - cx, dy = y + y0 - cy;
      if (Math.abs(dx * ux + dy * uy) <= mT && Math.abs(dx * vx + dy * vy) <= mS) { inR[y * bw + x] = 1; hist[g[(y + y0) * w + x + x0]]++; cnt++; }
    }
    const pct = q => { let acc = 0; for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= q * cnt) return i; } return 255; };
    const white = pct(0.7), dark = pct(0.01);
    const segs = Array.from({ length: n }, () => [0, 0]);
    const tiles = segs.map((_, k) => ({ k, pips: [] }));
    if (cnt && white - dark >= 45) {
      const thr = dark + (white - dark) * 0.5;
      const cand = new Uint8Array(bw * bh);
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) { const i = y * bw + x; cand[i] = inR[i] && g[(y + y0) * w + x + x0] < thr ? 1 : 0; }
      const { lab, comps } = label(cand, bw, bh);
      const edge = new Uint8Array(comps.length + 1);
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
        const i = y * bw + x, id = lab[i]; if (!id) continue;
        if (x === 0 || y === 0 || x === bw - 1 || y === bh - 1 || !inR[i - 1] || !inR[i + 1] || !inR[i - bw] || !inR[i + bw]) edge[id] = 1;
      }
      let blobs = [];
      for (const c of comps) {
        if (edge[c.id]) continue;                                    // touches the rim -> shadow / edge
        const d = 2 * Math.sqrt(c.area / Math.PI);
        if (d < W * 0.06 || d > W * 0.3 || c.area < 4) continue;
        const cw = c.maxx - c.minx + 1, ch = c.maxy - c.miny + 1;
        if (cw / ch < 0.5 || cw / ch > 2 || c.area / (cw * ch) < 0.5) continue; // not round (divider, scratches)
        blobs.push({ area: c.area, x: c.sx / c.area + x0, y: c.sy / c.area + y0 });
      }
      if (blobs.length > 2) {                                        // pips on one set are all the same size
        const med = blobs.map(b => b.area).sort((p, q) => p - q)[blobs.length >> 1];
        blobs = blobs.filter(b => b.area > med * 0.4 && b.area < med * 2.5);
      }
      const segL = L / n;
      for (const b of blobs) {
        const pos = (b.x - cx) * ux + (b.y - cy) * uy + hl;
        const k = Math.min(n - 1, Math.max(0, Math.floor(pos / segL)));
        const within = pos - k * segL;
        if (Math.abs(within - segL / 2) < segL * 0.05) continue;      // centre pin / spinner
        segs[k][within < segL / 2 ? 0 : 1]++;
        tiles[k].pips.push({ x: b.x, y: b.y });
      }
    }
    return tiles.map(({ k, pips }) => {
      const a0 = -hl + k * L / n, a1 = a0 + L / n;
      const cs = [[a0, -hw], [a1, -hw], [a1, hw], [a0, hw]].map(([p, q]) => [cx + p * ux + q * vx, cy + p * uy + q * vy]);
      const [a, b] = segs[k];
      return { a, b, ok: a <= maxPip && b <= maxPip, corners: cs, pips };
    });
  }

  function detect(rgba, w, h, opt) {
    opt = opt || {};
    const maxPip = opt.maxPip == null ? 6 : opt.maxPip;
    const g = toGray(rgba, w, h, !!opt.darkTiles);
    let geos = findTiles(g, w, h), fallback = false;
    if (!geos.length && opt.fallback) {
      const horiz = w >= h;
      geos = [{ cx: w / 2, cy: h / 2, ux: horiz ? 1 : 0, uy: horiz ? 0 : 1, L: Math.max(w, h), W: Math.min(w, h), n: 1 }];
      fallback = true;
    }
    const tiles = [];
    for (const geo of geos) tiles.push(...readGeo(g, w, h, geo, maxPip));
    tiles.fallback = fallback;
    return tiles;
  }

  const api = { detect };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DominoDetect = api;
})(this);
