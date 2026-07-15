import React from 'react';
import InteractionForm from './InteractionForm';
import AIChatPanel from './AIChatPanel';
import './LogInteractionScreen.css';

function LogInteractionScreen() {
  return (
    <div className="log-screen">
      <h2 className="log-screen-title">Log HCP Interaction</h2>
      <div className="log-screen-grid">
        <InteractionForm />
        <AIChatPanel />
      </div>
    </div>
  );
}

export default LogInteractionScreen;