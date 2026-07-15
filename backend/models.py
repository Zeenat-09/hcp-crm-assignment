from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    hcp_name = Column(String, nullable=False)
    interaction_type = Column(String)
    date_time = Column(DateTime, default=datetime.utcnow)
    attendees = Column(String)
    topics_discussed = Column(Text)
    materials_shared = Column(String)
    samples_distributed = Column(String)
    sentiment = Column(String)
    outcomes = Column(Text)
    follow_up_actions = Column(Text)