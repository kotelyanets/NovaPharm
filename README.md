# NovaPharm

<p align="center">
  <strong>Modern pharmaceutical data platform for structured medicine intelligence.</strong>
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql" />
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma" />
  <img alt="Meilisearch" src="https://img.shields.io/badge/Meilisearch-Search-FF5CAA" />
  <img alt="Playwright" src="https://img.shields.io/badge/Playwright-Scraper-2EAD33?logo=playwright" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Current Status](#current-status)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Development Commands](#development-commands)
- [Scraper Workflow](#scraper-workflow)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [License](#license)

---

## Overview

**NovaPharm** is a pharmaceutical data platform project focused on collecting, normalizing, storing, and searching medicine data.

The project combines:

- A **web client** (`/client`) built with Next.js + TypeScript.
- A **relational data model** using Prisma + PostgreSQL.
- A **search layer** powered by Meilisearch.
- A **Playwright scraper** (`/scraper`) for collecting medicine data from Infomed.

---

## Current Status

NovaPharm is in an active foundation phase:

- Core infrastructure (database + search) is ready for local development.
- Data model entities are in place (`Medicine`, `ActiveIngredient`, `Manufacturer`, `Category`).
- Scraper implementation can run and export source data.
- Frontend remains early-stage and is ready for domain-specific UI expansion.

---

## Architecture

NovaPharm follows a dual-storage approach:

1. **PostgreSQL** is the source of truth for structured medicine entities.
2. **Meilisearch** powers fast, low-latency full-text search experiences.

High-level flow:

1. Scrape source data (`/scraper`).
2. Normalize/transform data for domain entities.
3. Persist normalized entities in PostgreSQL.
4. Index searchable fields into Meilisearch.
5. Query via frontend application (`/client`).

---

## Tech Stack

### Application Layer

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS

### Data Layer

- PostgreSQL 16
- Prisma ORM

### Search Layer

- Meilisearch

### Data Collection

- Playwright + TypeScript

### Local Infrastructure

- Docker Compose

---

## Repository Structure

```text
NovaPharm/
├── client/             # Next.js app + Prisma schema and seed scripts
├── scraper/            # Playwright TypeScript scraper (Infomed)
├── docker-compose.yml  # PostgreSQL + Meilisearch local services
├── README.md
└── LICENSE
```

---

## Prerequisites

Before starting, ensure you have:

- **Node.js 20+**
- **npm 10+**
- **Docker** and **Docker Compose**

---

## Quick Start

### 1) Start local infrastructure

From repository root:

```bash
docker compose up -d
```

This starts:

- PostgreSQL on `localhost:5432`
- Meilisearch on `localhost:7700`

### 2) Setup and run the client

```bash
cd client
npm install
npx prisma db push
npm run dev
```

Open: [http://localhost:3000](http://localhost:3000)

### 3) Setup and build the scraper

```bash
cd scraper
npm install
npm run build
```

### 4) Stop local infrastructure (when finished)

```bash
cd /home/runner/work/NovaPharm/NovaPharm
docker compose down
```

---

## Environment Variables

### Client (`/client/.env`)

```env
DATABASE_URL="postgresql://devuser:devpassword@localhost:5432/novapharm?schema=public"
```

### Local Docker defaults (`docker-compose.yml`)

- `POSTGRES_USER=devuser`
- `POSTGRES_PASSWORD=devpassword`
- `POSTGRES_DB=novapharm`
- `MEILI_MASTER_KEY=dev-master-key`

> For production, use strong credentials and secret management.

---

## Development Commands

### `/client`

- `npm run dev` — start development server
- `npm run build` — build for production
- `npm run start` — run built app
- `npm run lint` — run ESLint checks
- `npm run seed` — run base seeding script
- `npm run seed:fda` — run FDA-powered seeding pipeline

### `/scraper`

- `npm run build` — compile TypeScript
- `npm run start` — print execution plan
- `npm run scrape` — run real scraping execution

---

## Scraper Workflow

From `/scraper`:

1. **Preview flow** (safe, no real scrape):

   ```bash
   npm run start
   ```

2. **Run extraction**:

   ```bash
   npm run scrape
   ```

Output file:

- `scraper/infomed_data.json`

---

## Troubleshooting

- If `next` is not found in `/client`, run `npm install` in `client/`.
- If TypeScript cannot find Node types in `/scraper`, run `npm install` in `scraper/`.
- If database connection fails, confirm Docker services are running (`docker compose ps`).
- If ports are busy, free ports `3000`, `5432`, or `7700`, then restart services.

---

## Roadmap

- Build medicine-focused search and details UX.
- Implement robust ingestion from `infomed_data.json` to PostgreSQL.
- Add automated synchronization to Meilisearch.
- Expand test coverage for parsing, validation, and indexing.
- Add CI checks for lint/build/smoke validation.

---

## License

Copyright (c) 2026 NovaPharm / kotelyanets.

This project is **proprietary**. Source is available for educational or review purposes only. Modification, redistribution, and commercial use are prohibited without prior written consent.

See [LICENSE](LICENSE) for full terms.
