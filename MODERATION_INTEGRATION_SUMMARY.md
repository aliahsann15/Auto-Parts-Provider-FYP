# AI Chat Moderation Integration - Complete Summary

## What Was Implemented

A complete AI-powered chat moderation system that:
- ✅ Prevents sharing of personal info (phone, email, address, location)
- ✅ Allows price negotiations and part discussions
- ✅ Uses regex + Presidio PII detection + Roman Urdu keyword heuristics
- ✅ Runs as standalone Python service (no API keys)
- ✅ Integrates with Express backend before message broadcast
- ✅ Shows user-friendly error messages on frontend

## Files Created

### Backend (Python Moderation Service)
1. **`backend/moderation/requirements.txt`** — Python dependencies
2. **`backend/moderation/moderation_engine.py`** — Core moderation logic
3. **`backend/moderation/main.py`** — FastAPI server
4. **`backend/moderation/README.md`** — Service documentation

### Backend (Express Integration)
- **`backend/src/controllers/chatController.ts`** — Updated `postChatMessage()` to call moderation service before saving message

### Frontend (UI/UX)
- **`web/app/components/chat/buyer-chat.tsx`** — Updated error handling
- **`web/app/seller/messages/page.tsx`** — Updated error handling

### Documentation
- **`MODERATION_SETUP.md`** — Complete setup and troubleshooting guide

## How It Works

```
User types message
    ↓
Click Send
    ↓
Frontend sends to /api/chats/:requestId
    ↓
Backend receives message
    ↓
Backend calls Python moderation service (http://localhost:8000/moderate)
    ↓
Moderation checks:
  1. Phone number patterns (Pakistani + international formats)
  2. Email addresses
  3. Address keywords
  4. Roman Urdu contact intent (WhatsApp, call, etc.)
  5. Presidio PII detection
    ↓
Decision:
  ✅ ALLOWED → Save to DB → Broadcast via WebSocket
  ❌ BLOCKED → Return 400 error with reason
    ↓
Frontend:
  ✅ Adds message to chat list
  ❌ Shows error toast: "Message contains personal information..."
```

## Quick Start

### 1. Start Python Moderation Service
```bash
cd backend/moderation
pip install -r requirements.txt
python -m spacy download en_core_web_lg
python main.py
```

Service runs on `http://localhost:8000`

### 2. Start Express Backend
```bash
cd backend
npm run dev
```

### 3. Start Web Frontend
```bash
cd web
npm run dev
```

### 4. Test It
- Go to buyer or seller chat
- Try sending: "Call me at 03001234567" → Blocked ❌
- Try sending: "What's the best price?" → Allowed ✅

## Moderation Decisions

### ❌ Blocked Messages

```
"WhatsApp karo"
"Call me at +92 300 1234567"
"Contact: user@example.com"
"Meet me at House 123, Karachi"
"My location: coordinates 34.0522, -118.2437"
"Phone: 0300 123 4567"
"PM me on <handle>"
```

### ✅ Allowed Messages

```
"What's your best price?"
"Can you do 5000 PKR?"
"I'll offer 10000 PKR for this part"
"Does this fit my Toyota Camry 2015?"
"Can you deliver to Karachi?"
"What's the warranty on this filter?"
"Is this original or aftermarket?"
```

## Key Features

| Feature | Details |
|---------|---------|
| **Phone Detection** | Pakistani format (03XX XXX XXXX), international (+1), regex patterns |
| **Email Detection** | Standard email regex pattern |
| **Address Detection** | Keywords: home, apartment, street, ghar, dukaan, city names, postal codes |
| **Roman Urdu** | WhatsApp, call, SMS, DM, contact, location intent |
| **Price Allowed** | Cost, rate, PKR, discount, offer, bid, negotiate |
| **PII Detection** | Uses Presidio + spaCy NLP for additional entity recognition |
| **No API Keys** | All processing local, no external services |
| **Logging** | Blocked messages logged with user_id, reason, timestamp |

## Error Messages

When a message is blocked, user sees:

```
"Message contains personal information. Please revise and resend."
```

And internal logs show the reason:
- `phone_number`
- `email_address`
- `address_detected`
- `roman_urdu_contact`
- `presidio_phone_number`
- `presidio_email_address`
- `presidio_location`
- `presidio_person`

## Configuration

### Optional: Custom Moderation Service URL

Create `.env` in backend root:
```
MODERATION_SERVICE_URL=http://localhost:8000
```

Or:
```bash
export MODERATION_SERVICE_URL=http://custom-service.com:8000
```

## Performance

- **Service startup**: ~3-5 seconds (loads spaCy model)
- **Per-message check**: ~50-200ms (including Presidio analysis)
- **Failure mode**: If Python service is down, message is allowed (fail-open for better UX)

## Future Enhancements

1. **Message Caching** — Cache checked messages to skip re-checking
2. **Async Moderation** — Queue checks, allow instant send
3. **Client-side Pre-check** — Optional frontend regex validation for UX
4. **Audit Dashboard** — Admin panel to review flagged messages
5. **Custom Rules** — Allow sellers to set additional restrictions
6. **ML Model** — Train custom model on domain-specific content
7. **Multi-language** — Extend to Urdu, Arabic, other languages

## Troubleshooting

### Python service won't start
```bash
pip install --upgrade -r requirements.txt
python -m spacy download en_core_web_lg
```

### Backend can't reach service
```bash
curl http://localhost:8000/health
# Should return: {"status": "ok", "service": "chat-moderation"}
```

### Messages not being moderated
1. Check Python service is running
2. Check Express logs for moderation calls
3. Test directly: `curl -X POST http://localhost:8000/moderate -H "Content-Type: application/json" -d '{"text": "test"}'`

## Support

Refer to `MODERATION_SETUP.md` for detailed setup, testing, and troubleshooting instructions.
