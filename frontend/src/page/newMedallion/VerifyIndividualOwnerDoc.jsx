import { useEffect, useMemo, useState } from "react";
import DocumentGrid from "../../components/DocumentGrid";
import {
  useGetStepInfoQuery,
  useLazyGetStepInfoQuery,
  useMoveCaseDetailMutation,
} from "../../redux/api/medallionApi";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import BSuccessMessage from "../../components/BSuccessMessage";
import BAttachedFile from "../../components/BAttachedFile";
import DocumentGridViewOnly from "../../components/DocumentGridViewOnly";

const VerifyIndividualOwnerDoc = ({
  caseId,
  currentStepId,
  currentStep,
  reload,
  hasAccess,
}) => {
  const navigate = useNavigate();
  const [isOpen, setOpen] = useState(false);
  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();
  // const { data: stepInfoData } = useGetStepInfoQuery({
  //   caseNo: caseId,
  //   step_no: currentStepId,
  // });
  // var requiredDocTypes = ["signed_rider", "ssn", "license", "payee_proof"];
  const [triggerGetStepInfo, { data: stepInfoData, isFetching, isSuccess }] =
    useLazyGetStepInfoQuery();
  // 🔹 Call API on page load
  useEffect(() => {
    if (caseId && currentStepId) {
      triggerGetStepInfo({ caseNo: caseId, step_no: "175" });
    }
  }, [caseId, currentStepId, triggerGetStepInfo]);

  useEffect(() => {
    if (isMoveDataSuccess) {
      setOpen(true);
      reload();
    }
  }, [isMoveDataSuccess]);
  var currentRequiredDocTypes = ["ssn", "driving_license", "payee_proof"];
  // Check if all required documents are uploaded
  // const areAllRequiredDocumentsUploaded = useMemo(() => {
  //   if (!currentStep) return false;

  //   let documentMappings;

  //   if (currentStep?.rider_document?.document_type === "rider") {
  //     currentRequiredDocTypes = ["rider", "ssn", "license", "payee_proof"];
  //     documentMappings = {
  //       rider: currentStep?.rider_document,
  //       ssn: currentStep?.ssn_document,
  //       license: currentStep?.license_document,
  //       payee_proof: currentStep?.payee_proof,
  //     };
  //   } else {
  //     currentRequiredDocTypes = [
  //       "signed_rider",
  //       "ssn",
  //       "license",
  //       "payee_proof",
  //     ];
  //     documentMappings = {
  //       signed_rider: currentStep?.rider_document,
  //       ssn: currentStep?.ssn_document,
  //       license: currentStep?.license_document,
  //       payee_proof: currentStep?.payee_proof,
  //     };
  //   }

  //   console.log("Required Doc Types", currentRequiredDocTypes);
  //   return currentRequiredDocTypes.every((docType) => {
  //     const document = documentMappings[docType];
  //     // Check if document exists and has required properties
  //     return document && document.document_id && document.presigned_url;
  //   });
  // }, [currentStep]);

  return (
    <>
      {/* <p className="text-grey">Verify Documents</p> */}
      {/* {currentStep?.rider_document && (
        <div className="w-max-content">
          <BAttachedFile
            file={{
              name: currentStep?.rider_document?.document_name,
              path: currentStep?.rider_document?.presigned_url,
              id: currentStep?.rider_document?.document_id,
            }}
          ></BAttachedFile>
        </div>
      )} */}
      {stepInfoData ? (
        <DocumentGridViewOnly
          data={[
            { ...stepInfoData?.ssn_document },
            { ...stepInfoData?.driving_license },
            { ...stepInfoData?.payee_proof },
            { ...stepInfoData?.passport_document },
          ]}
          requiredDocTypes={currentRequiredDocTypes}
        ></DocumentGridViewOnly>
      ) : null}
      <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        <Button
          label="Verify Documents"
          type="button"
          data-testid="verify-doc-submit-btn"
          onClick={() => {
            if (hasAccess) {
              moveCase({ params: caseId });
            }
          }}
          severity="warning"
          className="border-radius-0 primary-btn "
        />
      </div>
      <BSuccessMessage
        isOpen={isOpen}
        message={`Create Individual Owner is successful and approved`}
        title="Create Individual Owner process is successful"
        onCancel={() => {
          setOpen(false);
          navigate("/manage-owner", { replace: true });
        }}
        onConfirm={() => {
          setOpen(false);
          navigate("/manage-owner", { replace: true });
        }}
        isHtml={true}
      />
    </>
  );
};

export default VerifyIndividualOwnerDoc;
