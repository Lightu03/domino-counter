/* Domino tile + pip detector (v3). Pure JS, no dependencies.
 * detect(rgba, w, h, {maxPip}) -> [{a, b, ok, corners:[[x,y]x4], pips:[{x,y}]}]
 *
 * Colour-based, so it works for any tile colour (white, black, grey) and any pip colour:
 *  - tiles  = evenly coloured blobs shaped like a 1x2 rectangle (any angle), found on several masks:
 *             brightness cuts (both polarities) and "close to one of the image's main colours"
 *  - touching tiles (T / L shapes on a board) are split by fitting tile-sized rectangles
 *  - pips   = round spots whose colour clearly differs from that tile's own face colour,
 *             all about the same size, fully inside the tile
 *  - a tile only counts if its divider line is visible (rejects face-down tiles, panels, buttons)
 */
(function (root) {
  function lum(rgba, n) {
    const g = new Uint8Array(n);
    for (let i = 0, j = 0; i < n; i++, j += 4) g[i] = (rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8;
    return g;
  }

  function otsu(g) {
    const hist = new Float64Array(256);
    for (let i = 0; i < g.length; i++) hist[g[i]]++;
    const n = g.length;
    let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
    let sumB = 0, wB = 0, best = -1, t = 127, m0 = 0, m1 = 255;
    for (let i = 0; i < 256; i++) {
      wB += hist[i]; if (!wB) continue;
      const wF = n - wB; if (!wF) break;
      sumB += i * hist[i];
      const mb = sumB / wB, mf = (sum - sumB) / wF, d = mb - mf, between = wB * wF * d * d;
      if (between > best) { best = between; t = i; m0 = mb; m1 = mf; }
    }
    return { t, m0, m1 };
  }

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

  // fill enclosed holes (pips, divider) so a tile becomes one solid blob
  function fillHoles(mask, w, h) {
    const out = mask.slice(), seen = new Uint8Array(w * h), stack = new Int32Array(w * h);
    let sp = 0;
    const push = p => { if (!mask[p] && !seen[p]) { seen[p] = 1; stack[sp++] = p; } };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (sp) {
      const p = stack[--sp], x = p % w;
      if (x > 0) push(p - 1); if (x < w - 1) push(p + 1);
      if (p >= w) push(p - w); if (p < w * (h - 1)) push(p + w);
    }
    for (let i = 0; i < out.length; i++) if (!mask[i] && !seen[i]) out[i] = 1;
    return out;
  }

  // the image's main colours (coarse histogram peaks)
  function palette(rgba, n, max) {
    const cnt = new Uint32Array(512), sr = new Float64Array(512), sg = new Float64Array(512), sb = new Float64Array(512);
    for (let i = 0, j = 0; i < n; i++, j += 4) {
      const k = (rgba[j] >> 5) << 6 | (rgba[j + 1] >> 5) << 3 | rgba[j + 2] >> 5;
      cnt[k]++; sr[k] += rgba[j]; sg[k] += rgba[j + 1]; sb[k] += rgba[j + 2];
    }
    const ks = [];
    for (let k = 0; k < 512; k++) if (cnt[k] > n * 0.002) ks.push(k);
    ks.sort((a, b) => cnt[b] - cnt[a]);
    return ks.slice(0, max).map(k => [sr[k] / cnt[k], sg[k] / cnt[k], sb[k] / cnt[k]]);
  }

  // oriented rectangle fit of one component; returns geo or null
  function rectFit(lab, c, w, r) {
    const mx = c.sx / c.area, my = c.sy / c.area;
    let xx = 0, yy = 0, xy = 0;
    for (let y = c.miny; y <= c.maxy; y++) for (let x = c.minx; x <= c.maxx; x++) {
      if (lab[y * w + x] !== c.id) continue;
      const dx = x - mx, dy = y - my; xx += dx * dx; yy += dy * dy; xy += dx * dy;
    }
    const th = 0.5 * Math.atan2(2 * xy, xx - yy), ux = Math.cos(th), uy = Math.sin(th), vx = -uy, vy = ux;
    let t0 = 1e9, t1 = -1e9, s0 = 1e9, s1 = -1e9;
    for (let y = c.miny; y <= c.maxy; y++) for (let x = c.minx; x <= c.maxx; x++) {
      if (lab[y * w + x] !== c.id) continue;
      const dx = x - mx, dy = y - my, pt = dx * ux + dy * uy, ps = dx * vx + dy * vy;
      if (pt < t0) t0 = pt; if (pt > t1) t1 = pt; if (ps < s0) s0 = ps; if (ps > s1) s1 = ps;
    }
    const fill = c.area / ((t1 - t0 + 1) * (s1 - s0 + 1));
    const L = t1 - t0 + 1 - 2 * r, W = s1 - s0 + 1 - 2 * r;
    if (fill < 0.75 || W < 10) return null;
    const ratio = L / W, n = Math.max(1, Math.round(ratio / 2));
    if (ratio < 1.6 || Math.abs(ratio / n - 2) > 0.35) return null;
    const tc = (t0 + t1) / 2, sc = (s0 + s1) / 2;
    return { cx: mx + tc * ux + sc * vx, cy: my + tc * uy + sc * vy, ux, uy, L, W, n, q: fill - Math.abs(ratio / n - 2) * 0.5 };
  }

  // split a blob of touching, axis-aligned tiles (e.g. a double laid across a line) into tiles
  function decompose(lab, c, w) {
    const P = 3, bw = c.maxx - c.minx + 1, bh = c.maxy - c.miny + 1, LW = bw + 2 * P, LH = bh + 2 * P;
    const M = new Uint8Array(LW * LH);
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) if (lab[(y + c.miny) * w + x + c.minx] === c.id) M[(y + P) * LW + x + P] = 1;
    // city-block distance transform -> tile width
    const D = new Int32Array(LW * LH);
    for (let i = 0; i < D.length; i++) D[i] = M[i] ? 1e6 : 0;
    for (let y = 1; y < LH; y++) for (let x = 1; x < LW; x++) { const i = y * LW + x; if (D[i]) D[i] = Math.min(D[i], D[i - 1] + 1, D[i - LW] + 1); }
    let maxD = 0;
    for (let y = LH - 2; y >= 0; y--) for (let x = LW - 2; x >= 0; x--) { const i = y * LW + x; if (D[i]) { D[i] = Math.min(D[i], D[i + 1] + 1, D[i + LW] + 1); if (D[i] > maxD) maxD = D[i]; } }
    const W = 2 * maxD - 1, Lt = 2 * W;
    if (W < 10 || c.area < 1.5 * W * Lt) return [];
    const out = [];
    const II = new Int32Array((LW + 1) * (LH + 1));
    const RP = new Int32Array(LH * (LW + 1)), CP = new Int32Array(LW * (LH + 1));
    for (let iter = 0; iter < 16; iter++) {
      for (let y = 0; y < LH; y++) { let run = 0; for (let x = 0; x < LW; x++) { run += M[y * LW + x]; II[(y + 1) * (LW + 1) + x + 1] = II[y * (LW + 1) + x + 1] + run; } }
      const N = dilate(M.map(v => 1 - v), LW, LH, 2);                 // "near the outside", 2px slop
      for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) RP[y * (LW + 1) + x + 1] = RP[y * (LW + 1) + x] + N[y * LW + x];
      for (let x = 0; x < LW; x++) for (let y = 0; y < LH; y++) CP[x * (LH + 1) + y + 1] = CP[x * (LH + 1) + y] + N[y * LW + x];
      const sum = (x0, y0, x1, y1) => II[(y1 + 1) * (LW + 1) + x1 + 1] - II[y0 * (LW + 1) + x1 + 1] - II[(y1 + 1) * (LW + 1) + x0] + II[y0 * (LW + 1) + x0];
      const row = (y, x0, x1) => (RP[y * (LW + 1) + x1 + 1] - RP[y * (LW + 1) + x0]) / (x1 - x0 + 1);
      const col = (x, y0, y1) => (CP[x * (LH + 1) + y1 + 1] - CP[x * (LH + 1) + y0]) / (y1 - y0 + 1);
      let best = null;
      for (const vert of [false, true]) {
        const rw = vert ? W : Lt, rh = vert ? Lt : W, cm = Math.round(W * 0.15), sx = Math.round(rw * 0.15), sy = Math.round(rh * 0.15);
        for (let y = 1; y + rh < LH; y++) for (let x = 1; x + rw < LW; x++) {
          if (sum(x + cm, y + cm, x + rw - 1 - cm, y + rh - 1 - cm) !== (rw - 2 * cm) * (rh - 2 * cm)) continue;
          if (sum(x, y, x + rw - 1, y + rh - 1) < rw * rh * 0.92) continue;
          const score = (row(y - 1, x + sx, x + rw - 1 - sx) + row(y + rh, x + sx, x + rw - 1 - sx) + col(x - 1, y + sy, y + rh - 1 - sy) + col(x + rw, y + sy, y + rh - 1 - sy)) / 4;
          if (!best || score > best.score) best = { x, y, rw, rh, vert, score };
        }
      }
      if (!best || best.score < 0.6) break;
      out.push({ cx: c.minx - P + best.x + best.rw / 2 - 0.5, cy: c.miny - P + best.y + best.rh / 2 - 0.5,
                 ux: best.vert ? 0 : 1, uy: best.vert ? 1 : 0, L: Lt, W, n: 1, q: best.score * 0.9 });
      for (let y = best.y; y < best.y + best.rh; y++) for (let x = best.x; x < best.x + best.rw; x++) M[y * LW + x] = 0;
      let left = 0; for (let i = 0; i < M.length; i++) left += M[i];
      if (left < W * Lt * 0.5) break;
    }
    return out;
  }

  function fromMask(mask, w, h, out) {
    const r = 0, m = fillHoles(mask, w, h);
    const { lab, comps } = label(m, w, h);
    for (const c of comps) {
      if (c.area < 200 || c.area > w * h * 0.25) continue;
      const geo = rectFit(lab, c, w, r);
      if (geo) out.push(geo);
      else if (c.area > 600) out.push(...decompose(lab, c, w));
    }
  }

  function findTiles(rgba, w, h, screen) {
    const n = w * h, g = lum(rgba, n), o = otsu(g), cands = [];
    // screen captures have flat colours: the palette masks do the work, one brightness cut is enough
    const thrs = screen ? [o.t] : [o.t, o.t + (o.m1 - o.t) * 0.4, o.t + (o.m1 - o.t) * 0.75, o.t - (o.t - o.m0) * 0.4, o.t - (o.t - o.m0) * 0.75];
    for (const t of thrs) {
      const hi = new Uint8Array(n), lo = new Uint8Array(n);
      for (let i = 0; i < n; i++) { hi[i] = g[i] > t ? 1 : 0; lo[i] = 1 - hi[i]; }
      fromMask(hi, w, h, cands); fromMask(lo, w, h, cands);
    }
    for (const col of palette(rgba, n, 8)) {
      const m = new Uint8Array(n), tol2 = 32 * 32;
      for (let i = 0, j = 0; i < n; i++, j += 4) { const dr = rgba[j] - col[0], dg = rgba[j + 1] - col[1], db = rgba[j + 2] - col[2]; m[i] = dr * dr + dg * dg + db * db < tol2 ? 1 : 0; }
      fromMask(m, w, h, cands);
    }
    cands.sort((p, q) => q.q - p.q);
    const keep = [];
    for (const c of cands) {
      if (keep.some(k => Math.hypot(k.cx - c.cx, k.cy - c.cy) < Math.min(k.L / k.n, c.L / c.n) * 0.45)) continue;
      keep.push(c);
    }
    return keep;
  }

  const LAY = { 0: [], 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]],
    5: [[0, 0], [2, 0], [0, 2], [2, 2], [1, 1]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]], 7: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2], [1, 1]],
    8: [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]], 9: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]] };
  const PATTERNS = {};
  for (const n in LAY) {
    const set = new Set();
    for (const f of [p => p, ([x, y]) => [y, x], ([x, y]) => [2 - x, y], ([x, y]) => [x, 2 - y], ([x, y]) => [2 - y, x], ([x, y]) => [y, 2 - x], ([x, y]) => [2 - x, 2 - y], ([x, y]) => [2 - y, 2 - x]])
      set.add(LAY[n].map(f).map(([x, y]) => y * 3 + x).sort((a, b) => a - b).join(','));
    PATTERNS[n] = set;
  }

  function median(arr) { arr.sort((a, b) => a - b); return arr[arr.length >> 1] || 0; }

  function readGeo(rgba, w, h, geo, maxPip) {
    const { cx, cy, ux, uy, L, W, n } = geo, vx = -uy, vy = ux, hl = L / 2, hw = W / 2;
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [cx + a * hl * ux + b * hw * vx, cy + a * hl * uy + b * hw * vy]);
    const x0 = Math.max(0, Math.floor(Math.min(...corners.map(p => p[0])))), x1 = Math.min(w - 1, Math.ceil(Math.max(...corners.map(p => p[0]))));
    const y0 = Math.max(0, Math.floor(Math.min(...corners.map(p => p[1])))), y1 = Math.min(h - 1, Math.ceil(Math.max(...corners.map(p => p[1]))));
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    // thin rim only: some games put pips very close to the long edges of small tiles
    const mT = hl - Math.max(1, W * 0.03), mS = hw - Math.max(1, W * 0.035);
    const inR = new Uint8Array(bw * bh), along = new Float32Array(bw * bh), across = new Float32Array(bw * bh);
    const R = [], G = [], B = [];
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      const dx = x + x0 - cx, dy = y + y0 - cy, t = dx * ux + dy * uy, s = dx * vx + dy * vy, i = y * bw + x;
      along[i] = t; across[i] = s;
      if (Math.abs(t) <= mT && Math.abs(s) <= mS) {
        inR[i] = 1;
        if ((x & 1) === 0 && (y & 1) === 0) { const j = ((y + y0) * w + x + x0) * 4; R.push(rgba[j]); G.push(rgba[j + 1]); B.push(rgba[j + 2]); }
      }
    }
    const face = [median(R), median(G), median(B)];
    const dist = new Float32Array(bw * bh);
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      const i = y * bw + x; if (!inR[i]) continue;
      const j = ((y + y0) * w + x + x0) * 4, dr = rgba[j] - face[0], dg = rgba[j + 1] - face[1], db = rgba[j + 2] - face[2];
      dist[i] = Math.sqrt(dr * dr + dg * dg + db * db);
    }
    const cand = new Uint8Array(bw * bh);
    for (let i = 0; i < cand.length; i++) cand[i] = inR[i] && dist[i] > 45 ? 1 : 0;
    const { lab, comps } = label(cand, bw, bh);
    const edge = new Uint8Array(comps.length + 1);
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      const i = y * bw + x, id = lab[i]; if (!id) continue;
      if (x === 0 || y === 0 || x === bw - 1 || y === bh - 1 || !inR[i - 1] || !inR[i + 1] || !inR[i - bw] || !inR[i + bw]) edge[id] = 1;
    }
    let blobs = [];
    const junk = [];   // clear marks that are not clean pips (e.g. pips blurred together by video compression)
    for (const c of comps) {
      // spots touching the rim: keep round pip-like ones (pips near the edge), drop shadows / slivers via the shape tests below
      if (edge[c.id] && c.area < 4) continue;
      const d = 2 * Math.sqrt(c.area / Math.PI);
      if (d < W * 0.07 || c.area < 4) continue;
      const cw = c.maxx - c.minx + 1, ch = c.maxy - c.miny + 1;
      if (d > W * 0.32 || cw / ch < 0.5 || cw / ch > 2 || c.area / (cw * ch) < 0.5) { junk.push({ x: c.sx / c.area + x0, y: c.sy / c.area + y0 }); continue; }
      blobs.push({ id: c.id, area: c.area, x: c.sx / c.area + x0, y: c.sy / c.area + y0 });
    }
    if (blobs.length > 2) {
      const med = median(blobs.map(b => b.area));
      blobs = blobs.filter(b => b.area > med * 0.4 && b.area < med * 2.5);
    }
    const segL0 = L / n, junkAt = Array.from({ length: n }, () => [0, 0]);
    for (const j of junk) {
      const pos = (j.x - cx) * ux + (j.y - cy) * uy + hl, k = Math.min(n - 1, Math.max(0, Math.floor(pos / segL0))), within = pos - k * segL0;
      if (Math.abs(within - segL0 / 2) > segL0 * 0.08) junkAt[k][within < segL0 / 2 ? 0 : 1]++;   // ignore the divider line itself
    }
    const pipId = new Uint8Array(comps.length + 1);
    for (const b of blobs) pipId[b.id] = 1;
    const segL = L / n, segs = Array.from({ length: n }, () => ({ c: [0, 0], pips: [] }));
    for (const b of blobs) {
      const pos = (b.x - cx) * ux + (b.y - cy) * uy + hl;
      const k = Math.min(n - 1, Math.max(0, Math.floor(pos / segL))), within = pos - k * segL;
      if (Math.abs(within - segL / 2) < segL * 0.05) continue;     // centre pin
      const half = within < segL / 2 ? 0 : 1;
      if (maxPip <= 9) {
        const u = (within - half * segL / 2) / (segL / 2), v = ((b.x - cx) * vx + (b.y - cy) * vy + hw) / W;
        const off = q => Math.min(Math.abs(q - 0.25), Math.abs(q - 0.5), Math.abs(q - 0.75));
        if (off(u) > 0.14 || off(v) > 0.14) segs[k].bad = true;
        const cell = q => Math.min(2, Math.max(0, Math.round((q - 0.25) / 0.25)));
        (segs[k].cells || (segs[k].cells = [[], []]))[half].push(cell(v) * 3 + cell(u));
      }
      segs[k].c[half]++; segs[k].pips.push({ x: b.x, y: b.y });
    }
    // a segment with no pips must show a divider line in its middle (else: face-down tile / not a tile)
    // profile of colour difference along the tile (pips left out); the divider is a peak near the middle
    const dividerOK = k => {
      const start = -hl + k * segL, nb = Math.max(4, Math.ceil(segL)), sum = new Float64Array(nb), cnt = new Uint32Array(nb);
      for (let i = 0; i < inR.length; i++) {
        if (!inR[i] || Math.abs(across[i]) > W * 0.3 || pipId[lab[i]]) continue;
        const bin = Math.floor(along[i] - start);
        if (bin >= 0 && bin < nb) { sum[bin] += dist[i]; cnt[bin]++; }
      }
      const raw = Array.from(sum, (v, i) => cnt[i] ? v / cnt[i] : 0);
      // light smoothing: video compression adds blocky noise along the tile
      const prof = raw.map((v, i) => (2 * v + (raw[i - 1] ?? v) + (raw[i + 1] ?? v)) / 4);
      let on = 0;
      for (let i = Math.floor(nb * 0.43); i <= Math.ceil(nb * 0.57) && i < nb; i++) on = Math.max(on, prof[i]);
      const rest = prof.filter((_, i) => (i > nb * 0.1 && i < nb * 0.38) || (i > nb * 0.62 && i < nb * 0.9)).sort((p, q) => p - q);
      const off = rest[rest.length >> 1] || 0;
      const p90 = rest[Math.floor(rest.length * 0.9)] || 0;
      const rival = rest[rest.length - 1] || 0;   // strongest line elsewhere (stacked face-down tiles have several)
      return on > 7 && on > off + Math.max(5, off) && p90 < on * 0.7 && rival < on * 0.8;
    };
    return segs.map((sg, k) => {
      const a0 = -hl + k * segL, a1 = a0 + segL;
      const cs = [[a0, -hw], [a1, -hw], [a1, hw], [a0, hw]].map(([p, q]) => [cx + p * ux + q * vx, cy + p * uy + q * vy]);
      const [a, b] = sg.c;
      let ok = a <= maxPip && b <= maxPip && !sg.bad;
      if (ok && ((a === 0 && junkAt[k][0]) || (b === 0 && junkAt[k][1]))) ok = false;   // an 'empty' half with marks on it: unreadable, not 0
      if (ok && maxPip <= 9 && sg.cells) for (const h of [0, 1]) {     // pips must form a real domino pattern
        const key = sg.cells[h].slice().sort((p, q) => p - q).join(',');
        if (!PATTERNS[sg.c[h]].has(key)) ok = false;
      }
      // a valid pip pattern with 3+ pips is proof enough; blanks and near-blanks must also show the divider line
      if (ok && a + b <= 2) ok = dividerOK(k);
      return { a, b, ok, corners: cs, pips: sg.pips, W };
    });
  }

  function detect(rgba, w, h, opt) {
    opt = opt || {};
    const maxPip = opt.maxPip == null ? 6 : opt.maxPip;
    let geos = findTiles(rgba, w, h, !!opt.screen), fallback = false;
    if (!geos.length && opt.fallback) {
      const horiz = w >= h;
      geos = [{ cx: w / 2, cy: h / 2, ux: horiz ? 1 : 0, uy: horiz ? 0 : 1, L: Math.max(w, h), W: Math.min(w, h), n: 1 }];
      fallback = true;
    }
    const tiles = [];
    for (const geo of geos) tiles.push(...readGeo(rgba, w, h, geo, maxPip));
    let good = tiles.filter(t => t.ok);
    if (good.length >= 3) {
      const mw = median(good.map(t => t.W));
      good = good.filter(t => t.W > mw * 0.65 && t.W < mw * 1.5);
    }
    good.fallback = fallback;
    return good;
  }

  const api = { detect, _findTiles: findTiles, _readGeo: readGeo };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DominoDetect = api;
})(this);
