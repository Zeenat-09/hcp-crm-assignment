from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class InteractionCreate(BaseModel):
    hcp_name: str
    interaction_type: Optional[str] = None
    date_time: Optional[datetime] = None
    attendees: Optional[str] = None
    topics_discussed: Optional[str] = None
    materials_shared: Optional[str] = None
    samples_distributed: Optional[str] = None
    sentiment: Optional[str] = None
    outcomes: Optional[str] = None
    follow_up_actions: Optional[str] = None

class InteractionUpdate(InteractionCreate):
    hcp_name: Optional[str] = None  # allow partial updates

class InteractionOut(InteractionCreate):
    id: int
    class Config:
        from_attributes = True