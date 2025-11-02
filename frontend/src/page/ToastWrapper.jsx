import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Outlet } from "react-router-dom";
import BToast from "../components/BToast";
import { hideToast } from "../redux/slice/loaderSlice";

const ToastWrapper = () => {
  const toast = useRef(null);
  const dispatch = useDispatch();
  const {
    showToast,
    message,
    errorStatus = "ERROR",
  } = useSelector((state) => state.loader);

  useEffect(() => {
    if (showToast && toast.current) {
      // If API returned a WARNING in the message body, show a warning toast
      const msg = message || "";
      if (msg && msg.toUpperCase().startsWith("WARNING:")) {
        // Use a warning toast; keep the original message for context
        toast.current.showToast("Warning", msg, "warn", false, 10000);
      } else if (errorStatus === "SUCCESS") {
        toast.current.showToast("Success", message, "success", false, 10000);
      } else {
        console.log("Error Status", errorStatus, message);
        toast.current.showToast(errorStatus, message, "error", false, 10000);
      }

      // if (errorStatus === "SUCCESS") {
      //   toast.current.showToast("Success", message, "success", false, 10000);
      // } else {
      //   console.log("Error Status", errorStatus, message);
      //   toast.current.showToast(errorStatus, message, "error", false, 10000);
      // }

      // Set timeout to hide toast after it's shown
      const timer = setTimeout(() => {
        dispatch(hideToast());
      }, 10000); // Match this with your toast duration

      return () => clearTimeout(timer);
    }
  }, [showToast, message, errorStatus, dispatch]);
  return (
    <div>
      <BToast position="top-right" ref={toast} />
      <Outlet></Outlet>
    </div>
  );
};

export default ToastWrapper;
