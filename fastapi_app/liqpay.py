import base64
import hashlib
import json
from typing import Any


class LiqPayHelper:
    CHECKOUT_URL = "https://www.liqpay.ua/api/3/checkout"

    def __init__(self, public_key: str | None, private_key: str | None):
        self.public_key = (public_key or "").strip()
        self.private_key = (private_key or "").strip()

    def cnb_data(self, params: dict[str, Any]) -> str:
        payload = dict(params or {})
        if "public_key" not in payload:
            if not self.public_key:
                raise RuntimeError("LIQPAY_PUBLIC_KEY is not set")
            payload["public_key"] = self.public_key
        raw = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
        return base64.b64encode(raw).decode("ascii")

    def cnb_signature(self, params: dict[str, Any]) -> str:
        data = self.cnb_data(params)
        return self._signature(data)

    def _signature(self, data: str) -> str:
        if not self.private_key:
            raise RuntimeError("LIQPAY_PRIVATE_KEY is not set")
        msg = (self.private_key + data + self.private_key).encode("utf-8")
        digest = hashlib.sha1(msg).digest()
        return base64.b64encode(digest).decode("ascii")

