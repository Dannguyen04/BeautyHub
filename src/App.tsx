import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowRight,
  Bell,
  Camera,
  Check,
  LogOut,
  Menu,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { client, configured, db, rpc, track } from "./api";
import { useApp } from "./context";
import { dateTime, errorText, labels, safeNext, type Notice } from "./domain";
import { Alert, Empty, Field, Loading, Modal } from "./ui";
import { Home, Explore, Creator } from "./Discovery";
import { Checkout, BookingDetail, Bookings } from "./Bookings";
import { Studio } from "./Studio";
import { Admin } from "./Admin";

function Header() {
  const { user, profile, toast } = useApp();
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  useEffect(() => setMenu(false), [location]);
  return (
    <header className="header">
      <Link className="brand" to="/">
        <span>B</span>beautyhub<span className="beta">BETA</span>
      </Link>
      <nav className={menu ? "nav open" : "nav"}>
        <NavLink to="/explore">Khám phá creator</NavLink>
        <NavLink to="/how-it-works">Cách hoạt động</NavLink>
        <NavLink to="/bookings">Lịch hẹn của tôi</NavLink>
      </nav>
      <div className="header-actions">
        {user ? (
          <>
            <Link
              className="icon-button"
              to="/notifications"
              aria-label="Thông báo"
            >
              <Bell size={18} />
            </Link>
            {profile?.role === "ADMIN" && (
              <Link className="btn small ghost desktop" to="/admin">
                Vận hành
              </Link>
            )}
            <Link className="avatar" to="/account" aria-label="Tài khoản">
              {(profile?.display_name || user.email || "B")
                .slice(0, 2)
                .toUpperCase()}
            </Link>
          </>
        ) : (
          <>
            <Link className="text-button desktop" to="/studio">
              Trở thành creator <ArrowRight size={13} />
            </Link>
            <Link className="btn small" to="/login">
              Đăng nhập
            </Link>
          </>
        )}
        <button
          className="icon-button menu-toggle"
          aria-label="Mở điều hướng"
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
function Footer() {
  return (
    <footer>
      <div>
        <Link className="brand" to="/">
          <span>B</span>beautyhub
        </Link>
        <p>Đúng người cho khoảnh khắc của bạn.</p>
      </div>
      <div>
        <Link to="/how-it-works">Cách đặt lịch</Link>
        <Link to="/policies">Chính sách & quyền riêng tư</Link>
        <Link to="/studio">Dành cho creator</Link>
      </div>
      <small>TP.HCM · Private beta</small>
    </footer>
  );
}
export function RequireUser({
  children,
  admin = false,
}: {
  children: React.ReactNode;
  admin?: boolean;
}) {
  const { user, profile, authLoading } = useApp();
  const location = useLocation();
  if (authLoading) return <Loading />;
  if (!user)
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  if (admin && profile?.role !== "ADMIN")
    return (
      <div className="page">
        <Empty title="Bạn không có quyền truy cập">
          <Link to="/bookings">Về lịch hẹn của tôi</Link>
        </Empty>
      </div>
    );
  return <>{children}</>;
}
function Login() {
  const { user, authLoading } = useApp();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (user && !authLoading) return <Navigate to={next} replace />;
  return (
    <div className="auth-layout">
      <div className="auth-art">
        <img
          src="/assets/hero-beautyhub.webp"
          alt="Minh họa một buổi chụp chân dung"
        />
        <div>
          <span className="eyebrow">BEAUTYHUB</span>
          <h1>
            Khoảnh khắc của bạn.
            <br />
            <em>Được chăm chút.</em>
          </h1>
        </div>
      </div>
      <section className="auth-form">
        <span className="eyebrow">RẤT VUI ĐƯỢC GẶP BẠN</span>
        <h1>Chào bạn.</h1>
        <p>
          Đăng nhập để giữ lịch, theo dõi yêu cầu và kết nối với creator. Lựa
          chọn của bạn sẽ được giữ nguyên.
        </p>
        {!configured && (
          <Alert>
            BeautyHub đang chuẩn bị mở cửa. Đăng nhập sẽ khả dụng khi hệ thống
            sẵn sàng.
          </Alert>
        )}
        {error && <Alert>{error}</Alert>}
        <button
          className="btn google full"
          disabled={!configured || busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const { error: e } = await client().auth.signInWithOAuth({
                provider: "google",
                options: {
                  redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
                },
              });
              if (e) throw e;
            } catch (e) {
              setError(errorText(e));
              setBusy(false);
            }
          }}
        >
          <strong>G</strong>
          {busy ? "Đang mở Google…" : "Tiếp tục với Google"}
        </button>
        <small>
          Bằng việc tiếp tục, bạn đồng ý với{" "}
          <Link to="/policies">chính sách của BeautyHub</Link>.
        </small>
        <Link className="back-link" to="/explore">
          ← Tiếp tục khám phá
        </Link>
      </section>
    </div>
  );
}
function Callback() {
  const { user, authLoading, error } = useApp();
  const [params] = useSearchParams();
  const message = params.get("error_description");
  if (message || error)
    return (
      <div className="page">
        <Alert>{message || error}</Alert>
        <Link to="/login">Thử đăng nhập lại</Link>
      </div>
    );
  if (!authLoading && user)
    return <Navigate to={safeNext(params.get("next"))} replace />;
  return (
    <div className="page">
      <Loading />
      <p>Đang hoàn tất đăng nhập.</p>
      <Link to="/login">Quay lại nếu đăng nhập chưa hoàn tất</Link>
    </div>
  );
}
function Account() {
  const { profile, refresh, toast } = useApp();
  const navigate = useNavigate();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="page narrow">
      <span className="eyebrow">TÀI KHOẢN</span>
      <h1>Thông tin của bạn</h1>
      <p className="muted">
        Thông tin liên hệ chỉ được sử dụng để thực hiện booking và hỗ trợ bạn.
      </p>
      {error && <Alert>{error}</Alert>}
      <form
        className="panel form-grid"
        key={profile?.id}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const f = new FormData(e.currentTarget);
          try {
            await rpc("save_profile", {
              p_name: f.get("name"),
              p_phone: f.get("phone"),
            });
            await refresh();
            toast("Đã lưu thông tin.");
          } catch (e) {
            setError(errorText(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Họ tên">
          <input
            name="name"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
            defaultValue={profile?.display_name}
          />
        </Field>
        <Field label="Số điện thoại">
          <input
            name="phone"
            required
            type="tel"
            autoComplete="tel"
            pattern="\+?[0-9]{9,15}"
            defaultValue={profile?.phone}
          />
        </Field>
        <button className="btn" disabled={busy}>
          {busy ? "Đang lưu…" : "Lưu thông tin"}
        </button>
      </form>
      <div className="account-links">
        <Link to="/studio">
          <Camera /> Không gian creator <ArrowRight />
        </Link>
        {profile?.role === "ADMIN" && (
          <Link to="/admin">
            <ShieldCheck /> Vận hành BeautyHub <ArrowRight />
          </Link>
        )}
        <button
          onClick={async () => {
            const { error: e } = await client().auth.signOut();
            if (e) {
              setError(e.message);
              return;
            }
            navigate("/");
          }}
        >
          <LogOut />
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
function Notifications() {
  const { user } = useApp();
  const [items, setItems] = useState<Notice[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) return;
    void client()
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error: e }) => {
        if (e) setError(e.message);
        else setItems(data || []);
        setLoading(false);
      });
  }, [user]);
  return (
    <div className="page narrow">
      <span className="eyebrow">CẬP NHẬT</span>
      <h1>Thông báo của bạn</h1>
      {error && <Alert>{error}</Alert>}
      {loading ? (
        <Loading />
      ) : items.length ? (
        <>
          <button
            className="text-button"
            onClick={async () => {
              try {
                await rpc("mark_notifications_read");
                setItems(
                  items.map((n) => ({
                    ...n,
                    read_at: new Date().toISOString(),
                  })),
                );
              } catch (e) {
                setError(errorText(e));
              }
            }}
          >
            Đánh dấu đã đọc
          </button>
          <div className="notification-list">
            {items.map((n) => (
              <Link
                className={n.read_at ? "notice" : "notice unread"}
                to={n.booking_id ? `/bookings/${n.booking_id}` : "/studio"}
                key={n.id}
              >
                <Bell size={18} />
                <div>
                  <strong>{labels[n.text] || n.text}</strong>
                  <small>{dateTime(n.created_at)}</small>
                </div>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </>
      ) : (
        <Empty title="Bạn chưa có thông báo">
          Các cập nhật về booking sẽ xuất hiện tại đây.
        </Empty>
      )}
    </div>
  );
}
function Policies() {
  const { settings } = useApp();
  return (
    <div className="page narrow prose">
      <span className="eyebrow">MINH BẠCH TỪ ĐẦU</span>
      <h1>Chính sách & hỗ trợ</h1>
      <h2>Đặt lịch và tiền cọc</h2>
      <p>
        Yêu cầu đặt lịch được giữ tối đa 12 giờ để creator phản hồi. Sau khi
        creator chấp nhận, bạn có tối đa 6 giờ để chuyển cọc 30%. Hạn chính xác
        được hiển thị trong booking. Lịch chỉ được xác nhận sau khi BeautyHub
        đối soát tiền thực nhận.
      </p>
      <p>
        Không chuyển tiền sau thời hạn. Nếu đã chuyển muộn hoặc nhập sai nội
        dung, gửi yêu cầu hỗ trợ ngay trong trang booking. Tiền báo chuyển chưa
        đồng nghĩa đã nhận tiền.
      </p>
      <h2>Hủy, đổi lịch và hoàn tiền</h2>
      {settings?.cancellation_policy ? (
        <p className="preserve">{settings.cancellation_policy}</p>
      ) : (
        <Alert>
          Chính sách vận hành đang được hoàn thiện. BeautyHub chưa mở nhận
          booking khi chính sách chưa được công bố.
        </Alert>
      )}
      <p>
        Mọi yêu cầu đổi lịch được xử lý qua hỗ trợ. Không tự đặt lại hoặc chuyển
        thêm tiền trước khi có xác nhận. Khoản hoàn tiền chỉ được ghi nhận hoàn
        tất khi có đối soát giao dịch hoàn.
      </p>
      <h2>Thông tin cá nhân</h2>
      <p>
        Với tài khoản đã đăng nhập, hệ thống ghi nhận loại thao tác (tìm kiếm,
        xem hồ sơ, xem gói, bắt đầu và gửi booking) để cải thiện trải nghiệm;
        không ghi nội dung tìm kiếm hoặc biểu mẫu vào thống kê. Các sự kiện này
        được giữ tối đa 90 ngày khi tác vụ dọn dữ liệu đang hoạt động.
      </p>
      <p>
        BeautyHub sử dụng tên, số điện thoại, địa điểm và thông tin booking để
        thực hiện dịch vụ. Khách, creator liên quan và người vận hành có quyền
        xem dữ liệu cần thiết cho giao dịch. Dữ liệu tài khoản được xử lý qua
        Supabase; website được triển khai trên Cloudflare khi mở beta.
      </p>
      <p>
        Không nhập thông tin thẻ, mật khẩu ngân hàng hoặc giấy tờ tùy thân vào
        ghi chú booking. Bạn có thể yêu cầu chỉnh sửa hoặc xóa dữ liệu qua kênh
        hỗ trợ; dữ liệu giao dịch cần lưu giữ sẽ được giải thích khi xử lý.
      </p>
      <h2>Liên hệ</h2>
      {settings?.support_url?.startsWith("https://") ? (
        <a
          className="btn"
          href={settings.support_url}
          target="_blank"
          rel="noreferrer"
        >
          Mở kênh hỗ trợ <ArrowRight size={16} />
        </a>
      ) : (
        <p>Kênh hỗ trợ sẽ được công bố trước khi nhận booking.</p>
      )}
    </div>
  );
}
function How() {
  return (
    <div className="page narrow prose">
      <span className="eyebrow">TỪ TÌM KIẾM ĐẾN BUỔI HẸN</span>
      <h1>
        Một lịch hẹn,
        <br />
        <em>mọi thứ rõ ràng.</em>
      </h1>
      {[
        [
          "1",
          "Tìm người hiểu đúng gu",
          "Lọc dịch vụ, khu vực, phong cách và ngân sách. Xem bộ tác phẩm thật và nội dung từng gói trước khi chọn.",
        ],
        [
          "2",
          "Gửi yêu cầu",
          "Chọn khung giờ còn trống, nhập địa chỉ và mong muốn. Bạn có thể khám phá trước, đăng nhập bằng Google khi sẵn sàng đặt.",
        ],
        [
          "3",
          "Creator nhận lịch",
          "Creator có tối đa 12 giờ để phản hồi. Theo dõi hạn giữ lịch trên trang booking và trong mục thông báo.",
        ],
        [
          "4",
          "Chuyển cọc và được xác nhận",
          "Khi creator chấp nhận, chuyển cọc theo đúng tài khoản và nội dung hiển thị. Báo đã chuyển tiền để BeautyHub đối soát.",
        ],
        [
          "5",
          "Trải nghiệm và đánh giá",
          "Thông tin liên hệ của creator được mở khi booking xác nhận. Sau buổi hẹn, bạn có thể để lại đánh giá về bốn tiêu chí.",
        ],
      ].map(([n, t, d]) => (
        <article className="how-step" key={n}>
          <span>{n}</span>
          <div>
            <h2>{t}</h2>
            <p>{d}</p>
          </div>
        </article>
      ))}
      <Link className="btn" to="/explore">
        Khám phá creator <ArrowRight size={16} />
      </Link>
    </div>
  );
}
function Setup() {
  return (
    <div className="page narrow prose">
      <h1>Cấu hình private beta</h1>
      <p>
        Mã nguồn đã tách khỏi prototype. Để mở giao dịch thật cần một project
        Supabase và thông tin vận hành do chủ website cung cấp.
      </p>
      <ol>
        <li>
          Tạo project Supabase Free, chạy các SQL migration trong thư mục{" "}
          <code>supabase/migrations</code>.
        </li>
        <li>
          Điền URL project và publishable/anon key vào <code>.env</code> theo{" "}
          <code>.env.example</code>. Không đặt service-role key ở frontend.
        </li>
        <li>
          Bật Google OAuth, cấu hình callback và địa chỉ website trong Supabase.
        </li>
        <li>Đăng nhập rồi cấp quyền admin bằng SQL theo README.</li>
        <li>
          Trong Vận hành, lưu tài khoản nhận tiền, kênh hỗ trợ và chính sách;
          duyệt creator thật trước khi mở nhận lịch.
        </li>
        <li>
          Deploy thư mục <code>dist</code> lên Cloudflare Pages, cấu hình biến
          môi trường và kiểm tra các luồng nghiệm thu trong README.
        </li>
      </ol>
      <Link className="btn" to="/">
        Về trang chủ
      </Link>
    </div>
  );
}
export default function App() {
  const location = useLocation();
  const { error, user } = useApp();
  useEffect(() => {
    if (!user) return;
    const path = location.pathname;
    if (path === "/explore") void track("search");
    else if (path.startsWith("/creators/")) void track("provider_view");
    else if (path.startsWith("/checkout/")) void track("booking_started");
  }, [location.pathname, location.search, user?.id]);
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "BeautyHub — Đúng người, đúng khoảnh khắc";
  }, [location.pathname]);
  useEffect(() => {
    const on = () => setOffline(!navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);
  return (
    <>
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>
      <Header />
      {offline && (
        <div className="network-banner" role="status">
          Bạn đang ngoại tuyến. Vui lòng kết nối lại trước khi gửi thay đổi.
        </div>
      )}
      {error && (
        <div className="network-banner" role="alert">
          Không tải được dữ liệu. Hãy tải lại trang hoặc kiểm tra kết nối.
        </div>
      )}
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/creators/:slug" element={<Creator />} />
          <Route
            path="/checkout/:packageId"
            element={
              <RequireUser>
                <Checkout />
              </RequireUser>
            }
          />
          <Route
            path="/bookings"
            element={
              <RequireUser>
                <Bookings />
              </RequireUser>
            }
          />
          <Route
            path="/bookings/:id"
            element={
              <RequireUser>
                <BookingDetail />
              </RequireUser>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<Callback />} />
          <Route
            path="/account"
            element={
              <RequireUser>
                <Account />
              </RequireUser>
            }
          />
          <Route
            path="/notifications"
            element={
              <RequireUser>
                <Notifications />
              </RequireUser>
            }
          />
          <Route
            path="/studio"
            element={
              <RequireUser>
                <Studio />
              </RequireUser>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireUser admin>
                <Admin />
              </RequireUser>
            }
          />
          <Route path="/how-it-works" element={<How />} />
          <Route path="/policies" element={<Policies />} />
          <Route path="/setup" element={<Setup />} />
          <Route
            path="*"
            element={
              <div className="page">
                <Empty title="Trang này không tồn tại">
                  <Link to="/">Về trang chủ</Link>
                </Empty>
              </div>
            }
          />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
