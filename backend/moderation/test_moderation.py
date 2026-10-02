"""Quick test script for moderation service"""
from moderation_engine import moderate_message

# Test cases
test_messages = [
    ("What is the price?", True),
    ("Call me at 03001234567", False),
    ("My email is test@example.com", False),
    ("Meet me at my house", False),
    ("Whatsapp me", False),
    ("I can offer 5000 rupees", True),
    ("Contact me directly", False),
    ("Is this available?", True),
    ("My name is Ahmed", False),
    ("bilal ganj ma enter hotay hi right side pr murna or phr tesri ha", False),
]

print("=" * 60)
print("MODERATION SERVICE TEST")
print("=" * 60)

for text, expected_allowed in test_messages:
    result = moderate_message(text)
    status = "✓" if result["allowed"] == expected_allowed else "✗"
    print(f"\n{status} Text: '{text}'")
    print(f"  Result: {'ALLOWED' if result['allowed'] else 'BLOCKED'}")
    if not result["allowed"]:
        print(f"  Reason: {result['reason']}")

print("\n" + "=" * 60)
print("TEST COMPLETE")
print("=" * 60)
