import { medallionApi } from "./medallionApi";

export const auditTrailAPI = medallionApi.injectEndpoints({
    endpoints: (builder) => ({
        getAuditTrail:builder.query({
            query: (data) => `/audit-trail/case/${data}`,
            providesTags:["audit"]
        }),
        createAuditTrail:builder.mutation({
            query:(data)=>({
                url:`/audit-trail/manual`,
                method:"POST",
                body:data
            }),
            invalidatesTags:["audit"]
        }),
        getManageAuditTrail:builder.query({
            query:(data)=>`/audit-trail/related-view${data}`
        })
    })
});

export const { useGetAuditTrailQuery,useCreateAuditTrailMutation,useGetManageAuditTrailQuery } = auditTrailAPI;

