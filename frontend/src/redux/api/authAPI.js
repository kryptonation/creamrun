import { medallionApi } from './medallionApi';

export const authApi = medallionApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: '/login',  
        method: 'POST',
        body: credentials,  
      }),
    }),
    fetchUser: builder.query({
      query: () => ({
        url: '/user',  
        method: 'GET',
      }),
    }),
    logout: builder.mutation({
      query: () => ({
        url: '/logout',
        method: 'GET',
      }),
    }),
     getUsers:builder.mutation({
      query: (data) => ({
        url: `/users?${data}`,
        method: "GET",
      }),
    }),
     getUsersData:builder.query({
      query: (data) => ({
        url: `/users${data}`,
        method: "GET",
      }),
    }),
  }),
});

export const { useLoginMutation, useFetchUserQuery , useLogoutMutation , useGetUsersMutation,useLazyGetUsersDataQuery } = authApi;
