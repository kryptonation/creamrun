// import { useState, useEffect } from "react";
// import { Button } from "primereact/button";
// import BCaseCard from "../../../components/BCaseCard";
// import { useNavigate } from "react-router-dom";
// import { dmvdriverUpdateLicense as variable } from "../../../utils/variables";
// import BSuccessMessage from "../../../components/BSuccessMessage";
// import {
//   useGetStepInfoQuery,
//   useMoveCaseDetailMutation,
// } from "../../../redux/api/medallionApi";
// import BAttachedFile from "../../../components/BAttachedFile";
// import { yearMonthDate } from "../../../utils/dateConverter";
// import { getStateNameFromCode } from "../../../utils/formUitiles";

// const ViewDmvLicense = ({ caseId, currentStepId, currentStep, hasAccess }) => {
//   const data = currentStep?.dmv_license_info;
//   const [isOpen, setOpen] = useState(false);
//   const [moveCase, { isSuccess: isMoveDataSuccess }] =
//     useMoveCaseDetailMutation();
//   const navigate = useNavigate();
//   const { data: stepInfoData } = useGetStepInfoQuery({
//     caseNo: caseId,
//     step_no: currentStepId,
//   });
//   useEffect(() => {
//     if (isMoveDataSuccess) {
//       setOpen(true);
//     }
//   }, [isMoveDataSuccess]);
//   return (
//     <div className="common-form d-flex flex-column w-100">
//       <div className="form-section">
//         <div className="form-body">
//           <div className="form-body d-flex flex-column common-gap">
//             <div className="w-100-3">
//               <BCaseCard
//                 label={variable?.[0]?.label}
//                 value={data[variable?.[0]?.id] ? "YES" : "NO"}
//               ></BCaseCard>
//             </div>
//             <div className="d-flex align-items-center flex-wrap form-grid-1 w-75">
//               <div className="w-100-3">
//                 <BCaseCard
//                   label={variable?.[1]?.label}
//                   value={data[variable?.[1]?.id]}
//                 ></BCaseCard>
//               </div>
//               <div className="w-100-3">
//                 <BCaseCard
//                   label={variable?.[2]?.label}
//                   value={getStateNameFromCode(data[variable?.[2]?.id])}
//                 ></BCaseCard>
//               </div>
//               <div className="w-100-3">
//                 <BCaseCard
//                   label={variable?.[3]?.label}
//                   value={data[variable?.[3]?.id]}
//                 ></BCaseCard>
//               </div>
//               <div className="w-100-3">
//                 <BCaseCard
//                   label={variable?.[4]?.label}
//                   value={data[variable?.[4]?.id]}
//                 ></BCaseCard>
//               </div>
//               <div className="w-100-3">
//                 <BCaseCard
//                   label={variable?.[5]?.label}
//                   value={yearMonthDate(data[variable?.[5]?.id])}
//                 ></BCaseCard>
//               </div>
//               <div className="w-100-3">
//                 <BCaseCard
//                   label={variable?.[6]?.label}
//                   value={yearMonthDate(data[variable?.[6]?.id])}
//                 ></BCaseCard>
//               </div>
//               {/* <div className="w-100-3">
//                                 <BCaseCard label={variable?.[7]?.label} value={data[variable?.[7]?.id]} ></BCaseCard>
//                             </div> */}
//             </div>
//             <div className="w-50">
//               {currentStep?.dmv_license_document?.document_name && (
//                 <BAttachedFile
//                   file={{
//                     name: currentStep?.dmv_license_document?.document_name,
//                     path: currentStep?.dmv_license_document?.presigned_url,
//                     id: currentStep?.dmv_license_document?.document_id,
//                   }}
//                 ></BAttachedFile>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//       <div className="w-100 position-sticky bottom-0 py-3 bg-white">
//         {
//           <Button
//             disabled={!hasAccess}
//             label="Update DMV License"
//             data-testid="update-dmv-license"
//             onClick={() => {
//               if (hasAccess) moveCase({ params: caseId });
//             }}
//             type="type"
//             severity="warning"
//             className="border-radius-0 primary-btn "
//           />
//         }
//       </div>
//       <BSuccessMessage
//         isOpen={isOpen}
//         message={`DMV License update is successful and approved for Driver  ${stepInfoData?.driver_info?.first_name}`}
//         title="DMV License update process is successful"
//         onCancel={() => {
//           setOpen(false);
//           navigate("/manage-driver", { replace: true });
//         }}
//         onConfirm={() => {
//           setOpen(false);
//           navigate("/manage-driver", { replace: true });
//         }}
//       />
//     </div>
//   );
// };

// export default ViewDmvLicense;
