import { useEffect, useMemo, useState } from "react";
import DocumentGrid from "../../components/DocumentGrid";
import {
  useGetStepInfoQuery,
  useMoveCaseDetailMutation,
} from "../../redux/api/medallionApi";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import BSuccessMessage from "../../components/BSuccessMessage";
import BAttachedFile from "../../components/BAttachedFile";
import DocumentGridUploadAndView from "../../components/DocumentGridUploadAndView";

const VerifyCorporationDoc = ({
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
  // const currentRequiredDocTypes = ["rider_document", "ssn", "payee_proof", "ein"];
  var currentRequiredDocTypes;
  // Check if all required documents are uploaded
  // const areAllRequiredDocumentsUploaded = useMemo(() => {
  //   if (!currentStep) return false;

  //   let documentMappings;
  //   currentRequiredDocTypes = ["signed_rider_document", "ss4"];
  //   documentMappings = {
  //     signed_rider_document: currentStep?.documents[0],
  //     ss4: currentStep?.documents[1],
  //   };

  //   // if (currentStep?.documents[3]?.document_type === "rider_document") {

  //   // } else {
  //   //   currentRequiredDocTypes = [
  //   //     "signed_rider_document",
  //   //     "ssn",
  //   //     "ein",
  //   //     "payee_proof",
  //   //   ];
  //   //   documentMappings = {
  //   //     signed_rider_document: currentStep?.documents[3],
  //   //     ssn: currentStep?.documents[2],
  //   //     ein: currentStep?.documents[1],
  //   //     payee_proof: currentStep?.documents[0],
  //   //   };
  //   // }

  //   console.log("Required Doc Types", currentRequiredDocTypes);
  //   return currentRequiredDocTypes.every((docType) => {
  //     const document = documentMappings[docType];
  //     // Check if document exists and has required properties
  //     return document && document.document_id && document.presigned_url;
  //   });
  // }, [currentStep]);

  const requiredTypes = ["signed_rider_document", "ss4"];

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
      {/* {currentStep?.rider_document && (
        <div className="w-max-content">
          <BAttachedFile
            file={{
              name: currentStep?.rider_document.document_name,
              path: currentStep?.rider_document.presigned_url,
              id: currentStep?.rider_document.document_id,
            }}
          ></BAttachedFile>
        </div>
      )} */}
      {/* {currentStep ? (
        <DocumentGrid
          data={currentStep.documents}
          requiredDocTypes={currentRequiredDocTypes}
        ></DocumentGrid>
      ) : null} */}
      <DocumentGridUploadAndView
        data={currentStep?.documents}
        requiredDocTypes={requiredTypes}
        uploadFileTypes={["signed_rider_document"]}
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
        message={`Create Corporation is successful and approved`}
        title="Create Corporation process is successful"
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

export default VerifyCorporationDoc;
