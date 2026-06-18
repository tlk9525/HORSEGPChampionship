# 🏇 Horse Racing Tournament Website

Hệ thống quản lý giải đua ngựa trực tuyến — cho phép admin tạo giải đấu, chủ ngựa đăng ký tham gia, jockey nhận lời mời, trọng tài điều hành cuộc đua và ghi kết quả theo thời gian thực.

## 📋 Mục lục

- [Tính năng](#-tính-năng)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Vai trò người dùng](#-vai-trò-người-dùng)
- [Cài đặt & Chạy](#-cài-đặt--chạy)
- [Biến môi trường](#-biến-môi-trường)
- [Các lệnh npm](#-các-lệnh-npm)
- [API Endpoints](#-api-endpoints)

---

## ✨ Tính năng

- **Quản lý giải đấu**: Admin tạo và điều phối toàn bộ giải đua
- **Đăng ký ngựa & jockey**: Owner đăng ký ngựa, mời jockey, theo dõi trạng thái phê duyệt
- **Phân quyền đa vai trò**: Admin, Owner, Jockey, Referee, Spectator
- **Theo dõi trực tiếp (Live Race)**: Cập nhật trạng thái cuộc đua theo thời gian thực qua Server-Sent Events (SSE)
- **Hệ thống handicap tự động**: Tính điểm handicap dựa trên tốc độ, sức bền, phong độ và cân nặng jockey
- **Thông báo nội bộ**: Hệ thống thông báo cho từng vai trò khi có sự kiện quan trọng
- **Bảng xếp hạng & kết quả**: Xem lịch sử kết quả và thành tích các cuộc đua

---

## 🛠 Công nghệ sử dụng

| Tầng | Công nghệ |
|------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js (ESM), HTTP thuần (không dùng framework) |
| Cơ sở dữ liệu | PostgreSQL |
| UI Icons | Lucide React |
| Routing | React Router DOM v7 |

---

## 📁 Cấu trúc dự án

```text
Horse Racing Tournament Website/
├── frontend/                        # Giao diện người dùng (React + Vite)
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── src/
│       ├── App.tsx                  # Router chính & quản lý xác thực
│       ├── main.tsx                 # Entry point React
│       ├── app/
│       │   ├── components/          # Các trang & component UI
│       │   │   ├── AdminPanel.tsx       # Bảng điều khiển admin
│       │   │   ├── CreateRacePage.tsx   # Tạo cuộc đua mới
│       │   │   ├── HorseDetails.tsx     # Chi tiết ngựa
│       │   │   ├── HorseManagement.tsx  # Quản lý danh sách ngựa
│       │   │   ├── JockeyDirectoryPage.tsx  # Danh bạ jockey
│       │   │   ├── JockeyPage.tsx       # Portal jockey
│       │   │   ├── LandingPage.tsx      # Trang chủ
│       │   │   ├── LiveRace.tsx         # Theo dõi đua trực tiếp
│       │   │   ├── LoginPage.tsx        # Đăng nhập / Đăng ký
│       │   │   ├── Navbar.tsx           # Thanh điều hướng
│       │   │   ├── NotificationsPanel.tsx  # Bảng thông báo
│       │   │   ├── RaceDetails.tsx      # Chi tiết cuộc đua
│       │   │   ├── RaceRegistrationPage.tsx # Đăng ký tham gia đua
│       │   │   ├── RankingsPage.tsx     # Bảng xếp hạng
│       │   │   ├── RegisterHorsePage.tsx # Đăng ký ngựa mới
│       │   │   ├── ResultsPage.tsx      # Kết quả các cuộc đua
│       │   │   ├── TournamentDetails.tsx # Chi tiết giải đấu
│       │   │   └── TournamentPage.tsx   # Trang quản lý giải đấu
│       │   ├── services/
│       │   │   └── api.ts           # Tất cả hàm gọi API tới backend
│       │   └── utils/
│       │       ├── domain.ts        # Hàm tiện ích chuyển đổi status label
│       │       └── messageTone.ts   # Phân loại điệu cảm thông báo UI
│       └── styles/
│           ├── index.css            # Entry point CSS (import Tailwind)
│           ├── tailwind.css         # Cấu hình Tailwind v4
│           └── theme.css            # Design tokens màu sắc chủ đề
│
├── backend/                         # API server (Node.js)
│   └── src/
│       ├── index.js                 # Entry point — khởi tạo HTTP server
│       ├── sqlDb.js                 # Đọc/ghi toàn bộ database PostgreSQL
│       ├── config/
│       │   └── constants.js         # Hằng số cấu hình hệ thống
│       ├── http/
│       │   └── respond.js           # Hàm tiện ích gửi HTTP response & đọc body
│       ├── routes/
│       │   ├── adminRoutes.js       # Routes quản trị viên
│       │   ├── authRoutes.js        # Đăng nhập, đăng ký, đăng xuất
│       │   ├── jockeyRoutes.js      # Routes dành cho jockey
│       │   ├── notificationRoutes.js # Routes thông báo
│       │   ├── ownerRoutes.js       # Routes dành cho chủ ngựa
│       │   ├── publicRoutes.js      # Routes công khai & bootstrap data
│       │   └── refereeRoutes.js     # Routes dành cho trọng tài
│       └── services/
│           ├── authService.js       # Xác thực token & phân quyền
│           ├── domainService.js     # Logic nghiệp vụ chính
│           ├── handicapService.js   # Tính điểm handicap
│           ├── liveRaceEvents.js    # SSE phát sóng cập nhật đua trực tiếp
│           └── notificationService.js # Tạo & gửi thông báo
│
├── database/
│   └── postgres/
│       ├── schema.sql               # Tạo bảng cơ sở dữ liệu
│       ├── seed.sql                 # Dữ liệu mẫu ban đầu
│       └── migrations/
│           └── 001_upgrade_existing_database.sql
│
├── docs/                            # Tài liệu thiết kế hệ thống
│   ├── erd.drawio                   # Sơ đồ ERD
│   ├── STD.drawio                   # State transition diagram
│   ├── race-state-diagram.drawio    # Sơ đồ trạng thái cuộc đua
│   ├── tournament-state-diagram.drawio
│   ├── schema-erd.md                # Mô tả ERD dạng markdown
│   ├── horse-racing-erd-explanation.xlsx
│   └── horse-racing-status-reference.docx
│
├── scripts/
│   └── run-postgres-file.mjs        # Script chạy file SQL lên PostgreSQL
│
├── ATTRIBUTIONS.md                  # Ghi nhận bản quyền thư viện bên thứ ba
├── .env.example                     # Mẫu cấu hình biến môi trường
├── .gitignore
└── package.json
```

---

## 👥 Vai trò người dùng

| Vai trò | Quyền hạn |
|---------|-----------|
| **Admin** | Tạo giải đấu, tạo cuộc đua, phê duyệt tài khoản/ngựa/jockey, xác nhận kết quả |
| **Owner** | Đăng ký ngựa, mời jockey, đăng ký tham gia giải đấu |
| **Jockey** | Tạo hồ sơ, đăng ký giải, chấp nhận/từ chối lời mời cưỡi ngựa |
| **Referee** | Điều hành cuộc đua, ghi kết quả, đánh dấu sẵn sàng/vắng mặt |
| **Spectator** | Xem thông tin công khai về giải đấu và kết quả |

---

## 🚀 Cài đặt & Chạy

### Yêu cầu

- Node.js >= 18
- PostgreSQL >= 14

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình biến môi trường

```bash
cp .env.example .env
```

Chỉnh sửa file `.env` với thông tin kết nối PostgreSQL của bạn.

### 3. Khởi tạo database

```bash
npm run db:init
```

Hoặc chạy thủ công với biến môi trường inline:

```bash
POSTGRES_HOST=127.0.0.1 \
POSTGRES_PORT=5432 \
POSTGRES_DATABASE=horse_racing \
POSTGRES_USER=postgres \
POSTGRES_PASSWORD=postgres \
npm run db:init
```

### 4. Chạy backend API

```bash
npm run api
```

API sẽ chạy tại: `http://127.0.0.1:4000`

### 5. Chạy frontend

```bash
npm run dev
```

Giao diện sẽ chạy tại: `http://127.0.0.1:5173`

---

## ⚙️ Biến môi trường

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `POSTGRES_HOST` | `127.0.0.1` | Host PostgreSQL |
| `POSTGRES_PORT` | `5432` | Port PostgreSQL |
| `POSTGRES_DATABASE` | `horse_racing` | Tên database |
| `POSTGRES_USER` | `postgres` | Tên tài khoản DB |
| `POSTGRES_PASSWORD` | `postgres` | Mật khẩu DB |
| `API_PORT` | `4000` | Port backend API |
| `API_HOST` | `127.0.0.1` | Host backend API |
| `FRONTEND_URL` | `http://127.0.0.1:5173/` | URL frontend |
| `VITE_API_URL` | `http://127.0.0.1:4000/api` | URL API cho frontend |
| `MAX_OWNER_HORSES` | `5` | Số ngựa tối đa mỗi owner |
| `MAX_RACE_FIELD_SIZE` | `10` | Số thí sinh tối đa mỗi race |
| `SESSION_DAYS` | `7` | Thời hạn phiên đăng nhập (ngày) |

> **Triển khai cloud (Neon / Render):** Dùng `DATABASE_URL` và đặt `POSTGRES_SSL=true` thay cho các biến riêng lẻ.

---

## 📦 Các lệnh npm

| Lệnh | Mô tả |
|------|-------|
| `npm run dev` | Chạy frontend ở chế độ development |
| `npm run api` | Chạy backend API server |
| `npm run db:init` | Tạo schema + nạp dữ liệu mẫu |
| `npm run db:schema` | Chỉ chạy schema (tạo bảng) |
| `npm run db:seed` | Chỉ nạp dữ liệu mẫu |
| `npm run build` | Build frontend production |
| `npm run preview` | Xem trước bản build production |

### Nâng cấp database (migration)

Nếu bạn đã có database cũ và muốn nâng cấp mà không mất dữ liệu:

```bash
node scripts/run-postgres-file.mjs database/postgres/migrations/001_upgrade_existing_database.sql
```

---

## 🔌 API Endpoints

### Xác thực
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/me` | Lấy thông tin người dùng hiện tại |
| `POST` | `/api/login` | Đăng nhập |
| `POST` | `/api/register` | Đăng ký tài khoản mới |
| `POST` | `/api/logout` | Đăng xuất |

### Dữ liệu chung
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/bootstrap` | Tải toàn bộ dữ liệu khởi động |
| `GET` | `/api/health` | Kiểm tra trạng thái server |
| `GET` | `/api/live/races/:id/events` | SSE stream theo dõi đua trực tiếp |

### Admin
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/admin/approvals` | Danh sách chờ phê duyệt |
| `POST` | `/api/admin/approvals/:type/:id` | Phê duyệt / từ chối |
| `POST` | `/api/admin/tournaments` | Tạo giải đấu |
| `POST` | `/api/admin/races` | Tạo cuộc đua |
| `POST` | `/api/admin/races/:id/:action` | Điều hành cuộc đua |

### Owner
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/owner/portal` | Portal chủ ngựa |
| `POST` | `/api/owner/horses` | Đăng ký ngựa mới |
| `POST` | `/api/owner/horses/:id` | Cập nhật thông tin ngựa |
| `POST` | `/api/owner/jockey-requests` | Gửi lời mời jockey |
| `POST` | `/api/owner/race-entries` | Đăng ký ngựa vào cuộc đua |

### Jockey
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/jockey/portal` | Portal jockey |
| `POST` | `/api/jockey/profile` | Lưu hồ sơ jockey |
| `POST` | `/api/jockey/tournament-registrations` | Đăng ký tham gia giải |
| `POST` | `/api/jockey/invitations/:id` | Phản hồi lời mời |

### Referee
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/api/referee/races/:id/start` | Bắt đầu cuộc đua |
| `POST` | `/api/referee/races/:id/submit-results` | Nộp kết quả |
| `POST` | `/api/referee/race-entries/:id/ready` | Đánh dấu sẵn sàng |
| `POST` | `/api/referee/race-entries/:id/absent` | Đánh dấu vắng mặt |
| `POST` | `/api/referee/race-entries/:id/result` | Ghi kết quả thí sinh |

### Thông báo
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/notifications` | Danh sách thông báo |
| `POST` | `/api/notifications/:id/read` | Đánh dấu đã đọc |
