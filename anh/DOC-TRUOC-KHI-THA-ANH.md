# Thả ảnh vào đâu, và ảnh thế nào thì dùng được

## Thả vào đâu

    site/anh/vung-nguyen-lieu/   vùng trà, cây cổ thụ, sương núi Hà Giang
    site/anh/thu-hai/            người hái, gùi lá, ngày thu hái
    site/anh/lam-che/            xưởng, mẻ ủ, tay người làm
    site/anh/pham/               chai, hộp, bộ phẩm

Thả xong chạy đúng một lệnh:

    node scripts/quet-anh.mjs

Ảnh mới tự vào danh mục; lời chú đã viết được giữ nguyên; ảnh xoá khỏi
thư mục thì tự rời danh mục. Sau đó điền lời chú trong `site/data/anh.json`
— **chụp ở đâu, ai, mùa nào**. Đó là thứ biến một tấm ảnh đẹp thành một
bằng chứng nguồn gốc.

## Ảnh thế nào thì dùng được

**Phải là ảnh của mình** — mình chụp, hoặc mình trả tiền thuê chụp, hoặc
hộ dân cho phép bằng văn bản. Ảnh tải từ mạng về thì KHÔNG, kể cả khi
"trông giống Hà Giang lắm":

- Ảnh trên mạng gần như luôn có chủ. Web thương mại dùng ảnh không giấy
  phép là một vết trong hồ sơ thẩm định sở hữu trí tuệ trước niêm yết.
- Nặng hơn: toàn bộ giá trị Zen O Tea nằm ở nguồn gốc có thật. Khách tra
  ngược một tấm ảnh, thấy nó chụp ở Vân Nam — thì mất luôn niềm tin vào
  cái cây ba trăm năm mình kể. Một tấm ảnh mượn đắt hơn nhiều một khoảng
  trống.

Bộ nào chưa có ảnh thật thì mục đó **không hiện ra trang**. Đó là chủ ý.

## Kích thước

- Cạnh dài **1600–2400px** là đủ cho màn hình lớn
- Mỗi tệp **dưới 600KB** — ảnh điện thoại 4MB × 12 tấm là 48MB, khách 3G
  đóng tab trước khi tấm đầu hiện xong. Lệnh quét sẽ chặn tệp quá nặng.
- Định dạng: `.webp` tốt nhất, `.jpg` cũng được
- Tên tệp không dấu, không khoảng trắng: `hoang-su-phi-suong-som.webp`

## Nén ảnh trước khi thả (nếu chưa có công cụ)

Ảnh gốc từ máy ảnh/điện thoại thường 3–5MB. Nén xuống dưới 600KB mà mắt
thường không thấy khác — dùng squoosh.app (chạy ngay trong trình duyệt,
ảnh không rời khỏi máy) hoặc bảo em viết lệnh nén hàng loạt.
