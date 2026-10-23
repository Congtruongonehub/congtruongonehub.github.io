// ===== Dữ liệu thí điểm AR ONEHUB BP2: tem, cấu kiện, bước thi công =====
// Toạ độ mặt bằng (m): x hướng trục 2.A→2.B, y hướng trục 2.1→2.2, z cao độ kết cấu.
// Tem: o = tâm tem, u = chiều sang phải của tem, v = chiều xuống của tem, size = cạnh mã QR (m, không tính viền trắng).
const SITE = {
  name: 'ONEHUB Saigon BP2',
  ver: 'Thí điểm 2 · 23/10/2026 · cốp pha nhôm đổ toàn khối',
  src: 'Bản vẽ kết cấu RFR 29/08/2025 · Tiến độ Rev02',
  qrSize: 0.23,
  api: 'https://script.google.com/macros/s/AKfycbybV4P79y1EInFJmHF7qxePmOt5Nd6wjrqRCwfQnGmsvJbPCulNMs1oMiDjn9Gc7noR6g/exec',   // địa chỉ Ứng dụng web Google Apps Script (máy chủ hồ sơ)
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
    title: 'Cột C1 · tầng 3', sub: 'Trục 2.A / 2.1 · 1050×1050 · đợt đổ toàn khối C3 + S4',
    kind: 'col', col: 'C1-a', s: 2,
    next: {scene: 'propsT4', label: 'Xem thi công sắp tới', hint: 'Dưới sàn T4: giữ cây chống V4, kéo căng cáp, tháo chống'},
    built: {scene: 'xrayColT3', label: 'Xem cấu tạo cột đã thi công', hint: 'Thép dọc, đai, lớp bảo vệ, đoạn nối, cao độ'},
  },
  'S4-C1a': {
    title: 'Sàn tầng 4 · chân cột C1', sub: 'Trục 2.A / 2.1 · mặt sàn +14.125 · đợt kế tiếp C4 + S5',
    kind: 'slab', col: 'C1-a', s: 3,
    next: {scene: 'lift4', label: 'Xem thi công sắp tới', hint: 'Đợt C4 + S5 đổ toàn khối: thép cột, cốp pha nhôm, cây chống V4, thép dầm sàn, cáp'},
    built: {scene: 'xraySlabT4', label: 'Xem cấu tạo sàn đã thi công', hint: 'Thép dầm, thép sàn, cáp DƯL trong sàn'},
  },
};

