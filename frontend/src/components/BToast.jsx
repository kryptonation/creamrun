// import React, { useRef, useState, forwardRef, useImperativeHandle, useEffect } from "react";
// import { Toast } from "primereact/toast";
// import { ProgressBar } from "primereact/progressbar";
// import Img from "./Img";

// const BToast = forwardRef((props, ref) => {
//     const toast = useRef(null);
//     const [progress, setProgress] = useState(100);
//     const [toastData, setToastData] = useState(null);
//     const intervalId = useRef(null);

//     const toastStyles = {
//         success: {
//             icon: "ic_success",
//             progressBarColor: "#1DC13B",
//         },
//         warn: {
//             icon: "ic_warning",
//             progressBarColor: "#FEC917",
//         },
//         error: {
//             icon: "ic_failed",
//             progressBarColor: "#F34336",
//         },
//     };

//     useImperativeHandle(ref, () => ({
//         showToast: (title, message, severity, sticky = false, life = 1000) => {
//             const { progressBarColor, icon } = toastStyles[severity] || {};

//             setToastData({
//                 title,
//                 message,
//                 icon,
//                 progressBarColor,
//                 sticky
//             });

//             setProgress(100);
//             toast.current.show({
//                 severity,
//                 sticky,
//                 life,
//             });

//             if (!sticky) {
//                 const step = 100 / (life / 100);
//                 intervalId.current = setInterval(() => {
//                     setProgress((prev) => {
//                         const newProgress = prev - step;
//                         if (newProgress <= 0) {
//                             clearInterval(intervalId.current);
//                             toast.current.clear();
//                             return 0;
//                         }
//                         return newProgress;
//                     });
//                 }, 100);
//             }
//         },
//         clearToast: () => {
//             clearInterval(intervalId.current);
//             setProgress(100);
//             toast.current.clear();
//         },
//     }));

//     useEffect(() => {
//         return () => {
//             if (intervalId.current) clearInterval(intervalId.current);
//         };
//     }, []);

//     const renderToastContent = () =>

//         toastData && (
//             <div className="custom-1" style={{ backgroundColor: "white" }}>
//                 <div className="toast-1 shadow ">
//                     {!toastData.sticky && (
//                         <div>
//                             <ProgressBar
//                                 value={progress}
//                                 showValue={false}
//                                 color={toastData.progressBarColor}
//                                 style={{
//                                     backgroundColor: 'transparent',
//                                     transition: "width 100ms ease-out",
//                                 }}
//                                 className="progress-bar-animate"
//                             />
//                         </div>)}
//                     <div className="custom-toast-content">
//                         <div className="status-icon">
//                             <Img name={toastData.icon} />
//                         </div>
//                         <div className="data-content">
//                             <strong>{toastData.title}</strong>
//                             <p>{toastData.message}</p>
//                         </div>
//                         <div
//                             className="close-icon"
//                             onClick={() => {
//                                 clearInterval(intervalId.current);
//                                 setProgress(100);
//                                 toast.current.clear();
//                             }}
//                         >
//                             <Img name='modalCancel' />
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         );

//     return <Toast ref={toast} position={props.position || "top-right"} content={renderToastContent} />;
// });

// export default BToast;


import React, { useRef, useState, forwardRef, useImperativeHandle, useEffect } from "react";
import { Toast } from "primereact/toast";
import { ProgressBar } from "primereact/progressbar";
import Img from "./Img";

const ToastContent = ({ toastData, progress, onClose }) => {
    if (!toastData) return null;

    return (
        <div className="custom-1" style={{ backgroundColor: "white" }}>
            <div className="toast-1 shadow">
                {!toastData.sticky && (
                    <div>
                        <ProgressBar
                            value={progress}
                            showValue={false}
                            color={toastData.progressBarColor}
                            style={{
                                backgroundColor: 'transparent',
                                transition: "width 100ms ease-out",
                            }}
                            className="progress-bar-animate"
                        />
                    </div>
                )}
                <div className="custom-toast-content">
                    <div className="status-icon">
                        <Img name={toastData.icon} />
                    </div>
                    <div className="data-content">
                        <strong>{toastData.title}</strong>
                        <p>{toastData.message}</p>
                    </div>
                    <div className="close-icon" onClick={onClose}>
                        <Img name='modalCancel' />
                    </div>
                </div>
            </div>
        </div>
    );
};

