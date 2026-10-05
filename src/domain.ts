export const DISTRICTS = [
  "Quận 1",
  "Quận 3",
  "Quận 4",
  "Quận 5",
  "Quận 7",
  "Quận 10",
  "Bình Thạnh",
  "Thủ Đức",
  "Phú Nhuận",
  "Tân Bình",
  "Gò Vấp",
];
export const STYLES = [
  "Korean",
  "Natural",
  "Minimal",
  "Cinematic",
  "Vintage",
  "Editorial",
  "Film",
  "Street",
  "Luxury",
  "Y2K",
];
export const SERVICES = [
  "Personal",
  "Profile/CV",
  "Graduation",
  "Couple",
  "Photoshoot makeup",
  "Party/Event",
];
export type Status =
  | "REQUESTED"
  | "AWAITING_DEPOSIT"
  | "PAYMENT_REVIEW"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED"
  | "EXPIRED";
export const labels: Record<string, string> = {
  UPCOMING: "Buổi hẹn trong 24 giờ tới",
  REJECT: "Creator đã từ chối có lý do",
  REQUESTED: "Chờ creator phản hồi",
  AWAITING_DEPOSIT: "Chờ đặt cọc",
  PAYMENT_REVIEW: "Đang đối soát tiền",
  CONFIRMED: "Đã xác nhận",
  COMPLETED: "Đã hoàn thành",
  CANCELLED: "Đã hủy",
  REJECTED: "Creator từ chối",
  EXPIRED: "Hết hạn giữ lịch",
  UNPAID: "Chưa nhận cọc",
  REPORTED: "Khách đã báo chuyển tiền",
  PAID: "Đã nhận cọc",
  REFUND_PENDING: "Chờ hoàn tiền",
  REFUNDED: "Đã hoàn tiền",
  DRAFT: "Bản nháp",
  PENDING: "Chờ duyệt",
  APPROVED: "Đã xác minh",
  SUSPENDED: "Tạm ngừng",
  ACCEPT: "Creator đã nhận lịch",
  REPORT_PAYMENT: "Đã báo chuyển tiền",
  VERIFY_PAYMENT: "Đã đối soát tiền cọc",
  PAYMENT_NOT_FOUND: "Chưa tìm thấy giao dịch",
  CANCEL: "Đã hủy yêu cầu",
  COMPLETE: "Dịch vụ đã hoàn thành",
  REVIEWED: "Đã gửi đánh giá",
  SUPPORT_REQUEST: "Có yêu cầu hỗ trợ",
  SUPPORT_RESOLVED: "Đã xử lý yêu cầu",
};
export type Profile = {
  id: string;
  display_name: string;
  phone: string;
  role: "CUSTOMER" | "PROVIDER" | "ADMIN";
};
export type Package = {
  id: string;
  provider_id: string;
  name: string;
  service: string;
  description: string;
  duration: number;
  price: number;
  delivery_days: number;
  includes: string;
  exclusions: string;
  active: boolean;
};
export type Asset = {
  id: string;
  provider_id: string;
  path: string;
  caption: string;
  approved: boolean;
  url?: string;
};
export type Review = {
  id: string;
  booking_id: string;
  provider_id: string;
  author_name: string;
  rating: number;
  text: string;
  hidden: boolean;
  created_at: string;
};
export type Provider = {
  completed_count?: number;
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  category: string;
  bio: string;
  districts: string[];
  styles: string[];
  status: string;
  packages: Package[];
  portfolio_assets: Asset[];
  reviews: Review[];
};
export type Settings = {
  ready: boolean;
  bank_name: string;
  bank_account: string;
  bank_holder: string;
  support_url: string;
  cancellation_policy: string;
  policy_version: number;
};
export type Booking = {
  id: string;
  customer_id: string;
  provider_id: string;
  package_id: string;
  customer_name: string;
  phone: string;
  district: string;
  address: string;
  notes: string;
  price: number;
  deposit: number;
  status: Status;
  payment_status: string;
  hold_until: string | null;
  starts_at: string;
  ends_at: string;
  created_at: string;
  updated_at: string;
  transfer_reference: string | null;
  refund_amount: number | null;
  snapshot: {
    provider_name: string;
    package: Package;
    policy: string;
    policy_version: number;
    bank_name: string;
    bank_account: string;
    bank_holder: string;
  };
};
export type BookingEvent = {
  id: string;
  action: string;
  detail: string;
  created_at: string;
};
export type Support = {
  id: string;
  booking_id: string;
  kind: string;
  message: string;
  status: string;
  resolution: string | null;
  created_at: string;
};
export type Notice = {
  id: string;
  text: string;
  booking_id: string | null;
  read_at: string | null;
  created_at: string;
};
export const money = (n: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
export const dateTime = (v: string) =>
  new Date(v).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
export const timeOnly = (v: string) =>
  new Date(v).toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  });
export function localDate(offset = 0) {
  const d = new Date(Date.now() + offset * 86400000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
export function safeNext(value: string | null) {
  return value?.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
    ? value
    : "/bookings";
}
export function effectiveStatus(b: Booking, now = Date.now()): Status {
  return ["REQUESTED", "AWAITING_DEPOSIT"].includes(b.status) &&
    b.hold_until &&
    Date.parse(b.hold_until) <= now
    ? "EXPIRED"
    : b.status;
}
export function paymentReference(id: string) {
  return `BH ${id.replaceAll("-", "").toUpperCase()}`;
}
export function minPrice(p: Provider) {
  return Math.min(...p.packages.filter((x) => x.active).map((x) => x.price));
}
export function filterProviders(
  providers: Provider[],
  filters: {
    category: string;
    district: string;
    style: string;
    service: string;
    budget: number;
    query: string;
  },
) {
  return providers.filter(
    (p) =>
      p.status === "APPROVED" &&
      (!filters.category || p.category === filters.category) &&
      (!filters.district || p.districts.includes(filters.district)) &&
      (!filters.style || p.styles.includes(filters.style)) &&
      (!filters.query ||
        p.name
          .toLocaleLowerCase("vi")
          .includes(filters.query.toLocaleLowerCase("vi"))) &&
      p.packages.some(
        (k) =>
          k.active &&
          (!filters.service || k.service === filters.service) &&
          k.price <= filters.budget,
      ),
  );
}
export function errorText(e: unknown) {
  const msg =
    typeof e === "object" && e && "message" in e
      ? String(e.message)
      : String(e);
  if (/fetch|network/i.test(msg))
    return "Không kết nối được. Thông tin bạn nhập vẫn được giữ; hãy kiểm tra mạng và thử lại.";
  if (/23505|duplicate key/.test(msg))
    return "Thông tin này đã tồn tại. Vui lòng tải lại để kiểm tra.";
  return msg;
}
