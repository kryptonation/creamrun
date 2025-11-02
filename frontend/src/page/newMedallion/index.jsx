import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useCreateCaseMutation, useGetCaseDetailQuery, useGetStepInfoQuery } from "../../redux/api/medallionApi";
import BModal from "../../components/BModal";
import BConforimModal from "../../components/BConforimModal";
import ChooseMedallion from "./ChooseMedallion";
import MedallionDetail from "./MedallionDetail";
import CreatePacket from "./CreatePacket";
import LeaseDetail from "./LeaseDetail";
import { activateComponentAction, getActiveComponent } from "../../redux/slice/componentSlice";
import CaseTop from "./CaseTop";
import CreateIndividualOwner from "./CreateIndividualOwner";
import ViewIndividualOwner from "./ViewIndividualOwner";
import { CHOOSE_INDIVIDUAL_OWNER, CREATE_INDIVIDUAL_OWNER, ENTER_MEDALLION_DETAIL, ENTER_MEDALLION_PAYEE_DETAIL, LEASE_DETAIL, MEDALLION_DOCUMENT } from "../../utils/constants";
import { getCaseStepById, getStepIndicator, isStepClickable } from "../../utils/caseUtils";
import { useFormik } from "formik";
import { useCreateAuditTrailMutation } from "../../redux/api/auditTrailAPI";
import BAuditTrailModal from "../../components/BAuditTrailModal";
import EnterPayee from "./EnterPayee";
import {getCurrentStep as utilGetCurrentStep} from "../../utils/caseUtils";

const NewMedallion = () => {
  const navigate = useNavigate();
  const params = useParams();
  const dispatch = useDispatch();
  const activeComponent = useSelector(getActiveComponent);

  useEffect(() => {
    dispatch(activateComponentAction(0))
  }, [])

  const [createCase, { data, error, isSuccess, isError }] = useCreateCaseMutation();

  useEffect(() => {
    if (isSuccess) {
      navigate(`/new-medallion/${data.case_no}`)
    }
  }, [isSuccess]);

  useEffect(() => {
    if (isError) {
      navigate("/manage-medallion")
    }
  }, [isError])

  const { data: getCaseData, isSuccess: isCaseSuccess, isFetching, isError: isCaseError } = useGetCaseDetailQuery(params["case-id"], {
    skip: !params["case-id"],
  },);

  const createNewCase = () => {
    createCase("NEWMED")
  }

  const renderComponents = (currentStep) => {
    const currentData=getCaseStepById(getCaseData.steps,currentStep);
    switch (currentStep) {
      case CHOOSE_INDIVIDUAL_OWNER:
        return <ChooseMedallion currentStep={currentData} />;
      // case CHOOSE_INDIVIDUAL_OWNER:
      //   return <CreateIndividualOwner />;
      case ENTER_MEDALLION_DETAIL:
        return <MedallionDetail currentStep={currentData} />;
      case MEDALLION_DOCUMENT:
        return <CreatePacket currentStep={currentData} />;
      case LEASE_DETAIL:
        return <LeaseDetail currentStep={currentData} />;
      case ENTER_MEDALLION_PAYEE_DETAIL:
        return <EnterPayee currentStep={currentData} />;
      case CREATE_INDIVIDUAL_OWNER:
        return <CreateIndividualOwner currentStep={currentData} />;
    }
  };

  useEffect(() => {
    if (isCaseError) {
      navigate("/manage-medallion")
    }
  }, [isCaseError])

  useEffect(() => {
    if (isCaseSuccess) {
      dispatch(activateComponentAction(getCaseData?.steps.map(item => item.sub_steps).flat().filter(item =>
        item.is_current_step === true
      )[0]?.step_id || getCaseData?.steps.map(item => item.sub_steps).flat()[0]?.step_id))
    }
  }, [isCaseSuccess, isFetching]);

  const getCurrentStep = (currentStep, steps) => {
    if (!steps?.length) { return }
    else {
      const step = steps?.filter(item => { return item?.step_id === currentStep })
      if (step.length > 0) {
        return step[0]
      } else {
        return steps[0]
      }
    }
  }

  const currentStep = CHOOSE_INDIVIDUAL_OWNER;

  const activeLink = getCaseData?.steps.map(item => item.sub_steps).flat().filter((item) => {
    return item.is_current_step
  })

  const findingActive = (item, idx) => {
    if (activeLink.length) {
      if (getCurrentStep(currentStep, item.sub_steps).is_current_step) {
        return "active"
      }
    }
    else if (idx === 0) {
      return "active"
    }
    else {
      return "demo"
    }
  }

  const naviagteSteps = (idx, item) => {
    if (isStepClickable(idx, currentStep, item.sub_steps, getCaseData)) {
      dispatch(activateComponentAction(getCurrentStep(currentStep, item.sub_steps).step_id))
    }
  }
  const [createAudit, { isSuccess: createIsSuccess }] = useCreateAuditTrailMutation();

  const formik = useFormik({
    initialValues: {
    },
    validateOnChange: true,
    validate: () => {
      const errors = {};
      // if (!values?.description) {
      //   errors.description = `${variable.field_01.label} is required`;
      // }
      return errors;
    },
    onSubmit: (values) => {
      createAudit({
        "case_no": params["case-id"],
        "step_id": activeComponent,
        "description": values?.description,
        "driver_id": 0,
        "medallion_id": 0,
        "vehicle_id": 0
      })
    },
  });
  useEffect(() => {
    if (createIsSuccess) {
      onDialogShow();
      formik.resetForm();
      formik.setFieldValue("description", "");
    }
  }, [createIsSuccess]);

  const onDialogShow = () => {
    const divElement = document?.querySelector(".p-dialog-content")
    divElement.scrollTop = divElement.scrollHeight;
    // divElement.scrollIntoView({ behavior: 'smooth' });
  };
  return (
    <div className="common-layout w-100 h-100 d-flex flex-column gap-4">
      {getCaseData &&
        <>
          <div className="d-flex align-items-center justify-content-between">
            <p className="topic-txt">New Medallion</p>
            <div className="d-flex align-items-center gap-2">
              <BAuditTrailModal caseId={params["case-id"]} stepId={activeComponent}></BAuditTrailModal>

            </div>
          </div>
          <div className="d-flex align-items-center cus-gap-5">
            {
              getCaseData?.steps.map((item, idx) => {
                return <div key={idx}
                data-testid={`step-${item?.step_name.replaceAll(' ', '').toLowerCase()}`}
                  className={`step-menu d-flex align-items-center gap-2 text-grey
              ${(findingActive(item, idx))}`}
                  onClick={() => naviagteSteps(idx, item)}
                >
                  {
                    getStepIndicator(idx, currentStep, item.sub_steps, getCaseData)

                  }
                  {item.step_name}
                </div>
              })
            }

          </div>
          <CaseTop data={getCaseData?.case_info}></CaseTop>
          
          { renderComponents(activeComponent)}
          {/* {
            stepInfoData?.type === "individual" ? <ViewIndividualOwner /> : renderComponents[activeComponent]
          } */}

        </>
      }
      {!params["case-id"] && <BModal isOpen={true}>
        <BModal.Content>
          <BConforimModal action={createNewCase} cancelAction={() => navigate("/manage-medallion")} isSuccess={isSuccess} error={error}></BConforimModal>
        </BModal.Content>
      </BModal>}
    </div>
  )
}

export default NewMedallion