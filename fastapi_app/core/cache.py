"""
core/cache.py — Thread-safe TTL in-memory кеш.

Заменяет небезопасный глобальный _cache dict из main.py.
При использовании нескольких воркеров Gunicorn — рассмотреть Redis.
"""
import time
import threading
from typing import Any

_lock = threading.Lock()
_store: dict[str, tuple[Any, float]] = {}


def cache_get(key: str, ttl_s: float = 3.0) -> Any | None:
    """Вернуть значение из кеша или None если просрочено/отсутствует."""
    with _lock:
        entry = _store.get(key)
        if entry is None:
            return None
        data, ts = entry
        if time.time() - ts > ttl_s:
            _store.pop(key, None)
            return None
        return data


def cache_set(key: str, value: Any) -> None:
    """Сохранить значение с текущей временной меткой."""
    with _lock:
        _store[key] = (value, time.time())


def cache_del(prefix: str) -> None:
    """Удалить все ключи начинающиеся с prefix."""
    with _lock:
        keys = [k for k in _store if k.startswith(prefix)]
        for k in keys:
            _store.pop(k, None)


def cache_clear() -> None:
    """Полная очистка кеша."""
    with _lock:
        _store.clear()
