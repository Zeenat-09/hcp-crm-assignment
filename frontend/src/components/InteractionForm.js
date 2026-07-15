import React, { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateField, submitInteraction } from '../store/interactionSlice';
import { summarizeVoiceApi } from '../api/api';

function InteractionForm() {
  const dispatch = useDispatch();
  const interaction = useSelector((state) => state.interaction);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const recognitionRef = useRef(null);

  const handleChange = (field) => (e) => {
    dispatch(updateField({ field, value: e.target.value }));
  };

  const handleSubmit = () => {
    const dateTime =
      interaction.date && interaction.time
        ? new Date(`${interaction.date}T${interaction.time}`).toISOString()
        : null;

    const payload = {
      hcp_name: interaction.hcpName,
      interaction_type: interaction.interactionType,
      date_time: dateTime,
      attendees: interaction.attendees,
      topics_discussed: interaction.topicsDiscussed,
      materials_shared: interaction.materialsShared.join(', '),
      samples_distributed: interaction.samplesDistributed.join(', '),
      sentiment: interaction.sentiment,
      outcomes: interaction.outcomes,
      follow_up_actions: interaction.followUpActions,
    };

    dispatch(submitInteraction(payload));
  };

  const handleVoiceNote = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceStatus('Voice recognition is not supported in this browser. Try Chrome.');
      return;
    }

    const consented = window.confirm(
      'This will use your microphone to record a voice note, which will be transcribed and summarized. Do you consent to proceed?'
    );
    if (!consented) return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
      setVoiceStatus('Listening... speak now.');
    };

    recognition.onerror = (event) => {
      setIsRecording(false);
      setVoiceStatus(`Error: ${event.error}`);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.onresult = async (event) => {
  const transcript = event.results[0][0].transcript;

  if (!transcript || transcript.trim().length < 3) {
    setVoiceStatus('No speech detected. Please try again and speak clearly.');
    return;
  }

  setVoiceStatus('Summarizing...');
      try {
        const response = await summarizeVoiceApi(transcript);
        const summary = response.data.summary;
        dispatch(updateField({ field: 'topicsDiscussed', value: summary }));
        setVoiceStatus('Summary added to Topics Discussed.');
      } catch (err) {
        setVoiceStatus('Failed to summarize voice note. Please try again.');
      }
    };

    recognition.start();
  };

  return (
    <div className="panel">
      <div className="panel-title">Interaction Details</div>

      {interaction.id && (
        <div style={{ color: '#2f6fed', fontWeight: 500, marginBottom: 10 }}>
          Saved as Interaction #{interaction.id}
        </div>
      )}

      <div className="field-row">
        <div className="field">
          <label>HCP Name</label>
          <input
            placeholder="Search or select HCP..."
            value={interaction.hcpName}
            onChange={handleChange('hcpName')}
          />
        </div>
        <div className="field">
          <label>Interaction Type</label>
          <select value={interaction.interactionType} onChange={handleChange('interactionType')}>
            <option>Meeting</option>
            <option>Call</option>
            <option>Email</option>
            <option>Conference</option>
          </select>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Date</label>
          <input type="date" value={interaction.date} onChange={handleChange('date')} />
        </div>
        <div className="field">
          <label>Time</label>
          <input type="time" value={interaction.time} onChange={handleChange('time')} />
        </div>
      </div>

      <div className="field" style={{ marginBottom: 12 }}>
        <label>Attendees</label>
        <input
          placeholder="Enter names or search..."
          value={interaction.attendees}
          onChange={handleChange('attendees')}
        />
      </div>

      <div className="field" style={{ marginBottom: 12 }}>
        <label>Topics Discussed</label>
        <textarea
          rows={3}
          placeholder="Enter key discussion points..."
          value={interaction.topicsDiscussed}
          onChange={handleChange('topicsDiscussed')}
        />
      </div>

      <div className="field" style={{ marginBottom: 12 }}>
        <button
          type="button"
          onClick={handleVoiceNote}
          disabled={isRecording}
          style={{
            background: isRecording ? '#9ca3af' : '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            padding: '8px 14px',
            cursor: isRecording ? 'not-allowed' : 'pointer',
            fontSize: 13,
          }}
        >
          🎙️ {isRecording ? 'Listening...' : 'Summarize from Voice Note (Requires Consent)'}
        </button>
        {voiceStatus && (
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>{voiceStatus}</div>
        )}
      </div>

      <div className="field" style={{ marginBottom: 12 }}>
        <label>Sentiment</label>
        <div className="sentiment-options">
          {['Positive', 'Neutral', 'Negative'].map((s) => (
            <label key={s}>
              <input
                type="radio"
                name="sentiment"
                checked={interaction.sentiment === s}
                onChange={() => dispatch(updateField({ field: 'sentiment', value: s }))}
              />
              {s}
            </label>
          ))}
        </div>
      </div>

      <div className="field" style={{ marginBottom: 12 }}>
        <label>Outcomes</label>
        <textarea
          rows={2}
          placeholder="Key outcomes or agreements..."
          value={interaction.outcomes}
          onChange={handleChange('outcomes')}
        />
      </div>

      <div className="field" style={{ marginBottom: 8 }}>
        <label>Follow-up Actions</label>
        <textarea
          rows={2}
          placeholder="Enter next steps or tasks..."
          value={interaction.followUpActions}
          onChange={handleChange('followUpActions')}
        />
      </div>

      {interaction.aiSuggestedFollowUps.length > 0 && (
        <div className="ai-suggestions">
          <strong>AI Suggested Follow-ups:</strong>
          <ul>
            {interaction.aiSuggestedFollowUps.map((f, i) => (
              <li key={i}>+ {f}</li>
            ))}
          </ul>
        </div>
      )}

      <button className="submit-btn" onClick={handleSubmit}>
        {interaction.status === 'loading' ? 'Saving...' : 'Save Interaction'}
      </button>
    </div>
  );
}

export default InteractionForm;