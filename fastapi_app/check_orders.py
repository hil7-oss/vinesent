import os
from sqlalchemy import create_engine, text

db_url = "postgresql://vinesent:vinesent@localhost:5432/vinesent"
engine = create_engine(db_url)

try:
    with engine.connect() as conn:
        res = conn.execute(text('SELECT id, name, "order" FROM "Category"')).fetchall()
        print(f"Categories and orders: {res}")
        
except Exception as e:
    print(f"Error: {e}")
