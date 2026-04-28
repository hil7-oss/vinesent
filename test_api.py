#!/usr/bin/env python3
"""Quick API test"""
import sys
import requests

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"

def test(method, path, expected=200):
    url = BASE + path
    try:
        r = requests.get(url, timeout=10) if method == "GET" else requests.post(url, json={}, timeout=10)
        status = "OK" if r.status_code == expected else f"FAIL({r.status_code})"
        print(f"{status}: {method} {path}")
        if r.status_code != expected:
            print(f"  -> Got {r.status_code}, expected {expected}")
            print(f"  -> {r.text[:200]}")
    except Exception as e:
        print(f"ERROR: {method} {path} -> {e}")

print("Testing API...")
print()

test("GET", "/")
test("GET", "/health")
test("GET", "/api/v1/categories")
test("GET", "/api/v1/products")
test("GET", "/api/v1/products?new=true")
test("GET", "/api/v1/products?sale=true")
test("GET", "/api/v1/products?slug=girl")
test("GET", "/api/v1/content")
test("GET", "/api/v1/content/home")
test("GET", "/content")
test("GET", "/content/home")
test("GET", "/promo-banners")
test("GET", "/stores")
test("GET", "/categories")
test("GET", "/auth/me")
test("GET", "/sitemap-data")