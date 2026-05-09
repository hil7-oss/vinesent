import os
from sqlalchemy import create_engine, text
from datetime import datetime, timedelta

db_url = "postgresql://vinesent:vinesent@localhost:5432/vinesent"
engine = create_engine(db_url)

try:
    with engine.connect() as conn:
        print("Testing SELECT categories...")
        q = text('SELECT id,name,slug,description,image,"parentId","order" FROM "Category"')
        res = conn.execute(q).mappings().all()
        print(f"Found {len(res)} categories.")
        
        print("Testing SELECT products...")
        valid_pids = {str(r["id"]) for r in conn.execute(text('SELECT id FROM "Product"')).mappings().all()}
        print(f"Found {len(valid_pids)} products.")
        
        print("Testing SALE count...")
        sale_count = conn.execute(text("""
            SELECT COUNT(DISTINCT p.id) AS c
            FROM "Product" p
            LEFT JOIN "ProductVariant" v ON v."productId" = p.id
            WHERE (COALESCE(p."salePrice", 0) > 0 AND p."salePrice" < p."price") OR (COALESCE(v."salePrice", 0) > 0 AND v."salePrice" < v."price")
        """)).mappings().first().get("c", 0)
        print(f"Sale count: {sale_count}")
        
        print("✓ All queries successful.")
except Exception as e:
    print(f"Error: {e}")
