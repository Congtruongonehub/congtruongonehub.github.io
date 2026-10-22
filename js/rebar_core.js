// ===== Bộ dựng cốt thép cột + vách lõi BP2 (dùng chung cho trang riêng và mô hình tổng) =====
// Theo RFR-CD-S-00-01 (neo/nối C30/37, CB500-V: Lneo1 42Ø, Lnối 41Ø, móc 90° ≥12d, chân ≥15D ≥300),
// RFR-CD-S-00-02 mục XII (mặt cắt điển hình dọc cột: nối từ +100 trên mặt sàn, so le 2 nhóm ≤50%, thép dưới bẻ xiên vào trong),
// bảng cột S-70-01…03, đường kính vách theo S-80 (CW1), S-81 (CW2), S-82 (CW3), S-83 (CW4).
// plan (x,y,z) → world (x, z, −y)
function makeRebar(G, SCH, M){
  const LV = G.lv, FL = ['1FL','2FL','3FL','4FL','5FL','6FL','7FL','8FL','9FL','10FL','Mai'], NST = 10;
  const kgm = d => d*d/162, LAP = d => 41*d/1000, NEO = d => 42*d/1000, BX = [-0.7, 76.9, -0.65, 28.85];
  const out = (x,y) => x<BX[0]||x>BX[1]||y<BX[2]||y>BX[3];
  const ST = []; for (let s=0;s<NST;s++) ST.push({grp:new THREE.Group(), bars:{col:{},wall:{}}, ties:{col:{},wall:{}}, kg:{colV:0,colT:0,wallV:0,wallH:0}, hits:[]});
  const bucket = (o,k) => (o[k] = o[k] || []);
  function prism(arr, x1,y1,z1, x2,y2,z2, d){
    const r = Math.max(d/1000, 0.014)/2, ax=x1, ay=z1, az=-y1, bx=x2, by=z2, bz=-y2;
    let dx=bx-ax, dy=by-ay, dz=bz-az; const L = Math.hypot(dx,dy,dz); if (L<1e-6) return 0; dx/=L; dy/=L; dz/=L;
    let ux,uy,uz; if (Math.abs(dy)<0.9){ ux=0;uy=1;uz=0; } else { ux=1;uy=0;uz=0; }
    const k = ux*dx+uy*dy+uz*dz; ux-=k*dx; uy-=k*dy; uz-=k*dz; const ul = Math.hypot(ux,uy,uz)/r; ux/=ul; uy/=ul; uz/=ul;
    const wx = dy*uz-dz*uy, wy = dz*ux-dx*uz, wz = dx*uy-dy*ux;
    const C = [[1,1],[-1,1],[-1,-1],[1,-1]], A = [], B = [];
    for (const [s,t] of C){ A.push([ax+s*ux+t*wx, ay+s*uy+t*wy, az+s*uz+t*wz]); B.push([bx+s*ux+t*wx, by+s*uy+t*wy, bz+s*uz+t*wz]); }
    for (let i=0;i<4;i++){ const j=(i+1)%4; arr.push(...A[i],...A[j],...B[j], ...A[i],...B[j],...B[i]); }
    return L;
  }
  function poly(arr, pts, d){ let L = 0; for (let i=1;i<pts.length;i++){ const [a,b,c]=pts[i-1], [e,f,g]=pts[i]; L += prism(arr,a,b,c,e,f,g,d); } return L; }
  const seg = (arr, x1,y1,z1, x2,y2,z2) => arr.push(x1,z1,-y1, x2,z2,-y2);
  const rect = (arr, x0,x1,y0,y1,z) => { seg(arr,x0,y0,z,x1,y0,z); seg(arr,x1,y0,z,x1,y1,z); seg(arr,x1,y1,z,x0,y1,z); seg(arr,x0,y1,z,x0,y0,z); };
  const lapBox = (s, cx, cy, sx, sy, z0, z1, mat, info) => { const g = new THREE.BoxGeometry(sx, z1-z0, sy); g.translate(cx, (z0+z1)/2, -cy);
    const m = new THREE.Mesh(g, mat); m.userData.layer = 'lap'; m.renderOrder = 2; ST[s].grp.add(m); };

  // ---------- cột ----------
  function spec(type, s){ const r = (SCH[type]||[]).find(e => s>=e[0] && s<e[1]); return r ? {n:r[2], d:r[3], td:r[4], ts:r[5]/1000, from:FL[r[0]], to:FL[r[1]]} : null; }
  function perim(b,h,n){ let nx, ny; if (Math.abs(b-h)<0.01){ nx = ny = n/4+1; } else if (b>h){ ny = b/h > 3 ? 4 : Math.round((n+4)/2*h/(b+h)); nx = (n+4)/2-ny; } else { nx = Math.round((n+4)/2*b/(b+h)); ny = (n+4)/2-nx; } return {nx, ny}; }
  const COLS = [];
  for (const c of G.cols){
    const top = c.to_level==='Mai' ? 10 : 9, rec = {c, top, st:[]}; COLS.push(rec);
    for (let s=0; s<top; s++){
      const sp = spec(c.type, s); if (!sp) continue;
      const last = s===top-1, spN = last ? null : spec(c.type, s+1), spP = s>0 ? spec(c.type, s-1) : null;
      const d = sp.d, zS = LV[FL[s]], zN = LV[FL[s+1]], Lp = spP ? LAP(Math.min(spP.d,d)) : 0, Ln = spN ? LAP(Math.min(spN.d,d)) : 0;
      const cov = 0.04 + sp.td/1000 + d/2000, x0 = c.x-c.b/2+cov, x1 = c.x+c.b/2-cov, y0 = c.y-c.h/2+cov, y1 = c.y+c.h/2-cov;
      const {nx, ny} = perim(c.b, c.h, sp.n), ix = i => x0+(x1-x0)*i/(nx-1), iy = j => y0+(y1-y0)*j/(ny-1);
      const P = []; // vòng theo chu vi để chia nhóm nối so le liền kề
      for (let i=0;i<nx;i++) P.push([ix(i),y0,0,1]); for (let j=1;j<ny-1;j++) P.push([x1,iy(j),-1,0]);
      for (let i=nx-1;i>=0;i--) P.push([ix(i),y1,0,-1]); for (let j=ny-2;j>=1;j--) P.push([x0,iy(j),1,0]);
      for (const p of P){ if (Math.abs(p[0]-x0)<1e-6) p[2]=1; if (Math.abs(p[0]-x1)<1e-6) p[2]=-1; if (Math.abs(p[1]-y0)<1e-6) p[3]=1; if (Math.abs(p[1]-y1)<1e-6) p[3]=-1; }
      const arr = bucket(ST[s].bars.col, d); let L = 0;
      const hookDir = (x,y,ox,oy,len) => { let hx = ox ? -ox : 0, hy = ox ? 0 : -oy; if (out(x+hx*len, y+hy*len)) { hx=-hx; hy=-hy; } return [hx,hy]; };
      const hk = Math.max(12*d/1000, NEO(d)-0.55), hb = Math.max(15*d/1000, 0.3), cr = 6*d/1000, off = d/1000;
      P.forEach(([x,y,ox,oy], i) => {
        const g = i%2, pts = [];
        const zs = s===0 ? zS-0.22 : zS+0.1+g*Lp;
        if (s===0){ const [hx,hy] = hookDir(x,y,ox,oy,hb); pts.push([x+hx*hb, y+hy*hb, zs]); }
        pts.push([x,y,zs]);
        if (last){ const zt = zN-0.05, [hx,hy] = hookDir(x,y,ox,oy,hk); pts.push([x,y,zt],[x+hx*hk, y+hy*hk, zt]); }
        else { const zL = zN+0.1+g*Ln, k = ox&&oy ? 0.7071 : 1; pts.push([x,y,zL-cr],[x+ox*off*k, y+oy*off*k, zL],[x+ox*off*k, y+oy*off*k, zL+Ln]); }
        L += poly(arr, pts, d);
      });
      ST[s].kg.colV += L*kgm(d);
      // đai: a(theo bảng) trong thân cột, 3 đai trên cùng a100, đai a200 trong vùng nút dầm/sàn
      const tarr = bucket(ST[s].ties.col, sp.td), to = 0.04 + sp.td/2000, tx0=c.x-c.b/2+to, tx1=c.x+c.b/2-to, ty0=c.y-c.h/2+to, ty1=c.y+c.h/2-to;
      const soff = zN-0.22, Z = []; for (let z=zS+0.05; z<=soff-0.05+1e-6; z+=sp.ts) Z.push(z); for (let z=soff+0.05; z<zN-0.03; z+=0.2) Z.push(z);
      let TL = 0;
      for (const [k,z] of Z.entries()){
        if (c.type==='C5'){ const e = 0.45-to; rect(tarr, tx0, tx0+e+0.02, ty0, ty1, z); rect(tarr, tx1-e-0.02, tx1, ty0, ty1, z); TL += 2*2*((e+0.02)+(ty1-ty0));
          if (k%4===0){ const l = bucket(ST[s].ties.col, 10); for (let i=4;i<nx-4;i+=2){ seg(l, ix(i), ty0, z, ix(i), ty1, z); TL += (ty1-ty0)*kgm(10)/kgm(sp.td); } }
        } else { rect(tarr, tx0,tx1,ty0,ty1,z); TL += 2*((tx1-tx0)+(ty1-ty0));
          const a = Math.round((nx-1)*0.22), b2 = nx-1-a, c2 = Math.round((ny-1)*0.22), d2 = ny-1-c2;
          rect(tarr, ix(a)-0.02, ix(b2)+0.02, ty0, ty1, z); rect(tarr, tx0, tx1, iy(c2)-0.02, iy(d2)+0.02, z);
          TL += 2*((ix(b2)-ix(a)+0.04)+(ty1-ty0)) + 2*((tx1-tx0)+(iy(d2)-iy(c2)+0.04)); }
      }
      ST[s].kg.colT += TL*kgm(sp.td);
      const e = {s, zS, zN, d, n:sp.n, td:sp.td, ts:sp.ts, sp};
      if (s===0) e.bot = {z: zS-0.22, hb};
      if (last) e.top = {z: zN-0.05, hk};
      else { e.lap = {z0: zN+0.1, z1: zN+0.1+Ln, z2: zN+0.1+2*Ln, Ln, d2: spN.d};
        lapBox(s, c.x, c.y, c.b+0.07, c.h+0.07, e.lap.z0, e.lap.z1, M.lap1); lapBox(s, c.x, c.y, c.b+0.07, c.h+0.07, e.lap.z1, e.lap.z2, M.lap2); }
      rec.st[s] = e;
      const g = new THREE.BoxGeometry(c.b, zN-0.22-zS, c.h); g.translate(c.x, (zS+zN-0.22)/2, -c.y);
      const m = new THREE.Mesh(g, M.conc); m.userData = {kind:'col', rec, c, s, sp, kg:L*kgm(d)+TL*kgm(sp.td), nBars:P.length, nT:Z.length}; m.visible = false; ST[s].grp.add(m); ST[s].hits.push(m);
    }
  }

  // ---------- vách lõi: bố trí theo vùng thép trên tờ chi tiết S-80…S-83 ----------
  // Vùng [x0,x1,y0,y1 (mm, gốc góc ngoài dưới-trái lõi), số thanh, nhóm Ø ('B' | 'W'), chỉ có ở tờ]
  // Nhóm 'B': Ø25/20/16 (vách biên, ký hiệu 30-31); nhóm 'W': Ø20/16 (vách thân, ký hiệu 30a-31a)
  const WALL = {
    CW1: {o:[21.7,10.3], mir:false, bands:[[0,1,'S-80-01',25,20],[1,2,'S-80-02',25,16],[2,9,'S-80-03',20,16],[9,10,'S-80-04',16,16]], Z:[
      [0,600,7300,7600,8,'B'],[600,2800,7300,7600,20,'B'],[2800,3400,7300,7600,8,'B'],
      [0,300,6350,7300,10,'B'],[0,300,3350,6350,28,'B'],[0,300,2100,3350,14,'B'],[0,300,1100,2100,10,'B',['S-80-03']],
      [0,300,750,1100,8,'B'],[0,300,300,750,4,'B'],
      [0,600,0,300,8,'B'],[600,1200,0,300,6,'B'],[1200,2000,0,300,8,'B'],[2000,3100,0,300,12,'B',['S-80-02','S-80-04']],
      [3100,3400,6350,7300,10,'W'],[3100,3400,1250,6350,50,'W'],[3100,3400,0,1250,14,'W']]},
    CW2: {o:[34.6,10.3], mir:false, bands:[[0,2,'S-81-01',25,20],[2,9,'S-81-02',20,16],[9,10,'S-81-03',16,16]], Z:null},
    CW3: {o:[40.4,10.3], mir:true,  bands:[[0,2,'S-82-01',25,20],[2,9,'S-82-02',20,16],[9,10,'S-82-03',16,16]], Z:null},
    CW4: {o:[48.2,10.3], mir:false, bands:[[0,1,'S-83-01',25,20],[1,2,'S-83-02',25,16],[2,10,'S-83-03',20,16]], Z:[
      [0,300,6350,7600,14,'W'],[0,300,1250,6350,50,'W'],[0,300,300,1250,10,'W'],[300,850,3200,3500,6,'W'],
      [2900,3500,7300,7600,8,'B'],[2900,3200,6350,7300,10,'W'],[2900,3200,1250,6350,50,'W'],[2900,3200,300,1250,10,'W'],[2350,2900,3200,3500,6,'W'],
      [0,600,0,300,8,'B'],[600,2600,0,300,18,'B'],[2600,3200,0,300,8,'B'],
      [3500,4300,7300,7600,6,'B'],[4300,4900,7300,7600,8,'B'],[4900,6000,7300,7600,12,'B',['S-83-01','S-83-02']],
      [6000,6300,6350,7600,14,'B'],[6000,6300,3350,6350,28,'B'],[6000,6300,2100,3350,14,'B'],[6000,6300,1100,2100,10,'B',['S-83-02','S-83-03']],
      [6000,6300,750,1100,8,'B'],[6000,6300,300,750,4,'B'],[5700,6300,0,300,8,'B'],
      [3200,4300,0,300,12,'B',['S-83-02','S-83-03']],[4300,4900,0,300,8,'B'],[4900,5700,0,300,6,'B']]}
  };
  const CW23 = [[0,600,7300,7600,8,'B'],[600,2200,7300,7600,14,'B'],[2200,2800,7300,7600,8,'B'],[2500,2800,6850,7300,8,'B',null,['-03']],
      [0,300,6350,7300,10,'W'],[0,300,1250,6350,50,'W'],[0,300,300,1250,10,'W'],
      [0,600,0,300,8,'B'],[600,2200,0,300,14,'B'],[2200,2800,0,300,8,'B'],[2500,2800,300,750,8,'B',null,['-03']],
      [2500,2800,2050,3150,22,'W',null,['-03']],[2500,2800,4450,5550,22,'W',null,['-03']]];
  WALL.CW2.Z = CW23; WALL.CW3.Z = CW23;
  const CORES = [];
  const zoneOn = (z, sheet) => (!z[6] || z[6].includes(sheet)) && (!z[7] || !z[7].some(k => sheet.endsWith(k)));
  for (const id of (G.noCores ? [] : ['CW1','CW2','CW3','CW4'])){
    const W = WALL[id], crec = {id, st:[]}; CORES.push(crec);
    const P = (x,y) => [W.o[0] + (W.mir ? 2.8 - x/1000 : x/1000), W.o[1] + y/1000];
    const band = s => W.bands.find(b => s>=b[0] && s<b[1]);
    for (let s=0; s<10; s++){
      const bd = band(s); if (!bd) continue;
      const bN = s<9 ? band(s+1) : null, bP = s>0 ? band(s-1) : null;
      const [, , sheet, dB, dW] = bd, z0 = LV[FL[s]], z1 = LV[FL[s+1]], last = s===9, zs = z1-0.22;
      const dia = (k, b) => k==='B' ? b[3] : b[4];
      let kgV = 0, kgH = 0, Lmax = 0; const hitG = [];
      const ZS = W.Z.filter(z => zoneOn(z, sheet));
      for (const z of ZS){
        const [x0,x1,y0,y1,n,k] = z, d = dia(k, bd), long = (x1-x0) >= (y1-y0);
        const inN = bN && W.Z.some(q => q===z && zoneOn(q, bN[2])), inP = bP && W.Z.some(q => q===z && zoneOn(q, bP[2]));
        const dN = inN ? dia(k, bN) : d, dP = inP ? dia(k, bP) : d;
        const Ln = LAP(Math.min(d, dN)), Lp = LAP(Math.min(d, dP)); Lmax = Math.max(Lmax, Ln);
        const cv = 0.03 + 0.012 + d/2000, per = n/2;
        // hai hàng thanh dọc theo cạnh dài của vùng
        const pts = [];
        for (let i=0;i<per;i++){
          const t = per>1 ? i/(per-1) : 0.5;
          if (long){ const x = x0/1000+cv+t*((x1-x0)/1000-2*cv); pts.push([x, y0/1000+cv, 0, 1],[x, y1/1000-cv, 0, -1]); }
          else { const y = y0/1000+cv+t*((y1-y0)/1000-2*cv); pts.push([x0/1000+cv, y, 1, 0],[x1/1000-cv, y, -1, 0]); }
        }
        const arr = bucket(ST[s].bars.wall, d), hb = Math.max(15*d/1000, 0.3), cr = 6*d/1000;
        pts.forEach(([lx,ly,ix,iy], i) => {
          if (W.mir) ix = -ix;
          const [x,y] = P(lx*1000, ly*1000), g = (i>>1)%2, pl = [];
          const zb = s===0 ? z0-0.22 : (inP ? z0+0.1+g*Lp : z0+0.05);
          if (s===0) pl.push([x-ix*hb, y-iy*hb, zb]);
          pl.push([x,y,zb]);
          if (last || !inN){ const zt = z1-0.05, w2 = 0.3-2*cv; pl.push([x,y,zt],[x+ix*w2, y+iy*w2, zt]); }
          else { const zL = z1+0.1+g*Ln, dd = d/1000; pl.push([x,y,zL-cr],[x+ix*dd, y+iy*dd, zL],[x+ix*dd, y+iy*dd, zL+Ln]); }
          kgV += poly(arr, pl, d)*kgm(d);
        });
        // móc Ø8a400 nối hai lớp, mỗi thanh thứ hai
        const Lk = bucket(ST[s].ties.wall, 8);
        for (let zz=z0+0.2; zz<zs-0.05; zz+=0.4) for (let i=0;i<pts.length;i+=4){ const a = P(pts[i][0]*1000, pts[i][1]*1000), b = P(pts[i+1][0]*1000, pts[i+1][1]*1000); seg(Lk, a[0],a[1],zz, b[0],b[1],zz); kgH += 0.3*kgm(8); }
        const [ax,ay] = P(x0,y0), [bx,by] = P(x1,y1), cx = (ax+bx)/2, cy = (ay+by)/2, sx = Math.abs(bx-ax), sy = Math.abs(by-ay);
        const g = new THREE.BoxGeometry(sx, zs-z0, sy); g.translate(cx, (z0+zs)/2, -cy);
        const m = new THREE.Mesh(g, M.conc); m.visible = false; m.userData = {kind:'wall', crec, core:id, s, n, d, k, sheet, dB, dW, len:Math.max(sx,sy)}; hitG.push(m);
        if (!last) { lapBox(s, cx, cy, sx+0.07, sy+0.07, z1+0.1, z1+0.1+Ln, M.lap1); lapBox(s, cx, cy, sx+0.07, sy+0.07, z1+0.1+Ln, z1+0.1+2*Ln, M.lap2); }
      }
      // đai kín Ø12a100/200 bao từng đoạn vách thẳng (a100 trong vùng nối và 3 đai sát đáy sàn, a200 còn lại)
      const runs = [];
      for (const z of ZS){ const long = (z[1]-z[0]) >= (z[3]-z[2]);
        const r = runs.find(r => long ? (r.y0===z[2] && r.y1===z[3] && (Math.abs(r.x1-z[0])<1 || Math.abs(r.x0-z[1])<1)) : (r.x0===z[0] && r.x1===z[1] && (Math.abs(r.y1-z[2])<1 || Math.abs(r.y0-z[3])<1)));
        if (r){ r.x0=Math.min(r.x0,z[0]); r.x1=Math.max(r.x1,z[1]); r.y0=Math.min(r.y0,z[2]); r.y1=Math.max(r.y1,z[3]); } else runs.push({x0:z[0],x1:z[1],y0:z[2],y1:z[3]}); }
      const T = bucket(ST[s].ties.wall, 12), lapTop = z0 + 0.1 + 2*Lmax;
      const Zt = []; for (let zz=z0+0.05; zz<zs-0.03; zz += (zz < lapTop || zz > zs-0.35) ? 0.1 : 0.2) Zt.push(zz);
      for (const r of runs){ const [ax,ay] = P(r.x0+30, r.y0+30), [bx,by] = P(r.x1-30, r.y1-30);
        for (const zz of Zt){ rect(T, Math.min(ax,bx), Math.max(ax,bx), Math.min(ay,by), Math.max(ay,by), zz); kgH += 2*(Math.abs(bx-ax)+Math.abs(by-ay))*kgm(12); } }
      crec.st[s] = {s, z0, z1, dB, dW, sheet, last, bot: s===0, lap: last ? null : {z0:z1+0.1, z1:z1+0.1+Lmax, z2:z1+0.1+2*Lmax}, top: last ? {z:z1-0.05} : null};
      ST[s].kg.wallV += kgV; ST[s].kg.wallH += kgH;
      for (const m of hitG){ m.userData.kgCore = kgV + kgH; ST[s].grp.add(m); ST[s].hits.push(m); }
    }
  }

  // ---------- dựng lưới ----------
  for (const S of ST){
    for (const part of ['col','wall']){
      for (const [d,arr] of Object.entries(S.bars[part])){ const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr,3)); g.computeVertexNormals();
        const m = new THREE.Mesh(g, M['b'+d]); m.userData.layer = part; S.grp.add(m); }
      for (const [d,arr] of Object.entries(S.ties[part])){ const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr,3));
        const m = new THREE.LineSegments(g, M['t'+d]); m.userData.layer = part+'T'; S.grp.add(m); }
    }
    S.bars = S.ties = null;
  }
  return {ST, COLS, CORES, FL, LV};
}

