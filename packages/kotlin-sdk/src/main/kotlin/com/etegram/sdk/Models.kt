package com.etegram.sdk

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class InitializePaymentRequest(
    @SerialName("projectID") val projectId: String,
    @SerialName("publicKey") val publicKey: String,
    val email: String,
    val phone: String,
    val amount: Long,
    val currency: String,
    @SerialName("firstname") val firstName: String,
    @SerialName("lastname") val lastName: String,
    val reference: String? = null,
    val metadata: Map<String, String>? = null,
    @SerialName("callbackUrl") val callbackUrl: String? = null,
)

@Serializable
data class InitializeResult(
    val authorizationUrl: String,
    val reference: String,
    val expiresAt: String? = null,
    val correlationId: String? = null,
)

@Serializable
data class VerifyResult(
    val reference: String,
    val status: String,
    val message: String? = null,
    val correlationId: String? = null,
)
