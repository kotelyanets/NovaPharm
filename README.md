# NovaPharm

<p align="center">
  <strong>Modern pharmaceutical data platform foundation</strong><br />
  Built with Next.js, PostgreSQL, Prisma, Meilisearch, and a Playwright data scraper.
</p>

---

## ✨ Project Overview

**NovaPharm** is a pharmaceutical data platform project focused on structuring medicine information and preparing it for fast search and future product workflows.

The repository currently includes:
- a **web client** (`/client`) built with Next.js + TypeScript,
- a **data model** using Prisma and PostgreSQL,
- local infrastructure for **PostgreSQL** and **Meilisearch** via Docker Compose,
- a **TypeScript scraper** (`/scraper`) using Playwright to collect medicine data from Infomed.

> **Current status:** The frontend is still close to the Next.js starter template, while backend structure and scraper foundations are already in place.

---

## 🧱 Tech Stack

### Client / App Layer
- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS**

### Data & Search
- **PostgreSQL 16** (primary relational database)
- **Prisma ORM** (schema + client)
- **Meilisearch** (search engine service in local stack)

### Data Collection
- **Playwright** + **TypeScript** scraper for Infomed source data

### Local Development Infrastructure
- **Docker Compose** for database and search services

---

## 🏛️ Architecture (Current)

NovaPharm follows a dual-storage direction:
1. **PostgreSQL** is intended as the source of truth for medicine entities.
2. **Meilisearch** is intended for low-latency user search experiences.

The Prisma schema currently defines key entities:
- `Medicine`
- `ActiveIngredient`
- `Manufacturer`

This gives a strong base for ingestion, normalization, and future indexing/search pipelines.

---

## 📂 Repository Structure

```text
NovaPharm/
├── client/             # Next.js app + Prisma schema/config
├── scraper/            # Playwright TypeScript scraper (Infomed)
├── docker-compose.yml  # PostgreSQL + Meilisearch local services
├── README.md
└── LICENSE
```

---

## 🚀 Quick Start

### 1) Start infrastructure

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

Open: http://localhost:3000

### 3) Build and lint the client

```bash
cd client
npm run lint
npm run build
```

---

## 🕷️ Scraper Usage (Infomed)

The scraper is located in `/scraper` and can either print its execution plan or run extraction.

```bash
cd scraper
npm install
npm run build
```

### Print implementation plan

```bash
npm run start
```

### Execute scraping

```bash
npm run scrape
```

Output file:
- `scraper/infomed_data.json`

---

## 🔧 Environment Configuration

### Client (`/client/.env`)

```env
DATABASE_URL="postgresql://devuser:devpassword@localhost:5432/novapharm?schema=public"
```

Default local credentials are also defined in `docker-compose.yml`:
- `POSTGRES_USER=devuser`
- `POSTGRES_PASSWORD=devpassword`
- `POSTGRES_DB=novapharm`

For production deployments, use secure credentials and secret management.

---

## 📌 Available NPM Scripts

### `/client`
- `npm run dev` — start development server
- `npm run build` — production build
- `npm run start` — run built app
- `npm run lint` — run Next.js ESLint checks

### `/scraper`
- `npm run build` — compile TypeScript
- `npm run start` — show execution plan
- `npm run scrape` — run real scraping

---

## 🛣️ Recommended Next Milestones

- Build domain-focused UI for medicine search and detail pages.
- Implement ingestion pipeline from `infomed_data.json` to PostgreSQL.
- Add automated synchronization/indexing into Meilisearch.
- Introduce tests for scraper parsing and data validation.
- Add CI checks for lint/build/smoke validation.

---

## ⚖️ License

Copyright (c) 2026 NovaPharm / kotelyanets.

This project is **proprietary**. You may view source code for educational or review purposes only. Modification, redistribution, and commercial use are prohibited without prior written consent.

See [LICENSE](LICENSE) for full terms.