// Biện pháp: cốp pha nhôm Kumkang cho cột, vách, dầm, sàn – mỗi đợt đổ toàn khối "cột tầng n + sàn tầng n+1" (checklist NCC Rev06).
// Ngày chia từ Tiến độ Rev02: dòng 24 (C3 + S4) 29/12/2026–15/01/2027; dòng 25 (C4 + S5) 16/01–15/02/2027, có nghỉ Tết (~06/02/2027).
// Ngày từng bước là dự kiến – BCH chỉnh tại đây khi có lịch chi tiết.
const STEPS = {
  propsT4: [
    {id: 'P4-1', name: 'Tháo tấm sàn sớm, giữ cây chống V4', from: '2027-01-13', to: '2027-01-15',
      method: ['Sau đổ 12 giờ: tháo tấm vách, cột, thành dầm (TVGS chấp thuận), tháo từ trên xuống, giữ kicker. Sau 36 giờ: tháo tấm sàn theo thứ tự chốt + nẹp → tấm sàn → dầm xương → góc sàn, GIỮ cây chống SPP + đầu chống PH (sổ tay Coteccons).',
               'Cây chống V4 dài làm việc 2,6–4,0 m; dưới sàn 220 ≈ 3,7 m, gần mức kéo dài tối đa nên chỉ chịu ≈ 12 kN/cây.',
               'Không tháo, không dời cây chống dưới dầm. Kiểm tra chân chống trước khi đổ đợt trên.',
               'Bố trí đang là sơ bộ – theo bản bố trí và thuyết minh tính toán của Kumkang khi có.']},
    {id: 'P4-2', name: 'Kéo căng cáp sàn T4', from: '2027-01-14', to: '2027-01-15',
      method: ['Kéo căng khi bê tông đạt 25 MPa (C20/25) theo mẫu nén; lực 195,4 kN/tao.',
               'Ghi biên bản độ giãn dài từng tao; bơm vữa ống cáp sau kéo căng.',
               'Lưu ý: vách lõi đổ liền sàn có thể cản sàn co ngắn khi kéo căng – chờ ý kiến thiết kế DƯL.']},
    {id: 'P4-3', name: 'Tháo cây chống sàn T4', from: '2027-02-02', to: '2027-02-03',
      method: ['Chỉ tháo khi ĐỦ cả hai: ≥ 21 ngày sau đổ VÀ đã kéo căng xong (Rev02).',
               'Luôn có 2 tầng chống cùng lúc (chu kỳ 17 ngày) – tính số lượng V4 theo 2 tầng.',
               'Tháo theo thứ tự từ giữa nhịp ra gối; không tháo dưới dầm trước sàn.']},
    {id: 'P4-4', name: 'Bàn giao tầng 3 cho MEP, xây tô', from: '2027-02-04', to: '2027-02-05',
      method: ['Dọn sạch cây chống, phụ kiện; kiểm tra nứt sàn, võng sàn trước khi bàn giao.',
               'Đánh dấu vị trí cáp DƯL dưới đáy sàn: CẤM khoan, bắn vít trong vùng cáp.']},
  ],
  lift4: [
    {id: 'L4-1', name: 'Thép cột, vách tầng 4', from: '2027-01-16', to: '2027-01-18',
      method: ['Cột C1: 36Ø25 CB500-V. Nối chồng 41Ø = 1025 mm từ +100 trên mặt sàn, so le 2 nhóm ≤ 50% (S-00-02 mục XII).',
               'Đai Ø12a100 thân cột, a200 vùng nút; lớp bảo vệ 40 mm tới mép đai.',
               'Nghiệm thu thép cột trước khi đóng cốp pha nhôm.']},
    {id: 'L4-2', name: 'Cốp pha nhôm cột, vách', from: '2027-01-19', to: '2027-01-20',
      method: ['Lắp góc trong vách IC trước (vách lõi), rồi tấm vách. Cột C1 1050×1050: mỗi mặt W600 + W450 cao 2450 (có chân rocker 50), bên trên tấm mở rộng WS350 + WS300 + WS300 tới đáy dầm +17.525.',
               '4 góc ngoài nối bằng góc CA(63.5+63.5). Liên kết chốt ngắn RP + nêm WP @300 dọc mép tấm.',
               'Gông cột bằng xà gồ thép hộp 50×50 nằm ngang + cùm xà gồ ở 4 cao độ. Cây chống xiên (push-pull) ở các mặt phía trong nhà, đầu trên ≈ 2,3 m, chân cách mặt cột ≈ 1,7 m; cây chống chân (turnbuckle) ở 0,45 m. Căn độ thẳng đứng ≤ H/1000 bằng ren.',
               'Bu lông neo chân cây chống trên sàn DƯL: tránh vùng cáp (đánh dấu tuyến cáp trước khi khoan) hoặc đặt neo chờ trước khi đổ sàn.',
               'Vách lõi, vách biên: kicker xẻ rãnh d14 @200 (checklist Rev06) làm cữ cho tấm vách tầng trên.']},
    {id: 'L4-3', name: 'Cốp pha nhôm dầm, sàn + cây chống V4', from: '2027-01-21', to: '2027-01-25',
      method: ['Trình tự (sổ tay): góc đáy dầm → tấm đáy dầm DE + đầu chống PHS + cây chống → thành dầm B → góc sàn SC → dầm xương (EB–PH–MB–PH…–EB) → tấm sàn D600×1200 lắp từ 2 đầu dầm xương đuổi vào giữa.',
               'Dầm xương MB/EB rộng 150, cao 125, lắp bằng cao độ sàn, ≥ 3 công nhân. Đường dầm xương cách nhau 1.350 (tấm 1.200 + MB 150); đầu chống PH cách nhau 1.200 dọc đường.',
               'Cây chống SPP Kumkang V4 dưới mỗi PH: dài làm việc ≈ 3,66 m. Diện chịu tải 1,35 × 1,2 m → tải ≈ 12,6 kN, SÁT tải cho phép ≈ 13 kN – yêu cầu Kumkang tính toán, có thể phải giảm bước.',
               'Thành dầm biên cao hơn mặt sàn 50, công trường gia cố thêm. Vùng sàn hạ 50: rocker 50 (chờ BCH chốt).',
               'Mặt cốp pha sàn +18.005; đáy dầm +17.625 (h 600) / +17.525 (h 700). Kiểm tra cao độ toàn bộ cây chống, chốt, nêm trước khi đổ.']},
    {id: 'L4-4', name: 'Thép dầm, thép sàn, ống chờ MEP', from: '2027-01-26', to: '2027-01-29',
      method: ['Lớp bảo vệ dầm 35 mm; thép sàn theo S-32-02 (tầng điển hình 3–9).',
               'Nối chồng 41Ø, neo 42Ø. Đặt ống chờ, hộp kỹ thuật MEP trước khi rải cáp.']},
    {id: 'L4-5', name: 'Rải cáp DƯL', from: '2027-01-30', to: '2027-02-01',
      method: ['Tao 15,24 mm Gr.270, ống dẹt (45~90) × 25.',
               'Cao độ tâm cáp: trên gối 72,5 mm từ mặt sàn; giữa nhịp 52,5 mm từ đáy; đầu neo 110 mm.']},
    {id: 'L4-6', name: 'Nghiệm thu trước đổ với TVGS', from: '2027-02-02', to: '2027-02-02',
      method: ['Nghiệm thu thép cột vách, cốp pha nhôm, cây chống, thép dầm sàn, cáp, ống chờ MEP.',
               'Tải biên bản và ảnh lên mục Hồ sơ nghiệm thu của tem này.']},
    {id: 'L4-7', name: 'Đổ bê tông toàn khối C4 + S5', from: '2027-02-03', to: '2027-02-03',
      method: ['Cột vách C30/37, sàn DƯL C28/35 nhưng đổ một lần: CHỜ TVTK chấp thuận phương án mác (đổ cả khối C30/37 hoặc đổ cột trước, sàn sau khi bê tông cột chưa ninh kết, có lưới chặn).',
               'Đổ liên tục, đầm kỹ đầu cột và vùng neo cáp.']},
    {id: 'L4-8', name: 'Kéo căng cáp sàn T5', from: '2027-02-13', to: '2027-02-15',
      method: ['Sau Tết; kéo căng khi đạt 25 MPa theo mẫu; 195,4 kN/tao.',
               'Giữ cây chống tầng dưới theo quy định ≥ 21 ngày và sau kéo căng.']},
  ],
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
