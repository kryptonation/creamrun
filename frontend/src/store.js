import { configureStore } from "@reduxjs/toolkit";
import userReducer from './redux/slice/userSlice';
import authReducer from './redux/slice/authSlice';
import loaderReducer from './redux/slice/loaderSlice';
import activeComponentReducer from './redux/slice/componentSlice';
import selectedMedallionSlice from './redux/slice/selectedMedallionDetail';
import uploadReducer from './redux/slice/uploadSlice';
import { medallionApi } from "./redux/api/medallionApi";
import { storeApiMiddleware } from "./redux/middleware/storeApiMiddleware";

export const store = configureStore({
    reducer: {
        [medallionApi.reducerPath]: medallionApi.reducer,
        auth: authReducer,
        user: userReducer,
        loader: loaderReducer,
        activeComponent: activeComponentReducer,
        medallion: selectedMedallionSlice,
        upload: uploadReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware()
            .concat(medallionApi.middleware)
            .concat(storeApiMiddleware)
});
