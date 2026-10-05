# Kiểm tra cục bộ — 05/10/2026

- `npm test`: 26/26 kiểm thử đạt (3 domain, 23 PostgreSQL/RLS).
- `npm run build`: TypeScript strict và production bundle đạt.
- SQL thực tế chạy trong PGlite; thử quyền anonymous/customer/provider/admin, idempotency, overlap exclusion, snapshot, state transition, hoàn tiền lặp, review, scheduler function, analytics, auth metadata và private Storage policies.
- Đã phát hiện và sửa policy Storage tự tham chiếu gây recursion; kiểm tra ảnh chưa duyệt không đọc được bằng customer khác/anonymous, sau duyệt mới đọc được.
- Browser bản production: trang chủ, tìm kiếm giữ category/khu vực trong URL, empty state thật, deep-link reload, route lịch hẹn chuyển sang login giữ `next`, Google button vô hiệu khi chưa cấu hình, mobile menu, responsive không tràn ngang ở 390px. Kiểm tra desktop và mobile bằng Computer Use.
- Ảnh hero đã chuyển WebP ~55 KB; font có dấu tiếng Việt tự lưu trữ, không gọi Google Fonts khi tải trang. Ảnh minh họa không đại diện cho creator thật.

## Chưa thể nghiệm thu

Không có URL/key project Supabase hoặc cấu hình OAuth của chủ website. Vì vậy chưa chạy login thật, PostgREST/Storage qua HTTP, kiểm tra nhiều kết nối đồng thời, Cron hosted, chuyển khoản thật, backup/restore hoặc deployment Cloudflare. Các phần cần tài khoản/dữ liệu vận hành được liệt kê trong README. Không được đánh dấu MVP sẵn sàng cho khách thật chỉ dựa vào kiểm thử cục bộ.
