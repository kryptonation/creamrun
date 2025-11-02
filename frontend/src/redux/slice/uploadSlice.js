import { createSlice } from '@reduxjs/toolkit';

const uploadSlice = createSlice({
  name: 'upload',
  initialState: {
    isUpload: false,
    lastUploadedDocument: null,
  },
  reducers: {
    setIsUpload: (state, action) => {
      state.isUpload = action.payload;
    },
    setLastUploadedDocument: (state, action) => {
      state.lastUploadedDocument = action.payload;
    },
  },
});

export const { setIsUpload, setLastUploadedDocument } = uploadSlice.actions;
export default uploadSlice.reducer;
