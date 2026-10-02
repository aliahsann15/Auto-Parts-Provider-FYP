# AI Chat Moderation Integration Guide

## Overview

This guide walks through setting up the AI-powered chat moderation system that prevents users from sharing personal information (phone numbers, emails, addresses, locations) while allowing price negotiations.

## Architecture

```
User Chat Input
    ↓
Client Validation (optional UI hints)
    ↓
Send to Backend API (/api/chats/:requestId)
    ↓
Backend Moderation Check (calls Python service)
    ↓
Python Moderation Service (port 8000)
    ├─ Regex patterns (phone, email, address, name sharing)
    └─ Roman Urdu contact keywords
    ↓
If Allowed → Save & Broadcast message via WebSocket
If Blocked → Return 400 error with reason
    ↓
Frontend shows error toast
```

## Setup Instructions

### Step 1: Python Environment Setup

**Important**: Use Python 3.14 installed at workspace root.

**1.1 Verify Python version**
```bash
python --version
# Should show: Python 3.14.0
```

The workspace already has a venv configured with Python 3.14 at `D:\auto-parts-provider\.venv`

### Step 2: Backend Setup (Python Moderation Service)

**2.1 Navigate to moderation directory**
```bash
cd backend/moderation
```

**2.2 Install Python dependencies**
```bash
pip install -r requirements.txt
```

**Note**: This version uses regex-only detection for Python 3.14 compatibility (no spaCy/Presidio).

**2.3 Test the moderation engine**
```bash
python test_moderation.py
```

Expected output: All tests should pass with ✓

**2.4 Run the moderation service**

Option A - Command line:
```bash
python main.py
```

Option B - PowerShell script:
```powershell
.\start_service.ps1
```

Option C - Batch file:
```cmd
start_service.bat
```

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**1.4 Test the service**
```bash
curl -X POST http://localhost:8000/moderate \
  -H "Content-Type: application/json" \
  -d '{"text": "whatsapp karo"}'

# Response: {"allowed": false, "reason": "roman_urdu_contact"}
```

### Step 2: Backend Setup (Express Chat Controller)

**2.1 Install axios (if not already installed)**
```bash
cd ../..  # Go to backend root
npm install axios
```

**2.2 Configuration (Optional)**

The backend automatically looks for the moderation service at `http://localhost:8000`. To change this:

Create a `.env` file in the backend root:
```
MODERATION_SERVICE_URL=http://localhost:8000
```

Or set environment variable:
```bash
export MODERATION_SERVICE_URL=http://localhost:8000
```

**2.3 Verify backend loads updated code**

The `postChatMessage` function in `chatController.ts` now includes:
- Pre-send moderation check via axios call to Python service
- Returns 400 error if message is blocked
- Includes `reason` field for debugging

### Step 3: Frontend Setup (Web Chat Components)

**3.1 Changes already applied to:**
- `web/app/components/chat/buyer-chat.tsx` — Buyer chat interface
- `web/app/seller/messages/page.tsx` — Seller chat interface

**3.2 What happens on blocked message:**

When a message is blocked:
1. Backend returns 400 with error message
2. Frontend catches error and shows toast notification
3. User sees: "Message contains personal information. Please revise and resend."
4. Message input is cleared or kept for editing
5. Focus returns to input field

### Step 4: Mobile Integration (Optional)

For React Native/Expo mobile app, the same flow works:

