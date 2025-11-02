import { createSlice } from "@reduxjs/toolkit";

// Slice for loader state
const loaderSlice = createSlice({
    name: 'loader',
    initialState: {
      loading:false,
      showToast: false,
      errorStatus: 'ERROR',
      message: {},
      pendingRequests: 0,
    },
    reducers: {
      setLoading: (state, {payload}) => {
        state.loading = payload;
      },
      // toastAction:(state,{payload})=>{
      //   state.toast=payload;
      // },
      triggerToast: (state, action) => {
        state.message = action.payload.message;
        state.errorStatus = action.payload.errorStatus;
        state.showToast = true;
      },
      hideToast: (state) => {
        state.showToast = false;
        state.message = '';
      },
      incrementPendingRequest(state) {
        state.pendingRequests += 1;
      },
      decrementPendingRequest(state) {
        if(state.pendingRequests){
          state.pendingRequests -= 1;
        }
      }
    },
  });
  
  export const { setLoading,triggerToast,hideToast,incrementPendingRequest,decrementPendingRequest } = loaderSlice.actions;
//   export const getLoader=(state)=>state.activeComponent.activeComponent;
  export const getToastMessage=(state)=>state.loader.loading;
  export const getPendingRequest=(state)=>state.loader.pendingRequests;

  export default loaderSlice.reducer;