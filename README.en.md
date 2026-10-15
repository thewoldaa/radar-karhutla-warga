# Radar Karhutla Warga (Community Wildfire Radar)

An Indonesian-language PWA that brings **satellite hot spots**, **air quality**, **citizen
photo reports**, and **social signals** onto a single map — for situational awareness during
Indonesia's dry-season land and forest fires (*karhutla*).

> **This app is NOT an official warning system.** Hot spots are thermal anomalies detected
> by satellite, **not confirmed fires**. For emergencies call **112** (national) or
> **117** (BNPB operations centre). Official information: BMKG, BNPB/BPBD.

**Read the full documentation in Indonesian:** [`README.md`](README.md) · [`docs/`](docs/)

## Why this exists

When the haze season hits, information is scattered: hot spots on satellite sites, air
quality in another app, community reports on social media. This project unifies them.
Users are residents in affected areas (mostly mid-range Android phones on weak connections),
volunteers, journalists, and researchers.

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 15.2 (App Router), TypeScript strict, Tailwind 4, MapLibre GL JS 6 |
| Hosting | Firebase App Hosting (region `asia-southeast1`) |
| Data | Supabase (Postgres + PostGIS, Storage) |
| Hot spots | NASA FIRMS Area API (server-side only) |
| Air quality | Open-Meteo (model, CAMS) + OpenAQ (stations) — Fase 2 |
| Scheduling | GitHub Actions cron with HMAC-signed requests (Cloud Scheduler/OIDC optional) |

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in Supabase + FIRMS values
npm run dev

# See the map with clearly-labelled sample data (development only):
NEXT_PUBLIC_DEMO_MODE=true npm run dev
```

Quality gates: `npm run lint` · `npm run typecheck` · `npm test` · `npm run build`
All four run in CI on every push and pull request.

## Project rules (non-negotiable)

1. **Never fabricate data.** Sample data is development-only, labelled "DATA CONTOH",
   and disabled in production.
2. **Hot spots are not fires.** Never present a detection as a confirmed fire.
3. **Never blame** a company, institution, or individual for a fire.
4. **No secrets in code, the repo, or git history.** Server-side environment only.
5. **Respect data licences** and rate limits; keep attribution visible.
6. **Minimise personal data** (Indonesia's PDP Law No. 27/2022): reports are anonymous,
   public locations rounded to ~1 km, EXIF stripped server-side.
7. **General health advice only**, with disclaimers, always pointing to official authorities.

## Status

| Phase | Scope | State |
|---|---|---|
| 0 | Plan (no code) | ✅ done |
| 1 | Map + hot spots (FIRMS) | ✅ done — awaiting credentials for end-to-end testing |
| 2 | Air quality (ISPU) | ⬜ not started |
| 3 | Citizen reports & moderation | ⬜ not started |
| 4 | Social signals, PWA, polish | ⬜ not started |

## Licence

**[AGPL-3.0-or-later](LICENSE).** If you run a modified version as a network service, you
must publish your source. Please also use a different product name for forks, so residents
are not misled about which deployment is the official one — especially during an emergency.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) (Indonesian) and [`SECURITY.md`](SECURITY.md)
for vulnerability reports. Do not open public issues for security problems.
