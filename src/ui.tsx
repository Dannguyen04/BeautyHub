import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Camera,
  Check,
  ChevronRight,
  ShieldCheck,
  Star,
} from "lucide-react";
import { labels, money, minPrice, type Provider } from "./domain";
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Camera size={32} />
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  );
}
export function Alert({ children }: { children: ReactNode }) {
  return (
    <div className="alert" role="alert">
      {children}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <span />
      Đang tải…
    </div>
  );
}
export function Badge({ status }: { status: string }) {
  return (
    <span className={`badge status-${status.toLowerCase()}`}>
      {labels[status] || status}
    </span>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function ProviderCard({ p }: { p: Provider }) {
  const reviews = p.reviews.filter((r) => !r.hidden);
  const rating = reviews.length
    ? (
        reviews.reduce((a, r) => a + Number(r.rating), 0) / reviews.length
      ).toFixed(1)
    : null;
  return (
    <Link className="creator-card" to={`/creators/${p.slug}`}>
      <div className="creator-image">
        {p.portfolio_assets.find((a) => a.approved && a.url) ? (
          <img
            loading="lazy"
            src={p.portfolio_assets.find((a) => a.approved && a.url)!.url}
            alt={`Tác phẩm của ${p.name}`}
          />
        ) : (
          <div className="image-empty">
            <Camera />
          </div>
        )}
        <span className="verified">
          <ShieldCheck size={13} />
          BeautyHub xác minh
        </span>
        <span className="card-arrow">
          <ArrowUpRight size={18} />
        </span>
      </div>
      <div className="creator-meta">
        <h3>{p.name}</h3>
        <span>
          {rating ? (
            <>
              <Star size={12} />
              {rating} ({reviews.length})
            </>
          ) : (
            "Chưa có đánh giá"
          )}
        </span>
      </div>
      <p>
        {p.category} · {p.districts.slice(0, 2).join(", ")}
      </p>
      <small>{p.completed_count || 0} booking đã hoàn thành</small>
      <div className="tags">
        {p.styles.map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>
      <div className="price-line">
        Từ{" "}
        <strong>
          {Number.isFinite(minPrice(p)) ? money(minPrice(p)) : "Đang cập nhật"}
        </strong>
      </div>
    </Link>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const el = document.getElementById("active-dialog");
    el?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const focusable = el?.querySelectorAll<HTMLElement>(
          "button,input,select,textarea,a[href]",
        );
        if (!focusable?.length) return;
        const first = focusable[0],
          last = focusable[focusable.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === el)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="modal"
        id="active-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        tabIndex={-1}
      >
        <button className="close" onClick={onClose} aria-label="Đóng">
          ×
        </button>
        <h2 id="dialog-title">{title}</h2>
        {children}
      </section>
    </div>
  );
}
export function Steps() {
  return (
    <div className="trust-steps">
      {[
        [
          "01",
          "Chọn người hợp gu",
          "Xem tác phẩm thật, giá rõ ràng và lịch còn trống.",
        ],
        [
          "02",
          "Thống nhất, rồi đặt cọc",
          "Creator nhận lịch trước khi bạn chuyển tiền.",
        ],
        [
          "03",
          "An tâm đến buổi hẹn",
          "Theo dõi từng bước và luôn có nơi liên hệ hỗ trợ.",
        ],
      ].map(([n, t, d]) => (
        <article key={n}>
          <span>{n}</span>
          <h3>{t}</h3>
          <p>{d}</p>
        </article>
      ))}
    </div>
  );
}
export function CheckLine({ children }: { children: ReactNode }) {
  return (
    <p className="check-line">
      <Check size={16} />
      {children}
    </p>
  );
}
export function Breadcrumb({ label }: { label: string }) {
  return (
    <div className="breadcrumb">
      <Link to="/">Trang chủ</Link>
      <ChevronRight size={12} />
      {label}
    </div>
  );
}
export function useClock() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  return now;
}
