
  # Horse Racing Tournament Website



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

  Initialize the PostgreSQL database:

  ```bash
  POSTGRES_HOST=127.0.0.1 \
  POSTGRES_PORT=5432 \
  POSTGRES_DATABASE=horse_racing \
  POSTGRES_USER=postgres \
  POSTGRES_PASSWORD=postgres \
  npm run db:init
  ```

  Run the backend API with PostgreSQL:

  ```bash
  POSTGRES_HOST=127.0.0.1 \
  POSTGRES_PORT=5432 \
  POSTGRES_DATABASE=horse_racing \
  POSTGRES_USER=postgres \
  POSTGRES_PASSWORD=postgres \
  npm run api
  ```

  If you already have an older local database and want to upgrade it without
  recreating data, run the single migration file:

  ```bash
  POSTGRES_HOST=127.0.0.1 \
  POSTGRES_PORT=5432 \
  POSTGRES_DATABASE=horse_racing \
  POSTGRES_USER=postgres \
  POSTGRES_PASSWORD=postgres \
  node scripts/run-postgres-file.mjs database/postgres/migrations/001_upgrade_existing_database.sql
  ```

  ### Frontend

  Run `npm run dev` to start the frontend at `http://127.0.0.1:5173`.

  
