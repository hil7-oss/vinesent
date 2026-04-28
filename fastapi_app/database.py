import os
import logging
from contextlib import contextmanager
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Load environment variables from the project root
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_PROJECT_ROOT, ".env"))

logger = logging.getLogger("database")

DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    # Critical error: No database URL provided
    msg = "CRITICAL: DATABASE_URL is not set in environment variables or .env file. PostgreSQL is mandatory."
    logger.critical(msg)
    raise RuntimeError(msg)

# Clean up common URI issues
url = DATABASE_URL.strip()
if url.startswith("postgres://"):
    url = url.replace("postgres://", "postgresql+psycopg2://", 1)
elif url.startswith("postgresql://") and "+psycopg" not in url:
    url = url.replace("postgresql://", "postgresql+psycopg2://", 1)

if not url.startswith("postgresql"):
    msg = f"CRITICAL: Invalid DATABASE_URL protocol. Expected PostgreSQL, got: {url.split(':')[0]}. SQLite is strictly forbidden."
    logger.critical(msg)
    raise RuntimeError(msg)

# PostgreSQL specific engine configuration
# pool_pre_ping: Ensures the connection is valid before use
# pool_recycle: Clean up stale connections
engine = create_engine(
    url, 
    pool_pre_ping=True, 
    pool_recycle=1800,
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
