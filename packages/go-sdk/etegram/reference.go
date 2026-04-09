package etegram

import (
	"crypto/rand"
)

const referenceCharset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

func GenerateTransactionReference(length int) (string, error) {
	if length <= 0 {
		length = 20
	}

	buf := make([]byte, length)
	if _, err := rand.Read(buf); err != nil {
		return "", &SDKError{
			Code:    "RANDOM_GENERATION_FAILED",
			Message: "failed to generate secure random bytes",
			Cause:   err,
		}
	}

	out := make([]byte, 3+length)
	out[0], out[1], out[2] = 'E', 'T', 'G'
	for i := 0; i < length; i++ {
		out[3+i] = referenceCharset[int(buf[i])%len(referenceCharset)]
	}

	return string(out), nil
}
