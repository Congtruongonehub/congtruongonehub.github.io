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

function buildProps(zFloor, zTop) {
  const g = new THREE.Group(), P = [];
  const soffit = zTop - 0.22, deckB = soffit - 0.065;
  for (let x = EDGE + 0.6; x < RX1; x += 1.2) for (let y = EDGE + 0.6; y < RY1; y += 1.2)
    if (!inBeam(x, y, 0.1) && !inCol(x, y)) P.push([x, y, deckB]);
  for (const b of beamsReg()) {
    const nr = b.b <= 0.8 ? 1 : Math.ceil(b.b / 1.0), rows = Array.from({length: nr}, (_, i) => -b.b/2 + b.b*(i+0.5)/nr);
    const zb = zTop - b.h - 0.065;
    for (let u = b.lo + 0.6; u < b.hi; u += 1.2) for (const w of rows) {
      const [x, y] = b.o === 'EW' ? [u, b.c + w] : [b.c + w, u];
      if (inside(x, y) && !inCol(x, y, 0.25)) P.push([x, y, zb]);
    }
  }
  const tube = new THREE.CylinderGeometry(0.03, 0.03, 1, 8); tube.translate(0, 0.5, 0);
  const plate = new THREE.BoxGeometry(0.15, 0.012, 0.15);
  const mT = new THREE.InstancedMesh(tube, lam(COL.prop), P.length), mH = new THREE.InstancedMesh(plate, lam(0xf5c400), P.length * 2);
  const o = new THREE.Object3D();
  P.forEach(([x, y, zt], i) => {
    o.position.copy(W(x, y, zFloor)); o.scale.set(1, zt - zFloor, 1); o.updateMatrix(); mT.setMatrixAt(i, o.matrix);
    o.scale.set(1, 1, 1); o.position.copy(W(x, y, zFloor + 0.006)); o.updateMatrix(); mH.setMatrixAt(2*i, o.matrix);
    o.position.copy(W(x, y, zt - 0.006)); o.updateMatrix(); mH.setMatrixAt(2*i+1, o.matrix);
  });
  mT.userData.info = () => ({title: 'Cây chống cốp pha nhôm', rows: [
    ['Số lượng (vùng hiển thị)', `${P.length} cây`],
    ['Chiều cao', `${(deckB - zFloor).toFixed(2)} m dưới sàn · tới đáy cốp pha dầm dưới dầm`],
    ['Bước', '≈ 1,2 × 1,2 m (sơ bộ – theo shop drawing NCC khi có)'],
    ['Chân chống', `Mặt sàn tầng 3 ${fmtLv(zFloor)}`],
    ['Tháo chống', '≥ 21 ngày và sau khi kéo căng cáp'],
  ]});
  g.add(mT, mH); return g;
}
function buildDeck(zTop) {
  const g = new THREE.Group(), soffit = zTop - 0.22, mat = ghost(COL.deck, 0.5), seg = [];
  const x0 = EDGE, y0 = EDGE;
  const deck = box(x0, RX1, y0, RY1, soffit - 0.065, soffit, mat); deck.userData.info = () => ({title: 'Cốp pha nhôm sàn', rows: [
    ['Tấm', '600 × 1200, dày 65'], ['Mặt cốp pha', fmtLv(soffit) + ' (đáy sàn, sàn dày 220)'], ['Ghi chú', 'Chia tấm theo shop drawing NCC']]});
  g.add(deck);
  for (let x = x0; x <= RX1; x += 0.6) seg.push(W(x, y0, soffit - 0.066), W(x, RY1, soffit - 0.066));
  for (let y = y0; y <= RY1; y += 1.2) seg.push(W(x0, y, soffit - 0.066), W(RX1, y, soffit - 0.066));
  const lg = new THREE.BufferGeometry().setFromPoints(seg); g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({color: 0x56636f, clippingPlanes: CLIP})));
  for (const b of beamsReg()) {           // cốp pha dầm: đáy + 2 thành
    const hb = b.h, drop = hb - 0.22, zb = zTop - hb, fm = ghost(COL.form, 0.55);
    const P = (u0, u1, w0, w1, z0, z1) => b.o === 'EW' ? box(u0, u1, b.c + w0, b.c + w1, z0, z1, fm) : box(b.c + w0, b.c + w1, u0, u1, z0, z1, fm);
    const parts = [P(b.lo, b.hi, -b.b/2, b.b/2, zb - 0.065, zb), P(b.lo, b.hi, -b.b/2 - 0.065, -b.b/2, zb - 0.065, zb + drop), P(b.lo, b.hi, b.b/2, b.b/2 + 0.065, zb - 0.065, zb + drop)];
    for (const m of parts) { m.userData.info = () => ({title: `Cốp pha dầm ${b.did}`, rows: [['Đáy dầm', fmtLv(zb) + ` (h ${mm(hb)})`], ['Bề rộng', mm(b.b) + ' mm'], ['Chống đáy', b.b <= 0.8 ? '1 hàng' : Math.ceil(b.b) + ' hàng']]}); g.add(m); }
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
const camAR = new THREE.PerspectiveCamera(60, 1, 0.05, 200); camAR.matrixAutoUpdate = false;
const cam3D = new THREE.PerspectiveCamera(50, 1, 0.05, 500);
let controls = null, cur = null, curTag = null, curEl = null, curMode = null, view = 'home';
const shown = new Set();

function setContent(sceneName) {
  if (cur) scene.remove(cur);
  cur = buildScene(sceneName); scene.add(cur);
  const isNext = curMode === 'next';
  shown.clear();
  // 'sắp tới': mặc định hiện bước kế tiếp chưa xong; chạm thẻ bước để thêm/bớt. 'đã thi công': hiện tất cả.
  const st0 = cur.userData.steps.filter(st => !isNext || stepStatus(st) !== 'done');
  for (const st of (isNext ? st0.slice(0, 1) : st0)) shown.add(st.id);
  applySteps(); renderSteps();
}
function applySteps() { if (!cur) return; for (const ch of cur.children) if (ch.userData.step) ch.visible = shown.has(ch.userData.step); }

// ---------- giao diện ----------
function show(id) { for (const el of document.querySelectorAll('.view')) el.hidden = el.id !== id; }
function statusChip(s) { return {done: '<span class="chip ok">Đã xong</span>', now: '<span class="chip now">Đang làm</span>', todo: '<span class="chip">Sắp tới</span>'}[s]; }
function renderSteps() {
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
  const st = cur.userData.steps.find(s => s.id === id); if (shown.has(id)) showInfo({title: st.name, rows: st.method.map((m, i) => ['Biện pháp ' + (i + 1), m])});
});

