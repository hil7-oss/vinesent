"""
Quick script to create admin user.
Run from project root: python create_admin_quick.py
"""

import sys
import os
import uuid
from datetime import datetime

# Setup path
sys.path.insert(0, os.path.dirname(__file__))

try:
    from sqlalchemy import text, create_engine
    from sqlalchemy.orm import sessionmaker
    from fastapi_app.services.auth_service import hash_password
except ImportError as e:
    print(f"Import error: {e}")
    print("Make sure you are running this from the project root and have dependencies installed.")
    sys.exit(1)

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://vinesent:vinesent@localhost:5432/vinesent")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def create_admin():
    """Create admin user with default credentials"""
    
    # Default credentials
    email = "admin@vineshop.com"
    password = "admin123"
    name = "Admin"
    
    print(f"Connecting to database: {DATABASE_URL.split('@')[-1]}")
    db = SessionLocal()
    
    try:
        # Check if exists
        existing = db.execute(
            text('SELECT id, email, role, password FROM "User" WHERE email = :email'),
            {"email": email}
        ).mappings().first()
        
        password_hash = hash_password(password)
        now = datetime.utcnow().isoformat()
        
        if existing:
            print(f"User '{email}' already exists.")
            print(f"Current role: {existing['role']}")
            
            # Force update role and password
            db.execute(
                text('UPDATE "User" SET role = :role, password = :password, "updatedAt" = :updated WHERE email = :email'),
                {"role": "ADMIN", "password": password_hash, "updated": now, "email": email}
            )
            db.commit()
            print(f"Updated user to ADMIN role and reset password to '{password}'")
            
        else:
            # Create new admin
            user_id = str(uuid.uuid4())
            
            db.execute(
                text('''
                    INSERT INTO "User" (id, email, password, name, role, "createdAt", "updatedAt")
                    VALUES (:id, :email, :password, :name, :role, :created, :updated)
                '''),
                {
                    "id": user_id,
                    "email": email,
                    "password": password_hash,
                    "name": name,
                    "role": "ADMIN",
                    "created": now,
                    "updated": now
                }
            )
            db.commit()
            print(f"Created new ADMIN user: {email}")
        
        print("\n" + "=" * 60)
        print("SUCCESS: Admin user is ready!")
        print("=" * 60)
        print(f"Login credentials:")
        print(f"   URL: http://localhost:3001")
        print(f"   Email: {email}")
        print(f"   Password: {password}")
        print("=" * 60)
        
    except Exception as e:
        print(f"\nERROR: {e}")
        db.rollback()
        # Don't raise, just print so user can see it
    finally:
        db.close()


if __name__ == "__main__":
    print("Starting admin creation script...")
    create_admin()
