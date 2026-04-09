import httpx
import importlib
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

etegram_sdk = importlib.import_module("etegram_sdk")
EtegramClient = etegram_sdk.EtegramClient
InitializePaymentRequest = etegram_sdk.InitializePaymentRequest


def test_initialize_payment_success() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        return httpx.Response(
            status_code=200,
            headers={"x-correlation-id": "corr-1"},
            json={
                "message": "Authorization URL created",
                "data": {
                    "authorization_url": "https://checkout.etegram.com/pay/1",
                    "reference": "ETGREF",
                    "expires_at": "2030-01-01T00:00:00Z",
                },
            },
        )

    transport = httpx.MockTransport(handler)
    http_client = httpx.Client(transport=transport)
    client = EtegramClient(http_client=http_client)

    result = client.initialize_payment(
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

    assert result.authorization_url == "https://checkout.etegram.com/pay/1"
    assert result.reference == "ETGREF"
    assert result.correlation_id == "corr-1"


def test_verify_transaction_success() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        return httpx.Response(
            status_code=200,
            headers={"x-correlation-id": "corr-2"},
            json={
                "message": "ok",
                "data": {
                    "reference": "ETGREF",
                    "status": "success",
                    "message": "verified",
                },
            },
        )

    transport = httpx.MockTransport(handler)
    http_client = httpx.Client(transport=transport)
    client = EtegramClient(http_client=http_client)

    result = client.verify_transaction("project", "pk_test", "ETGREF")

    assert result.reference == "ETGREF"
    assert result.status == "success"
    assert result.correlation_id == "corr-2"
