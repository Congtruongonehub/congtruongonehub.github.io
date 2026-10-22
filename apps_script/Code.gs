/**
 * ONEHUB BP2 – Máy chủ hồ sơ nghiệm thu (Google Apps Script)
 * Gắn vào file Google Sheets "ONEHUB BP2 – Dữ liệu hệ thống" của tài khoản dự án.
 * Lần đầu: chọn hàm setup → Chạy (Run) → cho phép quyền. Sau đó Triển khai (Deploy) dạng Ứng dụng web.
 */
const SHEET_HS = 'HoSo', SHEET_ND = 'NguoiDung', ROOT = 'ONEHUB BP2 - Ho so nghiem thu';
const HS_COLS = ['ID', 'ThoiGianTai', 'CauKien', 'Moc', 'NgayNT', 'GioNT', 'KetQua', 'ThanhPhan', 'GhiChu', 'NguoiTai', 'VaiTro', 'Files', 'Buoc', 'Xong'];

function setup() {
  const ss = SpreadsheetApp.getActive();
  let nd = ss.getSheetByName(SHEET_ND);
  if (!nd) {
    nd = ss.insertSheet(SHEET_ND);
    nd.appendRow(['Ten', 'VaiTro', 'MaPIN', 'DuocTaiHoSo', 'ConHieuLuc']);
    nd.appendRow(['Nguyễn Trường Giang', 'CHT', String(Math.floor(100000 + Math.random() * 900000)), 'x', 'x']);
    nd.getRange('C:C').setNumberFormat('@');
  }
  let hs = ss.getSheetByName(SHEET_HS);
  if (!hs) { hs = ss.insertSheet(SHEET_HS); hs.appendRow(HS_COLS); hs.setFrozenRows(1); }
  root_();
}

function root_() {
  const it = DriveApp.getFoldersByName(ROOT);
  return it.hasNext() ? it.next() : DriveApp.createFolder(ROOT);
}
function sub_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
function user_(pin) {
  if (!pin) return null;
  const rows = SpreadsheetApp.getActive().getSheetByName(SHEET_ND).getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const [ten, vaitro, ma, tai, hl] = rows[i];
    if (String(ma).trim() === String(pin).trim() && String(hl).trim()) return {ten, vaitro, tai: !!String(tai).trim()};
  }
  return null;
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function doGet(e) {
  const p = e.parameter || {};
  if (p.action === 'ping') return out_({ok: true});
  const u = user_(p.pin);
  if (!u) return out_({ok: false, err: 'Mã PIN không đúng hoặc hết hiệu lực'});
  if (p.action === 'me') return out_({ok: true, user: u});
  if (p.action === 'list') {
    const rows = SpreadsheetApp.getActive().getSheetByName(SHEET_HS).getDataRange().getValues();
    const recs = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]; if (p.el && r[2] !== p.el) continue;
      let files = []; try { files = JSON.parse(r[11] || '[]'); } catch (er) {}
      recs.push({id: r[0], tai_luc: r[1], el: r[2], moc: r[3], ngay: fmtD_(r[4]), gio: fmtT_(r[5]), ket_qua: r[6],
        ben: String(r[7] || '').split(/\s*[;\n]\s*/).filter(String), ghi_chu: r[8], nguoi_tai: r[9], vai_tro: r[10], files,
        step: r[12] || undefined, done: r[13] === '' ? undefined : r[13] === true || r[13] === 'TRUE'});
    }
    return out_({ok: true, records: recs});
  }
  return out_({ok: false, err: 'Yêu cầu không hợp lệ'});
}
function fmtD_(v) { return v instanceof Date ? Utilities.formatDate(v, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd') : String(v || ''); }
function fmtT_(v) { return v instanceof Date ? Utilities.formatDate(v, 'Asia/Ho_Chi_Minh', 'HH:mm') : String(v || ''); }

function doPost(e) {
  let d; try { d = JSON.parse(e.postData.contents); } catch (er) { return out_({ok: false, err: 'Dữ liệu lỗi'}); }
  const u = user_(d.pin);
  if (!u) return out_({ok: false, err: 'Mã PIN không đúng hoặc hết hiệu lực'});
  if (!u.tai) return out_({ok: false, err: 'Tài khoản chưa được cấp quyền tải hồ sơ'});
  if (d.action === 'file') {
    // tải từng file: ảnh đã nén sẵn trên điện thoại, video ngắn, PDF biên bản
    const folder = sub_(sub_(root_(), safe_(d.el)), safe_(d.moc || 'Khac'));
    const blob = Utilities.newBlob(Utilities.base64Decode(d.data), d.type || 'application/octet-stream', safe_(d.name || 'file'));
    const f = folder.createFile(blob);
    f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return out_({ok: true, file: {id: f.getId(), name: f.getName(), type: d.type, url: 'https://drive.google.com/file/d/' + f.getId() + '/view'}});
  }
  if (d.action === 'record') {
    const lock = LockService.getScriptLock(); lock.waitLock(20000);
    try {
      const id = 'HS-' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 90 + 10);
      SpreadsheetApp.getActive().getSheetByName(SHEET_HS).appendRow([id, new Date(), d.el, d.moc, "'" + (d.ngay || ''), "'" + (d.gio || ''), d.ket_qua, (d.ben || []).join('; '),
        d.ghi_chu || '', u.ten, u.vaitro, JSON.stringify(d.files || []), d.step || '', d.done === undefined ? '' : !!d.done]);
      return out_({ok: true, id});
    } finally { lock.releaseLock(); }
  }
  return out_({ok: false, err: 'Yêu cầu không hợp lệ'});
}
function safe_(s) { return String(s || '').replace(/[\\/:*?"<>|#]/g, '_').slice(0, 80); }
