from __future__ import annotations

import time
from urllib.parse import urlparse
from typing import Any, Dict, Optional

import httpx

from .errors import SDKError
from .models import InitializePaymentRequest, InitializeResult, VerifyResult
from .utils import generate_transaction_reference


class EtegramClient:
    def __init__(
        self,
        base_url: str = "https://api-checkout.etegram.com",
        timeout: float = 15.0,
        verify_max_retries: int = 1,
        retry_base_delay: float = 0.25,
        http_client: Optional[httpx.Client] = None,
    ):
        self._base_url = base_url.rstrip("/")
        self._http = http_client or httpx.Client(timeout=timeout)
        self._verify_max_retries = max(0, verify_max_retries)
        self._retry_base_delay = max(0.0, retry_base_delay)

    _checkout_allowlist = {"checkout.etegram.com"}

    def close(self) -> None:
        self._http.close()

    def initialize_payment(self, request: InitializePaymentRequest) -> InitializeResult:
        reference = request.reference or generate_transaction_reference(20)
        correlation_id: Optional[str] = None
        payload: Dict[str, Any] = request.model_dump(by_alias=True)
        payload["reference"] = reference

        try:
            response = self._http.post(
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
        correlation_id = response.headers.get("x-correlation-id")
        if response.status_code >= 400:
            raise SDKError(
                code="INITIALIZE_FAILED",
                message=self._pick_message(data, response.text),
                http_status=response.status_code,
                provider_code=data.get("code") if isinstance(data, dict) else None,
                reference=reference,
                correlation_id=correlation_id,
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
                correlation_id=correlation_id,
                details=data,
            )

        parsed = urlparse(authorization_url)
        if parsed.scheme != "https" or parsed.hostname not in self._checkout_allowlist:
            raise SDKError(
                code="CHECKOUT_URL_NOT_ALLOWED",
                message="checkout URL host is not allowlisted",
                reference=reference,
                correlation_id=correlation_id,
            )

        resolved_reference = self._dig(data, "data", "reference")
        if not isinstance(resolved_reference, str) or not resolved_reference.strip():
            resolved_reference = reference

        expires_at = self._dig(data, "data", "expires_at")

        return InitializeResult(
            authorizationUrl=authorization_url,
            reference=resolved_reference,
            expiresAt=expires_at if isinstance(expires_at, str) else None,
            correlationId=correlation_id,
        )

    def verify_transaction(self, project_id: str, public_key: str, reference: str) -> VerifyResult:
        if not project_id.strip():
            raise SDKError(code="INVALID_PROJECT_ID", message="project_id is required")
        if not public_key.strip():
            raise SDKError(code="INVALID_PUBLIC_KEY", message="public_key is required")
        if not reference.strip():
            raise SDKError(code="INVALID_REFERENCE", message="reference is required")

        last_error: Optional[SDKError] = None
        for attempt in range(self._verify_max_retries + 1):
            try:
                response = self._http.get(
                    f"{self._base_url}/api/transaction/verify/{project_id}/{reference}",
                    headers={"Authorization": f"Bearer {public_key}"},
                )
            except httpx.HTTPError as exc:
                last_error = SDKError(
                    code="NETWORK_ERROR",
                    message="network error during verify",
                    reference=reference,
                    retryable=True,
                    details=str(exc),
                )
                if attempt < self._verify_max_retries:
                    time.sleep(self._retry_base_delay * (2**attempt))
                    continue
                raise last_error from exc

            data = self._safe_json(response)
            correlation_id = response.headers.get("x-correlation-id")
            if response.status_code >= 400:
                retryable = response.status_code >= 500
                last_error = SDKError(
                    code="VERIFY_FAILED",
                    message=self._pick_message(data, response.text),
                    http_status=response.status_code,
                    provider_code=data.get("code") if isinstance(data, dict) else None,
                    reference=reference,
                    correlation_id=correlation_id,
                    retryable=retryable,
                    details=data,
                )
                if retryable and attempt < self._verify_max_retries:
                    time.sleep(self._retry_base_delay * (2**attempt))
                    continue
                raise last_error

            verify_data = data.get("data", {}) if isinstance(data, dict) else {}
            return VerifyResult(
                reference=str(verify_data.get("reference", reference)),
                status=str(verify_data.get("status", "unknown")),
                message=self._optional_str(verify_data.get("message")),
                correlationId=correlation_id,
            )

        raise last_error or SDKError(code="VERIFY_FAILED", message="request failed", reference=reference)

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
