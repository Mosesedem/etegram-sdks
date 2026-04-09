package com.etegram.sdk

import java.security.SecureRandom

private val charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
private val random = SecureRandom()

fun generateTransactionReference(length: Int = 20): String {
    val size = if (length <= 0) 20 else length
    val suffix = buildString(size) {
        repeat(size) {
            append(charset[random.nextInt(charset.length)])
        }
    }
    return "ETG$suffix"
}
