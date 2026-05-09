import os
import sys
from sqlalchemy import create_engine, text
from fastapi_app.schemas import CategoryOut

db_url = "postgresql://vinesent:vinesent@localhost:5432/vinesent"
engine = create_engine(db_url)

try:
    with engine.connect() as conn:
        q = text('SELECT id,name,slug,description,image,"parentId","order" FROM "Category"')
        res = conn.execute(q).mappings().all()
        for r in res:
            d = dict(r)
            d['productCount'] = 0 # Placeholder
            try:
                CategoryOut(**d)
                print(f"Validated {d.get('slug') or d.get('id')}")
            except Exception as e:
                print(f"Validation FAILED for {d.get('slug') or d.get('id')}: {e}")
except Exception as e:
    print(f"Error: {e}")
