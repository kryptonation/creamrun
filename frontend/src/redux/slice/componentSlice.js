import { createSlice } from '@reduxjs/toolkit';

const componentSlice = createSlice({
  name: 'renderComponent',
  initialState: {
    activeComponent:0,
  },
  reducers: {
    activateComponentAction: (state, {payload}) => {
      state.activeComponent = payload;
    },
  },
});


export const {activateComponentAction} = componentSlice.actions;

export const getActiveComponent=(state)=>state.activeComponent.activeComponent;

export default componentSlice.reducer;