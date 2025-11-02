import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  token: localStorage.getItem("token"),
  refreshToken: localStorage.getItem("refreshToken"),
  usedToken: localStorage.getItem("token"),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    authTokenChange: (state, action) => {
      localStorage.setItem("token", action.payload.token);
      localStorage.setItem("refreshToken", action.payload.refreshToken);
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken?.trim();
      state.usedToken = action.payload.usedToken?.trim();
    },
    logoutUser: (state) => {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      state.token = null;
      state.refreshToken = null;
      state.usedToken = null;
    },
    adjustUsedToken: (state, action) => {
      state.usedToken = action.payload;
    },
  },
});


export const { authTokenChange, logoutUser, adjustUsedToken } = authSlice.actions;
export const getToken = (state) => state.auth.token;
export const getRefreshToken = (state) => state.auth.refreshToken;
export default authSlice.reducer;