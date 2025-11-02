import { createApi } from "@reduxjs/toolkit/query/react";
import baseQueryWithReauth from "./baseQueryWithReauth";

export const medallionApi = createApi({
  reducerPath: "medallionApi",
  baseQuery: baseQueryWithReauth,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  tagTypes: [
    "getCase",
    "caseStep",
    "getCaseParam",
    "lease",
    "audit",
    "getVehicle",
    "vehicleDetails",
    "vehicleOwnerDetails",
    "leaseDetails",
    "driverDetails",
    "getLeaseDocuments",
    "removeAdditionalDriver",
  ],
  endpoints: (builder) => ({
    createCase: builder.mutation({
      query: (data) => ({
        url: "/case",
        method: "POST",
        body: {
          case_type: data,
        },
      }),
      invalidatesTags: ["workbasket"],
    }),
    getCaseDetail: builder.query({
      query: (data) => `/case/${data}`,
      providesTags: ["getCase"],
    }),
    getCaseDetailWithParams: builder.query({
      query: ({ caseId, objectName, objectLookup }) => {
        console.log(
          "🚀 ~ caseId, objectName, objectLookup:",
          caseId,
          objectName,
          objectLookup
        );

        let url = `/case/${caseId}`;
        const params = new URLSearchParams();
        if (objectName) params.append("object_name", objectName);
        if (objectLookup) params.append("object_lookup", objectLookup);

        return params.toString() ? `${url}?${params.toString()}` : url;
      },
      providesTags: ["getCaseParam"],
    }),
    // getCaseDetailWithParams: builder.query({
    //   query: ({ caseId, objectName, objectLookup }) => {
    //     let url = `/case/${caseId}`;

    //     const params = new URLSearchParams();
    //     if (objectName) params.append("object_name", objectName);
    //     if (objectLookup) params.append("object_lookup", objectLookup);

    //     if (params.toString()) {
    //       url += `?${params.toString()}`;
    //     }

    //     return url;
    //   },
    //   providesTags: ["getCase"],
    // }),
    processCaseDeatil: builder.mutation({
      query: ({ params, data }) => ({
        url: `/case/${params}`,
        method: "POST",
        body: data,
      }),
    }),
    moveCaseDetail: builder.mutation({
      query: ({ params, stepId, data }) =>
        stepId
          ? {
              url: `/case/${params}/move?step_id=${stepId}`,
              method: "POST",
              body: data,
            }
          : {
              url: `/case/${params}/move`,
              method: "POST",
              body: data,
            },
      invalidatesTags: ["getCase", "caseStep", "audit", "workbasket"],
    }),
    getStepInfo: builder.query({
      query: ({ caseNo, step_no }) => `/case/${caseNo}/${step_no}`,
      providesTags: ["caseStep"],
    }),
    getStepInfoDetail: builder.mutation({
      query: ({ caseNo, step_no }) => ({
        url: `/case/${caseNo}/${step_no}`,
        method: "GET", // still GET, but used as a mutation for imperatively triggered calls
      }),
      invalidatesTags: ["caseStep"], // optional, depending on usage
    }),
    getStepDetailWithParams: builder.query({
      query: ({ caseId, step_no, objectName, objectLookup }) => {
        let url = `/case/${caseId}/${step_no}`;

        const params = new URLSearchParams();
        if (objectName) params.append("object_name", objectName);
        if (objectLookup) params.append("object_lookup", objectLookup);

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        return url;
      },
      providesTags: ["caseStep"],
    }),
    searchOwner: builder.mutation({
      query: (data) => ({
        url: "/case",
        method: "POST",
        body: {
          case_type: data,
        },
      }),
    }),
    uploadDocument: builder.mutation({
      query: (data) => ({
        url: "/upload-document",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        "caseStep",
        "medallionOwnerDetails",
        "medallionDetail",
        "vehicleDetails",
        "vehicleOwnerDetails",
        "leaseDetails",
        "driverDetails",
        "getLeaseDocuments",
      ],
    }),
    deleteDocument: builder.mutation({
      query: (data) => ({
        url: `/delete-document/${data}`,
        method: "DELETE",
      }),
      invalidatesTags: ["caseStep"],
    }),
    ownerList: builder.query({
      // query:(data)=>`/api/owner-listing/v2`,
      query: (data) => {
        console.log(data);

        return data ? `/api/owner-listing/v2${data}` : `/api/owner-listing/v2`;
      },
    }),
    getMedallions: builder.query({
      // query: ({ page = 1, perPage = 10 }) => `medallions?page=${page}&per_page=${perPage}`,
      query: (data) => {
        return data ? `medallions${data}` : `medallions`;
      },
      providesTags: ["getMedallions"],
    }),
    removeMedallion: builder.mutation({
      query: (medallionNumbers) => ({
        url: "/medallions/deactivate",
        method: "PUT",
        body: medallionNumbers,
      }),
      invalidatesTags: ["getMedallions"],
    }),
    getMedallionDocument: builder.query({
      query: (id) => `medallions/${id}/documents`,
    }),
    exportMedallions: builder.query({
      query: (params) => ({
        url: "medallions/export",
        method: "GET",
        params,
        responseHandler: (response) => response.blob(),
      }),
    }),
    exportMedallionsOwner: builder.query({
      query: (params) => ({
        url: "owners/export",
        method: "GET",
        params,
        responseHandler: (response) => response.blob(),
      }),
    }),
    getMedallionDetails: builder.query({
      query: (params) => {
        const queryString = new URLSearchParams(params).toString();
        return `/medallions/view?${queryString}`;
      },
      providesTags: ["medallionDetail"],
    }),
    getStepInNewDriver: builder.query({
      query: ({ caseNo, step_no, data }) => `/case/${caseNo}/${step_no}${data}`,
    }),
    reassignCase: builder.mutation({
      query: ({ params }) => {
        const queryString = new URLSearchParams(params).toString();

        return {
          url: `/reassign-case?${queryString}`,
          method: "PUT",
        };
      },
      invalidatesTags: ["getCase"],
    }),
    getMedallionOwnerDetails: builder.query({
      query: ({ id, page = 1, per_page = 5 }) => {
        return {
          url: `/view/medallion_owner/${id}`,
          params: {
            page,
            per_page,
          },
        };
      },
      providesTags: ["medallionOwnerDetails"],
    }),
    getUpdatedCaseDetailsWithParams: builder.query({
      query: ({ caseId, ...queryParams }) => {
        let url = `/case/${caseId}`;
        const params = new URLSearchParams();

        //Dynamically add all query params passed
        Object.entries(queryParams).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value);
          }
        });

        return params.toString() ? `${url}?${params.toString()}` : url;
      },
      providesTags: ["getUpdatedCaseDetails"],
    }),
  }),
});

export const {
  useCreateCaseMutation,
  useGetCaseDetailQuery,
  useLazyGetCaseDetailQuery,
  useGetCaseDetailWithParamsQuery,
  useGetStepDetailWithParamsQuery,
  useProcessCaseDeatilMutation,
  useMoveCaseDetailMutation,
  useGetStepInfoQuery,
  useLazyGetStepInfoQuery,
  useGetStepInfoDetailMutation,
  useSearchOwnerMutation,
  useDeleteDocumentMutation,
  useUploadDocumentMutation,
  useLazyOwnerListQuery,
  useLazyGetMedallionsQuery,
  useRemoveMedallionMutation,
  useLazyExportMedallionsOwnerQuery,
  useGetMedallionDocumentQuery,
  useLazyExportMedallionsQuery,
  useGetMedallionDetailsQuery,
  useLazyGetStepInNewDriverQuery,
  useReassignCaseMutation,
  useGetMedallionOwnerDetailsQuery,
  useLazyGetUpdatedCaseDetailsWithParamsQuery,
} = medallionApi;
