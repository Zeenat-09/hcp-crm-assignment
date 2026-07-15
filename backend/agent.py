import os
from dotenv import load_dotenv
from typing import TypedDict, Optional
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END

load_dotenv()

llm = ChatGroq(
    groq_api_key=os.getenv("GROQ_API_KEY"),
    model_name="llama-3.1-8b-instant"
)

class AgentState(TypedDict):
    user_input: str
    intent: Optional[str]
    interaction_id: Optional[int]
    extracted_data: Optional[dict]
    response: Optional[str]

import json

def router_node(state: AgentState) -> AgentState:
    prompt = f"""You are an intent classifier for a pharma CRM assistant.
Classify the user's message into exactly one of these intents:
- log_interaction (user is describing a new HCP interaction to record)
- edit_interaction (user wants to change/update an existing logged interaction)
- search_hcp (user wants to find past interactions with a specific HCP)
- suggest_follow_ups (user wants follow-up action suggestions)
- get_history (user wants a summary/history of interactions)

User message: "{state['user_input']}"

Respond with ONLY the intent name, nothing else."""

    result = llm.invoke(prompt)
    intent = result.content.strip().lower()

    valid_intents = ["log_interaction", "edit_interaction", "search_hcp", "suggest_follow_ups", "get_history"]
    state["intent"] = intent if intent in valid_intents else "log_interaction"
    return state

from database import SessionLocal
from models import Interaction

def log_interaction_node(state: AgentState) -> AgentState:
    extraction_prompt = f"""Extract structured HCP interaction details from this message.
Return ONLY valid JSON with these exact keys (use null if not mentioned):
hcp_name, interaction_type, attendees, topics_discussed, materials_shared,
samples_distributed, sentiment (Positive/Neutral/Negative), outcomes, follow_up_actions

Message: "{state['user_input']}"

JSON:"""

    result = llm.invoke(extraction_prompt)
    raw = result.content.strip().strip("```json").strip("```").strip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = {"hcp_name": "Unknown", "topics_discussed": state["user_input"]}

    # Ensure hcp_name is never null/missing, since the DB column is NOT NULL
    if not data.get("hcp_name"):
        data["hcp_name"] = "Unknown HCP"

    # Normalize sentiment casing so it matches frontend's Positive/Neutral/Negative options
    if data.get("sentiment"):
        data["sentiment"] = str(data["sentiment"]).strip().capitalize()

    # Only keep keys that are actual columns on the Interaction model,
    # to avoid crashing if the LLM hallucinates an unexpected field
    valid_keys = {c.name for c in Interaction.__table__.columns}
    data_clean = {k: v for k, v in data.items() if k in valid_keys and v is not None}

    db = SessionLocal()
    interaction = Interaction(**data_clean)
    db.add(interaction)
    db.commit()
    db.refresh(interaction)
    interaction_id = interaction.id
    db.close()

    state["extracted_data"] = data
    state["interaction_id"] = interaction_id
    state["response"] = f"Logged interaction with {data.get('hcp_name', 'HCP')} (ID: {interaction_id})."
    return state


def edit_interaction_node(state: AgentState) -> AgentState:
    extraction_prompt = f"""The user wants to edit an existing interaction.
Extract the interaction_id (if mentioned as a number) and the fields to update as JSON.
Keys allowed: interaction_id, hcp_name, interaction_type, attendees, topics_discussed,
materials_shared, samples_distributed, sentiment, outcomes, follow_up_actions

Message: "{state['user_input']}"

JSON:"""

    result = llm.invoke(extraction_prompt)
    raw = result.content.strip().strip("```json").strip("```").strip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        state["response"] = "Couldn't understand which interaction to edit. Please specify the ID."
        return state

    interaction_id = data.pop("interaction_id", None)
    if not interaction_id:
        state["response"] = "Please specify the interaction ID you want to edit."
        return state

    if data.get("sentiment"):
        data["sentiment"] = str(data["sentiment"]).strip().capitalize()

    valid_keys = {c.name for c in Interaction.__table__.columns}
    data_clean = {k: v for k, v in data.items() if k in valid_keys and v is not None}

    db = SessionLocal()
    interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not interaction:
        state["response"] = f"No interaction found with ID {interaction_id}."
        db.close()
        return state

    for key, value in data_clean.items():
        setattr(interaction, key, value)
    db.commit()
    db.close()

    state["response"] = f"Updated interaction {interaction_id}."
    return state

