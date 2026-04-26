import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env.local"))


class Base(DeclarativeBase):
    pass


def get_engine():
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set")
    return create_engine(url, pool_pre_ping=True)


engine = get_engine()
Session = sessionmaker(bind=engine, expire_on_commit=False)


def get_db():
    db = Session()
    try:
        yield db
    finally:
        db.close()
