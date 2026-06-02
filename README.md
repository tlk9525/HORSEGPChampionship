
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
  │       ├── index.js
  │       └── sqlDb.js
  ├── database/              # PostgreSQL database files
  │   ├── postgres/
  │   │   ├── schema.sql
  │   │   └── seed.sql
  └── scripts/               # Database helper scripts
  ```

  ## Running the code

  Run `npm i` to install the dependencies.

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

  ### Frontend

  Run `npm run dev` to start the frontend at `http://127.0.0.1:5173`.
  
