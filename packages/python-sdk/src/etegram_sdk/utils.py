from __future__ import annotations

import secrets
import string

CHARSET = string.ascii_uppercase + string.digits


def generate_transaction_reference(length: int = 20) -> str:
    if length <= 0:
        length = 20
    suffix = "".join(secrets.choice(CHARSET) for _ in range(length))
    return f"ETG{suffix}"
