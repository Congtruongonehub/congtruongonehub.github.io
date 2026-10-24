// ===== ONEHUB BP2 · Thực tế ảo công trường (thí điểm) =====
// Camera điện thoại + tem QR làm mốc định vị: mô hình 3D phủ lên hình thật, bám theo camera.
'use strict';
const $ = s => document.querySelector(s);
const qs = new URLSearchParams(location.search);
const TODAY = qs.get('today') ? new Date(qs.get('today') + 'T12:00:00') : new Date();
const LV = MD.LV, [RX0, RX1, RY0, RY1] = MD.REG;
const EDGE = -0.45;                       // mép ngoài công trình (dầm biên) theo 2 phương trong vùng thí điểm
const W = (x, y, z) => new THREE.Vector3(x, z, -y);   // mặt bằng → không gian 3D
let NT = {records: []};

// ---------- vật liệu ----------
const CLIP = [new THREE.Plane(new THREE.Vector3(1,0,0), -RX0), new THREE.Plane(new THREE.Vector3(-1,0,0), RX1),
              new THREE.Plane(new THREE.Vector3(0,0,1), RY1), new THREE.Plane(new THREE.Vector3(0,0,-1), -RY0)];
const lam = (c, o = {}) => new THREE.MeshLambertMaterial(Object.assign({color: c, clippingPlanes: CLIP}, o));
const M = {};
const COL = {colBar: 0xff7a1a, tie: 0xffd23f, beamBar: 0xff4d2e, stir: 0xffb020, slabTop: 0xffe14d, slabBot: 0xff9a3c,
             pt: 0x19d3ff, anc: 0x2f7bff, prop: 0xdfe6ee, deck: 0xb9c6d3, form: 0xa9b8c7, conc: 0x9aa4ae};
for (const d of [6,8,10,12,14,16,18,20,22,25,28,32]) { M['b'+d] = lam(COL.beamBar); M['t'+d] = new THREE.LineBasicMaterial({color: COL.stir, clippingPlanes: CLIP}); M['s'+d] = new THREE.LineBasicMaterial({color: COL.slabTop, clippingPlanes: CLIP}); M['u'+d] = new THREE.LineBasicMaterial({color: COL.slabBot, clippingPlanes: CLIP}); }
for (let n = 1; n <= 5; n++) M['p'+n] = lam(COL.pt);
M.anc = lam(COL.anc);
M.conc = new THREE.MeshLambertMaterial({color: COL.conc, transparent: true, opacity: 0.12, depthWrite: false});
M.lap1 = new THREE.MeshBasicMaterial({color: 0x46e08a, transparent: true, opacity: 0.16, depthWrite: false});
M.lap2 = new THREE.MeshBasicMaterial({color: 0x2bc4e0, transparent: true, opacity: 0.16, depthWrite: false});
const ghost = (c, op) => new THREE.MeshLambertMaterial({color: c, transparent: true, opacity: op, depthWrite: false, clippingPlanes: CLIP});
const PHANTOM = new THREE.MeshBasicMaterial({colorWrite: false});

// ---------- tiện ích hình học ----------
function prismSeg(arr, a, b, r) {   // thanh tròn 6 mặt giữa 2 điểm (không gian 3D)
  const d = new THREE.Vector3().subVectors(b, a), L = d.length(); if (L < 1e-6) return; d.divideScalar(L);
  const up = Math.abs(d.y) < 0.9 ? new THREE.Vector3(0,1,0) : new THREE.Vector3(1,0,0);
  const u = new THREE.Vector3().crossVectors(d, up).normalize(), w = new THREE.Vector3().crossVectors(d, u);
  const P = []; for (let i = 0; i < 6; i++) { const t = i * Math.PI / 3; P.push(new THREE.Vector3().addScaledVector(u, Math.cos(t)*r).addScaledVector(w, Math.sin(t)*r)); }
  for (let i = 0; i < 6; i++) { const p = P[i], q = P[(i+1)%6];
    arr.push(a.x+p.x,a.y+p.y,a.z+p.z, b.x+p.x,b.y+p.y,b.z+p.z, b.x+q.x,b.y+q.y,b.z+q.z, a.x+p.x,a.y+p.y,a.z+p.z, b.x+q.x,b.y+q.y,b.z+q.z, a.x+q.x,a.y+q.y,a.z+q.z); }
}
function meshFrom(arr, mat) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.computeVertexNormals(); return new THREE.Mesh(g, mat); }
// Đường 1 pixel khó thấy ngoài trời → đổi thành thanh có bề dày thật
function thicken(group, colorOf) {
  const todo = []; group.traverse(o => { if (o.isLineSegments) todo.push(o); });
  for (const L of todo) {
    const p = L.geometry.attributes.position.array, arr = [], key = L.material.color.getHex();
    let d = 10; for (const k in M) if (M[k] === L.material) d = parseInt(k.slice(1)) || 10;
    const r = Math.max(d / 2000, 0.006);
    for (let i = 0; i < p.length; i += 6) prismSeg(arr, new THREE.Vector3(p[i],p[i+1],p[i+2]), new THREE.Vector3(p[i+3],p[i+4],p[i+5]), r);
    const m = meshFrom(arr, lam(colorOf ? colorOf(key) : key)); m.position.copy(L.position);
    L.parent.add(m); L.parent.remove(L);
  }
}
function box(x0, x1, y0, y1, z0, z1, mat) {   // hộp theo toạ độ mặt bằng
  const g = new THREE.BoxGeometry(x1-x0, z1-z0, y1-y0); g.translate((x0+x1)/2, (z0+z1)/2, -(y0+y1)/2);
  return new THREE.Mesh(g, mat);
}
function label(text, x, y, z, opt = {}) {
  const c = document.createElement('canvas'), ctx = c.getContext('2d'), fs = 44;
  ctx.font = `600 ${fs}px system-ui, sans-serif`; const w = Math.ceil(ctx.measureText(text).width) + 28;
  c.width = w; c.height = fs + 22; ctx.font = `600 ${fs}px system-ui, sans-serif`;
  ctx.fillStyle = opt.bg || 'rgba(16,20,26,.82)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(0,0,w,c.height,12) : ctx.rect(0,0,w,c.height); ctx.fill();
  ctx.fillStyle = opt.fg || '#ffd23f'; ctx.textBaseline = 'middle'; ctx.fillText(text, 14, c.height/2 + 2);
  const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({map: t, depthTest: false, sizeAttenuation: false}));
  const h = opt.h || 0.03; s.scale.set(h * w / c.height, h, 1); s.center.set(opt.cx ?? 0.5, 0.5); s.position.copy(W(x, y, z)); s.renderOrder = 20;
  return s;
}
const fmtLv = z => (z >= 0 ? '+' : '') + z.toFixed(3);
const mm = v => Math.round(v * 1000);
const fmtDate = s => { const [y,m,d] = s.split('-'); return `${d}/${m}/${y}`; };

// ---------- dữ liệu kết cấu ----------
let RB, BS, BP;
function core() {
  if (RB) return;
  RB = makeRebar({lv: LV, cols: MD.COLS, noCores: true}, MD.SCH, M);
  BS = makeBeamSlabPT(MD.BD_REG, LV, M);
  BP = makeBeamSlabPT(MD.BD_PT, LV, M);
}
const colRec = id => RB.COLS.find(r => r.c.id === id);
const beamsReg = () => MD.BD_REG.typ.beams;

// ---------- thông tin khi chạm ----------
function infoCol(rec, s) {
  const e = rec.st[s], c = rec.c, nm = RB.FL[s].replace('FL',''), nx = RB.FL[s+1].replace('FL','');
  return {title: `Cột ${c.type} · ${mm(c.b)}×${mm(c.h)} · tầng ${nm}`, rows: [
    ['Đoạn cột', `T${nm} → T${nx}: ${fmtLv(e.zS)} → ${fmtLv(e.zN)}`],
    ['Thép dọc', `${e.n}Ø${e.d} CB500-V (${e.n/4+1} thanh/mặt)`],
    ['Thép đai', `Ø${e.td}a${mm(e.ts)} thân cột · a200 vùng nút dầm sàn`],
    ['Lớp bảo vệ', '40 mm (tới mép đai)'],
    e.lap ? ['Nối lên tầng trên', `41Ø = ${mm(e.lap.Ln)} mm, từ ${fmtLv(e.lap.z0)}, so le 2 nhóm (đến ${fmtLv(e.lap.z2)})`] : ['Đầu cột', 'Bẻ neo vào dầm sàn'],
    ['Bê tông', 'C30/37'],
    ['Bản vẽ', 'S-70-01…03, S-00-02 mục XII'],
  ]};
}
function infoBeam(b) {
  const s = MD.BSPEC[b.did] || {}, bar = a => a ? `${a[0]}Ø${a[1]}` : '–';
  return {title: `Dầm ${b.did} · ${mm(b.b)}×${mm(b.h)}`, rows: [
    ['Thép trên', `${bar(s.tc)} suốt` + (s.te ? ` + ${bar(s.te)} tăng cường gối` : '')],
    ['Thép dưới', `${bar(s.bc)} suốt` + (s.be ? ` + ${bar(s.be)} tăng cường nhịp` : '')],
    ['Đai', s.ss ? `Ø${s.ss[0]}a${s.ss[1]} đầu dầm · Ø${s.sm[0]}a${s.sm[1]} giữa nhịp` + (s.sets ? ` · ${s.sets} nhánh` : '') : '–'],
    s.side ? ['Thép giá', `${s.side[0]}Ø${s.side[1]} mỗi bên`] : null,
    ['Đáy dầm', `${fmtLv(LV['4FL'] - b.h)} (mặt sàn ${fmtLv(LV['4FL'])})`],
    ['Lớp bảo vệ', '35 mm'],
    ['Bê tông', 'C28/35'],
    ['Bản vẽ', 'S-31, S-32-02'],
  ].filter(Boolean)};
}
function infoPT(u) {
  const ends = u.le === 2 ? 'Kéo 2 đầu' : 'Kéo 1 đầu (' + (u.le === 0 ? 'đầu trái/dưới' : 'đầu phải/trên') + ')';
  return {title: `Cáp DƯL ${u.n} tao · phương ${u.ax}`, rows: [
    ['Vị trí', `${u.ax === 'X' ? 'y' : 'x'} = ${u.c.toFixed(2)} m · dài ${(u.b - u.a).toFixed(2)} m`],
    ['Cáp', `${u.n} × tao 15,24 mm Gr.270 · ống dẹt (45~90)×25`],
    ['Kéo căng', `${ends} · 195,4 kN/tao khi bê tông ≥ 25 MPa`],
    ['Cao độ tâm cáp', 'Trên gối 72,5 mm từ mặt sàn · giữa nhịp 52,5 mm từ đáy · neo 110'],
    ['Bản vẽ', 'S-32-01, S-00-01'],
  ]};
}
function infoSlab(x, y) {
  const L = {0: 'Lớp trên (ngoài)', 1: 'Lớp trên (trong)', 2: 'Lớp dưới (ngoài)', 3: 'Lớp dưới (trong)'}, rows = [];
  for (const [dir, a0, a1, r0, r1, d, s, n, code] of MD.BD_REG.typ.slab) {
    const [px, py] = dir === 0 ? [x, y] : [y, x];
    if (px >= a0 && px <= a1 && py >= r0 - 0.05 && py <= r1 + 0.05) rows.push([L[code] || 'Thép', `Ø${d}` + (n ? ` · ${n} thanh` : `a${s}`) + ` phương ${dir === 0 ? 'X' : 'Y'}`]);
  }
  if (!rows.length) rows.push(['Thép sàn', 'Thép phân bố theo S-32-02']);
  rows.push(['Sàn', 'Dày 220 · C28/35 · mặt sàn ' + fmtLv(LV['4FL'])]);
  return {title: `Sàn DƯL tầng 4 · tại x=${x.toFixed(1)}, y=${y.toFixed(1)}`, rows};
}

