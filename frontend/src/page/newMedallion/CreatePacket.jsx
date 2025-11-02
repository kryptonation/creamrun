import { Button } from "primereact/button";
import Img from "../../components/Img";
import BModal from "../../components/BModal";
import BCaseCard from "../../components/BCaseCard";
import {
  useDeleteDocumentMutation,
  useGetStepInfoQuery,
  useMoveCaseDetailMutation,
  useGetCaseDetailQuery,
  useLazyGetStepInfoQuery,
} from "../../redux/api/medallionApi";
import { useParams } from "react-router-dom";
import BUpload from "../../components/BUpload";
import BConfirmModal from "../../components/BConfirmModal";
import { useEffect, useRef, useState } from "react";
import BToast from "../../components/BToast";
import { LEASE_DETAIL, MEDALLION_DOCUMENT } from "../../utils/constants";
import DocumentGrid from "../../components/DocumentGrid";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getActiveComponent } from "../../redux/slice/componentSlice";
import { getCurrentStep } from "../../utils/caseUtils";
import { Checkbox } from "primereact/checkbox";
import { useProcessCaseDeatilMutation } from "../../redux/api/medallionApi";
import BSuccessMessage from "../../components/BSuccessMessage";
import { getCaseStepById } from "../../utils/caseUtils";
import DocumentGridUploadAndView from "../../components/DocumentGridUploadAndView";

