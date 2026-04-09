from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field


class InitializePaymentRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    project_id: str = Field(min_length=1, alias="projectID")
    public_key: str = Field(min_length=1, alias="publicKey")
    email: str
    phone: str = Field(min_length=3)
    amount: int = Field(gt=0)
    currency: str = Field(min_length=3, max_length=3)
    first_name: str = Field(min_length=1, alias="firstname")
    last_name: str = Field(min_length=1, alias="lastname")
    reference: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    callback_url: Optional[str] = Field(default=None, alias="callbackUrl")


class InitializeResult(BaseModel):
    authorization_url: str = Field(alias="authorizationUrl")
    reference: str
    expires_at: Optional[str] = Field(default=None, alias="expiresAt")
    correlation_id: Optional[str] = Field(default=None, alias="correlationId")


class VerifyResult(BaseModel):
    reference: str
    status: str
    message: Optional[str] = None
    correlation_id: Optional[str] = Field(default=None, alias="correlationId")


class SDKErrorPayload(BaseModel):
    code: str
    message: str
    http_status: Optional[int] = None
    provider_code: Optional[str] = None
    reference: Optional[str] = None
    retryable: bool = False
