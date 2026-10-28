# Church Management Platform — Review Edition

A trimmed snapshot of a larger private product, shared for review. All navigation
tabs are visible, but only the sections below are included and working. The rest show
a "not included in the review edition" page.

## What is included

| Section | Status |
|---|---|
| Dashboard | Working (some cards open sections that are not included, by design) |
| People | Working |
| Families | Working |
| Community (announcements, prayer wall, ideas, messages) and Talent | Working |
| Shepherding | Working |
| Settings | Working, except **Access and roles**, which is not included |
| Attendance, Events, Groups, Ministries, Follow-ups, Reports, Trends | Not included |

The member mobile app and the Android/iOS wrappers are not part of this edition.

## Security review

Start with [docs/SECURITY-ARCHITECTURE.md](docs/SECURITY-ARCHITECTURE.md): diagrams of the
trust boundaries, request lifecycle, login and session flow, and authorization, with a
list of known gaps to challenge.

## Stack

Next.js 15 (App Router), React 18, Tailwind, Prisma 5 with PostgreSQL, Vitest.

## Run it locally

You need Node 20+ and a free PostgreSQL database (for example a Neon free project).

```bash
npm install
cp .env.example .env.local      # then set DATABASE_URL (and JWT_SECRET) in .env.local
npx prisma db push              # creates the tables
npm run db:seed                 # adds fake demo data only
npm run dev                     # http://localhost:3000
```

Sign in with `admin@grace.community`. The seed prints the demo password (a seed
default, for local use only). All names, emails and phone numbers in the seed are
invented.

## Tests

```bash
TZ=Africa/Cairo npx vitest run
npx tsc --noEmit -p .
```

## Copyright

Copyright (c) 2026 Ramy Habib

All rights reserved.

This project and its source code are proprietary.
No permission is granted to copy, modify, distribute,
or use this code without prior written permission
from the copyright holder.
