package com.etegram.sdk

import java.net.HttpURLConnection
import java.net.URL

class EtegramClient(
    private val baseUrl: String = "https://api-checkout.etegram.com",
) {
    private val checkoutAllowlist = setOf("checkout.etegram.com")

    fun initializePayment(request: InitializePaymentRequest): InitializeResult {
        validateRequest(request)
        val reference = request.reference?.takeIf { it.isNotBlank() } ?: generateTransactionReference(20)

        val endpoint = URL("${baseUrl.trimEnd('/')}/api/transaction/initialize/${request.projectId}")
        val conn = endpoint.openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Content-Type", "application/json")
        conn.setRequestProperty("Authorization", "Bearer ${request.publicKey}")
        conn.doOutput = true

        val payload = """
            {
              "projectID":"${request.projectId}",
              "publicKey":"${request.publicKey}",
              "email":"${request.email}",
              "phone":"${request.phone}",
              "amount":${request.amount},
              "currency":"${request.currency.uppercase()}",
              "firstname":"${request.firstName}",
              "lastname":"${request.lastName}",
              "reference":"$reference"
            }
        """.trimIndent()

        conn.outputStream.use { it.write(payload.toByteArray()) }

        if (conn.responseCode !in 200..299) {
            throw SDKError(
                code = "INITIALIZE_FAILED",
                message = "initialize request failed",
                httpStatus = conn.responseCode,
                reference = reference,
                retryable = conn.responseCode >= 500,
            )
        }

        val correlationId = conn.getHeaderField("X-Correlation-Id")
        val authorizationUrl = conn.getHeaderField("Location")
            ?: throw SDKError(
                code = "INITIALIZE_INVALID_RESPONSE",
                message = "authorization URL missing from response",
                reference = reference,
                correlationId = correlationId,
            )

        val host = URL(authorizationUrl).host
        if (host !in checkoutAllowlist) {
            throw SDKError(
                code = "CHECKOUT_URL_NOT_ALLOWED",
                message = "checkout URL host is not allowlisted",
                reference = reference,
                correlationId = correlationId,
            )
        }

        return InitializeResult(
            authorizationUrl = authorizationUrl,
            reference = reference,
            correlationId = correlationId,
        )
    }

    private fun validateRequest(request: InitializePaymentRequest) {
        if (request.projectId.isBlank()) throw SDKError("INVALID_PROJECT_ID", "projectId is required")
        if (request.publicKey.isBlank()) throw SDKError("INVALID_PUBLIC_KEY", "publicKey is required")
        if (request.amount <= 0) throw SDKError("INVALID_AMOUNT", "amount must be positive")
        if (!request.currency.matches(Regex("^[A-Za-z]{3}$"))) {
            throw SDKError("INVALID_CURRENCY", "currency must be a 3-letter ISO code")
        }
    }
}
