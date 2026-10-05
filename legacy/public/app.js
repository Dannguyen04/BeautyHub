const appState = {
  data: null,
  role: 'customer',
  filter: 'all',
  bookingFilter: 'active',
  selectedProvider: null,
  selectedPackage: null,
  selectedRating: 5
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const money = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
const shortMoney = (value) => `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value / 1000000)}M`;
const dateParts = (date) => {
  const parsed = new Date(`${date}T12:00:00`);
  return { day: parsed.getDate(), month: `Thg ${parsed.getMonth() + 1}`, full: parsed.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }) };
};
const statusLabel = { PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', IN_PROGRESS: 'Đang thực hiện', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy', REJECTED: 'Đã từ chối' };
const escapeHtml = (text = '') => String(text).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);

async function request(url, options = {}) {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Có lỗi xảy ra.');
  return payload;
}

async function refresh() {
  appState.data = await request('/api/state');
  renderAll();
}

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove('show'), 2700);
}

function renderAll() {
  renderCreators();
  renderCustomerBookings();
  renderProviderDashboard();
  renderAdminDashboard();
}

function renderCreators() {
  const providers = appState.data.providers.filter((provider) => {
    if (appState.filter === 'all') return true;
    return provider.category === appState.filter || provider.styles.includes(appState.filter) || provider.districts.includes(appState.filter);
  });
  $('#creator-grid').innerHTML = providers.map((provider) => {
    const price = Math.min(...provider.packages.map((item) => item.price));
    return `<article class="creator-card" data-provider="${provider.id}" tabindex="0">
      <div class="creator-image">
        <img src="${provider.image}" alt="Portfolio của ${escapeHtml(provider.name)}" />
        ${provider.verified ? '<span class="creator-badge">✓ VERIFIED</span>' : '<span class="creator-badge" style="color:#8d681e">ĐANG XÁC MINH</span>'}
        <button class="heart-btn" data-heart aria-label="Lưu creator">♡</button>
      </div>
      <div class="creator-info">
        <div class="creator-name-row"><h3>${escapeHtml(provider.name)}</h3><span class="rating"><span>★</span> ${provider.rating} (${provider.reviewsCount})</span></div>
        <p>${provider.category} · ${provider.districts.slice(0, 2).join(' · ')}</p>
        <div class="tag-row">${provider.styles.map((style) => `<span class="tag">${style}</span>`).join('')}</div>
        <div class="price-row"><span>Từ</span><strong>${money(price)}</strong></div>
      </div>
    </article>`;
  }).join('') || '<div class="empty-state">Chưa tìm thấy creator phù hợp. Hãy thử bộ lọc khác.</div>';
}

function renderCustomerBookings() {
  let bookings = appState.data.bookings.filter((item) => item.customerId === 'customer-1');
  if (appState.bookingFilter === 'active') bookings = bookings.filter((item) => ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(item.status));
  if (appState.bookingFilter === 'past') bookings = bookings.filter((item) => item.status === 'COMPLETED');
  if (appState.bookingFilter === 'cancelled') bookings = bookings.filter((item) => ['CANCELLED', 'REJECTED'].includes(item.status));
  $('#customer-bookings').innerHTML = bookings.map((booking) => {
    const date = dateParts(booking.date);
    const reviewed = appState.data.reviews.some((review) => review.bookingId === booking.id);
    return `<article class="booking-row">
      <div class="date-block"><strong>${date.day}</strong><span>${date.month} · ${booking.time}</span></div>
      <div class="booking-main"><strong>${escapeHtml(booking.providerName)}</strong><span>${escapeHtml(booking.packageName)}</span></div>
      <div class="booking-meta"><strong>${escapeHtml(booking.location)}</strong><span>${date.full}</span></div>
      <div class="booking-price"><strong>${money(booking.price)}</strong><span class="status ${booking.status.toLowerCase()}">${statusLabel[booking.status]}</span></div>
      <div class="row-actions">
        ${['PENDING', 'CONFIRMED'].includes(booking.status) ? `<button class="danger-btn" data-cancel="${booking.id}">Hủy lịch</button>` : ''}
        ${booking.status === 'COMPLETED' && !reviewed ? `<button class="primary-btn" data-review="${booking.id}">Đánh giá</button>` : ''}
        ${reviewed ? '<span class="status completed">Đã đánh giá</span>' : ''}
      </div>
    </article>`;
  }).join('') || '<div class="empty-state">Không có booking trong mục này.</div>';
}

