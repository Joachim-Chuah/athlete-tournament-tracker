from backend.database import normalize_db_url


def test_strips_pgbouncer_param():
    url = "postgresql://u:p@host.pooler.supabase.com:6543/postgres?pgbouncer=true"
    out = normalize_db_url(url)
    assert "pgbouncer" not in out
    assert out.startswith("postgresql+psycopg://")


def test_swaps_postgres_scheme():
    out = normalize_db_url("postgres://u:p@host:5432/db")
    assert out.startswith("postgresql+psycopg://")


def test_preserves_other_query_params():
    url = "postgresql://u:p@host:6543/postgres?pgbouncer=true&sslmode=require"
    out = normalize_db_url(url)
    assert "sslmode=require" in out
    assert "pgbouncer" not in out


def test_no_query_params_is_unchanged_aside_from_scheme():
    out = normalize_db_url("postgresql://u:p@host:5432/db")
    assert out == "postgresql+psycopg://u:p@host:5432/db"


def test_already_psycopg_scheme_left_alone():
    url = "postgresql+psycopg://u:p@host:5432/db"
    assert normalize_db_url(url) == url
