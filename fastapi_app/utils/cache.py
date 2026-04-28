"""Simple in-memory cache utility"""
import time

_cache = {}


def cache_get(key, ttl_s=3.0):
    v = _cache.get(key)
    if not v:
        return None
    data, ts = v
    if time.time() - ts > ttl_s:
        _cache.pop(key, None)
        return None
    return data


def cache_set(key, value):
    _cache[key] = (value, time.time())


def cache_del(prefix):
    keys = [k for k in _cache.keys() if str(k).startswith(prefix)]
    for k in keys:
        _cache.pop(k, None)