// ---------- dựng các cảnh ----------
const PICK = [];   // vật chọn được: {obj, info: fn(hit) → {title, rows}}
function pickBox(grp, x0, x1, y0, y1, z0, z1, info) { const m = box(x0, x1, y0, y1, z0, z1, M.conc); m.visible = false; m.userData.info = info; grp.add(m); return m; }

function inBeam(x, y, pad = 0) {
  for (const b of beamsReg()) {
    const [u, w] = b.o === 'EW' ? [x, y - b.c] : [y, x - b.c];
    if (u >= b.lo - pad && u <= b.hi + pad && Math.abs(w) <= b.b / 2 + pad) return b;
  }
  return null;
}
const inCol = (x, y, pad = 0.15) => MD.COLS.some(c => Math.abs(x - c.x) <= c.b/2 + pad && Math.abs(y - c.y) <= c.h/2 + pad);
const inside = (x, y) => x >= Math.max(RX0, EDGE) && x <= RX1 && y >= Math.max(RY0, EDGE) && y <= RY1;

// Cây chống thép Kumkang V4 (bản vẽ NCC): dài làm việc 2,6–4,0 m; ống ngoài Ø60,3×2,0 dài 1,7 m, ống trong Ø48,6×2,2;
// tải cho phép 1.800 kgf (thu ngắn) → 1.200 kgf (kéo dài hết); đế + mũ 140×140×5,5.
const V4 = {min: 2.6, max: 4.0, out: 1.7, pClosed: 17.65, pExt: 11.77};
const v4Cap = L => V4.pClosed + (V4.pExt - V4.pClosed) * Math.min(1, Math.max(0, (L - V4.min) / (V4.max - V4.min)));
const LIVE = 2.0, FORM = 0.25;   // kN/m²: tải thi công (TCVN 4453: 1,5–2,5), cốp pha nhôm
// Bước chống sơ bộ (chờ bản bố trí + thuyết minh của Kumkang): sàn 1,2 × 1,0 m; dầm 0,9 m dọc dầm, hàng cách ≤ 0,6 m.
function buildProps(zFloor, zTop) {
  const g = new THREE.Group(), P = [];
  const soffit = zTop - 0.22, deckB = soffit - 0.065, qS = 25 * 0.22 + FORM + LIVE;
  for (let x = EDGE + 0.6; x < RX1; x += 1.2) for (let y = EDGE + 0.5; y < RY1; y += 1.0)
    if (!inBeam(x, y, 0.1) && !inCol(x, y)) P.push({x, y, zt: deckB, a: 1.2, w: 1.0, q: qS, where: 'Dưới sàn dày 220'});
  for (const b of beamsReg()) {
    const nr = Math.max(1, Math.ceil(b.b / 0.6)), rows = Array.from({length: nr}, (_, i) => -b.b/2 + b.b*(i+0.5)/nr);
    const zb = zTop - b.h - 0.065, q = 25 * b.h + FORM + LIVE;
    for (let u = b.lo + 0.45; u < b.hi; u += 0.9) for (const w of rows) {
      const [x, y] = b.o === 'EW' ? [u, b.c + w] : [b.c + w, u];
      if (inside(x, y) && !inCol(x, y, 0.25)) P.push({x, y, zt: zb, a: 0.9, w: b.b / nr, q, where: `Dưới dầm ${b.did} ${mm(b.b)}×${mm(b.h)}`});
    }
  }
  const n = P.length, o = new THREE.Object3D();
  const gOut = new THREE.CylinderGeometry(0.0302, 0.0302, 1, 10); gOut.translate(0, 0.5, 0);
  const gIn = new THREE.CylinderGeometry(0.0243, 0.0243, 1, 10); gIn.translate(0, 0.5, 0);
  const gPl = new THREE.BoxGeometry(0.14, 0.0055, 0.14), gHd = new THREE.BoxGeometry(0.15, 0.1, 0.15);
  const mOut = new THREE.InstancedMesh(gOut, lam(0x3d7bd9), n), mIn = new THREE.InstancedMesh(gIn, lam(COL.prop), n);
  const mPl = new THREE.InstancedMesh(gPl, lam(0x8a96a3), 2 * n), mHd = new THREE.InstancedMesh(gHd, lam(0xf5c400), n);
  P.forEach((p, i) => {
    const L = p.zt - 0.1 - zFloor, zo = Math.min(V4.out, L);   // 0,1 m đầu chống / drop head trên cùng
    p.L = L; p.load = p.a * p.w * p.q; p.cap = v4Cap(L);
    o.rotation.set(0, 0, 0);
    o.position.copy(W(p.x, p.y, zFloor)); o.scale.set(1, zo, 1); o.updateMatrix(); mOut.setMatrixAt(i, o.matrix);
    o.position.copy(W(p.x, p.y, zFloor + zo)); o.scale.set(1, Math.max(0.01, L - zo), 1); o.updateMatrix(); mIn.setMatrixAt(i, o.matrix);
    o.scale.set(1, 1, 1); o.position.copy(W(p.x, p.y, zFloor + 0.003)); o.updateMatrix(); mPl.setMatrixAt(2 * i, o.matrix);
    o.position.copy(W(p.x, p.y, zFloor + L)); o.updateMatrix(); mPl.setMatrixAt(2 * i + 1, o.matrix);
    o.position.copy(W(p.x, p.y, zFloor + L + 0.05)); o.updateMatrix(); mHd.setMatrixAt(i, o.matrix);
  });
  const info = hit => {
    const p = P[hit && hit.instanceId != null ? hit.instanceId : 0], ok = p.L >= V4.min && p.L <= V4.max, r = p.load / p.cap;
    return {title: 'Cây chống thép Kumkang V4', rows: [
      ['Vị trí', `${p.where} · x=${p.x.toFixed(1)}, y=${p.y.toFixed(1)}`],
      ['Chiều dài làm việc', `${p.L.toFixed(2)} m ${ok ? '(trong phạm vi 2,6–4,0 m)' : '– NGOÀI phạm vi V4, cần loại khác'}`],
      ['Bước chống', `${p.a.toFixed(2)} × ${p.w.toFixed(2)} m (sơ bộ)`],
      ['Tải ước tính', `${p.load.toFixed(1)} kN (${p.q.toFixed(2)} kN/m² gồm bê tông, cốp pha, thi công ${LIVE})`],
      ['Tải cho phép', `≈ ${p.cap.toFixed(1)} kN ở chiều dài này · sử dụng ${(r * 100).toFixed(0)}%${r > 0.9 ? ' – SÁT GIỚI HẠN' : ''}`],
      ['Ống', 'Thép mạ kẽm: ngoài Ø60,3×2,0 · trong Ø48,6×2,2 có hàng lỗ chỉnh cao, đầu sơn đỏ · đế/mũ 140×140'],
      ['Tháo chống', 'Tháo tấm sàn sớm, giữ cây chống ≥ 21 ngày và sau khi kéo căng cáp'],
      ['Ghi chú', 'Bố trí sơ bộ – thay bằng bản bố trí + tính toán của Kumkang khi có'],
    ]};
  };
  for (const m of [mOut, mIn, mHd]) m.userData.info = info;
  g.add(mOut, mIn, mPl, mHd); g.userData.props = P; return g;
}
// Tấm cốp pha nhôm sàn 1200 × 600 × 65 (dựng từng tấm, có khe ghép), cốp pha đáy + thành dầm màu nhôm
function buildDeck(zTop) {
  const g = new THREE.Group(), soffit = zTop - 0.22, T = 0.065, gap = 0.004;
  const P = [];
  for (let x = EDGE; x < RX1 - 0.05; x += 1.2) for (let y = EDGE; y < RY1 - 0.05; y += 0.6) {
    const x1 = Math.min(x + 1.2, RX1), y1 = Math.min(y + 0.6, RY1), cx = (x + x1) / 2, cy = (y + y1) / 2;
    if (inBeam(cx, cy, -0.05) || inCol(cx, cy, 0)) continue;
    P.push([x, x1, y, y1]);
  }
  const geo = new THREE.BoxGeometry(1, T, 1), m = new THREE.InstancedMesh(geo, lam(0xc9d2db, {emissive: 0x5d6873}), P.length), o = new THREE.Object3D();
  P.forEach(([x0, x1, y0, y1], i) => {
    o.position.copy(W((x0 + x1) / 2, (y0 + y1) / 2, soffit - T / 2)); o.scale.set(x1 - x0 - gap, 1, y1 - y0 - gap); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
  });
  m.userData.info = hit => {
    const p = P[hit && hit.instanceId != null ? hit.instanceId : 0];
    return {title: 'Tấm cốp pha nhôm sàn', rows: [
      ['Kích thước tấm', `${mm(p[1] - p[0])} × ${mm(p[3] - p[2])} × 65 (tấm chuẩn 1200 × 600)`],
      ['Mặt cốp pha', fmtLv(soffit) + ' = đáy sàn dày 220'],
      ['Số tấm (vùng hiển thị)', `${P.length} tấm`],
      ['Đỡ bởi', 'Đầu chống (drop head) trên cây chống V4 – tháo tấm sớm, giữ đầu chống'],
      ['Ghi chú', 'Chia tấm sơ bộ – theo bản vẽ ST-form của Kumkang khi có'],
    ]};
  };
  // đường khe ghép tấm nhìn từ dưới lên
  const seg = []; for (const [x0, x1, y0, y1] of P) { const z = soffit - T - 0.002;
    seg.push(W(x0, y0, z), W(x1, y0, z), W(x1, y0, z), W(x1, y1, z), W(x1, y1, z), W(x0, y1, z), W(x0, y1, z), W(x0, y0, z)); }
  g.add(m, new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), new THREE.LineBasicMaterial({color: 0x39424c, clippingPlanes: CLIP})));
  for (const b of beamsReg()) {           // cốp pha dầm: đáy + 2 thành
    const hb = b.h, drop = hb - 0.22, zb = zTop - hb, fm = lam(0xaebccb, {emissive: 0x4a5560});
    const Pb = (u0, u1, w0, w1, z0, z1) => b.o === 'EW' ? box(u0, u1, b.c + w0, b.c + w1, z0, z1, fm) : box(b.c + w0, b.c + w1, u0, u1, z0, z1, fm);
    const parts = [Pb(b.lo, b.hi, -b.b/2, b.b/2, zb - T, zb), Pb(b.lo, b.hi, -b.b/2 - T, -b.b/2, zb - T, zb + drop), Pb(b.lo, b.hi, b.b/2, b.b/2 + T, zb - T, zb + drop)];
    for (const q of parts) { q.userData.info = () => ({title: `Cốp pha nhôm dầm ${b.did}`, rows: [['Đáy dầm', fmtLv(zb) + ` (h ${mm(hb)})`], ['Bề rộng', mm(b.b) + ' mm'], ['Thành dầm', `cao ${mm(drop)} dưới đáy sàn, dày 65`], ['Chống đáy', `V4, ${Math.max(1, Math.ceil(b.b / 0.6))} hàng, bước 0,9 m dọc dầm (sơ bộ)`]]}); g.add(q); }
  }
  return g;
}
function slabConcrete(zTop, op) {
  const g = new THREE.Group(), mat = ghost(COL.conc, op);
  const s = box(EDGE, RX1, EDGE, RY1, zTop - 0.22, zTop, mat); g.add(s);
  for (const b of beamsReg()) { const zb = zTop - b.h;
    g.add(b.o === 'EW' ? box(b.lo, b.hi, b.c - b.b/2, b.c + b.b/2, zb, zTop - 0.22, mat) : box(b.c - b.b/2, b.c + b.b/2, b.lo, b.hi, zb, zTop - 0.22, mat)); }
  return g;
}
function slabSteel(fl) {
  core();
  const g = new THREE.Group();
  const bm = BS.beam[fl].clone(), sl = BS.slab[fl].clone();
  thicken(bm); thicken(sl);
  bm.traverse(o => { if (o.userData && o.userData.kind === 'beam') { const b = o.userData.b; o.userData.info = () => infoBeam(b); } });
  g.add(bm, sl);
  // vùng chọn thép sàn
  const zt = LV[fl]; const p = pickBox(g, EDGE, RX1, EDGE, RY1, zt - 0.22, zt, null);
  p.userData.info = hit => { const pt = hit.point; return infoSlab(pt.x, -pt.z); }; p.userData.low = true;
  return g;
}
function slabPT(fl) {
  core();
  const g = BP.pt[fl].clone();
  g.traverse(o => { if (o.userData && o.userData.kind === 'pt') { const u = o.userData; o.userData.info = () => infoPT(u); } });
  return g;
}
function colSteel(id, s, clipLow) {
  core();
  const rec = colRec(id), grp = new THREE.Group(), src = RB.ST[s].grp;
  const cx = rec.c.x, cy = rec.c.y, hb = Math.max(rec.c.b, rec.c.h) / 2 + 0.2;
  for (const ch of src.children) {
    if (ch.userData.kind === 'col') { if (ch.userData.c.id !== id) continue; const m = ch.clone(); m.userData = {kind: 'col', info: () => infoCol(rec, s)}; grp.add(m); continue; }
    if (ch.userData.kind) continue;
    grp.add(ch.clone());
  }
  thicken(grp, () => COL.tie);
  // chỉ giữ phần thuộc cột này (+ cắt dưới cao độ chân nếu cần)
  const planes = [new THREE.Plane(new THREE.Vector3(1,0,0), -(cx - hb)), new THREE.Plane(new THREE.Vector3(-1,0,0), cx + hb),
                  new THREE.Plane(new THREE.Vector3(0,0,1), cy + hb), new THREE.Plane(new THREE.Vector3(0,0,-1), -(cy - hb))];
  if (clipLow != null) planes.push(new THREE.Plane(new THREE.Vector3(0,1,0), -clipLow));
  grp.traverse(o => { if (!o.material || o.userData.kind) return;
    const m = o.material.clone(); m.clippingPlanes = planes;
    if (!m.transparent && m.color && m.color.getHex() === COL.beamBar) m.color.setHex(COL.colBar);
    o.material = m; });
  return grp;
}
function colFormwork(c, z0, z1) {
  const g = new THREE.Group(), t = 0.065, m = ghost(COL.form, 0.6), x0 = c.x - c.b/2, x1 = c.x + c.b/2, y0 = c.y - c.h/2, y1 = c.y + c.h/2;
  for (const p of [box(x0 - t, x1 + t, y0 - t, y0, z0, z1, m), box(x0 - t, x1 + t, y1, y1 + t, z0, z1, m), box(x0 - t, x0, y0, y1, z0, z1, m), box(x1, x1 + t, y0, y1, z0, z1, m)]) {
    p.userData.info = () => ({title: 'Cốp pha nhôm cột C1', rows: [['Kích thước', `${mm(c.b)}×${mm(c.h)} · tấm dày 65`], ['Cao độ', `${fmtLv(z0)} → ${fmtLv(z1)} (đáy dầm)`], ['Kiểm tra', 'Tim cột, độ thẳng đứng ≤ H/1000']]});
    g.add(p);
  }
  const seg = []; for (let z = z0; z <= z1 + 1e-6; z += 0.6) { seg.push(W(x0 - t, y0 - t, z), W(x1 + t, y0 - t, z), W(x1 + t, y0 - t, z), W(x1 + t, y1 + t, z), W(x1 + t, y1 + t, z), W(x0 - t, y1 + t, z), W(x0 - t, y1 + t, z), W(x0 - t, y0 - t, z)); }
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), new THREE.LineBasicMaterial({color: 0x4b5763})));
  return g;
}
function phantomBox(x0, x1, y0, y1, z0, z1) { const m = box(x0, x1, y0, y1, z0, z1, PHANTOM); m.renderOrder = -1; m.userData.phantom = true; return m; }

