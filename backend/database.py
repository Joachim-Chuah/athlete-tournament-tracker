import os
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env.local"))


class Base(DeclarativeBase):
    pass


def normalize_db_url(url: str) -> str:
    """Make a Supabase/Prisma DATABASE_URL safe for the psycopg3 driver.

    - Swap the scheme to postgresql+psycopg (psycopg2 has no Python 3.14 wheels).
    - Drop the `pgbouncer` query param: it's a Prisma-only flag that libpq
      rejects as an invalid connection option when psycopg forwards it.
    """
    # Use psycopg3 driver (postgresql+psycopg)
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg://", 1)

    parts = urlsplit(url)
    query = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if k != "pgbouncer"]
    return urlunsplit(parts._replace(query=urlencode(query)))


def get_engine():
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set")
    url = normalize_db_url(url)
    # prepare_threshold=None disables prepared statements — required when
    # connecting through Supabase's pgbouncer transaction pooler (port 6543)
    return create_engine(url, pool_pre_ping=True, connect_args={"prepare_threshold": None})


engine = get_engine()
Session = sessionmaker(bind=engine, expire_on_commit=False)


def get_db():
    db = Session()
    try:
        yield db
    finally:
        db.close()
