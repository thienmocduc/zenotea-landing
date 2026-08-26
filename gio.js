/* ════════════════════════════════════════════════════════════════════════
   ZenOTea — Giỏ phẩm
   ────────────────────────────────────────────────────────────────────────
   Một bản giỏ duy nhất cho mọi trang. Trang phẩm, cửa hàng và trang thanh
   toán đều đọc chung một chỗ, nên không có cảnh thêm phẩm ở trang này rồi
   sang trang kia không thấy.

   Giỏ nằm ở máy người dùng cho tới khi họ bấm đặt. Trước lúc đó không có
   gì rời khỏi trình duyệt.

   Cách dùng:  <script src="./gio.js" data-goc="./"></script>
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const the = document.currentScript;
  const GOC = (the && the.dataset.goc) || './';
  const KHOA = 'zenotea.gio.v1';

  const tien = n => new Intl.NumberFormat('vi-VN').format(n) + '₫';
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ── Kho dữ liệu ───────────────────────────────────────────────────── */
  let DANH_MUC = null;
  const nghe = [];

  function doc() {
    try {
      const g = JSON.parse(localStorage.getItem(KHOA));
      return Array.isArray(g) ? g.filter(d => d && d.ma && d.sl > 0) : [];
    } catch (e) { return []; }
  }

  function ghi(gio) {
    localStorage.setItem(KHOA, JSON.stringify(gio));
    nghe.forEach(f => f(gio));
    veChuong();
  }

  const timPham = ma => DANH_MUC && DANH_MUC.pham.find(p => p.ma === ma);

  /* ── Các phép trên giỏ ─────────────────────────────────────────────── */
  const Gio = {
    doc: doc,

    them(ma, sl) {
      sl = sl || 1;
      const p = timPham(ma);
      if (p && !p.ban_duoc) return { ok: false, loi: p.vi_sao || 'Phẩm này chưa mở bán trực tuyến.' };
      const g = doc();
      const co = g.find(d => d.ma === ma);
      const daCo = co ? co.sl : 0;
      if (p && p.ton && daCo + sl > p.ton)
        return { ok: false, loi: 'Kho chỉ còn ' + p.ton + ' đơn vị phẩm này.' };
      if (co) co.sl += sl; else g.push({ ma: ma, sl: sl });
      ghi(g);
      return { ok: true, sl: (co ? co.sl : sl) };
    },

    dat(ma, sl) {
      const g = doc();
      const d = g.find(x => x.ma === ma);
      if (!d) return;
      if (sl <= 0) return Gio.bo(ma);
      const p = timPham(ma);
      d.sl = p && p.ton ? Math.min(sl, p.ton) : sl;
      ghi(g);
    },

    bo(ma) { ghi(doc().filter(d => d.ma !== ma)); },
    xoaHet() { ghi([]); },
    demMon: () => doc().reduce((t, d) => t + d.sl, 0),

    /* Trả về giỏ đã ghép với danh mục — nơi duy nhất tính tiền */
    chiTiet(maGiao) {
      const dong = doc().map(d => {
        const p = timPham(d.ma) || { ma: d.ma, ten: d.ma, gia: 0, dv: '', slug: '' };
        return { ...p, sl: d.sl, thanh: p.gia * d.sl };
      });
      const hang = dong.reduce((t, d) => t + d.thanh, 0);
      const cach = DANH_MUC && DANH_MUC.giao_hang.find(g => g.ma === maGiao);
      const nguong = (DANH_MUC && DANH_MUC.mien_phi_giao_tu) || Infinity;
      const mien = hang >= nguong;
      const phi = !cach ? 0 : (mien ? 0 : cach.phi);
      return { dong, hang, phi, mien, cach, tong: hang + phi, nguong };
    },

    khiDoi(f) { nghe.push(f); return f; },
    danhMuc: () => DANH_MUC,
    tien: tien
  };

  /* ── Ngăn kéo giỏ ──────────────────────────────────────────────────── */
  function dungKhung() {
    if (document.getElementById('gio-nut')) return;
    const k = document.createElement('div');
    k.innerHTML =
      `<button id="gio-nut" class="gio-nut" aria-label="Mở giỏ phẩm">
         <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor"
              stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
           <path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
         </svg>
         <span class="gio-dem" id="gio-dem" hidden>0</span>
       </button>
       <div class="gio-che" id="gio-che" hidden></div>
       <aside class="gio-ngan" id="gio-ngan" hidden aria-label="Giỏ phẩm">
         <header>
           <h3>Giỏ phẩm</h3>
           <button class="gio-tat" id="gio-dong" aria-label="Đóng giỏ">×</button>
         </header>
         <div class="gio-than" id="gio-than"></div>
         <footer id="gio-chan"></footer>
       </aside>`;
    document.body.appendChild(k);

    const ngan = document.getElementById('gio-ngan');
    const che = document.getElementById('gio-che');
    const mo = () => {
      ngan.hidden = false; che.hidden = false;
      /* Ép trình duyệt tính lại bố cục ngay để hiệu ứng trượt có điểm bắt đầu.
         Dùng requestAnimationFrame thì thẻ đang ẩn sẽ không chạy, và người
         dùng quay lại thấy ngăn kéo đứng im ngoài màn hình. */
      void ngan.offsetWidth;
      ngan.classList.add('mo'); che.classList.add('mo');
      veNgan();
    };
    const dong = () => {
      ngan.classList.remove('mo'); che.classList.remove('mo');
      setTimeout(() => { ngan.hidden = true; che.hidden = true; }, 280);
    };
    document.getElementById('gio-nut').addEventListener('click', mo);
    document.getElementById('gio-dong').addEventListener('click', dong);
    che.addEventListener('click', dong);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !ngan.hidden) dong(); });
    Gio.mo = mo; Gio.dong = dong;
  }

  function veChuong() {
    const d = document.getElementById('gio-dem');
    if (!d) return;
    const n = Gio.demMon();
    d.textContent = n; d.hidden = n === 0;
    const nut = document.getElementById('gio-nut');
    if (nut) nut.classList.toggle('co', n > 0);
  }

  function veNgan() {
    const than = document.getElementById('gio-than');
    const chan = document.getElementById('gio-chan');
    if (!than || !DANH_MUC) return;
    const ct = Gio.chiTiet();

    if (!ct.dong.length) {
      than.innerHTML =
        `<div class="gio-trong">
           <b>Giỏ đang trống</b>
           <span>Chọn một phẩm và mở nó ra khi lòng đã lặng.</span>
           <a class="nut" href="${GOC}cua-hang">Xem bộ phẩm</a>
         </div>`;
      chan.innerHTML = '';
      return;
    }

    than.innerHTML = ct.dong.map(d => `
      <div class="gio-dong" data-ma="${esc(d.ma)}">
        <div class="gio-tin">
          <a href="${GOC}pham/${esc(d.slug)}">${esc(d.ten)}</a>
          <span>${esc(d.dv)}</span>
        </div>
        <div class="gio-sl">
          <button data-buoc="-1" aria-label="Bớt một">−</button>
          <span>${d.sl}</span>
          <button data-buoc="1" aria-label="Thêm một">+</button>
        </div>
        <div class="gio-tien">${tien(d.thanh)}</div>
        <button class="gio-bo" data-bo aria-label="Bỏ khỏi giỏ">×</button>
      </div>`).join('');

    chan.innerHTML = `
      <div class="gio-cong"><span>Tiền phẩm</span><b>${tien(ct.hang)}</b></div>
      <div class="gio-ghi">${ct.hang >= ct.nguong
        ? 'Đơn này được miễn phí giao.'
        : 'Thêm ' + tien(ct.nguong - ct.hang) + ' nữa thì miễn phí giao.'}</div>
      <a class="nut dac" href="${GOC}thanh-toan">Thanh toán</a>`;

    than.querySelectorAll('[data-buoc]').forEach(b =>
      b.addEventListener('click', () => {
        const ma = b.closest('[data-ma]').dataset.ma;
        const d = doc().find(x => x.ma === ma);
        Gio.dat(ma, d.sl + Number(b.dataset.buoc));
      }));
    than.querySelectorAll('[data-bo]').forEach(b =>
      b.addEventListener('click', () => Gio.bo(b.closest('[data-ma]').dataset.ma)));
  }

  /* ── Nút thêm vào giỏ đặt sẵn trong trang ──────────────────────────── */
  function noiNut() {
    document.querySelectorAll('[data-them-gio]').forEach(nut => {
      nut.addEventListener('click', e => {
        e.preventDefault();
        const ma = nut.dataset.themGio;
        const kq = Gio.them(ma, Number(nut.dataset.sl || 1));
        if (!kq.ok) { bao(nut, kq.loi, true); return; }
        bao(nut, 'Đã thêm vào giỏ');
        if (nut.dataset.moGio !== 'khong') Gio.mo();
      });
    });
  }

  function bao(nut, chu, loi) {
    const cu = nut.textContent;
    nut.textContent = chu;
    nut.classList.toggle('loi', !!loi);
    setTimeout(() => { nut.textContent = cu; nut.classList.remove('loi'); }, loi ? 3200 : 1400);
  }

  /* ── Khởi động ─────────────────────────────────────────────────────── */
  const sanSang = fetch(GOC + 'data/pham.json')
    .then(r => r.json())
    .then(d => { DANH_MUC = d; veChuong(); veNgan(); return d; });

  Gio.sanSang = sanSang;
  Gio.veNgan = veNgan;
  window.Gio = Gio;

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', () => { dungKhung(); noiNut(); sanSang.then(veChuong); });
  else { dungKhung(); noiNut(); sanSang.then(veChuong); }

  nghe.push(veNgan);
})();
