/* ════════════════════════════════════════════════════════════════════════
   KHUNG PORTAL — DÙNG CHUNG CHO CẢ HAI PHÍA

   Trang gọi khung này phải khai trước:

       window.KHOI = {
         duLieu: '../data/portal/',   // kho riêng của phía đó
         coBang: false                // có bảng điều khiển riêng từng vai trò
       }

   Hai phía dùng chung khung và chung bộ token giao diện, nhưng KHÔNG dùng
   chung dữ liệu. Xem docs/KIEN_TRUC_KHOI.md.
   ═══════════════════════════════════════════════════════════════════════ */


/* ════════════════════════════════════════════════════════════════════════
   Portal Zen O Tea

   Kiến trúc hai trục (docs/KIEN_TRUC_PORTAL.md):
   vai trò (dọc) × lớp năng lực (ngang). Lớp AFF là mặc định của MỌI vai
   trò — khác nhau ở tỷ lệ hoa hồng và quyền quản lý, không phải ở việc
   có hay không có AFF.

   Bộ chọn vai trò ở topbar chỉ để XEM THỬ khi dựng giao diện. Nối backend
   thì phải bỏ — vai trò lấy từ phiên đăng nhập phía máy chủ, nếu không ai
   cũng tự nâng mình lên chủ center được.
   ════════════════════════════════════════════════════════════════════════ */
