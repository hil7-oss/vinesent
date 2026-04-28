"""
core/storage.py — Thread-safe чтение/запись JSON-файлов.

Заменяет небезопасные read_content_data / write_content_data в main.py.
Использует threading.Lock для защиты от конкурентной записи.
"""
import json
import os
import threading
from typing import Any

_locks: dict[str, threading.Lock] = {}
_meta_lock = threading.Lock()


def _get_lock(path: str) -> threading.Lock:
    """Вернуть (или создать) Lock для конкретного файла."""
    with _meta_lock:
        if path not in _locks:
            _locks[path] = threading.Lock()
        return _locks[path]


def read_json(path: str, default: Any = None) -> Any:
    """
    Безопасно читает JSON-файл.
    Возвращает default если файл не существует или повреждён.
    """
    lock = _get_lock(path)
    with lock:
        if not os.path.exists(path):
            return default
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return default


def write_json(path: str, data: Any) -> None:
    """
    Безопасно записывает данные в JSON-файл.
    Создаёт директорию если не существует.
    Использует временный файл + atomic rename для защиты от partial writes.
    """
    lock = _get_lock(path)
    with lock:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        tmp_path = path + ".tmp"
        try:
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            os.replace(tmp_path, path)  # atomic on POSIX, best-effort on Windows
        except Exception:
            # Cleanup tmp if write failed
            try:
                os.remove(tmp_path)
            except OSError:
                pass
            raise
