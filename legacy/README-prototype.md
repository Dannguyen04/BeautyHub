# BeautyHub web-first MVP

Bản MVP có thể chạy cục bộ để kiểm chứng luồng giao dịch cốt lõi của marketplace photographer / makeup artist tại TP.HCM.

## Chạy dự án

Yêu cầu Node.js 20+.

```bash
npm start
```

Mở `http://127.0.0.1:4173`.

Không cần cài package ngoài. Dữ liệu demo được lưu trong `data/db.json`.

## Luồng demo

1. Ở vai trò **Khách**, tìm creator, mở hồ sơ, chọn package và slot trống, sau đó gửi booking.
2. Chuyển sang **Creator** ở thanh điều hướng để xác nhận, bắt đầu và hoàn thành booking.
3. Trở lại **Khách** → tab **Đã qua** để gửi review.
4. Chuyển sang **Admin** để duyệt provider và quản lý trạng thái booking.

API có kiểm tra xung đột slot để ngăn double booking. Review chỉ được tạo cho booking `COMPLETED`.

## Scripts

```bash
npm test        # kiểm tra quy tắc khóa slot
npm run build   # tạo bản chạy độc lập trong dist/
npm run preview # chạy bản trong dist/
```

## Phạm vi hiện tại

Đây là functional prototype web-first, có persistence bằng JSON và payment validation giả lập. Trước khi public production cần thay bằng PostgreSQL/Prisma, Auth.js hoặc Supabase Auth, object storage, payment gateway thật, rate limiting, audit log bền vững và email/Zalo provider.

## Ảnh

Các ảnh hero và portfolio mẫu trong `public/assets/` được tạo riêng cho prototype bằng công cụ tạo ảnh tích hợp, không phụ thuộc hotlink bên ngoài.
