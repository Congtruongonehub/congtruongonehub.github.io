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
  const std = o => new THREE.MeshStandardMaterial(Object.assign({clippingPlanes: CLIP, side: DS2}, o));
  const mAlu = () => std({color: 0xd3d9df, metalness: 0.55, roughness: 0.42, vertexColors: true});     // nhôm hợp kim mới, bề mặt mờ
  const mBeam = () => std({color: 0xc9d0d7, metalness: 0.55, roughness: 0.45, vertexColors: true});
  const mHead = () => std({color: 0xc2c9d0, metalness: 0.6, roughness: 0.4});                          // đầu chống, dầm xương: nhôm đúc
  const mPin = () => lam(0xc0392b);
  const mSteel = () => lam(0x8f9aa6);
  const cache = {};

  // ---- hộp vào mảng tam giác (toạ độ cục bộ) ----
  function addBox(arr, x0, x1, y0, y1, z0, z1) {
    const v = [[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]];
    for (const [a,b,c] of [[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]]) arr.push(...v[a],...v[b],...v[c]);
  }
  function geoOf(arr, col) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const c = col || new Array(arr.length).fill(1); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.computeVertexNormals(); return g; }
  const tint = (col, n, r, g, b) => { for (let i = 0; i < n; i++) col.push(r, g, b); };
  // Tấm chuẩn: X rộng (tâm 0), Y dài (tâm 0), mặt bê tông ở Z = 0 hướng +Z, sườn về phía −Z
  function panelGeo(w, h, crossAlongY = true) {
    const k = `p${w.toFixed(3)}_${h.toFixed(3)}_${crossAlongY}`; if (cache[k]) return cache[k];
    const a = [], t = 0.008, hw = w / 2 - 0.002, hh = h / 2 - 0.002;   // khe giáp mí 4 mm; sườn biên (mép giáp mí, có lỗ chốt) dày 8, sâu 65
    const col = [];
    addBox(a, -hw, hw, -hh, hh, -SKIN, 0); tint(col, 36, 0.93, 0.94, 0.95);                // mặt nhôm (mặt tiếp xúc bê tông)
    addBox(a, -hw, -hw + t, -hh, hh, -RIB, -SKIN); addBox(a, hw - t, hw, -hh, hh, -RIB, -SKIN);   // sườn biên dọc = mép giáp mí
    addBox(a, -hw, hw, -hh, -hh + t, -RIB, -SKIN); addBox(a, -hw, hw, hh - t, hh, -RIB, -SKIN);   // sườn biên ngang = mép giáp mí
    // gờ mép sườn biên (profile chữ L) – mép giáp mí
    addBox(a, -hw + t, -hw + 0.022, -hh, hh, -RIB, -RIB + 0.004); addBox(a, hw - 0.022, hw - t, -hh, hh, -RIB, -RIB + 0.004);
    addBox(a, -hw, hw, -hh + t, -hh + 0.022, -RIB, -RIB + 0.004); addBox(a, -hw, hw, hh - 0.022, hh - t, -RIB, -RIB + 0.004);
    tint(col, a.length / 3 - col.length / 3, 0.78, 0.81, 0.85);
    // sườn tăng cứng bên trong dạng ống hộp 20×40 @300 – KHÔNG phải mép giáp mí, không có chốt
    if (crossAlongY) for (let y = -hh + 0.3; y < hh - 0.05; y += 0.3) addBox(a, -hw + t, hw - t, y - 0.01, y + 0.01, -0.044, -SKIN);
    else for (let x = -hw + 0.3; x < hw - 0.05; x += 0.3) addBox(a, x - 0.01, x + 0.01, -hh + t, hh - t, -0.044, -SKIN);
    // tấm rộng ≥ 400: thêm sườn dọc giữa tấm (như tấm WP thực tế)
    if (crossAlongY && w >= 0.399) addBox(a, -0.01, 0.01, -hh + t, hh - t, -0.044, -SKIN);
    else if (!crossAlongY && h >= 0.399) addBox(a, -hw + t, hw - t, -0.01, 0.01, -0.044, -SKIN);
    tint(col, a.length / 3 - col.length / 3, 0.95, 0.96, 0.97);
    return (cache[k] = geoOf(a, col));
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
  // Dầm xương MB/EB như thực tế: mặt trên 150 (tiếp xúc bê tông), 2 bụng cao 125 có hàng lỗ chốt, gờ chân, sườn ngang @300
  function mbGeo(L) {
    const k = 'mb' + L.toFixed(3); if (cache[k]) return cache[k];
    const a = [], col = [], hw = 0.075, hl = L / 2 - 0.002, d = 0.125, t = 0.006;
    addBox(a, -hw, hw, -hl, hl, -SKIN, 0); tint(col, 36, 0.93, 0.94, 0.95);
    addBox(a, -hw, -hw + t, -hl, hl, -d, -SKIN); addBox(a, hw - t, hw, -hl, hl, -d, -SKIN);              // 2 bụng
    addBox(a, -hw + t, -hw + 0.03, -hl, hl, -d, -d + 0.005); addBox(a, hw - 0.03, hw - t, -hl, hl, -d, -d + 0.005);   // gờ chân
    addBox(a, -hw, hw, -hl, -hl + t, -d, -SKIN); addBox(a, -hw, hw, hl - t, hl, -d, -SKIN);              // bản đầu
    tint(col, a.length / 3 - col.length / 3, 0.78, 0.81, 0.85);
    for (let y = -hl + 0.3; y < hl - 0.05; y += 0.3) addBox(a, -hw + t, hw - t, y - 0.004, y + 0.004, -0.09, -SKIN);
    tint(col, a.length / 3 - col.length / 3, 0.9, 0.92, 0.93);
    return (cache[k] = geoOf(a, col));
  }
  function addMB(bt, L, mat, m, info) {
    bt.add(mbGeo(L), mat, m, info);
    const hl = L / 2 - 0.002, Lm = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (const sx of [-1, 1]) { e.set(0, sx * Math.PI / 2, 0); q.setFromEuler(e);
      for (let y = -hl + 0.05; y < hl - 0.02; y += 0.1) for (const z of [-0.03, -0.085]) { Lm.compose(new THREE.Vector3(sx * 0.0756, y, z), q, new THREE.Vector3(1, 1, 1)); bt.add(holeGeo(), holeMat(), m.clone().multiply(Lm), info); } }
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
  // lỗ chốt Ø17 dọc sườn biên @100 (như tấm thật) – đĩa tối trên mặt ngoài sườn
  let HOLE, HOLEM; const holeGeo = () => HOLE || (HOLE = new THREE.CircleGeometry(0.0085, 8));
  const holeMat = () => HOLEM || (HOLEM = new THREE.MeshBasicMaterial({color: 0x23282d, side: DS2, clippingPlanes: CLIP}));
  // nhãn mã tấm như thực tế: tem trắng mã vạch của nhà cung cấp + mã tấm viết sơn đỏ, dán mặt sau tấm
  const STK = {}, stkGeo = new THREE.PlaneGeometry(0.17, 0.08);
  function stkMat(code) {
    if (STK[code]) return STK[code];
    const c = document.createElement('canvas'); c.width = 256; c.height = 120; const x = c.getContext('2d');
    x.fillStyle = '#f4f5f2'; x.fillRect(0, 0, 256, 120); x.strokeStyle = '#9aa0a6'; x.lineWidth = 2; x.strokeRect(1, 1, 254, 118);
    // mã vạch giả lập (sọc theo mã tấm)
    let s = 0; for (const ch of code) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
    x.fillStyle = '#1b1b1b'; for (let px = 14; px < 150; ) { const w = 1 + ((s = (s * 1103515245 + 12345) >>> 0) >> 16) % 4; x.fillRect(px, 12, w, 44); px += w + 1 + (s >> 20) % 3; }
    x.fillRect(166, 12, 30, 30); x.fillStyle = '#f4f5f2'; x.fillRect(172, 18, 18, 18); x.fillStyle = '#1b1b1b'; x.fillRect(177, 23, 8, 8);   // ô QR nhỏ
    x.font = '15px Arial, sans-serif'; x.fillText('KUMKANG · BP2', 14, 74);
    x.fillStyle = '#c62828'; x.font = 'bold 30px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    let f = 30; while (x.measureText(code).width > 236 && f > 14) { f -= 2; x.font = `bold ${f}px Arial, sans-serif`; }
    x.fillText(code, 128, 100);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
    return (STK[code] = new THREE.MeshBasicMaterial({map: t, side: DS2, clippingPlanes: CLIP}));
  }
  // đặt 1 tấm: thân tấm + lỗ chốt + tem mã
  function addPanel(bt, w, h, crossY, mat, m, info, code) {
    bt.add(panelGeo(w, h, crossY), mat, m, info);
    const hw = w / 2 - 0.002, hh = h / 2 - 0.002, L = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const put = (x, y, z, rx, ry) => { e.set(rx, ry, 0); q.setFromEuler(e); L.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1)); bt.add(holeGeo(), holeMat(), m.clone().multiply(L), info); };
    for (let y = -hh + 0.05; y < hh - 0.02; y += 0.1) { put(-hw - 0.0006, y, -0.03, 0, -Math.PI / 2); put(hw + 0.0006, y, -0.03, 0, Math.PI / 2); }
    for (let x = -hw + 0.05; x < hw - 0.02; x += 0.1) { put(x, -hh - 0.0006, -0.03, Math.PI / 2, 0); put(x, hh + 0.0006, -0.03, -Math.PI / 2, 0); }
    if (code && w >= 0.18 && h >= 0.18) { e.set(0, Math.PI, 0); q.setFromEuler(e); const yo = h > 0.5 ? 0.15 : 0; L.compose(new THREE.Vector3(0, yo, -SKIN - 0.001), q, new THREE.Vector3(1, 1, 1)); bt.add(stkGeo, stkMat(code), m.clone().multiply(L), info); }
  }
  function bomAdd(bom, code, kg, n = 1) { const r = bom[code] || (bom[code] = {n: 0, kg: 0}); r.n += n; r.kg += kg * n; }
  const card = (code, rows) => () => ({title: `${code}`, rows});

  // Bước la theo chiều cao đổ: 300 trong 1,2 m dưới cùng (áp lực bê tông lớn nhất), 600 phía trên – SƠ BỘ, chờ shop drawing / CHT xác nhận
  const LA = {low: 0.3, lowH: 1.2, high: 0.6, first: 0.15};
  function laSteps(H) { const z = []; for (let d = LA.first; d < H - 0.1; d += d < LA.lowH ? LA.low : LA.high) z.push(d); return z; }
  const laText = st => `${st.length} lớp: @${fmm(LA.low)} trong ${LA.lowH.toFixed(1).replace('.', ',')} m dưới, @${fmm(LA.high)} phía trên (sơ bộ – chờ xác nhận)`;

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
  function column(c, z0, z1, edge = -1e9) {
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
      let widths = split(f.w, [600, 450, 400, 350, 300, 250, 200]);
      if (f.n.x > 0 || f.n.z < 0) widths = widths.slice().reverse();   // mặt đối diện: đảo để mép giáp mí thẳng hàng, xỏ la xuyên cột
      let off = -f.w / 2;
      for (const wd of widths) {
        let z = z0;
        const stack = [{h: Wp, code: wd => `W${fmm(wd)}x2450`, kind: 'W', note: 'Tấm vách có chân rocker 50'}]
          .concat(top.map(h => ({h, code: wd => (h >= 0.299 && [0.3, 0.35, 0.4].some(s => Math.abs(s - h) < 0.002) ? `WS${fmm(wd)}x${fmm(h)}` : `WC${fmm(wd)}x${fmm(h)}`), kind: 'WS', note: 'Tấm vách mở rộng (top panel)'})));
        for (const s of stack) {
          const code = s.code(wd), kg = KG[code.slice(0, 2)] || 20, area = wd * s.h;
          const cen = new THREE.Vector3(...W(f.cx, f.cy, z + s.h / 2).toArray()).addScaledVector(ex, off + wd / 2);
          const zz = z;
          addPanel(bt, wd, s.h, true, alu, mtx(cen, ex, ey, ez), card(code, [
            ['Loại', `${s.note} – ${code.startsWith('W') && code[1] !== 'S' && code[1] !== 'C' ? 'W' : code.slice(0, 2)}`],
            ['Kích thước', `${fmm(wd)} × ${fmm(s.h)} mm, sườn 65`], ['Trọng lượng', `≈ ${(area * kg).toFixed(1)} kg (${kg} kg/m²)`],
            ['Vị trí', `Cột ${c.type} – ${f.nm}, từ ${fmtLv(zz)}`], ['Liên kết', 'Chốt ngắn RP + nêm WP @300 dọc mép; gông bằng cùm xà gồ + ống thép'],
            ['Tháo', 'Sau đổ 12 giờ (TVGS chấp thuận); tháo từ trên xuống, giữ kicker']]), code);
          bomAdd(bom, code, area * kg);
          // chốt mép đứng (giữa 2 tấm cạnh nhau / với góc CA) @300 và mép ngang (giữa 2 tầng tấm) @300
          for (let y = zz + 0.15; y < zz + s.h - 0.05; y += 0.3)
            for (const xe of (off <= -f.w / 2 + 1e-6 ? [off, off + wd] : [off + wd])) pinAt(bt, bom, new THREE.Vector3(...W(f.cx, f.cy, y).toArray()).addScaledVector(ex, xe).addScaledVector(ez, -RIB / 2), ex);
          if (zz > z0 + 0.01) for (let xx = off + 0.15; xx < off + wd - 0.05; xx += 0.3)
            pinAt(bt, bom, new THREE.Vector3(...W(f.cx, f.cy, zz).toArray()).addScaledVector(ex, xx).addScaledVector(ez, -RIB / 2), ey);
          z += s.h;
        }
        off += wd;
      }
    }
    // Thanh la (Flat tie) xuyên cột qua khe xỏ la ở mép giáp mí đứng giữa 2 tấm; bước dày ở dưới (áp lực bê tông lớn)
    const ftArr = [], ftSteps = laSteps(H), ftL = [];
    const sx = split(c.b, [600, 450, 400, 350, 300, 250, 200]), sy = split(c.h, [600, 450, 400, 350, 300, 250, 200]);
    let acc = 0; const seamX = sx.slice(0, -1).map(w => (acc += w, c.x - c.b / 2 + acc)); acc = 0;
    const seamY = sy.slice(0, -1).map(w => (acc += w, c.y + c.h / 2 - acc));
    const ext = RIB + 0.1;   // đầu la ló ra ngoài sườn biên 100 mm để nhìn thấy bước la từ bên ngoài
    for (const dz of ftSteps) {
      const z = z0 + dz;
      for (const yy of seamY) { addBox(ftArr, c.x - c.b / 2 - ext, c.x + c.b / 2 + ext, z - 0.016, z + 0.016, -yy - 0.0015, -yy + 0.0015); ftL.push(c.b + 2 * ext); }
      for (const xx of seamX) { addBox(ftArr, xx - 0.0015, xx + 0.0015, z + 0.034, z + 0.066, -(c.y + c.h / 2 + ext), -(c.y - c.h / 2 - ext)); ftL.push(c.h + 2 * ext); }
    }
    if (ftArr.length) {
      const fm = meshFrom(ftArr, lam(0x1f5fe0, {emissive: 0x0d2a6b}));
      fm.userData.info = card('FT – Thanh la (Flat tie) xuyên cột', [
        ['Vị trí', `Mép giáp mí đứng giữa 2 tấm (khe xỏ la): ${seamY.length} đường phương X, ${seamX.length} đường phương Y; 2 phương lệch nhau 50 mm`],
        ['Bước la', laText(ftSteps)],
        ['Cấu tạo', 'Thép dẹt dày 3, bản 32; chốt RP xuyên lỗ la và 2 sườn biên, khoá nêm WP'],
        ['Số lượng', `${ftL.length} thanh, tổng ≈ ${ftL.reduce((a, b) => a + b, 0).toFixed(1)} m`],
        ['Sau khi tháo', 'La nằm lại trong bê tông – bẻ đầu la bằng dụng cụ bẻ la, mài phẳng, trám']]);
      grp.add(fm); bomAdd(bom, 'FT – thanh la xuyên cột', 0.75 * 1.2, ftL.length);
      // nhãn bước la cạnh mép giáp mí ở 2 mặt phía trong nhà
      const zLow = ftSteps.filter(d => d < LA.lowH), zHigh = ftSteps.filter(d => d >= LA.lowH);
      for (const [xx, yy] of [[c.x + c.b / 2 + ext + 0.05, seamY[0]], [seamX[0], c.y + c.h / 2 + ext + 0.05]]) {
        if (zLow.length > 1) grp.add(label(`La @${fmm(LA.low)}`, xx, yy, z0 + (zLow[0] + zLow[zLow.length - 1]) / 2, {fg: '#fff', bg: 'rgba(45,108,223,.92)', h: 0.026, cx: 0}));
        if (zHigh.length > 1) grp.add(label(`La @${fmm(LA.high)}`, xx, yy, z0 + (zHigh[0] + zHigh[zHigh.length - 1]) / 2, {fg: '#fff', bg: 'rgba(45,108,223,.92)', h: 0.026, cx: 0}));
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
    // Gông cột: xà gồ thép hộp 50×50 nằm ngang ôm 4 mặt + cùm xà gồ (waler bracket) bắt vào sườn tấm, 4 cao độ
    const o = RIB + 0.025 + 0.01, bars = [], brk = [], levels = [0.3, 1.2, 2.1, 3.0].filter(d => d < H - 0.1);
    let barLen = 0;
    for (const dz of levels) {
      const z = z0 + dz, x0 = c.x - c.b/2 - o, x1 = c.x + c.b/2 + o, y0 = c.y - c.h/2 - o, y1 = c.y + c.h/2 + o, e = 0.15, hs = 0.025;
      addBox(bars, x0 - e, x1 + e, z - hs, z + hs, -y0 - hs, -y0 + hs); addBox(bars, x0 - e, x1 + e, z - hs, z + hs, -y1 - hs, -y1 + hs);   // 2 thanh theo phương x
      addBox(bars, x0 - hs, x0 + hs, z + hs, z + 3 * hs, -(y1 + e), -(y0 - e)); addBox(bars, x1 - hs, x1 + hs, z + hs, z + 3 * hs, -(y1 + e), -(y0 - e));   // 2 thanh phương y đặt chồng lên
      barLen += 2 * (x1 - x0 + 2 * e) + 2 * (y1 - y0 + 2 * e);
      for (const f of faces) for (const t of [-0.3, 0.3]) {   // cùm xà gồ: 2 cái mỗi mặt mỗi cao độ
        const along = f.n.x !== 0 ? [0, 1] : [1, 0], out = f.n.clone().negate(), px = f.cx + out.x * (RIB + 0.012) + along[0] * t, py = f.cy - out.z * (RIB + 0.012) + along[1] * t;
        addBox(brk, px - 0.02, px + 0.02, z - 0.045, z + 0.045, -py - 0.02, -py + 0.02);
      }
    }
    bomAdd(bom, 'Xà gồ thép hộp 50×50 (m dài)', 0, 0); bom['Xà gồ thép hộp 50×50 (m dài)'].n = Math.round(barLen * 10) / 10; bom['Xà gồ thép hộp 50×50 (m dài)'].kg = barLen * 2.65;
    bomAdd(bom, 'Cùm xà gồ (waler bracket)', 1.2, levels.length * faces.length * 2);
    const ginfo = () => ({title: 'Gông cột – xà gồ thép hộp 50×50', rows: [
      ['Cấu tạo', 'Xà gồ thép hộp 50×50 nằm ngang ôm 4 mặt cột, 2 phương đặt chồng lên nhau tại góc; cùm xà gồ (waler bracket) kẹp vào sườn tấm vách'],
      ['Cao độ', levels.map(d => '+' + d.toFixed(1).replace('.', ',')).join(' / ') + ' m từ chân cột'],
      ['Khối lượng', `≈ ${barLen.toFixed(1)} m dài, ${(barLen * 2.65).toFixed(0)} kg (hộp 50×50×1,8 ≈ 2,65 kg/m)`],
      ['Kiểm tra', 'Siết cùm đủ trước khi đổ; xà gồ thẳng, không cong vênh']]});
    const bm1 = meshFrom(bars, st), bm2 = meshFrom(brk, std({color: 0x6f7880, metalness: 0.6, roughness: 0.45})); bm1.userData.info = bm2.userData.info = ginfo; grp.add(bm1, bm2);
    // Cây chống xiên (push-pull prop) + cây chống chân (turnbuckle) – sổ tay mục Phụ kiện; đặt ở các mặt phía trong nhà
    // (mặt ngoài nhà không có sàn để tựa). Chân đế bắt bu lông neo vào sàn DƯL: phải tránh vùng cáp.
    const tubeO = [], tubeI = [], tubeT = [], plates = [], thread = [], gM = std({color: 0xb4bcc4, metalness: 0.75, roughness: 0.35}), gI = std({color: 0xc8cfd5, metalness: 0.75, roughness: 0.3}), gP = std({color: 0x8e979f, metalness: 0.6, roughness: 0.4}), gT = std({color: 0x7d858c, metalness: 0.7, roughness: 0.45}), gTb = std({color: 0xb4bcc4, metalness: 0.75, roughness: 0.35});   // thép mạ kẽm như thực tế
    const braceFaces = faces.filter(f => (f.n.x !== 0 ? (f.n.x < 0 ? c.x + c.b / 2 : c.x - c.b / 2) : (f.n.z > 0 ? c.y + c.h / 2 : c.y - c.h / 2)) > edge + 0.05 && !(f.n.x > 0 && c.x - c.b / 2 <= edge + 0.05) && !(f.n.z < 0 && c.y - c.h / 2 <= edge + 0.05));
    const braces = [];
    // Cây chống liên kết vào SÓNG ĐỨNG của tấm nhôm (sườn biên đứng tại mép giáp mí giữa 2 tấm) bằng bản mã bắt bu lông/chốt qua lỗ sườn;
    // cây chống xiên đầu trên ở ≈ 2/3 chiều cao, chân đế xoay có ren tựa sàn; cây chống chân bắt cùng sóng đứng ở chân tấm, móc neo sàn.
    // cao độ liên kết ≈ 0,7H, tránh trùng tầng xà gồ (lệch ≥ 0,2 m) để bản mã không vướng gông
    let hTop = Math.min(H - 0.3, 0.7 * H);
    for (let k = 0; k < 10 && levels.some(d => Math.abs(d - hTop) < 0.2); k++) hTop += 0.05;
    const lvlTop = hTop;
    for (const f of braceFaces) {
      const out = f.n.clone().negate(), dx = out.x, dy = -out.z;          // hướng ra ngoài mặt cột (plan)
      const along = f.n.x !== 0 ? [0, 1] : [1, 0];
      // vị trí sóng đứng (mép giáp mí) trên mặt này, theo đúng thứ tự tấm đã lắp
      let ws = split(f.w, [600, 450, 400, 350, 300, 250, 200]); if (f.n.x > 0 || f.n.z < 0) ws = ws.slice().reverse();
      const ex = new THREE.Vector3().crossVectors(PZ, f.n); let off = -f.w / 2; const seams = [];
      for (let i = 0; i < ws.length - 1; i++) { off += ws[i]; seams.push(off); }
      for (const sOff of seams) {
        const base = new THREE.Vector3(f.cx, 0, -f.cy).addScaledVector(ex, sOff), sx0 = base.x, sy0 = -base.z;   // điểm sóng đứng trên mặt bê tông (plan)
        // bản mã đứng kẹp 2 sườn biên tại mép giáp mí, nhô ra 120 để gắn đầu cây chống
        const lugOut = RIB + 0.12, hx = sx0 + dx * lugOut, hy = sy0 + dy * lugOut, t = 0.006;
        for (const [zc, hh] of [[hTop, 0.16], [0.15, 0.14]]) addBox(plates,
          Math.min(sx0 + dx * RIB, hx) - (along[0] ? t : 0), Math.max(sx0 + dx * RIB, hx) + (along[0] ? t : 0), z0 + zc - hh / 2, z0 + zc + hh / 2,
          -Math.max(sy0 + dy * RIB, hy) - (along[1] ? t : 0), -Math.min(sy0 + dy * RIB, hy) + (along[1] ? t : 0));
        // cây chống xiên
        const reach = Math.max(1.3, 0.6 * hTop), bx = hx + dx * reach, by = hy + dy * reach;
        const A = W(bx, by, z0 + 0.08), B = W(hx, hy, z0 + hTop), mid = A.clone().lerp(B, 0.55);
        prismSeg(tubeO, A.clone().lerp(B, 0.06), mid, 0.0302); prismSeg(tubeI, mid, B, 0.0243);
        prismSeg(thread, A, A.clone().lerp(B, 0.07), 0.016);
        addBox(plates, bx - 0.06, bx + 0.06, z0 + 0.003, z0 + 0.015, -by - 0.06, -by + 0.06);
        braces.push({kind: 'push', L: A.distanceTo(B), hz: hTop, reach, nm: f.nm});
        bomAdd(bom, 'Cây chống xiên (push-pull)', 16);
        // cây chống chân: cùng sóng đứng, ở chân tấm
        const tx = sx0 + dx * lugOut, ty = sy0 + dy * lugOut, fx2 = tx + dx * 0.7, fy2 = ty + dy * 0.7;
        const A2 = W(fx2, fy2, z0 + 0.06), B2 = W(tx, ty, z0 + 0.15), m1 = A2.clone().lerp(B2, 0.3), m2 = A2.clone().lerp(B2, 0.75);
        prismSeg(thread, A2, m1, 0.011); prismSeg(tubeT, m1, m2, 0.017); prismSeg(thread, m2, B2, 0.011);
        addBox(plates, fx2 - 0.012, fx2 + 0.012, z0, z0 + 0.09, -fy2 - 0.012, -fy2 + 0.012);
        braces.push({kind: 'turn', L: A2.distanceTo(B2), hz: 0.15, reach: 0.7, nm: f.nm});
        bomAdd(bom, 'Cây chống chân (turnbuckle)', 6);
      }
    }
    if (braces.length) {
      const nP = braces.filter(b => b.kind === 'push'), nT = braces.filter(b => b.kind === 'turn');
      const binfo = () => ({title: 'Cây chống xiên + cây chống chân cột', rows: [
        ['Cây chống xiên', `${nP.length} cây – đầu trên liên kết vào SÓNG ĐỨNG tấm nhôm (sườn biên tại mép giáp mí) bằng bản mã bắt chốt/bu lông qua lỗ sườn, cao +${lvlTop.toFixed(2).replace('.', ',')} m (≈ 2/3 chiều cao cột); chân đế xoay có ren tựa sàn cách mặt cột ≈ ${nP[0] ? nP[0].reach.toFixed(1).replace('.', ',') : '–'} m; dài ≈ ${nP[0] ? nP[0].L.toFixed(2) : '–'} m`],
        ['Cây chống chân', `${nT.length} cây (turnbuckle) – bản mã bắt vào cùng sóng đứng ở chân tấm (cao 0,15 m), đầu móc neo sàn cách 0,7 m, ren 2 đầu chỉnh chân cốp pha`],
        ['Mặt bố trí', [...new Set(braces.map(b => b.nm))].join(', ')],
        ['Công dụng', 'Căn chỉnh và giữ độ thẳng đứng cốp pha cột ≤ H/1000 trong lúc đổ'],
        ['LƯU Ý SÀN DƯL', 'Neo chân cây chống vào sàn phải tránh tuyến cáp (đánh dấu cáp trước khi khoan) hoặc dùng neo chờ đặt sẵn'],
        ['Mặt ngoài nhà', 'Không có sàn để tựa – giữ bằng gông xà gồ, la xuyên cột và biện pháp sàn công tác bao che'],
        ['Theo', 'Sổ tay Coffa nhôm – Phụ kiện: Cây chống xiên, Cây chống chân (Turnbuckle)']]});
      for (const [arr, m] of [[tubeO, gM], [tubeI, gI], [plates, gP], [thread, gT], [tubeT, gTb]]) { const ms = meshFrom(arr, m); ms.userData.info = binfo; grp.add(ms); }
    }
    bt.build(grp);
    return {grp, bom, braces};
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
    // chốt + nêm thép mạ kẽm vàng (như thực tế)
    PINM = PINM || std({color: 0xa88a3c, metalness: 0.7, roughness: 0.35, emissive: 0x241a04}); WGM = WGM || std({color: 0xdcbf5a, metalness: 0.65, roughness: 0.3, emissive: 0x2a2006});
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
    const alu = mAlu(), alb = mBeam(), head = mHead(), albBox = std({color: 0xc9d0d7, metalness: 0.55, roughness: 0.45});
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
        addPanel(bt, wy, lx, true, alu, mtx(W((sx.x0 + sx.x1) / 2, (sy.y0 + sy.y1) / 2, soffit), PY.clone().negate(), PX.clone(), PZ.clone()), card(code, [
          ['Loại', std ? 'Tấm sàn tiêu chuẩn (Slab panel)' : 'Tấm sàn đặc biệt – cắt theo thiết kế'], ['Kích thước', `${fmm(wy)} × ${fmm(lx)} mm`],
          ['Trọng lượng', `≈ ${kg.toFixed(1)} kg (20 kg/m²)`], ['Mặt cốp pha', fmtLv(soffit)],
          ['Lắp', 'Sau khi lắp xong dầm xương; lắp từ 2 đầu dầm xương đuổi vào giữa'], ['Tháo', 'Sau đổ 36 giờ (TVGS chấp thuận), GIỮ cây chống + đầu chống']]), code);
        bomAdd(bom, code, kg);
        // chốt tấm sàn: cạnh dài (mép 600 kề tấm bên) @300; cạnh ngắn (kề dầm xương / góc sàn) 2 chốt
        const zp = soffit - RIB / 2;
        for (let xx = sx.x0 + 0.15; xx < sx.x1 - 0.05; xx += 0.3) pinAt(bt, bom, W(xx, sy.y1, zp), PY);
        if (sy === ys[0]) for (let xx = sx.x0 + 0.15; xx < sx.x1 - 0.05; xx += 0.3) pinAt(bt, bom, W(xx, sy.y0, zp), PY);
        // cạnh ngắn: chỉ đặt chốt ở mép giáp mí với dầm xương / góc sàn / tấm kế bên (không lặp 2 lần cùng một mép)
        const ix = xs.indexOf(sx), left = xs[ix - 1], right = xs[ix + 1];
        for (let yy = sy.y0 + 0.15; yy < sy.y1 - 0.05; yy += 0.3) { if (!left || left.code === 'MB') pinAt(bt, bom, W(sx.x0, yy, zp), PX); pinAt(bt, bom, W(sx.x1, yy, zp), PX); }
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
          const m = box(hx0, hx1, hy0, hy1, soffit - RIB, soffit, albBox);                                  // cánh nằm dưới sàn
          const v = box(ix ? (ix > 0 ? x0 : x0 - RIB) : x0, ix ? (ix > 0 ? x0 + RIB : x0) : x1, iy ? (iy > 0 ? y0 : y0 - RIB) : y0, iy ? (iy > 0 ? y0 + RIB : y0) : y1, soffit - SCW, soffit, albBox);   // cánh đứng ốp thành dầm
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
          addMB(bt, L, alb, mtx(W(xm, ym, soffit), PX.clone(), PY.clone(), PZ.clone()), card(code, [['Loại', seg.code === 'MB' ? 'Dầm xương giữa (Middle beam) – 2 đầu vát ngược chiều' : 'Dầm xương cuối (End beam) – giữa góc sàn SC và đầu chống PH'],
            ['Kích thước', `150 × 125 × ${fmm(L)} mm`], ['Trọng lượng', `≈ ${kg.toFixed(1)} kg`], ['Lắp', 'Lắp bằng cao độ sàn, ≥ 3 công nhân; nối bằng thanh nẹp JB + chốt dài LP']]));
          bomAdd(bom, code, kg);
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
          if (stage === 'full' && !inCol(px, py, -0.1)) {
            const ex = EWb ? PX.clone() : PY.clone(), ey = EWb ? PY.clone() : PX.clone().negate();
            addPanel(bt, L, sw, false, alu, mtx(W(px, py, zb), ex, ey, PZ.clone()), card(code, [['Loại', 'Tấm đáy dầm (Beam bottom slab panel)'], ['Dầm', `${b.did} ${fmm(b.b)}×${fmm(b.h)}`], ['Đáy dầm', fmtLv(zb)], ['Trọng lượng', `≈ ${kg.toFixed(1)} kg`]]), code);
            bomAdd(bom, code, kg);
          }
          // đầu chống đặc biệt PHS + cây chống ở mỗi mối nối đáy dầm
          const [qx, qy] = P(u + L, w0 + sw / 2);
          if (u + L < b.hi - 0.1 && !inCol(qx, qy, 0.12)) {
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
          addPanel(bt, L, hgt, false, alb, mtx(W(px, py, zt - hgt / 2), ex, ey, ez), card(code, [['Loại', isOuter ? 'Thành dầm biên – cao hơn mặt sàn 50, công trường gia cố thêm' : 'Tấm thành dầm (Beam panel)'],
            ['Dầm', `${b.did} ${fmm(b.b)}×${fmm(b.h)}`], ['Kích thước', `${fmm(L)} × ${fmm(hgt)} mm`], ['Trọng lượng', `≈ ${kg.toFixed(1)} kg`], ['Tháo', 'Sau đổ 12 giờ cùng tấm vách, cột']]), code);
          bomAdd(bom, code, kg);
          // la xuyên dầm tại mép giáp mí đứng giữa 2 tấm thành (mỗi 600), ở giữa chiều cao thành
          if (side === 1 && u + L < b.hi - 0.05) {
            const [ax, ay] = P(u + L, -b.b / 2 - RIB - 0.1), [bx2, by2] = P(u + L, b.b / 2 + RIB + 0.1), zm = zTop - b.h + Math.min(b.h, drop) / 2 + 0.03;
            const arr = []; addBox(arr, Math.min(ax, bx2) - (EWb ? 0.0015 : 0), Math.max(ax, bx2) + (EWb ? 0.0015 : 0), zm - 0.016, zm + 0.016, -Math.max(ay, by2) - (EWb ? 0 : 0.0015), -Math.min(ay, by2) + (EWb ? 0 : 0.0015));
            const fm = meshFrom(arr, lam(0x2d6cdf, {emissive: 0x0b1d40}));
            fm.userData.info = card('FT – Thanh la xuyên dầm', [['Vị trí', `Mép giáp mí giữa 2 tấm thành dầm ${b.did}, bước 600 dọc dầm`], ['Dài', `${fmm(b.b + 2 * (RIB + 0.03))} mm`], ['Cấu tạo', 'Thép dẹt dày 3 bản 32, chốt RP + nêm WP 2 đầu']]);
            grp.add(fm); bomAdd(bom, 'FT – thanh la xuyên dầm', 0.75 * (b.b + 0.2));
          }
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
    // như thực tế: ống thép mạ kẽm, ống trong có hàng lỗ chốt chỉnh cao, đầu ống trong sơn đỏ, ống ren + đai ốc tại chỗ nối
    if (!cache.holeTex) { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d');
      x.fillStyle = '#d3d9de'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#2a2f34';
      for (const u of [8, 40]) { x.beginPath(); x.ellipse(u, 32, 5, 7, 0, 0, 2 * Math.PI); x.fill(); }
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 10); cache.holeTex = t; }
    const galv = std({color: 0xc3cad0, metalness: 0.75, roughness: 0.32});
    const mOut = new THREE.InstancedMesh(gOut, galv, n), mIn = new THREE.InstancedMesh(gIn, std({color: 0xffffff, map: cache.holeTex, metalness: 0.7, roughness: 0.32}), n), mPl = new THREE.InstancedMesh(gPl, galv, 2 * n);
    const gTip = new THREE.CylinderGeometry(0.0248, 0.0248, 0.12, 10), gNut = new THREE.CylinderGeometry(0.042, 0.042, 0.1, 10);
    const mTip = new THREE.InstancedMesh(gTip, std({color: 0xd2321e, metalness: 0.2, roughness: 0.55}), n), mNut = new THREE.InstancedMesh(gNut, std({color: 0x9aa3ab, metalness: 0.8, roughness: 0.4}), n);
    props.forEach((p, i) => {
      const L = p.zt - zFloor, zo = Math.min(V4.out, L); p.L = L; p.load = p.a * p.w * p.q; p.cap = v4Cap(L);
      o.position.copy(W(p.x, p.y, zFloor)); o.scale.set(1, zo, 1); o.updateMatrix(); mOut.setMatrixAt(i, o.matrix);
      o.position.copy(W(p.x, p.y, zFloor + zo)); o.scale.set(1, Math.max(0.01, L - zo), 1); o.updateMatrix(); mIn.setMatrixAt(i, o.matrix);
      o.scale.set(1, 1, 1); o.position.copy(W(p.x, p.y, zFloor + 0.003)); o.updateMatrix(); mPl.setMatrixAt(2 * i, o.matrix);
      o.position.copy(W(p.x, p.y, zFloor + L)); o.updateMatrix(); mPl.setMatrixAt(2 * i + 1, o.matrix);
      o.position.copy(W(p.x, p.y, zFloor + L - 0.07)); o.updateMatrix(); mTip.setMatrixAt(i, o.matrix);
      o.position.copy(W(p.x, p.y, zFloor + zo - 0.02)); o.updateMatrix(); mNut.setMatrixAt(i, o.matrix);
    });
    bomAdd(bom, 'SPP Kumkang V4', 14.8, n);
    // giằng ngang ống Ø48,6 + khoá cùm nối các cây chống ô sàn theo 2 phương (như ảnh công trường) – số tầng giằng theo biện pháp duyệt
    const slabP = props.filter(p => p.where.startsWith('Dưới đầu chống')), br = [], cp = [], zB = zFloor + 1.6;
    let brL = 0, nCp = 0;
    const rows = (key, other) => { const g = new Map(); for (const p of slabP) { const k = Math.round(p[key] * 20); if (!g.has(k)) g.set(k, []); g.get(k).push(p); } return [...g.values()].map(r => r.sort((a, b) => a[other] - b[other])); };
    for (const [key, other, dz, off] of [['y', 'x', 0, 0.056], ['x', 'y', 0.06, -0.056]]) for (const r of rows(key, other)) {
      if (r.length < 2) continue;
      const a = r[0], b = r[r.length - 1], z = zB + dz, e = 0.15;
      const A = key === 'y' ? W(a.x - e, a.y + off, z) : W(a.x + off, a.y - e, z), B = key === 'y' ? W(b.x + e, b.y + off, z) : W(b.x + off, b.y + e, z);
      prismSeg(br, A, B, 0.0243); brL += A.distanceTo(B);
      for (const p of r) { const cx = key === 'y' ? p.x : p.x + off / 2, cy = key === 'y' ? p.y + off / 2 : p.y; addBox(cp, cx - 0.045, cx + 0.045, z - 0.03, z + 0.03, -cy - 0.045, -cy + 0.045); nCp++; }
    }
    if (br.length) {
      const binf = () => ({title: 'Giằng ngang cây chống', rows: [['Cấu tạo', 'Ống thép mạ kẽm Ø48,6 chạy 2 phương, khoá cùm (coupler) vào từng cây chống ở cao +1,6 m'],
        ['Khối lượng', `≈ ${brL.toFixed(1)} m ống, ${nCp} khoá cùm`], ['Công dụng', 'Chống mất ổn định cây chống, giữ thẳng hàng khi tháo sàn sớm'],
        ['Lưu ý', 'Theo ảnh thực tế công trường – số tầng giằng/khoảng cách theo biện pháp Kumkang được duyệt']]});
      const m1 = meshFrom(br, galv), m2 = meshFrom(cp, std({color: 0xc9a43a, metalness: 0.6, roughness: 0.4})); m1.userData.info = m2.userData.info = binf; pg.add(m1, m2);
      bom['Giằng ngang ống Ø48,6 (m dài)'] = {n: Math.round(brL * 10) / 10, kg: brL * 3.6}; bomAdd(bom, 'Cùm khoá giằng (coupler)', 1.1, nCp);
    }
    const pinfo = hit => { const p = props[hit && hit.instanceId != null ? hit.instanceId : 0], ok = p.L >= V4.min && p.L <= V4.max, r = p.load / p.cap;
      return {title: 'Cây chống SPP – Kumkang V4', rows: [
        ['Vị trí', `${p.where} · x=${p.x.toFixed(2)}, y=${p.y.toFixed(2)}`],
        ['Chiều dài làm việc', `${p.L.toFixed(2)} m ${ok ? '(trong phạm vi 2,6–4,0 m)' : '– NGOÀI phạm vi V4'}`],
        ['Diện chịu tải', `${p.a.toFixed(2)} × ${p.w.toFixed(2)} m`],
        ['Tải ước tính', `${p.load.toFixed(1)} kN (${p.q.toFixed(2)} kN/m²: bê tông + cốp pha + thi công ${LIVE})`],
        ['Tải cho phép', `≈ ${p.cap.toFixed(1)} kN ở chiều dài này · sử dụng ${(r * 100).toFixed(0)}%${r > 0.9 ? ' – SÁT GIỚI HẠN, cần Kumkang tính toán' : ''}`],
        ['Ống', 'Thép mạ kẽm: ngoài Ø60,3×2,0 · trong Ø48,6×2,2 có hàng lỗ chỉnh cao, đầu sơn đỏ · đế/mũ 140×140'],
        ['Tháo', 'Khi mẫu bê tông đạt cường độ yêu cầu, sau kéo căng, ≥ 21 ngày (Rev02)']]}; };
    mOut.userData.info = mIn.userData.info = mTip.userData.info = mNut.userData.info = pinfo;
    pg.add(mOut, mIn, mPl, mTip, mNut); grp.add(pg);
    bt.build(grp);
    const usage = props.map(p => p.load / p.cap), maxU = Math.max(...usage);
    return {grp, bom, props, maxU, layout: {bx0, bx1, by0, by1, nD, line: best}};
  }

  // Bảng thống kê tấm (gắn vào thẻ bước)
  function bomRows(bom) {
    const rows = Object.entries(bom).sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => [k, `${v.n} ${k.startsWith('SPP') ? 'cây' : k.startsWith('RP') ? 'bộ' : k.startsWith('LP') ? 'cây' : k.includes('(m dài)') ? 'm' : k.startsWith('FT') ? 'thanh' : k.startsWith('Cùm') || k.startsWith('Cây') ? 'cái' : 'tấm'}${v.kg ? ` · ${v.kg.toFixed(0)} kg` : ''}`]);
    const tot = Object.values(bom).reduce((s, v) => s + v.kg, 0);
    rows.push(['Tổng khối lượng', `≈ ${(tot / 1000).toFixed(2)} tấn (vùng hiển thị)`]);
    return rows;
  }
  return {column, slab, bomRows};
})();
