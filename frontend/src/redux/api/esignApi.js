import { medallionApi } from "./medallionApi";

export const esignApi = medallionApi.injectEndpoints({
    endpoints: (builder) => ({
        envelopeStatusAndDeatil: builder.query({
            query: (data) => `esign/envelope/${data}`,
        }),
        envalopePreview: builder.query({
            query: (data) => `esign/envelope/${data}/preview`,
        }),
        createRecipientView: builder.mutation({
            query: (payload) => ({
                url: "/esign/recipient-view",
                method: "POST",
                body: payload,
            }),
        }),
        getEnvelopeStatus: builder.mutation({
            query: (envelopeId) => ({
                url: `/esign/envelope/${envelopeId}/status`,
                method: 'GET', 
            }),
        }),
        getSignedEnvelope: builder.query({
            query: (envelopeId) => ({
                url: `/esign/envelope/${envelopeId}/signed?download=false`,
                method: "GET",
                // 👇 force blob instead of JSON
                responseHandler: (response) => response.blob(),
            }),
        }),
    })
});

export const { useEnvelopeStatusAndDeatilQuery, useEnvalopePreviewQuery, useCreateRecipientViewMutation, useGetEnvelopeStatusMutation, useGetSignedEnvelopeQuery } = esignApi;

