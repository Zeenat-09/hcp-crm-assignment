import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { sendChatMessageApi } from '../api/api';

export const sendChatMessage = createAsyncThunk(
  'chat/sendMessage',
  async (message, { getState }) => {
    const state = getState();
    const response = await sendChatMessageApi(message, state.chat.messages);
    return response.data;
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    messages: [
      {
        role: 'assistant',
        text: 'Log interaction details here (e.g., "Met Dr. Smith, discussed Product X efficacy, positive sentiment, shared brochure") or ask for help.',
      },
    ],
    status: 'idle',
  },
  reducers: {
    addUserMessage: (state, action) => {
      state.messages.push({ role: 'user', text: action.payload });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendChatMessage.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.messages.push({ role: 'assistant', text: action.payload.response });
      })
      .addCase(sendChatMessage.rejected, (state) => {
        state.status = 'failed';
        state.messages.push({
          role: 'assistant',
          text: 'Sorry, something went wrong processing that.',
        });
      });
  },
});

export const { addUserMessage } = chatSlice.actions;
export default chatSlice.reducer;