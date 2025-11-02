import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BCaseCard from "../../components/BCaseCard";
import BConfirmModal from "../../components/BConfirmModal";
import {
  useCreateCaseMutation,
  useGetCaseDetailQuery,
} from "../../redux/api/medallionApi";
import {
  CHOOSE_LEASE_DETAIL,
  CHOOSE_LEASE_DRIVER,
  ENTER_FINANCIAL_DETAIL,
  ENTER_LEASE_DETAIL,
  NEW_LEASE_TYPE,
  SIGN_LEASE_DRIVER,
  VIEWGENERATEDOCUMENT,
} from "../../utils/constants";
import {
  getCurrentStep,
  getStepById,
  getStepIndicator,
  isStepAccessable,
  isStepClickable,
} from "../../utils/caseUtils";
import ChooseLease from "./ChooseLease";
import EnterLease from "./EnterLease";
import FinancialInfo from "./FinancialInfo";
import "./_b-new-lease.scss";
import ChooseDriverLease from "./ChooseDriverLease";
import ViewDocAndSign from "./ViewDocAndSign";
import ViewGeneratedDocument from "./ViewGeneratedDocument";
import BAuditTrailModal from "../../components/BAuditTrailModal";
import { monthDateYearHrsMinSepartedByUnderscore } from "../../utils/dateConverter";
import AdditionalDriverViewDocAndSign from "../manageLease/AdditionalDriverViewDocAndSign";
import AdditionalDriverViewGeneratedDocument from "../manageLease/AdditionalDriverViewGeneratedDocument";

const NewLease = ({ title }) => {
  const navigate = useNavigate();
  const params = useParams();

  const [currentStepId, setCurrentStepId] = useState(null);
  const [currentStepData, setcurrentStepData] = useState(null);
  const [hasAccess, setAccess] = useState(false);

  const [createCase, { data, isSuccess, isError }] = useCreateCaseMutation();
  const { data: caseData, isLoading } = useGetCaseDetailQuery(
    params["caseid"],
    {
      skip: !params["caseid"],
    }
  );
  useEffect(() => {
    if (isSuccess) {
      navigate(`/new-lease/${data.case_no}`);
    }
  }, [isSuccess]);
  useEffect(() => {
    if (isError) {
      navigate("/manage-lease");
    }
  }, [isError]);

  const createNewCase = () => {
    createCase(NEW_LEASE_TYPE);
  };

  const naviagteSteps = (idx, item) => {
    const stepData = getStepById(currentStepId, item.sub_steps);
    if (isStepClickable(idx, currentStepId, item.sub_steps, caseData)) {
      setCurrentStepId(stepData.step_id);
      setcurrentStepData(stepData.step_data);
      setAccess(isStepAccessable(stepData));
    }
  };

  const renderCurrentStep = {
    [CHOOSE_LEASE_DETAIL]: (
      <ChooseLease
        caseId={params["caseid"]}
        caseData={caseData}
        currentStepId={currentStepId}
        currentStepData={currentStepData}
        hasAccess={hasAccess}
      />
    ),
    [ENTER_LEASE_DETAIL]: (
      <EnterLease
        caseId={params["caseid"]}
        caseData={caseData}
        currentStepId={currentStepId}
        currentStepData={currentStepData}
        hasAccess={hasAccess}
      />
    ),
    [ENTER_FINANCIAL_DETAIL]: (
      <FinancialInfo
        caseId={params["caseid"]}
        caseData={caseData}
        currentStepId={currentStepId}
        currentStepData={currentStepData}
        hasAccess={hasAccess}
      />
    ),
    [CHOOSE_LEASE_DRIVER]: (
      <ChooseDriverLease
        caseId={params["caseid"]}
        caseData={caseData}
        currentStepId={currentStepId}
        currentStepData={currentStepData}
        hasAccess={hasAccess}
      />
    ),
    [SIGN_LEASE_DRIVER]: (
      <ViewDocAndSign
        caseId={params["caseid"]}
        caseData={caseData}
        currentStepId={currentStepId}
        currentStepData={currentStepData}
        hasAccess={hasAccess}
      />
    ),
    [VIEWGENERATEDOCUMENT]: (
      <ViewGeneratedDocument
        caseId={params["caseid"]}
        caseData={caseData}
        currentStepId={currentStepId}
        currentStepData={currentStepData}
        hasAccess={hasAccess}
      />
    ),
  };

  useEffect(() => {
    console.log(caseData);

    if (caseData) {
      const currentStep = getCurrentStep(caseData.steps);
      setCurrentStepId(currentStep?.step_id);
      setcurrentStepData(currentStep?.step_data);
      setAccess(isStepAccessable(currentStep));
    }
  }, [caseData]);

  return (
    <div className="common-layout w-100 h-100 d-flex flex-column gap-4">
      {!isLoading && !params["caseid"] ? (
        <BConfirmModal
          isOpen={true}
          title="Confirmation on Lease Creation"
          message="This will create a new case for lease creation. Are you sure to proceed?"
          onCancel={() => {
            navigate("/manage-lease");
          }}
          onConfirm={() => {
            createNewCase();
          }}
        ></BConfirmModal>
      ) : (
        <>
          <div className="d-flex align-items-center justify-content-between">
            <p className="topic-txt">{title}</p>
            <BAuditTrailModal
              caseId={params["caseid"]}
              stepId={currentStepId}
            ></BAuditTrailModal>
          </div>

          <div className="d-flex align-items-center cus-gap-5">
            {caseData?.steps.map((item, idx) => {
              return (
                <div
                  key={idx}
                  onClick={() => naviagteSteps(idx, item)}
                  className={`step-menu d-flex align-items-center gap-2 text-grey ${
                    getStepById(currentStepId, item.sub_steps).is_current_step
                      ? "active"
                      : ""
                  }`}
                >
                  {getStepIndicator(
                    idx,
                    currentStepId,
                    item.sub_steps,
                    caseData
                  )}
                  {item.step_name}
                </div>
              );
            })}
          </div>
          <div className="d-flex align-items-center gap-5 mb-2">
            <BCaseCard
              label="Case Number"
              value={caseData?.case_info?.case_no}
              dataTestId="case-number"
            ></BCaseCard>
            <BCaseCard
              label="Case Status"
              value={caseData?.case_info?.case_status}
              dataTestId="case-status"
            ></BCaseCard>
            <BCaseCard
              label="Created By"
              value={caseData?.case_info?.created_by}
              dataTestId="created-by"
            ></BCaseCard>
            <BCaseCard
              label="Created On"
              value={monthDateYearHrsMinSepartedByUnderscore(
                caseData?.case_info?.case_created_on
              )}
              dataTestId="created-on"
            ></BCaseCard>
            <BCaseCard
              label="Action Due On"
              value={monthDateYearHrsMinSepartedByUnderscore(
                caseData?.case_info?.action_due_on
              )}
              dataTestId="action-due-on"
            ></BCaseCard>
            <BCaseCard
              label="To be completed in"
              value={monthDateYearHrsMinSepartedByUnderscore(
                caseData?.case_info?.to_be_completed_in
              )}
              dataTestId="ssn"
            ></BCaseCard>
          </div>
          {renderCurrentStep[currentStepId]}
        </>
      )}
    </div>
  );
};

export default NewLease;
