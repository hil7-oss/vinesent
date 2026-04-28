"""
Script to create an admin user in the database.

Usage:
    python -m fastapi_app.scripts.create_admin
    python -m fastapi_app.scripts.create_admin --email admin@example.com --password mypassword
"""

import sys
import os
import uuid
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from sqlalchemy import text
from fastapi_app.database import SessionLocal
from fastapi_app.services.auth_service import hash_password


def create_admin_user(email: str, password: str, name: str = "Admin"):
    """
    Create an admin user in the database.
    
    Args:
        email: Admin email
        password: Admin password (will be hashed)
        name: Admin name (default: "Admin")
    """
    db = SessionLocal()
    
    try:
        # Check if user already exists
        existing = db.execute(
            text('SELECT id, email, role FROM "User" WHERE email = :email'),
            {"email": email}
        ).mappings().first()
        
        if existing:
            print(f"⚠️  User with email '{email}' already exists!")
            print(f"   ID: {existing['id']}")
            print(f"   Role: {existing['role']}")
            
            # Ask if want to update to admin
            response = input("\nUpdate this user to ADMIN role? (yes/no): ").strip().lower()
            if response in ('yes', 'y'):
                db.execute(
                    text('UPDATE "User" SET role = :role WHERE email = :email'),
                    {"role": "ADMIN", "email": email}
                )
                db.commit()
                print(f"✅ User '{email}' updated to ADMIN role")
            else:
                print("❌ Operation cancelled")
            return
        
        # Hash password
        password_hash = hash_password(password)
        
        # Generate ID and timestamps
        user_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        
        # Insert new admin user
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
        print(f"ID:       {user_id}")
        print(f"Email:    {email}")
        print(f"Name:     {name}")
        print(f"Role:     ADMIN")
        print(f"Password: {password}")
        print("=" * 60)
        print("\n🔐 You can now login with these credentials")
        print(f"   URL: http://localhost:3001")
        print(f"   Email: {email}")
        print(f"   Password: {password}")
        print("\n⚠️  IMPORTANT: Change the password after first login!")
        
    except Exception as e:
        print(f"\n❌ Error creating admin user: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Create an admin user")
    parser.add_argument(
        "--email",
        default="admin@vineshop.com",
        help="Admin email (default: admin@vineshop.com)"
    )
    parser.add_argument(
        "--password",
        default=None,
        help="Admin password (will be prompted if not provided)"
    )
    parser.add_argument(
        "--name",
        default="Admin",
        help="Admin name (default: Admin)"
    )
    
    args = parser.parse_args()
    
    email = args.email
    name = args.name
    
    # Get password
    if args.password:
        password = args.password
    else:
        import getpass
        print(f"\nCreating admin user: {email}")
        password = getpass.getpass("Enter password: ")
        password_confirm = getpass.getpass("Confirm password: ")
        
        if password != password_confirm:
            print("❌ Passwords do not match!")
            sys.exit(1)
        
        if len(password) < 6:
            print("❌ Password must be at least 6 characters!")
            sys.exit(1)
    
    # Create admin
    create_admin_user(email, password, name)


if __name__ == "__main__":
    main()
