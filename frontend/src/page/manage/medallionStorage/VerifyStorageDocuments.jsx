import { useNavigate, useParams } from "react-router-dom";
import {
  useDeleteDocumentMutation,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../../redux/api/medallionApi";
import { useEffect, useRef, useState } from "react";
import { getCaseStepById, getCurrentStep } from "../../../utils/caseUtils";
import { LEASE_DETAIL, MEDALLION_DOCUMENT } from "../../../utils/constants";
import DocumentGrid from "../../../components/DocumentGrid";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import BConfirmModal from "../../../components/BConfirmModal";
import BToast from "../../../components/BToast";
import BSuccessMessage from "../../../components/BSuccessMessage";
import DocumentGridUploadAndView from "../../../components/DocumentGridUploadAndView";

const VerifyStorageDocuments = ({
  caseId,
  currentStepId,
  isCaseSuccess,
  reload,
  currentStep,
  caseData,
  hasAccess,
}) => {
  const params = useParams();
  const navigate = useNavigate();
  const [isOpen, setOpen] = useState(false);
  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();
  const [deleteDocId, setDeleteDocId] = useState();
  const [deleteFunc, { isSuccess: isDeleteSuccess }] =
    useDeleteDocumentMutation();
  const toast = useRef(null);
  const [submit, setSubmit] = useState(false);
  const [checked, setChecked] = useState(false);
  const requiredTypes = ["signed_storage_receipt", "rate_card"];

  const ownerAddressDocs = currentStep?.documents || [];
  // Find only required docs
  const requiredDocs = ownerAddressDocs.filter((doc) =>
    requiredTypes.includes(doc?.document_type)
  );
  // Checkbox is enabled ONLY if ALL required docs have either id or presigned url
  var allRequiredDocsValid =
    requiredDocs.length === requiredTypes.length &&
    requiredDocs.every((doc) => doc?.document_id || doc?.presigned_url);
  console.log("require docs valid for P", allRequiredDocsValid);
  const proccedDelete = () => {
    deleteFunc(deleteDocId);
  };

  // useEffect(() => {
  //   if (!allRequiredDocsValid && checked) {
  //     setChecked(false);
  //   }
  // }, [allRequiredDocsValid, checked]);

  useEffect(() => {
    if (isDeleteSuccess) {
      toast.current.showToast(
        "Success",
        "Document successfully removed from system.",
        "success",
        false,
        10000
      );
    }
  }, [isDeleteSuccess]);

  useEffect(() => {
    if (isMoveDataSuccess) {
      setOpen(true);
      reload();
    }
  }, [isMoveDataSuccess]);

  return (
    <div>
      <DocumentGridUploadAndView
        data={currentStep?.documents}
        requiredDocTypes={requiredTypes}
        uploadFileTypes={["signed_storage_receipt", "acknowledgement_receipt"]}
      />
      <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        {/* <div
          className={`d-flex align-items-center pb-3 gap-3 ${
            submit && !checked ? "text-danger" : ""
          }`}
        >
          <Checkbox
            inputId="accept"
            name="accept"
            onChange={(e) => setChecked(e.checked)}
            checked={checked}
            disabled={!allRequiredDocsValid}
          />
          <label htmlFor="accept" data-testid="accept" className="ml-2">
            By Accepting , It is Confirmed that documents are verified and
            contract is signed to create a medallion{" "}
          </label>
        </div> */}
        <Button
          label="Verify Documents"
          type="button"
          data-testid="medallion-owner-address-doc-submit"
          disabled={!allRequiredDocsValid}
          onClick={() => {
            if (hasAccess) {
              moveCase({ params: caseId });
            }
          }}
          severity="warning"
          className="border-radius-0 primary-btn "
        />
        {/* <Button label="Back to Enter Lease Details" text /> */}
      </div>
      <BToast ref={toast} position="top-right" />
      <BSuccessMessage
        isHtml={true}
        isOpen={isOpen}
        message={`Medallion  <strong>${currentStep?.medallion_number}</strong> is ready for storage`}
        title="Medallion Storage Process Updated"
        onCancel={() => {
          setOpen(false);
          navigate("/manage-medallion", { replace: true });
        }}
        onConfirm={() => {
          setOpen(false);
          navigate("/manage-medallion", { replace: true });
        }}
      ></BSuccessMessage>
    </div>
  );
};

export default VerifyStorageDocuments;
