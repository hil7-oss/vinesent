#!/usr/bin/env python3
"""
Apply measurements field migration to Product table
"""
import sys
import os

# Add fastapi_app to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'fastapi_app'))

from fastapi_app.database import engine
from sqlalchemy import text

def apply_migration():
    """Apply the measurements field migration"""
    print("Applying database migrations...")
    
    migrations = [
        '003_add_measurements_field.sql',
        '004_make_sku_optional.sql'
    ]
    
    with engine.connect() as conn:
        for migration_file in migrations:
            print(f"\n→ Applying {migration_file}...")
            migration_path = os.path.join(
                os.path.dirname(__file__), 
                'fastapi_app', 
                'migrations', 
                migration_file
            )
            
            if not os.path.exists(migration_path):
                print(f"  ⚠ Migration file not found: {migration_file}")
                continue
            
            with open(migration_path, 'r', encoding='utf-8') as f:
                sql = f.read()
            
            # Execute migration
            for statement in sql.split(';'):
                statement = statement.strip()
                if statement and not statement.startswith('--'):
                    try:
                        conn.execute(text(statement))
                        print(f"  ✓ Executed: {statement[:60]}...")
                    except Exception as e:
                        print(f"  ✗ Error: {e}")
                        print(f"    Statement: {statement[:100]}...")
            
            print(f"  ✓ {migration_file} completed")
        
        conn.commit()
        print("\n✓ All migrations applied successfully!")

if __name__ == "__main__":
    apply_migration()
