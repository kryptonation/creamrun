import { medallionApi } from "./medallionApi";

export const ezpassApi = medallionApi.injectEndpoints({
  endpoints: (builder) => ({
    ezpassUpload: builder.mutation({
      query: (data) => ({
        url: "/ezpass/import",
        method: "POST",
        body: data,
      }),
    }),
    getEzpass: builder.query({
      query: (data) => {
        return data ? `/ezpass/transactions${data}` : `/ezpass/transactions`;
      },
    }),
    getEzpassLogs: builder.query({
      query: (data) => {
        return data ? `/ezpass/logs${data}` : `/ezpass/logs`;
      },
    }),
    exportEzpassLogs: builder.query({
      query: (params) => ({
        url: "/ezpass/export/logs",
        method: "GET",
        params,
        responseHandler: (response) => response.blob(),
      }),
    }),
    exportEzpassManage: builder.query({
      query: (params) => ({
        url: "/ezpass/export",
        method: "GET",
        params,
        responseHandler: (response) => response.blob(),
      }),
    }),
    individualEzpass: builder.query({
      query: (id) => `/ezpass/transaction?transaction_id=${id}`,
    }),
    ezpassAssociate: builder.mutation({
      query: () => ({
        url: "/ezpass/associate",
        method: "POST",
      }),
    }),
    ezpassPostBATM: builder.mutation({
      query: () => ({
        url: "/ezpass/post",
        method: "POST",
      }),
    }),
  }),
});

export const {
  useEzpassUploadMutation,
  useLazyGetEzpassQuery,
  useLazyGetEzpassLogsQuery,
  useLazyExportEzpassLogsQuery,
  useLazyExportEzpassManageQuery,
  useIndividualEzpassQuery,
  useEzpassAssociateMutation,
  useEzpassPostBATMMutation,
} = ezpassApi;
