# 🏇 Horse Racing Tournament Website

Hệ thống quản lý giải đua ngựa trực tuyến — cho phép admin tạo giải đấu, chủ ngựa đăng ký tham gia, jockey nhận lời mời, trọng tài điều hành cuộc đua và ghi kết quả theo thời gian thực.

## 📋 Mục lục

- [Tính năng](#-tính-năng)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Vai trò người dùng](#-vai-trò-người-dùng)
- [Quy trình nghiệp vụ](#-quy-trình-nghiệp-vụ)
- [Cơ chế Rating và Handicap](#-cơ-chế-rating-và-handicap)
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
- **Kết quả & thành tích**: Xem lịch sử kết quả và thành tích các cuộc đua

---

## 🛠 Công nghệ sử dụng

| Tầng | Công nghệ |
|------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js (ESM), **Hono** web framework |
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
│       │   │   ├── RaceDetails.tsx      # Chi tiết cuộc đua
│       │   │   ├── RaceRegistrationPage.tsx # Đăng ký tham gia đua
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
│           └── index.css            # Entry point CSS (Tailwind)
│
├── backend/                         # API server (Node.js)
│   └── src/
│       ├── app.js                   # Khởi tạo Hono app để chạy và test
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
│       └── seed.sql                 # Dữ liệu mẫu ban đầu
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
├── .env.example                     # Mẫu cấu hình biến môi trường
├── .gitignore
└── package.json
```

---

## 👥 Vai trò người dùng

| Vai trò | Quyền hạn |
|---------|-----------|
| **Admin** | Tạo giải đấu/race, phê duyệt đăng ký, đóng đăng ký và publish race |
| **Owner** | Tạo hồ sơ ngựa, đăng ký ngựa vào từng race đang mở, mời jockey |
| **Jockey** | Tạo hồ sơ, đăng ký availability theo từng race, chấp nhận/từ chối lời mời cưỡi ngựa |
| **Referee** | Check-in, đánh dấu sẵn sàng/vắng mặt/sự cố, ghi kết quả nháp và nộp cho Admin duyệt |
| **Spectator** | Xem thông tin công khai về giải đấu và kết quả |

---

## 🔁 Quy trình nghiệp vụ

Tài liệu nghiệp vụ chi tiết nằm tại [docs/business-flow-and-roles.md](docs/business-flow-and-roles.md).

Luồng chính:

1. Admin tạo Tournament và các Race thuộc Tournament.
2. Mỗi Race có cửa sổ đăng ký riêng.
3. Owner đăng ký Horse vào Race đang mở.
4. Jockey đăng ký availability theo Race hoặc nhận lời mời từ Owner.
5. Admin duyệt Horse race registration / Owner-Jockey pairing.
6. Khi đóng đăng ký, hệ thống snapshot rating, tính assigned weight, random lane và tạo start list.
7. Admin publish start list.
8. Referee check-in từng entry.
9. Admin start và finish Race.
10. Referee ghi kết quả nháp và submit cho Admin review.
11. Admin duyệt kết quả official; hệ thống cập nhật Horse Rating và chuyển Race sang Completed.

Trạng thái được tách riêng:

| Nhóm trạng thái | Ý nghĩa |
|-----------------|---------|
| Race Lifecycle | `draft`, `registration-open`, `registration-closed`, `published`, `in-progress`, `finished`, `completed`, `cancelled` |
| Registration Approval | `pending-jockey`, `pending-admin`, `approved`, `rejected`, `cancelled` |
| Race Entry | `approved`, `scratched` |
| Check-in | `pending`, `ready`, `absent`, `incident`, `scratched` |
| Result | `draft`, `submitted`, `official`, `disqualified` |

Trong implementation hiện tại, `Check-in` được biểu diễn bằng Race `published` cộng với `preRaceStatus` của từng entry; `Results Submitted` được biểu diễn bằng Race `finished` cộng với `resultStatus = submitted`.

---

## 📊 Cơ chế Rating và Handicap

Đây là cơ chế minh bạch do hệ thống định nghĩa để phục vụ tournament. Nó không phải công thức rating chính thức của HKJC.

### 1. Rating ban đầu

Khi ngựa chưa có `overallRating` chính thức, rating ban đầu được tính từ hồ sơ:

```text
Initial Rating =
  Speed × 35%
  + Stamina × 25%
  + Form × 30%
  + Health × 10%
```

Kết quả được làm tròn và giới hạn trong khoảng `0-140`. Sau khi ngựa đã thi đấu, `overallRating` là rating chính thức và các thuộc tính hồ sơ không tự ghi đè rating này.

### 2. Rating snapshot trước race

Admin chỉ được đóng registration khi đủ đúng `MAX_RACE_FIELD_SIZE` cặp ngựa-jockey khác nhau đã được duyệt, mặc định là `10`.

Khi đóng registration, hệ thống lưu rating hiện tại của từng ngựa vào `ratingSnapshot`. Mọi phép tính sau race sử dụng snapshot này để tránh việc rating bị thay đổi trong lúc race đang diễn ra.

### 3. Expected Score

Mỗi ngựa được so sánh lần lượt với các đối thủ có kết quả hợp lệ:

```text
Expected với một đối thủ =
  1 / (1 + 10 ^ ((Rating đối thủ - Rating ngựa) / 16))

Expected Score =
  Trung bình Expected của tất cả đối thủ
```

Ý nghĩa:

- `0.50`: hai bên có rating tương đương.
- Nhỏ hơn `0.50`: ngựa đang bị đánh giá yếu hơn field.
- Lớn hơn `0.50`: ngựa đang được đánh giá mạnh hơn field.

Ví dụ, ngựa rating `65` gặp đối thủ rating `70` có Expected khoảng `0.33`.

### 4. Actual Score và Rating Change

Actual Score được chuẩn hóa theo vị trí về đích:

```text
Actual Score = (Field Size - Position) / (Field Size - 1)
```

Trong field 10 ngựa, hạng nhất có Actual `1.00`, hạng cuối có Actual `0.00`.

```text
Raw Rating Change =
  10 × (Actual Score - Expected Score) × Field Factor

Rating Change = round(clamp(Raw Rating Change, -8, +8))
Post-race Rating = clamp(Rating Snapshot + Rating Change, 0, 140)
```

`Field Size` chỉ tính ngựa thực sự có kết quả; ngựa `absent` hoặc `disqualified` không tham gia phép tính.

| Số ngựa có kết quả | Field Factor |
|---:|---:|
| 8-10 | `1.00` |
| 6-7 | `0.75` |
| 4-5 | `0.50` |
| Dưới 4 | Không thay đổi rating |

Với 10 ngựa có rating bằng nhau, Rating Change lần lượt là:

| Vị trí | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Thay đổi | +5 | +4 | +3 | +2 | +1 | -1 | -2 | -3 | -4 | -5 |

Ngựa rating `65` thắng chín đối thủ rating `70` nhận khoảng `+7`, vì kết quả thực tế cao hơn đáng kể so với Expected Score.

Rating chỉ được ghi vào `horse.overallRating` sau khi Referee nộp kết quả và Admin chọn **Approve Results / Complete Race**.

### 5. Assigned Weight / Handicap

Handicap là trọng lượng được chỉ định cho race, tính bằng pound (`lb`), không phải trọng lượng cơ thể của ngựa.

```text
Assigned Weight =
  Handicap Max - (Top Rating trong field - Rating của ngựa)

Assigned Weight = clamp(Assigned Weight, Handicap Min, Handicap Max)
```

Quy tắc chính:

- Ngựa có rating cao nhất mang `Handicap Max`.
- Thấp hơn `1` điểm rating thì giảm `1 lb`.
- Không được thấp hơn `Handicap Min`.
- Kết quả được làm tròn về pound nguyên.

Ví dụ race có khoảng `115-135 lb`, top rating là `90`:

| Rating | Assigned Weight |
|---:|---:|
| 90 | 135 lb |
| 85 | 130 lb |
| 80 | 125 lb |
| 60 | 115 lb do chạm mức tối thiểu |

Khoảng trọng lượng mặc định:

| Race Class | Rating hợp lệ | Handicap Min-Max |
|---|---:|---:|
| Class 1 | 101-140 | 115-135 lb |
| Class 2 | 81-100 | 115-135 lb |
| Class 3 | 61-80 | 113-133 lb |
| Class 4 | 41-60 | 112-132 lb |
| Class 5 | 0-40 | 110-130 lb |
| Open | 0-140 | 110-135 lb |

`Jockey Weight` và `Horse Weight` là dữ liệu riêng để hiển thị. Phiên bản hiện tại chưa tự tính ballast hoặc kiểm tra tổng jockey + equipment có bằng Assigned Weight hay không.

Source of truth: `backend/src/services/handicapService.js`.

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
| `MAX_OWNER_HORSES` | `10` | Số ngựa tối đa mỗi owner |
| `MAX_RACE_FIELD_SIZE` | `10` | Số thí sinh tối đa mỗi race |
| `MAX_TOURNAMENT_RACES` | `10` | Số race tối đa mỗi giải |
| `SESSION_DAYS` | `7` | Thời hạn phiên đăng nhập (ngày) |
| `SESSION_COOKIE_NAME` | `horse-racing-session` | Tên cookie phiên đăng nhập |
| `COOKIE_SECURE` | Production: `true` | Chỉ gửi cookie qua HTTPS |
| `COOKIE_SAME_SITE` | `Lax` | Chính sách SameSite của cookie |

> **Triển khai cloud:** Backend dùng `DATABASE_URL` và `POSTGRES_SSL=true`. Frontend production gọi `/api`; `vercel.json` proxy API qua Render để cookie `HttpOnly` vẫn là first-party trên Safari.

---

## 📦 Các lệnh npm

| Lệnh | Mô tả |
|------|-------|
| `npm run dev` | Chạy frontend ở chế độ development |
| `npm run api` | Chạy backend API server |
| `npm run db:init` | Tạo schema + nạp dữ liệu mẫu |
| `npm run db:schema` | Chỉ chạy schema (tạo bảng) |
| `npm run db:seed` | Chỉ nạp dữ liệu mẫu |
| `npm test` | Chạy test nghiệp vụ backend |
| `npm run typecheck` | Kiểm tra TypeScript |
| `npm run check` | Chạy typecheck, test và production build |
| `npm run build` | Build frontend production |
| `npm run preview` | Xem trước bản build production |

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
| `PATCH` | `/api/admin/races/:id` | Sửa lịch race chưa publish |
| `POST` | `/api/admin/races/:id/:action` | Đóng đăng ký, publish, bắt đầu, kết thúc hoặc hoàn tất race |

### Owner
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/owner/portal` | Portal chủ ngựa |
| `POST` | `/api/owner/horses` | Đăng ký ngựa mới |
| `POST` | `/api/owner/horses/:id` | Cập nhật thông tin ngựa |
| `POST` | `/api/owner/race-registrations` | Đăng ký ngựa vào cuộc đua |

### Jockey
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/jockey/portal` | Portal jockey |
| `POST` | `/api/jockey/profile` | Lưu hồ sơ jockey |
| `POST` | `/api/jockey/race-registrations` | Đăng ký tham gia race |
| `POST` | `/api/jockey/invitations/:id` | Phản hồi lời mời |

### Referee
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/api/referee/races/:id/submit-results` | Nộp kết quả nháp để Admin duyệt chính thức |
| `POST` | `/api/referee/race-entries/:id/readiness/ready` | Đánh dấu sẵn sàng |
| `POST` | `/api/referee/race-entries/:id/readiness/absent` | Đánh dấu vắng mặt |
| `POST` | `/api/referee/race-entries/:id/readiness/incident` | Đánh dấu sự cố cần xử lý trước khi start |
| `POST` | `/api/referee/race-entries/:id/readiness/scratched` | Gạch khỏi danh sách runner active |
| `POST` | `/api/referee/race-entries/:id/result` | Ghi kết quả thí sinh |

### Thông báo
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/notifications` | Danh sách thông báo |
| `POST` | `/api/notifications/:id/read` | Đánh dấu đã đọc |
