# Etegram Python SDK (Beta Scaffold)

This package provides sync and async clients for Etegram initialize/verify APIs.

## Install (local scaffold)

```bash
pip install -e .
```

## Quick Start (sync)

```python
from etegram_sdk import EtegramClient, InitializePaymentRequest

client = EtegramClient()
request = InitializePaymentRequest(
    projectID="project_id",
    publicKey="public_key",
    email="user@example.com",
    phone="08012345678",
    amount=5000,
    firstname="Ada",
    lastname="Lovelace",
)
result = client.initialize_payment(request)
print(result.authorization_url, result.reference)
client.close()
```

## Quick Start (async)

```python
import asyncio
from etegram_sdk import AsyncEtegramClient, InitializePaymentRequest


async def run() -> None:
    client = AsyncEtegramClient()
    request = InitializePaymentRequest(
        projectID="project_id",
        publicKey="public_key",
        email="user@example.com",
        phone="08012345678",
        amount=5000,
        firstname="Ada",
        lastname="Lovelace",
    )
    result = await client.initialize_payment(request)
    print(result.authorization_url, result.reference)
    await client.aclose()


asyncio.run(run())
```