// Bối cảnh toàn sàn (chỉ hiện ở chế độ 3D): cột, lõi, sàn dạng khối mờ để thấy vị trí ô sàn thí điểm trong cả mặt bằng
const BLD = [-0.455, 76.655, -0.455, 28.655];
function buildContext(name) {
  const g = new THREE.Group(), fl = (z0, z1, op) => {
    const m = new THREE.MeshLambertMaterial({color: COL.conc, transparent: true, opacity: op, depthWrite: false});
    const b = box(BLD[0], BLD[1], BLD[2], BLD[3], z0, z1, m); g.add(b);
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(b.geometry), new THREE.LineBasicMaterial({color: 0x6b7785})));
    for (const [, o, c, bw, h, lo, hi] of MD.BEAMS_ALL) {
      const e = o === 'EW' ? box(lo, hi, c - bw/2, c + bw/2, z1 - h, z0, m) : box(c - bw/2, c + bw/2, lo, hi, z1 - h, z0, m); g.add(e); }
  };
  const cols = (z0, z1, op) => {
    const m = new THREE.MeshLambertMaterial({color: 0x8d98a5, transparent: true, opacity: op, depthWrite: false});
    for (const c of MD.ALLCOLS) g.add(box(c.x - c.b/2, c.x + c.b/2, c.y - c.h/2, c.y + c.h/2, z0, z1, m));
    for (const k of MD.CORES) for (const [x1, y1, x2, y2, t] of k.walls) {
      const h = t / 2; g.add(box(Math.min(x1, x2) - h, Math.max(x1, x2) + h, Math.min(y1, y2) - h, Math.max(y1, y2) + h, z0, z1, m)); }
  };
  const z3 = LV['3FL'], z4 = LV['4FL'], z5 = LV['5FL'];
  if (name === 'lift1' || name === 'xrayCol1') { /* đã có lớp liên kết tổng thể trong cảnh */ }
  else if (name === 'lift4' || name === 'xraySlabT4') { fl(z4 - 0.22, z4, 0.16); cols(z4, z5 - 0.22, 0.12); fl(z5 - 0.22, z5, 0.06); }
  else { fl(z3 - 0.22, z3, 0.1); cols(z3, z4 - 0.22, 0.16); fl(z4 - 0.22, z4, 0.12); }
  g.userData.context = true; return g;
}

// Lớp LIÊN KẾT TỔNG THỂ tầng trệt (hiện cả ở AR): toàn bộ cột, vách lõi tầng 1 + dầm sàn T2; dầm nối vào cột C1 tô nổi.
// Lưới cột, dầm lấy theo bản vẽ tầng điển hình (cùng lưới trục) – CHỜ bản vẽ kết cấu sàn T2 để chỉnh đúng dầm tầng 2.
function buildLinks(z1, z2, focus) {
  const g = new THREE.Group(), near = (x, y) => Math.hypot(x - focus.x, y - focus.y);
  const mC = new THREE.MeshLambertMaterial({color: 0x9fb3c8, transparent: true, opacity: 0.22, depthWrite: false});
  const mW = new THREE.MeshLambertMaterial({color: 0x7f93a8, transparent: true, opacity: 0.2, depthWrite: false});
  const mB = new THREE.MeshLambertMaterial({color: 0xb9c6d3, transparent: true, opacity: 0.16, depthWrite: false});
  const mK = new THREE.MeshLambertMaterial({color: 0xff9a3c, transparent: true, opacity: 0.5, depthWrite: false});
  const edge = (m, col) => { const l = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({color: col})); l.position.copy(m.position); return l; };
  const top = z2 - 0.7;
  for (const c of MD.ALLCOLS) {
    if (near(c.x, c.y) < 0.1) continue;
    const b = box(c.x - c.b/2, c.x + c.b/2, c.y - c.h/2, c.y + c.h/2, z1, top, mC);
    b.userData.info = () => ({title: `Cột ${c.id} · ${c.type} · ${mm(c.b)}×${mm(c.h)}`, rows: [['Vị trí', `x = ${c.x.toFixed(2)}, y = ${c.y.toFixed(2)} m · cách cột C1 ${near(c.x, c.y).toFixed(1)} m`], ['Tầng', `Tầng 1: ${fmtLv(z1)} → đáy dầm T2 ≈ ${fmtLv(top)}`], ['Lưu ý', 'Lưới cột theo bản vẽ tầng điển hình – đối chiếu bản vẽ tầng trệt']]});
    g.add(b, edge(b, 0x9fb3c8));
    if (near(c.x, c.y) < 16) g.add(label(c.id.replace('-a', ''), c.x, c.y, top + 0.15, {fg: '#e8eef5', bg: 'rgba(30,40,52,.85)', h: 0.026}));
  }
  for (const k of MD.CORES) for (const [x1, y1, x2, y2, t] of k.walls) {
    const h = t / 2, b = box(Math.min(x1, x2) - h, Math.max(x1, x2) + h, Math.min(y1, y2) - h, Math.max(y1, y2) + h, z1, z2 - 0.22, mW);
    b.userData.info = () => ({title: `Vách lõi ${k.id}`, rows: [['Dày', `${mm(t)} mm`], ['Tầng', `Tầng 1: ${fmtLv(z1)} → ${fmtLv(z2)}`]]}); g.add(b);
  }
  for (const [did, o, c, bw, h, lo, hi] of MD.BEAMS_ALL) {
    const EWb = o === 'EW', hits = EWb ? Math.abs(c - focus.y) < focus.h / 2 + 0.05 && lo <= focus.x + 0.6 && hi >= focus.x - 0.6
                                     : Math.abs(c - focus.x) < focus.b / 2 + 0.05 && lo <= focus.y + 0.6 && hi >= focus.y - 0.6;
    const b = EWb ? box(lo, hi, c - bw/2, c + bw/2, z2 - h, z2 - 0.22, hits ? mK : mB) : box(c - bw/2, c + bw/2, lo, hi, z2 - h, z2 - 0.22, hits ? mK : mB);
    b.userData.info = () => ({title: `Dầm ${did} · ${mm(bw)}×${mm(h)}${hits ? ' – GỐI LÊN CỘT C1' : ''}`, rows: [['Phương', EWb ? 'Theo trục X' : 'Theo trục Y'], ['Đáy dầm', fmtLv(z2 - h)], ['Lưu ý', 'Dầm theo bản vẽ tầng điển hình – chờ bản vẽ sàn T2']]});
    g.add(b); if (hits) { g.add(edge(b, 0xff9a3c)); const mx = EWb ? (focus.x + (lo + hi > 2 * focus.x ? 1.6 : -1.6)) : c, my = EWb ? c : (focus.y + (lo + hi > 2 * focus.y ? 1.6 : -1.6));
      g.add(label(`Dầm ${did} ${mm(bw)}×${mm(h)} → cột C1`, mx, my, z2 - h - 0.12, {fg: '#151515', bg: 'rgba(255,154,60,.95)', h: 0.026})); }
  }
  const sl = box(BLD[0], BLD[1], BLD[2], BLD[3], z2 - 0.22, z2, new THREE.MeshLambertMaterial({color: COL.conc, transparent: true, opacity: 0.06, depthWrite: false}));
  g.add(sl, edge(sl, 0x6b7785));
  g.add(label('Sàn T2 ' + fmtLv(z2) + ' (tạm theo tầng điển hình)', focus.x + 2.2, focus.y + 2.2, z2 + 0.1, {fg: '#cfd8e3'}));
  g.userData.links = true; return g;
}

