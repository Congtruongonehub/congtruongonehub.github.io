// ===== Dữ liệu thí điểm AR ONEHUB BP2: tem, cấu kiện, bước thi công =====
// Toạ độ mặt bằng (m): x hướng trục 2.A→2.B, y hướng trục 2.1→2.2, z cao độ kết cấu.
// Tem: o = tâm tem, u = chiều sang phải của tem, v = chiều xuống của tem, size = cạnh mã QR (m, không tính viền trắng).
const SITE = {
  name: 'ONEHUB Saigon BP2',
  ver: 'Thí điểm 1 · 22/10/2026',
  src: 'Bản vẽ kết cấu RFR 29/08/2025 · Tiến độ Rev02',
  qrSize: 0.23,
  api: '',   // địa chỉ Ứng dụng web Google Apps Script (máy chủ hồ sơ)
};

const TAGS = {
  // Tem dán trên cột C1 tầng 3 (cột đã đổ bê tông = hoàn thành)
  'C1a3E': {el: 'C1a-T3', face: 'Mặt hướng về trục 2.B', o: [0.595, 0.07, 11.525], u: [0, 1, 0], v: [0, 0, -1]},
  'C1a3N': {el: 'C1a-T3', face: 'Mặt hướng về trục 2.2', o: [0.07, 0.595, 11.525], u: [-1, 0, 0], v: [0, 0, -1]},
  // Tem dán trên mặt sàn T4 cạnh chân cột C1 (sàn đã đổ = hoàn thành), mũi tên chỉ về cột
  'S4C1E': {el: 'S4-C1a', face: 'Trên mặt sàn, phía trục 2.B', o: [0.945, 0.07, 14.125], u: [0, 1, 0], v: [1, 0, 0]},
  'S4C1N': {el: 'S4-C1a', face: 'Trên mặt sàn, phía trục 2.2', o: [0.07, 0.945, 14.125], u: [-1, 0, 0], v: [0, 1, 0]},
};

const ELEMS = {
  'C1a-T3': {
    title: 'Cột C1 · tầng 3', sub: 'Trục 2.A / 2.1 · 1050×1050 · +10.025 → +14.125',
    kind: 'col', col: 'C1-a', s: 2,
    next: {scene: 'slabT4', label: 'Xem thi công sắp tới', hint: 'Sàn DƯL tầng 4 quanh cột: cây chống, cốp pha nhôm, thép dầm sàn, cáp'},
    built: {scene: 'xrayColT3', label: 'Xem cấu tạo cột đã thi công', hint: 'Thép dọc, đai, lớp bảo vệ, đoạn nối, cao độ'},
  },
  'S4-C1a': {
    title: 'Sàn tầng 4 · chân cột C1', sub: 'Trục 2.A / 2.1 · mặt sàn +14.125',
    kind: 'slab', col: 'C1-a', s: 3,
    next: {scene: 'colT4', label: 'Xem thi công sắp tới', hint: 'Cột C1 tầng 4: nối thép, đai, cốp pha nhôm, bê tông'},
    built: {scene: 'xraySlabT4', label: 'Xem cấu tạo sàn đã thi công', hint: 'Thép dầm, thép sàn, cáp DƯL trong sàn'},
  },
};

// Bước thi công: ngày chia từ Tiến độ Rev02 (dòng 24: cột T3 + sàn DƯL T4 29/12/2026–15/01/2027; dòng 25: cột T4 từ 16/01/2027).
// Ngày từng bước là dự kiến của BCH – chỉnh tại đây khi có lịch chi tiết.
const STEPS = {
  slabT4: [
    {id: 'S4-1', name: 'Cây chống + cốp pha nhôm dầm, sàn', from: '2027-01-01', to: '2027-01-05',
      method: ['Cây chống nhôm lưới ≤ 1,2 × 1,2 m dưới sàn; dưới dầm theo hàng (sơ bộ – chờ shop drawing NCC cốp pha nhôm).',
               'Tấm sàn nhôm 600 × 1200, dày 65. Mặt cốp pha sàn +13.905, đáy dầm +13.525 (h 600) / +13.425 (h 700).',
               'Kiểm tra tim trục, cao độ, độ thẳng đứng cây chống trước khi đặt thép.',
               'Giữ chống ≥ 21 ngày và chỉ tháo sau khi kéo căng cáp (Rev02).']},
    {id: 'S4-2', name: 'Thép dầm, thép sàn, ống chờ MEP', from: '2027-01-06', to: '2027-01-09',
      method: ['Lớp bê tông bảo vệ dầm 35 mm; sàn theo S-32-02.',
               'Nối chồng 41Ø (Ø20 = 820, Ø25 = 1025), neo 42Ø.',
               'Đặt ống chờ, hộp kỹ thuật MEP trước khi rải cáp; không cắt thép khi chưa có ý kiến thiết kế.']},
    {id: 'S4-3', name: 'Rải cáp DƯL + nghiệm thu', from: '2027-01-09', to: '2027-01-11',
      method: ['Tao 15,24 mm Gr.270, ống dẹt (45~90) × 25 (S-32-01).',
               'Cao độ tâm cáp: trên gối 72,5 mm từ mặt sàn; giữa nhịp 52,5 mm từ đáy sàn; đầu neo 110 mm.',
               'Ghế đỡ theo cao độ, buộc chặt; kiểm tra đầu neo kéo / neo chết.',
               'Nghiệm thu cốt thép + cáp với TVGS trước khi đổ.']},
    {id: 'S4-4', name: 'Đổ bê tông sàn + kéo căng', from: '2027-01-12', to: '2027-01-15',
      method: ['Bê tông sàn, dầm C28/35, đổ liên tục.',
               'Kéo căng khi đạt C20/25 (25 MPa theo mẫu); lực 195,4 kN/tao.',
               'Bơm vữa ống cáp sau kéo căng.']},
  ],
  colT4: [
    {id: 'C4-1', name: 'Nối thép dọc cột tầng 4', from: '2027-01-16', to: '2027-01-17',
      method: ['36Ø25 CB500-V. Nối chồng 41Ø = 1025 mm, bắt đầu +100 trên mặt sàn.',
               'So le 2 nhóm, mỗi nhóm ≤ 50% số thanh (S-00-02 mục XII).']},
    {id: 'C4-2', name: 'Đai cột', from: '2027-01-17', to: '2027-01-18',
      method: ['Đai Ø12a100 trong thân cột; vùng nút dầm/sàn a200.', 'Lớp bảo vệ 40 mm tính tới mép đai.']},
    {id: 'C4-3', name: 'Cốp pha nhôm cột', from: '2027-01-18', to: '2027-01-18',
      method: ['Tấm cốp pha nhôm 4 mặt, dày 65, tới đáy dầm.', 'Kiểm tra tim, độ thẳng đứng ≤ H/1000 trước khi đổ.']},
    {id: 'C4-4', name: 'Đổ bê tông cột', from: '2027-01-19', to: '2027-01-19',
      method: ['Bê tông C30/37.', 'Đổ đến cao độ đáy dầm, đầm kỹ vùng đầu cột.']},
  ],
};
