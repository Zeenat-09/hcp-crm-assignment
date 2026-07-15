from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Interaction
from schemas import InteractionCreate, InteractionUpdate, InteractionOut
from agent import run_agent
from pydantic import BaseModel

router = APIRouter(prefix="/interactions", tags=["interactions"])

@router.post("/", response_model=InteractionOut)
def create_interaction(data: InteractionCreate, db: Session = Depends(get_db)):
    interaction = Interaction(**data.dict())
    db.add(interaction)
    db.commit()
    db.refresh(interaction)
    return interaction

@router.get("/", response_model=list[InteractionOut])
def list_interactions(db: Session = Depends(get_db)):
    return db.query(Interaction).all()

@router.get("/{interaction_id}", response_model=InteractionOut)
def get_interaction(interaction_id: int, db: Session = Depends(get_db)):
    interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    return interaction

@router.put("/{interaction_id}", response_model=InteractionOut)
def update_interaction(interaction_id: int, data: InteractionUpdate, db: Session = Depends(get_db)):
    interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    for key, value in data.dict(exclude_unset=True).items():
        setattr(interaction, key, value)
    db.commit()
    db.refresh(interaction)
    return interaction

class ChatRequest(BaseModel):
    message: str

@router.post("/chat")
def chat_with_agent(request: ChatRequest):
    result = run_agent(request.message)
    return {
        "response": result.get("response"),
        "intent": result.get("intent"),
        "interaction_id": result.get("interaction_id"),
        "extracted_data": result.get("extracted_data"),
    }

class VoiceSummaryRequest(BaseModel):
    transcript: str

@router.post("/summarize-voice")
def summarize_voice(request: VoiceSummaryRequest):
    from agent import llm
    prompt = f"""Summarize this voice note into a concise summary of topics discussed during an HCP interaction. Keep it professional and brief.

Voice note transcript: "{request.transcript}"

Summary:"""
    result = llm.invoke(prompt)
    return {"summary": result.content.strip()}