function buildScene(name) {
  core();
  const root = new THREE.Group(), steps = [], C1 = MD.COLS.find(c => c.id === 'C1-a');
  const zT3 = LV['3FL'], zT4 = LV['4FL'], zT5 = LV['5FL'];
  const add = (id, obj) => { obj.userData.step = id; root.add(obj); return obj; };
  if (name === 'slabT4') {
    // cấu kiện đã có (che khuất đúng): cột tầng 3
    for (const c of MD.COLS) root.add(phantomBox(c.x - c.b/2, c.x + c.b/2, c.y - c.h/2, c.y + c.h/2, zT3, zT4 - 0.7));
    const s1 = new THREE.Group(); s1.add(buildProps(zT3, zT4), buildDeck(zT4)); add('S4-1', s1);
    add('S4-2', slabSteel('4FL'));
    add('S4-3', slabPT('4FL'));
    const s4 = slabConcrete(zT4, 0.28); add('S4-4', s4);
    root.add(label('Mặt sàn T4 ' + fmtLv(zT4), C1.x + 1.2, C1.y + 1.2, zT4 + 0.15));
    root.add(label('Mặt sàn T3 ' + fmtLv(zT3), C1.x + 1.2, C1.y + 1.2, zT3 + 0.15, {fg: '#cfd8e3'}));
  } else if (name === 'colT4') {
    root.add(phantomBox(EDGE, RX1, EDGE, RY1, zT4 - 0.22, zT4));
    const s1 = new THREE.Group(); s1.add(colSteel('C1-a', 3, zT4)); add('C4-1', s1);
    const rec = colRec('C1-a'), e = rec.st[2];
    if (e.lap) { const lp = box(C1.x - C1.b/2 - 0.04, C1.x + C1.b/2 + 0.04, C1.y - C1.h/2 - 0.04, C1.y + C1.h/2 + 0.04, e.lap.z0, e.lap.z2, M.lap1); lp.userData.step = 'C4-1'; root.add(lp);
      root.add(label(`Vùng nối 2 nhóm ${fmtLv(e.lap.z0)} → ${fmtLv(e.lap.z2)}`, C1.x + C1.b/2 + 0.15, C1.y, (e.lap.z0 + e.lap.z2) / 2)); }
    add('C4-3', colFormwork(C1, zT4, zT5 - 0.7));
    const cc = box(C1.x - C1.b/2, C1.x + C1.b/2, C1.y - C1.h/2, C1.y + C1.h/2, zT4, zT5 - 0.7, ghost(COL.conc, 0.3)); cc.userData.info = () => infoCol(rec, 3); add('C4-4', cc);
    root.add(label('Đỉnh cột = đáy dầm ' + fmtLv(zT5 - 0.7), C1.x + C1.b/2 + 0.15, C1.y, zT5 - 0.7));
    root.add(label('Mặt sàn T4 ' + fmtLv(zT4), C1.x + C1.b/2 + 0.15, C1.y, zT4 + 0.1, {fg: '#cfd8e3'}));
  } else if (name === 'propsT4') {
    // Đứng ở sàn T3 (đợt C3 + S4 đã đổ toàn khối): việc sắp tới dưới sàn T4
    for (const c of MD.COLS) root.add(phantomBox(c.x - c.b/2, c.x + c.b/2, c.y - c.h/2, c.y + c.h/2, zT3, zT4 - 0.7));
    root.add(phantomBox(EDGE, RX1, EDGE, RY1, zT4 - 0.22, zT4));
    const sc = slabConcrete(zT4, 0.12); sc.userData.only3d = true; root.add(sc);
    // P4-1: toàn bộ cốp pha nhôm sàn T4 đang giữ (tấm sàn, dầm xương, góc sàn, đáy + thành dầm) – đây là phần sẽ tháo sớm
    // P4-2, P4-3: sau tháo sớm chỉ còn cây chống + đầu chống PH/PHS
    const full = AL.slab(beamsReg(), zT3, zT4, EDGE, 'full'); add('P4-1', full.grp);
    const al = AL.slab(beamsReg(), zT3, zT4, EDGE, 'early'); const g2 = new THREE.Group(); g2.add(al.grp); add('P4-2', g2);
    const g3 = new THREE.Group(); g3.add(AL.slab(beamsReg(), zT3, zT4, EDGE, 'early').grp); add('P4-3', g3);
    root.userData.bom = {'P4-1': AL.bomRows(full.bom), 'P4-2': AL.bomRows(al.bom)};
    g2.add(slabPT('4FL'));
    root.add(label('Đáy sàn T4 ' + fmtLv(zT4 - 0.22), C1.x + 1.6, C1.y + 1.6, zT4 - 0.35));
    root.add(label('Mặt sàn T3 ' + fmtLv(zT3), C1.x + 1.6, C1.y + 1.6, zT3 + 0.15, {fg: '#cfd8e3'}));
  } else if (name === 'lift4') {
    // Đứng trên sàn T4: đợt kế tiếp C4 + S5, cốp pha nhôm, đổ toàn khối
    root.add(phantomBox(EDGE, RX1, EDGE, RY1, zT4 - 0.22, zT4));
    const rec = colRec('C1-a'), e = rec.st[2], top = zT5 - 0.7;
    const s1 = new THREE.Group(); s1.add(colSteel('C1-a', 3, zT4));
    if (e.lap) s1.add(box(C1.x - C1.b/2 - 0.04, C1.x + C1.b/2 + 0.04, C1.y - C1.h/2 - 0.04, C1.y + C1.h/2 + 0.04, e.lap.z0, e.lap.z2, M.lap1));
    add('L4-1', s1);
    const alc = AL.column(C1, zT4, top, EDGE); add('L4-2', alc.grp);
    const als = AL.slab(beamsReg(), zT4, zT5, EDGE, 'full'); add('L4-3', als.grp);
    root.userData.bom = {'L4-2': AL.bomRows(alc.bom), 'L4-3': [['Cây chống làm việc lớn nhất', `${(als.maxU * 100).toFixed(0)}% tải cho phép V4`]].concat(AL.bomRows(als.bom))};
    add('L4-4', slabSteel('5FL'));
    add('L4-5', slabPT('5FL'));
    const s7 = new THREE.Group(), cc = box(C1.x - C1.b/2, C1.x + C1.b/2, C1.y - C1.h/2, C1.y + C1.h/2, zT4, top, ghost(COL.conc, 0.3));
    cc.userData.info = () => infoCol(rec, 3); s7.add(cc, slabConcrete(zT5, 0.28)); add('L4-7', s7);
    if (e.lap) root.add(label(`Nối thép cột ${fmtLv(e.lap.z0)} → ${fmtLv(e.lap.z2)}`, C1.x + C1.b/2 + 0.6, C1.y, (e.lap.z0 + e.lap.z2) / 2));
    root.add(label('Mặt sàn T5 ' + fmtLv(zT5), C1.x + 1.6, C1.y + 1.6, zT5 + 0.15));
    root.add(label('Mặt sàn T4 ' + fmtLv(zT4), C1.x + 1.6, C1.y + 1.6, zT4 + 0.15, {fg: '#cfd8e3'}));
  } else if (name === 'lift1' || name === 'xrayCol1') {
    // Tầng trệt: cột C1 tầng 1 (+1.325 → +5.925) đang buộc thép. Đáy dầm T2 tạm lấy dầm cao 700 – chờ bản vẽ sàn T2.
    const z1 = LV['1FL'], z2 = LV['2FL'], top = z2 - 0.7, rec = colRec('C1-a'), e = rec.st[0];
    root.add(phantomBox(EDGE, RX1, EDGE, RY1, z1 - 0.25, z1));
    const xr = C1.x + C1.b/2 + 0.12;
    if (name === 'xrayCol1') {
      const cc = box(C1.x - C1.b/2, C1.x + C1.b/2, C1.y - C1.h/2, C1.y + C1.h/2, z1, top, ghost(COL.conc, 0.12)); cc.userData.info = () => infoCol(rec, 0); root.add(cc);
      root.add(colSteel('C1-a', 0, z1));
      root.add(label(`${e.n}Ø${e.d} · đai Ø${e.td}a${mm(e.ts)} · BV 40`, xr, C1.y, z1 + 2.4));
      if (e.lap) root.add(label(`Thép chờ lên T2: tới ${fmtLv(e.lap.z2)}`, xr, C1.y, z2 + 0.6));
      root.add(label('Đỉnh cột = đáy dầm T2 ' + fmtLv(top) + ' (tạm)', xr, C1.y, top));
    } else {
      const s1 = new THREE.Group(); s1.add(colSteel('C1-a', 0, z1));
      if (e.lap) s1.add(box(C1.x - C1.b/2 - 0.04, C1.x + C1.b/2 + 0.04, C1.y - C1.h/2 - 0.04, C1.y + C1.h/2 + 0.04, e.lap.z0, e.lap.z2, M.lap1));
      add('L1-1', s1);
      const alc = AL.column(C1, z1, top, EDGE); add('L1-2', alc.grp);
      root.userData.bom = {'L1-2': AL.bomRows(alc.bom)};
      const cc = box(C1.x - C1.b/2, C1.x + C1.b/2, C1.y - C1.h/2, C1.y + C1.h/2, z1, top, ghost(COL.conc, 0.3)); cc.userData.info = () => infoCol(rec, 0); add('L1-3', cc);
      // bước đổ bê tông: thể hiện các lớp đổ 0,5 m và ống đổ
      { const g3 = new THREE.Group(); for (let zz = z1 + 0.5; zz < top - 0.05; zz += 0.5) { const r = box(C1.x - C1.b/2 - 0.012, C1.x + C1.b/2 + 0.012, C1.y - C1.h/2 - 0.012, C1.y + C1.h/2 + 0.012, zz - 0.01, zz + 0.01, lam(0x3ddc84)); g3.add(r); }
        const tube = []; prismSeg(tube, W(C1.x, C1.y, z1 + 0.6), W(C1.x, C1.y, top + 1.2), 0.075); const tm = meshFrom(tube, lam(0x4a5560)); tm.userData.info = () => ({title: 'Ống đổ (vòi voi) Ø150', rows: [['Mục đích', 'Chiều cao rơi tự do ≈ 3,9 m > 1,5 m: dùng ống đổ chống phân tầng, nâng dần theo lớp'], ['Lớp đổ', 'Mỗi lớp 0,4–0,5 m, đầm dùi kỹ từng lớp']]}); g3.add(tm);
        g3.add(label('Đổ từng lớp 0,5 m', C1.x + C1.b/2 + 0.6, C1.y, z1 + 1.0, {fg: '#151515', bg: 'rgba(61,220,132,.95)', h: 0.026})); g3.userData.step = 'L1-3'; root.add(g3); }
      if (e.lap) root.add(label(`Nối thép lên T2 ${fmtLv(e.lap.z0)} → ${fmtLv(e.lap.z2)}`, xr + 0.5, C1.y, (e.lap.z0 + e.lap.z2) / 2));
      root.add(label('Đáy dầm T2 ' + fmtLv(top) + ' (tạm)', xr + 0.5, C1.y, top));
    }
    root.add(label('Mặt sàn trệt ' + fmtLv(z1), C1.x + 1.6, C1.y + 1.6, z1 + 0.12, {fg: '#cfd8e3'}));
    root.add(buildLinks(z1, z2, C1));
  } else if (name === 'xrayColT3') {
    const rec = colRec('C1-a'), e = rec.st[2];
    const cc = box(C1.x - C1.b/2, C1.x + C1.b/2, C1.y - C1.h/2, C1.y + C1.h/2, zT3, zT4 - 0.7, ghost(COL.conc, 0.18)); cc.userData.info = () => infoCol(rec, 2); root.add(cc);
    root.add(colSteel('C1-a', 2, zT3));
    root.add(colSteel('C1-a', 1, zT3));
    const xr = C1.x + C1.b/2 + 0.12;
    root.add(label(`36Ø25 · đai Ø12a100 · BV 40`, xr, C1.y, zT3 + 2.6));
    if (rec.st[1] && rec.st[1].lap) root.add(label(`Nối từ T2: ${fmtLv(rec.st[1].lap.z0)} → ${fmtLv(rec.st[1].lap.z2)}`, xr, C1.y, rec.st[1].lap.z1));
    if (e.lap) root.add(label(`Thép chờ lên T4: tới ${fmtLv(e.lap.z2)}`, xr, C1.y, zT4 + 0.6));
    root.add(label('Mặt sàn T3 ' + fmtLv(zT3), xr, C1.y, zT3 + 0.08, {fg: '#cfd8e3'}));
  } else if (name === 'xraySlabT4') {
    root.add(slabConcrete(zT4, 0.14));
    root.add(slabSteel('4FL'), slabPT('4FL'));
    root.add(label('Mặt sàn T4 ' + fmtLv(zT4), C1.x + 1.2, C1.y + 1.2, zT4 + 0.12));
  }
  root.userData.steps = STEPS[name] || [];
  return root;
}

