import { isObject } from "formik";
import { decrementPendingRequest, incrementPendingRequest, setLoading, triggerToast } from "../slice/loaderSlice";

export const storeApiMiddleware = (store) => (next) => (action) => {

  if (action.type.endsWith('/pending')) {
    store.dispatch(setLoading(true));
    // incrementPendingRequest,decrementPendingRequest 
    store.dispatch(incrementPendingRequest());
  }

  // When an API request succeeds or fails, hide the loader
  if (action.type.endsWith('/fulfilled') || action.type.endsWith('/rejected')) {
    store.dispatch(decrementPendingRequest());
    console.log(action.meta.arg.endpointName);
    
    const { loader: { pendingRequests } } = store.getState();
    if (pendingRequests === 0) {
      store.dispatch(setLoading(false));
      console.log(action.meta.arg.endpointName);
      
      if(["ezpassAssociate","ezpassPostBATM","createDealer","associatePvbBatm","pvbPostBATM","associateCurbBatm"].includes(action.meta.arg.endpointName)){
        const data = action?.payload?.message;
        store.dispatch(triggerToast({errorStatus:"SUCCESS",message:data}));
      }
    }
  }
  if (action.type.endsWith('/rejected')) {
    const data = action?.payload?.data?.detail||action?.payload?.data?.message;
    console.log(data,action,action?.payload);

    if (Array.isArray(data)) {
      store.dispatch(triggerToast({errorStatus:"ERROR",message:JSON.stringify(data)}));
    }
    else if (isObject(data)) {
      store.dispatch(triggerToast(JSON.stringify(data)));
    }
    else {
      if (data) {
        store.dispatch(triggerToast({errorStatus:"ERROR",message:data}));
      }
      else{
        store.dispatch(triggerToast({errorStatus:"ERROR",message:"Something went wrong"}));
      }
    }

  }
  return next(action);
};