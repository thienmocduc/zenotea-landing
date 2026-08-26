/* ════════════════════════════════════════════════════════════════════════
   CỔNG PORTAL — nối vào máy chủ thật

   Trang gọi phải khai trước:
       window.CONG = { ten:'Cổng vận hành', mo:'…', vao:'./' }

   Máy chủ: services/api. Nếu máy chủ chưa chạy thì cổng nói thẳng là
   chưa nối được, KHÔNG giả vờ đăng nhập thành công. Một ô mật khẩu không
   có gì phía sau còn tệ hơn không có ô nào — người dùng tin là có bảo vệ
   trong khi không có.
   ═══════════════════════════════════════════════════════════════════════ */
(() => {
  const $ = s => document.querySelector(s);
  const API = window.CONG?.api || 'http://127.0.0.1:8000/api/v1';

  const bao = (t, tin) => {
    const el = $('#bao');
    el.className = 'bao' + (tin ? ' tin' : '');
    el.innerHTML = t;
    el.style.display = 'block';
  };
  const an = () => { $('#bao').style.display = 'none'; };

  $('#ten-cong').textContent = window.CONG.ten;
  $('#phu-de').textContent = window.CONG.mo;
  document.title = window.CONG.ten + ' — Zen O Tea';

  /* Đã có phiên thì vào thẳng, không bắt gõ lại */
  const phien = sessionStorage.getItem('zen_phien');
  if (phien) {
    try {
      const p = JSON.parse(phien);
      if (p.het > Date.now()) location.replace(window.CONG.vao);
    } catch { sessionStorage.removeItem('zen_phien'); }
  }

  const form = $('#form-vao');
  const nut = $('#nut-vao');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    an();
    const tk = $('#tk').value.trim();
    const mk = $('#mk').value;
    const ma = $('#ma').value.trim();
    if (!tk || !mk) return bao('Cần nhập cả tài khoản và mật khẩu.');

    nut.disabled = true;
    const chu = nut.textContent;
    nut.textContent = 'Đang kiểm…';

    try {
      const r = await fetch(API + '/auth/dang-nhap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dinh_danh: tk, mat_khau: mk, ma_hai_lop: ma || null }),
      });

      if (r.status === 401) {
        bao('Tài khoản hoặc mật khẩu không đúng. Lượt thử đã được ghi nhật ký.');
      } else if (r.status === 423) {
        bao('Tài khoản tạm khoá do quá nhiều lần thử sai. Liên hệ quản trị hệ thống.');
      } else if (r.status === 428) {
        $('#hang-ma').style.display = 'block';
        $('#ma').focus();
        bao('Tài khoản này bật xác thực hai lớp — nhập mã sáu số.', true);
      } else if (!r.ok) {
        bao('Máy chủ trả lỗi ' + r.status + '. Thử lại sau ít phút.');
      } else {
        const d = await r.json();
        if (d.be_mat !== window.CONG.be_mat) {
          bao('Tài khoản này không thuộc ' + window.CONG.ten.toLowerCase() +
              '. Vai trò <b>' + d.vai_tro_ten + '</b> vào ở cổng khác.');
        } else {
          sessionStorage.setItem('zen_phien', JSON.stringify({
            the: d.the, vai: d.vai_tro, ten: d.ho_ten,
            het: Date.now() + d.song_giay * 1000,
          }));
          location.replace(window.CONG.vao);
        }
      }
    } catch {
      /* Không nối được máy chủ — nói thật, không cho vào */
      bao('<b>Chưa nối được máy chủ xác thực.</b><br>' +
          'Bản đang chạy là bản tĩnh nên chưa có đăng nhập thật. ' +
          'Xem <a href="' + window.CONG.vao + '" style="color:var(--kim-giua);' +
          'border-bottom:1px solid rgba(197,169,128,.4)">bản trình bày</a> — ' +
          'dữ liệu là dữ liệu mẫu, không phải dữ liệu sống.');
    } finally {
      nut.disabled = false;
      nut.textContent = chu;
    }
  });

  $('#tk').focus();
})();
