import { Button } from "primereact/button";
import BCalendar from "../../../components/BCalendar";
import BInputText from "../../../components/BInputText";
import BRadio from "../../../components/BRadio";
import { useFormik } from "formik";
import {
  statesOptions,
  dmvdriverUpdateLicense as variable,
} from "../../../utils/variables";
import { useEffect, useRef, useState } from "react";
import {
  useGetStepInfoQuery,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../../redux/api/medallionApi";
import { yearMonthDate } from "../../../utils/dateConverter";
import { useSelector } from "react-redux";
import { getCurrentStep } from "../../../utils/caseUtils";
import BModal from "../../../components/BModal";
import Img from "../../../components/Img";
import BUpload from "../../../components/BUpload";
import BAttachedFile from "../../../components/BAttachedFile";
import BInputNumber from "../../../components/BInputNumber";
import { Badge } from "primereact/badge";
import BSelect from "../../../components/BSelect";
import { validateDMVLicenseNumber } from "../../../utils/formUitiles";
import BInputFileView from "../../../components/BInputFileView";
import { removeUnderScore } from "../../../utils/utils";
import BSuccessMessage from "../../../components/BSuccessMessage";
import { useNavigate } from "react-router-dom";
import BToast from "../../../components/BToast";

const UpdateDmvLicense = ({
  caseId,
  currentStepId,
  reload,
  currentStep,
  caseData,
  hasAccess,
  isCaseSuccess,
}) => {
  const [processFlow, { isSuccess: isProcessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();
  const selectedMedallionDetail = useSelector(
    (state) => state.medallion.selectedMedallionDetail
  );
  const [file, setFile] = useState({});
  const [isOpen, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: stepInfoData } = useGetStepInfoQuery({
    caseNo: caseId,
    step_no: currentStepId,
  });
  const [isErrorActive, setIsErrorActive] = useState(false);
  const toast = useRef(null);
  console.log(
    "Current Step: Update dmv license",
    currentStep,
    selectedMedallionDetail
  );
  console.log("Case Date", caseData);

  useEffect(() => {
    if (isMoveDataSuccess) {
      setOpen(true);
    }
  }, [isMoveDataSuccess]);

  useEffect(() => {
    // if(isProcessDataSuccess){
    //     reload()
    // }
    if (
      hasAccess &&
      isProcessDataSuccess &&
      getCurrentStep(caseData.steps).step_id == currentStepId &&
      getCurrentStep(caseData.steps).is_current_step
    ) {
      moveCase({ params: caseId });
    }
  }, [isProcessDataSuccess]);

  const formik = useFormik({
    initialValues: {
      // [variable?.[0].id]: true,
      [variable?.[1].id]: "",
      [variable?.[2].id]: "",
      [variable?.[3].id]: "",
      [variable?.[4].id]: "",
      [variable?.[5].id]: "",
      [variable?.[6].id]: "",
      //[variable?.[7].id]: 0,
    },
    validateOnChange: true,
    validate: (values) => {
      const errors = {};

      const dmvLicenseError = validateDMVLicenseNumber(
        values.dmv_license_number
      );
      if (dmvLicenseError) {
        errors.dmv_license_number = dmvLicenseError;
      }

      if (!currentStep?.dmv_license_document?.document_id) {
        errors["dmv_license_number"] =
          "Please upload the DMV License Document in Step 1";
      }
      if (!values.dmv_license_issued_state) {
        errors["dmv_license_issued_state"] =
          "DMV License Issued State is required";
      }

      if (!values.dmv_license_expiry_date) {
        errors["dmv_license_expiry_date"] =
          "DMV License Expiry Date is required";
      } else {
        const today = new Date();
        // reset time to 00:00:00 for a fair comparison
        today.setHours(0, 0, 0, 0);
        const dmvDate = new Date(values.dmv_license_expiry_date);
        dmvDate.setHours(0, 0, 0, 0);
        if (dmvDate <= today) {
          errors["dmv_license_expiry_date"] =
            "DMV License Expiry Date must be a future date";
        }
      }

      return errors;
    },
    onSubmit: (values) => {
      let demoData = {};
      demoData = {
        step_id: currentStepId,
        data: {
          dmv_license_details: {
            driver_id: currentStep?.driver_info?.driver_lookup_id,
            // [variable?.[0].id]: values[variable?.[0].id],
            is_dmv_license_active: true,
            dmv_license_number: values[variable?.[1].id],
            dmv_license_issued_state: values[variable?.[2].id]?.code,
            dmv_class: values[variable?.[3].id],
            dmv_license_status: values[variable?.[4].id],
            dmv_class_change_date: yearMonthDate(values[variable?.[5].id]),
            dmv_license_expiry_date: yearMonthDate(values[variable?.[6].id]),
            //[variable?.[7].id]: values[variable?.[7].id],
          },
        },
      };
      console.log("Payload", demoData);
      if (hasAccess) processFlow({ params: caseId, data: demoData });
    },
  });

  useEffect(() => {
    console.log("Step info data", stepInfoData);
    if (stepInfoData) {
      console.log("isCaseSuccess", isCaseSuccess, currentStep);
      const stepData = stepInfoData?.dmv_license_info;
      console.log(stepData?.[variable?.[5].id]);
      formik.setFieldValue(
        [variable?.[1].id],
        stepData?.dmv_license_number || "",
        true
      );
      const dmvIssuedState = stepData?.dmv_license_issued_state;

      if (
        dmvIssuedState &&
        dmvIssuedState !== formik.values.dmv_license_issued_state?.code
      ) {
        const matchedOption = statesOptions.find(
          (item) => item.code === dmvIssuedState
        );

        formik.setFieldValue(
          "dmv_license_issued_state",
          matchedOption || null,
          true
        );
      }
      // formik.setFieldValue(
      //   [variable?.[2].id],
      //   stepData?.[variable?.[2].id] || "",
      //   true
      // );
      formik.setFieldValue(
        [variable?.[3].id],
        stepData?.[variable?.[3].id] || "",
        true
      );
      formik.setFieldValue(
        [variable?.[4].id],
        stepData?.[variable?.[4].id] || "",
        true
      );
      formik.setFieldValue(
        [variable?.[5].id],
        stepData?.[variable?.[5].id]
          ? new Date(stepData?.[variable?.[5].id])
          : "",
        true
      );
      formik.setFieldValue(
        [variable?.[6].id],
        stepData?.[variable?.[6].id]
          ? new Date(stepData?.[variable?.[6].id])
          : "",
        true
      );
    }
  }, [stepInfoData]);

  const handleFormSubmit = async () => {
    const errors = await formik.validateForm();
    if (Object.keys(errors).length > 0) {
      formik.setTouched(
        Object.keys(errors).reduce((acc, key) => ({ ...acc, [key]: true }), {}),
        false
      );
      if (!isErrorActive) {
        toast.current.showToast(
          "Error",
          "Please complete all required fields and upload the necessary files before submitting",
          "error",
          false,
          10000
        );
        setIsErrorActive(true);
        setTimeout(() => setIsErrorActive(false), 10000);
      }
    } else {
      formik.submitForm();
    }
  };

  return (
    <form
      className="common-form d-flex flex-column"
      onSubmit={formik.handleSubmit}
    >
      <div className="form-section">
        <div className="form-body">
          <div className="form-body d-flex flex-column common-gap">
            <div className="d-flex align-items-center flex-wrap form-grid-1 w-100">
              {/* <div className="w-100-3 mb-2">
                <BRadio variable={variable?.[0]} formik={formik}></BRadio>
              </div> */}
            </div>
            <div
              className="d-flex align-items-center flex-wrap form-grid-1 w-100 "
              style={{ rowGap: "4rem", gap: "4rem 1rem" }}
            >
              <div className="w-100-3">
                <BInputFileView
                  variable={variable?.[1]}
                  formik={formik}
                  apiData={currentStep?.dmv_license_document}
                  object_type={
                    currentStep?.dmv_license_document?.document_object_type
                  }
                  document_type={[
                    {
                      name: removeUnderScore(
                        currentStep?.dmv_license_document?.document_type
                      ),
                      code: currentStep?.dmv_license_document?.document_type,
                    },
                  ]}
                ></BInputFileView>
              </div>
              <div className="w-100-3">
                <BSelect variable={variable?.[2]} formik={formik}></BSelect>
              </div>
              <div className="w-100-3">
                <BCalendar variable={variable?.[6]} formik={formik}></BCalendar>
              </div>
              <div className="w-100-3">
                <BInputText
                  variable={variable?.[3]}
                  formik={formik}
                ></BInputText>
              </div>
              <div className="w-100-3">
                <BInputText
                  variable={variable?.[4]}
                  formik={formik}
                ></BInputText>
              </div>
              <div className="w-100-3">
                <BCalendar variable={variable?.[5]} formik={formik}></BCalendar>
              </div>

              {/* <div className="w-100-3">
                <BInputNumber
                  variable={variable?.[7]}
                  formik={formik}
                ></BInputNumber>
              </div> */}
            </div>
            {/* <div className="d-flex flex-column gap-2">
              <BModal>
                <BModal.ToggleButton>
                  <Button
                    text
                    label="Upload Updated DMV License"
                    className="text-black gap-2 w-max-content"
                    type="button"
                    icon={() => <Img name="upload" />}
                  />
                </BModal.ToggleButton>
                <BModal.Content>
                  <BUpload
                    data={currentStep?.dmv_license_document}
                    setFile={setFile}
                    file={file}
                    object_type={
                      currentStep?.dmv_license_document?.document_object_type
                    }
                    object_id={
                      currentStep?.dmv_license_document?.document_object_id
                    }
                    document_id={0}
                    document_type={[
                      {
                        name: "DMV License",
                        code: currentStep?.dmv_license_document?.document_type,
                      },
                    ]}
                  ></BUpload>
                </BModal.Content>
              </BModal>
              <div className="w-max-content">
                {currentStep?.dmv_license_document?.document_name && (
                  <BAttachedFile
                    file={{
                      name: currentStep?.dmv_license_document?.document_name,
                      path: currentStep?.dmv_license_document?.presigned_url,
                      id: currentStep?.dmv_license_document?.document_id,
                      document_type:
                        currentStep?.dmv_license_document?.document_type,
                    }}
                  ></BAttachedFile>
                )}
              </div>
            </div> */}
          </div>
        </div>
        <BSuccessMessage
          isOpen={isOpen}
          message={`DMV License update is successful and approved for Driver  ${currentStep?.driver_info?.first_name}`}
          title="DMV License update process is successful"
          onCancel={() => {
            setOpen(false);
            navigate("/manage-driver", { replace: true });
          }}
          onConfirm={() => {
            setOpen(false);
            navigate("/manage-driver", { replace: true });
          }}
        />
      </div>
      <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        {
          <Button
            disabled={!hasAccess}
            label="Submit Updated License"
            type="button"
            data-testid="submit-updated-license"
            severity="warning"
            className="border-radius-0 primary-btn"
            onClick={handleFormSubmit}
          />
        }
      </div>
      <BToast ref={toast} position="top-right" />
    </form>
  );
};

export default UpdateDmvLicense;
