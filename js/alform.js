// ===== Hệ cốp pha nhôm theo Sổ tay Coffa nhôm (Coteccons, 2016) + cây chống Kumkang V4 =====
// Ký hiệu tấm đúng sổ tay: W/WS/WC tấm vách, CA góc ngoài, D/DS tấm sàn, SC góc sàn, MB dầm xương giữa,
// EB dầm xương cuối, PH đầu chống, PHS đầu chống đặc biệt, DE đáy dầm, B thành dầm, SPP cây chống, RP chốt, WP nêm.
// Hình học: tấm = mặt nhôm 4 mm (mặt tiếp xúc bê tông) + sườn biên 65 mm + sườn ngang @300.
// Bố trí là MÔ PHỎNG theo nguyên tắc lắp dựng của sổ tay – bản vẽ ST-form của Kumkang sẽ thay thế khi có.
'use strict';
const AL = (() => {
  const RIB = 0.065, SKIN = 0.004;
  const KG = {W: 20, WS: 25, WC: 20, D: 20, DS: 20, DE: 20, B: 25, MB: 54, EB: 50, PH: 45, PHS: 50, SC: 39};
  const DS2 = THREE.DoubleSide;
  const mAlu = () => lam(0xd6dde4, {emissive: 0x56616c, side: DS2});
  const mBeam = () => lam(0xb9c4cf, {emissive: 0x4a5560, side: DS2});
  const mHead = () => lam(0xf0c419, {emissive: 0x3a2f00, side: DS2});
  const mPin = () => lam(0xc0392b);
  const mSteel = () => lam(0x8f9aa6);
  const cache = {};

  // ---- hộp vào mảng tam giác (toạ độ cục bộ) ----
  function addBox(arr, x0, x1, y0, y1, z0, z1) {
    const v = [[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]];
    for (const [a,b,c] of [[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]]) arr.push(...v[a],...v[b],...v[c]);
  }
  function geoOf(arr) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.computeVertexNormals(); return g; }
  // Tấm chuẩn: X rộng (tâm 0), Y dài (tâm 0), mặt bê tông ở Z = 0 hướng +Z, sườn về phía −Z
  function panelGeo(w, h, crossAlongY = true) {
    const k = `p${w.toFixed(3)}_${h.toFixed(3)}_${crossAlongY}`; if (cache[k]) return cache[k];
    const a = [], t = 0.006, hw = w / 2, hh = h / 2;
    addBox(a, -hw, hw, -hh, hh, -SKIN, 0);                         // mặt nhôm
    addBox(a, -hw, -hw + t, -hh, hh, -RIB, -SKIN); addBox(a, hw - t, hw, -hh, hh, -RIB, -SKIN);   // sườn biên dọc
    addBox(a, -hw, hw, -hh, -hh + t, -RIB, -SKIN); addBox(a, -hw, hw, hh - t, hh, -RIB, -SKIN);   // sườn biên ngang
    if (crossAlongY) for (let y = -hh + 0.3; y < hh - 0.05; y += 0.3) addBox(a, -hw, hw, y - 0.002, y + 0.002, -0.054, -SKIN);
    else for (let x = -hw + 0.3; x < hw - 0.05; x += 0.3) addBox(a, x - 0.002, x + 0.002, -hh, hh, -0.054, -SKIN);
    return (cache[k] = geoOf(a));
  }
  // Đầu chống PH: khối hình thang mặt trên 300, đáy 200, cao 125, rộng 150 + ống cắm cây chống
  function phGeo() {
    if (cache.ph) return cache.ph;
    const a = [], T = 0.15, B = 0.1, w = 0.075, h = 0.125;
    const v = [[-T,0,-w],[T,0,-w],[T,0,w],[-T,0,w],[-B,-h,-w],[B,-h,-w],[B,-h,w],[-B,-h,w]];
    for (const [p,q,r] of [[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]]) a.push(...v[p],...v[q],...v[r]);
    addBox(a, -0.03, 0.03, -h - 0.1, -h, -0.03, 0.03);            // ống cắm
    return (cache.ph = geoOf(a));
  }
  // ---- đặt khối theo hệ trục: ex, ey, ez là véc-tơ thế giới của trục cục bộ X, Y, Z ----
  const PX = new THREE.Vector3(1, 0, 0), PY = new THREE.Vector3(0, 0, -1), PZ = new THREE.Vector3(0, 1, 0);
  function mtx(o, ex, ey, ez) { return new THREE.Matrix4().makeBasis(ex, ey, ez).setPosition(o); }
  // Nhóm theo hình học → InstancedMesh (nhẹ cho điện thoại); mỗi bản ghi giữ thông tin để chạm xem
  function Batch() { this.items = new Map(); }
  Batch.prototype.add = function (geo, mat, m, info) { let b = this.items.get(geo.uuid + mat.uuid); if (!b) this.items.set(geo.uuid + mat.uuid, b = {geo, mat, list: []}); b.list.push({m, info}); };
  Batch.prototype.build = function (grp) {
    for (const {geo, mat, list} of this.items.values()) {
      const im = new THREE.InstancedMesh(geo, mat, list.length); list.forEach((it, i) => im.setMatrixAt(i, it.m));
      im.userData.info = hit => { const it = list[hit && hit.instanceId != null ? hit.instanceId : 0]; return it.info ? it.info() : null; };
      grp.add(im);
    }
  };
  const fmm = v => Math.round(v * 1000);
  function bomAdd(bom, code, kg, n = 1) { const r = bom[code] || (bom[code] = {n: 0, kg: 0}); r.n += n; r.kg += kg * n; }
  const card = (code, rows) => () => ({title: `${code}`, rows});

  // Chia chiều dài thành các tấm có sẵn (mm): ưu tiên tổ hợp vừa khít; nếu không khít, phần dư thành 1 tấm cắt ≥ 150
  function split(total, sizes) {
    const T = Math.round(total * 1000), S = sizes.slice().sort((a, b) => b - a);
    const best = {}; best[0] = [];
    for (let v = 1; v <= T; v++) for (const s of S) if (v >= s && best[v - s] && (!best[v] || best[v - s].length + 1 < best[v].length)) best[v] = best[v - s].concat([s]);
    if (best[T]) return best[T].map(x => x / 1000);
    let v = T; while (v > 0 && !best[v]) v--;
    const out = (best[v] || []).slice(), r = T - v;
    if (r >= 150 || !out.length) out.push(r); else out[out.length - 1] += r;   // dư nhỏ: nới tấm cuối thành tấm cắt
    return out.map(x => x / 1000);
  }

  // ===================== CỐT PHA CỘT =====================
  function column(c, z0, z1) {
    const grp = new THREE.Group(), bt = new Batch(), bom = {}, alu = mAlu(), pin = mPin(), st = mSteel();
    const H = z1 - z0, Wp = 2.45, top = split(H - Wp, [400, 350, 300]);
    const faces = [   // [tâm mặt (plan), pháp tuyến vào cột (world), bề rộng mặt]
      {cx: c.x + c.b/2, cy: c.y, n: new THREE.Vector3(-1, 0, 0), w: c.h, nm: 'mặt hướng trục 2.B'},
      {cx: c.x - c.b/2, cy: c.y, n: new THREE.Vector3(1, 0, 0), w: c.h, nm: 'mặt ngoài nhà (trục 2.A)'},
      {cx: c.x, cy: c.y + c.h/2, n: new THREE.Vector3(0, 0, 1), w: c.b, nm: 'mặt hướng trục 2.2'},
      {cx: c.x, cy: c.y - c.h/2, n: new THREE.Vector3(0, 0, -1), w: c.b, nm: 'mặt ngoài nhà (trục 2.1)'},
    ];
    for (const f of faces) {
      const ez = f.n.clone(), ey = PZ.clone(), ex = new THREE.Vector3().crossVectors(ey, ez);
      const widths = split(f.w, [600, 450, 400, 350, 300, 250, 200]);
      let off = -f.w / 2;
      for (const wd of widths) {
        let z = z0;
        const stack = [{h: Wp, code: wd => `W${fmm(wd)}x2450`, kind: 'W', note: 'Tấm vách có chân rocker 50'}]
          .concat(top.map(h => ({h, code: wd => (h >= 0.299 && [0.3, 0.35, 0.4].some(s => Math.abs(s - h) < 0.002) ? `WS${fmm(wd)}x${fmm(h)}` : `WC${fmm(wd)}x${fmm(h)}`), kind: 'WS', note: 'Tấm vách mở rộng (top panel)'})));
        for (const s of stack) {
          const code = s.code(wd), kg = KG[code.slice(0, 2)] || 20, area = wd * s.h;
          const cen = new THREE.Vector3(...W(f.cx, f.cy, z + s.h / 2).toArray()).addScaledVector(ex, off + wd / 2);
          const zz = z;
          bt.add(panelGeo(wd, s.h, true), alu, mtx(cen, ex, ey, ez), card(code, [
            ['Loại', `${s.note} – ${code.startsWith('W') && code[1] !== 'S' && code[1] !== 'C' ? 'W' : code.slice(0, 2)}`],
            ['Kích thước', `${fmm(wd)} × ${fmm(s.h)} mm, sườn 65`], ['Trọng lượng', `≈ ${(area * kg).toFixed(1)} kg (${kg} kg/m²)`],
            ['Vị trí', `Cột ${c.type} – ${f.nm}, từ ${fmtLv(zz)}`], ['Liên kết', 'Chốt ngắn RP + nêm WP @300 dọc mép; gông bằng cùm xà gồ + ống thép'],
            ['Tháo', 'Sau đổ 12 giờ (TVGS chấp thuận); tháo từ trên xuống, giữ kicker']]));
          bomAdd(bom, code, area * kg);
          // chốt mép đứng (giữa 2 tấm cạnh nhau / với góc CA) @300 và mép ngang (giữa 2 tầng tấm) @300
          for (let y = zz + 0.15; y < zz + s.h - 0.05; y += 0.3)
            for (const xe of [off, off + wd]) pinAt(bt, bom, new THREE.Vector3(...W(f.cx, f.cy, y).toArray()).addScaledVector(ex, xe).addScaledVector(ez, -RIB / 2), ex);
          if (zz > z0 + 0.01) for (let xx = off + 0.15; xx < off + wd - 0.05; xx += 0.3)
            pinAt(bt, bom, new THREE.Vector3(...W(f.cx, f.cy, zz).toArray()).addScaledVector(ex, xx).addScaledVector(ez, -RIB / 2), ey);
          z += s.h;
        }
        off += wd;
      }
    }
    // Góc ngoài CA (63,5 + 63,5) ở 4 góc cột, đủ chiều cao
    const caLen = split(H, [2400, 1200, 600]);
    for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      let z = z0;
      for (const L of caLen) {
        const g = caGeo(L), x = c.x + sx * c.b / 2, y = c.y + sy * c.h / 2;
        const ex = new THREE.Vector3(sx, 0, 0), ez = new THREE.Vector3(0, 0, -sy), ey = PZ.clone();
        bt.add(g, alu, mtx(W(x, y, z + L / 2), ex, ey, ez), card(`CA(63.5+63.5)x${fmm(L)}`, [['Loại', 'Góc liên kết vách – góc ngoài cột'], ['Trọng lượng', `≈ ${(1.931 * L).toFixed(1)} kg (1,931 kg/m)`]]));
        bomAdd(bom, `CA(63.5+63.5)x${fmm(L)}`, 1.931 * L); z += L;
      }
    }
    // Gông cột: ống thép Ø48,6 + cùm xà gồ, 4 tầng
    const o = 0.065 + 0.04, pipes = [];
    for (const dz of [0.3, 1.2, 2.1, 3.0].filter(d => d < H - 0.1)) {
      const z = z0 + dz, x0 = c.x - c.b/2 - o, x1 = c.x + c.b/2 + o, y0 = c.y - c.h/2 - o, y1 = c.y + c.h/2 + o;
      for (const [a, b] of [[[x0 - 0.15, y0], [x1 + 0.15, y0]], [[x0 - 0.15, y1], [x1 + 0.15, y1]], [[x0, y0 - 0.15], [x0, y1 + 0.15]], [[x1, y0 - 0.15], [x1, y1 + 0.15]]])
        prismSeg(pipes, W(a[0], a[1], z), W(b[0], b[1], z), 0.0243);
      bomAdd(bom, 'Ống thép Ø48,6 gông cột (tầng)', 0);
    }
    const pm = meshFrom(pipes, st); pm.userData.info = card('Gông cột', [['Cấu tạo', 'Ống thép Ø48,6 + cùm xà gồ (Waler bracket) ôm 4 mặt'], ['Cao độ', '+0,3 / +1,2 / +2,1 / +3,0 m từ chân cột']]);
    grp.add(pm); bt.build(grp);
    return {grp, bom};
  }
  // Chốt ngắn RP: thân Ø16 dài 90 + mũ Ø32, trục cục bộ X (xuyên qua 2 sườn tấm kề nhau); nêm WP cắm ở đuôi chốt
  function addCylX(a, r, x0, x1, n = 8) {
    for (let i = 0; i < n; i++) { const t0 = 2 * Math.PI * i / n, t1 = 2 * Math.PI * (i + 1) / n, c0 = Math.cos(t0) * r, s0 = Math.sin(t0) * r, c1 = Math.cos(t1) * r, s1 = Math.sin(t1) * r;
      a.push(x0, c0, s0, x1, c0, s0, x1, c1, s1, x0, c0, s0, x1, c1, s1, x0, c1, s1, x1, 0, 0, x1, c1, s1, x1, c0, s0, x0, 0, 0, x0, c0, s0, x0, c1, s1); }
  }
  function pinGeo() { if (cache.pin) return cache.pin; const a = []; addCylX(a, 0.009, -0.045, 0.045); addCylX(a, 0.017, 0.045, 0.055); return (cache.pin = geoOf(a)); }
  function wedgeGeo() { if (cache.wg) return cache.wg; const a = []; addBox(a, -0.052, -0.044, -0.035, 0.03, -0.012, 0.012); return (cache.wg = geoOf(a)); }
  function lpGeo() { if (cache.lp) return cache.lp; const a = []; addCylX(a, 0.009, -0.11, 0.11); addCylX(a, 0.017, 0.11, 0.12); return (cache.lp = geoOf(a)); }
  // đặt chốt: p = điểm (world), ax = trục chốt (world, đơn vị)
  function basisFor(ax) { const up = Math.abs(ax.y) < 0.9 ? PZ.clone() : PX.clone(), ez = new THREE.Vector3().crossVectors(ax, up).normalize(), ey = new THREE.Vector3().crossVectors(ez, ax); return [ax.clone(), ey, ez]; }
  let PINM, WGM;
  const RPINFO = card('RP + WP – chốt ngắn + nêm', [['Phụ kiện', 'Chốt ngắn (Round pin) xuyên 2 sườn tấm kề nhau, khoá bằng nêm (Wedge)'], ['Bước', '@300 dọc mép tấm (theo lỗ chốt có sẵn)'], ['Tháo', 'Đóng trực tiếp vào đuôi nêm hoặc dùng dụng cụ tháo']]);
  const LPINFO = card('LP – chốt dài', [['Phụ kiện', 'Chốt dài (Long pin) nối dầm xương MB/EB với đầu chống PH, có thanh nẹp JB'], ['Vị trí', '2 đầu mỗi đầu chống']]);
  function pinAt(bt, bom, p, ax, kind = 'RP') {
    PINM = PINM || lam(0xe0302a, {emissive: 0x400000}); WGM = WGM || lam(0xf39c12, {emissive: 0x3a2400});
    const [ex, ey, ez] = basisFor(ax), m = mtx(p, ex, ey, ez);
    if (kind === 'LP') { bt.add(lpGeo(), PINM, m, LPINFO); bomAdd(bom, 'LP – chốt dài', 0.35); return; }
    bt.add(pinGeo(), PINM, m, RPINFO); bt.add(wedgeGeo(), WGM, m, RPINFO); bomAdd(bom, 'RP + WP – chốt + nêm (bộ)', 0.25);
  }
  function caGeo(L) {
    const k = 'ca' + L.toFixed(3); if (cache[k]) return cache[k];
    const a = [], l = 0.0635, t = 0.004;   // chữ V ôm góc ngoài: hai cánh 63,5
    addBox(a, -t, l, -L/2, L/2, -t, 0); addBox(a, -t, 0, -L/2, L/2, -t, l);
    return (cache[k] = geoOf(a));
  }

  // ===================== CỐT PHA DẦM + SÀN =====================
  // beams: dầm vùng thí điểm; edge: cao độ mép công trình; zTop: mặt sàn; stage: 'full' | 'early' (chỉ còn cây chống + đầu chống)
  function slab(beams, zFloor, zTop, edge, stage = 'full') {
    const grp = new THREE.Group(), bt = new Batch(), bom = {}, props = [];
    const alu = mAlu(), alb = mBeam(), head = mHead();
    const soffit = zTop - 0.22, q = h => 25 * h + FORM + LIVE;
    // --- ô sàn trống giữa các dầm, quanh tâm vùng ---
    const cx = 5, cy = 7, NS = beams.filter(b => b.o === 'NS'), EW = beams.filter(b => b.o === 'EW');
    const bx0 = Math.max(...NS.filter(b => b.c < cx).map(b => b.c + b.b/2)), bx1 = Math.min(...NS.filter(b => b.c > cx).map(b => b.c - b.b/2));
    const by0 = Math.max(...EW.filter(b => b.c < cy).map(b => b.c + b.b/2)), by1 = Math.min(...EW.filter(b => b.c > cy).map(b => b.c - b.b/2));
    const SCW = 0.1;
    // phương X: SC | D 1200 | MB 150 | D | ... | D | DS | SC
    const ax0 = bx0 + SCW, ax1 = bx1 - SCW, avail = ax1 - ax0;
    const nD = Math.floor((avail + 0.15) / 1.35), xs = []; let x = ax0;
    for (let i = 0; i < nD; i++) { xs.push({x0: x, x1: x + 1.2, code: 'D'}); x += 1.2; if (i < nD - 1) { xs.push({x0: x, x1: x + 0.15, code: 'MB'}); x += 0.15; } }
    if (ax1 - x > 0.02) xs.push({x0: x, x1: ax1, code: 'DS'});
    // phương Y dọc dầm xương: SC | EB | PH | MB | PH | ... | PH | EB | SC – chọn tổ hợp ít dư nhất
    const ay0 = by0 + SCW, ay1 = by1 - SCW, availY = ay1 - ay0;
    let best = null;
    for (const eb of [0.45, 0.6, 0.9]) for (let k = 2; k < 40; k++) {
      const base = 2 * eb + 0.3 * k + 0.9 * (k - 1); if (base > availY + 1e-6) break;
      // ưu tiên MB 900 (đầu chống @1.200) để cây chống không quá tải; chỉ dùng MB 1050 khi cần lấp chỗ dư
      for (let m1050 = 0; m1050 <= k - 1; m1050++) { const left = availY - base - 0.15 * m1050; if (left < -1e-6) break;
        const score = (left > 0.16 ? 10 + left : left) + m1050 * 0.2;
        if (!best || score < best.score) best = {eb, k, m1050, left, score}; }
    }
    const line = []; { let y = ay0 + best.left / 2; line.push({y0: y, y1: y + best.eb, code: 'EB'}); y += best.eb;
      for (let i = 0; i < best.k; i++) { line.push({y0: y, y1: y + 0.3, code: 'PH'}); y += 0.3;
        if (i < best.k - 1) { const L = i < best.m1050 ? 1.05 : 0.9; line.push({y0: y, y1: y + L, code: 'MB'}); y += L; } }
      line.push({y0: y, y1: y + best.eb, code: 'EB'}); }
    // tấm sàn rộng 600 dọc Y
    const ys = []; { let y = ay0; while (ay1 - y >= 0.6 - 1e-6) { ys.push({y0: y, y1: y + 0.6}); y += 0.6; } if (ay1 - y > 0.02) ys.push({y0: y, y1: ay1}); }
    const spanX = xs.find(s => s.code === 'MB') ? 1.35 : 1.2;

    if (stage === 'full') {
      // tấm sàn D / DS
      for (const sx of xs) if (sx.code !== 'MB') for (const sy of ys) {
        const lx = sx.x1 - sx.x0, wy = sy.y1 - sy.y0, std = Math.abs(lx - 1.2) < 1e-3 && Math.abs(wy - 0.6) < 1e-3;
        const code = std ? 'D600x1200' : `DS${fmm(Math.min(lx, wy))}x${fmm(Math.max(lx, wy))}`, kg = 20 * lx * wy;
        bt.add(panelGeo(wy, lx, true), alu, mtx(W((sx.x0 + sx.x1) / 2, (sy.y0 + sy.y1) / 2, soffit), PY.clone().negate(), PX.clone(), PZ.clone()), card(code, [
          ['Loại', std ? 'Tấm sàn tiêu chuẩn (Slab panel)' : 'Tấm sàn đặc biệt – cắt theo thiết kế'], ['Kích thước', `${fmm(wy)} × ${fmm(lx)} mm`],
          ['Trọng lượng', `≈ ${kg.toFixed(1)} kg (20 kg/m²)`], ['Mặt cốp pha', fmtLv(soffit)],
          ['Lắp', 'Sau khi lắp xong dầm xương; lắp từ 2 đầu dầm xương đuổi vào giữa'], ['Tháo', 'Sau đổ 36 giờ (TVGS chấp thuận), GIỮ cây chống + đầu chống']]));
        bomAdd(bom, code, kg);
        // chốt tấm sàn: cạnh dài (mép 600 kề tấm bên) @300; cạnh ngắn (kề dầm xương / góc sàn) 2 chốt
        const zp = soffit - RIB / 2;
        for (let xx = sx.x0 + 0.15; xx < sx.x1 - 0.05; xx += 0.3) pinAt(bt, bom, W(xx, sy.y1, zp), PY);
        if (sy === ys[0]) for (let xx = sx.x0 + 0.15; xx < sx.x1 - 0.05; xx += 0.3) pinAt(bt, bom, W(xx, sy.y0, zp), PY);
        for (let yy = sy.y0 + 0.15; yy < sy.y1 - 0.05; yy += 0.3) { pinAt(bt, bom, W(sx.x0, yy, zp), PX); pinAt(bt, bom, W(sx.x1, yy, zp), PX); }
      }
      // góc sàn SC dọc 4 cạnh ô sàn (nối tấm sàn với thành dầm)
      for (const [p0, p1, side] of [[[bx0, by0], [bx0, by1], 'x+'], [[bx1, by0], [bx1, by1], 'x-'], [[bx0, by0], [bx1, by0], 'y+'], [[bx0, by1], [bx1, by1], 'y-']]) {
        const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), segs = split(L, [2400]);
        let s = 0;
        for (const l of segs) {
          const t0 = s / L, t1 = (s + l) / L, a = [p0[0] + (p1[0] - p0[0]) * t0, p0[1] + (p1[1] - p0[1]) * t0], b2 = [p0[0] + (p1[0] - p0[0]) * t1, p0[1] + (p1[1] - p0[1]) * t1];
          const arr = [], ix = side === 'x+' ? 1 : side === 'x-' ? -1 : 0, iy = side === 'y+' ? 1 : side === 'y-' ? -1 : 0;
          const x0 = Math.min(a[0], b2[0]), x1 = Math.max(a[0], b2[0]), y0 = Math.min(a[1], b2[1]), y1 = Math.max(a[1], b2[1]);
          const hx0 = ix ? (ix > 0 ? x0 : x0 - SCW) : x0, hx1 = ix ? (ix > 0 ? x0 + SCW : x0) : x1, hy0 = iy ? (iy > 0 ? y0 : y0 - SCW) : y0, hy1 = iy ? (iy > 0 ? y0 + SCW : y0) : y1;
          const m = box(hx0, hx1, hy0, hy1, soffit - RIB, soffit, alb);                                  // cánh nằm dưới sàn
          const v = box(ix ? (ix > 0 ? x0 : x0 - RIB) : x0, ix ? (ix > 0 ? x0 + RIB : x0) : x1, iy ? (iy > 0 ? y0 : y0 - RIB) : y0, iy ? (iy > 0 ? y0 + RIB : y0) : y1, soffit - SCW, soffit, alb);   // cánh đứng ốp thành dầm
          const code = `SC100x${fmm(l)}`; m.userData.info = v.userData.info = card(code, [['Loại', 'Góc sàn (Slab corner) – nối tấm sàn với thành dầm'], ['Trọng lượng', `≈ ${(39 * 0.2 * l).toFixed(1)} kg (39 kg/m²)`], ['Tháo', 'Tháo sau cùng trong hệ sàn (B3)']]);
          grp.add(m, v); bomAdd(bom, code, 39 * 0.2 * l);
          // chốt đứng nối cánh đứng góc sàn với sườn trên thành dầm @300
          for (let d = 0.15; d < l - 0.05; d += 0.3) { const px = a[0] + (b2[0] - a[0]) * d / l, py = a[1] + (b2[1] - a[1]) * d / l;
            pinAt(bt, bom, W(px - ix * RIB / 2, py - iy * RIB / 2, soffit - SCW), PZ); }
          s += l;
        }
      }
    }
    // dầm xương MB / EB + đầu chống PH + cây chống
    for (const sx of xs) if (sx.code === 'MB') {
      const xm = (sx.x0 + sx.x1) / 2;
      for (const seg of line) {
        const ym = (seg.y0 + seg.y1) / 2, L = seg.y1 - seg.y0;
        if (seg.code === 'PH') {
          bt.add(phGeo(), head, mtx(W(xm, ym, soffit), PY.clone(), PZ.clone(), PX.clone()), card('PH150x300', [
            ['Loại', 'Đầu chống (Prop head) – khối hình thang, giữ lại khi tháo sàn sớm'], ['Kích thước', 'Rộng 150, dài 300, cao 125'],
            ['Trọng lượng', '≈ 2,0 kg'], ['Liên kết', 'Chốt dài (LP) với dầm xương MB; cắm vào đầu cây chống SPP']]));
          bomAdd(bom, 'PH150x300', 45 * 0.045);
          if (stage === 'full') for (const yy of [seg.y0, seg.y1]) pinAt(bt, bom, W(xm, yy, soffit - 0.06), PX, 'LP');
          // cây chống dưới đầu chống: diện chịu tải = khoảng cách dầm xương × khoảng cách đầu chống
          const i = line.indexOf(seg), prev = line.slice(0, i).reverse().find(s => s.code === 'PH'), next = line.slice(i + 1).find(s => s.code === 'PH');
          const left = (prev ? ym - (prev.y0 + prev.y1) / 2 : ym - ay0 + SCW) / 2, right = (next ? (next.y0 + next.y1) / 2 - ym : ay1 + SCW - ym) / 2, dy = left + right;   // nửa nhịp mỗi bên; đầu mút SC tựa lên thành dầm
          props.push({x: xm, y: ym, zt: soffit - 0.225, a: spanX, w: dy, q: q(0.22), where: 'Dưới đầu chống PH (sàn 220)'});
        } else if (stage === 'full') {
          const code = seg.code === 'MB' ? `MB150x${fmm(L)}` : `EB150x${fmm(L)}`, kg = KG[seg.code] * 0.15 * L;
          const g = new THREE.Group(), m = box(sx.x0, sx.x1, seg.y0, seg.y1, soffit - 0.125, soffit, alb);
          m.userData.info = card(code, [['Loại', seg.code === 'MB' ? 'Dầm xương giữa (Middle beam) – 2 đầu vát ngược chiều' : 'Dầm xương cuối (End beam) – giữa góc sàn SC và đầu chống PH'],
            ['Kích thước', `150 × 125 × ${fmm(L)} mm`], ['Trọng lượng', `≈ ${kg.toFixed(1)} kg`], ['Lắp', 'Lắp bằng cao độ sàn, ≥ 3 công nhân; nối bằng thanh nẹp JB + chốt dài LP']]);
          grp.add(m); bomAdd(bom, code, kg);
        }
      }
    }
    // --- cốp pha dầm: đáy DE + đầu chống PHS + thành B ---
    for (const b of beams) {
      const EWb = b.o === 'EW', P = (u, w) => EWb ? [u, b.c + w] : [b.c + w, u], zb = zTop - b.h, drop = b.h - 0.22;
      const outerSide = (b.c - b.b / 2) <= edge + 0.01 ? -1 : 0;   // dầm biên: thành ngoài là mép công trình
      const strips = split(b.b, [400, 300, 200]), runs = split(b.hi - b.lo, [1050, 900]);
      let w0 = -b.b / 2;
      for (const sw of strips) {
        let u = b.lo;
        for (const L of runs) {
          const [px, py] = P(u + L / 2, w0 + sw / 2), code = `DE${fmm(L)}x${fmm(sw)}`, kg = 20 * L * sw;
          if (stage === 'full') {
            const ex = EWb ? PX.clone() : PY.clone(), ey = EWb ? PY.clone() : PX.clone().negate();
            bt.add(panelGeo(L, sw, false), alu, mtx(W(px, py, zb), ex, ey, PZ.clone()), card(code, [['Loại', 'Tấm đáy dầm (Beam bottom slab panel)'], ['Dầm', `${b.did} ${fmm(b.b)}×${fmm(b.h)}`], ['Đáy dầm', fmtLv(zb)], ['Trọng lượng', `≈ ${kg.toFixed(1)} kg`]]));
            bomAdd(bom, code, kg);
          }
          // đầu chống đặc biệt PHS + cây chống ở mỗi mối nối đáy dầm
          const [qx, qy] = P(u + L, w0 + sw / 2);
          if (u + L < b.hi - 0.1) {
            const ex = EWb ? PY.clone() : PX.clone();
            bt.add(phGeo(), head, mtx(W(qx, qy, zb), ex, PZ.clone(), new THREE.Vector3().crossVectors(ex, PZ)), card(`PHS150x${sw >= 0.4 ? 420 : 320}`, [['Loại', 'Đầu chống đặc biệt – đỡ đáy dầm'], ['Dầm', `${b.did}`], ['Cây chống', 'SPP Kumkang V4']]));
            bomAdd(bom, `PHS150x${sw >= 0.4 ? 420 : 320}`, 50 * 0.15 * 0.32);
            props.push({x: qx, y: qy, zt: zb - 0.225, a: L, w: sw, q: q(b.h), where: `Dưới đáy dầm ${b.did} ${fmm(b.b)}×${fmm(b.h)}`});
          }
          u += L;
        }
        w0 += sw;
      }
      if (stage !== 'full') continue;
      // thành dầm: phía ô sàn cao = drop − SC; phía mép công trình cao h + 50
      for (const side of [-1, 1]) {
        const isOuter = outerSide === side, hgt = isOuter ? b.h + 0.05 : drop - 0.1, zt = isOuter ? zTop + 0.05 : soffit - 0.1;
        if (hgt <= 0.05) continue;
        const panels = split(b.hi - b.lo, [600]); let u = b.lo;
        for (const L of panels) {
          const [px, py] = P(u + L / 2, side * b.b / 2), code = `B${fmm(L)}x${fmm(hgt)}`, kg = 25 * L * hgt;
          const ez = EWb ? new THREE.Vector3(0, 0, side) : new THREE.Vector3(-side, 0, 0), ey = PZ.clone(), ex = new THREE.Vector3().crossVectors(ey, ez);
          bt.add(panelGeo(L, hgt, false), alb, mtx(W(px, py, zt - hgt / 2), ex, ey, ez), card(code, [['Loại', isOuter ? 'Thành dầm biên – cao hơn mặt sàn 50, công trường gia cố thêm' : 'Tấm thành dầm (Beam panel)'],
            ['Dầm', `${b.did} ${fmm(b.b)}×${fmm(b.h)}`], ['Kích thước', `${fmm(L)} × ${fmm(hgt)} mm`], ['Trọng lượng', `≈ ${kg.toFixed(1)} kg`], ['Tháo', 'Sau đổ 12 giờ cùng tấm vách, cột']]));
          bomAdd(bom, code, kg);
          // chốt thành dầm: với đáy dầm (mép dưới) và giữa 2 tấm thành (mép đứng) @300
          const across = EWb ? PY : PX;
          for (let d = 0.15; d < L - 0.05; d += 0.3) { const [qx, qy] = P(u + d, side * (b.b / 2 + RIB / 2)); pinAt(bt, bom, W(qx, qy, zt - hgt), across); }
          for (let hz = zt - hgt + 0.15; hz < zt - 0.05; hz += 0.3) { const [qx, qy] = P(u + L, side * (b.b / 2 + RIB / 2)); pinAt(bt, bom, W(qx, qy, hz), EWb ? PX : PY); }
          u += L;
        }
      }
    }
    // --- cây chống SPP (Kumkang V4) ---
    const pg = new THREE.Group(), n = props.length, o = new THREE.Object3D();
    const gOut = new THREE.CylinderGeometry(0.0302, 0.0302, 1, 10); gOut.translate(0, 0.5, 0);
    const gIn = new THREE.CylinderGeometry(0.0243, 0.0243, 1, 10); gIn.translate(0, 0.5, 0);
    const gPl = new THREE.BoxGeometry(0.14, 0.0055, 0.14);
    const mOut = new THREE.InstancedMesh(gOut, lam(0x3d7bd9), n), mIn = new THREE.InstancedMesh(gIn, lam(COL.prop), n), mPl = new THREE.InstancedMesh(gPl, lam(0x8a96a3), 2 * n);
    props.forEach((p, i) => {
      const L = p.zt - zFloor, zo = Math.min(V4.out, L); p.L = L; p.load = p.a * p.w * p.q; p.cap = v4Cap(L);
      o.position.copy(W(p.x, p.y, zFloor)); o.scale.set(1, zo, 1); o.updateMatrix(); mOut.setMatrixAt(i, o.matrix);
      o.position.copy(W(p.x, p.y, zFloor + zo)); o.scale.set(1, Math.max(0.01, L - zo), 1); o.updateMatrix(); mIn.setMatrixAt(i, o.matrix);
      o.scale.set(1, 1, 1); o.position.copy(W(p.x, p.y, zFloor + 0.003)); o.updateMatrix(); mPl.setMatrixAt(2 * i, o.matrix);
      o.position.copy(W(p.x, p.y, zFloor + L)); o.updateMatrix(); mPl.setMatrixAt(2 * i + 1, o.matrix);
    });
    bomAdd(bom, 'SPP Kumkang V4', 14.8, n);
    const pinfo = hit => { const p = props[hit && hit.instanceId != null ? hit.instanceId : 0], ok = p.L >= V4.min && p.L <= V4.max, r = p.load / p.cap;
      return {title: 'Cây chống SPP – Kumkang V4', rows: [
        ['Vị trí', `${p.where} · x=${p.x.toFixed(2)}, y=${p.y.toFixed(2)}`],
        ['Chiều dài làm việc', `${p.L.toFixed(2)} m ${ok ? '(trong phạm vi 2,6–4,0 m)' : '– NGOÀI phạm vi V4'}`],
        ['Diện chịu tải', `${p.a.toFixed(2)} × ${p.w.toFixed(2)} m`],
        ['Tải ước tính', `${p.load.toFixed(1)} kN (${p.q.toFixed(2)} kN/m²: bê tông + cốp pha + thi công ${LIVE})`],
        ['Tải cho phép', `≈ ${p.cap.toFixed(1)} kN ở chiều dài này · sử dụng ${(r * 100).toFixed(0)}%${r > 0.9 ? ' – SÁT GIỚI HẠN, cần Kumkang tính toán' : ''}`],
        ['Ống', 'Ngoài Ø60,3×2,0 (xanh) · trong Ø48,6×2,2 (trắng) · đế/mũ 140×140'],
        ['Tháo', 'Khi mẫu bê tông đạt cường độ yêu cầu, sau kéo căng, ≥ 21 ngày (Rev02)']]}; };
    mOut.userData.info = mIn.userData.info = pinfo;
    pg.add(mOut, mIn, mPl); grp.add(pg);
    bt.build(grp);
    const usage = props.map(p => p.load / p.cap), maxU = Math.max(...usage);
    return {grp, bom, props, maxU, layout: {bx0, bx1, by0, by1, nD, line: best}};
  }

  // Bảng thống kê tấm (gắn vào thẻ bước)
  function bomRows(bom) {
    const rows = Object.entries(bom).sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => [k, `${v.n} ${k.startsWith('SPP') ? 'cây' : k.startsWith('RP') ? 'bộ' : k.startsWith('LP') ? 'cây' : 'tấm'}${v.kg ? ` · ${v.kg.toFixed(0)} kg` : ''}`]);
    const tot = Object.values(bom).reduce((s, v) => s + v.kg, 0);
    rows.push(['Tổng khối lượng', `≈ ${(tot / 1000).toFixed(2)} tấn (vùng hiển thị)`]);
    return rows;
  }
  return {column, slab, bomRows};
})();
