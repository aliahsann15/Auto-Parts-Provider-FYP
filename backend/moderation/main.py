from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from moderation_engine import moderate_message

app = FastAPI(title="Chat Moderation Service")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ModerationRequest(BaseModel):
    text: str


class ModerationResponse(BaseModel):
    allowed: bool
    reason: str = ""


@app.post("/moderate", response_model=ModerationResponse)
async def moderate(request: ModerationRequest):
    """
    Moderate a chat message for personal information
    
    Returns:
        {
            "allowed": true/false,
            "reason": "explanation if blocked"
        }
    """
    if not request.text or len(request.text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    result = moderate_message(request.text)
    # normalize engine result to the response model
    allowed = bool(result.get("allowed", True))
    reasons = result.get("reasons") or []
    reason = ", ".join(reasons) if reasons else ""
    return ModerationResponse(allowed=allowed, reason=reason)


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok", "service": "chat-moderation"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