def search_hcp_node(state: AgentState) -> AgentState:
    extraction_prompt = f"""Extract the HCP name the user wants to search for.
Message: "{state['user_input']}"
Respond with ONLY the HCP name, nothing else."""

    result = llm.invoke(extraction_prompt)
    hcp_name = result.content.strip()

    db = SessionLocal()
    matches = db.query(Interaction).filter(Interaction.hcp_name.ilike(f"%{hcp_name}%")).all()
    db.close()

    if not matches:
        state["response"] = f"No interactions found for '{hcp_name}'."
    else:
        summary = "\n".join([f"- ID {m.id}: {m.interaction_type or 'Interaction'} on {m.date_time}, sentiment: {m.sentiment}" for m in matches])
        state["response"] = f"Found {len(matches)} interaction(s) for {hcp_name}:\n{summary}"
    return state


def suggest_follow_ups_node(state: AgentState) -> AgentState:
    interaction_id = state.get("interaction_id")
    db = SessionLocal()

    if interaction_id:
        interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    else:
        interaction = db.query(Interaction).order_by(Interaction.id.desc()).first()

    if not interaction:
        db.close()
        state["response"] = "No interaction found to suggest follow-ups for."
        return state

    prompt = f"""Based on this HCP interaction, suggest 2-3 concise, actionable follow-up steps.
HCP: {interaction.hcp_name}
Topics discussed: {interaction.topics_discussed}
Sentiment: {interaction.sentiment}
Outcomes: {interaction.outcomes}

List the follow-ups as short bullet points."""

    result = llm.invoke(prompt)
    db.close()
    state["response"] = result.content.strip()
    return state


def get_history_node(state: AgentState) -> AgentState:
    db = SessionLocal()
    interactions = db.query(Interaction).order_by(Interaction.date_time.desc()).limit(5).all()
    db.close()

    if not interactions:
        state["response"] = "No interactions logged yet."
    else:
        summary = "\n".join([f"- {i.hcp_name} ({i.interaction_type}) on {i.date_time}, sentiment: {i.sentiment}" for i in interactions])
        state["response"] = f"Recent interaction history:\n{summary}"
    return state

def build_agent_graph():
    graph = StateGraph(AgentState)

    graph.add_node("router", router_node)
    graph.add_node("log_interaction", log_interaction_node)
    graph.add_node("edit_interaction", edit_interaction_node)
    graph.add_node("search_hcp", search_hcp_node)
    graph.add_node("suggest_follow_ups", suggest_follow_ups_node)
    graph.add_node("get_history", get_history_node)

    graph.set_entry_point("router")

    def route_decision(state: AgentState) -> str:
        return state["intent"]

    graph.add_conditional_edges(
        "router",
        route_decision,
        {
            "log_interaction": "log_interaction",
            "edit_interaction": "edit_interaction",
            "search_hcp": "search_hcp",
            "suggest_follow_ups": "suggest_follow_ups",
            "get_history": "get_history",
        }
    )

    graph.add_edge("log_interaction", END)
    graph.add_edge("edit_interaction", END)
    graph.add_edge("search_hcp", END)
    graph.add_edge("suggest_follow_ups", END)
    graph.add_edge("get_history", END)

    return graph.compile()


agent_graph = build_agent_graph()


def run_agent(user_input: str) -> dict:
    initial_state = {
        "user_input": user_input,
        "intent": None,
        "interaction_id": None,
        "extracted_data": None,
        "response": None,
    }
    result = agent_graph.invoke(initial_state)
    return result