# Zen O Tea — Landing

> Khơi thông sự sống minh triết.

Trang giới thiệu Zen O Tea — trà Shan tuyết cổ thụ 300–600 năm, lên men theo pháp KHÚC (麴)
của Đông dược. Một thành viên hệ sinh thái Zeni Holdings.

**Xem tại:** https://thienmocduc.github.io/zenotea-landing/

## Về repo này

Đây là **bản triển khai tĩnh** của landing, tách riêng để phục vụ GitHub Pages.
Mã nguồn dự án, tài liệu thiết kế và toàn bộ tài liệu nội bộ nằm ở repo chính (private).

Không sửa trực tiếp trong repo này — mọi thay đổi bắt nguồn từ file thiết kế đã chốt
ở repo chính rồi dựng lại.

## Nội dung

| File | Vai trò |
|---|---|
| `index.html` | Landing, 15 section |
| `dang-nhap.html` | Cổng đăng nhập Zen Circle (giao diện, chưa nối tài khoản thật) |
| `logo.png` | Logo ngang nền trong suốt |
| `og.png` | Ảnh chia sẻ mạng xã hội 1200×630 |
| `favicon.png` · `apple-touch-icon.png` | Biểu tượng Ensō |

## Ghi chú kỹ thuật

Bản dựng này tách ba ảnh logo nhúng dạng base64 (lặp lại ở thanh điều hướng, hero và chân
trang) thành một file ảnh chung — giảm trang từ 601 KB xuống 49,5 KB, tức 92%.

Bổ sung so với bản thiết kế gốc: thẻ Open Graph và Twitter Card đầy đủ, đường dẫn chuẩn
tắc, favicon, màu thanh trình duyệt. Nội dung, bố cục, hệ màu và kiểu chữ giữ nguyên
tuyệt đối.

Trang không dùng framework, không phụ thuộc bên ngoài ngoài Google Fonts.
