import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const client = axios.create({ baseURL: API_BASE });

export const logInteractionApi = (payload) =>
  client.post('/interactions/', payload);

export const editInteractionApi = (id, updates) =>
  client.put(`/interactions/${id}`, updates);

export const sendChatMessageApi = (message, history) =>
  client.post('/interactions/chat', { message });

export const summarizeVoiceApi = (transcript) =>
  client.post('/interactions/summarize-voice', { transcript });