// ---------- cao trình thép: nhãn + vạch mốc cạnh cấu kiện đang chọn ----------
const fmtZ = v => (v>=0?'+':'−') + Math.abs(v).toFixed(3).replace('.',',');
function rebarSprite(text, x, y, z, size, color, bg){
  const c = document.createElement('canvas'), ctx = c.getContext('2d'), F = '600 40px "JetBrains Mono", Consolas, monospace';
  ctx.font = F; const w = Math.ceil(ctx.measureText(text).width)+20; c.width = w; c.height = 56;
  ctx.fillStyle = bg; ctx.globalAlpha = 0.86; ctx.fillRect(0,0,w,56); ctx.globalAlpha = 1; ctx.font = F; ctx.fillStyle = color; ctx.fillText(text, 10, 42);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c), depthTest:false, transparent:true}));
  sp.scale.set(size*w/56, size, 1); sp.center.set(0, 0.5); sp.position.set(x, z, -y); sp.renderOrder = 10; return sp;
}
function rebarElev(R, sel, s0, col){ // sel = userData của cột/vách được chọn; s0 = đoạn tầng đang xem (−1 = mọi tầng)
  const grp = new THREE.Group(), tick = [], C = col || {};
  const fg = C.fg || '#18232D', bg = C.bg || '#FFFFFF', a1 = C.lap1 || '#D2691E', a2 = C.lap2 || '#2B6CB0';
  let X, Y, rx, ry, list;
  if (sel.kind==='col'){ const c = sel.c; X = c.x + c.b/2 + 0.25; Y = c.y; rx = c.x-c.b/2-0.1; ry = c.x+c.b/2+0.15; list = sel.rec.st; }
  else { const S = sel.crec.st; list = S; const h = sel.hit; X = h.x + 0.6; Y = h.y; rx = h.x-0.2; ry = h.x+0.35; }
  const lab = (t, z, colr, dz=0) => { grp.add(rebarSprite(t, X, Y, z+dz, 0.26, colr, bg)); tick.push(rx, z, -Y, ry+0.2, z, -Y); };
  list.forEach((e, s) => { if (!e || (s0>=0 && s!==s0 && s!==s0-1)) return;
    if (s0<0 || s===s0) lab('Mặt sàn '+R.FL[s].replace('FL','')+'  '+fmtZ(e.zS ?? e.z0), e.zS ?? e.z0, fg);
    if (e.bot && (s0<0 || s===s0)) lab('Chân thép, bẻ '+Math.round((e.bot.hb||0.3)*1000)+'  '+fmtZ(e.bot.z ?? (e.z0-0.22)), e.bot.z ?? (e.z0-0.22), fg, -0.18);
    if (e.lap && (s0<0 || s===s0 || s===s0-1)){ const L = e.lap, nm = sel.kind==='col' ? `Ø${Math.min(e.d, L.d2)} Lnối ${Math.round((L.z1-L.z0)*1000)}` : `Lnối ${Math.round((L.z1-L.z0)*1000)}`;
      lab('Nối nhóm 1 từ '+fmtZ(L.z0), L.z0, a1, 0.1); lab('Hết nối 1 / nối nhóm 2 '+fmtZ(L.z1)+'  ('+nm+')', L.z1, a1); lab('Hết nối nhóm 2 '+fmtZ(L.z2), L.z2, a2); }
    if (e.top && (s0<0 || s===s0)) lab('Đỉnh thép, bẻ neo 90°'+(e.top.hk?' L='+Math.round(e.top.hk*1000):'')+'  '+fmtZ(e.top.z), e.top.z, fg, 0.15);
  });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(tick,3));
  const ln = new THREE.LineSegments(g, new THREE.LineBasicMaterial({color:fg, depthTest:false})); ln.renderOrder = 9; grp.add(ln);
  return grp;
}
function rebarTable(R, sel){ // bảng cao trình theo từng đoạn tầng
  const list = sel.kind==='col' ? sel.rec.st : sel.crec.st; let h = '<tr><th>Đoạn</th><th>Mặt sàn</th><th>Nối nhóm 1</th><th>Nối nhóm 2</th></tr>';
  list.forEach((e,s) => { if (!e) return; const nm = R.FL[s].replace('FL','')+'→'+(R.FL[s+1]==='Mai'?'Mái':R.FL[s+1].replace('FL',''));
    const z = e.zS ?? e.z0;
    if (e.lap) h += `<tr><td>${nm}</td><td>${fmtZ(z)}</td><td>${fmtZ(e.lap.z0)} → ${fmtZ(e.lap.z1)}</td><td>→ ${fmtZ(e.lap.z2)}</td></tr>`;
    else h += `<tr><td>${nm}</td><td>${fmtZ(z)}</td><td colspan="2">đỉnh thép ${fmtZ(e.top.z)}, bẻ neo 90°${e.top.hk?' dài '+Math.round(e.top.hk*1000):''}</td></tr>`; });
  return h;
}
