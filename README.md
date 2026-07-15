# AI-First CRM — HCP Log Interaction Module

## Overview
This project implements the "Log Interaction Screen" for an AI-first CRM's Healthcare Professional (HCP) module. Field representatives can log HCP interactions either through a structured form or a conversational chat interface powered by a LangGraph agent and Groq LLM.

## Tech Stack
- Frontend: React + Redux Toolkit
- Backend: Python + FastAPI
- AI Agent Framework: LangGraph
- LLM: Groq (llama-3.1-8b-instant)
- Database: SQLite (used for local development; can be swapped to PostgreSQL/MySQL by changing the SQLAlchemy connection string in database.py)
- Font: Google Inter

## Note on LLM Model
The assignment specified Groq's gemma2-9b-it model. This model was decommissioned by Groq after the assignment was issued. It has been replaced with llama-3.1-8b-instant, Groq's officially recommended direct replacement with similar price-performance and speed.

## LangGraph Agent — Role

The LangGraph agent is the intelligent core connecting the chat interface to the database. It interprets natural-language input from field reps, classifies intent, and routes to the correct tool to log, edit, search, or summarize HCP interactions — removing the need to manually fill every form field.

The agent is built as a StateGraph with a router node that classifies intent using the LLM, then routes to one of five tool nodes via conditional edges.

## LangGraph Agent — 5 Tools

1. Log Interaction (mandatory)
   Extracts structured fields (HCP name, interaction type, attendees, topics, materials, samples, sentiment, outcomes, follow-ups) from free text using the LLM, validates and defaults missing fields, and saves a new interaction record. Returns the new interaction ID.

2. Edit Interaction (mandatory)
   Parses the interaction ID and fields to update from natural language, applies only the specified changes to the existing record, and commits the update.

3. Search HCP
   Extracts an HCP name from the message and returns all matching logged interactions with type, date, and sentiment.

4. Suggest Follow-ups
   Uses the LLM to generate 2-3 actionable follow-up recommendations based on a given interaction's context (HCP, topics, sentiment, outcomes).

5. Get History
   Returns the 5 most recent interactions across all HCPs as a chronological summary.

## Design Note

Instead of the standard LangGraph bind_tools() pattern, this agent uses an intent-classification router: the LLM classifies the message into one of five intents, and a conditional edge deterministically routes to the matching node. This was chosen for more predictable routing and simpler debugging in a CRM context where incorrect tool selection could cause data errors.

## How to Run

### Backend
1. cd backend
2. python -m venv venv
3. venv\Scripts\activate   (on Windows)
4. pip install fastapi uvicorn sqlalchemy psycopg2-binary langgraph langchain-groq python-dotenv pydantic
5. Create a .env file in backend/ with: GROQ_API_KEY=your_key_here
6. uvicorn main:app --reload
7. Backend runs at http://127.0.0.1:8000
8. API docs available at http://127.0.0.1:8000/docs

### Frontend
1. cd frontend
2. npm install
3. npm start
4. Frontend runs at http://localhost:3000

## Features Implemented
- Structured form for logging HCP interactions
- Conversational chat interface for logging via natural language
- LangGraph agent with 5 tools (Log Interaction, Edit Interaction, Search HCP, Suggest Follow-ups, Get History)
- Groq LLM integration for intent classification and data extraction
- Full CRUD API for interactions
- Redux state management on the frontend
- Auto-fill of structured form fields from chat-extracted data

## Known Limitations / Future Scope
- Voice note summarization (shown in original UI mockup) is not yet implemented
- Currently uses SQLite for local development; production deployment would use PostgreSQL or MySQL