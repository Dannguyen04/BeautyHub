import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Copy,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { client, rpc, track } from "./api";
import { useApp } from "./context";
import {
  dateTime,
  effectiveStatus,
  errorText,
  labels,
  money,
  paymentReference,
  type Booking,
  type BookingEvent,
  type Review,
  type Support,
} from "./domain";
import {
  Alert,
  Badge,
  Breadcrumb,
  Empty,
  Field,
  Loading,
  Modal,
  useClock,
} from "./ui";
type Draft = {
  name: string;
  phone: string;
  district: string;
  address: string;
  notes: string;
  agree: boolean;
};
export function Checkout() {
  const { packageId } = useParams();
  const [params] = useSearchParams();
  const start = params.get("start") || "";
  const { providers, profile, user, settings, loading } = useApp();
  const navigate = useNavigate();
  const provider = providers.find((p) =>
    p.packages.some((k) => k.id === packageId),
  );
  const pkg = provider?.packages.find((k) => k.id === packageId && k.active);
  const storageKey = `bh-draft:${user!.id}:${packageId}:${start}`;
  const [draft, setDraft] = useState<Draft>(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      name: profile?.display_name || "",
      phone: profile?.phone || "",
      district: provider?.districts[0] || "",
      address: "",
      notes: "",
      agree: false,
    };
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(draft));
    } catch {
      /* Private browsing may disable persistence. */
    }
  }, [draft, storageKey]);
  if (loading) return <Loading />;
  if (!provider || !pkg || !start || !Number.isFinite(Date.parse(start)))
    return (
      <div className="page">
        <Empty title="Hãy chọn gói và khung giờ trước">
          <Link to="/explore">Khám phá creator</Link>
        </Empty>
      </div>
    );
  function field(k: keyof Draft, v: string | boolean) {
    setDraft({ ...draft, [k]: v });
  }
  return (
    <div className="page checkout-page">
      <Link className="back-link" to={`/creators/${provider.slug}`}>
        <ArrowLeft size={15} />
        Quay lại hồ sơ
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">BƯỚC ĐẦU CHO BUỔI HẸN</span>
          <h1>Gửi yêu cầu đặt lịch.</h1>
          <p className="muted">
            Chưa cần thanh toán. Creator sẽ phản hồi trong tối đa 12 giờ.
          </p>
        </div>
      </div>
      <form
        className="checkout-layout"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!draft.agree) return;
          setBusy(true);
          setError("");
          try {
            let key = sessionStorage.getItem(storageKey + ":request");
            if (!key) {
              key = crypto.randomUUID();
              sessionStorage.setItem(storageKey + ":request", key);
            }
            const id = await rpc<string>("create_booking", {
              p_package: pkg.id,
              p_start: start,
              p_name: draft.name,
              p_phone: draft.phone,
              p_district: draft.district,
              p_address: draft.address,
              p_notes: draft.notes,
              p_key: key,
            });
            sessionStorage.removeItem(storageKey);
            void track("booking_submitted");
            navigate(`/bookings/${id}?created=1`, { replace: true });
          } catch (e) {
            setError(errorText(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="panel">
          <h2>Thông tin buổi hẹn</h2>
          {error && <Alert>{error}</Alert>}
          <div className="form-grid two">
            <Field label="Họ và tên">
              <input
                value={draft.name}
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
                onChange={(e) => field("name", e.target.value)}
              />
            </Field>
            <Field label="Số điện thoại">
              <input
                type="tel"
                value={draft.phone}
                pattern="\+?[0-9]{9,15}"
                required
                autoComplete="tel"
                onChange={(e) => field("phone", e.target.value)}
              />
            </Field>
            <Field label="Khu vực">
              <select
                value={draft.district}
                required
                onChange={(e) => field("district", e.target.value)}
              >
                <option value="">Chọn khu vực</option>
                {provider.districts.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </Field>
            <Field label="Địa chỉ / địa điểm gặp cụ thể">
              <input
                value={draft.address}
                minLength={10}
                maxLength={500}
                autoComplete="street-address"
                required
                placeholder="Số nhà, đường, phường hoặc tên studio"
                onChange={(e) => field("address", e.target.value)}
              />
            </Field>
          </div>
          <Field
            label="Mong muốn của bạn"
            hint="Concept, trang phục, nhu cầu đặc biệt hoặc câu hỏi dành cho creator."
          >
            <textarea
              value={draft.notes}
              maxLength={2000}
              rows={4}
              onChange={(e) => field("notes", e.target.value)}
            />
          </Field>
          <section className="policy-box">
            <h3>Chính sách áp dụng cho booking này</h3>
            <p className="preserve">
              {settings?.cancellation_policy ||
                "Chính sách đang được hoàn thiện."}
            </p>
            <Link to="/policies" target="_blank">
              Đọc chính sách đầy đủ
            </Link>
          </section>
          <label className="checkbox">
            <input
              type="checkbox"
              required
              checked={draft.agree}
              onChange={(e) => field("agree", e.target.checked)}
            />
            <span>
              Tôi đã kiểm tra gói dịch vụ, địa điểm và đồng ý với chính sách đặt
              lịch.
            </span>
          </label>
        </div>
        <aside className="panel checkout-summary">
          <span className="eyebrow">BUỔI HẸN CỦA BẠN</span>
          <h2>{pkg.name}</h2>
          <p>{provider.name}</p>
          <div className="summary-detail">
            <span>
              <CalendarDays size={16} />
              {dateTime(start)}
            </span>
            <span>
              <Clock size={16} />
              {pkg.duration} phút
            </span>
            <span>
              <MapPin size={16} />
              {draft.district || "Chọn khu vực"}
            </span>
          </div>
          <p>
            <strong>Bao gồm:</strong> {pkg.includes || pkg.description}
          </p>
          <p>
            <strong>Chưa bao gồm:</strong>{" "}
            {pkg.exclusions || "Không có phụ phí được công bố"}
          </p>
          <div className="money-line">
            <span>Tổng giá gói</span>
            <strong>{money(pkg.price)}</strong>
          </div>
          <div className="money-line">
            <span>Cọc sau khi được nhận lịch</span>
            <strong>{money(Math.ceil(pkg.price * 0.3))}</strong>
          </div>
          <div className="money-line total">
            <span>Thanh toán lúc gửi yêu cầu</span>
            <strong>0 ₫</strong>
          </div>
          <button
            className="btn full"
            disabled={busy || !settings?.ready || !draft.agree}
          >
            {busy ? "Đang kiểm tra và giữ lịch…" : "Gửi yêu cầu"}
            <ArrowRight size={16} />
          </button>
          <small>
            Khung giờ được kiểm tra lại khi gửi. Nếu mạng gián đoạn, bạn có thể
            gửi lại an toàn.
          </small>
          {!settings?.ready && <Alert>Chưa mở nhận booking.</Alert>}
        </aside>
      </form>
    </div>
  );
}
export function Bookings() {
  const { user } = useApp();
  const [items, setItems] = useState<Booking[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [tab, setTab] = useState("active");
  const now = useClock();
  async function load() {
    try {
      const { data, error: e } = await client()
        .from("bookings")
        .select("*")
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false });
      if (e) throw e;
      setItems(data || []);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [user?.id]);
  const filtered = items.filter((b) => {
    const s = effectiveStatus(b, now);
    return tab === "past"
      ? s === "COMPLETED"
      : tab === "closed"
        ? ["CANCELLED", "REJECTED", "EXPIRED"].includes(s)
        : !["COMPLETED", "CANCELLED", "REJECTED", "EXPIRED"].includes(s);
  });
  return (
    <div className="page">
      <span className="eyebrow">MỌI BUỔI HẸN, MỘT NƠI</span>
      <div className="page-heading">
        <h1>Lịch hẹn của bạn.</h1>
        <Link className="btn ghost" to="/explore">
          Tìm creator <ArrowRight size={16} />
        </Link>
      </div>
      <div className="tabs">
        {[
          ["active", "Đang diễn ra"],
          ["past", "Đã hoàn thành"],
          ["closed", "Đã kết thúc / hủy"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {error && <Alert>{error}</Alert>}
      {loading ? (
        <Loading />
      ) : filtered.length ? (
        <div className="booking-list">
          {filtered.map((b) => (
            <BookingCard b={b} key={b.id} />
          ))}
        </div>
      ) : (
        <Empty title="Chưa có booking trong mục này">
          <p>Khi bạn gửi yêu cầu, mọi cập nhật sẽ được lưu ở đây.</p>
          <Link className="btn" to="/explore">
            Khám phá creator
          </Link>
        </Empty>
      )}
    </div>
  );
}
export function BookingCard({ b }: { b: Booking }) {
  return (
    <Link to={`/bookings/${b.id}`} className="booking-card">
      <div className="booking-calendar">
        <CalendarDays size={22} />
        <span>
          {new Date(b.starts_at).toLocaleDateString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
            day: "2-digit",
            month: "2-digit",
          })}
        </span>
      </div>
      <div>
        <small>{b.snapshot.provider_name}</small>
        <h3>{b.snapshot.package.name}</h3>
        <p>
          {dateTime(b.starts_at)} · {b.district}
        </p>
      </div>
      <div>
        <Badge status={effectiveStatus(b)} />
        <p>{money(b.price)}</p>
      </div>
      <ArrowRight size={18} />
    </Link>
  );
}
export function BookingDetail() {
  const { id } = useParams();
  const { user, profile, providers, settings, toast } = useApp();
  const [b, setB] = useState<Booking | null>(null),
    [events, setEvents] = useState<BookingEvent[]>([]),
    [tickets, setTickets] = useState<Support[]>([]),
    [review, setReview] = useState<Review | null>(null),
    [contact, setContact] = useState(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [modal, setModal] = useState(""),
    [busy, setBusy] = useState(false);
  const now = useClock();
  async function load() {
    try {
      const result = await client()
        .from("bookings")
        .select("*")
        .eq("id", id)
        .single();
      if (result.error) throw result.error;
      setB(result.data);
      const [ev, ts, rv, ct] = await Promise.all([
        client()
          .from("booking_events")
          .select("*")
          .eq("booking_id", id)
          .order("created_at"),
        client()
          .from("support_requests")
          .select("*")
          .eq("booking_id", id)
          .order("created_at", { ascending: false }),
        client().from("reviews").select("*").eq("booking_id", id).maybeSingle(),
        rpc<string>("booking_contact", { p_id: id }),
      ]);
      if (ev.error) throw ev.error;
      setEvents(ev.data || []);
      setTickets(ts.data || []);
      setReview(rv.data);
      setContact(ct || "");
      setError("");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 30000);
    return () => clearInterval(interval);
  }, [id]);
  async function action(name: string, detail = "") {
    setBusy(true);
    try {
      await rpc("booking_action", {
        p_id: id,
        p_action: name,
        p_detail: detail,
      });
      setModal("");
      await load();
      toast("Đã cập nhật booking.");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading />;
  if (!b)
    return (
      <div className="page">
        <Empty title="Không tìm thấy booking của bạn">
          <p>Kiểm tra tài khoản hoặc đường dẫn.</p>
          <Link to="/bookings">Về lịch hẹn</Link>
        </Empty>
      </div>
    );
  const status = effectiveStatus(b, now);
  const customer = b.customer_id === user?.id;
  const owner = providers.some(
    (p) => p.id === b.provider_id && p.owner_id === user?.id,
  );
  const admin = profile?.role === "ADMIN";
  const title: Record<string, string> = {
    REQUESTED: "Yêu cầu của bạn đã được gửi.",
    AWAITING_DEPOSIT: "Creator đã nhận lịch. Đến bước đặt cọc.",
    PAYMENT_REVIEW: "BeautyHub đang kiểm tra tiền cọc.",
    CONFIRMED: "Buổi hẹn đã được xác nhận.",
    COMPLETED: "Cảm ơn bạn đã chọn BeautyHub.",
    CANCELLED: "Booking đã được hủy.",
    REJECTED: "Creator chưa thể nhận lịch này.",
    EXPIRED: "Thời hạn giữ lịch đã kết thúc.",
  };
  return (
    <div className="page">
      <Link
        className="back-link"
        to={admin ? "/admin" : owner ? "/studio" : "/bookings"}
      >
        <ArrowLeft size={15} />
        Quay lại danh sách
      </Link>
      <div className="booking-title">
        <Badge status={status} />
        <h1>{title[status]}</h1>
        <p>
          Mã booking: <code>{paymentReference(b.id)}</code>
        </p>
      </div>
      {error && <Alert>{error}</Alert>}
      <div className="detail-layout">
        <div>
          <section className="panel next-action">
            <span className="eyebrow">BƯỚC TIẾP THEO</span>
            {status === "REQUESTED" && (
              <>
                <h2>
                  {owner ? "Bạn có thể nhận lịch này?" : "Chờ creator phản hồi"}
                </h2>
                <p>
                  Hạn phản hồi:{" "}
                  <strong>{b.hold_until && dateTime(b.hold_until)}</strong>.
                  Chưa cần chuyển tiền.
                </p>
                {owner && (
                  <div className="actions">
                    <button
                      className="btn"
                      disabled={busy}
                      onClick={() => action("ACCEPT")}
                    >
                      Chấp nhận lịch
                    </button>
                    <button
                      className="btn ghost"
                      onClick={() => setModal("REJECT")}
                    >
                      Từ chối có lý do
                    </button>
                  </div>
                )}
                {customer && (
                  <button
                    className="text-button danger"
                    onClick={() => setModal("CANCEL")}
                  >
                    Hủy yêu cầu
                  </button>
                )}
              </>
            )}
            {status === "AWAITING_DEPOSIT" && (
              <>
                <h2>Chuyển khoản cọc {money(b.deposit)}</h2>
                <p>
                  Vui lòng chuyển trước{" "}
                  <strong>{b.hold_until && dateTime(b.hold_until)}</strong>.
                  Không chuyển sau thời hạn này.
                </p>
                <dl className="bank-info">
                  <dt>Ngân hàng</dt>
                  <dd>{b.snapshot.bank_name}</dd>
                  <dt>Số tài khoản</dt>
                  <dd>{b.snapshot.bank_account}</dd>
                  <dt>Chủ tài khoản</dt>
                  <dd>{b.snapshot.bank_holder}</dd>
                  <dt>Nội dung chuyển khoản</dt>
                  <dd className="reference">{paymentReference(b.id)}</dd>
                </dl>
                {customer && (
                  <div className="actions">
                    <button
                      className="btn"
                      onClick={() => setModal("REPORT_PAYMENT")}
                    >
                      Tôi đã chuyển tiền
                    </button>
                    <button
                      className="btn ghost"
                      onClick={() => setModal("CANCEL")}
                    >
                      Hủy trước khi chuyển
                    </button>
                  </div>
                )}
              </>
            )}
            {status === "PAYMENT_REVIEW" && (
              <>
                <h2>Đã nhận thông báo chuyển tiền</h2>
                <p>
                  Lịch đang được giữ trong thời gian đối soát. Bạn không cần
                  chuyển thêm. Kiểm tra cập nhật tại đây hoặc liên hệ hỗ trợ nếu
                  cần.
                </p>
                <p>Mã tham chiếu khách cung cấp: {b.transfer_reference}</p>
                {admin && (
                  <div className="actions">
                    <button
                      className="btn"
                      onClick={() => setModal("VERIFY_PAYMENT")}
                    >
                      Xác nhận tiền thực nhận
                    </button>
                    <button
                      className="btn ghost"
                      onClick={() => setModal("PAYMENT_NOT_FOUND")}
                    >
                      Chưa tìm thấy tiền
                    </button>
                  </div>
                )}
              </>
            )}
            {status === "CONFIRMED" && (
              <>
                <h2>Hẹn gặp lúc {dateTime(b.starts_at)}</h2>
                <p>
                  <MapPin size={15} />
                  {b.address}, {b.district}
                </p>
                {contact && (
                  <a className="btn ghost" href={`tel:${contact}`}>
                    <Phone size={16} />
                    Gọi creator: {contact}
                  </a>
                )}
                {owner && (
                  <button
                    className="btn"
                    disabled={busy || Date.parse(b.ends_at) > now}
                    onClick={() => setModal("COMPLETE")}
                  >
                    Xác nhận đã hoàn thành dịch vụ
                  </button>
                )}
                {owner && Date.parse(b.ends_at) > now && (
                  <small>Có thể hoàn thành sau giờ kết thúc buổi hẹn.</small>
                )}
              </>
            )}
            {status === "COMPLETED" && (
              <>
                <h2>
                  {review
                    ? "Cảm ơn đánh giá của bạn."
                    : "Chia sẻ trải nghiệm của bạn"}
                </h2>
                {customer && !review && (
                  <button className="btn" onClick={() => setModal("REVIEW")}>
                    Viết đánh giá
                  </button>
                )}
                {review && (
                  <p>
                    ★ {Number(review.rating).toFixed(1)} · {review.text}
                  </p>
                )}
              </>
            )}
            {["CANCELLED", "REJECTED", "EXPIRED"].includes(status) && (
              <>
                <h2>Chọn một thời gian hoặc creator khác</h2>
                <p>
                  Nếu bạn đã chuyển tiền, hãy gửi yêu cầu hỗ trợ để được đối
                  soát. Không chuyển thêm tiền cho booking này.
                </p>
                <Link className="btn ghost" to="/explore">
                  Tìm lịch khác <ArrowRight size={16} />
                </Link>
              </>
            )}
            {b.payment_status === "REFUND_PENDING" && (
              <Alert>
                Đang chờ hoàn {money(b.refund_amount || 0)}.{" "}
                {admin && (
                  <button className="btn" onClick={() => setModal("REFUND")}>
                    Ghi nhận giao dịch hoàn
                  </button>
                )}
              </Alert>
            )}
            {b.payment_status === "REFUNDED" && (
              <p className="success">
                Đã hoàn tiền: {money(b.refund_amount || 0)}
              </p>
            )}
          </section>
          <section className="panel">
            <h2>Thông tin đã thống nhất</h2>
            <div className="detail-grid">
              <div>
                <small>Creator</small>
                <strong>{b.snapshot.provider_name}</strong>
              </div>
              <div>
                <small>Gói dịch vụ</small>
                <strong>{b.snapshot.package.name}</strong>
              </div>
              <div>
                <small>Khách hàng</small>
                <strong>{b.customer_name}</strong>
              </div>
              <div>
                <small>Liên hệ</small>
                <a href={`tel:${b.phone}`}>{b.phone}</a>
              </div>
              <div>
                <small>Ngày giờ</small>
                <strong>
                  {dateTime(b.starts_at)} · {b.snapshot.package.duration} phút
                </strong>
              </div>
              <div>
                <small>Địa điểm</small>
                <strong>
                  {b.address}, {b.district}
                </strong>
              </div>
            </div>
            <p>{b.snapshot.package.description}</p>
            <p>
              <strong>Bao gồm:</strong> {b.snapshot.package.includes}
            </p>
            <p>
              <strong>Chưa bao gồm:</strong>{" "}
              {b.snapshot.package.exclusions || "Không có phụ phí được công bố"}
            </p>
            <p>
              <strong>Thời hạn giao:</strong> {b.snapshot.package.delivery_days}{" "}
              ngày sau buổi hẹn.
            </p>
            {b.notes && (
              <p>
                <strong>Ghi chú:</strong> {b.notes}
              </p>
            )}
            <details>
              <summary>
                Chính sách đã đồng ý · phiên bản {b.snapshot.policy_version}
              </summary>
              <p className="preserve">{b.snapshot.policy}</p>
            </details>
          </section>
          <section className="panel">
            <h2>Lịch sử cập nhật</h2>
            <ol className="timeline">
              {events.map((ev) => (
                <li key={ev.id}>
                  <strong>{labels[ev.action] || ev.action}</strong>
                  <p>{ev.detail}</p>
                  <small>{dateTime(ev.created_at)}</small>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <aside>
          <section className="panel">
            <span className="eyebrow">THANH TOÁN</span>
            <h2>{money(b.price)}</h2>
            <div className="money-line">
              <span>Tiền cọc 30%</span>
              <strong>{money(b.deposit)}</strong>
            </div>
            <div className="money-line">
              <span>Phần còn lại của gói</span>
              <strong>{money(b.price - b.deposit)}</strong>
            </div>
            <Badge status={b.payment_status} />
            <p className="muted">
              Phần còn lại thanh toán theo thỏa thuận với creator. BeautyHub
              đang theo dõi tiền cọc.
            </p>
          </section>
          <section className="panel">
            <h2>Cần hỗ trợ?</h2>
            <p>
              Đổi lịch, hủy, tiền cọc hoặc vấn đề trong buổi hẹn — gửi yêu cầu
              để được theo dõi xử lý.
            </p>
            <button
              className="btn ghost full"
              onClick={() => setModal("SUPPORT")}
            >
              Gửi yêu cầu hỗ trợ
            </button>
            {settings?.support_url?.startsWith("https://") && (
              <a
                className="text-button"
                href={settings.support_url}
                target="_blank"
                rel="noreferrer"
              >
                Liên hệ trực tiếp <ArrowRight size={14} />
              </a>
            )}
            {tickets.map((t) => (
              <div className="ticket" key={t.id}>
                <strong>
                  {t.status === "OPEN" ? "Đang chờ xử lý" : "Đã xử lý"}
                </strong>
                <p>{t.message}</p>
                {t.resolution && <p className="success">{t.resolution}</p>}
              </div>
            ))}
          </section>
        </aside>
      </div>
      {modal && (
        <Modal
          title={
            modal === "SUPPORT"
              ? "BeautyHub có thể giúp gì?"
              : modal === "REVIEW"
                ? "Buổi hẹn của bạn thế nào?"
                : modal === "CANCEL"
                  ? "Hủy yêu cầu chưa thanh toán?"
                  : modal === "COMPLETE"
                    ? "Dịch vụ đã hoàn thành?"
                    : "Xác nhận thông tin"
          }
          onClose={() => {
            if (!busy) setModal("");
          }}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (["CANCEL", "COMPLETE"].includes(modal)) {
                await action(modal);
                return;
              }
              if (
                [
                  "REJECT",
                  "REPORT_PAYMENT",
                  "VERIFY_PAYMENT",
                  "PAYMENT_NOT_FOUND",
                ].includes(modal)
              ) {
                await action(modal, String(f.get("detail")));
                return;
              }
              setBusy(true);
              try {
                if (modal === "SUPPORT")
                  await rpc("request_support", {
                    p_booking: id,
                    p_kind: f.get("kind"),
                    p_message: f.get("detail"),
                  });
                if (modal === "REVIEW")
                  await rpc("submit_review", {
                    p_booking: id,
                    p_quality: Number(f.get("quality")),
                    p_communication: Number(f.get("communication")),
                    p_punctuality: Number(f.get("punctuality")),
                    p_accuracy: Number(f.get("accuracy")),
                    p_text: f.get("detail"),
                  });
                if (modal === "REFUND")
                  await rpc("confirm_refund", {
                    p_id: id,
                    p_reference: f.get("detail"),
                  });
                setModal("");
                await load();
                toast("Đã gửi thành công.");
              } catch (e) {
                setError(errorText(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {error && <Alert>{error}</Alert>}
            {modal === "SUPPORT" && (
              <Field label="Bạn cần hỗ trợ về">
                <select name="kind">
                  <option value="HELP">Thông tin booking</option>
                  <option value="RESCHEDULE">Đổi lịch</option>
                  <option value="CANCEL">Hủy / hoàn tiền</option>
                  <option value="DISPUTE">Vấn đề với dịch vụ</option>
                </select>
              </Field>
            )}
            {modal === "REVIEW" && (
              <div className="form-grid two">
                {[
                  ["quality", "Chất lượng"],
                  ["communication", "Giao tiếp"],
                  ["punctuality", "Đúng giờ"],
                  ["accuracy", "Đúng portfolio"],
                ].map(([k, t]) => (
                  <Field label={t} key={k}>
                    <select name={k} defaultValue="5">
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} / 5
                        </option>
                      ))}
                    </select>
                  </Field>
                ))}
              </div>
            )}
            {!["CANCEL", "COMPLETE"].includes(modal) && (
              <Field
                label={
                  ["REPORT_PAYMENT", "VERIFY_PAYMENT", "REFUND"].includes(modal)
                    ? "Mã giao dịch / thời điểm / thông tin đối soát"
                    : "Nội dung cụ thể"
                }
              >
                <textarea
                  name="detail"
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={4}
                />
              </Field>
            )}
            {modal === "REPORT_PAYMENT" && (
              <p>
                Chỉ báo sau khi đã chuyển đúng {money(b.deposit)}. BeautyHub sẽ
                kiểm tra tiền thực nhận trước khi xác nhận lịch.
              </p>
            )}
            {modal === "CANCEL" && (
              <p>
                Chỉ hủy trực tiếp nếu bạn chưa chuyển tiền. Nếu đã chuyển, đóng
                cửa sổ này và chọn hỗ trợ để đối soát.
              </p>
            )}
            {modal === "COMPLETE" && (
              <p>
                Xác nhận buổi dịch vụ thực tế đã diễn ra. Khách sẽ được mời đánh
                giá.
              </p>
            )}
            <button className="btn full" disabled={busy}>
              {busy ? "Đang gửi…" : "Xác nhận"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
