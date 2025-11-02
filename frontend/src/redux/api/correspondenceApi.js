import { medallionApi } from "./medallionApi";

export const correspondenceApi = medallionApi.injectEndpoints({
  endpoints: (builder) => ({
    getCorrespondence: builder.query({
      query: (data) => {
        return data ? `/correspondence/list${data}` : `/correspondence/list`;
      },
      // providesTags: ['lease'],
    }),
    exportCorrespondence: builder.query({
      query: (params) => ({
        url: "/correspondence/export",
        method: "GET",
        params,
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});

export const { useLazyGetCorrespondenceQuery,useLazyExportCorrespondenceQuery } = correspondenceApi;