function renderProviderDashboard() {
  const bookings = appState.data.bookings.filter((item) => item.providerId === 'lan-anh');
  const pending = bookings.filter((item) => item.status === 'PENDING');
  const confirmed = bookings.filter((item) => ['CONFIRMED', 'IN_PROGRESS'].includes(item.status));
  const completed = bookings.filter((item) => item.status === 'COMPLETED');
  const revenue = bookings.filter((item) => ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(item.status)).reduce((sum, item) => sum + item.deposit, 0);
  $('#request-count').textContent = `${pending.length} yêu cầu mới`;
  $('#provider-revenue').textContent = money(revenue);
  $('#provider-metrics').innerHTML = [
    ['Yêu cầu mới', pending.length, pending.length ? 'Cần phản hồi' : 'Đã xử lý hết'],
    ['Sắp tới', confirmed.length, 'Booking đã xác nhận'],
    ['Hoàn thành', completed.length, 'Tổng booking demo'],
    ['Đánh giá', '4.9', '↑ 0.2 tháng này']
  ].map(([label, value, note]) => `<div class="metric-card"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`).join('');
  $('#provider-requests').innerHTML = pending.map((booking) => `<div class="request-row"><div><strong>${escapeHtml(booking.customerName)} · ${escapeHtml(booking.packageName)}</strong><small>${dateParts(booking.date).full}, ${booking.time} · ${escapeHtml(booking.location)}</small></div><div><strong>${money(booking.price)}</strong><small>Cọc ${money(booking.deposit)}</small></div><div class="request-actions"><button class="ghost-btn" data-status="REJECTED" data-id="${booking.id}" data-actor="provider">Từ chối</button><button class="primary-btn" data-status="CONFIRMED" data-id="${booking.id}" data-actor="provider">Xác nhận</button></div></div>`).join('') || '<div class="empty-state">Tuyệt! Bạn đã xử lý tất cả yêu cầu.</div>';
  $('#provider-upcoming').innerHTML = confirmed.map((booking) => `<div class="upcoming-row"><div><strong>${dateParts(booking.date).full} · ${booking.time}</strong><small>${escapeHtml(booking.customerName)} · ${escapeHtml(booking.location)}</small></div><div><strong>${escapeHtml(booking.packageName)}</strong><small>${money(booking.price)}</small></div><div class="request-actions">${booking.status === 'CONFIRMED' ? `<button class="ghost-btn" data-status="IN_PROGRESS" data-id="${booking.id}" data-actor="provider">Bắt đầu</button>` : `<button class="primary-btn" data-status="COMPLETED" data-id="${booking.id}" data-actor="provider">Hoàn thành</button>`}</div></div>`).join('') || '<div class="empty-state">Chưa có booking sắp tới.</div>';
}