// ---------- trạng thái theo tiến độ + nghiệm thu ----------
function stepStatus(st) {
  const rec = NT.records.filter(r => r.step === st.id);
  const tick = rec.find(r => typeof r.done === 'boolean');
  if (tick) return tick.done ? 'done' : 'todo';
  const to = new Date(st.to + 'T23:59:59'), from = new Date(st.from + 'T00:00:00');
  if (TODAY > to) return 'done';
  if (TODAY >= from) return 'now';
  return 'todo';
}

// ---------- 3D: renderer, scene ----------
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true, preserveDrawingBuffer: !!qs.get('shot')});
renderer.localClippingEnabled = true; renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 0.9));
const sun = new THREE.DirectionalLight(0xffffff, 0.55); sun.position.set(30, 60, 20); scene.add(sun);
// môi trường phản chiếu cho kim loại (nhôm, thép): trời sáng phía trên, nền công trường xám phía dưới
(function envMap() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, '#eef4fa'); gr.addColorStop(0.45, '#c9d4de'); gr.addColorStop(0.55, '#8d959c'); gr.addColorStop(1, '#4a5056');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(t).texture; pm.dispose();
})();
const camAR = new THREE.PerspectiveCamera(60, 1, 0.05, 200); camAR.matrixAutoUpdate = false;
const cam3D = new THREE.PerspectiveCamera(50, 1, 0.05, 500);
let controls = null, cur = null, curTag = null, curEl = null, curMode = null, view = 'home';
const shown = new Set();

function setContent(sceneName) {
  if (cur) scene.remove(cur);
  cur = buildScene(sceneName);
  if (view === '3d') cur.add(buildContext(sceneName));
  else { cur.traverse(o => { if (o.userData.only3d) o.visible = false; }); arLook(cur); }
  scene.add(cur);
  const isNext = curMode === 'next';
  shown.clear();
  // 'sắp tới': mặc định hiện bước kế tiếp chưa xong; chạm thẻ bước để thêm/bớt. 'đã thi công': hiện tất cả.
  const st0 = cur.userData.steps.filter(st => !isNext || stepStatus(st) !== 'done');
  for (const st of (isNext ? st0.slice(0, 1) : st0)) shown.add(st.id);
  applySteps(); renderSteps();
}
// Chế độ AR (camera): mô hình bán trong suốt để vẫn thấy cấu kiện thật phía sau, dễ đối chiếu
function arLook(root, op = 0.5) {
  root.traverse(o => { if (!o.material || o.userData.phantom || o.isSprite || (o.parent && o.parent.userData.links)) return;
    const one = m => { if (m.colorWrite === false) return m; const c = m.clone(); c.transparent = true; c.opacity = Math.min(m.opacity ?? 1, op); c.depthWrite = false; return c; };
    o.material = Array.isArray(o.material) ? o.material.map(one) : one(o.material); });
}
function stepGo(d) {
  if (!cur) return; const st = cur.userData.steps; if (!st.length) return;
  const on = st.map((x, i) => shown.has(x.id) ? i : -1).filter(i => i >= 0), i0 = on.length ? (d > 0 ? Math.max(...on) : Math.min(...on)) : -1;
  const i = Math.max(0, Math.min(st.length - 1, i0 + d)); shown.clear(); shown.add(st[i].id); applySteps(); renderSteps();
  showInfo(stepInfo(st[i], (cur.userData.bom || {})[st[i].id] || []));
  const b = document.querySelector(`.step[data-id="${st[i].id}"]`); b && b.scrollIntoView({inline: 'center', behavior: 'smooth'});
}
function navText() { const el = $('#sn-t'); if (!el || !cur) return; const st = cur.userData.steps, on = st.map((x, i) => shown.has(x.id) ? i + 1 : 0).filter(Boolean);
  $('#stepnav').hidden = st.length < 2; el.textContent = on.length === 1 ? `Bước ${on[0]}/${st.length}: ${st[on[0] - 1].name}` : `${on.length} bước đang hiện / ${st.length}`;
  $('#sn-prev').disabled = !on.length || on[0] === 1; $('#sn-next').disabled = !on.length || on[on.length - 1] === st.length; }
function applySteps() { if (!cur) return; for (const ch of cur.children) if (ch.userData.step) ch.visible = shown.has(ch.userData.step); }

// ---------- giao diện ----------
function show(id) { for (const el of document.querySelectorAll('.view')) el.hidden = el.id !== id; }
function statusChip(s) { return {done: '<span class="chip ok">Đã xong</span>', now: '<span class="chip now">Đang làm</span>', todo: '<span class="chip">Sắp tới</span>'}[s]; }
function renderSteps() { setTimeout(navText, 0);
  const box = $('#steps'), steps = cur ? cur.userData.steps : [];
  box.hidden = !steps.length;
  box.innerHTML = steps.map((st, i) => {
    const s = stepStatus(st), on = shown.has(st.id), dis = curMode === 'next' && s === 'done';
    return `<button class="step ${on ? 'on' : ''}" data-id="${st.id}" ${dis ? 'disabled' : ''}><b>${i + 1}</b><span>${st.name}<small>${fmtDate(st.from)}${st.to !== st.from ? ' – ' + fmtDate(st.to) : ''}</small></span>${statusChip(s)}</button>`;
  }).join('');
}
$('#steps').addEventListener('click', e => {
  const b = e.target.closest('.step'); if (!b || b.disabled) return;
  const id = b.dataset.id; shown.has(id) ? shown.delete(id) : shown.add(id); applySteps(); renderSteps();
  const st = cur.userData.steps.find(s => s.id === id), bom = (cur.userData.bom || {})[id] || [];
  if (shown.has(id)) showInfo(stepInfo(st, bom));
});

// Thẻ đầy đủ của 1 bước: thời gian, trạng thái, ai làm, điều kiện bắt đầu, biện pháp, nhân lực, kiểm tra, an toàn, hồ sơ, bản vẽ, khối lượng
function stepInfo(st, bom) {
  const S = {done: 'Đã xong', now: 'Đang làm', todo: 'Sắp tới'}[stepStatus(st)];
  const nhs = (NT.records || []).concat(apiRecs || []).filter(r => r.step === st.id).length;
  const H = t => ['—', `<b>${t}</b>`];
  const rows = [['Thời gian', `${fmtDate(st.from)}${st.to !== st.from ? ' – ' + fmtDate(st.to) : ''} · ${S} (dự kiến theo Tiến độ Rev02)`]];
  if (st.ai) rows.push(['Đơn vị thực hiện', st.ai]);
  if (st.dk) rows.push(['Điều kiện bắt đầu', st.dk]);
  rows.push(H('Biện pháp thi công')); st.method.forEach((m, i) => rows.push([String(i + 1), m]));
  if (st.nl) rows.push(['Nhân lực, thiết bị', st.nl + ' <i>(ước tính)</i>']);
  if (st.kt) rows.push(['Kiểm tra, nghiệm thu', st.kt]);
  if (st.at) rows.push(['An toàn', st.at]);
  if (st.hs) rows.push(['Hồ sơ cần có', st.hs + `<br><span style="color:var(--acc)">Đã tải lên: ${nhs} hồ sơ</span>`]);
  if (st.bv) rows.push(['Bản vẽ, tài liệu', st.bv]);
  if (bom && bom.length) rows.push(H('Thống kê cấu kiện (mô phỏng)'), ...bom);
  return {title: st.name, rows};
}
function placeInfo() { const sb = $('#steps'), el = $('#info'); if (!el) return; const sn = $('#stepnav'), h = (sb && !sb.hidden ? sb.offsetHeight : 0) + (sn && !sn.hidden ? 56 : 0); el.style.bottom = `calc(env(safe-area-inset-bottom) + ${Math.max(h, 12) + 10}px)`; el.style.maxHeight = `calc(100% - ${h + 150}px)`; }
addEventListener('resize', () => placeInfo());
function showInfo(inf) { placeInfo();
  const el = $('#info'); if (!inf) { el.hidden = true; return; }
  el.innerHTML = `<button class="x" aria-label="Đóng">×</button><h3>${inf.title}</h3><dl>${inf.rows.map(([k, v]) => k === '—' ? `<div class="sec">${v}</div>` : `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
  el.hidden = false;
}
$('#info').addEventListener('click', e => { if (e.target.classList.contains('x')) showInfo(null); });

function openTag(tok) {
  const t = TAGS[tok]; if (!t) return false;
  curTag = tok; curEl = ELEMS[t.el];
  $('#el-title').textContent = curEl.title; $('#el-sub').textContent = curEl.sub; $('#el-face').textContent = 'Tem: ' + t.face;
  $('#b-next').querySelector('b').textContent = curEl.next.label; $('#b-next').querySelector('small').textContent = curEl.next.hint;
  $('#b-built').querySelector('b').textContent = curEl.built.label; $('#b-built').querySelector('small').textContent = curEl.built.hint;
  const nrec = NT.records.filter(r => r.el === t.el).length;
  $('#b-nt').querySelector('small').textContent = nrec ? `${nrec} hồ sơ` : 'Chưa có hồ sơ';
  return true;
}
function goHome() { if (view === 'xr' && typeof XR !== 'undefined') { XR.end(); return; } stopAR(); view = 'home'; show('v-home'); $('#home-tag').hidden = !curEl; $('#home-scan').hidden = !!curEl; }

