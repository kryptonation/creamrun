import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import BSuccessMessage from "../../../components/BSuccessMessage";
import { useEffect, useState } from "react";
import {
  useGetStepInfoQuery,
  useLazyGetStepInfoQuery,
  useMoveCaseDetailMutation,
} from "../../../redux/api/medallionApi";
import DocumentGrid from "../../../components/DocumentGrid";
import { getCurrentStep } from "../../../utils/caseUtils";

const PayeeDocumentVerify = ({
  caseId,
  currentStepId,
  hasAccess,
  reload,
  currentStep,
  uploadRefresh,
  caseData,
}) => {
  // const [currentStep, setCurrentStep] = useState(currentStepSourceData);
  const navigate = useNavigate();
  const [isOpen, setOpen] = useState(false);
  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();
  const [isUploadSuccess, setUploadSuccess] = useState(false);
  // const [refreshKey, setRefreshKey] = useState(0);

  const [triggerGetStepInfo, { data: stepInfoData, isFetching, isSuccess }] =
    useLazyGetStepInfoQuery();

  // 🔹 Call API on page load
  useEffect(() => {
    if (caseId && currentStepId) {
      triggerGetStepInfo({ caseNo: caseId, step_no: currentStepId });
    }
  }, [caseId, currentStepId, triggerGetStepInfo]);

  // // 🔹 Call API when upload success
  // useEffect(() => {
  //   if (isUploadSuccess && caseId && currentStepId) {
  //     triggerGetStepInfo({ caseNo: caseId, step_no: currentStepId });
  //     setUploadSuccess(false); // reset flag
  //   }
  // }, [isUploadSuccess, caseId, currentStepId, triggerGetStepInfo]);

  // 🔹 Update local state when API returns data
  // useEffect(() => {
  //   if (isSuccess && stepInfoData) {
  //     setCurrentStep(stepInfoData);
  //     // setRefreshKey((k) => k + 1);
  //   }
  // }, [isSuccess, stepInfoData]);

  useEffect(() => {
    if (isMoveDataSuccess) {
      reload();
    }
  }, [isMoveDataSuccess, reload]);

  return (
    <div>
      <DocumentGrid
        // key={refreshKey}
        data={stepInfoData?.owner_payee_proofs}
        // setUploadSuccess={setUploadSuccess}
      />
      <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        <Button
          label="Submit Payee Proof"
          type="button"
          data-testid="submit-btn"
          disabled={!hasAccess}
          onClick={() => {
            if (
              hasAccess &&
              caseData &&
              caseData.case_info.case_status !== "Closed" &&
              getCurrentStep(caseData.steps).step_id === currentStepId
            ) {
              moveCase({ params: caseId, stepId: "118" });
            }
            // if (hasAccess) moveCase({ params: caseId, stepId: "118" });
          }}
          severity="warning"
          className="border-radius-0 primary-btn "
        />
      </div>
      <BSuccessMessage
        isOpen={isOpen}
        message={`Medallion <strong>${currentStep?.medallion_number}</strong> payee update is successful and approved`}
        title="Payee update process is successful"
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
    </div>
  );
};

export default PayeeDocumentVerify;
