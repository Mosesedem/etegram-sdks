package com.etegram.sdk

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ReferenceTest {
    @Test
    fun `generateTransactionReference uses ETG prefix and expected length`() {
        val reference = generateTransactionReference(20)
        assertTrue(reference.startsWith("ETG"))
        assertEquals(23, reference.length)
    }
}
