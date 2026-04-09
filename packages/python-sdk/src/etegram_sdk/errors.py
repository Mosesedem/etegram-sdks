from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional


@dataclass
class SDKError(Exception):
    code: str
    message: str
    http_status: Optional[int] = None
    provider_code: Optional[str] = None
    reference: Optional[str] = None
    retryable: bool = False
    details: Any = None

    def __str__(self) -> str:
        if self.http_status is not None:
            return f"{self.code}: {self.message} (http={self.http_status})"
        return f"{self.code}: {self.message}"
