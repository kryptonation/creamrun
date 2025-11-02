import { medallionApi } from "./medallionApi";
export const mockTripData = {
  items: [
    {
      record_id: 175340,
      period: "201903",
      cab_number: "2194",
      driver_id: "NO110320",
      trip_id: "30",
      start_time: "2019-07-01 08:00:26",
      end_time: "2019-07-01 08:23:47",
      trip_amount: 16.15,
      tips: 0.0,
      extras: 0.0,
      tolls: 0.0,
      tax: 0.0,
      imp_tax: 0.0,
      total_amount: 16.15,
      payment_type: "$",
      auth_amt: 16.15,
      gps_start_lat: "13.0482° N",
      gps_start_lon: "80.2422° E",
      gps_end_lat: "12.9923° N",
      gps_end_lon: "80.1972° E",
      from_address: "",
      to_address: "",
      auth_code: "",
      ehail_fee: 0.0,
      health_fee: 0.0,
      passenger_count: 1,
      distance_service: 2.53,
      distance_bs: 0.0,
      reservation_number: 0,
      congestion_fee: 0.0,
      airport_fee: 1.5,
      cbdt: 0.0,
      mfa: 0.0,
      tif: 0.0,
      cps: 0.0,
      duration: 1401,
      recon_stat: null,
      is_posted: false,
    },
  ],
  total_items: 1,
  filters: {
    driver_id: {
      type: "text",
      label: "Driver ID",
      placeholder: "Enter Driver ID",
    },
    cab_number: {
      type: "text",
      label: "Cab Number",
      placeholder: "Enter Cab Number",
    },
    trip_date: {
      type: "date-range",
      label: "Trip Date Range",
      placeholder: "Select Date Range",
    },
    trip_id: {
      type: "text",
      label: "Trip ID",
      placeholder: "Enter Trip ID(s)",
    },
    gps_start_lat: {
      type: "text",
      label: "Start Latitude",
      placeholder: "Enter Start Lat",
    },
    gps_end_lat: {
      type: "text",
      label: "End Latitude",
      placeholder: "Enter End Lat",
    },
    status: {
      type: "select",
      label: "Reconciliation Status",
      options: [
        {
          label: "Pending",
          value: "P",
        },
        {
          label: "Reconciled",
          value: "R",
        },
      ],
    },
    payment_type: {
      type: "select",
      label: "Payment Type",
      options: [
        {
          label: "Cash",
          value: "$",
        },
        {
          label: "Card",
          value: "C",
        },
        {
          label: "Private",
          value: "P",
        },
      ],
    },
  },
  trip_status_list: ["Pending", "Reconciled"],
  payment_type_list: ["$", "C", "P"],
  page: 1,
  per_page: 10,
  total_pages: 1,
  sort_fields: ["start_time", "end_time", "trip_amount"],
};
export const tripsApi = medallionApi.injectEndpoints({
  endpoints: (builder) => ({
    getTrips: builder.query({
      query: (data) => {
        return data ? `/trips/${data}` : `/trips`;
      },
    }),
    getIndividualTrip: builder.query({
      query: (id) => {
        return `/trip?trip_id=${id}`;
      },
    }),
  }),
});

export const { useLazyGetTripsQuery, useGetIndividualTripQuery } = tripsApi;
