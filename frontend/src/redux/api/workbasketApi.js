import { medallionApi } from "./medallionApi";

export const workbasketApi = medallionApi.injectEndpoints({
    endpoints: (builder) => ({
        getWorkBasket: builder.query({
            query: (data) => {
                return data
                ? `/cases/workbasket/${data}`
                : `/cases/workbasket`;                
            },
            providesTags:["workbasket"]
        }),
        getDashboard:builder.query({
            query: () => `/dashboard`
        }),
        getNotification:builder.query({
            query:()=>`/notification/user`
        })
        // searchDriver: builder.mutation({
        //     query: (data) => ({
        //         url: `drivers${data}`,
        //         method: "GET",
        //     }),
        // }),
        // getDriverDocument: builder.query({
        //     query: (id) => `driver/${id}/documents`,
        // }),
    })
});

export const { useLazyGetWorkBasketQuery,useGetDashboardQuery,useGetNotificationQuery } = workbasketApi;