// ---------- chế độ 3D (không camera) ----------
function start3D(mode) {
  curMode = mode; stopAR(); view = '3d'; show('v-run'); document.body.classList.add('m3d'); document.body.classList.remove('mar');
  setTopbar();
  setContent(curEl[mode].scene);
  const t = TAGS[curTag]; const o = W(...t.o);
  if (!controls) { controls = new THREE.OrbitControls(cam3D, canvas); controls.enableDamping = true; }
  // nhìn từ trong nhà về góc trục 2.A/2.1: thấy rõ ô sàn quanh cột C1, phía sau là toàn sàn mờ
  const sc = curEl[mode].scene, zc = (sc === 'lift4' || sc === 'xraySlabT4' ? LV['4FL'] : LV['3FL']) + 2.0;
  let tgt, pos;
  if (sc === 'lift1' || sc === 'xrayCol1') { const z1 = LV['1FL']; tgt = W(1.5, 1.5, z1 + 2.4); pos = W(11, 9, z1 + 4.2); }
  else if (sc.startsWith('xrayCol')) { tgt = W(0.07, 0.07, zc); pos = W(3.2, 2.6, zc + 0.8); }
  else if (sc === 'propsT4') { tgt = W(4.0, 5.5, LV['3FL'] + 3.0); pos = W(10.5, 12.5, LV['3FL'] + 1.6); }   // đứng ở sàn T3 nhìn rừng cây chống dưới sàn T4
  else { tgt = W(4.5, 5.5, zc); pos = W(15, 16, zc + 5.5); }
  controls.target.copy(tgt); cam3D.position.copy(pos); controls.update();
  markTag(true); resize();
}
let tagMark = null;
function markTag(on) {
  if (tagMark) { scene.remove(tagMark); tagMark = null; }
  if (!on || !curTag) return;
  const t = TAGS[curTag], s = SITE.qrSize, u = W(...t.u).sub(W(0,0,0)), v = W(...t.v).sub(W(0,0,0)), o = W(...t.o);
  const n = new THREE.Vector3().crossVectors(u, v);
  const g = new THREE.PlaneGeometry(s, s), m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({color: 0xffd23f, side: THREE.DoubleSide}));
  const mtx = new THREE.Matrix4().makeBasis(u, v.clone().negate(), n.clone().negate()); m.quaternion.setFromRotationMatrix(mtx); m.position.copy(o).addScaledVector(n, -0.004);
  tagMark = new THREE.Group(); tagMark.add(m, label('Vị trí tem', 0, 0, 0, {fg: '#111', bg: 'rgba(255,210,63,.95)', h: 0.035}));
  tagMark.children[1].position.copy(o).addScaledVector(n, -0.05); scene.add(tagMark);
}
function setTopbar() {
  $('#tb-title').textContent = curEl.title; $('#tb-mode').textContent = curEl[curMode].label;
}

// ---------- chế độ AR (camera) ----------
const video = $('#cam'), grab = document.createElement('canvas'), gctx = grab.getContext('2d', {willReadFrequently: true});
let stream = null, worker = null, busy = false, arOn = false, hfov = 66;
try { hfov = +localStorage.getItem('hfov') || 66; } catch (e) {}
let K = null, poseCam = null, lastSeen = 0, devQ = null, poseQ = null, lostQ = null;
const F = new THREE.Matrix4().makeScale(1, -1, -1);
const devQuat = new THREE.Quaternion();
let haveGyro = false;

