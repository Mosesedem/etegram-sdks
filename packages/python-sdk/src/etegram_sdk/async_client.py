from __future__ import annotations

from typing import Any, Dict, Optional

import httpx

from .errors import SDKError
from .models import InitializePaymentRequest, InitializeResult, VerifyResult
from .utils import generate_transaction_reference


class AsyncEtegramClient:
    def __init__(self, base_url: str = "https://api-checkout.etegram.com", timeout: float = 15.0):
        self._base_url = base_url.rstrip("/")
        self._http = httpx.AsyncClient(timeout=timeout)

    async def aclose(self) -> None:
        await self._http.aclose()

    async def initialize_payment(self, request: InitializePaymentRequest) -> InitializeResult:
        reference = request.reference or generate_transaction_reference(20)
        payload: Dict[str, Any] = request.model_dump(by_alias=True)
        payload["reference"] = reference

        try:
            response = await self._http.post(
                f"{self._base_url}/api/transaction/initialize/{request.project_id}",
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {request.public_key}",
                },
            )
        except httpx.HTTPError as exc:
            raise SDKError(
                code="NETWORK_ERROR",
                message="network error during initialize",
                reference=reference,
                retryable=True,
                details=str(exc),
            ) from exc

        data = self._safe_json(response)
        if response.status_code >= 400:
            raise SDKError(
                code="INITIALIZE_FAILED",
                message=self._pick_message(data, response.text),
                http_status=response.status_code,
                provider_code=data.get("code") if isinstance(data, dict) else None,
                reference=reference,
                retryable=response.status_code >= 500,
                details=data,
            )

        authorization_url = self._dig(data, "data", "authorization_url")
        if not isinstance(authorization_url, str) or not authorization_url.strip():
            raise SDKError(
                code="INITIALIZE_INVALID_RESPONSE",
                message="authorization URL missing from response",
                http_status=response.status_code,
                reference=reference,
                details=data,
            )

        return InitializeResult(authorizationUrl=authorization_url, reference=reference)

    async def verify_transaction(self, project_id: str, public_key: str, reference: str) -> VerifyResult:
        if not reference.strip():
            raise SDKError(code="INVALID_REFERENCE", message="reference is required")

        try:
            response = await self._http.get(
                f"{self._base_url}/api/transaction/verify/{project_id}/{reference}",
                headers={"Authorization": f"Bearer {public_key}"},
            )
        except httpx.HTTPError as exc:
            raise SDKError(
                code="NETWORK_ERROR",
                message="network error during verify",
                reference=reference,
                retryable=True,
                details=str(exc),
            ) from exc

        data = self._safe_json(response)
        if response.status_code >= 400:
            raise SDKError(
                code="VERIFY_FAILED",
                message=self._pick_message(data, response.text),
                http_status=response.status_code,
                provider_code=data.get("code") if isinstance(data, dict) else None,
                reference=reference,
                retryable=response.status_code >= 500,
                details=data,
            )

        verify_data = data.get("data", {}) if isinstance(data, dict) else {}
        return VerifyResult(
            reference=str(verify_data.get("reference", reference)),
            status=str(verify_data.get("status", "unknown")),
            message=self._optional_str(verify_data.get("message")),
        )

    @staticmethod
    def _safe_json(response: httpx.Response) -> Any:
        try:
            return response.json()
        except ValueError:
            return {}

    @staticmethod
    def _pick_message(data: Any, fallback: str) -> str:
        if isinstance(data, dict):
            message = data.get("message")
            if isinstance(message, str) and message.strip():
                return message
        if fallback.strip():
            return fallback
        return "request failed"

    @staticmethod
    def _dig(data: Any, *keys: str) -> Any:
        current = data
        for key in keys:
            if not isinstance(current, dict):
                return None
            current = current.get(key)
        return current

    @staticmethod
    def _optional_str(value: Any) -> Optional[str]:
        if isinstance(value, str) and value.strip():
            return value
        return None
