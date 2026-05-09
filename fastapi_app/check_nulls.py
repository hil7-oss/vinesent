import os
from sqlalchemy import create_engine, text

db_url = "postgresql://vinesent:vinesent@localhost:5432/vinesent"
engine = create_engine(db_url)

try:
    with engine.connect() as conn:
        res = conn.execute(text('SELECT id, name, slug FROM "Category" WHERE name IS NULL OR slug IS NULL')).fetchall()
        if res:
            print(f"Found invalid categories: {res}")
        else:
            print("No categories with NULL name or slug.")
            
        # Check parentId
        res = conn.execute(text('SELECT id, "parentId" FROM "Category"')).fetchall()
        print(f"Parent IDs: {[r[1] for r in res]}")
        
except Exception as e:
    print(f"Error: {e}")
