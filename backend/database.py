from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import StaticPool, NullPool
import sqlite3
import time

# SQLite database with check_same_thread=False for FastAPI
DATABASE_URL = "sqlite:///./docufix.db?check_same_thread=false"

engine = create_engine(
    DATABASE_URL,
    connect_args={
        "check_same_thread": False,
        "timeout": 30,  # 30 second timeout for database operations
    },
    poolclass=NullPool,  # Use NullPool to avoid connection reuse issues with SQLite
    echo=False
)

# Enable WAL mode for better concurrency (Write-Ahead Logging)
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    """Enable WAL mode and other SQLite optimizations"""
    if isinstance(dbapi_conn, sqlite3.Connection):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA temp_store=memory")
        cursor.execute("PRAGMA mmap_size=268435456")  # 256MB
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def init_db():
    """Initialize database tables"""
    # Ensure WAL mode is set before creating tables
    with engine.connect() as conn:
        if isinstance(conn.connection, sqlite3.Connection):
            conn.execute("PRAGMA journal_mode=WAL")
    
    Base.metadata.create_all(bind=engine)

def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        db.rollback()
        raise
    finally:
        # Always close the session to release the database lock
        db.close()


