import { medallionApi } from "./medallionApi";

export const vehicleOwnerApi = medallionApi.injectEndpoints({
  endpoints: (builder) => ({
    vehicleOwnerList: builder.query({
      query: (data) => {
        return data ? `/vehicle_owners${data}` : `/vehicle_owners`;
      },
    }),
    removeOwner: builder.mutation({
      query: ({ vin }) => ({
        url: `/remove_owner_ship/${vin}`,
        method: "PUT",
      }),
    }),
    changeOwnership: builder.mutation({
      query: ({ vin, owner_id }) => ({
        url: `/change_ownership/${vin}?owner_id=${owner_id}`,
        method: "PUT",
      }),
      // invalidatesTags: [""],
    }),
    getVehicleOwnerDetails: builder.query({
      query: ({ id, page = 1, per_page = 5 }) => {
        return {
          url: `/view/vehicle_owners/${id}`,
          params: {
            page,
            per_page,
          },
        };
      },
      providesTags: ["vehicleOwnerDetails"],
    }),

    // Add the export endpoint
    exportVehicleOwner: builder.query({
      query: (params) => ({
        url: "/export/vehicle_owner",
        method: "GET",
        params,
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});

export const {
  useLazyVehicleOwnerListQuery,
  useChangeOwnershipMutation,
  useRemoveOwnerMutation,
  useGetVehicleOwnerDetailsQuery,
  useLazyExportVehicleOwnerQuery,
} = vehicleOwnerApi;
