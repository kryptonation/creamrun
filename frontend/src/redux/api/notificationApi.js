import { medallionApi } from "./medallionApi";

export const notificationApi = medallionApi.injectEndpoints({
  endpoints: (builder) => ({
    createNotificationConfig: builder.mutation({
      query: (data) => ({
        url: "notification/config/bulk",
        method: "POST",
        body: data,
      }),
    }),
    fetchNotificationConfigs: builder.query({
      query: () => "notification/config/list",
    }),
  }),
});

export const { 
  useCreateNotificationConfigMutation, 
  useFetchNotificationConfigsQuery 
} = notificationApi;
