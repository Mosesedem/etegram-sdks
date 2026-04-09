import asyncio
import httpx
import importlib
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

etegram_sdk = importlib.import_module("etegram_sdk")
AsyncEtegramClient = etegram_sdk.AsyncEtegramClient
InitializePaymentRequest = etegram_sdk.InitializePaymentRequest


def test_async_initialize_payment_success() -> None:
    asyncio.run(_run_async_initialize_payment_success())


async def _run_async_initialize_payment_success() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        return httpx.Response(
            status_code=200,
            headers={"x-correlation-id": "corr-a1"},
            json={
                "message": "Authorization URL created",
                "data": {
                    "authorization_url": "https://checkout.etegram.com/pay/1",
                    "reference": "ETGREF",
                },
            },
        )

    transport = httpx.MockTransport(handler)
    http_client = httpx.AsyncClient(transport=transport)
    client = AsyncEtegramClient(http_client=http_client)

    result = await client.initialize_payment(
        InitializePaymentRequest(
            projectID="project",
            publicKey="pk_test",
            email="user@example.com",
            phone="08012345678",
            amount=5000,
            currency="NGN",
            firstname="Ada",
            lastname="Lovelace",
        )
    )

    assert result.reference == "ETGREF"
    assert result.correlation_id == "corr-a1"

    await client.aclose()
