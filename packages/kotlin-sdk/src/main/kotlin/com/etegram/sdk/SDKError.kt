package com.etegram.sdk

class SDKError(
    val code: String,
    override val message: String,
    val httpStatus: Int? = null,
    val providerCode: String? = null,
    val reference: String? = null,
    val correlationId: String? = null,
    val retryable: Boolean = false,
    val details: String? = null,
) : Exception(message)
