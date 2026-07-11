# Backend extraction manifest

This manifest defines the behavior-preserving boundary for a future
`athlete-tracker-api` repository. This change does not move files, create a
remote repository, alter production secrets, or change deployment behavior.

## Future API repository ownership

The extracted repository will own:

- `backend/`, including HTTP routes, authentication, SQLAlchemy models, P&L and
  currency services, tests, schema models, and `openapi.json`;
- `requirements.txt` and Python runtime/tooling configuration;
- `Procfile` and the Flask deployment entry point;
- `scripts/scrape_psa.py` and its scheduled workflow;
- future SQLAlchemy/Alembic migration configuration and revisions;
- Supabase JWT verification and database access;
- Open Exchange Rates and PSA integrations; and
- future actual-expense and bank-service backend work.

The web and mobile repositories are API consumers only. They may generate or
maintain client types from `backend/openapi.json`, but they do not own database
schemas, migrations, authentication verification, FX logic, PSA ingestion, or
P&L calculation.

## Deployment inputs

The current deployment remains `gunicorn backend.app:app` from `Procfile`.
Extraction must preserve these runtime inputs:

| Input | Purpose |
| --- | --- |
| `DATABASE_URL` | Supabase PostgreSQL connection for SQLAlchemy and the scraper |
| `SUPABASE_URL` | Base URL used to derive the Supabase JWKS endpoint |
| `SUPABASE_JWKS_URL` | Optional explicit JWKS endpoint override |
| `OPEN_EXCHANGE_RATES_KEY` | Server-side FX rates |
| `CORS_ORIGINS` | Allowed browser origins; defaults to local web development |
| `PORT` | Flask/Gunicorn port supplied by the hosting platform |

Frontend-only `NEXT_PUBLIC_*` values do not move with the backend.

## Database migration authority

SQLAlchemy models are the sole future schema model, and Alembic will be the sole
future migration authority. The obsolete Prisma schema, client dependency, and
Node scraper were removed after repository-wide search showed that production
CI and the scheduled scrape path use Python only.

No baseline migration is fabricated in this change. Establishing one safely
requires approved access to inspect the live Supabase schema and a separately
approved `alembic stamp`, which writes the version marker. The extraction
follow-up must:

1. add Alembic configuration that imports `backend.database.Base.metadata`;
2. inspect the live schema read-only and compare every table, enum, index,
   foreign key, default, and nullability rule with `backend/models.py`;
3. reconcile any drift explicitly before generating a baseline revision;
4. apply the candidate baseline to a disposable database and confirm that a
   subsequent autogenerate operation is empty;
5. obtain approval for the production metadata write, then stamp the verified
   baseline revision without running table-creation SQL; and
6. require reviewed Alembic revisions for every later schema change.

Until those steps are authorized and completed, production schema changes must
not be made from either consumer repository.

## Compatibility during extraction

Both `/api/...` and `/api/v1/...` must be preserved when the service moves. The
policy in `API_COMPATIBILITY.md` continues to apply: v1 changes are additive,
incompatible changes require a future version, and legacy routes remain until
client adoption is measured.
