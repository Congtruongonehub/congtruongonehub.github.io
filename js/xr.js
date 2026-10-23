// ===== AR bám không gian (WebXR immersive-ar) =====
// Android: Chrome + ARCore chạy trực tiếp. iPhone: Safari chưa có WebXR → mở qua App Clip Needle Go (ARKit).
// Căn mô hình: ngắm dấu + vào tâm tem → điện thoại dò mặt phẳng (mặt cột / mặt sàn) → suy ra vị trí + hướng tem
// trong không gian thật → mô hình đứng yên đúng chỗ khi đi lại. Lệch thì ngắm tem khác bấm "Căn lại".
'use strict';
const XR = (() => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const APPCLIP = 'https://appclip.needle.tools/ar?url=';
  const CLIP0 = CLIP.map(p => p.clone());
  let session = null, refSpace = null, hitSrc = null, lastHit = null, xrRoot = null, A = null, stage = 0, first = null, reticle = null, ok = null;
  const camXR = new THREE.PerspectiveCamera(60, 1, 0.02, 300);
  const V = (a, b, c) => new THREE.Vector3(a, b, c);

  async function supported() { try { return !!(navigator.xr && await navigator.xr.isSessionSupported('immersive-ar')); } catch (e) { return false; } }

  // hệ tem trong mô hình: X = u (phải), Y = v (xuống), Z = n (vào bề mặt), gốc = tâm tem
  function temModel(tok) {
    const t = TAGS[tok], u = W(...t.u).sub(W(0, 0, 0)), v = W(...t.v).sub(W(0, 0, 0)), n = V().crossVectors(u, v);
    return new THREE.Matrix4().makeBasis(u, v, n).setPosition(W(...t.o));
  }
  const isFloor = tok => Math.abs(W(...TAGS[tok].u).sub(W(0, 0, 0)).cross(W(...TAGS[tok].v).sub(W(0, 0, 0))).y) > 0.9;
  // hệ tem trong không gian XR từ: p = tâm tem, nIn = pháp tuyến vào bề mặt (đã chuẩn), vDown = hướng "xuống" của tem
  function temXR(p, nIn, vDown) { const u = V().crossVectors(vDown, nIn).normalize(); return new THREE.Matrix4().makeBasis(u, vDown, nIn).setPosition(p); }
  // ma trận đặt mô hình: toạ độ mô hình → toạ độ XR
  function anchorFrom(tok, Mxr) { return Mxr.clone().multiply(temModel(tok).invert()); }
  // tem đứng (mặt cột): pháp tuyến lấy từ mặt phẳng dò được; nếu chỉ dò được điểm thì lấy hướng nhìn của máy (đứng chính diện tem)
  function solveWall(tok, p, hitNormal, camFwd) {
    let nOut = hitNormal && Math.abs(hitNormal.y) < 0.5 ? hitNormal.clone() : camFwd.clone().negate();
    nOut.y = 0; nOut.normalize();
    return anchorFrom(tok, temXR(p, nOut.clone().negate(), V(0, -1, 0)));
  }
  // tem sàn: tâm tem + hướng mũi tên (về mặt cột). Hướng lấy từ pháp tuyến mặt cột nếu dò được mặt đứng, nếu không lấy từ 2 điểm
  function solveFloor(tok, p, q, qNormal) {
    let toCol;
    if (qNormal && Math.abs(qNormal.y) < 0.5) { toCol = qNormal.clone().negate(); toCol.y = 0; toCol.normalize(); }
    else { toCol = q.clone().sub(p); toCol.y = 0; toCol.normalize(); }
    return anchorFrom(tok, temXR(V(p.x, p.y, p.z), V(0, -1, 0), toCol.clone().negate()));
  }

  // ---------- giao diện ----------
  const $ = s => document.querySelector(s);
  function say(t, k) { setStatus(t, k); }
  function guide() {
    if (!curTag) return;
    const fl = isFloor(curTag);
    if (stage === 0) say(fl ? 'Đưa dấu + vào TÂM tem trên sàn → bấm "Ghim tâm tem"' : 'Đứng chính diện tem, cách 1–1,5 m. Đưa dấu + vào TÂM mã QR → bấm "Ghim tâm tem"', 'wait');
    else if (stage === 1) say('Đưa dấu + lên MẶT CỘT phía mũi tên chỉ (giữa mặt, thấp) → bấm "Ghim hướng"', 'wait');
    $('#xr-pin').textContent = stage === 1 ? 'Ghim hướng' : 'Ghim tâm tem';
  }
  async function start(mode) {
    if (!(await supported())) {
      if (isIOS) {   // iPhone: mở lại trang này trong App Clip (có ARKit)
        const u = new URL(location.href); u.searchParams.set('xr', '1'); u.hash = curTag || '';
        location.href = APPCLIP + encodeURIComponent(u.toString()); return;
      }
      alertBox('Máy này chưa hỗ trợ AR bám không gian (cần Chrome Android có Dịch vụ Google Play cho AR). Dùng chế độ theo tem.'); return;
    }
    curMode = mode; stopAR(); view = 'xr'; show('v-run'); document.body.classList.add('mxr'); document.body.classList.remove('m3d', 'mar');
    setTopbar(); setContent(curEl[mode].scene); markTag(false);
    xrRoot = new THREE.Group(); xrRoot.matrixAutoUpdate = false; xrRoot.visible = false; scene.remove(cur); xrRoot.add(cur); scene.add(xrRoot);
    if (!reticle) {
      const g = new THREE.RingGeometry(0.03, 0.04, 32); g.rotateX(-Math.PI / 2);
      reticle = new THREE.Mesh(g, new THREE.MeshBasicMaterial({color: 0xffd23f, depthTest: false})); reticle.matrixAutoUpdate = false; reticle.renderOrder = 9;
    }
    scene.add(reticle); reticle.visible = false;
    $('#xr-ui').hidden = false; A = null; stage = 0; first = null;
    try {
      session = await navigator.xr.requestSession('immersive-ar', {requiredFeatures: ['hit-test'], optionalFeatures: ['dom-overlay', 'local-floor'], domOverlay: {root: $('#v-run')}});
    } catch (e) { end(); alertBox('Không mở được AR không gian: ' + (e.message || e)); return; }
    renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType('local');
    await renderer.xr.setSession(session);
    refSpace = renderer.xr.getReferenceSpace ? renderer.xr.getReferenceSpace() : await session.requestReferenceSpace('local');
    const viewer = await session.requestReferenceSpace('viewer');
    try { hitSrc = await session.requestHitTestSource({space: viewer, entityTypes: ['plane', 'point']}); }
    catch (e) { hitSrc = await session.requestHitTestSource({space: viewer}); }
    session.addEventListener('end', cleanup);
    session.addEventListener('select', onSelect);
    renderer.setAnimationLoop(onFrame);
    guide();
  }
  function onFrame(t, frame) {
    if (!frame) return;
    lastHit = null;
    if (hitSrc) { const r = frame.getHitTestResults(hitSrc); if (r.length) { const p = r[0].getPose(refSpace); if (p) lastHit = new THREE.Matrix4().fromArray(p.transform.matrix); } }
    reticle.visible = !!lastHit && !(A && stage === 2); if (lastHit) reticle.matrix.copy(lastHit);
    renderer.render(scene, camXR);
  }
  function hitPoint() { return lastHit ? V().setFromMatrixPosition(lastHit) : null; }
  function hitNormal() { return lastHit ? V(lastHit.elements[4], lastHit.elements[5], lastHit.elements[6]).normalize() : null; }   // trục Y của tư thế = pháp tuyến mặt phẳng
  function camFwd() { const c = renderer.xr.getCamera(camXR); return V(0, 0, -1).transformDirection(c.matrixWorld); }
  function pin() {
    if (!lastHit) { say('Chưa dò được bề mặt – di chuyển máy chậm qua lại vài giây cho máy nhận mặt cột / sàn', 'bad'); return; }
    const fl = isFloor(curTag);
    if (stage === 0 && !fl) apply(solveWall(curTag, hitPoint(), hitNormal(), camFwd()));
    else if (stage === 0) { first = hitPoint(); stage = 1; guide(); }
    else if (stage === 1) apply(solveFloor(curTag, first, hitPoint(), hitNormal()));
  }
  function apply(M) {
    A = M; stage = 2; xrRoot.matrix.copy(A); xrRoot.matrixWorldNeedsUpdate = true; xrRoot.visible = true;
    CLIP.forEach((p, i) => p.copy(CLIP0[i]).applyMatrix4(A));
    $('#xr-pin').textContent = 'Căn lại';
    say('Đã căn theo tem ✓ Đi lại tự do. Chạm vào cấu kiện để xem thông số. Lệch thì ngắm tem gần nhất, bấm "Căn lại".', 'ok');
  }
  function onSelect(ev) {   // chạm màn hình (ngoài nút) → tia từ điểm chạm → thông số cấu kiện
    if (!A || !cur) return;
    const pose = ev.frame.getPose(ev.inputSource.targetRaySpace, refSpace); if (!pose) return;
    const m = new THREE.Matrix4().fromArray(pose.transform.matrix), o = V().setFromMatrixPosition(m), d = V(0, 0, -1).transformDirection(m);
    const ray = new THREE.Raycaster(o, d), inv = A.clone().invert(), objs = [];
    cur.traverse(x => { if (x.userData.info) { let p = x, vis = true; while (p && p !== cur) { if (!p.visible && p.userData.step) vis = false; p = p.parent; } if (vis) objs.push(x); } });
    const hits = ray.intersectObjects(objs, false).filter(h => passClip(h.point.clone().applyMatrix4(inv)));
    const h = hits.find(x => !x.object.userData.low) || hits[0];
    showInfo(h ? h.object.userData.info(h) : null);
  }
  function cleanup() {
    renderer.setAnimationLoop(null); renderer.xr.enabled = false; session = null; hitSrc = null; A = null;
    CLIP.forEach((p, i) => p.copy(CLIP0[i]));
    if (xrRoot) { if (cur) { xrRoot.remove(cur); scene.add(cur); } scene.remove(xrRoot); xrRoot = null; }
    if (reticle) scene.remove(reticle);
    $('#xr-ui').hidden = true; document.body.classList.remove('mxr');
    if (view === 'xr') { view = 'home'; goHome(); }
  }
  function end() { if (session) session.end().catch(() => cleanup()); else if (view === 'xr' || xrRoot) cleanup(); }
  function alertBox(t) { const el = $('#xr-msg'); if (el) { el.textContent = t; el.hidden = false; } }

  // nút trang chính
  async function refreshButton() {
    const b = $('#b-xr'); if (!b) return;
    const can = await supported();
    b.querySelector('small').textContent = can ? 'Mô hình đứng yên theo không gian thật, đi lại tự do quanh cấu kiện'
      : isIOS ? 'iPhone: mở qua App Clip (không cần cài app), chọn "Mở" khi hiện thẻ ứng dụng' : 'Máy này chưa hỗ trợ – dùng nút vàng (theo tem)';
  }
  document.addEventListener('DOMContentLoaded', () => {});
  if ($('#xr-pin')) {
    $('#xr-pin').onclick = () => { if (stage === 2) { stage = 0; first = null; guide(); } else pin(); };
    $('#xr-exit').onclick = end;
    for (const s of ['#xr-ui', '.top', '#steps', '#info', '#settings']) { const el = $(s); el && el.addEventListener('beforexrselect', e => e.preventDefault()); }
    $('#b-xr').onclick = () => start('next');
    refreshButton();
  }
  return {start, end, supported, refreshButton, _t: {temModel, solveWall, solveFloor, isFloor}};
})();
