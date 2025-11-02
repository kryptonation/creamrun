import { medallionApi } from "./medallionApi";

export const individualListApi = medallionApi.injectEndpoints({
  endpoints: (builder) => ({
    individualList: builder.query({
      query: (data) => `/individual/list?page=1&per_page=1000`,
    }),
    getBankDetails: builder.mutation({
      query: (id) => ({
        url: `/bank/${id}`,
        method: "GET",
      }),
    }),

    getCorporationList: builder.query({
      query: (data) =>
        `/corporation/list?is_holding_entity=true&page=1&per_page=1000&sort_by=created_on&sort_order=desc`,
    }),
  }),
});

export const {
  useIndividualListQuery,
  useGetBankDetailsMutation,
  useGetCorporationListQuery,
} = individualListApi;
