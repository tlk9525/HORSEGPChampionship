
  # Horse Racing Tournament Website

  This is a code bundle for Horse Racing Tournament Website. The original project is available at https://www.figma.com/design/VS4yo8hfGX3xA9xB8KAJCX/Horse-Racing-Tournament-Website.

  ## Project structure

  ```text
  Horse Racing Tournament Website/
  ├── frontend/              # React + Vite UI
  │   ├── index.html
  │   ├── vite.config.ts
  │   ├── tailwind.config.js
  │   └── src/
  │       ├── app/components/
  │       ├── app/data/
  │       ├── app/services/
  │       └── styles/
  ├── backend/               # Node.js API
  │   └── src/
  │       ├── config/
  │       ├── http/
  │       ├── routes/
  │       ├── services/
  │       ├── index.js
  │       └── sqlDb.js
  ├── database/              # PostgreSQL database files
  │   ├── postgres/
  │   │   ├── schema.sql
  │   │   ├── seed.sql
  │   │   └── migrations/
  └── scripts/               # Database helper scripts
  ```

  ## Running the code

  Run `npm i` to install the dependencies.

  Copy `.env.example` to `.env` if you want to keep local settings in one file.
  The commands below also work when the variables are passed inline.

  Start PostgreSQL with Docker:

  ```bash
  docker run --name horse-postgres \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=horse_racing \
    -p 5433:5432 \
    -d postgres:16
  ```

  Initialize the PostgreSQL database:

  ```bash
  POSTGRES_HOST=127.0.0.1 \
  POSTGRES_PORT=5433 \
  POSTGRES_DATABASE=horse_racing \
  POSTGRES_USER=postgres \
  POSTGRES_PASSWORD=postgres \
  npm run db:init
  ```

  Run the backend API with PostgreSQL:

  ```bash
  POSTGRES_HOST=127.0.0.1 \
  POSTGRES_PORT=5433 \
  POSTGRES_DATABASE=horse_racing \
  POSTGRES_USER=postgres \
  POSTGRES_PASSWORD=postgres \
  npm run api
  ```

  If your existing database was created before Google login was added, run:

  ```bash
  POSTGRES_HOST=127.0.0.1 \
  POSTGRES_PORT=5433 \
  POSTGRES_DATABASE=horse_racing \
  POSTGRES_USER=postgres \
  POSTGRES_PASSWORD=postgres \
  node scripts/run-postgres-file.mjs database/postgres/migrations/001_google_auth.sql
  ```

  ### Google Login

  Create an OAuth Client ID in Google Cloud Console and allow this origin:

  ```text
  http://127.0.0.1:5173
  ```

  Then run backend and frontend with the same client ID:

  ```bash
  GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com \
  VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com \
  npm run api
  ```

  ```bash
  VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com \
  npm run dev
  ```

  ### Frontend

  Run `npm run dev` to start the frontend at `http://127.0.0.1:5173`.

  
