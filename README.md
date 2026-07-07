# 🏇 Hệ thống quản lý giải đua ngựa

Ứng dụng quản lý giải đua ngựa trực tuyến. Hệ thống hỗ trợ quản trị viên tạo giải và cuộc đua, chủ ngựa đăng ký ngựa theo từng cuộc đua, jockey xác nhận lời mời, trọng tài kiểm tra trước giờ chạy và ghi kết quả, sau đó quản trị viên duyệt kết quả chính thức.

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
- [API](#-api)

---

## ✨ Tính năng

- **Quản lý giải đấu**: Quản trị viên tạo giải đấu, tạo nhiều cuộc đua trong cùng giải và phân công trọng tài.
- **Đăng ký ngựa theo từng cuộc đua**: Chủ ngựa chỉ đăng ký ngựa vào các cuộc đua đang mở đăng ký.
- **Ghép cặp ngựa - jockey**: Jockey đăng ký khả dụng hoặc nhận lời mời từ chủ ngựa; quản trị viên duyệt cặp cuối cùng.
- **Phân quyền đa vai trò**: Quản trị viên, chủ ngựa, jockey, trọng tài và khán giả có giao diện riêng.
- **Theo dõi cuộc đua trực tiếp**: Cập nhật trạng thái cuộc đua theo thời gian thực qua Server-Sent Events (SSE).
- **Tính handicap và rating**: Lưu rating trước cuộc đua, tính trọng lượng được chỉ định, cập nhật rating sau khi kết quả được duyệt chính thức.
- **Hồ sơ công khai**: Mọi vai trò có thể xem hồ sơ ngựa, hồ sơ jockey, lịch sử đua và kết quả.
- **Thông báo nội bộ**: Gửi thông báo theo từng vai trò khi có lời mời, phê duyệt hoặc thay đổi trạng thái.

---

## 🛠 Công nghệ sử dụng

| Tầng | Công nghệ |
|------|-----------|
| Giao diện | React 18, TypeScript, Vite, Tailwind CSS |
| Máy chủ API | Node.js (ESM), Hono |
| Cơ sở dữ liệu | PostgreSQL |
| Biểu tượng giao diện | Lucide React |
| Điều hướng | React Router DOM v7 |

---

## 📁 Cấu trúc dự án

```text
Horse Racing Tournament Website/
├── frontend/                         # Phần giao diện người dùng
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── src/
│       ├── App.tsx                   # Điều hướng trang và kiểm tra phiên đăng nhập
│       ├── main.tsx                  # Điểm khởi chạy React
│       ├── app/
│       │   ├── components/           # Các trang chính của hệ thống
│       │   │   ├── AdminPanel.tsx          # Bảng quản trị: duyệt hồ sơ, tạo giải, tạo cuộc đua
│       │   │   ├── CreateRacePage.tsx      # Form tạo hoặc chỉnh sửa cuộc đua
│       │   │   ├── Footer.tsx              # Chân trang
│       │   │   ├── HorseDetails.tsx        # Hồ sơ chi tiết của một ngựa và lịch sử đua
│       │   │   ├── HorseDirectoryPage.tsx  # Danh bạ hồ sơ ngựa cho mọi vai trò
│       │   │   ├── HorseManagement.tsx     # Chủ ngựa quản lý danh sách ngựa của mình
│       │   │   ├── JockeyDirectoryPage.tsx # Danh bạ hồ sơ jockey cho mọi vai trò
│       │   │   ├── JockeyPage.tsx          # Cổng jockey: cập nhật hồ sơ, nhận lời mời
│       │   │   ├── LandingPage.tsx         # Trang giới thiệu trước khi đăng nhập
│       │   │   ├── LiveRace.tsx            # Theo dõi và thao tác cuộc đua trực tiếp
│       │   │   ├── LoginPage.tsx           # Đăng nhập và đăng ký tài khoản
│       │   │   ├── Navbar.tsx              # Thanh điều hướng theo vai trò
│       │   │   ├── RaceDetails.tsx         # Race card, danh sách xuất phát và thông tin cuộc đua
│       │   │   ├── RaceRegistrationPage.tsx # Chủ ngựa đăng ký ngựa vào cuộc đua
│       │   │   ├── RegisterHorsePage.tsx   # Tạo hoặc chỉnh sửa hồ sơ ngựa
│       │   │   ├── ResultsPage.tsx         # Tra cứu kết quả chính thức
│       │   │   ├── TournamentDetails.tsx   # Thông tin chi tiết giải đấu
│       │   │   └── TournamentPage.tsx      # Danh sách giải đấu và lịch các cuộc đua
│       │   ├── services/
│       │   │   └── api.ts            # Kiểu dữ liệu và hàm gọi API
│       │   └── utils/
│       │       ├── domain.ts         # Định dạng trạng thái và đơn vị hiển thị
│       │       └── messageTone.ts    # Chọn màu thông báo thành công/lỗi/cảnh báo
│       └── styles/
│           └── index.css             # CSS đầu vào cho Tailwind
│
├── backend/                          # Phần máy chủ API
│   └── src/
│       ├── app.js                    # Khởi tạo ứng dụng Hono để chạy và test
│       ├── index.js                  # Khởi động HTTP server
│       ├── sqlDb.js                  # Đọc/ghi dữ liệu PostgreSQL
│       ├── config/
│       │   └── constants.js          # Hằng số cấu hình hệ thống
│       ├── http/
│       │   └── respond.js            # Tiện ích đọc request và trả response
│       ├── routes/
│       │   ├── adminRoutes.js        # API cho quản trị viên
│       │   ├── authRoutes.js         # API đăng nhập, đăng ký, đăng xuất
│       │   ├── jockeyRoutes.js       # API cho jockey
│       │   ├── notificationRoutes.js # API thông báo
│       │   ├── ownerRoutes.js        # API cho chủ ngựa
│       │   ├── publicRoutes.js       # API dữ liệu công khai và dữ liệu khởi động
│       │   └── refereeRoutes.js      # API cho trọng tài
│       └── services/
│           ├── authService.js        # Xác thực phiên đăng nhập và phân quyền
│           ├── domainService.js      # Hàm nghiệp vụ dùng chung
│           ├── handicapService.js    # Tính rating sau đua và trọng lượng handicap
│           ├── liveRaceEvents.js     # Phát sự kiện cuộc đua trực tiếp qua SSE
│           ├── notificationService.js # Tạo thông báo trong hệ thống
│           └── raceAuditService.js   # Ghi log kiểm tra trạng thái cuộc đua
│
├── database/
│   └── postgres/
│       ├── schema.sql               # Tạo bảng cơ sở dữ liệu
│       └── seed.sql                 # Dữ liệu mẫu ban đầu
│
├── docs/                             # Tài liệu thiết kế và nghiệp vụ
│   ├── erd.drawio                   # Sơ đồ ERD
│   ├── STD.drawio                   # Sơ đồ chuyển trạng thái tổng quát
│   ├── business-flow-and-roles.md   # Luồng nghiệp vụ và quyền từng vai trò
│   ├── race-state-diagram.drawio    # Sơ đồ trạng thái cuộc đua
│   ├── tournament-state-diagram.drawio # Sơ đồ trạng thái giải đấu
│   ├── schema-erd.md                 # Mô tả ERD dạng Markdown
│   ├── horse-racing-erd-explanation.xlsx # Giải thích ERD
│   └── horse-racing-status-reference.docx # Bảng tham chiếu trạng thái
│
├── scripts/
│   └── run-postgres-file.mjs         # Chạy file SQL lên PostgreSQL
│
├── .env.example                      # Mẫu biến môi trường
├── .gitignore
└── package.json
```

---

## 👥 Vai trò người dùng

| Vai trò | Quyền hạn |
|---------|-----------|
| **Admin** | Tạo giải đấu, tạo cuộc đua, chọn hạng đua, phân công trọng tài, duyệt hồ sơ và duyệt kết quả chính thức |
| **Owner** | Tạo hồ sơ ngựa, đăng ký ngựa vào từng cuộc đua đang mở, chọn hoặc mời jockey phù hợp |
| **Jockey** | Công bố hồ sơ cá nhân, đăng ký khả dụng theo cuộc đua, chấp nhận hoặc từ chối lời mời cưỡi ngựa |
| **Referee** | Kiểm tra trước cuộc đua, đánh dấu sẵn sàng/vắng mặt/sự cố, ghi kết quả nháp và nộp cho Admin duyệt |
| **Spectator** | Xem giải đấu, race card, hồ sơ ngựa, hồ sơ jockey, trạng thái trực tiếp và kết quả |

---

## 🔁 Quy trình nghiệp vụ

Tài liệu nghiệp vụ chi tiết nằm tại [docs/business-flow-and-roles.md](docs/business-flow-and-roles.md).

Luồng chính:

1. Admin tạo một giải đấu.
2. Admin tạo nhiều cuộc đua thuộc giải đấu đó, ví dụ 10 cuộc đua.
3. Mỗi cuộc đua có vòng đời đăng ký riêng, không đăng ký chung cho toàn giải.
4. Admin mở đăng ký cho từng cuộc đua.
5. Owner đăng ký một ngựa đã được duyệt vào cuộc đua đang mở.
6. Jockey đăng ký khả dụng cho cùng cuộc đua, hoặc Owner mời một jockey đang khả dụng.
7. Jockey chấp nhận hoặc từ chối lời mời cưỡi ngựa.
8. Admin duyệt đăng ký ngựa hoặc duyệt cặp Owner - Jockey.
9. Khi đóng đăng ký, hệ thống lưu rating hiện tại, tính trọng lượng được chỉ định, bốc cổng chạy và tạo danh sách xuất phát.
10. Admin công bố danh sách xuất phát.
11. Referee kiểm tra từng entry được phân công, gồm ngựa, jockey, trang bị và điều kiện sẵn sàng.
12. Referee đánh dấu từng thí sinh là sẵn sàng, vắng mặt, gạch khỏi danh sách hoặc có sự cố.
13. Admin bắt đầu cuộc đua khi các entry đã được kiểm tra và có ít nhất một thí sinh sẵn sàng.
14. Admin kết thúc cuộc đua.
15. Referee ghi vị trí về đích, thời gian, ghi chú, vi phạm và hình phạt nếu có.
16. Referee nộp kết quả nháp cho Admin xem xét.
17. Admin duyệt kết quả chính thức.
18. Hệ thống cập nhật rating của ngựa từ kết quả chính thức.
19. Cuộc đua chuyển sang trạng thái hoàn tất.

Trạng thái được tách riêng:

| Nhóm trạng thái | Trạng thái trong hệ thống |
|-----------------|---------------------------|
| Vòng đời cuộc đua | `draft`, `registration-open`, `registration-closed`, `published`, `in-progress`, `finished`, `completed`, `cancelled` |
| Phê duyệt đăng ký | `pending-jockey`, `pending-admin`, `approved`, `rejected`, `cancelled` |
| Entry trong danh sách xuất phát | `approved`, `scratched` |
| Kiểm tra trước cuộc đua | `pending`, `ready`, `absent`, `incident`, `scratched` |
| Kết quả | `draft`, `submitted`, `official`, `disqualified` |

Ghi chú triển khai: bước kiểm tra trước cuộc đua được biểu diễn bằng trạng thái Race `published` kết hợp với `preRaceStatus` của từng entry. Bước nộp kết quả nháp được biểu diễn bằng Race `finished` kết hợp với `resultStatus = submitted`.

---

## 📊 Cơ chế Rating và Handicap

Đây là cơ chế minh bạch do hệ thống định nghĩa để phục vụ giải đấu. Nó không phải công thức rating chính thức của HKJC.

### 1. Rating ban đầu

Khi ngựa chưa có `overallRating` chính thức, rating ban đầu được tính từ hồ sơ:

```text
Rating ban đầu =
  Tốc độ × 35%
  + Sức bền × 25%
  + Phong độ × 30%
  + Sức khỏe × 10%
```

Kết quả được làm tròn và giới hạn trong khoảng `0-140`. Sau khi ngựa đã thi đấu, `overallRating` là rating chính thức và các thuộc tính hồ sơ không tự ghi đè rating này.

### 2. Rating snapshot trước cuộc đua

Admin chỉ được đóng đăng ký khi đủ đúng `MAX_RACE_FIELD_SIZE` cặp ngựa - jockey khác nhau đã được duyệt, mặc định là `10`.

Khi đóng đăng ký, hệ thống lưu rating hiện tại của từng ngựa vào `ratingSnapshot`. Mọi phép tính sau cuộc đua sử dụng snapshot này để tránh việc rating bị thay đổi trong lúc cuộc đua đang diễn ra.

### 3. Điểm kỳ vọng

Mỗi ngựa được so sánh lần lượt với các đối thủ có kết quả hợp lệ:

```text
Điểm kỳ vọng với một đối thủ =
  1 / (1 + 10 ^ ((Rating đối thủ - Rating ngựa) / 16))

Điểm kỳ vọng chung =
  Trung bình điểm kỳ vọng của tất cả đối thủ
```

Ý nghĩa:

- `0.50`: hai bên có rating tương đương.
- Nhỏ hơn `0.50`: ngựa đang bị đánh giá yếu hơn nhóm đua.
- Lớn hơn `0.50`: ngựa đang được đánh giá mạnh hơn nhóm đua.

Ví dụ, ngựa rating `65` gặp đối thủ rating `70` có điểm kỳ vọng khoảng `0.33`.

### 4. Điểm thực tế và thay đổi rating

Điểm thực tế được chuẩn hóa theo vị trí về đích:

```text
Điểm thực tế = (Số ngựa có kết quả - Vị trí) / (Số ngựa có kết quả - 1)
```

Trong cuộc đua có 10 ngựa hợp lệ, hạng nhất có điểm thực tế `1.00`, hạng cuối có điểm thực tế `0.00`.

```text
Mức thay đổi rating thô =
  10 × (Điểm thực tế - Điểm kỳ vọng chung) × Hệ số số lượng ngựa

Rating Change = round(clamp(Mức thay đổi rating thô, -8, +8))
Rating sau cuộc đua = clamp(Rating Snapshot + Rating Change, 0, 140)
```

Số ngựa có kết quả chỉ tính các ngựa thật sự có kết quả hợp lệ; ngựa `absent` hoặc `disqualified` không tham gia phép tính.

| Số ngựa có kết quả | Hệ số |
|---:|---:|
| 8-10 | `1.00` |
| 6-7 | `0.75` |
| 4-5 | `0.50` |
| Dưới 4 | Không thay đổi rating |

Với 10 ngựa có rating bằng nhau, mức thay đổi rating lần lượt là:

| Vị trí | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Thay đổi | +5 | +4 | +3 | +2 | +1 | -1 | -2 | -3 | -4 | -5 |

Ngựa rating `65` thắng chín đối thủ rating `70` nhận khoảng `+7`, vì kết quả thực tế cao hơn đáng kể so với điểm kỳ vọng.

Rating chỉ được ghi vào `horse.overallRating` sau khi Referee nộp kết quả nháp và Admin duyệt kết quả chính thức.

### 5. Trọng lượng được chỉ định / Handicap

Handicap là trọng lượng được chỉ định cho cuộc đua, tính bằng pound (`lb`), không phải trọng lượng cơ thể của ngựa.

```text
Trọng lượng được chỉ định =
  Handicap Max - (Rating cao nhất trong cuộc đua - Rating của ngựa)

Trọng lượng được chỉ định = clamp(Trọng lượng được chỉ định, Handicap Min, Handicap Max)
```

Quy tắc chính:

- Ngựa có rating cao nhất mang mức `Handicap Max`.
- Thấp hơn `1` điểm rating thì giảm `1 lb`.
- Không được thấp hơn `Handicap Min`.
- Kết quả được làm tròn về pound nguyên.

Ví dụ cuộc đua có khoảng `115-135 lb`, rating cao nhất là `90`:

| Rating | Trọng lượng được chỉ định |
|---:|---:|
| 90 | 135 lb |
| 85 | 130 lb |
| 80 | 125 lb |
| 60 | 115 lb do chạm mức tối thiểu |

Khoảng trọng lượng mặc định:

| Hạng đua | Rating hợp lệ | Handicap Min-Max |
|---|---:|---:|
| Class 1 | 101-140 | 115-135 lb |
| Class 2 | 81-100 | 115-135 lb |
| Class 3 | 61-80 | 113-133 lb |
| Class 4 | 41-60 | 112-132 lb |
| Class 5 | 0-40 | 110-130 lb |
| Open | 0-140 | 110-135 lb |

`Jockey Weight` và `Horse Weight` là dữ liệu riêng để hiển thị. Phiên bản hiện tại chưa tự tính ballast hoặc kiểm tra tổng trọng lượng jockey + trang bị có bằng trọng lượng được chỉ định hay không.

Nguồn xử lý chính: `backend/src/services/handicapService.js`.

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

## 🔌 API

### Xác thực
| Phương thức | Đường dẫn | Mô tả |
|--------|----------|-------|
| `GET` | `/api/me` | Lấy thông tin người dùng hiện tại |
| `POST` | `/api/login` | Đăng nhập |
| `POST` | `/api/register` | Đăng ký tài khoản mới |
| `POST` | `/api/logout` | Đăng xuất |

### Dữ liệu chung
| Phương thức | Đường dẫn | Mô tả |
|--------|----------|-------|
| `GET` | `/api/bootstrap` | Tải toàn bộ dữ liệu khởi động |
| `GET` | `/api/health` | Kiểm tra trạng thái server |
| `GET` | `/api/live/races/:id/events` | Luồng SSE theo dõi cuộc đua trực tiếp |

### Quản trị viên
| Phương thức | Đường dẫn | Mô tả |
|--------|----------|-------|
| `GET` | `/api/admin/approvals` | Danh sách chờ phê duyệt |
| `POST` | `/api/admin/approvals/:type/:id` | Phê duyệt / từ chối |
| `POST` | `/api/admin/tournaments` | Tạo giải đấu |
| `POST` | `/api/admin/races` | Tạo cuộc đua |
| `PATCH` | `/api/admin/races/:id` | Sửa lịch cuộc đua chưa công bố |
| `POST` | `/api/admin/races/:id/:action` | Đóng đăng ký, công bố, bắt đầu, kết thúc hoặc hoàn tất cuộc đua |

### Chủ ngựa
| Phương thức | Đường dẫn | Mô tả |
|--------|----------|-------|
| `GET` | `/api/owner/portal` | Cổng làm việc của chủ ngựa |
| `POST` | `/api/owner/horses` | Đăng ký ngựa mới |
| `POST` | `/api/owner/horses/:id` | Cập nhật thông tin ngựa |
| `POST` | `/api/owner/race-registrations` | Đăng ký ngựa vào cuộc đua |

### Jockey
| Phương thức | Đường dẫn | Mô tả |
|--------|----------|-------|
| `GET` | `/api/jockey/portal` | Cổng làm việc của jockey |
| `POST` | `/api/jockey/profile` | Lưu hồ sơ jockey |
| `POST` | `/api/jockey/race-registrations` | Đăng ký tham gia cuộc đua |
| `POST` | `/api/jockey/invitations/:id` | Phản hồi lời mời |

### Trọng tài
| Phương thức | Đường dẫn | Mô tả |
|--------|----------|-------|
| `POST` | `/api/referee/races/:id/submit-results` | Nộp kết quả nháp để Admin duyệt chính thức |
| `POST` | `/api/referee/race-entries/:id/readiness/ready` | Đánh dấu sẵn sàng |
| `POST` | `/api/referee/race-entries/:id/readiness/absent` | Đánh dấu vắng mặt |
| `POST` | `/api/referee/race-entries/:id/readiness/incident` | Đánh dấu sự cố cần xử lý trước khi bắt đầu |
| `POST` | `/api/referee/race-entries/:id/readiness/scratched` | Gạch khỏi danh sách thí sinh đang chạy |
| `POST` | `/api/referee/race-entries/:id/result` | Ghi kết quả thí sinh |

### Thông báo
| Phương thức | Đường dẫn | Mô tả |
|--------|----------|-------|
| `GET` | `/api/notifications` | Danh sách thông báo |
| `POST` | `/api/notifications/:id/read` | Đánh dấu đã đọc |
