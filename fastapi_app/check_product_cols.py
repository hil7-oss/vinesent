import os
from sqlalchemy import create_engine, text

db_url = "postgresql://vinesent:vinesent@localhost:5432/vinesent"
engine = create_engine(db_url)

try:
    with engine.connect() as conn:
        res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'Product'"))
        columns = [row[0] for row in res]
        print(f"Columns in Product: {columns}")
except Exception as e:
    print(f"Error: {e}")
