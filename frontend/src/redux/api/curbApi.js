import { medallionApi } from "./medallionApi";

export const curbApi = medallionApi.injectEndpoints({
  endpoints: (builder) => ({
    getCurb: builder.query({
      query: (data) => {
        return data ? `/curb/trips${data}` : `/curb/trips`;
      },
    }),
    exportCurb: builder.query({
      query: (params) => ({
        url: "/curb/export",
        method: "GET",
        params,
        responseHandler: (response) => response.blob(),
      }),
    }),
     associateCurbBatm: builder.mutation({
      query: () => ({
        url: "/curb/bulk-post-trips",
        method: "POST",
      }),
    }),
  }),
});

export const { useGetCurbQuery,useLazyGetCurbQuery, useLazyExportCurbQuery, useAssociateCurbBatmMutation } = curbApi;
