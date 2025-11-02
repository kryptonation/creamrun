import { medallionApi } from "./medallionApi";

export const leaseApi = medallionApi.injectEndpoints({
  endpoints: (builder) => ({
    getLease: builder.query({
      query: (data) => {
        return data ? `leases${data}` : `leases`;
      },
      providesTags: ["lease", "removeAdditionalDriver"],
    }),
    getLeaseDocument: builder.query({
      query: (id) => `lease/${id}/documents`,
      providesTags: ["getLeaseDocuments"],
    }),
    exportLease: builder.query({
      query: (data) => ({
        url: data ? `lease/export${data}` : `lease/export`,
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
    }),
    getViewLeaseSchedule: builder.query({
      query: (data) => ({
        url: `lease/schedule?lease_id=${data}`,
        method: "GET",
      }),
    }),
    submitLeaseConfig: builder.mutation({
      query: (payload) => ({
        url: "/lease/config",
        method: "POST",
        body: payload,
      }),
    }),
    getLeaseConfig: builder.query({
      query: () => "/lease/config",
    }),
    getLeaseDetails: builder.query({
      query: (id) => {
        return `/view/lease/${id}`;
      },
      providesTags: ["leaseDetails"],
    }),
    leaseDataList: builder.query({
      query: (data) => {
        return data ? `/can_lease${data}` : `/can_lease`;
      },
    }),
  }),
});

export const {
  useLazyGetLeaseQuery,
  useGetLeaseDocumentQuery,
  useLazyExportLeaseQuery,
  useGetViewLeaseScheduleQuery,
  useSubmitLeaseConfigMutation,
  useGetLeaseConfigQuery,
  useGetLeaseDetailsQuery,
  useLazyLeaseDataListQuery,
} = leaseApi;
