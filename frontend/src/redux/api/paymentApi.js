import { medallionApi } from "./medallionApi";

export const paymentApi = medallionApi.injectEndpoints({
  endpoints: (builder) => ({
    viewDriverPayments: builder.query({
      query: (data) => `case/${data}`,
    }),
    manageDriverPayments: builder.query({
      query:(data)=> data? `/payments${data}` : `/payments`,
    }),
    exportEzpassManage: builder.query({
      query: (params) => ({
        url: "/payments/export",
        method: "GET",
        params,
        responseHandler: (response) => response.blob(),
      }),
    }),
    dtrReciept: builder.query({
      query: (params) => ({
        url: `/dtr_receipt/${params}`,
        method: "GET",
        // responseHandler: (response) => response.blob(),
      }),
    }),
})
});

export const { 
  useLazyViewDriverPaymentsQuery,
  useLazyManageDriverPaymentsQuery,
  useLazyExportEzpassManageQuery,
  useDtrRecieptQuery
} = paymentApi;
