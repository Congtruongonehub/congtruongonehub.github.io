// ===== Bộ dựng thép dầm, thép sàn, cáp DƯL BP2 (dữ liệu trích từ S-30…S-52 bản vẽ 29/08/2025) =====
// plan (x,y,z) → world (x, z, −y). Hình học dựng 1 lần cho mỗi loại sàn (T2, T3–9, T10, mái) rồi nhân bản theo cao độ.
function makeBeamSlabPT(BD, LV, M){
  const TYPES = {'2FL':['2FL'], typ:['3FL','4FL','5FL','6FL','7FL','8FL','9FL'], '10FL':['10FL'], Mai:['Mai']};
  const kgm = d => d*d/162, STRAND = 1.101; // kg/m tao 15,24 (140 mm²)
  const out = {beam:{}, slab:{}, pt:{}, kg:{}, hits:{beam:[], pt:[]}, info:{}};
  const box = (arr, x0,x1,y0,y1,z0,z1) => { // hộp trục song song (plan), 12 tam giác
    const v = [[x0,z0,-y0],[x1,z0,-y0],[x1,z0,-y1],[x0,z0,-y1],[x0,z1,-y0],[x1,z1,-y0],[x1,z1,-y1],[x0,z1,-y1]];
    for (const [a,b,c] of [[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7],[4,5,6],[4,6,7],[0,3,2],[0,2,1]]) arr.push(...v[a],...v[b],...v[c]); };
  const seg = (arr, x1,y1,z1, x2,y2,z2) => arr.push(x1,z1,-y1, x2,z2,-y2);
  const bk = (o,k) => (o[k] = o[k] || []);
  function meshes(grp, bars, lines, layer, cast){
    for (const [d,arr] of Object.entries(bars)){ if (!arr.length) continue; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr,3)); g.computeVertexNormals();
      const m = new THREE.Mesh(g, M['b'+d] || M.b16); m.userData.layer = layer; grp.add(m); }
    for (const [d,arr] of Object.entries(lines)){ if (!arr.length) continue; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr,3));
      const m = new THREE.LineSegments(g, M[(cast||'t')+d] || M.t10); m.userData.layer = layer+'T'; grp.add(m); }
  }
  for (const [tk, floors] of Object.entries(TYPES)){
    const T = BD[tk]; if (!T) continue;
    // ---------- dầm ----------
    const gB = new THREE.Group(), bars = {}, lines = {}; let kgB = 0; const hits = [];
    for (const b of T.beams){
      if (!b.LB.length && !b.ST.length) continue;
      const EW = b.o==='EW', c = b.c, B = b.b, H = b.h, cov = 0.035, sd = (b.ST[0] && b.ST[0][2] || 10)/1000;
      const P = (u, w) => EW ? [u, c + w] : [c + w, u];
      const groups = {};
      for (const L of b.LB) bk(groups, L[4]).push(L);
      for (const [pos, list] of Object.entries(groups)){
        // các nhóm cùng lớp: thanh suốt + thanh tăng cường xen kẽ trong bề rộng
        list.forEach((L, gi) => {
          const [a0,a1,n,d] = L, r = d/2000; let z;
          const dm = Math.max(...list.map(q => q[3]))/1000;
          if (pos==0) z = -cov - sd - r; else if (pos==1) z = -cov - sd - dm - 0.025 - r;
          else if (pos==2) z = -H + cov + sd + r; else if (pos==3) z = -H + cov + sd + dm + 0.025 + r; else z = -H/2;
          const W0 = -B/2 + cov + sd + r, W1 = B/2 - cov - sd - r;
          if (pos==4){ const m = Math.max(1, Math.round(n/2)); for (let i=0;i<m;i++){ const zz = m>1 ? -H*0.3 - i*(H*0.4/(m-1)) : -H/2; for (const w of [W0, W1]){ const [x0,y0] = P(a0,w), [x1,y1] = P(a1,w); box(bk(bars,d), Math.min(x0,x1)-r, Math.max(x0,x1)+r, Math.min(y0,y1)-r, Math.max(y0,y1)+r, zz-r, zz+r); } } kgB += n*(a1-a0)*kgm(d); return; }
          const off = gi===0 ? 0 : 0.5;
          for (let i=0;i<n;i++){ const t = n>1 ? (i + off*(gi>0?1:0)) / (n - (gi>0?0:1)) : 0.5; const w = W0 + Math.min(1,t)*(W1-W0);
            const [x0,y0] = P(a0,w), [x1,y1] = P(a1,w); box(bk(bars,d), Math.min(x0,x1)-r, Math.max(x0,x1)+r, Math.min(y0,y1)-r, Math.max(y0,y1)+r, z-r, z+r); }
          kgB += n*(a1-a0)*kgm(d);
        });
      }
      for (const [a0,a1,d,s] of b.ST){
        const sp = s/1000, L = bk(lines, d), w0 = -B/2 + cov, w1 = B/2 - cov, z0 = -H + cov, z1 = -cov, k = b.k || 0;
        for (let u = a0 + sp/2; u < a1; u += sp){
          const rectW = (wa, wb) => { const [ax,ay] = P(u,wa), [bx,by] = P(u,wb); seg(L, ax,ay,z0, bx,by,z0); seg(L, bx,by,z0, bx,by,z1); seg(L, bx,by,z1, ax,ay,z1); seg(L, ax,ay,z1, ax,ay,z0); kgB += 2*((wb-wa)+(z1-z0))*kgm(d); };
          rectW(w0, w1);
          for (let j=0;j<k;j++){ const cw = w0 + (w1-w0)*(j+0.5)/k, hw = (w1-w0)/(k)*0.55; rectW(Math.max(w0, cw-hw), Math.min(w1, cw+hw)); }
        }
      }
      // hộp chọn (ẩn)
      const [ax,ay] = P(b.lo, -B/2), [bx,by] = P(b.hi, B/2);
      const g = new THREE.BoxGeometry(Math.abs(bx-ax), H, Math.abs(by-ay)); g.translate((ax+bx)/2, -H/2, -(ay+by)/2);
      const hm = new THREE.Mesh(g, M.conc); hm.visible = false; hm.userData = {kind:'beam', b, tk}; hits.push(hm); gB.add(hm);
    }
    meshes(gB, bars, lines, 'beam');
    // ---------- sàn ----------
    const gS = new THREE.Group(), sl = {}; let kgS = 0;
    const zL = (code, d) => code===0 ? -0.02 - d/2000 : code===1 ? -0.032 - d/2000 : code===2 ? -0.20 + d/2000 : -0.188 + d/2000;
    for (const [dir,a0,a1,r0,r1,d,s,n,code,add] of T.slab){
      const z = zL(code, d), key = (code<2 ? 's' : 'u') + d, L = bk(sl, key);
      const pos = []; if (n){ for (let i=0;i<n;i++) pos.push((r0+r1)/2 + (i-(n-1)/2)*0.06); } else { const sp = s/1000; const cnt = Math.max(1, Math.floor((r1-r0)/sp+1e-6)+1); for (let i=0;i<cnt;i++) pos.push(r0 + i*sp); }
      for (const p of pos){ if (dir===0) seg(L, a0,p,z, a1,p,z); else seg(L, p,a0,z, p,a1,z); kgS += (a1-a0)*kgm(d); }
    }
    for (const [key,arr] of Object.entries(sl)){ const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr,3));
      const m = new THREE.LineSegments(g, M[key] || M.s10); m.userData.layer = key[0]==='s' ? 'slabT' : 'slabB'; gS.add(m); }
    // ---------- cáp DƯL ----------
    const gP = new THREE.Group(), pa = {}; let mStrand = 0; const pHits = [];
    const supports = (ax, c, a, b) => { const S = [];
      for (const bm of T.beams){ if ((ax==='X') === (bm.o==='EW')) continue; // dầm vuông góc với cáp
        if (c < bm.lo-0.2 || c > bm.hi+0.2) continue; if (bm.c < a-0.3 || bm.c > b+0.3) continue; S.push([bm.c, bm.b, bm.h]); }
      return S.sort((p,q)=>p[0]-q[0]); };
    for (const [ax,c,a,b,n,le,pts] of T.pt){
      const HI = -0.0725, LO = -0.1675, AN = -0.11;
      let C = [[a,AN],[b,AN]];
      const S = supports(ax,c,a,b);
      for (const [u,w] of S){ if (u-w/2 > a+0.2) C.push([u-w/2-0.3, HI]); C.push([Math.min(Math.max(u,a),b), HI]); if (u+w/2 < b-0.2) C.push([u+w/2+0.3, HI]); }
      C.sort((p,q)=>p[0]-q[0]);
      const C2 = [C[0]]; for (let i=1;i<C.length;i++){ const [u0] = C2[C2.length-1], [u1,z1] = C[i]; if (u1-u0 > 1.2) C2.push([(u0+u1)/2, LO]); C2.push([u1,z1]); }
      C = C2;
      for (const [u,z,isA] of pts){ C = C.filter(p => Math.abs(p[0]-u) > 0.8 || (isA && p[0]!==u)); C.push([u,z]); }
      C.sort((p,q)=>p[0]-q[0]);
      // nội suy cosin giữa các điểm khống chế
      const P2 = []; for (let i=0;i<C.length-1;i++){ const [u0,z0] = C[i], [u1,z1] = C[i+1], m = Math.max(1, Math.ceil((u1-u0)/0.6)); for (let j=0;j<m;j++){ const t = j/m, e = (1-Math.cos(Math.PI*t))/2; P2.push([u0+(u1-u0)*t, z0+(z1-z0)*e]); } } P2.push(C[C.length-1]);
      const wdt = n<=2 ? 0.045 : n===3 ? 0.07 : 0.09, key = 'p'+Math.min(n,5), arr = bk(pa, key);
      for (let i=0;i<P2.length-1;i++){ const [u0,z0] = P2[i], [u1,z1] = P2[i+1];
        const q = (u,w) => ax==='X' ? [u, c+w] : [c+w, u];
        const A = [q(u0,-wdt/2), q(u0,wdt/2), q(u1,wdt/2), q(u1,-wdt/2)];
        // dải phẳng 2 mặt + bề dày ống 25 mm
        for (const dz of [-0.0125, 0.0125]) arr.push(A[0][0],z0+dz,-A[0][1], A[1][0],z0+dz,-A[1][1], A[2][0],z1+dz,-A[2][1], A[0][0],z0+dz,-A[0][1], A[2][0],z1+dz,-A[2][1], A[3][0],z1+dz,-A[3][1]);
        for (const [s0,s1] of [[0,3],[1,2]]){ const a0 = A[s0], a1 = A[s1]; arr.push(a0[0],z0-0.0125,-a0[1], a1[0],z1-0.0125,-a1[1], a1[0],z1+0.0125,-a1[1], a0[0],z0-0.0125,-a0[1], a1[0],z1+0.0125,-a1[1], a0[0],z0+0.0125,-a0[1]); }
      }
      // neo: đầu kéo (hộp lớn) và đầu chết
      const anc = bk(pa, 'anc');
      for (const [e,u] of [[0,a],[1,b]]){ const live = le===2 || le===e, s = live ? 0.11 : 0.06, [x,y] = ax==='X' ? [u, c] : [c, u]; box(anc, x-s/2, x+s/2, y-s/2, y+s/2, AN-s/2, AN+s/2); }
      mStrand += n*(b-a+1.0);
      const [x0,y0] = ax==='X' ? [a, c-0.15] : [c-0.15, a], [x1,y1] = ax==='X' ? [b, c+0.15] : [c+0.15, b];
      const g = new THREE.BoxGeometry(x1-x0, 0.15, y1-y0); g.translate((x0+x1)/2, -0.11, -(y0+y1)/2);
      const hm = new THREE.Mesh(g, M.conc); hm.visible = false; hm.userData = {kind:'pt', ax, c, a, b, n, le, C, tk}; pHits.push(hm); gP.add(hm);
    }
    for (const [key,arr] of Object.entries(pa)){ const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr,3)); g.computeVertexNormals();
      const m = new THREE.Mesh(g, M[key] || M.p3); m.userData.layer = 'pt'; gP.add(m); }
    out.kg[tk] = {beam:kgB, slab:kgS, strand:mStrand*STRAND, strandM:mStrand, nT:T.pt.length, floors:floors.length};
    // nhân bản theo tầng
    for (const fl of floors){
      for (const [kind, src, H] of [['beam', gB, hits], ['slab', gS, null], ['pt', gP, pHits]]){
        const g = floors.length===1 ? src : src.clone(); g.position.y = LV[fl]; g.userData.fl = fl; out[kind][fl] = g;
        if (kind!=='slab') g.traverse(o => { if (o.userData && o.userData.kind) { o.userData.fl = fl; (kind==='beam' ? out.hits.beam : out.hits.pt).push(o); } });
      }
    }
  }
  return out;
}
