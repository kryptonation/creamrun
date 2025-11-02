import { medallionApi } from "./medallionApi";

export const dealerApi = medallionApi.injectEndpoints({
  endpoints: (builder) => ({
    createDealer: builder.mutation({
      query: (data) => ({
        url: `/new_dealer`,
        method: "POST",
        body: data,
      }),
    }),
  }),
});

export const { useCreateDealerMutation } = dealerApi;
