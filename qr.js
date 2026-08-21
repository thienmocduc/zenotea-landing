/* ════════════════════════════════════════════════════════════════════════
   ZenOTea — Sinh mã QR ngay trên máy người dùng
   ────────────────────────────────────────────────────────────────────────
   Mã QR thanh toán mang số tiền và mã đơn. Nếu gọi dịch vụ vẽ QR bên ngoài
   thì mỗi lần khách thanh toán là một lần số tiền và mã đơn của họ đi ra
   khỏi hệ thống mình. Nên vẽ tại chỗ, không gửi đi đâu cả.

   Chuẩn ISO/IEC 18004 — chế độ byte, mức sửa lỗi L hoặc M, phiên bản 1–20.
   Bảng sửa lỗi lấy từ thư viện chuẩn rồi đối chiếu lại từng ô ma trận.
   ════════════════════════════════════════════════════════════════════════ */
(function (goc) {
  'use strict';

  /* Số từ mã sửa lỗi trên mỗi khối, theo phiên bản 1–20 */
  const ECW = {
    L: [7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28],
    M: [10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26]
  };
  /* Số khối, theo phiên bản 1–20 */
  const SOKHOI = {
    L: [1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8],
    M: [1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16]
  };

  /* ── Số từ mã của một phiên bản ────────────────────────────────────── */
  function tongTuMa(ver) {
    let bit = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      const n = Math.floor(ver / 7) + 2;
      bit -= (25 * n - 10) * n - 55;
      if (ver >= 7) bit -= 36;
    }
    return bit >> 3;
  }

  function viTriCanChinh(ver) {
    if (ver === 1) return [];
    const n = Math.floor(ver / 7) + 2;
    const buoc = (ver === 32) ? 26
      : Math.floor((ver * 4 + n * 2 + 1) / (n * 2 - 2)) * 2;
    const ds = [];
    let p = ver * 4 + 10;
    for (let i = 0; i < n - 1; i++) { ds.unshift(p); p -= buoc; }
    ds.unshift(6);
    return ds;
  }

  /* ── Số học trên trường hữu hạn GF(256) ────────────────────────────── */
  function nhan(a, b) {
    let kq = 0;
    for (let i = 7; i >= 0; i--) {
      kq = (kq << 1) ^ ((kq >>> 7) * 0x11D);
      kq ^= ((b >>> i) & 1) * a;
    }
    return kq & 0xFF;
  }

  function daThucSinh(bac) {
    const p = new Uint8Array(bac); p[bac - 1] = 1;
    let goc = 1;
    for (let i = 0; i < bac; i++) {
      for (let j = 0; j < bac; j++) {
        p[j] = nhan(p[j], goc);
        if (j + 1 < bac) p[j] ^= p[j + 1];
      }
      goc = nhan(goc, 2);
    }
    return p;
  }

  function tuMaSuaLoi(duLieu, bac) {
    const sinh = daThucSinh(bac);
    const kq = new Uint8Array(bac);
    for (const b of duLieu) {
      const dan = b ^ kq[0];
      kq.copyWithin(0, 1); kq[bac - 1] = 0;
      for (let i = 0; i < bac; i++) kq[i] ^= nhan(sinh[i], dan);
    }
    return kq;
  }

  /* ── Chuỗi bit ─────────────────────────────────────────────────────── */
  function themBit(bit, gt, so) {
    for (let i = so - 1; i >= 0; i--) bit.push((gt >>> i) & 1);
  }

  /* ── Ma trận ───────────────────────────────────────────────────────── */
  function taoMaTran(ver, mucSua, tuMa) {
    const n = ver * 4 + 17;
    const o = [], khoa = [];
    for (let i = 0; i < n; i++) { o.push(new Array(n).fill(0)); khoa.push(new Array(n).fill(false)); }

    const dat = (x, y, v) => { o[y][x] = v ? 1 : 0; khoa[y][x] = true; };

    /* Ô định vị ba góc kèm dải cách */
    const veDinhVi = (cx, cy) => {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= n || y >= n) continue;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        dat(x, y, d !== 2 && d !== 4);
      }
    };
    veDinhVi(3, 3); veDinhVi(n - 4, 3); veDinhVi(3, n - 4);

    /* Dải nhịp */
    for (let i = 8; i < n - 8; i++) { dat(6, i, i % 2 === 0); dat(i, 6, i % 2 === 0); }

    /* Ô căn chỉnh */
    const vt = viTriCanChinh(ver);
    for (let i = 0; i < vt.length; i++) for (let j = 0; j < vt.length; j++) {
      const goc3 = (i === 0 && j === 0) || (i === 0 && j === vt.length - 1) || (i === vt.length - 1 && j === 0);
      if (goc3) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++)
        dat(vt[j] + dx, vt[i] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }

    /* Chỗ dành cho thông tin định dạng — điền sau khi chọn mặt nạ */
    for (let i = 0; i <= 8; i++) { if (i !== 6) { dat(i, 8, false); dat(8, i, false); } }
    for (let i = 0; i < 8; i++) { dat(n - 1 - i, 8, false); dat(8, n - 1 - i, false); }
    dat(8, n - 8, true); /* ô tối cố định */

    /* Thông tin phiên bản, chỉ từ phiên bản 7 trở lên */
    if (ver >= 7) {
      let r = ver;
      for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
      const bits = (ver << 12) | r;
      for (let i = 0; i < 18; i++) {
        const b = ((bits >>> i) & 1) === 1, a = n - 11 + i % 3, bq = Math.floor(i / 3);
        dat(a, bq, b); dat(bq, a, b);
      }
    }

    /* Rải từ mã theo đường zíc-zắc từ góc dưới bên phải */
    let i = 0;
    for (let phai = n - 1; phai >= 1; phai -= 2) {
      if (phai === 6) phai = 5;
      for (let d = 0; d < n; d++) {
        for (let k = 0; k < 2; k++) {
          const x = phai - k;
          const len = ((phai + 1) & 2) === 0;
          const y = len ? n - 1 - d : d;
          if (khoa[y][x]) continue;
          o[y][x] = i < tuMa.length * 8 ? (tuMa[i >>> 3] >>> (7 - (i & 7))) & 1 : 0;
          i++;
        }
      }
    }

    /* Tám mặt nạ, chấm điểm phạt, giữ bản nhẹ nhất */
    const matNa = [
      (x, y) => (x + y) % 2 === 0,
      (x, y) => y % 2 === 0,
      (x, y) => x % 3 === 0,
      (x, y) => (x + y) % 3 === 0,
      (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
      (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
      (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0,
      (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0
    ];

    let tot = null, diemTot = Infinity;
    for (let m = 0; m < 8; m++) {
      const t = o.map(h => h.slice());
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++)
        if (!khoa[y][x] && matNa[m](x, y)) t[y][x] ^= 1;
      datDinhDang(t, n, mucSua, m);
      const d = chamPhat(t, n);
      if (d < diemTot) { diemTot = d; tot = t; }
    }
    return tot;
  }

  function datDinhDang(o, n, mucSua, matNa) {
    const bitMuc = { L: 1, M: 0 }[mucSua];
    const dl = (bitMuc << 3) | matNa;
    let r = dl;
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const bits = ((dl << 10) | r) ^ 0x5412;
    for (let i = 0; i <= 5; i++) o[i][8] = (bits >>> i) & 1;
    o[7][8] = (bits >>> 6) & 1;
    o[8][8] = (bits >>> 7) & 1;
    o[8][7] = (bits >>> 8) & 1;
    for (let i = 9; i < 15; i++) o[8][14 - i] = (bits >>> i) & 1;
    for (let i = 0; i < 8; i++) o[8][n - 1 - i] = (bits >>> i) & 1;
    for (let i = 8; i < 15; i++) o[n - 15 + i][8] = (bits >>> i) & 1;
    o[n - 8][8] = 1;
  }

  function chamPhat(o, n) {
    let d = 0;
    /* Chuỗi cùng màu từ năm ô trở lên */
    for (let y = 0; y < n; y++) {
      for (const doc of [false, true]) {
        let mau = -1, dai = 0;
        for (let x = 0; x < n; x++) {
          const v = doc ? o[x][y] : o[y][x];
          if (v === mau) { dai++; if (dai === 5) d += 3; else if (dai > 5) d++; }
          else { mau = v; dai = 1; }
        }
      }
    }
    /* Khối hai nhân hai cùng màu */
    for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) {
      const v = o[y][x];
      if (v === o[y][x + 1] && v === o[y + 1][x] && v === o[y + 1][x + 1]) d += 3;
    }
    /* Hình dễ nhầm với ô định vị */
    const mau1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    const mau2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    const khop = (lay, i) => {
      for (let k = 0; k < 11; k++) if (lay(i + k) !== mau1[k]) return false; return true;
    };
    const khop2 = (lay, i) => {
      for (let k = 0; k < 11; k++) if (lay(i + k) !== mau2[k]) return false; return true;
    };
    for (let y = 0; y < n; y++) for (const doc of [false, true]) {
      const lay = i => (i < 0 || i >= n) ? -1 : (doc ? o[i][y] : o[y][i]);
      for (let x = 0; x <= n - 11; x++) { if (khop(lay, x)) d += 40; if (khop2(lay, x)) d += 40; }
    }
    /* Lệch cân bằng đen trắng */
    let den = 0;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) den += o[y][x];
    const ty = den * 100 / (n * n);
    d += Math.floor(Math.abs(ty - 50) / 5) * 10;
    return d;
  }

  /* ── Đầu vào chính ─────────────────────────────────────────────────── */
  function taoQR(chuoi, mucSua) {
    mucSua = mucSua || 'L';
    const byte = new TextEncoder().encode(chuoi);

    /* Chọn phiên bản nhỏ nhất chứa đủ */
    let ver = 0, soTuMaDL = 0;
    for (let v = 1; v <= 20; v++) {
      const tong = tongTuMa(v);
      const dl = tong - ECW[mucSua][v - 1] * SOKHOI[mucSua][v - 1];
      const demDai = v <= 9 ? 8 : 16;
      if (byte.length * 8 + 4 + demDai <= dl * 8) { ver = v; soTuMaDL = dl; break; }
    }
    if (!ver) throw new Error('Chuỗi dài quá mức mã QR phiên bản 20 chứa được');

    /* Dòng bit: chế độ byte, độ dài, dữ liệu, kết thúc, đệm */
    const bit = [];
    themBit(bit, 4, 4);
    themBit(bit, byte.length, ver <= 9 ? 8 : 16);
    for (const b of byte) themBit(bit, b, 8);
    themBit(bit, 0, Math.min(4, soTuMaDL * 8 - bit.length));
    themBit(bit, 0, (8 - bit.length % 8) % 8);
    for (let dem = 0; bit.length < soTuMaDL * 8; dem++)
      themBit(bit, dem % 2 === 0 ? 0xEC : 0x11, 8);

    const dl = new Uint8Array(soTuMaDL);
    bit.forEach((b, i) => { if (b) dl[i >>> 3] |= 1 << (7 - (i & 7)); });

    /* Chia khối, tính sửa lỗi, đan xen */
    const soKhoi = SOKHOI[mucSua][ver - 1];
    const bacSua = ECW[mucSua][ver - 1];
    const tong = tongTuMa(ver);
    const khoiNgan = Math.floor(tong / soKhoi) - bacSua;
    const soKhoiNgan = soKhoi - tong % soKhoi;

    const khoiDL = [], khoiEC = [];
    for (let i = 0, k = 0; i < soKhoi; i++) {
      const dai = khoiNgan + (i < soKhoiNgan ? 0 : 1);
      const d = dl.slice(k, k + dai); k += dai;
      khoiDL.push(d); khoiEC.push(tuMaSuaLoi(d, bacSua));
    }

    const tuMa = [];
    for (let i = 0; i < khoiNgan + 1; i++)
      for (let j = 0; j < soKhoi; j++)
        if (i < khoiDL[j].length) tuMa.push(khoiDL[j][i]);
    for (let i = 0; i < bacSua; i++)
      for (let j = 0; j < soKhoi; j++) tuMa.push(khoiEC[j][i]);

    return { o: taoMaTran(ver, mucSua, tuMa), canh: ver * 4 + 17, ver: ver };
  }

  /* ── Vẽ ra SVG ─────────────────────────────────────────────────────── */
  function veSVG(chuoi, tuyChon) {
    const t = tuyChon || {};
    const qr = taoQR(chuoi, t.mucSua);
    const le = t.le == null ? 4 : t.le;
    const canh = qr.canh + le * 2;
    let duong = '';
    for (let y = 0; y < qr.canh; y++) for (let x = 0; x < qr.canh; x++)
      if (qr.o[y][x]) duong += `M${x + le} ${y + le}h1v1h-1z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canh} ${canh}" ` +
      `shape-rendering="crispEdges" role="img" aria-label="Mã QR thanh toán">` +
      `<rect width="${canh}" height="${canh}" fill="${t.nen || '#ffffff'}"/>` +
      `<path d="${duong}" fill="${t.muc || '#0E211A'}"/></svg>`;
  }

  goc.ZenQR = { taoQR: taoQR, veSVG: veSVG };
})(typeof window !== 'undefined' ? window : globalThis);
