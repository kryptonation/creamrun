import { useEffect, useMemo, useState } from "react";
import DocumentGrid from "../../../components/DocumentGrid";
import {
  useGetStepInfoQuery,
  useMoveCaseDetailMutation,
} from "../../../redux/api/medallionApi";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import BSuccessMessage from "../../../components/BSuccessMessage";
import BAttachedFile from "../../../components/BAttachedFile";
import DocumentGridUploadAndView from "../../../components/DocumentGridUploadAndView";

const VerifyUpdatedIndividualDocuments = ({
  caseId,
  currentStepId,
  reload,
  hasAccess,
  currentStep,
}) => {
  const navigate = useNavigate();
  const [isOpen, setOpen] = useState(false);
  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();
  // const { data: stepInfoData } = useGetStepInfoQuery({
  //   caseNo: caseId,
  //   step_no: currentStepId,
  // });
  console.log("Verify Corporation Doc", currentStep, isMoveDataSuccess);
  useEffect(() => {
    if (isMoveDataSuccess) {
      setOpen(true);
      reload();
    }
  }, [isMoveDataSuccess]);
  const hasSignedUpdateAddress = currentStep?.documents?.some(
    (doc) => doc.document_type === "signed_update_address"
  );

  // If not available, set the required types
  const requiredTypes = hasSignedUpdateAddress
    ? ["signed_update_address", "ssn", "payee_proof", "driving_license"]
    : ["ssn", "payee_proof", "driving_license"];

  const corpDocs = currentStep?.documents || [];

  // Find only required docs
  const requiredDocs = corpDocs.filter((doc) =>
    requiredTypes.includes(doc?.document_type)
  );

  // Checkbox is enabled ONLY if ALL required docs have either id or presigned url
  var allRequiredDocsValid =
    requiredDocs.length === requiredTypes.length &&
    requiredDocs.every((doc) => doc?.document_id || doc?.presigned_url);

  console.log("require docs valid for P", allRequiredDocsValid);
  return (
    <>
      <DocumentGridUploadAndView
        data={currentStep?.documents}
        requiredDocTypes={requiredTypes}
        uploadFileTypes={["signed_update_address"]}
      />
      <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        <Button
          label="Verify Documents"
          type="button"
          data-testid="submit-btn"
          disabled={!hasAccess || !allRequiredDocsValid}
          onClick={() => {
            if (hasAccess && allRequiredDocsValid) {
              moveCase({ params: caseId });
            }
          }}
          severity="warning"
          className="border-radius-0 primary-btn "
        />
      </div>
      <BSuccessMessage
        isOpen={isOpen}
        message={`${currentStep?.individual_details?.individual_info?.full_name} Details Update is Successful `}
        title={`Medallion Owner Details Update is Successful`}
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

export default VerifyUpdatedIndividualDocuments;
