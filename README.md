# Hệ thống quản lý giải đua ngựa

Ứng dụng web quản lý giải đua ngựa theo vai trò. Hệ thống cho phép admin tạo giải và cuộc đua, owner đăng ký ngựa, jockey đăng ký hoặc nhận lời mời, referee kiểm tra trước giờ chạy và ghi kết quả, sau đó admin duyệt kết quả chính thức để cập nhật rating.

## Tổng quan nhanh

- Frontend: React 18 + TypeScript + Vite + Tailwind CSS.
- Backend: Node.js ESM + Hono.
- Database: PostgreSQL.
- Auth: session cookie `HttpOnly`.
- Realtime: Server-Sent Events cho màn hình live race.
- Deployment: frontend dùng `vercel.json` rewrite `/api` sang backend render.

## Mục lục

- [Tính năng](#tính-năng)
- [Kiến trúc](#kiến-trúc)
- [Công nghệ](#công-nghệ)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Vai trò người dùng](#vai-trò-người-dùng)
- [Quy trình nghiệp vụ](#quy-trình-nghiệp-vụ)
- [Rating và Handicap](#rating-và-handicap)
- [Cài đặt & Chạy](#cài-đặt--chạy)
- [Biến môi trường](#biến-môi-trường)
- [Scripts](#scripts)
- [API chính](#api-chính)
- [Tài liệu liên quan](#tài-liệu-liên-quan)

## Tính năng

- Quản lý giải đấu, nhiều cuộc đua trong cùng một giải, và phân công referee.
- Đăng ký ngựa theo từng race, không dùng đăng ký chung cho cả giải.
- Ghép cặp owner - jockey theo từng race hoặc qua lời mời.
- Phân quyền rõ theo 5 vai trò: admin, owner, jockey, referee, spectator.
- Theo dõi cuộc đua trực tiếp bằng SSE.
- Tính rating và handicap theo luật nội bộ của dự án.
- Xem hồ sơ ngựa, hồ sơ jockey, lịch sử race và kết quả công khai.
- Gửi thông báo nội bộ khi có đăng ký, phê duyệt, hay đổi trạng thái.

## Kiến trúc

Luồng dữ liệu chính của app:

1. Browser tải React frontend.
2. Frontend gọi `/api/bootstrap` để lấy dữ liệu tổng hợp ban đầu.
3. Người dùng thao tác trên UI theo vai trò.
4. Frontend gọi API Hono để ghi vào PostgreSQL.
5. Một số thay đổi phát SSE để cập nhật màn live race.
6. Kết quả chính thức được duyệt thì backend cập nhật rating và trạng thái hoàn tất.

Frontend hiện được tách rõ hơn để dễ đọc:

- [`frontend/src/App.tsx`](frontend/src/App.tsx) chỉ giữ shell, auth guard và render khung chính.
- [`frontend/src/app/routing.ts`](frontend/src/app/routing.ts) chứa map page, role và helper redirect.
- [`frontend/src/app/AppRoutes.tsx`](frontend/src/app/AppRoutes.tsx) chứa toàn bộ route tree.

Backend được chia theo lớp:

- `routes/`: API theo domain hoặc theo vai trò.
- `services/`: nghiệp vụ dùng chung.
- `sqlDb.js`: đọc/ghi PostgreSQL và chuẩn hoá dữ liệu trả về cho frontend.

## Công nghệ

| Tầng | Công nghệ |
|---|---|
| UI | React 18, TypeScript, Vite, Tailwind CSS |
| Router | React Router DOM v7 |
| API | Node.js ESM, Hono |
| DB | PostgreSQL |
| Biểu tượng | Lucide React |
| Chart | Recharts |

## Cấu trúc dự án

```text
Horse Racing Tournament Website/
├── frontend/                         # Phần giao diện React chạy trên trình duyệt.
│   ├── index.html                    # File HTML gốc để Vite gắn React app vào.
│   ├── vite.config.ts                # Cấu hình Vite: build, dev server và plugin React.
│   ├── tailwind.config.js            # Cấu hình Tailwind CSS cho style toàn frontend.
│   └── src/                          # Source chính của frontend.
│       ├── App.tsx                   # Shell chính: auth guard, layout và khung render app.
│       ├── main.tsx                  # Điểm khởi động React, mount App vào index.html.
│       └── app/                      # Code nghiệp vụ frontend sau khi tách khỏi root src.
│           ├── AppRoutes.tsx         # Định nghĩa toàn bộ route/page được render theo trạng thái.
│           ├── routing.ts            # Map page, role được phép vào và helper redirect.
│           ├── components/           # Các màn hình và component giao diện theo nghiệp vụ.
│           │   ├── AdminPanel.tsx             # Dashboard admin: duyệt hồ sơ, quản lý race, user, settings.
│           │   ├── CreateRacePage.tsx         # Form tạo race mới trong tournament.
│           │   ├── EditRacePage.tsx           # Form sửa race chưa công bố hoặc reset race bị huỷ.
│           │   ├── Footer.tsx                 # Footer chung của website.
│           │   ├── HorseDetails.tsx           # Trang chi tiết hồ sơ ngựa, rating và lịch sử race.
│           │   ├── HorseDirectoryPage.tsx     # Danh sách ngựa công khai để xem và lọc.
│           │   ├── HorseManagement.tsx        # Khu owner quản lý ngựa của mình.
│           │   ├── JockeyDirectoryPage.tsx    # Danh sách jockey công khai.
│           │   ├── JockeyPage.tsx             # Portal jockey: hồ sơ, đăng ký race, lời mời.
│           │   ├── LandingPage.tsx            # Trang chủ giới thiệu nhanh giải và luồng chính.
│           │   ├── LiveRace.tsx               # Màn race đang chạy, nhận cập nhật live qua SSE.
│           │   ├── LoginPage.tsx              # Giao diện đăng nhập và đăng ký tài khoản.
│           │   ├── Navbar.tsx                 # Thanh điều hướng theo vai trò người dùng.
│           │   ├── RaceDetails.tsx            # Chi tiết một race: entry, trạng thái, kết quả.
│           │   ├── RaceRegistrationPage.tsx   # Owner đăng ký ngựa vào race và chọn/mời jockey.
│           │   ├── RaceSimulationDemo.tsx     # Màn mô phỏng race demo để kiểm thử/giải thích race.
│           │   ├── RegisterHorsePage.tsx      # Form owner tạo hồ sơ ngựa mới.
│           │   ├── ResultsPage.tsx            # Trang xem kết quả race đã hoàn tất.
│           │   ├── TournamentDetails.tsx      # Chi tiết tournament và các race thuộc tournament.
│           │   └── TournamentPage.tsx         # Danh sách tournament và thao tác quản lý cơ bản.
│           ├── services/             # Lớp gọi API từ frontend xuống backend.
│           │   └── api.ts            # Khai báo type dữ liệu và hàm request cho toàn frontend.
│           └── utils/                # Helper dùng chung ở frontend.
│               ├── domain.ts         # Hàm lấy tên/ngữ nghĩa domain như owner, jockey, race.
│               ├── messageTone.ts    # Chọn màu thông báo theo nội dung success/error/warning.
│               ├── raceSimulation.ts # Logic mô phỏng race và rủi ro non-finish phía frontend.
│               └── rating.ts         # Helper tính/lấy rating ngựa ở frontend.
│
├── backend/                          # Phần API Node.js/Hono và nghiệp vụ server.
│   └── src/                          # Source chính của backend.
│       ├── app.js                    # Tạo Hono app, gắn middleware và route.
│       ├── index.js                  # Entry backend: đọc env, mở DB, start server.
│       ├── sqlDb.js                  # Lớp đọc/ghi PostgreSQL và chuẩn hoá dữ liệu trả về.
│       ├── config/                   # Cấu hình hằng số dùng chung backend.
│       │   └── constants.js          # Giới hạn race, session, role, cookie và env mặc định.
│       ├── routes/                   # API endpoint chia theo vai trò/domain.
│       │   ├── adminRoutes.js        # API admin: tournament, race, approvals, user, settings.
│       │   ├── authRoutes.js         # API đăng nhập, đăng ký, logout và session hiện tại.
│       │   ├── jockeyRoutes.js       # API cho jockey: hồ sơ, race registration, invitation.
│       │   ├── notificationRoutes.js # API đọc và đánh dấu thông báo.
│       │   ├── ownerRoutes.js        # API cho owner: ngựa, đăng ký race, chọn jockey.
│       │   ├── publicRoutes.js       # API public/bootstrap cho dữ liệu hiển thị chung.
│       │   └── refereeRoutes.js      # API referee: check-in, incident, submit result.
│       └── services/                 # Nghiệp vụ dùng lại giữa nhiều route.
│           ├── authService.js        # Xử lý session cookie, public user và kiểm tra role.
│           ├── domainService.js      # Helper domain: tên entity, entry race, approval review.
│           ├── handicapService.js    # Tính rating, eligibility range và handicap.
│           ├── liveRaceEvents.js     # Phát SSE để màn live race cập nhật realtime.
│           ├── notificationService.js # Tạo thông báo cho admin/referee/owner/jockey.
│           ├── raceAuditService.js   # Ghi log hành động quan trọng trên race.
│           └── raceReplayTimeline.js # Dựng timeline replay chính thức/provisional cho race.
├── backend/test/                     # Test backend bằng node:test.
│   └── *.test.js                     # Test flow admin, owner, jockey, referee và service.
│
├── database/postgres/                # SQL để tạo và cập nhật database PostgreSQL.
│   ├── migrations/                   # Các file migration thay đổi schema theo thời gian.
│   ├── schema.sql                    # Schema chính: tạo bảng, constraint và index.
│   └── seed.sql                      # Dữ liệu mẫu để chạy demo/local.
├── docs/                             # Tài liệu phân tích và thiết kế hệ thống.
│   ├── business-flow-and-roles.md    # Mô tả luồng nghiệp vụ và quyền từng vai trò.
│   ├── erd.drawio                    # Sơ đồ ERD dạng draw.io.
│   ├── horse-racing-erd-explanation.xlsx # Bảng giải thích entity/relationship trong ERD.
│   ├── schema-erd.md                 # Tài liệu ERD/schema dạng markdown.
│   ├── STD.drawio                    # State transition diagram tổng quát.
│   ├── race-state-diagram.drawio     # State diagram riêng cho vòng đời race.
│   ├── tournament-state-diagram.drawio # State diagram riêng cho tournament.
│   └── horse-racing-status-reference.docx # Tài liệu tham chiếu các trạng thái.
├── scripts/                          # Script tiện ích chạy ngoài app.
│   └── run-postgres-file.mjs         # Chạy file SQL vào PostgreSQL theo env hiện tại.
└── package.json                      # Metadata dự án, dependencies và npm scripts.
```

## Vai trò người dùng

| Vai trò | Quyền chính |
|---|---|
| Admin | Tạo giải, tạo race, phân công referee, duyệt hồ sơ và duyệt kết quả |
| Owner | Tạo hồ sơ ngựa, đăng ký ngựa vào race đang mở, chọn hoặc mời jockey |
| Jockey | Công bố hồ sơ, đăng ký khả dụng, chấp nhận hoặc từ chối lời mời |
| Referee | Kiểm tra trước race, ghi kết quả nháp, nộp cho admin duyệt |
| Spectator | Xem giải, race card, hồ sơ công khai, trạng thái live và kết quả |

## Quy trình nghiệp vụ

Tài liệu chi tiết hơn nằm ở [`docs/business-flow-and-roles.md`](docs/business-flow-and-roles.md).

Luồng chính:

1. Admin tạo một giải đấu.
2. Admin tạo nhiều race trong giải đó.
3. Mỗi race có vòng đời đăng ký riêng.
4. Admin mở đăng ký cho race.
5. Owner đăng ký ngựa đã được duyệt.
6. Jockey đăng ký khả dụng hoặc nhận lời mời từ owner.
7. Jockey chấp nhận hoặc từ chối lời mời.
8. Admin duyệt đăng ký hoặc duyệt cặp owner - jockey.
9. Khi đóng đăng ký, hệ thống snapshot rating, tính handicap và xếp lane.
10. Admin công bố danh sách xuất phát.
11. Referee kiểm tra từng entry trước giờ chạy.
12. Referee đánh dấu ready, absent, incident hoặc scratched.
13. Admin bắt đầu race khi điều kiện hợp lệ.
14. Admin kết thúc race.
15. Referee nhập kết quả nháp.
16. Admin duyệt kết quả chính thức.
17. Hệ thống cập nhật rating sau race.
18. Race chuyển sang completed.

### Trạng thái

| Nhóm | Trạng thái |
|---|---|
| Vòng đời race | `draft`, `registration-open`, `registration-closed`, `published`, `in-progress`, `finished`, `completed`, `cancelled` |
| Phê duyệt đăng ký | `pending-jockey`, `pending-admin`, `approved`, `rejected`, `cancelled` |
| Entry xuất phát | `approved`, `scratched` |
| Kiểm tra trước race | `pending`, `ready-for-referee`, `ready`, `absent`, `incident`, `scratched` |
| Kết quả | `draft`, `submitted`, `official`, `disqualified` |

Ghi chú triển khai:

- `published` + `preRaceStatus` dùng để biểu diễn giai đoạn kiểm tra trước race.
- `finished` + `resultStatus = submitted` dùng để biểu diễn việc nộp kết quả nháp.

## Rating và Handicap

Đây là công thức nội bộ của dự án, không phải rating chính thức của HKJC.

### Rating ban đầu

Khi ngựa chưa có `overallRating`, hệ thống tính từ hồ sơ:

```text
Rating ban đầu =
  Tốc độ × 35%
  + Sức bền × 25%
  + Phong độ × 30%
  + Sức khỏe × 10%
```

Kết quả được làm tròn và giới hạn trong khoảng `0-140`.

### Snapshot trước race

Khi đóng đăng ký, hệ thống lưu rating hiện tại vào `ratingSnapshot` để tránh rating thay đổi trong lúc race đang diễn ra.

### Điểm kỳ vọng

```text
Điểm kỳ vọng với một đối thủ =
  1 / (1 + 10 ^ ((Rating đối thủ - Rating ngựa) / 16))

Điểm kỳ vọng chung =
  Trung bình điểm kỳ vọng của tất cả đối thủ
```

Ý nghĩa:

- `0.50`: hai bên ngang nhau.
- Nhỏ hơn `0.50`: ngựa bị đánh giá thấp hơn nhóm đua.
- Lớn hơn `0.50`: ngựa được đánh giá cao hơn nhóm đua.

### Rating sau race

```text
Điểm thực tế = (Số ngựa có kết quả - Vị trí) / (Số ngựa có kết quả - 1)

Mức thay đổi rating thô =
  10 × (Điểm thực tế - Điểm kỳ vọng chung) × Hệ số số lượng ngựa

Rating Change = round(clamp(Mức thay đổi rating thô, -8, +8))
Rating sau race = clamp(Rating Snapshot + Rating Change, 0, 140)
```

| Số ngựa có kết quả | Hệ số |
|---:|---:|
| 8-10 | `1.00` |
| 6-7 | `0.75` |
| 4-5 | `0.50` |
| Dưới 4 | Không đổi rating |

### Handicap

Handicap là trọng lượng được chỉ định cho race, tính bằng `lb`.

```text
Trọng lượng được chỉ định =
  Handicap Max - (Rating cao nhất trong race - Rating của ngựa)
```

Sau đó hệ thống clamp kết quả trong khoảng `Handicap Min` đến `Handicap Max`.

Nguồn logic chính: [`backend/src/services/handicapService.js`](backend/src/services/handicapService.js).

## Cài đặt & Chạy

### Yêu cầu

- Node.js 18 trở lên
- PostgreSQL 14 trở lên

### Cài dependencies

```bash
npm install
```

### Tạo file môi trường

```bash
cp .env.example .env
```

Sau khi copy, chỉnh `POSTGRES_USER` và `POSTGRES_PASSWORD` theo PostgreSQL local của bạn.

### Khởi tạo database

```bash
npm run db:init
```

Hoặc chạy bằng biến môi trường inline:

```bash
POSTGRES_HOST=127.0.0.1 \
POSTGRES_PORT=5432 \
POSTGRES_DATABASE=horse_racing \
POSTGRES_USER=postgres \
POSTGRES_PASSWORD=postgres \
npm run db:init
```

### Chạy backend

```bash
npm run api
```

Backend mặc định chạy tại `http://127.0.0.1:4000`.

### Chạy frontend

```bash
npm run dev
```

Frontend mặc định chạy tại `http://127.0.0.1:5173`.

### Kiểm tra nhanh toàn dự án

```bash
npm run check
```

## Biến môi trường

| Biến | Mặc định | Mô tả |
|---|---|---|
| `POSTGRES_HOST` | `127.0.0.1` | Host PostgreSQL |
| `POSTGRES_PORT` | `5432` | Port PostgreSQL |
| `POSTGRES_DATABASE` | `horse_racing` | Tên database |
| `POSTGRES_USER` | `postgres` | User DB |
| `POSTGRES_PASSWORD` | `postgres` | Password DB |
| `API_PORT` | `4000` | Port backend |
| `API_HOST` | `127.0.0.1` | Host backend |
| `FRONTEND_URL` | `http://127.0.0.1:5173/` | URL frontend |
| `VITE_API_URL` | `http://127.0.0.1:4000/api` | API URL cho frontend |
| `MAX_OWNER_HORSES` | `10` | Số ngựa tối đa của owner |
| `MAX_RACE_FIELD_SIZE` | `10` | Số entry tối đa của race |
| `MIN_READIED_PARTICIPANTS` | `5` | Số ngựa tối thiểu phải được referee đánh dấu Ready trước khi start race |
| `MAX_TOURNAMENT_RACES` | `10` | Số race tối đa trong một giải |
| `SESSION_DAYS` | `7` | Thời hạn session |
| `SESSION_COOKIE_NAME` | `horse-racing-session` | Tên cookie đăng nhập |
| `COOKIE_SECURE` | Production: `true` | Chỉ gửi cookie qua HTTPS |
| `COOKIE_SAME_SITE` | `Lax` | Chính sách SameSite |

## Scripts

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | Chạy frontend dev server |
| `npm run api` | Chạy backend API |
| `npm run start` | Alias của `npm run api` |
| `npm run db:init` | Tạo schema và seed dữ liệu |
| `npm run db:schema` | Chỉ tạo schema |
| `npm run db:seed` | Chỉ seed dữ liệu |
| `npm test` | Chạy test backend |
| `npm run typecheck` | Kiểm tra TypeScript |
| `npm run build` | Build frontend production |
| `npm run preview` | Xem bản build |
| `npm run check` | Typecheck + test + build |

`npm run check` là lệnh nên chạy trước khi demo hoặc deploy vì nó bao gồm TypeScript, toàn bộ test backend và build frontend production.

## API chính

### Auth

| Method | Path | Mô tả |
|---|---|---|
| `GET` | `/api/me` | Lấy người dùng hiện tại |
| `POST` | `/api/login` | Đăng nhập |
| `POST` | `/api/register` | Đăng ký |
| `POST` | `/api/logout` | Đăng xuất |

### Dữ liệu chung

| Method | Path | Mô tả |
|---|---|---|
| `GET` | `/api/bootstrap` | Dữ liệu khởi động |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/live/races/:id/events` | SSE cho live race |

### Admin

| Method | Path | Mô tả |
|---|---|---|
| `GET` | `/api/admin/approvals` | Danh sách chờ duyệt |
| `POST` | `/api/admin/approvals/:type/:id` | Duyệt / từ chối |
| `POST` | `/api/admin/tournaments` | Tạo giải |
| `PATCH` | `/api/admin/tournaments/:id` | Cập nhật giải |
| `DELETE` | `/api/admin/tournaments/:id` | Xóa giải và dữ liệu liên quan |
| `GET` | `/api/admin/race-builder` | Dữ liệu tạo race |
| `POST` | `/api/admin/races` | Tạo race |
| `PATCH` | `/api/admin/races/:id` | Sửa race chưa công bố |
| `DELETE` | `/api/admin/races/:id` | Xóa race chưa công bố |
| `POST` | `/api/admin/races/:id/:action` | Đóng đăng ký, công bố, bắt đầu, kết thúc, hoàn tất |

### Owner

| Method | Path | Mô tả |
|---|---|---|
| `GET` | `/api/owner/portal` | Dữ liệu portal owner |
| `GET` | `/api/owner/race-registration?raceId=...` | Dữ liệu đăng ký race |
| `POST` | `/api/owner/horses` | Tạo ngựa |
| `POST` | `/api/owner/horses/:id` | Cập nhật ngựa |
| `POST` | `/api/owner/race-registrations` | Đăng ký ngựa vào race |

### Jockey

| Method | Path | Mô tả |
|---|---|---|
| `GET` | `/api/jockey/portal` | Dữ liệu portal jockey |
| `POST` | `/api/jockey/profile` | Lưu hồ sơ jockey |
| `POST` | `/api/jockey/race-registrations` | Đăng ký race |
| `POST` | `/api/jockey/invitations/:id` | Trả lời lời mời |

### Referee

| Method | Path | Mô tả |
|---|---|---|
| `POST` | `/api/referee/races/:id/submit-results` | Nộp kết quả nháp |
| `POST` | `/api/referee/race-entries/:id/readiness/ready` | Đánh dấu ready |
| `POST` | `/api/referee/race-entries/:id/readiness/absent` | Đánh dấu absent |
| `POST` | `/api/referee/race-entries/:id/readiness/incident` | Đánh dấu incident |
| `POST` | `/api/referee/race-entries/:id/readiness/scratched` | Đánh dấu scratched |
| `POST` | `/api/referee/race-entries/:id/result` | Ghi kết quả entry |

### Thông báo

| Method | Path | Mô tả |
|---|---|---|
| `GET` | `/api/notifications` | Danh sách thông báo |
| `POST` | `/api/notifications/:id/read` | Đánh dấu đã đọc |

## Tài liệu liên quan

- [`docs/business-flow-and-roles.md`](docs/business-flow-and-roles.md)
- [`docs/schema-erd.md`](docs/schema-erd.md)
- [`docs/erd.drawio`](docs/erd.drawio)
- [`docs/STD.drawio`](docs/STD.drawio)
- [`docs/race-state-diagram.drawio`](docs/race-state-diagram.drawio)
- [`docs/tournament-state-diagram.drawio`](docs/tournament-state-diagram.drawio)
- [`vercel.json`](vercel.json)
