import { Component, type ReactNode } from "react";

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="page narrow">
          <h1>Trang chưa tải được.</h1>
          <p>
            Vui lòng tải lại. Nếu bạn vừa gửi booking hoặc báo chuyển tiền, hãy
            kiểm tra Lịch hẹn của tôi trước khi thao tác lại; không chuyển thêm
            tiền.
          </p>
          <button className="btn" onClick={() => location.reload()}>
            Tải lại trang
          </button>
          <p>
            <a href="/bookings">Mở lịch hẹn của tôi</a>
          </p>
        </main>
      );
    return this.props.children;
  }
}
