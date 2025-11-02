import { medallionApi } from "./medallionApi";

export const pvbApi = medallionApi.injectEndpoints({
  endpoints: (builder) => ({
    pvbUpload: builder.mutation({
      query: (data) => ({
        url: "/pvb/import",
        method: "POST",
        body: data,
      }),
    }),
    getpvb: builder.query({
      query: (data) => {
        return data ? `/pvb/transactions${data}` : `/pvb/transactions`;
      },
    }),
    getPvbLogs: builder.query({
      query: (data) => {
        return data ? `/pvb/logs${data}` : `/pvb/logs`;
      },
    }),
    associatePvbBatm: builder.mutation({
      query: () => ({
        url: "pvb/associate",
        method: "POST",
      }),
    }),
    exportPvbLogs: builder.query({
      query: (params) => ({
        url: "/pvb/export/logs",
        method: "GET",
        params,
        responseHandler: (response) => response.blob(),
      }),
    }),
    exportManagePvb: builder.query({
      query: (params) => ({
        url: "/pvb/export",
        method: "GET",
        params,
        responseHandler: (response) => response.blob(),
      }),
    }),
    pvbPostBATM: builder.mutation({
      query: () => ({
        url: "/pvb/post",
        method: "POST",
      }),
    }),
  }),
});

export const {
  usePvbUploadMutation,
  useGetpvbQuery,
  useLazyGetpvbQuery,
  useLazyGetPvbLogsQuery,
  usePvbPostBATMMutation,
  useAssociatePvbBatmMutation,
  useLazyExportPvbLogsQuery,
  useLazyExportManagePvbQuery,
} = pvbApi;
