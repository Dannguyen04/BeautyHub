const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const DB_FILE = path.join(ROOT, 'data', 'db.json');
const PUBLIC_DIR = path.join(ROOT, 'public');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function readDb() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function send(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

async function body(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

function slotTaken(db, providerId, date, time, ignoreId) {
  return db.bookings.some((booking) =>
    booking.id !== ignoreId &&
    booking.providerId === providerId &&
    booking.date === date &&
    booking.time === time &&
    !['CANCELLED', 'REJECTED'].includes(booking.status)
  );
}

async function api(req, res, url) {
  const db = readDb();

  if (req.method === 'GET' && url.pathname === '/api/state') {
    return send(res, 200, db);
  }

  if (req.method === 'POST' && url.pathname === '/api/bookings') {
    const data = await body(req);
    const required = ['providerId', 'packageId', 'date', 'time', 'location'];
    if (required.some((key) => !data[key])) return send(res, 400, { error: 'Vui lòng điền đủ thông tin đặt lịch.' });
    const provider = db.providers.find((item) => item.id === data.providerId);
    const selectedPackage = provider?.packages.find((item) => item.id === data.packageId);
    if (!provider || !selectedPackage) return send(res, 404, { error: 'Không tìm thấy creator hoặc gói dịch vụ.' });
    if (slotTaken(db, data.providerId, data.date, data.time)) return send(res, 409, { error: 'Khung giờ vừa được người khác chọn. Vui lòng chọn giờ khác.' });
    const booking = {
      id: `BH${String(Date.now()).slice(-6)}`,
      customerId: 'customer-1',
      customerName: 'Minh Anh',
      providerId: provider.id,
      providerName: provider.name,
      service: provider.category,
      packageId: selectedPackage.id,
      packageName: selectedPackage.name,
      date: data.date,
      time: data.time,
      location: data.location,
      price: selectedPackage.price,
      deposit: Math.round(selectedPackage.price * 0.3),
      status: 'PENDING',
      paymentStatus: data.paymentConfirmed ? 'PAID' : 'AWAITING',
      notes: data.notes || '',
      createdAt: new Date().toISOString()
    };
    db.bookings.unshift(booking);
    db.notifications.unshift({ id: Date.now(), audience: 'provider', text: `Booking mới từ ${booking.customerName}`, time: 'Vừa xong', unread: true });
    writeDb(db);
    return send(res, 201, booking);
  }

  const bookingMatch = url.pathname.match(/^\/api\/bookings\/([^/]+)$/);
  if (req.method === 'PATCH' && bookingMatch) {
    const data = await body(req);
    const booking = db.bookings.find((item) => item.id === bookingMatch[1]);
    if (!booking) return send(res, 404, { error: 'Không tìm thấy booking.' });
    const transitions = {
      PENDING: ['CONFIRMED', 'CANCELLED', 'REJECTED'],
      CONFIRMED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED'],
      COMPLETED: [], CANCELLED: [], REJECTED: []
    };
    if (!transitions[booking.status]?.includes(data.status) && data.actor !== 'admin') {
      return send(res, 400, { error: `Không thể chuyển ${booking.status} → ${data.status}.` });
    }
    booking.status = data.status;
    if (data.status === 'CONFIRMED') booking.paymentStatus = 'PAID';
    db.notifications.unshift({ id: Date.now(), audience: data.actor === 'provider' ? 'customer' : 'provider', text: `Booking ${booking.id} đã chuyển sang ${data.status}`, time: 'Vừa xong', unread: true });
    writeDb(db);
    return send(res, 200, booking);
  }

  if (req.method === 'POST' && url.pathname === '/api/reviews') {
    const data = await body(req);
    const booking = db.bookings.find((item) => item.id === data.bookingId);
    if (!booking || booking.status !== 'COMPLETED') return send(res, 403, { error: 'Chỉ booking đã hoàn thành mới có thể đánh giá.' });
    if (db.reviews.some((item) => item.bookingId === booking.id)) return send(res, 409, { error: 'Booking này đã được đánh giá.' });
    const review = { id: `RV${Date.now()}`, bookingId: booking.id, providerId: booking.providerId, customerName: booking.customerName, rating: Number(data.rating), text: data.text, createdAt: new Date().toISOString() };
    db.reviews.unshift(review);
    writeDb(db);
    return send(res, 201, review);
  }

  const providerMatch = url.pathname.match(/^\/api\/providers\/([^/]+)$/);
  if (req.method === 'PATCH' && providerMatch) {
    const data = await body(req);
    const provider = db.providers.find((item) => item.id === providerMatch[1]);
    if (!provider) return send(res, 404, { error: 'Không tìm thấy provider.' });
    if (typeof data.verified === 'boolean') provider.verified = data.verified;
    writeDb(db);
    return send(res, 200, provider);
  }

  return send(res, 404, { error: 'API không tồn tại.' });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/')) return api(req, res, url);

  let requested = url.pathname === '/' ? '/index.html' : url.pathname;
  requested = path.normalize(requested).replace(/^(\.\.[/\\])+/, '');
  const file = path.join(PUBLIC_DIR, requested);
  if (!file.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); return res.end('Forbidden');
  }
  fs.readFile(file, (error, content) => {
    if (error) {
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (fallbackError, fallback) => {
        if (fallbackError) { res.writeHead(404); return res.end('Not found'); }
        res.writeHead(200, { 'Content-Type': types['.html'] }); res.end(fallback);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(content);
  });
});

if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`BeautyHub đang chạy tại http://127.0.0.1:${PORT}`);
  });
}

module.exports = { slotTaken };
