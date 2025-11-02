import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedMedallionDetail: null, 
};

const selectedMedallionSlice = createSlice({
  name: 'selectedMedallion',
  initialState,
  reducers: {
    setSelectedMedallion: (state, action) => {
      state.selectedMedallionDetail = action.payload; 
    },
    clearSelectedMedallion: (state) => {
      state.selectedMedallionDetail = null; 
    },
  },
});

export const { setSelectedMedallion, clearSelectedMedallion } = selectedMedallionSlice.actions;

export default selectedMedallionSlice.reducer;
