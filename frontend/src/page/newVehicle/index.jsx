import { useNavigate, useParams } from "react-router-dom"
import { useCreateCaseMutation, useGetCaseDetailQuery } from "../../redux/api/medallionApi"
import { ENTER_VEHICLE_DELIVERY_COMPLETE, ENTER_VEHICLE_DELIVERY_DETAIL, ENTER_VEHICLE_DETAIL, NEW_VEHICLE_TYPE, SEARCH_VEHICLE_ENTITY, VIEW_VEHICLE_DOCUMENT } from "../../utils/constants"
import { useEffect, useState } from "react"
import BConfirmModal from "../../components/BConfirmModal"
import ChooseEntity from "./ChooseEntity"
import VehicleDeliveryDetails from "./VehicleDeliveryDetails"
import VehicleDetails from "./VehicleDetails"
import VehicleVerifyDocument from "./VehicleVerifyDocument"
import VehicleDeliveryCompletion from "./VehicleDeliveryCompletion"
import { getCurrentStep, getStepById, getStepIndicator, isStepAccessable, isStepClickable } from "../../utils/caseUtils"
import BCaseCard from "../../components/BCaseCard"
import BAuditTrailModal from "../../components/BAuditTrailModal"

const NewVehicle = () => {
  const navigate = useNavigate();
  const params = useParams();

  const [currentStepId, setCurrentStepId] = useState(null);
  const [currentStepData, setcurrentStepData] = useState(null);
  const [hasAccess, setAccess] = useState(false);

  const [createCase, { data, isSuccess, isError }] = useCreateCaseMutation();
  const { data: caseData } = useGetCaseDetailQuery(params["caseid"], {
    skip: !params["caseid"],
  },);

  const createNewCase = () => {
    createCase(NEW_VEHICLE_TYPE)
  }

  useEffect(() => {
    if (isSuccess) {
      navigate(`/new-vehicle/${data.case_no}`)
    }
  }, [isSuccess]);

  useEffect(() => {
    if (isError) {
      navigate("/manage-vehicle");
    }
  }, [isError]);

  useEffect(() => {
    if (caseData) {
      const stepData = getCurrentStep(caseData.steps)
      setCurrentStepId(stepData?.step_id)
      setcurrentStepData(stepData.step_data)
      setAccess(isStepAccessable(stepData))
    }
  }, [caseData]);


  const naviagteSteps = (idx, item) => {
    const stepData = getStepById(currentStepId, item.sub_steps)
    if (isStepClickable(idx, currentStepId, item.sub_steps, caseData)) {
      setCurrentStepId(stepData.step_id)
      setcurrentStepData(stepData.step_data)
      setAccess(isStepAccessable(stepData))
    }
  }

  const renderCurrentStep = {
    [SEARCH_VEHICLE_ENTITY]: <ChooseEntity caseId={params["caseid"]} caseData={caseData} currentStepId={currentStepId} currentStepData={currentStepData} hasAccess={hasAccess} />,
    [ENTER_VEHICLE_DETAIL]: <VehicleDetails caseId={params["caseid"]} caseData={caseData} currentStepId={currentStepId} currentStepData={currentStepData} hasAccess={hasAccess} />,
    [ENTER_VEHICLE_DELIVERY_DETAIL]: <VehicleDeliveryDetails caseId={params["caseid"]} caseData={caseData} currentStepId={currentStepId} currentStepData={currentStepData} hasAccess={hasAccess} />,
    [VIEW_VEHICLE_DOCUMENT]: <VehicleVerifyDocument caseId={params["caseid"]} caseData={caseData} currentStepId={currentStepId} currentStepData={currentStepData} hasAccess={hasAccess} />,
    [ENTER_VEHICLE_DELIVERY_COMPLETE]: <VehicleDeliveryCompletion caseId={params["caseid"]} caseData={caseData} currentStepId={currentStepId} currentStepData={currentStepData} hasAccess={hasAccess} />,
  };

  return (
    <div className="common-layout w-100 h-100 d-flex flex-column gap-4">
      {!params["caseid"] ?
        <BConfirmModal
          isOpen={true}
          title='Confirmation on New Vehicle Registration'
          message="This will create a new case for Vehicle registration. Are you sure to proceed?"
          onCancel={() => { navigate("/manage-vehicle"); }}
          onConfirm={() => { createNewCase() }}
        ></BConfirmModal>
        :
        <>
          <div className="d-flex align-items-center justify-content-between">
            <p className="topic-txt">New Vehicle</p>
            <BAuditTrailModal caseId={params["caseid"]} stepId={currentStepId}></BAuditTrailModal>
          </div>
          <div className="d-flex align-items-center cus-gap-5">
            {/* {
                    caseData?.steps.map((item, idx) => {
                        return <div key={idx}
                            className={`step-menu d-flex align-items-center gap-2 text-grey
                  ${(findingActive(item, idx))}`}
                            onClick={() => !getCurrentStep(currentStep, item.sub_steps).has_already_been_used || dispatch(activateComponentAction(getCurrentStep(currentStep, item.sub_steps).step_id))}
                        >
                            {
                                (getCurrentStep(currentStep, item.sub_steps).has_already_been_used && !getCurrentStep(currentStep, item.sub_steps).is_current_step) ? <span className="sucess-icon border-0">
                                    <Img name="success"></Img></span> :
                                    <span className={`d-flex align-items-center justify-content-center rounded-circle `}>{idx + 1}</span>
                            }
                            {item.step_name}
                        </div>
                    })
                } */}
            {
              caseData?.steps.map((item, idx) => {
                return <div key={idx}
                  onClick={() => naviagteSteps(idx, item)}
                  data-testid={`step-${item?.step_name.replaceAll(' ', '').toLowerCase()}`}
                  className={`step-menu d-flex align-items-center gap-2 text-grey ${getStepById(currentStepId, item.sub_steps).is_current_step ? "active" : ""}`}>
                  {
                    getStepIndicator(idx, currentStepId, item.sub_steps, caseData)

                  }
                  {item.step_name}
                </div>
              })
            }
          </div>
          <div className="d-flex align-items-center gap-5 mb-2">
            <BCaseCard label="Case Number" value={caseData?.case_info?.case_no} dataTestId="case-number"></BCaseCard>
            <BCaseCard label="Case Status" value={caseData?.case_info?.case_status} dataTestId="case-status"></BCaseCard>
            <BCaseCard label="Created By" value={caseData?.case_info?.created_by} dataTestId="created-by"></BCaseCard>
            <BCaseCard label="Created On" value={caseData?.case_info?.case_created_on} dataTestId="created-on"></BCaseCard>
            <BCaseCard label="Action Due On" value={caseData?.case_info?.action_due_on} dataTestId="action-due-on"></BCaseCard>
            <BCaseCard label="To be completed in" value={caseData?.case_info?.to_be_completed_in} dataTestId="ssn"></BCaseCard>
          </div>
          {/* {
                stepInfoData?.type === "individual" ? <ViewIndividualOwner /> : renderCurrentStep[currentStepId]
            } */}
          {renderCurrentStep[currentStepId]}
        </>
      }
    </div>
  )
}

export default NewVehicle