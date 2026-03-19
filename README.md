# NovaPharm

NovaPharm is an enterprise-grade drug database and search platform designed for extreme performance, scalability, and medical-grade precision. Inspired by modern, scalable pharmaceutical platforms, NovaPharm leverages a cutting-edge technical stack to deliver instant, typo-tolerant search across millions of records.

## 🚀 Core Technical Stack

- **Frontend**: [Next.js 14](https://nextjs.org/) (App Router), TypeScript, Tailwind CSS, shadcn/ui.
- **Primary Database**: [PostgreSQL](https://www.postgresql.org/) (Relational Integrity).
- **Search Engine**: [Meilisearch](https://www.meilisearch.com/) (High-performance Instant Search).
- **ORM**: [Prisma](https://www.prisma.io/).
- **Infrastructure**: [Docker Compose](https://www.docker.com/) for local development.

## 🏛️ Architecture Overview

NovaPharm uses a dual-database architecture:
1. **PostgreSQL** acts as the source of truth for relational medical data (medicines, ingredients, manufacturers).
2. **Meilisearch** serves as the search engine, providing sub-50ms search latency with advanced filtering and typo tolerance.

Data synchronization is handled via Prisma Middleware/Extensions at the application level to ensure the search index is always up-to-date with the primary database.

## 🛠️ Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js](https://nodejs.org/) (v18+)
- [npm](https://www.npmjs.com/)

### 1. Infrastructure Setup

Start the PostgreSQL and Meilisearch containers:

```bash
docker compose up -d
```

### 2. Frontend & ORM Setup

Navigate to the client directory and install dependencies:

```bash
cd client
npm install
```

Initialize the database schema:

```bash
npx prisma db push
```

### 3. Development Server

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📂 Project Structure

- `/client`: Next.js application, Prisma schema, and UI components.
- `/docker-compose.yml`: Infrastructure configuration for PG and Meilisearch.

## ⚖️ License

Project developed for enterprise medical search. All rights reserved.
