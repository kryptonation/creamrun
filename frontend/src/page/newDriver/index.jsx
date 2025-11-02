import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useCreateCaseMutation,
  useGetCaseDetailQuery,
} from "../../redux/api/medallionApi";
import BConfirmModal from "../../components/BConfirmModal";
import {
  newDriverConformationMessage,
  newDriverConformationTitle,
  newRegistration,
} from "../../utils/stringUtils";
import {
  APPROVE_DRIVER,
  NEW_DRIVER,
  UPLOAD_DRIVER_DOCUMENT,
  SEARCH_DRIVER,
  VERIFY_DRIVER_DOCUMENT,
  REGISTER_DRIVER,
} from "../../utils/constants";
import {
  getCurrentStep,
  getStepById,
  getStepIndicator,
  isStepAccessable,
  isStepClickable,
} from "../../utils/caseUtils";
import BCaseCard from "../../components/BCaseCard";
import SearchDriver from "./SearchDriver";
import DriverRegistration from "./DriverRegistration";
import VerifyDocuments from "./VerifyDocuments";
import VerifyDetails from "./VerifyDetails";
import BAuditTrailModal from "../../components/BAuditTrailModal";
import {
  monthDateYearHrsMin,
  monthDateYearHrsMinSepartedByUnderscore,
} from "../../utils/dateConverter";
import UploadDocumentsStepComponent from "../../components/UploadDocumentsStepComponents";

const NewDriver = () => {
  const navigate = useNavigate();
  const params = useParams();

  const [currentStepId, setCurrentStepId] = useState(null);
  const [currentStepData, setcurrentStepData] = useState(null);
  const [hasAccess, setAccess] = useState(false);

  const [createCase, { data, isSuccess, isError }] = useCreateCaseMutation();
  const { data: caseData, refetch } = useGetCaseDetailQuery(params["caseid"], {
    skip: !params["caseid"],
  });
  // const { data: stepInfoData } = useGetStepInfoQuery(
  //   { caseNo: caseId, step_no: currentStepId },
  //   { skip: !caseId }
  // );
  // useEffect(() => {
  //   if (stepInfoData) {
  //     // setDocuments(stepInfoData.driver_documents)
  //     refetch();
  //   }
  // }, [stepInfoData]);
  const createNewCase = () => {
    createCase(NEW_DRIVER);
  };

  useEffect(() => {
    if (isSuccess) {
      // navigate(`/new-driver/${data.case_no}`);
      navigate(`case/${NEW_DRIVER}/${data?.case_no}`);
    }
  }, [isSuccess]);

  useEffect(() => {
    if (isError) {
      navigate("/manage-driver");
    }
  }, [isError]);

  useEffect(() => {
    if (caseData) {
      const currentStep = getCurrentStep(caseData.steps);
      setCurrentStepId(currentStep?.step_id);
      setcurrentStepData(currentStep?.step_data);
      setAccess(isStepAccessable(currentStep));
    }
  }, [caseData]);

  const naviagteSteps = (idx, item) => {
    const stepData = getStepById(currentStepId, item.sub_steps);
    if (isStepClickable(idx, currentStepId, item.sub_steps, caseData)) {
      setCurrentStepId(stepData.step_id);
      setcurrentStepData(stepData.step_data);
      setAccess(isStepAccessable(stepData));
    }
  };

  const renderCurrentStep = () => {
    if (currentStepId === SEARCH_DRIVER) {
      return (
        <SearchDriver
          caseId={params["caseid"]}
          caseData={caseData}
          currentStepId={currentStepId}
          currentStepData={currentStepData}
          hasAccess={hasAccess}
        ></SearchDriver>
      );
    } else if (currentStepId === UPLOAD_DRIVER_DOCUMENT) {
      return (
        // <DriverRegistration
        //   caseId={params["caseid"]}
        //   caseData={caseData}
        //   currentStepId={currentStepId}
        //   currentStepData={currentStepData}
        //   hasAccess={hasAccess}
        // ></DriverRegistration>
        <UploadDocumentsStepComponent
          caseId={params["caseid"]}
          currentStepId={currentStepId}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></UploadDocumentsStepComponent>
      );
    } else if (currentStepId === REGISTER_DRIVER) {
      return (
        <DriverRegistration
          caseId={params["caseid"]}
          caseData={caseData}
          currentStepId={currentStepId}
          currentStepData={currentStepData}
          hasAccess={hasAccess}
        ></DriverRegistration>
      );
    }
    //  else if (currentStepId === VERIFY_DRIVER_DOCUMENT) {
    //   return (
    //     <VerifyDocuments
    //       caseId={params["caseid"]}
    //       caseData={caseData}
    //       currentStepId={currentStepId}
    //       currentStepData={currentStepData}
    //       hasAccess={hasAccess}
    //     ></VerifyDocuments>
    //   );
    // }
    else if (currentStepId === APPROVE_DRIVER) {
      return (
        <VerifyDetails
          caseId={params["caseid"]}
          caseData={caseData}
          currentStepId={currentStepId}
          currentStepData={currentStepData}
          hasAccess={hasAccess}
        ></VerifyDetails>
      );
    }
  };
  return (
    <div className="common-layout w-100 h-100 d-flex flex-column gap-4">
      {!params["caseid"] ? (
        <div>
          <BConfirmModal
            isOpen={true}
            title={newDriverConformationTitle}
            message={newDriverConformationMessage}
            onCancel={() => {
              navigate("/manage-driver");
            }}
            onConfirm={() => {
              createNewCase();
            }}
          />
        </div>
      ) : (
        <>
          <div className="d-flex align-items-center justify-content-between">
            <p className="topic-txt">{newRegistration}</p>
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
                  //  setCurrentStepId(getCurrentStep(caseData.steps)?.step_id)
                  onClick={() => naviagteSteps(idx, item)}
                  data-testid={`step-${item?.step_name
                    .replaceAll(" ", "")
                    .toLowerCase()}`}
                  // onClick={()=> !getCurrentStep(currentStep,item.sub_steps).has_already_been_used}
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
          <div className="d-flex align-items-center gap-5">
            <BCaseCard
              label="Case Number"
              value={caseData?.case_info.case_no}
              dataTestId="case-number"
            />
            <BCaseCard
              label="Case Status"
              value={caseData?.case_info.case_status}
              dataTestId="case-status"
            />
            <BCaseCard
              label="Created By"
              value={caseData?.case_info.created_by}
              dataTestId="created-by"
            />
            <BCaseCard
              label="Created On"
              value={monthDateYearHrsMinSepartedByUnderscore(
                caseData?.case_info.case_created_on
              )}
              dataTestId="created-on"
            />
            <BCaseCard
              label="Action Due Date"
              value={monthDateYearHrsMinSepartedByUnderscore(
                caseData?.case_info.action_due_on
              )}
              dataTestId="action-due-on"
            />
            <BCaseCard
              label="Remaining Days Left"
              value={monthDateYearHrsMinSepartedByUnderscore(
                caseData?.case_info.action_due_on
              )}
              dataTestId="ssn"
            />
          </div>
          {/* <VerifyDetails /> */}
          {/* <>{renderCurrentStep()}</> */}
        </>
      )}
    </div>
  );
};

export default NewDriver;
