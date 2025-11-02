import { fetchBaseQuery } from "@reduxjs/toolkit/query";
import { authTokenChange, logoutUser } from "../slice/authSlice";

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.REACT_APP_API_BASE_URL,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth = async (args, store, extraOptions) => {
  let result = await baseQuery(args, store, extraOptions);

  if (result.error && result.error.status === 401) {
    const refreshBaseQuery = fetchBaseQuery({
      baseUrl: process.env.REACT_APP_API_BASE_URL,
      credentials: "include",
      prepareHeaders: (headers, { getState }) => {
        const refreshToken = getState().auth.refreshToken;
        if (refreshToken) {
          headers.set("authorization", `Bearer ${refreshToken}`);
        }
        return headers;
      },
    });

    const refreshResult = await refreshBaseQuery({
      url: "/refresh",
      method: "POST",
    },
    store,
    extraOptions
    );

    if (refreshResult.data) {
      store.dispatch(
        authTokenChange({
          token: refreshResult.data.access_token,
          refreshToken: refreshResult.data.refresh_token,
        })
      );
      result = await baseQuery(args, store, extraOptions);
    } else {
      store.dispatch(logoutUser());
    }
  }
  return result;
};

export default baseQueryWithReauth;
