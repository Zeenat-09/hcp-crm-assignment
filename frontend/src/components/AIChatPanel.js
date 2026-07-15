import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addUserMessage, sendChatMessage } from '../store/chatSlice';
import { applyAIExtractedFields } from '../store/interactionSlice';

function AIChatPanel() {
  const dispatch = useDispatch();
  const { messages, status } = useSelector((state) => state.chat);
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;
    dispatch(addUserMessage(input));
    const result = await dispatch(sendChatMessage(input));
    if (result.payload?.extracted_data) {
      dispatch(applyAIExtractedFields(result.payload.extracted_data));
    }
    setInput('');
  };

  return (
    <div className="panel chat-panel">
      <div className="panel-title">🤖 AI Assistant</div>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
        Log interaction via chat
      </div>
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role}`}>
            {m.text}
          </div>
        ))}
      </div>
      <div className="chat-input-row">
        <input
          placeholder="Describe interaction..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button className="log-btn" onClick={handleSend}>
          {status === 'loading' ? '...' : 'Log'}
        </button>
      </div>
    </div>
  );
}

export default AIChatPanel;