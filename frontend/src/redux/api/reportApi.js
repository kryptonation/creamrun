import { medallionApi } from "./medallionApi";

export const reportApi = medallionApi.injectEndpoints({
  tagTypes: ['shareReport', 'User','generatePost'],
  endpoints: (builder) => ({
    generateReport: builder.mutation({
      query: ({ query, payload }) => ({
        url: `/reports/generate/${query}`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags:["generatePost"]
    }),
    getHistoryReport: builder.query({
      query: (data) => ({
        url: `/reports/history${data}`,
        method: "GET",
      }),
      providesTags:["generatePost"]
    }),
    makeFavReport: builder.mutation({
      query: (data) => ({
        url: `reports/favorite?query_id=${data}`,
        method: "POST",
      }),
    }),
    shareReport:builder.mutation({
      query:({query,body})=>({
        url:  `/reports/share${query}`,
        method:"POST",
        body:body
      }),
      invalidatesTags: ['shareReport'],
    }),
    listShared:builder.query({
      query:(data)=>`/reports/${data}/shares`,
      providesTags: ['shareReport'],
    })
  }),
});

export const { useGenerateReportMutation, useLazyGetHistoryReportQuery,useMakeFavReportMutation,useShareReportMutation, useListSharedQuery } =
  reportApi;