const CreatePacket = ({
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
  const activeComponent = useSelector(getActiveComponent);
  // const { data: caseData } = useGetCaseDetailQuery(caseId, {
  //   skip: !caseId,
  // });
  // const { data: currentStep } = useGetStepInfoQuery({
  //   caseNo: caseId,
  //   step_no: MEDALLION_DOCUMENT,
  // });
  const [deleteDocId, setDeleteDocId] = useState();
  const [deleteFunc, { isSuccess: isDeleteSuccess }] =
    useDeleteDocumentMutation();
  const toast = useRef(null);
  const [submit, setSubmit] = useState(false);
  const [checked, setChecked] = useState(false);
  const requiredTypes = [
    "renewal_receipt",
    "fs6",
    "medallion_storage_receipt",
    "royalty_agreement",
    "power_of_attorney",
    "medallion_agent_designation",
  ];
  const requiredTypesForPrint = [
    "renewal_receipt",
    "fs6",
    "medallion_storage_receipt",
    "signed_royalty_agreement",
    "signed_lease",
    "signed_power_of_attorney",
  ];
  // const stepData = getCaseStepById(caseData.steps, LEASE_DETAIL);
  const [triggerGetStepInfo, { data: stepInfoData, isFetching, isSuccess }] =
    useLazyGetStepInfoQuery();
  // 🔹 Call API on page load
  useEffect(() => {
    if (caseId && currentStepId) {
      triggerGetStepInfo({ caseNo: caseId, step_no: "109" });
    }
  }, [caseId, currentStepId, triggerGetStepInfo]);
  // console.log(
  //   "Step Data",
  //   stepData?.step_data.medallion_lease_details.contract_signed_mode
  // );

  const medallionDocs = currentStep?.medallion_documents || [];
  if (stepInfoData?.medallion_lease_details.contract_signed_mode == "P") {
    // Find only required docs
    const requiredDocs = medallionDocs.filter((doc) =>
      requiredTypesForPrint.includes(doc?.document_type)
    );
    // Checkbox is enabled ONLY if ALL required docs have either id or presigned url
    var allRequiredDocsValid =
      requiredDocs.length === requiredTypesForPrint.length &&
      requiredDocs.every((doc) => doc?.document_id || doc?.presigned_url);
    console.log("require docs valid for P", allRequiredDocsValid);
  } else {
    console.log("require docs valid for I and M");
    // Find only required docs
    const requiredDocs = medallionDocs.filter((doc) =>
      requiredTypes.includes(doc?.document_type)
    );
    // Checkbox is enabled ONLY if ALL required docs have either id or presigned url
    var allRequiredDocsValid =
      requiredDocs.length === requiredTypes.length &&
      requiredDocs.every((doc) => doc?.document_id || doc?.presigned_url);
    console.log("require docs valid for I or M", allRequiredDocsValid);
  }

  const [processFlow, { isSuccess: isProcessDataSuccess }] =
    useProcessCaseDeatilMutation();

  const proccedDelete = () => {
    deleteFunc(deleteDocId);
  };

  useEffect(() => {
    if (!allRequiredDocsValid && checked) {
      setChecked(false);
    }
  }, [allRequiredDocsValid, checked]);

  useEffect(() => {
    console.log("useEffect()", isProcessDataSuccess);
    if (
      isProcessDataSuccess &&
      getCurrentStep(caseData?.steps).step_id == MEDALLION_DOCUMENT &&
      getCurrentStep(caseData?.steps).is_current_step
    ) {
      console.log("Move Case()");
      moveCase({ params: caseId });
    }
  }, [isProcessDataSuccess]);

  // useEffect(() => {
  //   console.log(
  //     "Medallion Document useEffect()",
  //     params,
  //     caseData,
  //     getCurrentStep(caseData?.steps).step_id,
  //     currentStep,
  //     activeComponent
  //   );
  // }, [caseData]);

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
  //const { data: currentStep } = useGetStepInfoQuery({ caseNo: caseId, step_no: MEDALLION_DOCUMENT, });
  const createMedallionApi = () => {
    console.log("createMedallionApi");
    processFlow({
      params: caseId,
      data: {
        step_id: currentStepId,
        data: { medallion_number: currentStep.medallion_number },
      },
    });
  };
  // const hideUploadButton=()=>{
  //   return (
  //           contract_signed_mode === "P" ||
  //           (
  //             (contract_signed_mode === "I" || contract_signed_mode === "M") &&
  //             rowData?.document_type !== "royalty_agreement" &&
  //             rowData?.document_type !== "signed_lease"
  //           )
  //         )
  // }

  return (
    <div>
      {/* <div
        className="topic-txt d-flex align-items-center gap-2"
        data-testid="medallion-documents"
      >
        <Img name="medallion" className="icon-black"></Img>Medallion Documents */}
      {/* <BModal>
          <BModal.ToggleButton>
            <Button
              outlined
              text
              label="Upload Documents"
              data-testId="upload-documents"
              data-testid="upload-common-btn"
              className="text-blue gap-2 outline-btn upload-common-btn fs-16-semibold d-flex ms-auto"
              type="button"
              icon={() => <Img name="uploaddoc" />}
            />
          </BModal.ToggleButton>
          <BModal.Content>
            <BUpload
              data={{ ...currentStep?.signed_lease_document }}
              object_type={"medallion"}
              object_id={currentStep?.medallion_id}
              document_id={0}
              document_type={[
                { name: "Lease", code: "signed_lease" },
                { name: "Renewal Receipt", code: "renewal_receipt" },
                { name: "FS6", code: "fs6" },
              ]}
            />
          </BModal.Content>
        </BModal> */}
      {/* </div> */}
      {/* <div className="d-flex align-items-center gap-5 py-4 ">
        <BCaseCard
          label="Medallion Owner Name"
          value={currentStep?.medallion_owner_name}
        />
        <BCaseCard label="SSN" value={currentStep?.medallion_ssn} />
        <BCaseCard label="MVL" value={currentStep?.mvl} />
        <BCaseCard label="Passport" value={currentStep?.medallion_passport} />
        <BCaseCard
          label="Contact"
          value={currentStep?.primary_email_address}
        />
      </div> */}
      {/* const filtered = documents.filter(doc => doc.document_type !== "signed_lease");
console.log(filtered); */}
      {/* <DocumentGrid
        // data={currentStep?.medallion_documents.filter(
        //   (doc) => doc.document_type !== "signed_lease"
        // )}
        data={currentStep?.medallion_documents}
        contract_signed_mode={
          stepData?.step_data.medallion_lease_details.contract_signed_mode
        }
        requiredDocTypes={
          stepData?.step_data.medallion_lease_details.contract_signed_mode ===
          "P"
            ? requiredTypesForPrint
            : requiredTypes
        }
      /> */}
      {/* <DocumentGridUploadAndView
        data={currentStep?.medallion_documents}
        requiredDocTypes={
          stepInfoData?.medallion_lease_details.contract_signed_mode === "P"
            ? requiredTypesForPrint
            : requiredTypes
        }
        uploadFileTypes={
          stepInfoData?.medallion_lease_details.contract_signed_mode === "P"
            ? [
                "renewal_receipt",
                "fs6",
                "storage_receipt",
                "signed_royalty_agreement",
                "signed_lease",
                "signed_power_of_attorney",
              ]
            : ["renewal_receipt", "fs6", "storage_receipt"]
        }
      /> */}
      <DocumentGridUploadAndView
        data={currentStep?.medallion_documents}
        requiredDocTypes={requiredTypesForPrint}
        uploadFileTypes={[
          "renewal_receipt",
          "fs6",
          "medallion_storage_receipt",
          "signed_royalty_agreement",
          "signed_lease",
          "signed_power_of_attorney",
        ]}
      />
      <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        <div
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
        </div>
        <Button
          label="Submit Documents"
          type="button"
          data-testid="medallion-doc-submit"
          disabled={!checked}
          onClick={() => {
            console.log(
              "Submit Button Click Medallion Document",
              params,
              caseData,
              getCurrentStep(caseData?.steps).step_id,
              currentStep,
              activeComponent
            );
            //createMedallionApi();
            moveCase({ params: caseId });
          }}
          severity="warning"
          className="border-radius-0 primary-btn "
        />
        {/* <Button label="Back to Enter Lease Details" text /> */}
      </div>
      <BConfirmModal
        isOpen={isOpen}
        title="Confirmation on Delete Medallion"
        message="Are you sure to delete the selected Medallion?"
        onCancel={() => {
          setDeleteDocId();
          setOpen(false);
        }}
        onConfirm={() => {
          setOpen(false);
          proccedDelete();
        }}
        {...{ iconName: "red-delete" }}
      ></BConfirmModal>
      <BToast ref={toast} position="top-right" />
      <BSuccessMessage
        isOpen={isMoveDataSuccess}
        message={`Medallion ${currentStep?.medallion_number} is created and available for assignment`}
        title="Medallion Creation Successful"
        onCancel={() => {
          navigate("/manage-medallion");
        }}
        onConfirm={() => {
          navigate("/manage-medallion");
        }}
      ></BSuccessMessage>
    </div>
  );
};

export default CreatePacket;