(() => {
  const $ = s => document.querySelector(s);
  let MUC_LUC = null, vaiHT = 'tieu_dung', manHT = null;

  const esc = s => String(s ?? '').replace(/[&<>"]/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

  /* ══ TẢI THEO NHU CẦU ══════════════════════════════════════════════
     Mở trang chỉ tải mục lục. Nội dung màn tải theo nhóm khi người dùng
     bấm vào, tải rồi thì giữ lại. Trước đây tải cả bốn file 169KB cho
     mọi vai trò — thành viên tiêu dùng dùng 11 màn cũng phải tải màn
     công thức của Chủ tịch.

     Nói rõ giới hạn: đây là chia nhỏ cho nhẹ, KHÔNG phải chặn quyền.
     File tĩnh thì gõ thẳng đường dẫn là đọc được. Chặn thật phải ở máy
     chủ — nằm ở đợt 1 của KE_HOACH_BUILD_FE_BE.md.
     ═══════════════════════════════════════════════════════════════════ */

  const KHO = {};                  // mã màn → nội dung, tải tới đâu giữ tới đó
  const dangTai = new Map();       // mã nhóm → lời hứa, tránh tải trùng

  const nhomChua = id =>
    Object.keys(MUC_LUC.nhom_module).find(ma =>
      MUC_LUC.nhom_module[ma].man.some(m => m.id === id));

  function taiNhom(maNhom) {
    if (!maNhom) return Promise.resolve();
    if (!dangTai.has(maNhom)) {
      dangTai.set(maNhom, fetch(KHOI.duLieu + 'nhom/' + maNhom + '.json')
        .then(r => r.ok ? r.json() : {})
        .then(goi => { Object.assign(KHO, goi); })
        .catch(() => { dangTai.delete(maNhom); }));
    }
    return dangTai.get(maNhom);
  }

  /* Bảng điều khiển khác nhau theo từng vai trò vận hành nên tải riêng */
  function taiBang(idVai) {
    const ma = idVai.replace(/^vh_/, '');
    return fetch(KHOI.duLieu + 'bang/' + ma + '.json')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        KHO['/'] = !d ? { _ten: 'Bảng điều khiển' } : {
          _ten: 'Bảng điều khiển',
          so: (d.khoi.find(k => k.so) || {}).so || [],
          the: d.khoi.filter(k => k.h).map(k => ({ h: k.h, p: k.p }))
        };
      })
      .catch(() => { KHO['/'] = { _ten: 'Bảng điều khiển' }; });
  }

  /* ── Màn cài đặt tài khoản ── */
  const CAI_DAT = {
    'cai-hoso': { ten: 'Hồ sơ & ảnh đại diện', ve: () => `
      <section class="the">
        <h2>Ảnh đại diện</h2>
        <div class="avt-hang" style="margin-top:16px">
          <div class="avt-lon" id="avt-lon">TĐ</div>
          <div>
            <button class="nut">Tải ảnh lên</button>
            <div class="goi-y" style="margin-top:9px">Ảnh vuông, tối thiểu 200×200, dưới 2MB.</div>
          </div>
        </div>
      </section>
      <section class="the">
        <h2>Thông tin cá nhân</h2>
        <div class="doi" style="margin-top:16px">
          <div class="hang-nhap"><label for="ht">Họ và tên</label>
            <input id="ht" value="Trần Minh Đức"></div>
          <div class="hang-nhap"><label for="sd">Số điện thoại</label>
            <input id="sd" value="0912 345 678" inputmode="tel"></div>
        </div>
        <div class="hang-nhap"><label for="em">Thư điện tử</label>
          <input id="em" type="email" value="minhduc@example.com"></div>
        <div class="hang-nhap"><label for="dc">Địa chỉ nhận hàng</label>
          <input id="dc" value="12 Nguyễn Du, Hai Bà Trưng, Hà Nội"></div>
        <div class="nut-hang"><button class="nut dac">Lưu thay đổi</button></div>
      </section>` },

    'cai-xacminh': { ten: 'Xác minh chính chủ', ve: () => `
      <section class="the">
        <h2>Trạng thái xác minh</h2>
        <div class="p">Xác minh xong mới rút được hoa hồng và mới mở được vai trò đại lý trở lên.</div>
        <div class="xac-minh da">
          <div class="bieu">✓</div>
          <div class="noi-dung"><b>Số điện thoại</b>
            <span>0912 345 678 — đã xác thực bằng mã một lần</span></div>
        </div>
        <div class="xac-minh da">
          <div class="bieu">✓</div>
          <div class="noi-dung"><b>Thư điện tử</b>
            <span>minhduc@example.com — đã xác thực</span></div>
        </div>
        <div class="xac-minh chua">
          <div class="bieu">○</div>
          <div class="noi-dung"><b>Định danh VNeID</b>
            <span>Liên kết tài khoản định danh điện tử của Bộ Công an để xác minh chính chủ</span></div>
        </div>
        <div class="xac-minh chua">
          <div class="bieu">○</div>
          <div class="noi-dung"><b>Căn cước công dân</b>
            <span>Ảnh hai mặt, hoặc bỏ qua nếu đã liên kết VNeID</span></div>
        </div>
        <div class="nut-hang">
          <button class="nut dac">Liên kết VNeID</button>
          <button class="nut">Tải ảnh căn cước</button>
        </div>
      </section>
      <section class="the">
        <h2>Vì sao cần xác minh</h2>
        <div class="p" style="margin:0">Tiền hoa hồng chỉ chuyển vào tài khoản mang đúng tên
        người đã xác minh. Đây là cách duy nhất để không ai rút nhầm tiền của người khác, và
        cũng là yêu cầu khi kê khai thuế thu nhập cá nhân.</div>
      </section>` },

    'cai-bank': { ten: 'Tài khoản ngân hàng', ve: () => `
      <section class="the">
        <h2>Tài khoản nhận hoa hồng</h2>
        <div class="p">Tên chủ tài khoản phải trùng với tên đã xác minh chính chủ.</div>
        <div class="doi" style="margin-top:16px">
          <div class="hang-nhap"><label for="nh">Ngân hàng</label>
            <select id="nh">
              <option>Chọn ngân hàng</option>
              <option>Vietcombank</option><option>Techcombank</option>
              <option>VietinBank</option><option>BIDV</option>
              <option>MB Bank</option><option>ACB</option>
              <option>VPBank</option><option>Agribank</option>
              <option>Sacombank</option><option>TPBank</option>
            </select></div>
          <div class="hang-nhap"><label for="cn">Chi nhánh</label>
            <input id="cn" placeholder="Không bắt buộc"></div>
        </div>
        <div class="hang-nhap"><label for="stk">Số tài khoản</label>
          <input id="stk" inputmode="numeric" placeholder="Chỉ nhập chữ số"></div>
        <div class="hang-nhap"><label for="ctk">Tên chủ tài khoản</label>
          <input id="ctk" placeholder="TRAN MINH DUC" style="text-transform:uppercase">
          <div class="goi-y">Viết không dấu, in hoa, đúng như trên thẻ ngân hàng.</div></div>
        <div class="xac-minh chua" style="margin-top:6px">
          <div class="bieu">!</div>
          <div class="noi-dung"><b>Chưa đối chiếu được tên</b>
            <span>Tên chủ tài khoản phải khớp tên trên giấy tờ tuỳ thân. Lệch một chữ là
            ngân hàng trả lại tiền.</span></div>
        </div>
        <div class="nut-hang"><button class="nut dac">Lưu và đối chiếu</button></div>
      </section>` },

    'cai-thue': { ten: 'Mã số thuế', ve: () => `
      <section class="the">
        <h2>Mã số thuế thu nhập cá nhân</h2>
        <div class="p">Hoa hồng mỗi lần chi trả trên 2 triệu đồng bị khấu trừ 10% thuế thu nhập
        cá nhân. Có mã số thuế thì phần khấu trừ được ghi nhận đúng tên bạn.</div>
        <div class="hang-nhap" style="margin-top:16px"><label for="mst">Mã số thuế</label>
          <input id="mst" inputmode="numeric" placeholder="10 hoặc 13 chữ số">
          <div class="goi-y">Chưa có thì tra cứu hoặc đăng ký tại Cổng thông tin điện tử
          Tổng cục Thuế.</div></div>
        <div class="hang-nhap"><label for="ptt">Hình thức</label>
          <select id="ptt">
            <option>Cá nhân</option>
            <option>Hộ kinh doanh</option>
            <option>Doanh nghiệp</option>
          </select></div>
        <div class="nut-hang"><button class="nut dac">Lưu mã số thuế</button></div>
      </section>` },

    'cai-baomat': { ten: 'Bảo mật', ve: () => `
      <section class="the">
        <h2>Mật khẩu</h2>
        <div class="hang-nhap" style="margin-top:16px"><label for="mkc">Mật khẩu hiện tại</label>
          <input id="mkc" type="password"></div>
        <div class="doi">
          <div class="hang-nhap"><label for="mkm">Mật khẩu mới</label>
            <input id="mkm" type="password"></div>
          <div class="hang-nhap"><label for="mkl">Nhập lại</label>
            <input id="mkl" type="password"></div>
        </div>
        <div class="nut-hang"><button class="nut dac">Đổi mật khẩu</button></div>
      </section>
      <section class="the">
        <h2>Xác thực hai lớp</h2>
        <div class="p">Bắt buộc với tài khoản có ví hoa hồng hoặc quyền quản lý mạng lưới.</div>
        <div class="xac-minh chua" style="margin-top:14px">
          <div class="bieu">○</div>
          <div class="noi-dung"><b>Chưa bật</b>
            <span>Dùng ứng dụng sinh mã trên điện thoại</span></div>
        </div>
        <div class="nut-hang"><button class="nut dac">Bật xác thực hai lớp</button></div>
      </section>
      <section class="the">
        <h2>Phiên đăng nhập</h2>
        <div class="cuon"><table>
          <thead><tr><th>Thiết bị</th><th>Nơi truy cập</th><th>Lần cuối</th><th></th></tr></thead>
          <tbody>
            <tr><td>Chrome · Windows</td><td>Hà Nội</td><td>Đang dùng</td>
                <td><span class="nh ok">Hiện tại</span></td></tr>
            <tr><td>Safari · iPhone</td><td>Hà Nội</td><td>2 ngày trước</td>
                <td><button class="nut" style="padding:5px 13px;font-size:10.5px">Đăng xuất</button></td></tr>
          </tbody>
        </table></div>
      </section>` }
  };

  /* Nhóm nào đang đóng — nhớ theo vai trò, để đổi màn không bị bung lại hết */
  const nhomDong = new Set();

  /* Vai trò vận hành mang danh sách màn được phép; vai trò thương mại
     dùng trọn bộ màn của nhóm nên không cần chặn thêm. */
  const duocXem = (vt, id) => !vt.quyen_module || vt.quyen_module.includes(id);

  function veCanhNav() {
    const vt = MUC_LUC.vai_tro.find(v => v.id === vaiHT);

    /* Vẽ từ mục lục — tên màn có sẵn ở đây nên thanh bên hiện đủ ngay,
       không phải chờ tải nội dung. */
    $('#canh-nav').innerHTML = vt.nhom.map(maNhom => {
      const nhom = MUC_LUC.nhom_module[maNhom];
      if (!nhom) return '';
      const dsMan = nhom.man.filter(m => duocXem(vt, m.id));
      if (!dsMan.length) return '';

      // Nhóm chứa màn đang xem thì luôn mở, kẻo người dùng mất dấu mình đang ở đâu
      const dong = nhomDong.has(maNhom) && !dsMan.some(m => m.id === manHT);

      const muc = dsMan.map(m =>
        `<div class="muc${m.id === manHT ? ' dang' : ''}" data-man="${m.id}"
              role="button" tabindex="0">${esc(m.ten)}</div>`).join('');

      return `<div class="thu">
        <button class="thu-dau${dong ? ' dong' : ''}" data-nhom="${maNhom}"
                aria-expanded="${!dong}">
          ${esc(nhom.ten)}
          <span class="dem">${dsMan.length}</span>
          <span class="mui" aria-hidden="true">⌄</span>
        </button>
        <div class="thu-con${dong ? ' dong' : ''}"><div>${muc}</div></div>
      </div>`;
    }).join('');

    $('#canh-nav').querySelectorAll('.thu-dau').forEach(el =>
      el.addEventListener('click', () => {
        const ma = el.dataset.nhom;
        nhomDong.has(ma) ? nhomDong.delete(ma) : nhomDong.add(ma);
        const dong = nhomDong.has(ma);
        el.classList.toggle('dong', dong);
        el.setAttribute('aria-expanded', String(!dong));
        el.nextElementSibling.classList.toggle('dong', dong);
      }));

    $('#canh-nav').querySelectorAll('.muc').forEach(el => {
      const mo = () => { moMan(el.dataset.man); dongCanh(); };
      el.addEventListener('click', mo);
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); mo(); }
      });
    });
  }

  const veBang = b => !b ? '' :
    `<div class="cuon"><table><thead><tr>${b.cot.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>` +
    `<tbody>${b.hang.map(h => `<tr>${h.map(o => `<td>${o}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

  function veNoiDung(m, id) {
    // Màn bị giữ lại khỏi bản tĩnh — nói thẳng vì sao, không giả vờ trống
    if (m.khoa) return `<div class="trong"><b>Cần máy chủ xác thực</b>${esc(m.khoa)}</div>`;

    /* Vào thẳng nội dung chính: số liệu và bảng. Dòng mô tả và pill ghi
       chú của bản gốc là chú thích cho người xem bản thiết kế, không
       phải nội dung cho người dùng thật. */
    let html = '';
    if (m.so && m.so.length) {
      html += `<div class="so-hang">${m.so.map(([gt, nhan]) =>
        `<div class="so-o"><b>${esc(gt)}</b><span>${esc(nhan)}</span></div>`).join('')}</div>`;
    }
    (m.the || []).forEach(t => {
      html += `<section class="the"><h2>${esc(t.h)}</h2>` +
        (t.p ? `<div class="p">${esc(t.p)}</div>` : '') +
        veBang(t.bang) + '</section>';
    });
    if (m.ghi_do) html += `<div class="ghi do">${esc(m.ghi_do)}</div>`;
    return html || `<div class="trong"><b>Chưa có dữ liệu</b>Màn này chưa có nội dung.</div>`;
  }

  async function moMan(id) {
    if (!id) return;
    manHT = id;
    const noi = $('#noi');

    if (CAI_DAT[id]) {
      $('#tieu-man').textContent = CAI_DAT[id].ten;
      noi.innerHTML = CAI_DAT[id].ve();
      noi.scrollTop = 0;
      $('#canh-nav').querySelectorAll('.muc').forEach(e => e.classList.remove('dang'));
      return;
    }

    const vtHT = MUC_LUC.vai_tro.find(v => v.id === vaiHT);
    if (!duocXem(vtHT, id)) {
      $('#tieu-man').textContent = 'Không có quyền';
      noi.innerHTML = `<div class="trong"><b>Vai trò này không mở được màn đó</b>
        Lượt truy cập đã được ghi vào nhật ký hoạt động.</div>`;
      veCanhNav(); return;
    }

    // Tên có sẵn trong mục lục nên đặt tiêu đề ngay, không để trống lúc chờ
    const maNhom = nhomChua(id);
    const mucLuc = maNhom && MUC_LUC.nhom_module[maNhom].man.find(m => m.id === id);
    $('#tieu-man').textContent = (mucLuc && mucLuc.ten) || id;
    veCanhNav();

    if (!KHO[id]) {
      noi.innerHTML = '<div class="trong"><b>Đang mở…</b></div>';
      await taiNhom(maNhom);
      if (manHT !== id) return;          // người dùng đã bấm sang màn khác
    }

    const m = KHO[id];
    if (!m) {
      noi.innerHTML = `<div class="trong"><b>Màn này chưa dựng</b>
        Nội dung sẽ bổ sung ở đợt build kế tiếp.</div>`;
      return;
    }

    noi.innerHTML = veNoiDung(m, id);
    noi.scrollTop = 0;
  }

  async function doiVai(id) {
    vaiHT = id;
    nhomDong.clear();
    const vt = MUC_LUC.vai_tro.find(v => v.id === id);
    $('#avt').textContent = vt.tat;
    $('#tk-vai').textContent = vt.ten;

    if (KHOI.coBang) await taiBang(id);
    else delete KHO['/'];

    veCanhNav();
    const dau = vt.nhom
      .flatMap(n => (MUC_LUC.nhom_module[n] || { man: [] }).man.map(m => m.id))
      .find(x => duocXem(vt, x));
    moMan(dau);
  }

  const dongCanh = () => {
    $('#canh').classList.remove('mo');
    $('#che').classList.remove('hien');
  };

  /* ── Menu tài khoản ── */
  const tkMenu = $('#tk-menu'), tkNut = $('#tk-nut');
  const dongTk = () => { tkMenu.classList.remove('mo'); tkNut.setAttribute('aria-expanded','false'); };
  tkNut.addEventListener('click', e => {
    e.stopPropagation();
    const mo = tkMenu.classList.toggle('mo');
    tkNut.setAttribute('aria-expanded', String(mo));
  });
  document.addEventListener('click', e => {
    if (!tkMenu.contains(e.target) && !tkNut.contains(e.target)) dongTk();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') dongTk(); });
  tkMenu.querySelectorAll('[data-mo]').forEach(b =>
    b.addEventListener('click', () => { moMan(b.dataset.mo); dongTk(); }));
  $('#thoat').addEventListener('click', () => { location.href = '../dang-nhap.html'; });

  $('#nut-menu').addEventListener('click', () => {
    $('#canh').classList.toggle('mo');
    $('#che').classList.toggle('hien');
  });
  $('#che').addEventListener('click', dongCanh);

  fetch(KHOI.duLieu + 'muc-luc.json')
    .then(r => r.json())
    .then(mucLuc => {
      MUC_LUC = mucLuc;

      /* Danh sách phẳng — mỗi portal chỉ có vai trò của mình. Trước đây
         một bộ chọn gộp cả thương mại lẫn vận hành, vừa rối vừa để lộ
         cơ cấu nội bộ cho người ngoài. */
      $('#chon-vai').innerHTML = MUC_LUC.vai_tro.map(v =>
        `<option value="${v.id}">${esc(v.ten)}</option>`).join('');
      $('#chon-vai').addEventListener('change', e => doiVai(e.target.value));
      doiVai(MUC_LUC.mac_dinh || MUC_LUC.vai_tro[0].id);
    })
    .catch(err => {
      $('#noi').innerHTML = `<div class="trong"><b>Không đọc được mục lục</b>${esc(err.message)}</div>`;
    });
})();
