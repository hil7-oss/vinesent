#!/usr/bin/env python3
"""
Test script for variants API endpoints
"""
import requests
import json
from pprint import pprint

API_BASE = "http://localhost:8000/api/v1"

def test_variants_batch():
    """Test the /variants/batch endpoint"""
    print("\n" + "="*60)
    print("Testing /variants/batch endpoint")
    print("="*60)
    
    # Test data
    test_product_id = "test-product-123"
    test_variants = [
        {
            "size": "104",
            "color": "#000000",
            "stock": 10,
            "price": 500,
            "salePrice": 450
        },
        {
            "size": "110",
            "color": "#000000",
            "stock": 15,
            "price": 500,
            "salePrice": 450
        },
        {
            "size": "104",
            "color": "#ffffff",
            "stock": 8,
            "price": 500,
            "salePrice": 450
        }
    ]
    
    payload = {
        "productId": test_product_id,
        "variants": test_variants
    }
    
    print(f"\nPayload:")
    pprint(payload)
    
    try:
        response = requests.post(
            f"{API_BASE}/variants/batch",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"\nStatus Code: {response.status_code}")
        
        if response.ok:
            print("✓ Success!")
            print("\nResponse:")
            pprint(response.json())
        else:
            print("✗ Failed!")
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"✗ Exception: {e}")

def test_get_variants():
    """Test getting variants for a product"""
    print("\n" + "="*60)
    print("Testing GET /variants")
    print("="*60)
    
    test_product_id = "test-product-123"
    
    try:
        response = requests.get(
            f"{API_BASE}/variants",
            params={"productId": test_product_id}
        )
        
        print(f"\nStatus Code: {response.status_code}")
        
        if response.ok:
            variants = response.json()
            print(f"✓ Found {len(variants)} variants")
            print("\nVariants:")
            for v in variants:
                print(f"  - Size: {v.get('size')}, Color: {v.get('color')}, Stock: {v.get('stock')}, SKU: {v.get('sku')}")
        else:
            print("✗ Failed!")
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"✗ Exception: {e}")

def test_measurements():
    """Test measurements endpoints"""
    print("\n" + "="*60)
    print("Testing measurements endpoints")
    print("="*60)
    
    test_product_id = "test-product-123"
    test_measurements = {
        "sizeChart": {
            "104": {"chest": 56, "length": 42, "sleeve": 38},
            "110": {"chest": 58, "length": 44, "sleeve": 40}
        },
        "material": "100% cotton",
        "careInstructions": "Machine wash cold"
    }
    
    # Test PUT
    print("\n→ Testing PUT /products/{id}/measurements")
    try:
        response = requests.put(
            f"{API_BASE}/products/{test_product_id}/measurements",
            json=test_measurements,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.ok:
            print("✓ Measurements saved!")
        else:
            print("✗ Failed to save measurements")
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"✗ Exception: {e}")
    
    # Test GET
    print("\n→ Testing GET /products/{id}/measurements")
    try:
        response = requests.get(
            f"{API_BASE}/products/{test_product_id}/measurements"
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.ok:
            print("✓ Measurements retrieved!")
            print("\nMeasurements:")
            pprint(response.json())
        else:
            print("✗ Failed to get measurements")
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"✗ Exception: {e}")

def check_api_health():
    """Check if API is accessible"""
    print("\n" + "="*60)
    print("Checking API health")
    print("="*60)
    
    try:
        response = requests.get(f"{API_BASE.replace('/api/v1', '')}/health")
        if response.ok:
            print("✓ API is accessible")
            return True
        else:
            print("✗ API returned error")
            return False
    except Exception as e:
        print(f"✗ Cannot connect to API: {e}")
        print(f"Make sure FastAPI is running on {API_BASE}")
        return False

if __name__ == "__main__":
    print("\n" + "="*60)
    print("VARIANTS API TEST SUITE")
    print("="*60)
    
    if not check_api_health():
        print("\n⚠ API is not accessible. Please start the FastAPI server first.")
        print("Run: docker-compose up fastapi")
        exit(1)
    
    # Run tests
    test_variants_batch()
    test_get_variants()
    test_measurements()
    
    print("\n" + "="*60)
    print("TEST SUITE COMPLETED")
    print("="*60)
