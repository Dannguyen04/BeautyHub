import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Camera,
  Clock,
  ImagePlus,
  LayoutDashboard,
  Package as PackageIcon,
  Plus,
  Settings,
  Star,
  Upload,
} from "lucide-react";
import { client, compressImage, rpc } from "./api";
import { useApp } from "./context";
import {
  dateTime,
  DISTRICTS,
  effectiveStatus,
  errorText,
  localDate,
  money,
  SERVICES,
  STYLES,
  type Booking,
  type Package,
} from "./domain";
import { Alert, Badge, Empty, Field, Loading, Modal } from "./ui";
import { BookingCard } from "./Bookings";
export function Studio() {
  const { user, profile, providers, refresh, toast } = useApp();
  const own = providers.find((p) => p.owner_id === user!.id);
  const [tab, setTab] = useState(own ? "overview" : "profile"),
    [bookings, setBookings] = useState<Booking[]>([]),
    [hours, setHours] = useState<
      { id: string; starts_at: string; ends_at: string }[]
    >([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [edit, setEdit] = useState<Package | "new" | null>(null);
  async function load() {
    if (!own) return;
    const [a, b] = await Promise.all([
      client()
        .from("bookings")
        .select("*")
        .eq("provider_id", own.id)
        .order("starts_at"),
      client()
        .from("availability")
        .select("*")
        .eq("provider_id", own.id)
        .order("starts_at"),
    ]);
    if (a.error || b.error) {
      setError((a.error || b.error)!.message);
      return;
    }
    setBookings(a.data || []);
    setHours(b.data || []);
  }
  useEffect(() => {
    void load();
  }, [own?.id]);
  async function run(fn: () => Promise<unknown>, message = "Đã lưu thay đổi.") {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
      await load();
      toast(message);
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  const sections = [
    ["overview", "Tổng quan", LayoutDashboard],
    ["profile", "Hồ sơ creator", Settings],
    ["packages", "Gói dịch vụ", PackageIcon],
    ["portfolio", "Portfolio", Camera],
    ["calendar", "Lịch làm việc", CalendarDays],
    ["reviews", "Đánh giá", Star],
  ] as const;
  const incoming = bookings.filter((b) => effectiveStatus(b) === "REQUESTED");
  const upcoming = bookings.filter((b) =>
    ["CONFIRMED", "PAYMENT_REVIEW", "AWAITING_DEPOSIT"].includes(
      effectiveStatus(b),
    ),
  );
  return (
    <div className="workspace">
      <aside className="workspace-sidebar">
        <span className="eyebrow">CREATOR SPACE</span>
        <h2>{own?.name || "Góc sáng tạo của bạn"}</h2>
        {own && <Badge status={own.status} />}
        <nav>
          {sections.map(([k, t, Icon]) => (
            <button
              key={k}
              className={tab === k ? "active" : ""}
              onClick={() => setTab(k)}
            >
              <Icon size={17} />
              {t}
            </button>
          ))}
        </nav>
        <Link to="/account">Tài khoản & số điện thoại →</Link>
      </aside>
      <div className="workspace-main">
        <span className="eyebrow">BEAUTYHUB / CREATOR</span>
        <div className="page-heading">
          <div>
            <h1>{sections.find((s) => s[0] === tab)?.[1]}</h1>
            <p className="muted">
              {own
                ? "Chăm chút từng buổi hẹn, từ lời chào đầu tiên."
                : "Tạo hồ sơ để bắt đầu nhận booking tại TP.HCM."}
            </p>
          </div>
          {own && ["DRAFT", "REJECTED"].includes(own.status) && (
            <button
              className="btn"
              disabled={busy}
              onClick={() =>
                run(
                  () => rpc("submit_provider"),
                  "Đã gửi hồ sơ. BeautyHub sẽ kiểm tra trước khi mở nhận lịch.",
                )
              }
            >
              Gửi hồ sơ để duyệt
            </button>
          )}
        </div>
        {error && <Alert>{error}</Alert>}
        {!profile?.phone && (
          <Alert>
            Hãy thêm số điện thoại ở <Link to="/account">Tài khoản</Link> trước
            khi gửi hồ sơ duyệt.
          </Alert>
        )}
        {own && own.status !== "APPROVED" && (
          <div className="info-banner">
            Hồ sơ chưa được mở nhận lịch. Hoàn thiện thông tin, ít nhất 3 ảnh
            thật, gói dịch vụ và lịch trống rồi gửi duyệt.
          </div>
        )}
        {tab === "overview" && (
          <>
            <div className="metrics">
              {[
                ["Cần phản hồi", incoming.length],
                ["Booking đang xử lý", upcoming.length],
                [
                  "Đã hoàn thành",
                  bookings.filter((b) => b.status === "COMPLETED").length,
                ],
                [
                  "Cọc đã nhận",
                  money(
                    bookings
                      .filter((b) => b.payment_status === "PAID")
                      .reduce((s, b) => s + b.deposit, 0),
                  ),
                ],
              ].map(([t, n]) => (
                <div className="metric" key={t}>
                  <small>{t}</small>
                  <strong>{n}</strong>
                </div>
              ))}
            </div>
            <section className="panel">
              <h2>Yêu cầu cần phản hồi</h2>
              {incoming.length ? (
                incoming.map((b) => <BookingCard key={b.id} b={b} />)
              ) : (
                <Empty title="Chưa có yêu cầu mới">
                  Yêu cầu mới sẽ xuất hiện tại đây.
                </Empty>
              )}
            </section>
            <section className="panel">
              <h2>Lịch sắp tới & đang đối soát</h2>
              {upcoming.length ? (
                upcoming.map((b) => <BookingCard key={b.id} b={b} />)
              ) : (
                <p className="muted">Bạn chưa có booking sắp tới.</p>
              )}
            </section>
            <button
              className="btn ghost"
              disabled={busy}
              onClick={() => run(load, "Đã cập nhật lịch.")}
            >
              Làm mới dữ liệu
            </button>
          </>
        )}
        {tab === "profile" && (
          <form
            className="panel form-grid"
            key={own?.id || "new"}
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              await run(() =>
                rpc("save_provider", {
                  p_slug: f.get("slug"),
                  p_name: f.get("name"),
                  p_category: f.get("category"),
                  p_bio: f.get("bio"),
                  p_districts: f.getAll("districts"),
                  p_styles: f.getAll("styles"),
                }),
              );
            }}
          >
            <div className="form-grid two">
              <Field label="Tên hiển thị">
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  defaultValue={own?.name}
                />
              </Field>
              <Field
                label="Đường dẫn hồ sơ"
                hint="Chữ thường không dấu, số và dấu gạch ngang. Ví dụ: lan-anh-studio"
              >
                <input
                  name="slug"
                  required
                  pattern="[a-z0-9][a-z0-9-]{2,60}"
                  defaultValue={own?.slug}
                />
              </Field>
              <Field label="Dịch vụ chính">
                <select
                  name="category"
                  defaultValue={own?.category || "Photographer"}
                >
                  <option>Photographer</option>
                  <option>Makeup Artist</option>
                </select>
              </Field>
            </div>
            <Field label="Giới thiệu">
              <textarea
                name="bio"
                required
                minLength={40}
                maxLength={2000}
                rows={5}
                defaultValue={own?.bio}
                placeholder="Cách bạn làm việc, phong cách và điều khách hàng có thể mong đợi…"
              />
            </Field>
            <fieldset>
              <legend>Khu vực phục vụ</legend>
              <div className="checkbox-grid">
                {DISTRICTS.map((d) => (
                  <label className="checkbox" key={d}>
                    <input
                      type="checkbox"
                      name="districts"
                      value={d}
                      defaultChecked={own?.districts.includes(d)}
                    />
                    {d}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Phong cách · chọn 2–4</legend>
              <div className="checkbox-grid">
                {STYLES.map((s) => (
                  <label className="checkbox" key={s}>
                    <input
                      type="checkbox"
                      name="styles"
                      value={s}
                      defaultChecked={own?.styles.includes(s)}
                    />
                    {s}
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="muted">
              Thay đổi hồ sơ sẽ đưa hồ sơ về bản nháp để duyệt lại. Các booking
              hiện có vẫn được giữ nguyên.
            </p>
            <button className="btn" disabled={busy}>
              Lưu hồ sơ
            </button>
          </form>
        )}
        {tab === "packages" && (
          <>
            <button
              className="btn"
              disabled={!own}
              onClick={() => setEdit("new")}
            >
              <Plus size={16} />
              Thêm gói dịch vụ
            </button>
            <div className="studio-packages">
              {own?.packages.map((p) => (
                <article className="panel" key={p.id}>
                  <span className="eyebrow">
                    {p.service} · {p.active ? "Đang mở" : "Tạm ẩn"}
                  </span>
                  <h2>{p.name}</h2>
                  <p>{p.description}</p>
                  <div className="inline-meta">
                    <strong>{money(p.price)}</strong>
                    <span>{p.duration} phút</span>
                    <span>Giao trong {p.delivery_days} ngày</span>
                  </div>
                  <button className="btn ghost" onClick={() => setEdit(p)}>
                    Chỉnh sửa
                  </button>
                </article>
              ))}
            </div>
            {!own && (
              <Empty title="Tạo hồ sơ trước khi thêm gói">
                <button
                  className="text-button"
                  onClick={() => setTab("profile")}
                >
                  Tạo hồ sơ
                </button>
              </Empty>
            )}
          </>
        )}
        {tab === "portfolio" && (
          <>
            <form
              className="panel form-grid"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const file = f.get("image") as File;
                await run(async () => {
                  if (!own) throw new Error("Tạo hồ sơ trước khi tải ảnh.");
                  const blob = await compressImage(file);
                  const path = `${user!.id}/${crypto.randomUUID()}.webp`;
                  const { error: e } = await client()
                    .storage.from("portfolio")
                    .upload(path, blob, {
                      contentType: "image/webp",
                      upsert: false,
                    });
                  if (e) throw e;
                  await rpc("add_portfolio", {
                    p_path: path,
                    p_caption: f.get("caption"),
                  });
                }, "Đã tải ảnh. Ảnh sẽ hiển thị công khai sau khi được duyệt.");
              }}
            >
              <h2>Tác phẩm thật, câu chuyện thật.</h2>
              <p>
                Tối đa 12 ảnh, tự động nén về WebP dưới 512 KB. Chỉ tải ảnh bạn
                có quyền sử dụng và được người trong ảnh cho phép công bố.
              </p>
              <Field label="Chọn ảnh">
                <input
                  type="file"
                  name="image"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  disabled={!own}
                />
              </Field>
              <Field label="Mô tả tác phẩm">
                <input
                  name="caption"
                  maxLength={200}
                  required
                  placeholder="Concept, loại dịch vụ, phong cách…"
                />
              </Field>
              <label className="checkbox">
                <input type="checkbox" required />
                Tôi có quyền sử dụng và công bố ảnh này.
              </label>
              <button
                className="btn"
                disabled={
                  busy || !own || (own?.portfolio_assets.length || 0) >= 12
                }
              >
                <Upload size={16} />
                {busy ? "Đang tải ảnh…" : "Tải ảnh lên"}
              </button>
            </form>
            <div className="studio-gallery">
              {own?.portfolio_assets.map((a) => (
                <figure key={a.id}>
                  {a.url && <img src={a.url} alt={a.caption} />}
                  <figcaption>
                    {a.caption}
                    <small>{a.approved ? "Đã duyệt" : "Chờ kiểm tra"}</small>
                  </figcaption>
                </figure>
              ))}
            </div>
          </>
        )}
        {tab === "calendar" && (
          <>
            <form
              className="panel form-grid"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const date = f.get("date");
                await run(() =>
                  rpc("add_availability", {
                    p_start: new Date(
                      `${date}T${f.get("start")}:00+07:00`,
                    ).toISOString(),
                    p_end: new Date(
                      `${date}T${f.get("end")}:00+07:00`,
                    ).toISOString(),
                  }),
                );
              }}
            >
              <h2>Mở thời gian nhận lịch</h2>
              <p>
                Giờ TP.HCM (UTC+7). Khách chỉ thấy khung giờ đủ thời lượng gói
                và không trùng booking.
              </p>
              <div className="form-grid three">
                <Field label="Ngày">
                  <input
                    type="date"
                    name="date"
                    min={localDate()}
                    max={localDate(89)}
                    required
                  />
                </Field>
                <Field label="Từ giờ">
                  <input
                    type="time"
                    name="start"
                    required
                    defaultValue="09:00"
                    step="1800"
                  />
                </Field>
                <Field label="Đến giờ">
                  <input
                    type="time"
                    name="end"
                    required
                    defaultValue="17:00"
                    step="1800"
                  />
                </Field>
              </div>
              <button className="btn" disabled={busy || !own}>
                Mở lịch
              </button>
            </form>
            <section className="panel">
              <h2>Thời gian đang mở</h2>
              <p className="muted">
                Đóng một khoảng giờ ngăn booking mới; không hủy các booking đã
                nhận.
              </p>
              {hours
                .filter((h) => Date.parse(h.ends_at) > Date.now())
                .map((h) => (
                  <div className="list-row" key={h.id}>
                    <CalendarDays size={18} />
                    <div>
                      <strong>{dateTime(h.starts_at)}</strong>
                      <p>Đến {dateTime(h.ends_at)}</p>
                    </div>
                    <button
                      className="btn ghost small"
                      disabled={busy}
                      onClick={() =>
                        run(
                          () => rpc("remove_availability", { p_id: h.id }),
                          "Đã đóng khoảng giờ cho booking mới.",
                        )
                      }
                    >
                      Đóng khoảng giờ
                    </button>
                  </div>
                ))}
            </section>
          </>
        )}
        {tab === "reviews" && (
          <section className="panel">
            <h2>Đánh giá từ booking hoàn thành</h2>
            {own?.reviews.length ? (
              own.reviews.map((r) => (
                <article className="review" key={r.id}>
                  <strong>
                    {r.author_name} · ★ {Number(r.rating).toFixed(1)}
                  </strong>
                  <p>{r.text}</p>
                </article>
              ))
            ) : (
              <Empty title="Chưa có đánh giá">
                Đánh giá sẽ xuất hiện sau khi khách hoàn thành dịch vụ.
              </Empty>
            )}
          </section>
        )}
        {edit && (
          <Modal
            title={edit === "new" ? "Tạo gói dịch vụ" : "Chỉnh sửa gói"}
            onClose={() => setEdit(null)}
          >
            <form
              className="form-grid"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const ok = await run(() =>
                  rpc("save_package", {
                    p_id: edit === "new" ? null : edit.id,
                    p_name: f.get("name"),
                    p_service: f.get("service"),
                    p_description: f.get("description"),
                    p_duration: Number(f.get("duration")),
                    p_price: Number(f.get("price")),
                    p_days: Number(f.get("days")),
                    p_includes: f.get("includes"),
                    p_exclusions: f.get("exclusions"),
                    p_active: f.get("active") === "on",
                  }),
                );
                if (ok) setEdit(null);
              }}
            >
              {error && <Alert>{error}</Alert>}
              <Field label="Tên gói">
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  defaultValue={edit === "new" ? "" : edit.name}
                />
              </Field>
              <Field label="Nhu cầu">
                <select
                  name="service"
                  defaultValue={edit === "new" ? "Personal" : edit.service}
                >
                  {SERVICES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Mô tả">
                <textarea
                  name="description"
                  required
                  minLength={10}
                  maxLength={2000}
                  defaultValue={edit === "new" ? "" : edit.description}
                />
              </Field>
              <div className="form-grid three">
                <Field label="Giá (VND)">
                  <input
                    type="number"
                    name="price"
                    min={100000}
                    max={100000000}
                    step={1000}
                    required
                    defaultValue={edit === "new" ? 900000 : edit.price}
                  />
                </Field>
                <Field label="Phút thực hiện">
                  <input
                    type="number"
                    name="duration"
                    min={30}
                    max={480}
                    required
                    defaultValue={edit === "new" ? 60 : edit.duration}
                  />
                </Field>
                <Field label="Ngày giao sản phẩm">
                  <input
                    type="number"
                    name="days"
                    min={0}
                    max={60}
                    required
                    defaultValue={edit === "new" ? 7 : edit.delivery_days}
                  />
                </Field>
              </div>
              <Field label="Bao gồm">
                <textarea
                  name="includes"
                  required
                  maxLength={1000}
                  defaultValue={edit === "new" ? "" : edit.includes}
                />
              </Field>
              <Field label="Không bao gồm / phụ phí công bố">
                <textarea
                  name="exclusions"
                  maxLength={1000}
                  defaultValue={edit === "new" ? "" : edit.exclusions}
                />
              </Field>
              <label className="checkbox">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={edit === "new" || edit.active}
                />
                Mở nhận booking cho gói này
              </label>
              <button className="btn" disabled={busy}>
                Lưu gói
              </button>
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
}
