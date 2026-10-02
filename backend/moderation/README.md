# Chat Moderation Service

Standalone Python FastAPI service for moderating chat messages to prevent sharing of personal information while allowing price negotiations.

## Commands to Start the System
- cd backend/moderation
- ../../.venv/Scripts/Activate.ps1
- ../../.venv/Scripts/python.exe main.py

## Features

- Detects phone numbers (multiple formats including Pakistani)
- Detects email addresses
- Detects physical addresses and location sharing
- Detects Roman Urdu contact intent (WhatsApp, call, etc.)
- Detects explicit name sharing patterns
- Allows price negotiations and part discussions
- Fast regex-based detection
- Python 3.14 compatible
- No API keys required

## Setup

### 1. Install Dependencies

Using Python 3.14 at workspace root:

```bash
cd backend/moderation
pip install -r requirements.txt
```

**Note**: This version uses regex-only detection (no spaCy/Presidio) for Python 3.14 compatibility.

### 2. Run the Service

```bash
python main.py
```

Service will run on `http://localhost:8000`

### 3. Health Check

```bash
curl http://localhost:8000/health
```

### 4. Run Tests

```bash
python test_moderation.py
```

## API Usage

### Endpoint

`POST /moderate`

### Request

```json
{
  "text": "user's chat message"
}
```

### Response (Allowed)

```json
{
  "allowed": true,
  "reason": ""
}
```

### Response (Blocked)

```json
{
  "allowed": false,
  "reason": "phone_number"
}
```

## Blocked Reasons

- `phone_number` - Detected phone number
- `email_address` - Detected email address
- `address_detected` - Detected address keywords
- `roman_urdu_contact` - Detected Roman Urdu contact intent
- `presidio_phone_number` - Presidio detected phone
- `presidio_email_address` - Presidio detected email
- `presidio_location` - Presidio detected location
- `presidio_person` - Presidio detected person name

## Examples

### Allowed Messages

```
"What's the price of this engine oil filter?"
"Can you give me a discount?"
"I'll offer 5000 PKR for this part"
```

### Blocked Messages

```
"Call me at 03001234567"
"WhatsApp me on my number"
"My email is user@example.com"
"Meet me at House 123, Karachi"
"Contact me directly at..."
```

## Integration with Chat Server

The Express backend calls this service before broadcasting messages:

```javascript
const response = await axios.post('http://localhost:8000/moderate', {
  text: messageText
});

if (!response.data.allowed) {
  return res.status(400).json({ 
    ok: false, 
    msg: 'Message contains personal information',
    reason: response.data.reason 
  });
}
```
