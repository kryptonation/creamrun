import { medallionApi } from "./medallionApi";

export const ledgerApi = medallionApi.injectEndpoints({
  endpoints: (builder) => ({
    ledgerEntryList: builder.query({
      query: (data) => {
        return data ? `/ledger/list${data}` : `/ledger/list`;
      },
    }),
    reassignDriver: builder.mutation({
      query: ({ ledgerId, newDriverId }) => ({
        url: `/ledger/reassign-driver/${ledgerId}?new_driver_id=${newDriverId}`,
        method: "PUT",
      }),
      invalidatesTags: ["LedgerEntries"],
    }),
    exportLedgerEntry: builder.query({
      query: (params) => ({
        url: "/ledger/export",
        method: "GET",
        params,
        responseHandler: (response) => response.blob(),
      }),
    }),
    getLedgerEntryDetailView: builder.query({
      query: (id) => {
        return `/ledger/view/${id}`;
      },
    }),
  }),
});

export const {
  useLazyLedgerEntryListQuery,
  useReassignDriverMutation,
  useLazyExportLedgerEntryQuery,
  useGetLedgerEntryDetailViewQuery,
} = ledgerApi;
