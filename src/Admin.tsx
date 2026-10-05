import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ClipboardList,
  Clock,
  FileText,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { client, rpc } from "./api";
import { useApp } from "./context";
import {
  dateTime,
  effectiveStatus,
  errorText,
  money,
  type Booking,
  type Profile,
  type Support,
} from "./domain";
import { Alert, Badge, Empty, Field, Modal } from "./ui";
import { BookingCard } from "./Bookings";
export function Admin() {
  const { providers, settings, refresh, toast } = useApp();
  const [tab, setTab] = useState("queue"),
    [bookings, setBookings] = useState<Booking[]>([]),
    [tickets, setTickets] = useState<Support[]>([]),
    [users, setUsers] = useState<Profile[]>([]),
    [metrics, setMetrics] = useState<{
      users: number;
      active_providers: number;
      requests: number;
      paid: number;
      completed: number;
      gmv: number;
      cancellation_rate: number;
      funnel: Record<string, number>;
    } | null>(null),
    [audit, setAudit] = useState<
      { id: string; action: string; detail: string; created_at: string }[]
    >([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [resolve, setResolve] = useState<Support | null>(null);
  async function load() {
    const [b, t, u, a] = await Promise.all([
      client()
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
      client()
        .from("support_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
      client().from("profiles").select("*").limit(500),
      client()
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    const e = b.error || t.error || u.error || a.error;
    if (e) throw e;
    setBookings(b.data || []);
    setTickets(t.data || []);
    setUsers(u.data || []);
    setAudit(a.data || []);
    setMetrics(await rpc("admin_metrics"));
  }
  useEffect(() => {
    void load().catch((e) => setError(errorText(e)));
  }, []);
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
      await load();
      toast("Đã lưu thao tác và lịch sử xử lý.");
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  const tabs = [
    ["queue", "Cần xử lý", ClipboardList],
    ["providers", "Xác minh creator", ShieldCheck],
    ["bookings", "Tất cả booking", Wallet],
    ["users", "Người dùng", Users],
    ["audit", "Lịch sử thao tác", FileText],
    ["settings", "Cấu hình mở beta", Settings],
  ] as const;
  const reviews = bookings.filter((b) => b.status === "PAYMENT_REVIEW");
  const overdue = bookings.filter(
    (b) =>
      ["REQUESTED", "AWAITING_DEPOSIT"].includes(b.status) &&
      effectiveStatus(b) === "EXPIRED",
  );
  const refunds = bookings.filter((b) => b.payment_status === "REFUND_PENDING");
  return (
    <div className="workspace">
      <aside className="workspace-sidebar dark">
        <span className="eyebrow">BEAUTYHUB OPS</span>
        <h2>Vận hành</h2>
        <nav>
          {tabs.map(([k, t, Icon]) => (
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
        <Link to="/account">Tài khoản →</Link>
      </aside>
      <div className="workspace-main">
        <span className="eyebrow">PRIVATE BETA / OPERATIONS</span>
        <div className="page-heading">
          <div>
            <h1>{tabs.find((t) => t[0] === tab)?.[1]}</h1>
            <p className="muted">
              Mỗi việc được xử lý là một khách hàng bớt phải chờ.
            </p>
          </div>
          <button
            className="btn ghost"
            disabled={busy}
            onClick={() => run(load)}
          >
            Làm mới
          </button>
        </div>
        {error && <Alert>{error}</Alert>}
        {!settings?.ready && (
          <div className="info-banner">
            Booking đang đóng. Hoàn tất thông tin vận hành trong Cấu hình mở
            beta trước khi mở nhận lịch.
          </div>
        )}
        {tab === "queue" && (
          <>
            <div className="metrics">
              {[
                ["Chờ đối soát", reviews.length],
                [
                  "Hỗ trợ đang mở",
                  tickets.filter((t) => t.status === "OPEN").length,
                ],
                [
                  "Hồ sơ chờ duyệt",
                  providers.filter((p) => p.status === "PENDING").length,
                ],
                ["Cần hoàn tiền", refunds.length],
              ].map(([t, n]) => (
                <div className="metric" key={t}>
                  <small>{t}</small>
                  <strong>{n}</strong>
                </div>
              ))}
            </div>
            <section className="panel">
              <h2>Tiền cọc cần đối soát</h2>
              <p>
                Kiểm tra tiền thực nhận tại ngân hàng trước khi xác nhận. Mở
                booking để ghi mã giao dịch.
              </p>
              {reviews.length ? (
                reviews.map((b) => <BookingCard b={b} key={b.id} />)
              ) : (
                <p className="muted">Không có giao dịch chờ đối soát.</p>
              )}
            </section>
            <section className="panel">
              <h2>Yêu cầu hỗ trợ / đổi lịch / hủy</h2>
              {tickets
                .filter((t) => t.status === "OPEN")
                .map((t) => (
                  <div className="list-row" key={t.id}>
                    <div>
                      <span className="eyebrow">
                        {t.kind} · {dateTime(t.created_at)}
                      </span>
                      <p>{t.message}</p>
                      <Link to={`/bookings/${t.booking_id}`}>
                        Xem booking →
                      </Link>
                    </div>
                    <button className="btn small" onClick={() => setResolve(t)}>
                      Xử lý
                    </button>
                  </div>
                ))}
              {!tickets.some((t) => t.status === "OPEN") && (
                <p className="muted">Không có yêu cầu đang mở.</p>
              )}
            </section>
            <section className="panel">
              <h2>Khoản hoàn tiền cần thực hiện</h2>
              {refunds.map((b) => (
                <BookingCard b={b} key={b.id} />
              ))}
              {!refunds.length && (
                <p className="muted">Không có khoản hoàn đang chờ.</p>
              )}
            </section>
            <section className="panel">
              <h2>Đã quá hạn phản hồi / đặt cọc</h2>
              {overdue.map((b) => (
                <BookingCard b={b} key={b.id} />
              ))}
              {!overdue.length && (
                <p className="muted">Không có booking quá hạn.</p>
              )}
            </section>
          </>
        )}
        {tab === "providers" && (
          <div>
            {providers.map((p) => (
              <section className="panel" key={p.id}>
                <div className="section-title">
                  <div>
                    <Badge status={p.status} />
                    <h2>{p.name}</h2>
                    <p>
                      {p.category} · {p.districts.join(", ")}
                    </p>
                    <p>
                      Liên hệ:{" "}
                      {users.find((u) => u.id === p.owner_id)?.phone ||
                        "Chưa cập nhật"}
                    </p>
                  </div>
                </div>
                <p>{p.bio}</p>
                <div className="studio-gallery">
                  {p.portfolio_assets.map((a) => (
                    <figure key={a.id}>
                      {a.url && (
                        <a href={a.url} target="_blank" rel="noreferrer">
                          <img src={a.url} alt={a.caption} />
                        </a>
                      )}
                      <figcaption>
                        {a.caption}
                        <small>{a.approved ? "Đã duyệt" : "Chờ duyệt"}</small>
                      </figcaption>
                      {a.approved && (
                        <button
                          className="text-button danger"
                          disabled={busy}
                          onClick={() => {
                            const reason = prompt(
                              "Lý do ẩn tác phẩm (ít nhất 5 ký tự):",
                            );
                            if (reason)
                              void run(() =>
                                rpc("moderate_content", {
                                  p_id: a.id,
                                  p_kind: "portfolio",
                                  p_reason: reason,
                                }),
                              );
                          }}
                        >
                          Ẩn tác phẩm
                        </button>
                      )}
                    </figure>
                  ))}
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Gói</th>
                        <th>Thời lượng</th>
                        <th>Giá</th>
                        <th>Bao gồm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.packages.map((k) => (
                        <tr key={k.id}>
                          <td>{k.name}</td>
                          <td>{k.duration} phút</td>
                          <td>{money(k.price)}</td>
                          <td>{k.includes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <form
                  className="moderate-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void run(() =>
                      rpc("moderate_provider", {
                        p_id: p.id,
                        p_status: f.get("status"),
                        p_reason: f.get("reason"),
                      }),
                    );
                  }}
                >
                  <Field label="Kết quả kiểm tra">
                    <select name="status">
                      <option value="APPROVED">
                        Duyệt hồ sơ và các ảnh đã kiểm tra
                      </option>
                      <option value="REJECTED">Yêu cầu bổ sung</option>
                      <option value="SUSPENDED">Tạm ngừng nhận lịch</option>
                    </select>
                  </Field>
                  <Field label="Ghi chú xác minh / lý do">
                    <input
                      name="reason"
                      required
                      minLength={5}
                      maxLength={1000}
                      placeholder="Đã liên hệ, kiểm tra ảnh thật và nội dung gói…"
                    />
                  </Field>
                  <button className="btn" disabled={busy}>
                    Lưu kết quả
                  </button>
                </form>
                {p.reviews.map((r) => (
                  <div className="list-row" key={r.id}>
                    <p>
                      {r.author_name}: {r.text}
                    </p>
                    {!r.hidden && (
                      <button
                        className="btn small ghost"
                        disabled={busy}
                        onClick={() => {
                          const reason = prompt("Lý do ẩn đánh giá:");
                          if (reason)
                            void run(() =>
                              rpc("moderate_content", {
                                p_id: r.id,
                                p_kind: "review",
                                p_reason: reason,
                              }),
                            );
                        }}
                      >
                        Ẩn vi phạm
                      </button>
                    )}
                  </div>
                ))}
              </section>
            ))}
            {!providers.length && (
              <Empty title="Chưa có hồ sơ creator">
                Creator cần đăng nhập và gửi hồ sơ trước.
              </Empty>
            )}
          </div>
        )}
        {tab === "bookings" && (
          <>
            {metrics && (
              <>
                <h2>Toàn bộ giao dịch</h2>
                <div className="metrics">
                  {[
                    ["Người dùng", metrics.users],
                    ["Creator đã duyệt", metrics.active_providers],
                    ["Booking gửi", metrics.requests],
                    ["Đã nhận cọc", metrics.paid],
                    ["Hoàn thành", metrics.completed],
                    ["GMV hoàn thành", money(metrics.gmv)],
                    ["Tỷ lệ hủy", `${metrics.cancellation_rate}%`],
                  ].map(([label, value]) => (
                    <div className="metric" key={label}>
                      <small>{label}</small>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
                <section className="panel">
                  <h2>Hành vi tài khoản đã đăng nhập · 90 ngày</h2>
                  <p>
                    Đếm thao tác, không phải số khách duy nhất; không bao gồm
                    khách chưa đăng nhập. Thao tác cùng loại trong 10 giây được
                    gộp.
                  </p>
                  <div className="metrics">
                    {[
                      ["search", "Tìm kiếm"],
                      ["provider_view", "Xem hồ sơ"],
                      ["package_view", "Chọn gói"],
                      ["booking_started", "Mở đặt lịch"],
                      ["booking_submitted", "Gửi thành công"],
                    ].map(([key, label]) => (
                      <div className="metric" key={key}>
                        <small>{label}</small>
                        <strong>{metrics.funnel[key] || 0}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
            <h2>500 booking gần nhất</h2>
            <div className="metrics">
              <div className="metric">
                <small>Tổng booking trong 500 bản ghi gần nhất</small>
                <strong>{bookings.length}</strong>
              </div>
              <div className="metric">
                <small>Booking hoàn thành</small>
                <strong>
                  {bookings.filter((b) => b.status === "COMPLETED").length}
                </strong>
              </div>
              <div className="metric">
                <small>GMV hoàn thành</small>
                <strong>
                  {money(
                    bookings
                      .filter((b) => b.status === "COMPLETED")
                      .reduce((a, b) => a + b.price, 0),
                  )}
                </strong>
              </div>
            </div>
            {bookings.map((b) => (
              <BookingCard b={b} key={b.id} />
            ))}
          </>
        )}
        {tab === "users" && (
          <section className="panel table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Số điện thoại</th>
                  <th>Vai trò</th>
                  <th>ID</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.display_name || "Chưa cập nhật"}</td>
                    <td>{u.phone}</td>
                    <td>{u.role}</td>
                    <td>
                      <code>{u.id}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        {tab === "audit" && (
          <section className="panel">
            <h2>100 thao tác gần nhất</h2>
            {audit.map((a) => (
              <div className="list-row" key={a.id}>
                <div>
                  <strong>{a.action}</strong>
                  <p>{a.detail}</p>
                </div>
                <small>{dateTime(a.created_at)}</small>
              </div>
            ))}
          </section>
        )}
        {tab === "settings" && (
          <form
            className="panel form-grid"
            key={settings?.policy_version}
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              await run(() =>
                rpc("save_settings", {
                  p_bank: f.get("bank"),
                  p_account: f.get("account"),
                  p_holder: f.get("holder"),
                  p_support: f.get("support"),
                  p_policy: f.get("policy"),
                  p_ready: f.get("ready") === "on",
                }),
              );
            }}
          >
            <h2>Thông tin vận hành thật</h2>
            <p>
              Nhập thông tin do đơn vị vận hành kiểm tra. Chính sách được lưu
              vào từng booking; thay đổi sau không ghi đè thỏa thuận cũ.
            </p>
            <div className="form-grid two">
              <Field label="Tên ngân hàng">
                <input
                  name="bank"
                  required
                  defaultValue={settings?.bank_name}
                />
              </Field>
              <Field label="Số tài khoản nhận cọc">
                <input
                  name="account"
                  required
                  defaultValue={settings?.bank_account}
                />
              </Field>
              <Field label="Tên chủ tài khoản">
                <input
                  name="holder"
                  required
                  defaultValue={settings?.bank_holder}
                />
              </Field>
              <Field
                label="Link hỗ trợ (HTTPS)"
                hint="Zalo hoặc trang liên hệ có người trực trong beta."
              >
                <input
                  type="url"
                  name="support"
                  required
                  pattern="https://.*"
                  defaultValue={settings?.support_url}
                />
              </Field>
            </div>
            <Field
              label="Chính sách hủy / đổi lịch / hoàn tiền"
              hint="Nêu rõ các mốc thời gian, tỷ lệ hoàn, thời hạn xử lý, trường hợp creator hủy, cách liên hệ và bên nhận tiền."
            >
              <textarea
                name="policy"
                rows={9}
                required
                minLength={100}
                defaultValue={settings?.cancellation_policy}
              />
            </Field>
            <label className="checkbox">
              <input
                name="ready"
                type="checkbox"
                defaultChecked={settings?.ready}
              />
              Mở nhận booking sau khi đã kiểm tra thông tin và bố trí người hỗ
              trợ.
            </label>
            <button className="btn" disabled={busy}>
              Lưu cấu hình
            </button>
          </form>
        )}
        {resolve && (
          <Modal title="Xử lý yêu cầu hỗ trợ" onClose={() => setResolve(null)}>
            <p>{resolve.message}</p>
            {error && <Alert>{error}</Alert>}
            <form
              className="form-grid"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const ok = await run(() =>
                  rpc("resolve_support", {
                    p_id: resolve.id,
                    p_resolution: f.get("resolution"),
                    p_cancel: f.get("cancel") === "on",
                    p_refund: Number(f.get("refund") || 0),
                  }),
                );
                if (ok) setResolve(null);
              }}
            >
              <Field label="Kết quả và thỏa thuận với khách">
                <textarea
                  name="resolution"
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={4}
                />
              </Field>
              <label className="checkbox">
                <input type="checkbox" name="cancel" />
                Hủy booking theo thỏa thuận đã thống nhất
              </label>
              <Field label="Số tiền hoàn khi hủy (VND)">
                <input
                  type="number"
                  name="refund"
                  min={0}
                  max={
                    bookings.find((b) => b.id === resolve.booking_id)
                      ?.deposit || 0
                  }
                  defaultValue={0}
                />
              </Field>
              <p>
                Khoản hoàn sẽ vào hàng chờ; chỉ xác nhận đã hoàn sau khi thực
                hiện chuyển tiền. Đổi lịch cần thống nhất hai bên qua hỗ trợ,
                hủy booking cũ và đặt lịch mới sau khi xử lý tiền.
              </p>
              <button className="btn" disabled={busy}>
                Ghi nhận xử lý
              </button>
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
}
