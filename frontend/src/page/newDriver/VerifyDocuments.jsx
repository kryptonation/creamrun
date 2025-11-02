// import { Button } from "primereact/button";
// import BModal from "../../components/BModal";
// import Img from "../../components/Img";
// import BUpload from "../../components/BUpload";
// import { useEffect, useState } from "react";
// import { getCaseStepById, getCurrentStep } from "../../utils/caseUtils";
// import { REGISTER_DRIVER } from "../../utils/constants";
// import { useGetStepInfoQuery, useMoveCaseDetailMutation } from "../../redux/api/medallionApi";
// import { getFullName } from "../../utils/utils";
// import DocumentGrid from "../../components/DocumentGrid";

// const VerifyDocuments = ({ caseId, caseData, currentStepId, hasAccess }) => {
//     const [documents, setDocuments] = useState([])
//     const { data: stepInfoData } = useGetStepInfoQuery({ caseNo: caseId, step_no: currentStepId }, { skip: !caseId });
//     const [moveCase] = useMoveCaseDetailMutation();
//     useEffect(() => {
//         if (stepInfoData) {
//             setDocuments(stepInfoData.driver_documents)
//         }
//     }, [stepInfoData])

//     const handleProcessFlow = () => {
//         if (hasAccess && getCurrentStep(caseData.steps).step_id === currentStepId) {
//             moveCase({ params: caseId })
//         }
//     }

//     const getFile = () => {

//         let upload = {}
//         const stepData = getCaseStepById(caseData.steps, REGISTER_DRIVER);
//             console.log("stepData wdfwef", stepInfoData)
//             if (caseData && stepData) {

//                 const filtType = [{ name: 'DMV License', code: stepData?.step_data?.dmv_license_document?.document_type },
//                     { name: 'TLC License', code: stepData?.step_data?.tlc_license_document?.document_type }
//                 ]
//                 console.log("stepData wdfwef", stepData)

//             upload = {
//                 object_type: stepInfoData?.object_type,
//                 object_id: stepData?.step_data?.dmv_license_document.document_object_id,
//                 document_id: 0,
//                 document_type: filtType,
//             }
//         }

//         return upload
//     }

//     return (
//         <div>
//             <div className="d-flex align-items-center">
//                 <Img name="document" />
//                 <p className="sec-topic align-items-center px-2">Verify Documents</p>
//                 {/* <BModal>
//                     <BModal.ToggleButton>
//                         <Button
//                             text
//                             disabled={!hasAccess}
//                             label="Upload Documents"
//                             data-testid="upload-documents"
//                             className="text-blue gap-2 ms-auto"
//                             type="button"
//                             icon={() => <Img name="upload_blue" />}
//                         />
//                     </BModal.ToggleButton>
//                     <BModal.Content >
//                         <BUpload
//                             {...getFile()}
//                         ></BUpload>
//                     </BModal.Content>
//                 </BModal> */}
//             </div>
//             <div className="text-grey" style={{ marginTop: 30, marginLeft: 20, marginBottom: 1 }}>
//                 Driver Name
//             </div>
//             <div style={{ marginBottom: 30, marginLeft: 20 }}>
//                 {getFullName(stepInfoData?.driver_details?.first_name, stepInfoData?.driver_details?.middle_name, stepInfoData?.driver_details?.last_name)}
//             </div>
//             <DocumentGrid  data={documents} />

//             <div style={{ paddingBottom: 30 }}>
//                 <Button
//                     disabled={!hasAccess}
//                     label="Verify Documents"
//                     data-testId="verify-documents"
//                     severity="warning"
//                     onClick={() => handleProcessFlow()}
//                     className="border-radius-0 primary-btn mt-5"
//                 />
//             </div>
//         </div>

//     )

// }

// export default VerifyDocuments;
