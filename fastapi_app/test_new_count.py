import os
from sqlalchemy import create_engine, text
from datetime import datetime, timedelta

db_url = "postgresql://vinesent:vinesent@localhost:5432/vinesent"
engine = create_engine(db_url)

try:
    with engine.connect() as conn:
        th = (datetime.utcnow() - timedelta(days=60))
        th_sql = th.isoformat()
        print(f"Testing new_count with th={th_sql}...")
        new_count = conn.execute(text("""
            SELECT COUNT(*) AS c
            FROM "Product"
            WHERE "createdAt" >= :th
        """), {"th": th_sql}).mappings().first().get("c", 0)
        print(f"New count: {new_count}")
except Exception as e:
    print(f"Error: {e}")
