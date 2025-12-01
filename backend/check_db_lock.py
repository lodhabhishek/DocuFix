#!/usr/bin/env python3
"""
Script to check and fix database lock issues
"""
import sqlite3
import os
import sys
from pathlib import Path

DB_PATH = Path(__file__).parent / "docufix.db"

def check_db_lock():
    """Check if database is locked and attempt to fix it"""
    if not DB_PATH.exists():
        print(f"❌ Database file not found: {DB_PATH}")
        return False
    
    print(f"Checking database: {DB_PATH}")
    
    # Check for lock files
    wal_file = DB_PATH.parent / f"{DB_PATH.name}-wal"
    shm_file = DB_PATH.parent / f"{DB_PATH.name}-shm"
    
    if wal_file.exists():
        print(f"✓ WAL file exists: {wal_file} ({wal_file.stat().st_size} bytes)")
    if shm_file.exists():
        print(f"✓ SHM file exists: {shm_file} ({shm_file.stat().st_size} bytes)")
    
    # Try to connect to database
    try:
        conn = sqlite3.connect(str(DB_PATH), timeout=5.0)
        cursor = conn.cursor()
        cursor.execute("PRAGMA journal_mode")
        mode = cursor.fetchone()
        print(f"✓ Database connection successful")
        print(f"✓ Journal mode: {mode[0] if mode else 'unknown'}")
        
        # Try a simple query
        cursor.execute("SELECT COUNT(*) FROM sqlite_master")
        count = cursor.fetchone()[0]
        print(f"✓ Database accessible - {count} tables found")
        
        cursor.close()
        conn.close()
        print("✓ Database is not locked")
        return True
        
    except sqlite3.OperationalError as e:
        if "locked" in str(e).lower():
            print(f"❌ Database is locked: {e}")
            print("\nAttempting to fix...")
            
            # Try to close any stale connections by checkpointing WAL
            try:
                conn = sqlite3.connect(str(DB_PATH), timeout=10.0)
                cursor = conn.cursor()
                cursor.execute("PRAGMA wal_checkpoint(TRUNCATE)")
                conn.commit()
                cursor.close()
                conn.close()
                print("✓ WAL checkpoint completed")
                return True
            except Exception as e2:
                print(f"❌ Could not fix lock: {e2}")
                print("\nManual fix options:")
                print("1. Stop all backend servers")
                print("2. Delete .db-wal and .db-shm files if they exist")
                print("3. Restart the backend server")
                return False
        else:
            print(f"❌ Database error: {e}")
            return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = check_db_lock()
    sys.exit(0 if success else 1)

