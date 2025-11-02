import { medallionApi } from "./medallionApi";

export const driverApi = medallionApi.injectEndpoints({
  endpoints: (builder) => ({
    getDriver: builder.query({
      query: (data) => {
        return data ? `drivers${data}` : `drivers`;
      },
    }),
    searchDriver: builder.mutation({
      query: (data) => ({
        url: `drivers${data}`,
        method: "GET",
      }),
    }),
    searchDriverIndividual: builder.mutation({
      query: (data) => ({
        url: `drivers/details${data}`,
        method: "GET",
      }),
    }),
    getDriverDocument: builder.query({
      query: (id) => `driver/${id}/documents`,
    }),
    driverLockStatus: builder.mutation({
      query: (data) => ({
        url: `lock-driver?driver_id=${data}`,
        method: "POST",
        body: { driver_id: data },
      }),
    }),
    exportDrivers: builder.query({
      query: (params) => ({
        url: "/drivers/export",
        method: "GET",
        params,
        responseHandler: (response) => response.blob(),
      }),
    }),
    removeAdditionalDriver: builder.mutation({
      query: ({ id, driverRemovedDate }) => ({
        url: `/remove-additional-driver?driver_lease_id=${id}&&date_removed=${driverRemovedDate}`,
        method: "POST",
      }),
      providesTags: ["removeAdditionalDriver"],
    }),
    getDriverDetails: builder.query({
      query: (id) => {
        return `/view/driver/${id}`;
      },
    }),
    getDriverDetails: builder.query({
      query: (id) => {
        return `/view/driver/${id}`;
      },
      providesTags: ["driverDetails"],
    }),
    getDriverDetailTrips: builder.query({
      query: ({ id, queryParams }) => {
        console.log(queryParams);
        return `/view/driver/${id}?${queryParams}`;
      },
    }),
    getDriverDetailsPagination: builder.query({
      query: ({ id, queryParams = "" }) => {
        return `/view/driver/${id}${queryParams}`;
      },
    }),
  }),
});

export const {
  useLazyGetDriverQuery,
  useSearchDriverMutation,
  useSearchDriverIndividualMutation,
  useGetDriverDocumentQuery,
  useDriverLockStatusMutation,
  useLazyExportDriversQuery,
  useRemoveAdditionalDriverMutation,
  useGetDriverDetailsQuery,
  useLazyGetDriverDetailTripsQuery,
  useLazyGetDriverDetailsPaginationQuery,
} = driverApi;