function renderAdminDashboard() {
  const { bookings, providers } = appState.data;
  const completed = bookings.filter((item) => item.status === 'COMPLETED');
  const paid = bookings.filter((item) => item.paymentStatus === 'PAID');
  const gmv = completed.reduce((sum, item) => sum + item.price, 0);
  const cancellations = bookings.filter((item) => ['CANCELLED', 'REJECTED'].includes(item.status)).length;
  const pendingProviders = providers.filter((item) => !item.verified);
  $('#pending-provider-badge').textContent = pendingProviders.length;
  $('#admin-metrics').innerHTML = [
    ['Tổng người dùng', 248, '+12 tuần này'],
    ['Provider hoạt động', providers.filter((p) => p.verified).length, `${pendingProviders.length} chờ duyệt`],
    ['Booking requests', bookings.length, `${paid.length} đã thanh toán`],
    ['GMV hoàn thành', shortMoney(gmv), `${cancellations} booking đã hủy`]
  ].map(([label, value, note]) => `<div class="metric-card"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`).join('');
  $('#verification-list').innerHTML = pendingProviders.map((provider) => `<div class="verify-row"><div><strong>${escapeHtml(provider.name)}</strong><small>${provider.category} · ${provider.districts.join(', ')}</small></div><div><strong>${provider.styles.join(' · ')}</strong><small>${provider.packages.length} packages · Portfolio đã tải lên</small></div><div class="request-actions"><button class="ghost-btn" data-verify="reject" data-provider-id="${provider.id}">Từ chối</button><button class="primary-btn" data-verify="approve" data-provider-id="${provider.id}">Phê duyệt</button></div></div>`).join('') || '<div class="empty-state">Không còn hồ sơ chờ duyệt.</div>';
  const funnel = [['Visitor', 1240, 100], ['Provider view', 684, 55], ['Booking request', bookings.length * 24, 31], ['Confirmed', paid.length * 18, 20], ['Completed', completed.length * 12, 11]];
  $('#funnel').innerHTML = funnel.map(([label, value, width]) => `<div class="funnel-bar"><div class="funnel-label"><span>${label}</span><strong>${value}</strong></div><div class="funnel-track"><i style="width:${width}%"></i></div></div>`).join('');
  $('#admin-bookings').innerHTML = `<table class="data-table"><thead><tr><th>Mã</th><th>Khách</th><th>Creator</th><th>Lịch</th><th>Giá trị</th><th>Trạng thái</th><th></th></tr></thead><tbody>${bookings.map((booking) => `<tr><td><strong>${booking.id}</strong></td><td>${escapeHtml(booking.customerName)}</td><td>${escapeHtml(booking.providerName)}</td><td>${booking.date} · ${booking.time}</td><td>${money(booking.price)}</td><td><span class="status ${booking.status.toLowerCase()}">${statusLabel[booking.status]}</span></td><td><select data-admin-status="${booking.id}"><option value="">Đổi trạng thái</option>${Object.keys(statusLabel).map((status) => `<option value="${status}" ${status === booking.status ? 'disabled' : ''}>${statusLabel[status]}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table>`;
}

function openProvider(id) {
  const provider = appState.data.providers.find((item) => item.id === id);
  if (!provider) return;
  appState.selectedProvider = provider;
  const review = appState.data.reviews.find((item) => item.providerId === provider.id);
  $('#provider-detail').innerHTML = `<div class="provider-hero">
    <div class="provider-hero-image"><img src="${provider.image}" alt="${escapeHtml(provider.name)}" /></div>
    <div class="provider-hero-copy"><span class="eyebrow">${provider.category.toUpperCase()}</span><h1>${escapeHtml(provider.name)}</h1><div class="tag-row">${provider.styles.map((style) => `<span class="tag">${style}</span>`).join('')}</div><p>${escapeHtml(provider.bio)}</p>
      <div class="profile-facts"><div><strong>★ ${provider.rating}</strong>${provider.reviewsCount} đánh giá</div><div><strong>${provider.completed}</strong>booking hoàn thành</div><div><strong>${provider.responseTime}</strong>phản hồi trung bình</div></div>
      <span class="eyebrow">CHỌN GÓI DỊCH VỤ</span><div class="package-list">${provider.packages.map((item) => `<button class="package-option" data-book-package="${item.id}"><div><strong>${escapeHtml(item.name)}</strong><small>${item.duration} phút · ${escapeHtml(item.deliverables)}</small></div><span>${money(item.price)}</span></button>`).join('')}</div>
      ${review ? `<div class="review-preview">“${escapeHtml(review.text)}”<strong>— ${escapeHtml(review.customerName)} · ${'★'.repeat(review.rating)}</strong></div>` : ''}
    </div>
  </div>`;
  openModal('provider-modal');
  track('provider_view', { providerId: id });
}

function openBooking(packageId) {
  const provider = appState.selectedProvider;
  const selectedPackage = provider.packages.find((item) => item.id === packageId);
  appState.selectedPackage = selectedPackage;
  closeModals();
  const dates = Object.keys(provider.availability);
  const firstDate = dates[0];
  $('#booking-flow').innerHTML = `<form id="booking-form" class="booking-layout">
    <div class="booking-form"><span class="eyebrow">ĐẶT LỊCH AN TOÀN</span><h2>Chọn lịch phù hợp.</h2><p>Slot được giữ ngay sau khi bạn gửi yêu cầu. Creator sẽ phản hồi trong thời gian sớm nhất.</p>
      <div class="field-grid">
        <div class="field"><label>Ngày</label><select id="booking-date" name="date">${dates.map((date) => `<option value="${date}">${dateParts(date).full}</option>`).join('')}</select></div>
        <div class="field"><label>Khung giờ còn trống</label><select id="booking-time" name="time">${availableTimes(provider, firstDate).map((time) => `<option>${time}</option>`).join('')}</select></div>
        <div class="field full"><label>Khu vực thực hiện</label><select name="location">${provider.districts.map((district) => `<option>${district}</option>`).join('')}</select></div>
        <div class="field full"><label>Ghi chú cho creator</label><textarea name="notes" placeholder="Concept, mong muốn hoặc thông tin creator nên biết..."></textarea></div>
        <div class="field full"><label>Đặt cọc</label><label class="payment-choice"><input type="checkbox" name="payment" required checked /> Xác nhận chuyển khoản QR 30% sau khi gửi yêu cầu</label></div>
      </div>
    </div>
    <aside class="booking-summary"><img src="${provider.image}" alt="" /><h3>${escapeHtml(selectedPackage.name)}</h3><p>${escapeHtml(provider.name)} · ${selectedPackage.duration} phút</p><div class="summary-line"><span>Giá dịch vụ</span><span>${money(selectedPackage.price)}</span></div><div class="summary-line"><span>Tiền cọc 30%</span><span>${money(Math.round(selectedPackage.price * .3))}</span></div><div class="summary-line total"><span>Thanh toán hôm nay</span><strong>${money(Math.round(selectedPackage.price * .3))}</strong></div><button class="primary-btn full-btn" type="submit">Gửi yêu cầu đặt lịch</button></aside>
  </form>`;
  openModal('booking-modal');
  track('booking_started', { providerId: provider.id, packageId });
}

function availableTimes(provider, date) {
  const all = provider.availability[date] || [];
  return all.filter((time) => !appState.data.bookings.some((booking) => booking.providerId === provider.id && booking.date === date && booking.time === time && !['CANCELLED', 'REJECTED'].includes(booking.status)));
}

function openReview(bookingId) {
  appState.selectedRating = 5;
  $('#review-form').innerHTML = `<form class="review-form" id="submit-review"><span class="eyebrow">BOOKING ĐÃ HOÀN THÀNH</span><h2>Trải nghiệm của bạn?</h2><p style="color:var(--muted);font-size:11px">Đánh giá chân thực giúp cộng đồng chọn đúng creator.</p><div class="star-picker">${[1,2,3,4,5].map((star) => `<button type="button" data-star="${star}" class="active">★</button>`).join('')}</div><div class="field"><label>Nhận xét</label><textarea name="text" required placeholder="Điều gì khiến bạn hài lòng?"></textarea></div><input type="hidden" name="bookingId" value="${bookingId}" /><button class="primary-btn full-btn">Gửi đánh giá</button></form>`;
  openModal('review-modal');
}

function openModal(id) {
  const modal = $(`#${id}`);
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModals() {
  $$('.modal-backdrop').forEach((modal) => { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); });
  document.body.style.overflow = '';
}

function switchRole(role) {
  appState.role = role;
  $$('.role-pill').forEach((button) => button.classList.toggle('active', button.dataset.role === role));
  $$('.role-view').forEach((view) => view.classList.remove('active'));
  $(`#${role}-view`).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  toast(role === 'customer' ? 'Đang xem trải nghiệm khách hàng' : role === 'provider' ? 'Đang xem Creator Space' : 'Đang xem Admin Console');
}

function track(event, properties = {}) {
  const log = JSON.parse(localStorage.getItem('beautyhub_events') || '[]');
  log.push({ event, properties, at: new Date().toISOString() });
  localStorage.setItem('beautyhub_events', JSON.stringify(log.slice(-100)));
}

document.addEventListener('click', async (event) => {
  const roleButton = event.target.closest('[data-role]');
  if (roleButton) return switchRole(roleButton.dataset.role);
  const mobileRole = event.target.closest('[data-role-mobile]');
  if (mobileRole) return switchRole(mobileRole.dataset.roleMobile);
  const jump = event.target.closest('[data-jump]');
  if (jump) return document.getElementById(jump.dataset.jump)?.scrollIntoView({ behavior: 'smooth' });
  const close = event.target.closest('[data-close-modal]');
  if (close || (event.target.classList.contains('modal-backdrop'))) return closeModals();
  const heart = event.target.closest('[data-heart]');
  if (heart) { event.stopPropagation(); heart.classList.toggle('active'); heart.textContent = heart.classList.contains('active') ? '♥' : '♡'; return; }
  const card = event.target.closest('[data-provider]');
  if (card) return openProvider(card.dataset.provider);
  const packageButton = event.target.closest('[data-book-package]');
  if (packageButton) return openBooking(packageButton.dataset.bookPackage);
  const filter = event.target.closest('[data-filter]');
  if (filter) { appState.filter = filter.dataset.filter; $$('.filter-chip').forEach((item) => item.classList.toggle('active', item === filter)); renderCreators(); return; }
  const category = event.target.closest('[data-filter-category]');
  if (category) { appState.filter = category.dataset.filterCategory; $$('.filter-chip').forEach((item) => item.classList.toggle('active', item.dataset.filter === appState.filter)); renderCreators(); $('#explore').scrollIntoView({ behavior: 'smooth' }); return; }
  const bookingTab = event.target.closest('[data-booking-filter]');
  if (bookingTab) { appState.bookingFilter = bookingTab.dataset.bookingFilter; $$('.booking-tabs button').forEach((item) => item.classList.toggle('active', item === bookingTab)); renderCustomerBookings(); return; }
  const review = event.target.closest('[data-review]');
  if (review) return openReview(review.dataset.review);
  const star = event.target.closest('[data-star]');
  if (star) { appState.selectedRating = Number(star.dataset.star); $$('.star-picker button').forEach((button) => button.classList.toggle('active', Number(button.dataset.star) <= appState.selectedRating)); return; }
  const cancel = event.target.closest('[data-cancel]');
  if (cancel && confirm('Hủy booking này? Chính sách hoàn cọc sẽ được áp dụng theo thời điểm hủy.')) return changeStatus(cancel.dataset.cancel, 'CANCELLED', 'customer');
  const status = event.target.closest('[data-status]');
  if (status) return changeStatus(status.dataset.id, status.dataset.status, status.dataset.actor);
  const verify = event.target.closest('[data-verify]');
  if (verify) {
    if (verify.dataset.verify === 'reject') return toast('Đã chuyển hồ sơ sang bước yêu cầu bổ sung.');
    try { await request(`/api/providers/${verify.dataset.providerId}`, { method: 'PATCH', body: JSON.stringify({ verified: true }) }); await refresh(); toast('Đã xác minh provider.'); } catch (error) { toast(error.message); }
  }
  if (event.target.closest('#show-all')) { appState.filter = 'all'; renderCreators(); toast('Đã hiển thị tất cả creator.'); }
  if (event.target.closest('#open-filter')) toast('Bạn có thể lọc nhanh theo dịch vụ và phong cách ngay tại đây.');
  if (event.target.closest('#block-slot')) toast('Chế độ demo: slot 14:00 đã được đánh dấu là không khả dụng.');
});

document.addEventListener('change', async (event) => {
  if (event.target.id === 'booking-date') {
    const times = availableTimes(appState.selectedProvider, event.target.value);
    $('#booking-time').innerHTML = times.length ? times.map((time) => `<option>${time}</option>`).join('') : '<option value="">Không còn giờ trống</option>';
  }
  if (event.target.matches('[data-admin-status]') && event.target.value) await changeStatus(event.target.dataset.adminStatus, event.target.value, 'admin');
});

document.addEventListener('submit', async (event) => {
  if (event.target.id === 'hero-search') {
    event.preventDefault();
    const service = $('#hero-service').value;
    const location = $('#hero-location').value;
    appState.filter = service || location || 'all';
    renderCreators();
    $('#explore').scrollIntoView({ behavior: 'smooth' });
    track('search', { service, location, date: $('#hero-date').value });
  }
  if (event.target.id === 'booking-form') {
    event.preventDefault();
    const form = new FormData(event.target);
    const submit = event.submitter;
    submit.disabled = true; submit.textContent = 'Đang giữ lịch...';
    try {
      const booking = await request('/api/bookings', { method: 'POST', body: JSON.stringify({ providerId: appState.selectedProvider.id, packageId: appState.selectedPackage.id, date: form.get('date'), time: form.get('time'), location: form.get('location'), notes: form.get('notes'), paymentConfirmed: Boolean(form.get('payment')) }) });
      track('booking_submitted', { bookingId: booking.id });
      $('#booking-flow').innerHTML = `<div class="success-state"><div class="success-icon">✓</div><span class="eyebrow">YÊU CẦU ĐÃ ĐƯỢC GỬI</span><h2>Lịch của bạn đã được giữ.</h2><p>Mã booking <strong>${booking.id}</strong>. ${escapeHtml(booking.providerName)} sẽ nhận thông báo và phản hồi yêu cầu này. Bạn có thể theo dõi trạng thái trong “Lịch hẹn”.</p><button class="primary-btn" data-success-close>Xem lịch hẹn</button></div>`;
      await refresh();
    } catch (error) { toast(error.message); submit.disabled = false; submit.textContent = 'Gửi yêu cầu đặt lịch'; }
  }
  if (event.target.id === 'submit-review') {
    event.preventDefault();
    const form = new FormData(event.target);
    try { await request('/api/reviews', { method: 'POST', body: JSON.stringify({ bookingId: form.get('bookingId'), rating: appState.selectedRating, text: form.get('text') }) }); closeModals(); await refresh(); toast('Cảm ơn bạn đã chia sẻ đánh giá!'); } catch (error) { toast(error.message); }
  }
});

document.addEventListener('click', (event) => {
  if (event.target.closest('[data-success-close]')) { closeModals(); $('#dashboard').scrollIntoView({ behavior: 'smooth' }); }
});

async function changeStatus(id, status, actor) {
  try { await request(`/api/bookings/${id}`, { method: 'PATCH', body: JSON.stringify({ status, actor }) }); track(`booking_${status.toLowerCase()}`, { bookingId: id, actor }); await refresh(); toast(`Booking đã chuyển sang “${statusLabel[status]}”.`); } catch (error) { toast(error.message); }
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeModals();
  if (event.key === 'Enter' && event.target.matches('[data-provider]')) openProvider(event.target.dataset.provider);
});

refresh().catch((error) => {
  $('#creator-grid').innerHTML = `<div class="empty-state">Không thể tải dữ liệu: ${escapeHtml(error.message)}</div>`;
});