```javascript
const handleSendMessage = async (text) => {
  try {
    const response = await fetch(`${API_BASE}/api/chats/${requestId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ text, sellerId })
    });
    
    if (!response.ok) {
      const err = await response.json();
      Alert.alert('Message Blocked', err.msg); // Show to user
      return;
    }
    // Message sent successfully
  } catch (error) {
    console.error('Send failed:', error);
  }
};
```

## Testing the System

### Test Case 1: Allowed Message (Price Negotiation)
```
Input: "Can you give me a discount? I'll offer 5000 PKR"
Expected: ✅ Message sent and broadcast
```

### Test Case 2: Blocked - Phone Number
```
Input: "Call me at 03001234567"
Expected: ❌ Error toast: "Message contains personal information..."
```

### Test Case 3: Blocked - Email
```
Input: "Contact me at user@example.com"
Expected: ❌ Error toast
```

### Test Case 4: Blocked - Roman Urdu Contact
```
Input: "WhatsApp karo mujhe"
Expected: ❌ Error toast
```

### Test Case 5: Blocked - Address
```
Input: "Meet me at House 123, Karachi"
Expected: ❌ Error toast
```

### Test Case 6: Allowed - Part Discussion
```
Input: "Does this engine oil filter fit my Toyota Camry 2015?"
Expected: ✅ Message sent
```

## Troubleshooting

### Issue: Python service won't start

```bash
# Check Python version
python --version  # Should be 3.8+

# Check dependencies
pip list | grep fastapi

# Try installing again
pip install --upgrade -r requirements.txt

# Download spaCy model again
python -m spacy download en_core_web_lg
```

### Issue: Backend can't reach moderation service

```bash
# Check if service is running
curl http://localhost:8000/health

# Check environment variable
echo $MODERATION_SERVICE_URL

# Check firewall/ports
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows
```

### Issue: Messages allowed when they should be blocked

1. Check Python service logs for errors
2. Test moderation endpoint directly:
```bash
curl -X POST http://localhost:8000/moderate \
  -H "Content-Type: application/json" \
  -d '{"text": "your test message"}'
```

3. Check backend logs for moderation response
4. Verify Presidio spaCy model is loaded: `python -c "import spacy; spacy.load('en_core_web_lg')"`

### Issue: Performance/Latency

If moderation is slow:
1. Check Python service CPU: `python -c "import spacy; nlp = spacy.load('en_core_web_lg'); print('Loaded')"`
2. Consider caching repeated checks
3. Adjust Presidio confidence thresholds in `moderation_engine.py`
4. Run Python service on more powerful machine or add load balancer

## Logging and Monitoring

### Backend Logs

Look for moderation messages in Express server logs:
```
postChatMessage - requestId: 123xyz
Message blocked by moderation: phone_number
```

### Python Service Logs

```bash
# Run with more verbose logging
python main.py --log-level debug
```

### Future Enhancement: Moderation Audit Log

Store blocked messages in database for review:
```javascript
// In backend, after moderation blocks
await ModerationLog.create({
  userId: sender,
  requestId,
  blockedText: text,
  reason: moderationResponse.reason,
  timestamp: new Date()
});
```

## Performance Optimization

Current implementation checks every message in real-time. To optimize:

1. **Add caching** — Cache checked messages to avoid re-checking identical text
2. **Async moderation** — Queue messages and check in background (allows fast send)
3. **Client-side pre-check** — Add optional frontend regex check as early warning
4. **Bulk checks** — Batch multiple message checks if many users send simultaneously

## API Reference

### Moderation Endpoint

```
POST /moderate
Host: localhost:8000

Request:
{
  "text": "user's message"
}

Response (Allowed):
{
  "allowed": true,
  "reason": ""
}

Response (Blocked):
{
  "allowed": false,
  "reason": "phone_number" | "email_address" | "address_detected" | "roman_urdu_contact" | "presidio_*"
}
```

### Chat Message Endpoint (Updated)

```
POST /api/chats/:requestId
Host: localhost:4001

Request:
{
  "text": "message text",
  "sellerId": "user_id" // for buyers only
}

Response (Allowed):
{
  "ok": true,
  "item": { message object }
}

Response (Blocked):
{
  "ok": false,
  "msg": "Message contains personal information. Please revise and resend.",
  "reason": "phone_number"
}
```

## Next Steps

1. ✅ Start Python moderation service (`python main.py`)
2. ✅ Start backend Express server (`npm run dev`)
3. ✅ Start web frontend (`npm run dev`)
4. ✅ Test chat messaging with blocked/allowed content
5. Optional: Add moderation audit logging to database
6. Optional: Create admin dashboard to review flagged messages
7. Optional: Add client-side pre-check for faster UX feedback
