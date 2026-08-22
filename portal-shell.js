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

  /* ══ HAI NGUỒN DỮ LIỆU ═══════════════════════════════════════════════
     Có phiên đăng nhập  → gọi máy chủ, dữ liệu đã cắt theo vai trò ngay từ
                           câu trả lời; màn không được phép thì KHÔNG có mặt.
     Không có phiên      → đọc file tĩnh, chỉ là bản trình bày với dữ liệu
                           mẫu. Trạng thái này phải nói ra, không được để
                           người xem tưởng là dữ liệu sống.
     ═════════════════════════════════════════════════════════════════════ */
  const API = window.KHOI.api || 'http://127.0.0.1:8000/api/v1';
  let PHIEN = null;
  try {
    const p = JSON.parse(sessionStorage.getItem('zen_phien') || 'null');
    if (p && p.het > Date.now()) PHIEN = p;
    else sessionStorage.removeItem('zen_phien');
  } catch { sessionStorage.removeItem('zen_phien'); }

  const dauThe = () => ({ Authorization: 'Bearer ' + PHIEN.the });

  /* Không có phiên mà máy chủ vẫn sống thì bắt đăng nhập, không cho vào
     xem dữ liệu mẫu. Trước đây gõ thẳng /os/index.html là thấy đủ 33 màn —
     dải cảnh báo có nói là bản trình bày, nhưng một cái cổng đi vòng qua
     được thì không còn là cổng.

     Máy chủ KHÔNG với tới được thì mới rơi về bản tĩnh — đó là bản trên
     GitHub Pages, nơi vốn không có máy chủ nào để mà đăng nhập. */
  async function canhCong() {
    if (PHIEN) return true;
    try {
      const r = await fetch(API.replace(/\/api\/v1$/, '') + '/health',
                            { cache: 'no-store' });
      if (r.ok) { location.replace('dang-nhap.html'); return false; }
    } catch { /* không nối được — bản tĩnh, cho xem bản trình bày */ }
    return true;
  }

  /* Góc nhìn đang mượn. Chỉ Chủ tịch mới đặt được, và máy chủ vẫn kiểm
     lại mỗi lần gọi — giá trị ở đây chỉ để vẽ giao diện. */
  let XEM_NHU = null;
  const thamSo = () => XEM_NHU ? '?xem_nhu=' + encodeURIComponent(XEM_NHU) : '';

  /* Máy chủ từ chối thẻ giữa chừng thì đưa về cổng, không để người dùng
     ngồi trước một màn trống mà không hiểu vì sao. */
  function kiemPhien(r) {
    if (r.status === 401) {
      sessionStorage.removeItem('zen_phien');
      location.replace('dang-nhap.html');
      throw new Error('het phien');
    }
    return r;
  }

  const nhomChua = id =>
    Object.keys(MUC_LUC.nhom_module).find(ma =>
      MUC_LUC.nhom_module[ma].man.some(m => m.id === id));

  function taiNhom(maNhom) {
    if (!maNhom) return Promise.resolve();
    if (!dangTai.has(maNhom)) {
      const nguon = PHIEN
        ? fetch(API + '/portal/nhom/' + maNhom + thamSo(), { headers: dauThe() }).then(kiemPhien)
        : fetch(KHOI.duLieu + 'nhom/' + maNhom + '.json');
      dangTai.set(maNhom, nguon
        .then(r => r.ok ? r.json() : {})
        .then(goi => { Object.assign(KHO, goi); })
        .catch(() => { dangTai.delete(maNhom); }));
    }
    return dangTai.get(maNhom);
  }

  /* Bảng điều khiển khác nhau theo từng vai trò vận hành nên tải riêng */
  function taiBang(idVai) {
    const ma = idVai.replace(/^vh_/, '');
    const nguon = PHIEN
      ? fetch(API + '/portal/bang' + thamSo(), { headers: dauThe() }).then(kiemPhien)
      : fetch(KHOI.duLieu + 'bang/' + ma + '.json');
    return nguon
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) { KHO['/'] = { _ten: 'Bảng điều khiển' }; return; }
        /* Hai khuôn cùng tồn tại: khuôn mới mang thẳng `so` và `the` nên
           dùng được ngay; khuôn cũ gói mọi thứ trong `khoi` và không có
           bảng, phải chuyển. Giữ cả hai để không phải viết lại một lượt
           mười ba bảng điều khiển. */
        KHO['/'] = d.khoi
          ? { _ten: 'Bảng điều khiển',
              so: (d.khoi.find(k => k.so) || {}).so || [],
              the: d.khoi.filter(k => k.h).map(k => ({ h: k.h, p: k.p })) }
          : { ...d, _ten: 'Bảng điều khiển' };
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
        <div class="nut-hang"><button class="nut dac" id="nut-doi-mk">Đổi mật khẩu</button></div>
        <div class="ghi" id="bao-mk" style="display:none;margin-top:12px"></div>
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

  /* Nói thẳng người xem đang ở chế độ nào. Bản trình bày mang dữ liệu mẫu
     mà không ghi rõ là thứ dễ gây hiểu nhầm nhất trong một buổi trình vốn. */
  function veTrangThai() {
    const cu = $('#dai-tt');
    if (cu) cu.remove();
    const d = document.createElement('div');
    d.id = 'dai-tt';
    d.className = 'dai-tt' + (PHIEN ? ' that' : '');
    const muonTen = XEM_NHU &&
      (MUC_LUC.muon_duoc || []).find(v => v.id === XEM_NHU)?.ten;
    d.innerHTML = !PHIEN
      ? 'Bản trình bày — <b>dữ liệu mẫu</b>, chưa đăng nhập. ' +
        '<a href="dang-nhap.html">Vào bằng tài khoản thật</a>'
      : muonTen && XEM_NHU !== PHIEN.vai
        ? `<b>${esc(PHIEN.ten)}</b> đang xem như <b>${esc(muonTen)}</b> — ` +
          'chỉ đọc, và lượt xem này đã ghi vào nhật ký'
        : `Đang xem bằng tài khoản <b>${esc(PHIEN.ten)}</b> · vai trò do máy chủ cấp`;
    if (XEM_NHU && XEM_NHU !== PHIEN?.vai) d.classList.remove('that');
    $('#noi').parentElement.insertBefore(d, $('#noi'));
  }

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

  /* ══ MÀN ĐỘNG — nội dung do máy chủ tính, không nằm trong file tĩnh ══
     Ba màn dưới đây khác mọi màn khác ở chỗ chúng KHÔNG có nội dung viết
     sẵn. Chúng hỏi máy chủ, và máy chủ trả về khác nhau cho từng người tuỳ
     địa bàn. Đây là chỗ dữ liệu thật sự chuyển động. */
  const so = n => (n ?? 0).toLocaleString('vi-VN');
  const KY = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  };

  const MAN_DONG = {
    '/mang-luoi': async () => {
      const d = await (await fetch(API + '/portal/mang-luoi',
                                   { headers: dauThe() }).then(kiemPhien)).json();
      const hang = d.don_vi.map(x => [
        '&nbsp;'.repeat(x.sau * 4) + esc(x.ten),
        { quoc_gia: 'Quốc gia', tinh: 'Tỉnh', co_so: 'Cơ sở' }[x.cap] || x.cap,
        x.id,
      ]);
      return { _ten: 'Mạng lưới địa bàn',
        so: [[String(d.don_vi.length), 'Đơn vị thấy được'], [esc(d.pham_vi), 'Phạm vi của bạn']],
        the: [{ h: 'Địa bàn bạn quản',
                p: 'Máy chủ cắt theo địa bàn của tài khoản ngay trong truy vấn — người khác gọi cùng endpoint này sẽ nhận danh sách khác.',
                bang: { cot: ['Đơn vị', 'Cấp', 'Mã'], hang } }] };
    },

    '/nhap-so': async () => {
      const ct = await (await fetch(API + '/so-lieu/chi-tieu',
                                    { headers: dauThe() }).then(kiemPhien)).json();
      if (!ct.nhap_duoc) {
        return { _ten: 'Nhập số liệu', khoa:
          'Tài khoản này không gắn đơn vị nào nên không nhập số được. Số liệu đi từ cơ sở lên, không đi ngược lại.' };
      }
      const o = ct.chi_tieu.map(x =>
        `<div class="hang-nhap"><label for="ns-${x.ma}">${esc(x.ten)} <span style="opacity:.6">(${esc(x.don_vi_tinh)})</span></label>
         <input id="ns-${x.ma}" inputmode="decimal" data-ct="${x.ma}" placeholder="0"></div>`).join('');
      return { _ten: 'Nhập số liệu', _tho: `
        <section class="the">
          <h2>Số liệu kỳ ${KY()} — ${esc(ct.don_vi)}</h2>
          <div class="p">Nhập xong bấm gửi. Số của tỉnh, quốc gia và Chủ tịch đổi ngay — họ không lưu số riêng, số của họ là tổng của các đơn vị bên dưới.</div>
          <div class="doi" style="margin-top:16px">${o}</div>
          <div class="nut-hang"><button class="nut dac" id="nut-gui-so">Gửi số liệu</button></div>
          <div class="ghi" id="bao-so" style="display:none;margin-top:12px"></div>
        </section>` };
    },

    '/tong-hop': async () => {
      const d = await (await fetch(API + '/so-lieu/tong-hop?ky=' + KY(),
                                   { headers: dauThe() }).then(kiemPhien)).json();
      const t = d.tong;
      const cot = Object.keys(t);
      return { _ten: 'Tổng hợp số liệu',
        so: cot.slice(0, 4).map(k => [so(t[k].gia_tri), t[k].ten]),
        the: [
          { h: `Kỳ ${d.ky} · phạm vi ${esc(d.pham_vi)}`,
            p: 'Cấp trên không lưu số riêng. Con số dưới đây là phép cộng trên cây địa bàn, tính đúng lúc bạn mở màn này.',
            bang: { cot: ['Chỉ tiêu', 'Giá trị', 'Đơn vị tính', 'Số đơn vị đã nhập'],
                    hang: cot.map(k => [t[k].ten, `<b>${so(t[k].gia_tri)}</b>`,
                                        t[k].don_vi_tinh, String(t[k].so_don_vi)]) } },
          { h: 'Tổng này đến từ đâu',
            p: d.theo_don_vi.length ? '' : 'Chưa đơn vị nào trong địa bàn của bạn nhập số cho kỳ này.',
            bang: d.theo_don_vi.length ? {
              cot: ['Đơn vị', 'Cấp', ...cot.map(k => t[k].ten)],
              hang: d.theo_don_vi.map(x => [esc(x.ten),
                { quoc_gia: 'Quốc gia', tinh: 'Tỉnh', co_so: 'Cơ sở' }[x.cap] || x.cap,
                ...cot.map(k => so(x.so[k]))]) } : null },
        ] };
    },
  };

  function noiGuiSo() {
    const nut = $('#nut-gui-so'), bao = $('#bao-so');
    if (!nut) return;
    nut.addEventListener('click', async () => {
      const o = [...document.querySelectorAll('[data-ct]')]
        .map(x => [x.dataset.ct, x.value.trim().replace(/[^\d.]/g, '')])
        .filter(([, v]) => v !== '');
      if (!o.length) {
        bao.className = 'ghi do'; bao.textContent = 'Chưa nhập số nào.';
        bao.style.display = 'block'; return;
      }
      nut.disabled = true;
      try {
        for (const [ma, gt] of o) {
          const r = await fetch(API + '/so-lieu', {
            method: 'POST',
            headers: { ...dauThe(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ ky: KY(), chi_tieu: ma, gia_tri: Number(gt) }),
          });
          if (!r.ok) throw new Error('chỉ tiêu ' + ma + ' — máy chủ trả ' + r.status);
        }
        bao.className = 'ghi';
        bao.innerHTML = 'Đã gửi ' + o.length + ' chỉ tiêu. ' +
          'Mở <b>Tổng hợp số liệu</b> để thấy con số đã cộng lên các cấp trên.';
        bao.style.display = 'block';
      } catch (e) {
        bao.className = 'ghi do'; bao.textContent = 'Không gửi được: ' + e.message;
        bao.style.display = 'block';
      } finally { nut.disabled = false; }
    });
  }

  function veNoiDung(m, id) {
    if (m._tho) return m._tho;
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
      if (id === 'cai-baomat') noiDoiMatKhau();
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

    /* Màn động: hỏi máy chủ mỗi lần mở, không giữ lại. Số liệu thay đổi
       theo từng lượt nhập nên giữ lại là hiện số cũ. */
    if (PHIEN && MAN_DONG[id]) {
      noi.innerHTML = '<div class="trong"><b>Đang tính…</b></div>';
      try {
        const m = await MAN_DONG[id]();
        if (manHT !== id) return;
        noi.innerHTML = veNoiDung(m, id);
        noi.scrollTop = 0;
        if (id === '/nhap-so') noiGuiSo();
      } catch (e) {
        noi.innerHTML = `<div class="trong"><b>Không lấy được số liệu</b>${esc(e.message)}</div>`;
      }
      return;
    }

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

  /* Đổi mật khẩu — nối thẳng vào máy chủ. Không có phiên thật thì nói rõ
     là chưa đổi được, chứ không hiện thông báo thành công giả. */
  function noiDoiMatKhau() {
    const nut = $('#nut-doi-mk'), bao = $('#bao-mk');
    if (!nut) return;
    const noi = (t, xanh) => {
      bao.className = 'ghi' + (xanh ? '' : ' do');
      bao.textContent = t;
      bao.style.display = 'block';
    };
    nut.addEventListener('click', async () => {
      if (!PHIEN) return noi('Chưa đăng nhập thật nên chưa đổi được mật khẩu.');
      const cu = $('#mkc').value, moi_ = $('#mkm').value, lai = $('#mkl').value;
      if (!cu || !moi_) return noi('Nhập đủ mật khẩu hiện tại và mật khẩu mới.');
      if (moi_ !== lai) return noi('Hai lần nhập mật khẩu mới không khớp.');
      if (moi_.length < 12) return noi('Mật khẩu mới cần ít nhất 12 ký tự. Một câu dài dễ nhớ khoẻ hơn một chuỗi ngắn rối rắm.');

      nut.disabled = true;
      try {
        const r = await fetch(API + '/toi/doi-mat-khau', {
          method: 'POST',
          headers: { ...dauThe(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ mat_khau_cu: cu, mat_khau_moi: moi_ }),
        });
        if (r.status === 401) noi('Mật khẩu hiện tại không đúng. Lượt thử đã ghi nhật ký.');
        else if (!r.ok) noi('Máy chủ trả lỗi ' + r.status + '.');
        else {
          noi('Đã đổi mật khẩu. Lần đăng nhập sau dùng mật khẩu mới.', true);
          ['#mkc', '#mkm', '#mkl'].forEach(x => { $(x).value = ''; });
        }
      } catch {
        noi('Không nối được máy chủ.');
      } finally {
        nut.disabled = false;
      }
    });
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
  $('#thoat').addEventListener('click', () => {
    sessionStorage.removeItem('zen_phien');
    location.href = 'dang-nhap.html';
  });

  $('#nut-menu').addEventListener('click', () => {
    $('#canh').classList.toggle('mo');
    $('#che').classList.toggle('hien');
  });
  $('#che').addEventListener('click', dongCanh);

  /* Nạp mục lục rồi dựng lại khung. Gọi lại được — đổi góc nhìn thì gọi
     lần nữa, vì mục lục phải do máy chủ cắt chứ không lọc ở trình duyệt. */
  function napLai() {
    // Đổi góc nhìn thì kho màn cũ không còn đúng nữa
    Object.keys(KHO).forEach(k => delete KHO[k]);
    dangTai.clear();

    return (PHIEN
      ? fetch(API + '/portal/muc-luc' + thamSo(), { headers: dauThe() })
          .then(kiemPhien).then(r => {
            if (r.status === 403) throw new Error('Không có quyền xem như vai trò đó');
            return r.json();
          })
          .then(d => ({ ...d, vai_tro: [{ ...d.vai_tro, nhom: Object.keys(d.nhom_module) }],
                        mac_dinh: d.vai_tro.id }))
      : fetch(KHOI.duLieu + 'muc-luc.json').then(r => r.json()))
      .then(mucLuc => {
        MUC_LUC = mucLuc;
        nhomDong.clear();
        veTrangThai();

        const muon = MUC_LUC.muon_duoc || [];
        if (PHIEN && muon.length) {
          /* Tài khoản được phép mượn góc nhìn — bộ chọn thành công cụ
             "xem như", không phải chỗ tự nâng quyền. Máy chủ vẫn kiểm lại
             từng lượt và ghi nhật ký, nên đây chỉ là lối vào cho tiện. */
          $('#chon-vai').innerHTML = muon.map(v =>
            `<option value="${v.id}">${esc(v.ten)}</option>`).join('');
          $('#chon-vai').value = XEM_NHU || PHIEN.vai;
          $('#chon-vai').disabled = false;
        } else {
          $('#chon-vai').innerHTML = MUC_LUC.vai_tro.map(v =>
            `<option value="${v.id}">${esc(v.ten)}</option>`).join('');
          /* Đăng nhập thật mà không được mượn thì khoá lại. Một ô bấm được
             mà không có tác dụng là giao diện nói dối. */
          $('#chon-vai').disabled = !!PHIEN;
        }
        doiVai(MUC_LUC.mac_dinh || MUC_LUC.vai_tro[0].id);
      });
  }

  $('#chon-vai').addEventListener('change', e => {
    if (!PHIEN) return doiVai(e.target.value);
    XEM_NHU = e.target.value === PHIEN.vai ? null : e.target.value;
    napLai().catch(err => {
      $('#noi').innerHTML =
        `<div class="trong"><b>Không mở được</b>${esc(err.message)}</div>`;
    });
  });

  /* Cửa vào: có phiên thì dựng khung; không có mà máy chủ còn sống thì
     đưa về cổng đăng nhập. */
  canhCong().then(vao => {
    if (!vao) return;
    napLai().catch(err => {
      $('#noi').innerHTML =
        `<div class="trong"><b>Không đọc được mục lục</b>${esc(err.message)}</div>`;
    });
  });
})();
