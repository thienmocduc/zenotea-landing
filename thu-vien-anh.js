/* ════════════════════════════════════════════════════════════════════════
   THƯ VIỆN ẢNH — vùng nguyên liệu, ngày thu hái, làm chè, phẩm

   Vì sao là bộ máy đọc-từ-dữ-liệu chứ không phải HTML viết tay: ảnh thật
   của Zen O Tea sẽ về dần theo từng chuyến lên vùng, mỗi mùa một ít. Viết
   tay thì mỗi lần thêm một tấm phải sửa mã, và người cầm máy ảnh không
   phải người viết mã. Ở đây chỉ cần thả tệp vào `site/anh/<bộ>/` rồi chạy
   `node scripts/quet-anh.mjs` — ảnh tự lên trang.

   BA LUẬT CỦA THƯ VIỆN NÀY

   1. **Bộ nào chưa có ảnh THẬT thì không hiện ra.** Không khung rỗng,
      không ảnh kho mua tạm. Trang thiếu một mục thì khách không biết;
      trang có một mục toàn ảnh mượn thì khách biết — và mất niềm tin vào
      cả cái cây ba trăm năm mình kể. Với thương hiệu bán bằng nguồn gốc,
      một tấm ảnh mượn đắt hơn nhiều một khoảng trống.

   2. **Ảnh nặng bị chặn từ khâu quét**, không phải khâu than phiền. Ảnh
      điện thoại 4MB × 12 tấm là 48MB — khách 3G ở tỉnh đóng tab trước khi
      tấm đầu hiện xong.

   3. **Mỗi ảnh phải có lời chú thật.** Chụp ở đâu, ai, mùa nào. Đó là thứ
      biến một tấm ảnh đẹp thành một bằng chứng nguồn gốc — và là thứ ảnh
      kho không bao giờ có.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var the = document.currentScript;
  var GOC = (the && the.dataset.goc) || './';

  /* Mở ảnh lớn. Dựng một lần, dùng lại — không tạo lớp phủ mới mỗi lượt
     bấm, kẻo bấm nhanh mười lần là mười lớp chồng nhau không ai gỡ. */
  var lop = null;
  function moLon(src, chu) {
    if (!lop) {
      lop = document.createElement('div');
      lop.className = 'anh-lon';
      lop.innerHTML =
        '<button class="anh-dong" aria-label="Đóng">×</button>' +
        '<figure><img alt=""><figcaption></figcaption></figure>';
      document.body.appendChild(lop);
      lop.addEventListener('click', function (e) {
        if (e.target === lop || e.target.classList.contains('anh-dong')) dong();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && lop.classList.contains('mo')) dong();
      });
    }
    var img = lop.querySelector('img');
    img.src = src;
    img.alt = chu || '';
    lop.querySelector('figcaption').textContent = chu || '';
    lop.classList.add('mo');
    document.body.style.overflow = 'hidden';
  }
  function dong() {
    lop.classList.remove('mo');
    document.body.style.overflow = '';
    /* Nhả nguồn ảnh sau khi lớp phủ đã mờ hẳn: xoá ngay thì thấy khung
       trắng nháy giữa lúc đang mờ dần. */
    setTimeout(function () {
      if (!lop.classList.contains('mo')) lop.querySelector('img').src = '';
    }, 320);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function veBo(o, bo) {
    var anh = (bo.anh || []).filter(function (a) { return a.tep; });
    if (!anh.length) {
      /* Luật 1: không có ảnh thật thì bỏ hẳn mục, không để khung rỗng. */
      o.remove();
      return 0;
    }

    o.innerHTML =
      '<div class="tv-dau">' +
        (bo.nhan ? '<div class="nhan">' + esc(bo.nhan) + '</div>' : '') +
        (bo.ten ? '<h3>' + esc(bo.ten) + '</h3>' : '') +
        (bo.mo ? '<p class="dim">' + esc(bo.mo) + '</p>' : '') +
      '</div>' +
      '<div class="tv-luoi">' +
        anh.map(function (a, i) {
          var src = GOC + 'anh/' + bo.ma + '/' + a.tep;
          /* Tấm đầu tải ngay, phần còn lại tải khi cuộn tới: tấm đầu là
             thứ quyết định trang có "sống" ngay lúc mở hay không. */
          var chien = i === 0 ? 'eager' : 'lazy';
          return '<figure class="tv-o gh" data-src="' + esc(src) + '">' +
            '<img src="' + esc(src) + '" alt="' + esc(a.mo || bo.ten) + '"' +
            ' loading="' + chien + '" decoding="async">' +
            (a.mo || a.noi
              ? '<figcaption>' + esc(a.mo || '') +
                (a.noi ? '<span>' + esc(a.noi) + '</span>' : '') +
                '</figcaption>'
              : '') +
            '</figure>';
        }).join('') +
      '</div>';

    o.querySelectorAll('.tv-o').forEach(function (f) {
      f.addEventListener('click', function () {
        var cap = f.querySelector('figcaption');
        moLon(f.dataset.src, cap ? cap.textContent : '');
      });
    });
    return anh.length;
  }

  fetch(GOC + 'data/anh.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
    .then(function (d) {
      var bo = d.bo || {};
      document.querySelectorAll('[data-thu-vien]').forEach(function (o) {
        var ma = o.dataset.thuVien;
        if (bo[ma]) veBo(o, Object.assign({ ma: ma }, bo[ma]));
        else o.remove();
      });
      /* Ô mới chèn vào sau khi hiệu ứng cuộn đã quét vòng đầu — báo lại để
         chúng cũng trôi vào như mọi mảnh khác, thay vì đứng im lạc lõng. */
      dispatchEvent(new Event('scroll'));
    })
    .catch(function () {
      /* Không đọc được manifest: bỏ mọi ô, giữ trang sạch. Thà thiếu một
         mục còn hơn một hàng khung vỡ. */
      document.querySelectorAll('[data-thu-vien]').forEach(function (o) {
        o.remove();
      });
    });
})();
