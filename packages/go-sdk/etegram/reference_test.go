package etegram

import "testing"

func TestGenerateTransactionReference_DefaultLength(t *testing.T) {
	ref, err := GenerateTransactionReference(0)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(ref) != 23 {
		t.Fatalf("expected reference length 23, got %d", len(ref))
	}
	if ref[:3] != "ETG" {
		t.Fatalf("expected ETG prefix, got %s", ref[:3])
	}
}

func TestGenerateTransactionReference_CustomLength(t *testing.T) {
	ref, err := GenerateTransactionReference(12)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(ref) != 15 {
		t.Fatalf("expected reference length 15, got %d", len(ref))
	}
}