function showInfo(inf) {
  const el = $('#info'); if (!inf) { el.hidden = true; return; }
  el.innerHTML = `<button class="x" aria-label="Đóng">×</button><h3>${inf.title}</h3><dl>${inf.rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
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
function goHome() { stopAR(); view = 'home'; show('v-home'); $('#home-tag').hidden = !curEl; $('#home-scan').hidden = !!curEl; }

// ---------- chế độ 3D (không camera) ----------
function start3D(mode) {
  curMode = mode; stopAR(); view = '3d'; show('v-run'); document.body.classList.add('m3d'); document.body.classList.remove('mar');
  setTopbar();
  setContent(curEl[mode].scene);
  const t = TAGS[curTag]; const o = W(...t.o);
  if (!controls) { controls = new THREE.OrbitControls(cam3D, canvas); controls.enableDamping = true; }
  const tgt = o.clone(); if (curEl[mode].scene === 'slabT4') tgt.y = LV['4FL'] - 1.2; if (curEl[mode].scene === 'colT4') tgt.y = LV['4FL'] + 1.8;
  controls.target.copy(tgt);
  cam3D.position.copy(tgt).add(new THREE.Vector3(7, 1.2, -7.5)); controls.update();
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
async function startAR(mode) {
  curMode = mode; view = 'ar'; show('v-run'); document.body.classList.add('mar'); document.body.classList.remove('m3d');
  setTopbar(); setContent(curEl[mode].scene); markTag(false);
  setStatus('Đang mở camera…', 'wait');
  try {
    if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') DeviceOrientationEvent.requestPermission().then(r => { if (r === 'granted') addEventListener('deviceorientation', onOrient); }).catch(() => {});
    else addEventListener('deviceorientation', onOrient);
    stream = await navigator.mediaDevices.getUserMedia({audio: false, video: {facingMode: {ideal: 'environment'}, width: {ideal: +(qs.get('cw') || 1280)}, height: {ideal: +(qs.get('ch') || 720)}}});
  } catch (err) {
    setStatus('Không mở được camera – kiểm tra quyền camera của trình duyệt. Đang chuyển sang xem 3D.', 'bad');
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
function grabFrame() {
  const vw = video.videoWidth, vh = video.videoHeight; if (!vw) return;
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
  const hits = ray.intersectObjects(objs, false).filter(h => passClip(h.point));
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
function showNT() {
  const t = TAGS[curTag], recs = NT.records.filter(r => r.el === t.el).sort((a, b) => (b.ngay + (b.gio || '')).localeCompare(a.ngay + (a.gio || '')));
  const el = $('#nt-list');
  el.innerHTML = recs.length ? recs.map(r => `<article class="nt"><header><b>${r.moc}</b><span>${fmtDate(r.ngay)}${r.gio ? ' · ' + r.gio : ''}</span></header>
      <p>${r.ket_qua ? `Kết quả: <b>${r.ket_qua}</b> · ` : ''}${(r.ben || []).join(', ')}</p>
      <div class="thumbs">${(r.anh || []).map(a => `<a href="${a}" target="_blank" rel="noopener"><img src="${a}" alt="Ảnh nghiệm thu" loading="lazy"></a>`).join('')}</div>
      ${r.bien_ban ? `<a class="doc" href="${r.bien_ban}" target="_blank" rel="noopener">Xem biên bản đã ký</a>` : ''}</article>`).join('')
    : `<p class="empty">Chưa có hồ sơ nghiệm thu cho cấu kiện này.<br>Ảnh, video, biên bản gửi vào nhóm Zalo nghiệm thu sẽ được trợ lý phân loại và hiện tại đây theo ngày giờ.</p>`;
  show('v-nt');
}

// ---------- khởi động ----------
$('#b-next').onclick = () => startAR('next');
$('#b-built').onclick = () => startAR('built');
$('#b-3d-next').onclick = () => start3D('next');
$('#b-3d-built').onclick = () => start3D('built');
$('#b-nt').onclick = showNT;
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
  const tok = (location.hash || '').slice(1);
  if (tok && openTag(tok)) {} else curEl = null;
  goHome();
  if (qs.get('auto')) { const m = qs.get('auto'); m.startsWith('3d') ? start3D(m.slice(2)) : startAR(m); }
  loop();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
addEventListener('hashchange', () => { const tok = location.hash.slice(1); if (openTag(tok)) goHome(); });
