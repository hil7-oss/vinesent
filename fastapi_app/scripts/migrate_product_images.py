"""
Migration script to convert product images from legacy format to new format.
Legacy: ["url1", "url2", ]
New: [{"url": "url1", "type": "front", "order": 0, "isGenerated": false}, ]

Run with: python -m fastapi_app.scripts.migrate_product_images
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from sqlalchemy import text
from fastapi_app.database import SessionLocal
from fastapi_app.utils.images import parse_product_images, serialize_product_images


def migrate_product_images(dry_run: bool = True):
    """
    Migrate all product images to new format.
    
    Args:
        dry_run: If True, only print what would be changed without making changes
    """
    db = SessionLocal()
    
    try:
        # Get all products
        products = db.execute(
            text('SELECT id, name, images FROM "Product"')
        ).mappings().all()
        
        print(f"Found {len(products)} products")
        print("-" * 80)
        
        migrated_count = 0
        skipped_count = 0
        
        for product in products:
            product_id = product["id"]
            product_name = product["name"]
            images_json = product["images"]
            
            if not images_json:
                print(f"⏭️  Skipping {product_name} (no images)")
                skipped_count += 1
                continue
            
            # Parse images
            images = parse_product_images(images_json)
            
            # Check if already in new format
            if images and all(hasattr(img, 'type') for img in images):
                # Check if it's actually using the new format by looking at the raw JSON
                import json
                try:
                    raw_data = json.loads(images_json)
                    if raw_data and isinstance(raw_data[0], dict):
                        print(f"✓ {product_name} already in new format")
                        skipped_count += 1
                        continue
                except:
                    pass
            
            # Convert to new format
            new_images_json = serialize_product_images(images)
            
            print(f"🔄 Migrating {product_name}:")
            print(f"   Old: {images_json[:100]}")
            print(f"   New: {new_images_json[:100]}")
            
            if not dry_run:
                db.execute(
                    text('UPDATE "Product" SET images = :images WHERE id = :id'),
                    {"images": new_images_json, "id": product_id}
                )
                print(f"   ✅ Updated")
            else:
                print(f"   [DRY RUN - no changes made]")
            
            migrated_count += 1
        
        if not dry_run:
            db.commit()
            print("\n" + "=" * 80)
            print(f"✅ Migration completed!")
        else:
            print("\n" + "=" * 80)
            print(f"🔍 DRY RUN completed - no changes were made")
        
        print(f"   Migrated: {migrated_count}")
        print(f"   Skipped: {skipped_count}")
        print(f"   Total: {len(products)}")
        
    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Migrate product images to new format")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Actually apply the migration (default is dry-run)"
    )
    
    args = parser.parse_args()
    
    if args.apply:
        print("⚠️  APPLYING MIGRATION - Changes will be made to the database!")
        print("Press Ctrl+C within 5 seconds to cancel")
        import time
        try:
            time.sleep(5)
        except KeyboardInterrupt:
            print("\n❌ Migration cancelled")
            sys.exit(0)
        print("\n🚀 Starting migration\n")
        migrate_product_images(dry_run=False)
    else:
        print("🔍 DRY RUN MODE - No changes will be made")
        print("Use --apply flag to actually apply the migration\n")
        migrate_product_images(dry_run=True)
