// Đọc mã QR trong khung hình (chạy nền để hình 3D không bị giật)
importScripts('../lib/jsQR.js');
onmessage = e => {
  const {w, h, sc, buf} = e.data;
  let code = null;
  try { code = jsQR(new Uint8ClampedArray(buf), w, h, {inversionAttempts: 'dontInvert'}); } catch (err) {}
  postMessage(code ? {text: code.data, loc: code.location, sc} : {text: null, loc: null, sc});
};
