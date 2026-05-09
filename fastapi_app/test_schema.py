from fastapi_app.schemas import CategoryOut
try:
    data = {
        "id": "1",
        "name": "Test",
        "slug": "test",
        "description": None,
        "image": None,
        "parentId": None,
        "order": 0,
        "productCount": 10
    }
    c = CategoryOut(**data)
    print(f"Validation successful: {c}")
except Exception as e:
    print(f"Validation failed: {e}")

try:
    data_no_order = {
        "id": "2",
        "name": "Test 2",
        "slug": "test-2",
        "productCount": 5
    }
    c2 = CategoryOut(**data_no_order)
    print(f"Validation successful (no order): {c2}")
except Exception as e:
    print(f"Validation failed (no order): {e}")