function onOrient(e) {
  if (e.alpha == null) return; haveGyro = true;
  const z = new THREE.Vector3(0, 0, 1), euler = new THREE.Euler(), q0 = new THREE.Quaternion(), q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
  const deg = Math.PI / 180, orient = (screen.orientation && screen.orientation.angle || window.orientation || 0) * deg;
  euler.set(e.beta * deg, e.alpha * deg, -e.gamma * deg, 'YXZ');
  devQuat.setFromEuler(euler); devQuat.multiply(q1); devQuat.multiply(q0.setFromAxisAngle(z, -orient));
}
// Trình duyệt nhúng trong Zalo / Facebook / Messenger… không cho dùng camera + AR → hướng dẫn mở bằng Chrome / Safari
const UA = navigator.userAgent, IN_APP = /Zalo|FBAN|FBAV|FB_IAB|Instagram|Line\/|Messenger|; wv\)/i.test(UA), IS_IOS = /iPad|iPhone|iPod/.test(UA);
function inAppNote() {
  const el = $('#inapp'); if (!el) return; el.hidden = !IN_APP; if (!IN_APP) return;
  const tok = (location.hash || '').slice(1), base = location.href.replace(/#.*/, '').replace(/^https?:\/\//, ''), url = tok ? base + (base.includes('?') ? '&' : '?') + 't=' + tok : base;
  el.innerHTML = IS_IOS
    ? '<b>Đang mở trong ứng dụng khác (Zalo…) – camera và AR không chạy.</b><br>Bấm <b>⋯</b> góc trên → <b>Mở bằng Safari</b>. Hoặc quét tem bằng ứng dụng <b>Camera</b> của iPhone.'
    : `<b>Đang mở trong ứng dụng khác (Zalo…) – camera và AR không chạy.</b><br><a class="btn" href="intent://${url}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(location.href)};end${location.hash ? '' : ''}">Mở bằng Chrome</a> hoặc bấm <b>⋮</b> → <b>Mở bằng trình duyệt</b>. Lần sau quét tem bằng ứng dụng Camera hoặc Chrome.`;
}
async function startAR(mode) {
  curMode = mode; view = 'ar'; show('v-run'); document.body.classList.add('mar'); document.body.classList.remove('m3d');
  setTopbar(); setContent(curEl[mode].scene); markTag(false);
  setStatus('Đang mở camera…', 'wait');
  try {
    if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') DeviceOrientationEvent.requestPermission().then(r => { if (r === 'granted') addEventListener('deviceorientation', onOrient); }).catch(() => {});
    else addEventListener('deviceorientation', onOrient);
    stream = await navigator.mediaDevices.getUserMedia({audio: false, video: {facingMode: {ideal: 'environment'}, width: {ideal: +(qs.get('cw') || 1280)}, height: {ideal: +(qs.get('ch') || 720)}}});
  } catch (err) {
    setStatus(IN_APP ? 'Trình duyệt trong Zalo/Facebook không cho dùng camera – mở trang bằng Chrome hoặc Safari. Đang chuyển sang xem 3D.' : 'Không mở được camera – kiểm tra quyền camera của trình duyệt. Đang chuyển sang xem 3D.', 'bad');
    setTimeout(() => start3D(mode), 2200); return;
  }
  video.srcObject = stream; await video.play().catch(() => {});
  arOn = true; poseCam = null;
  if (!worker) { worker = new Worker('js/qr_worker.js'); worker.onmessage = onDetect; }
  setStatus('Hướng camera vào tem QR', 'wait');
  resize();
}
function stopAR() {
  arOn = false; busy = false; poseCam = null;
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  video.srcObject = null; document.body.classList.remove('mar');
}
function setStatus(t, k) { const el = $('#status'); el.textContent = t; el.className = 'status ' + (k || ''); }

function intrinsics(w, h) { const f = Math.max(w, h) / 2 / Math.tan(hfov * Math.PI / 360); return {fx: f, fy: f, cx: w / 2, cy: h / 2, w, h}; }
function setProj(k) {
  const n = 0.05, f = 200, P = camAR.projectionMatrix;
  P.set(2*k.fx/k.w, 0, 1 - 2*k.cx/k.w, 0,
        0, 2*k.fy/k.h, 2*k.cy/k.h - 1, 0,
        0, 0, -(f+n)/(f-n), -2*f*n/(f-n),
        0, 0, -1, 0);
  camAR.projectionMatrixInverse.copy(P).invert();
}
let BD = null; try { if ('BarcodeDetector' in window) BarcodeDetector.getSupportedFormats().then(f => { if (f.includes('qr_code')) BD = new BarcodeDetector({formats: ['qr_code']}); }).catch(() => {}); } catch (e) {}
// góc mã theo thứ tự trên-trái, trên-phải, dưới-phải, dưới-trái của MÃ: chọn vòng quay khớp góc 3 ô định vị (dựa vào hướng con quay nếu có)
function bdCorners(pts) {
  // BarcodeDetector trả góc theo ảnh; tem đứng (mũi tên lên) và máy cầm dọc → góc trên-trái ảnh ≈ góc trên-trái mã
  const c = pts.slice(), s = c.map(p => p.x + p.y); let k = s.indexOf(Math.min(...s));
  const o = [0, 1, 2, 3].map(i => c[(k + i) % 4]);
  // đảm bảo chiều kim đồng hồ trên ảnh
  const cr = (o[1].x - o[0].x) * (o[3].y - o[0].y) - (o[1].y - o[0].y) * (o[3].x - o[0].x); if (cr < 0) [o[1], o[3]] = [o[3], o[1]];
  return {topLeftCorner: o[0], topRightCorner: o[1], bottomRightCorner: o[2], bottomLeftCorner: o[3]};
}
function grabFrame() {
  const vw = video.videoWidth, vh = video.videoHeight; if (!vw) return;
  const tg = curTag && TAGS[curTag], upright = tg && Math.abs(tg.v[2] + 1) < 1e-6;   // tem đứng: dùng bộ đọc nhanh
  if (BD && upright) {
    busy = true; const q = haveGyro ? devQuat.clone() : null;
    BD.detect(video).then(r => { poseQ = q; const b = r && r[0];
      onDetect({data: b && b.cornerPoints && b.cornerPoints.length === 4 ? {text: b.rawValue, loc: bdCorners(b.cornerPoints), sc: 1} : {text: null, loc: null, sc: 1}}); })
      .catch(() => { BD = null; busy = false; });
    return;
  }
  const sc = Math.min(1, 960 / Math.max(vw, vh)), w = Math.round(vw * sc), h = Math.round(vh * sc);
  if (grab.width !== w || grab.height !== h) { grab.width = w; grab.height = h; }
  gctx.drawImage(video, 0, 0, w, h);
  const im = gctx.getImageData(0, 0, w, h);
  busy = true; poseQ = haveGyro ? devQuat.clone() : null;
  worker.postMessage({w, h, sc, buf: im.data.buffer}, [im.data.buffer]);
}
// Homography 4 điểm (mặt phẳng tem → ảnh)
function homography(src, dst) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) { const [X, Y] = src[i], [u, v] = dst[i];
    A.push([X, Y, 1, 0, 0, 0, -u*X, -u*Y]); b.push(u); A.push([0, 0, 0, X, Y, 1, -v*X, -v*Y]); b.push(v); }
  for (let c = 0; c < 8; c++) { let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]]; const d = A[c][c]; if (Math.abs(d) < 1e-12) return null;
    for (let r = 0; r < 8; r++) if (r !== c) { const f = A[r][c] / d; for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; } }
  const h = b.map((v, i) => v / A[i][i]); return [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]];
}
function poseFromH(H, k) {
  const inv = (c) => [(H[0][c] - k.cx * H[2][c]) / k.fx, (H[1][c] - k.cy * H[2][c]) / k.fy, H[2][c]];
  const a1 = new THREE.Vector3(...inv(0)), a2 = new THREE.Vector3(...inv(1)), a3 = new THREE.Vector3(...inv(2));
  let lam = 2 / (a1.length() + a2.length()); if (a3.z * lam < 0) lam = -lam;
  const r1 = a1.multiplyScalar(lam).normalize(), r2 = a2.multiplyScalar(lam).normalize(), t = a3.multiplyScalar(lam);
  const p = r1.clone().add(r2).normalize(), q = r1.clone().sub(r2).normalize();
  const R1 = p.clone().add(q).normalize(), R2 = p.clone().sub(q).normalize(), R3 = new THREE.Vector3().crossVectors(R1, R2);
  return new THREE.Matrix4().set(R1.x, R2.x, R3.x, t.x, R1.y, R2.y, R3.y, t.y, R1.z, R2.z, R3.z, t.z, 0, 0, 0, 1);
}
// Dùng trọng lực (cảm biến điện thoại) khoá phương thẳng đứng, rồi tinh chỉnh góc xoay ngang + vị trí theo 4 góc tem.
// Tem nhỏ chỉ cho hướng nghiêng kém chính xác; trọng lực chính xác ~1°, giúp hình ở xa tem bớt lệch.
function refineGravity(T, tok, q, src, dst, k) {
  const e = T.elements, R = new THREE.Matrix3().set(e[0], e[4], e[8], e[1], e[5], e[9], e[2], e[6], e[10]), t = new THREE.Vector3(e[12], e[13], e[14]);
  const upT = new THREE.Vector3(0, 1, 0).applyQuaternion(q.clone().invert()), upC = new THREE.Vector3(upT.x, -upT.y, -upT.z).normalize();
  const tg = TAGS[tok], u = new THREE.Vector3(...tg.u), v = new THREE.Vector3(...tg.v), n = new THREE.Vector3().crossVectors(u, v);
  const upM = new THREE.Vector3(u.z, v.z, n.z).normalize();               // phương thẳng đứng trong hệ tem
  const a = upM.clone().applyMatrix3(R).normalize();
  const C = new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(a, upC));
  const R0 = new THREE.Matrix4().setFromMatrix3(R).premultiply(C);
  const X = src.map(([x, y]) => new THREE.Vector3(x, y, 0));
  const err = (p) => { const Rm = new THREE.Matrix4().makeRotationAxis(upC, p[0]).multiply(R0); let E = []; for (let i = 0; i < 4; i++) {
      const c = X[i].clone().applyMatrix4(Rm).add(new THREE.Vector3(p[1], p[2], p[3]));
      E.push(k.fx * c.x / c.z + k.cx - dst[i][0], k.fy * c.y / c.z + k.cy - dst[i][1]); } return E; };
  let p = [0, t.x, t.y, t.z];
  for (let it = 0; it < 8; it++) {
    const r0 = err(p), J = [];
    for (let j = 0; j < 4; j++) { const h = j === 0 ? 1e-4 : 1e-4 * Math.max(1, Math.abs(p[3])); const pp = p.slice(); pp[j] += h; const r1 = err(pp); J.push(r1.map((v, i) => (v - r0[i]) / h)); }
    const A = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], g = [0,0,0,0];
    for (let i = 0; i < r0.length; i++) for (let a1 = 0; a1 < 4; a1++) { g[a1] += J[a1][i] * r0[i]; for (let b1 = 0; b1 < 4; b1++) A[a1][b1] += J[a1][i] * J[b1][i]; }
    for (let d = 0; d < 4; d++) A[d][d] *= 1.0001;
    const dx = solve4(A, g.map(x => -x)); if (!dx) break;
    for (let j = 0; j < 4; j++) p[j] += dx[j];
    if (Math.abs(dx[0]) < 1e-6) break;
  }
  const Rm = new THREE.Matrix4().makeRotationAxis(upC, p[0]).multiply(R0); Rm.setPosition(p[1], p[2], p[3]);
  return Rm;
}
function solve4(A, b) {
  const n = 4, M2 = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M2[r][c]) > Math.abs(M2[p][c])) p = r; [M2[c], M2[p]] = [M2[p], M2[c]];
    if (Math.abs(M2[c][c]) < 1e-12) return null; for (let r = 0; r < n; r++) if (r !== c) { const f = M2[r][c] / M2[c][c]; for (let k = c; k <= n; k++) M2[r][k] -= f * M2[c][k]; } }
  return M2.map((r, i) => r[n] / r[i]);
}
if (qs.get('test')) window.__setQ = (x, y, z, w) => { devQuat.set(x, y, z, w); haveGyro = true; };
function markerToWorld(tag) {   // ma trận: toạ độ 3D (thế giới) → hệ tem (X phải, Y xuống, Z vào bề mặt)
  const t = TAGS[tag], u = W(...t.u).sub(W(0,0,0)), v = W(...t.v).sub(W(0,0,0)), n = new THREE.Vector3().crossVectors(u, v), o = W(...t.o);
  const R = new THREE.Matrix4().set(u.x, u.y, u.z, 0, v.x, v.y, v.z, 0, n.x, n.y, n.z, 0, 0, 0, 0, 1);
  return R.multiply(new THREE.Matrix4().makeTranslation(-o.x, -o.y, -o.z));
}
let smooth = null;
function onDetect(ev) {
  busy = false; const r = ev.data; window.__last = r; if (!arOn) return;
  if (!r || !r.loc) return;
  const tok = parseTok(r.text); if (!tok || !TAGS[tok]) { setStatus('Tem không thuộc dự án này', 'bad'); return; }
  if (tok !== curTag && TAGS[tok].el !== TAGS[curTag].el) { setStatus('Đã nhận tem ' + ELEMS[TAGS[tok].el].title + ' – về trang chính để chuyển', 'wait'); }
  const s = SITE.qrSize / 2, sc = r.sc, L = r.loc;
  const dst = [L.topLeftCorner, L.topRightCorner, L.bottomRightCorner, L.bottomLeftCorner].map(p => [p.x / sc, p.y / sc]);
  const H = homography([[-s, -s], [s, -s], [s, s], [-s, s]], dst); if (!H) return;
  K = intrinsics(video.videoWidth, video.videoHeight); setProj(K);
  let Tcm = poseFromH(H, K);
  if (haveGyro && poseQ) Tcm = refineGravity(Tcm, tok, poseQ, [[-s, -s], [s, -s], [s, s], [-s, s]], dst, K);
  const MV = F.clone().multiply(Tcm).multiply(markerToWorld(tok));
  // làm mượt (vị trí + hướng)
  const pos = new THREE.Vector3(), q = new THREE.Quaternion(), scl = new THREE.Vector3(); MV.decompose(pos, q, scl);
  if (smooth && pred()) { const pp = new THREE.Vector3(), pq = new THREE.Quaternion(); pred().decompose(pp, pq, scl);
    if (pp.distanceTo(pos) < 0.25) { pos.lerp(pp, 0.45); q.slerp(pq, 0.45); } }
  smooth = new THREE.Matrix4().compose(pos, q, new THREE.Vector3(1, 1, 1));
  poseCam = smooth; lostQ = poseQ; lastSeen = performance.now();
  const dist = Tcm.elements[14];
  setStatus(`Đang bám tem ✓ · cách ${dist.toFixed(1)} m · chạm vào cấu kiện để xem thông số`, 'ok');
}
function parseTok(text) { if (!text) return null; const m = text.match(/#([A-Za-z0-9]+)\s*$/) || text.match(/^([A-Za-z0-9]+)$/); return m ? m[1] : null; }
function pred() {   // tư thế hiện tại: lần thấy tem gần nhất + xoay con quay
  if (!poseCam) return null;
  if (!haveGyro || !lostQ) return poseCam;
  const d = devQuat.clone().invert().multiply(lostQ);
  return new THREE.Matrix4().makeRotationFromQuaternion(d).multiply(poseCam);
}
function tickAR() {
  if (!arOn) return false;
  if (!busy && video.readyState >= 2) grabFrame();
  if (!K && video.videoWidth) { K = intrinsics(video.videoWidth, video.videoHeight); setProj(K); resize(); }
  const age = (performance.now() - lastSeen) / 1000;
  if (poseCam && age > 0.6) {
    const lim = haveGyro ? 15 : 1.5;
    if (age > lim) { poseCam = null; smooth = null; setStatus('Mất tem – hướng camera lại vào tem QR', 'wait'); }
    else setStatus(haveGyro ? `Ngoài tem – giữ hình theo con quay (${Math.ceil(lim - age)} s). Đứng yên, chỉ xoay máy.` : 'Ngoài tem – hướng lại vào tem', 'wait');
  }
  const MV = pred(); if (cur) cur.visible = !!MV;
  if (MV) { camAR.matrix.copy(MV).invert(); camAR.matrixWorldNeedsUpdate = true; }
  return true;
}

// ---------- kích thước khung ----------
function resize() {
  if (view === 'ar') {
    const vw = video.videoWidth || 1280, vh = video.videoHeight || 720;
    renderer.setPixelRatio(1); renderer.setSize(vw, vh, false);
    canvas.style.objectFit = 'cover';
  } else {
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight, false);
    cam3D.aspect = innerWidth / innerHeight; cam3D.updateProjectionMatrix();
  }
}
addEventListener('resize', resize);

// ---------- chạm để xem thông số ----------
const ray = new THREE.Raycaster();
canvas.addEventListener('click', e => {
  if (!cur) return;
  const rc = canvas.getBoundingClientRect(); let nx, ny;
  if (view === 'ar') {
    const vw = renderer.domElement.width, vh = renderer.domElement.height, s = Math.max(rc.width / vw, rc.height / vh);
    const u = (e.clientX - rc.left - (rc.width - vw * s) / 2) / s, v = (e.clientY - rc.top - (rc.height - vh * s) / 2) / s;
    nx = u / vw * 2 - 1; ny = -(v / vh * 2 - 1);
    if (!pred()) return; ray.setFromCamera({x: nx, y: ny}, camAR);
  } else { nx = (e.clientX - rc.left) / rc.width * 2 - 1; ny = -((e.clientY - rc.top) / rc.height * 2 - 1); ray.setFromCamera({x: nx, y: ny}, cam3D); }
  const objs = []; cur.traverse(o => { if (o.userData.info && (o.visible || o.userData.kind || o.userData.low)) { let p = o, vis = true; while (p && p !== cur) { if (!p.visible && p.userData.step) vis = false; p = p.parent; } if (vis) objs.push(o); } });
  const inLinks = o => { for (let p = o; p; p = p.parent) if (p.userData.links) return true; return false; };
  const hits = ray.intersectObjects(objs, false).filter(h => passClip(h.point) || inLinks(h.object));
  const hit = hits.find(h => !h.object.userData.low) || hits[0];
  showInfo(hit ? hit.object.userData.info(hit) : null);
});
function passClip(p) { return p.x >= RX0 - 0.01 && p.x <= RX1 + 0.01 && -p.z >= RY0 - 0.01 && -p.z <= RY1 + 0.01; }

// ---------- vòng vẽ ----------
function loop() {
  requestAnimationFrame(loop);
  if (view === 'ar') { tickAR(); renderer.render(scene, camAR); }
  else if (view === '3d') { controls && controls.update(); if (cur) cur.visible = true; renderer.render(scene, cam3D); }
}

// ---------- hồ sơ nghiệm thu ----------
// Hai nguồn: data/nghiem_thu.json (trợ lý cập nhật từ Zalo) + máy chủ Google Apps Script (tải thẳng từ trang).
const API = (typeof SITE !== 'undefined' && SITE.api) || '';
const MOC = ['Nghiệm thu cốp pha', 'Nghiệm thu cốt thép', 'Nghiệm thu cáp DƯL', 'Nghiệm thu trước đổ bê tông', 'Đổ bê tông', 'Kéo căng cáp', 'Tháo cốp pha', 'Khác'];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const getPin = () => { try { return localStorage.getItem('pin') || ''; } catch (e) { return ''; } };
const setPin = v => { try { v ? localStorage.setItem('pin', v) : localStorage.removeItem('pin'); } catch (e) {} };
let me = null, apiRecs = [];
async function api(params) { const r = await fetch(API + '?' + new URLSearchParams(params), {cache: 'no-store'}); return r.json(); }
async function apiPost(body) { const r = await fetch(API, {method: 'POST', body: JSON.stringify(body)}); return r.json(); }
async function loadApi(el) {
  apiRecs = []; if (!API || !getPin()) return;
  try { const r = await api({action: 'list', el, pin: getPin()}); if (r.ok) apiRecs = r.records; else if (/PIN/.test(r.err || '')) { setPin(''); me = null; } } catch (e) {}
}
function fileHtml(f) {
  const t = f.type || '';
  if (t.startsWith('image/')) return `<a href="${esc(f.url)}" target="_blank" rel="noopener"><img src="https://drive.google.com/thumbnail?id=${esc(f.id)}&sz=w400" alt="Ảnh nghiệm thu" loading="lazy"></a>`;
  return `<a class="doc" href="${esc(f.url)}" target="_blank" rel="noopener">${t.startsWith('video/') ? 'Xem video' : 'Xem biên bản / tài liệu'}: ${esc(f.name)}</a>`;
}
async function showNT() {
  const t = TAGS[curTag]; show('v-nt');
  const el = $('#nt-list'); el.innerHTML = '<p class="empty">Đang tải hồ sơ…</p>';
  await loadApi(t.el);
  const recs = NT.records.filter(r => r.el === t.el).concat(apiRecs)
    .sort((a, b) => (b.ngay + (b.gio || '')).localeCompare(a.ngay + (a.gio || '')));
  const head = API ? (getPin()
      ? `<div class="row"><button id="nt-add" class="big p" style="min-height:60px"><b>+ Thêm hồ sơ</b></button></div>`
      : `<div class="el"><p>Nhập mã PIN do BCH cấp để xem và tải hồ sơ nghiệm thu.</p><div class="row" style="margin-top:10px"><input id="pin-in" class="inp" style="flex:2" inputmode="numeric" autocomplete="off" placeholder="Mã PIN"><button id="pin-ok">Xác nhận</button></div><p id="pin-msg" class="note"></p></div>`)
    : '';
  el.innerHTML = head + (recs.length ? recs.map(r => `<article class="nt"><header><b>${esc(r.moc)}</b><span>${esc(fmtDate(r.ngay || ''))}${r.gio ? ' · ' + esc(r.gio) : ''}</span></header>
      <p>${r.ket_qua ? `Kết quả: <b>${esc(r.ket_qua)}</b> · ` : ''}${(r.ben || []).map(esc).join(', ')}</p>
      ${r.ghi_chu ? `<p>${esc(r.ghi_chu)}</p>` : ''}
      <div class="thumbs">${(r.anh || []).map(a => `<a href="${esc(a)}" target="_blank" rel="noopener"><img src="${esc(a)}" alt="Ảnh nghiệm thu" loading="lazy"></a>`).join('')}${(r.files || []).filter(f => (f.type || '').startsWith('image/')).map(fileHtml).join('')}</div>
      ${(r.files || []).filter(f => !(f.type || '').startsWith('image/')).map(fileHtml).join('')}
      ${r.bien_ban ? `<a class="doc" href="${esc(r.bien_ban)}" target="_blank" rel="noopener">Xem biên bản đã ký</a>` : ''}
      ${r.nguoi_tai ? `<p class="note">Tải lên: ${esc(r.nguoi_tai)} (${esc(r.vai_tro)})</p>` : ''}</article>`).join('')
    : `<p class="empty">Chưa có hồ sơ nghiệm thu cho cấu kiện này.<br>Ảnh, video, biên bản gửi vào nhóm Zalo nghiệm thu${API ? ' hoặc tải thẳng tại đây' : ''} sẽ hiện theo ngày giờ.</p>`);
  const add = $('#nt-add'); if (add) add.onclick = showAdd;
  const ok = $('#pin-ok'); if (ok) ok.onclick = async () => {
    const v = $('#pin-in').value.trim(); if (!v) return; $('#pin-msg').textContent = 'Đang kiểm tra…';
    try { const r = await api({action: 'me', pin: v}); if (r.ok) { setPin(v); me = r.user; showNT(); } else $('#pin-msg').textContent = r.err || 'Mã PIN không đúng'; }
    catch (e) { $('#pin-msg').textContent = 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.'; }
  };
}
function showAdd() {
  const now = new Date(), p2 = n => String(n).padStart(2, '0');
  $('#nta-el').textContent = curEl.title + ' · ' + TAGS[curTag].el;
  $('#nta-moc').innerHTML = MOC.map(m => `<option>${m}</option>`).join('');
  $('#nta-ngay').value = `${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())}`;
  $('#nta-gio').value = `${p2(now.getHours())}:${p2(now.getMinutes())}`;
  $('#nta-files').value = ''; $('#nta-cam').value = ''; pending = []; renderPending(); $('#nta-msg').textContent = '';
  show('v-nt-add');
}
let pending = [];
function renderPending() {
  $('#nta-list').innerHTML = pending.length ? pending.map((f, i) => `<li>${esc(f.name)} · ${(f.size / 1048576).toFixed(1)} MB <button data-i="${i}" aria-label="Bỏ file">×</button></li>`).join('') : '<li class="note">Chưa chọn ảnh, video hoặc biên bản.</li>';
}
const MAXV = 30 * 1048576;
function addFiles(list) {
  for (const f of list) {
    if (f.type.startsWith('video/') && f.size > MAXV) { $('#nta-msg').textContent = `Video "${f.name}" quá 30 MB – quay ngắn dưới 1 phút.`; continue; }
    pending.push(f);
  }
  renderPending();
}
function shrinkImage(file) {   // nén ảnh còn cạnh dài 1600 px để tải nhanh qua 4G
  return new Promise(res => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); c.toBlob(b => res(b || file), 'image/jpeg', 0.82); };
    img.onerror = () => { URL.revokeObjectURL(url); res(file); };
    img.src = url;
  });
}
const b64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
async function submitAdd() {
  const msg = $('#nta-msg'), btn = $('#nta-send');
  if (!pending.length) { msg.textContent = 'Cần ít nhất 1 ảnh, video hoặc biên bản.'; return; }
  btn.disabled = true; const el = TAGS[curTag].el, moc = $('#nta-moc').value, files = [];
  try {
    for (let i = 0; i < pending.length; i++) {
      const f = pending[i]; msg.textContent = `Đang tải ${i + 1}/${pending.length}: ${f.name}…`;
      const isImg = f.type.startsWith('image/'), blob = isImg ? await shrinkImage(f) : f;
      const name = isImg ? f.name.replace(/\.[^.]+$/, '') + '.jpg' : f.name;
      const r = await apiPost({action: 'file', pin: getPin(), el, moc, name, type: isImg ? 'image/jpeg' : f.type, data: await b64(blob)});
      if (!r.ok) throw new Error(r.err); files.push(r.file);
    }
    msg.textContent = 'Đang lưu hồ sơ…';
    const r = await apiPost({action: 'record', pin: getPin(), el, moc, ngay: $('#nta-ngay').value, gio: $('#nta-gio').value, ket_qua: $('#nta-kq').value,
      ben: $('#nta-ben').value.split(/[,;]/).map(s => s.trim()).filter(Boolean), ghi_chu: $('#nta-note').value.trim(), files});
    if (!r.ok) throw new Error(r.err);
    pending = []; btn.disabled = false; showNT();
  } catch (e) { btn.disabled = false; msg.textContent = 'Chưa tải được: ' + (e.message || 'lỗi mạng') + '. Kiểm tra sóng rồi bấm Lưu lại.'; }
}
$('#nta-files').onchange = e => addFiles(e.target.files);
$('#nta-cam').onchange = e => addFiles(e.target.files);
$('#nta-list').onclick = e => { const b = e.target.closest('button[data-i]'); if (b) { pending.splice(+b.dataset.i, 1); renderPending(); } };
$('#nta-send').onclick = submitAdd;
$('#nta-back').onclick = showNT;

