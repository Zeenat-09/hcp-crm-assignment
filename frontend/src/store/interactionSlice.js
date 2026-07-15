import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { logInteractionApi, editInteractionApi } from '../api/api';

const initialState = {
  id: null,
  hcpName: '',
  interactionType: 'Meeting',
  date: '',
  time: '',
  attendees: '',
  topicsDiscussed: '',
  materialsShared: [],
  samplesDistributed: [],
  sentiment: 'Neutral',
  outcomes: '',
  followUpActions: '',
  aiSuggestedFollowUps: [],
  status: 'idle',
  error: null,
};

export const submitInteraction = createAsyncThunk(
  'interaction/submit',
  async (payload) => {
    const response = await logInteractionApi(payload);
    return response.data;
  }
);

export const editInteraction = createAsyncThunk(
  'interaction/edit',
  async ({ id, updates }) => {
    const response = await editInteractionApi(id, updates);
    return response.data;
  }
);

const interactionSlice = createSlice({
  name: 'interaction',
  initialState,
  reducers: {
    updateField: (state, action) => {
      const { field, value } = action.payload;
      state[field] = value;
    },
    addMaterial: (state, action) => {
      state.materialsShared.push(action.payload);
    },
    addSample: (state, action) => {
      state.samplesDistributed.push(action.payload);
    },
    setAISuggestedFollowUps: (state, action) => {
      state.aiSuggestedFollowUps = action.payload;
    },
    applyAIExtractedFields: (state, action) => {
      Object.assign(state, action.payload);
    },
    resetForm: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitInteraction.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(submitInteraction.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.id = action.payload.id;
        state.aiSuggestedFollowUps = action.payload.suggested_follow_ups || [];
      })
      .addCase(submitInteraction.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

export const {
  updateField,
  addMaterial,
  addSample,
  setAISuggestedFollowUps,
  applyAIExtractedFields,
  resetForm,
} = interactionSlice.actions;

export default interactionSlice.reducer;