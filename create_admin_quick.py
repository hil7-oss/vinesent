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

from sqlalchemy import text, create_engine
from sqlalchemy.orm import sessionmaker
from fastapi_app.services.auth_service import hash_password

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
    
    db = SessionLocal()
    
    try:
        # Check if exists
        existing = db.execute(
            text('SELECT id, email, role FROM "User" WHERE email = :email'),
            {"email": email}
        ).mappings().first()
        
        if existing:
            print(f"✅ User '{email}' already exists with role: {existing['role']}")
            
            if existing['role'] != 'ADMIN':
                db.execute(
                    text('UPDATE "User" SET role = :role WHERE email = :email'),
                    {"role": "ADMIN", "email": email}
                )
                db.commit()
                print(f"✅ Updated to ADMIN role")
            
            print(f"\n🔐 Login credentials:")
            print(f"   URL: http://localhost:3001")
            print(f"   Email: {email}")
            print(f"   Password: {password}")
            return
        
        # Create new admin
        password_hash = hash_password(password)
        user_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        
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
        
        print("\n" + "=" * 60)
        print("✅ Admin user created successfully!")
        print("=" * 60)
        print(f"\n🔐 Login credentials:")
        print(f"   URL: http://localhost:3001")
        print(f"   Email: {email}")
        print(f"   Password: {password}")
        print("\n⚠️  Change password after first login!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("Creating admin user...")
    create_admin()