// ---------- khởi động ----------
$('#b-next').onclick = () => startAR('next');
$('#b-built').onclick = () => startAR('built');
$('#b-3d-next').onclick = () => start3D('next');
$('#b-3d-built').onclick = () => start3D('built');
$('#b-nt').onclick = showNT;
$('#sn-prev').onclick = () => stepGo(-1); $('#sn-next').onclick = () => stepGo(1);
$('#nt-back').onclick = goHome;
$('#tb-back').onclick = goHome;
$('#b-scan').onclick = async () => {   // mở camera chưa biết tem: quét để nhận diện
  view = 'scan'; show('v-scan');
  try { stream = await navigator.mediaDevices.getUserMedia({audio: false, video: {facingMode: {ideal: 'environment'}}}); $('#scanvid').srcObject = stream; await $('#scanvid').play(); }
  catch (e) { $('#scan-msg').textContent = 'Không mở được camera. Có thể quét tem bằng ứng dụng Camera của điện thoại.'; return; }
  if (!worker) { worker = new Worker('js/qr_worker.js'); }
  const v = $('#scanvid'), c = document.createElement('canvas'), x = c.getContext('2d', {willReadFrequently: true});
  worker.onmessage = ev => { const tok = ev.data && parseTok(ev.data.text);
    if (tok && TAGS[tok]) { stream.getTracks().forEach(t => t.stop()); stream = null; worker.onmessage = onDetect; history.replaceState(null, '', '#' + tok); openTag(tok); goHome(); return; }
    if (view === 'scan') setTimeout(step, 80); };
  const step = () => { if (view !== 'scan' || !v.videoWidth) return setTimeout(step, 200); const sc = Math.min(1, 960 / Math.max(v.videoWidth, v.videoHeight));
    c.width = Math.round(v.videoWidth * sc); c.height = Math.round(v.videoHeight * sc); x.drawImage(v, 0, 0, c.width, c.height); const im = x.getImageData(0, 0, c.width, c.height);
    worker.postMessage({w: c.width, h: c.height, sc, buf: im.data.buffer}, [im.data.buffer]); };
  step();
};
$('#scan-back').onclick = () => { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } if (worker) worker.onmessage = onDetect; goHome(); };
$('#fov').value = hfov; $('#fov-v').textContent = hfov + '°';
$('#fov').oninput = e => { hfov = +e.target.value; $('#fov-v').textContent = hfov + '°'; try { localStorage.setItem('hfov', hfov); } catch (er) {} if (video.videoWidth) { K = intrinsics(video.videoWidth, video.videoHeight); setProj(K); } };
$('#tb-set').onclick = () => { $('#settings').hidden = !$('#settings').hidden; };

(async function init() {
  $('#ver').textContent = SITE.ver + ' · ' + SITE.src;
  try { const r = await fetch('data/nghiem_thu.json', {cache: 'no-cache'}); if (r.ok) NT = await r.json(); } catch (e) {}
  const tok = (location.hash || '').slice(1) || qs.get('t') || '';
  if (tok && openTag(tok)) {} else curEl = null;
  goHome(); inAppNote();
  if (qs.get('xr') && curEl) { const m = $('#xr-msg'); m.textContent = 'Đã mở trong App Clip – bấm nút "AR bám không gian" để bắt đầu.'; m.hidden = false; }
  if (qs.get('auto')) { const m = qs.get('auto'); m.startsWith('3d') ? start3D(m.slice(2)) : startAR(m); }
  loop();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
addEventListener('hashchange', () => { const tok = location.hash.slice(1); if (openTag(tok)) goHome(); });
