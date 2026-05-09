import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Load env
def load_env():
    env_path = ".env"
    if not os.path.exists(env_path):
        env_path = "../.env"
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    key, value = line.strip().split("=", 1)
                    os.environ[key] = value.strip("\"'")

load_env()

# Get DB URL
db_url = f"postgresql://{os.getenv('POSTGRES_USER')}:{os.getenv('POSTGRES_PASSWORD')}@localhost:5432/{os.getenv('POSTGRES_DB')}"
# Note: if running from host to docker, might need localhost:5432 or similar.
# Since I'm on the USER system, I'll try to connect to localhost:5432.

print(f"Connecting to {db_url}...")

engine = create_engine(db_url)
Session = sessionmaker(bind=engine)
session = Session()

try:
    # Check if column exists
    res = session.execute(text("""
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Category' AND column_name = 'order'
    """)).first()
    
    if not res:
        print("Adding 'order' column to Category table...")
        session.execute(text('ALTER TABLE "Category" ADD COLUMN "order" INTEGER DEFAULT 0'))
        session.commit()
        print("✓ Successfully added 'order' column.")
    else:
        print("⚠ 'order' column already exists.")
except Exception as e:
    print(f"Error: {e}")
    session.rollback()
finally:
    session.close()