const BToast = forwardRef((props, ref) => {
    const toast = useRef(null);
    const [progress, setProgress] = useState(100);
    const [toastData, setToastData] = useState(null);
    const intervalId = useRef(null);

    const toastStyles = {
        success: {
            icon: "ic_success",
            progressBarColor: "#1DC13B",
        },
        warn: {
            icon: "ic_warning",
            progressBarColor: "#FEC917",
        },
        error: {
            icon: "ic_failed",
            progressBarColor: "#F34336",
        },
    };

    const showToast = (title, message, severity, sticky = false, life = 1000) => {
        const { progressBarColor, icon } = toastStyles[severity] || {};

        // Clear any existing interval
        if (intervalId.current) {
            clearInterval(intervalId.current);
            intervalId.current = null;
        }

        setProgress(100);
        setToastData({
            title,
            message,
            icon,
            progressBarColor,
            sticky
        });

        // Use setTimeout to defer the toast show operation
        setTimeout(() => {
            toast.current.show({
                severity,
                sticky,
                life,
            });

            if (!sticky) {
                const step = 100 / (life / 100);
                intervalId.current = setInterval(() => {
                    setProgress((prev) => {
                        const newProgress = prev - step;
                        if (newProgress <= 0) {
                            clearInterval(intervalId.current);
                            intervalId.current = null;
                            toast.current.clear();
                            return 0;
                        }
                        return newProgress;
                    });
                }, 100);
            }
        }, 0);
    };

    const clearToast = () => {
        if (intervalId.current) {
            clearInterval(intervalId.current);
            intervalId.current = null;
        }
        setProgress(100);
        toast.current.clear();
    };

    useImperativeHandle(ref, () => ({
        showToast,
        clearToast
    }));

    useEffect(() => {
        return () => {
            if (intervalId.current) {
                clearInterval(intervalId.current);
            }
        };
    }, []);

    return (
        <Toast 
            ref={toast} 
            position={props.position || "top-right"} 
            content={() => (
                <ToastContent 
                    toastData={toastData} 
                    progress={progress} 
                    onClose={clearToast} 
                />
            )} 
        />
    );
});

export default BToast;


// import React, { useRef, useState, forwardRef, useImperativeHandle, useEffect } from "react";
// import { Toast } from "primereact/toast";
// import { ProgressBar } from "primereact/progressbar";
// import Img from "./Img";

// const BToast = forwardRef((props, ref) => {
//     const toast = useRef(null);
//     const [progress, setProgress] = useState(100);
//     const [toastData, setToastData] = useState(null);
//     const intervalId = useRef(null);

//     const toastStyles = {
//         success: {
//             icon: "ic_success",
//             progressBarColor: "#1DC13B",
//         },
//         warn: {
//             icon: "ic_warning",
//             progressBarColor: "#FEC917",
//         },
//         error: {
//             icon: "ic_failed",
//             progressBarColor: "#F34336",
//         },
//     };

//     const showToast = (title, message, severity, sticky = false, life = 1000) => {
//         const { progressBarColor, icon } = toastStyles[severity] || {};

//         setToastData({
//             title,
//             message,
//             icon,
//             progressBarColor,
//             sticky
//         });

//         setProgress(100);
        
//         // Use setTimeout to defer the toast show operation
//         setTimeout(() => {
//             toast.current.show({
//                 severity,
//                 sticky,
//                 life,
//             });

//             if (!sticky) {
//                 const step = 100 / (life / 100);
//                 intervalId.current = setInterval(() => {
//                     setProgress((prev) => {
//                         const newProgress = prev - step;
//                         if (newProgress <= 0) {
//                             clearInterval(intervalId.current);
//                             toast.current.clear();
//                             return 0;
//                         }
//                         return newProgress;
//                     });
//                 }, 100);
//             }
//         }, 0);
//     };

//     const clearToast = () => {
//         clearInterval(intervalId.current);
//         setProgress(100);
//         toast.current.clear();
//     };

//     useImperativeHandle(ref, () => ({
//         showToast,
//         clearToast
//     }));

//     useEffect(() => {
//         return () => {
//             if (intervalId.current) clearInterval(intervalId.current);
//         };
//     }, []);

//     const renderToastContent = () =>
//         toastData && (
//             <div className="custom-1" style={{ backgroundColor: "white" }}>
//                 <div className="toast-1 shadow ">
//                     {!toastData.sticky && (
//                         <div>
//                             <ProgressBar
//                                 value={progress}
//                                 showValue={false}
//                                 color={toastData.progressBarColor}
//                                 style={{
//                                     backgroundColor: 'transparent',
//                                     transition: "width 100ms ease-out",
//                                 }}
//                                 className="progress-bar-animate"
//                             />
//                         </div>)}
//                     <div className="custom-toast-content">
//                         <div className="status-icon">
//                             <Img name={toastData.icon} />
//                         </div>
//                         <div className="data-content">
//                             <strong>{toastData.title}</strong>
//                             <p>{toastData.message}</p>
//                         </div>
//                         <div
//                             className="close-icon"
//                             onClick={() => {
//                                 clearInterval(intervalId.current);
//                                 setProgress(100);
//                                 toast.current.clear();
//                             }}
//                         >
//                             <Img name='modalCancel' />
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         );

//     return <Toast ref={toast} position={props.position || "top-right"} content={renderToastContent} />;
// });

// export default BToast;