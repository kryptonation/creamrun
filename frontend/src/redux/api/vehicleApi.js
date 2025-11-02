import { medallionApi } from "./medallionApi";

export const vehicleApi = medallionApi.injectEndpoints({
  endpoints: (builder) => ({
    getEntity: builder.query({
      query: (data) => {
        return data ? `entities${data}` : `entities`;
      },
    }),
    getVehicles: builder.query({
      query: (data) => {
        return data ? `vehicles${data}` : `vehicles`;
      },
      providesTags: ["getVehicle"],
    }),
    getVehicleDocument: builder.query({
      query: (id) => `vehicle/${id}/documents`,
    }),
    getVinDetail: builder.query({
      query: (id) => `/vin/${id}`,
    }),
    vehicleDehackUp: builder.query({
      query: (id) => `/vehicle/dehack?vin=${id}`,
      invalidatesTags: ["getVehicle"],
    }),
    exportVehicles: builder.query({
      query: (params) => ({
        url: "/vehicles/export",
        method: "GET",
        params,
        responseHandler: (response) => response.blob(),
      }),
    }),
    viewInspection: builder.query({
      query: (params) => ({
        url: "/vehicle-inspections",
        method: "GET",
        params,
      }),
    }),
    terminateVehicle: builder.query({
      query: (data) => ({
        url: `/vehicle/terminate?vin=${data}`,
        method: "GET",
        invalidatesTags: ["getVehicle"],
      }),
    }),
    getDealerApi: builder.query({
      query: (data) => {
        return data ? `dealers${data}` : `dealers`;
      },
    }),
    updateHackupProcessStatus: builder.mutation({
      query: ({ id, data }) => ({
        url: `/vehicle/hackup_process_status/${id}`,
        method: "POST",
        body: data,
      }),
    }),
    getVehicleDetails: builder.query({
      query: (data) => {
        return `/view/vehicle/${data}`;
      },
      providesTags: ["vehicleDetails"],
    }),
  }),
});

export const {
  useLazyGetEntityQuery,
  useLazyGetVehiclesQuery,
  useGetVehicleDocumentQuery,
  useLazyGetVinDetailQuery,
  useLazyVehicleDehackUpQuery,
  useLazyExportVehiclesQuery,
  useLazyViewInspectionQuery,
  useLazyTerminateVehicleQuery,
  useLazyGetDealerApiQuery,
  useUpdateHackupProcessStatusMutation,
  useGetVehicleDetailsQuery,
} = vehicleApi;
