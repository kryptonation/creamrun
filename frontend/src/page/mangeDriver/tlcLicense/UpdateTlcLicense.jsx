import { Button } from "primereact/button";
import BCalendar from "../../../components/BCalendar";
import BInputText from "../../../components/BInputText";
import { useFormik } from "formik";
import {
  statesOptions,
  tlcDriverUpdateLicense as variable,
} from "../../../utils/variables";
import { useEffect, useRef, useState } from "react";
import {
  useGetStepInfoQuery,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../../redux/api/medallionApi";
import { yearMonthDate } from "../../../utils/dateConverter";
import { useDispatch, useSelector } from "react-redux";
import { getCurrentStep } from "../../../utils/caseUtils";
import BModal from "../../../components/BModal";
import Img from "../../../components/Img";
import BUpload from "../../../components/BUpload";
import BAttachedFile from "../../../components/BAttachedFile";
import { setIsUpload } from "../../../redux/slice/uploadSlice";
import BCaseCard from "../../../components/BCaseCard";
import BSelect from "../../../components/BSelect";
import BInputFileView from "../../../components/BInputFileView";
import { removeUnderScore } from "../../../utils/utils";
import BSuccessMessage from "../../../components/BSuccessMessage";
import { useNavigate } from "react-router-dom";
import { validateTlcLicenseNumber } from "../../../utils/formUitiles";
import BToast from "../../../components/BToast";

const UpdateTlcLicense = ({
  caseId,
  currentStepId,
  reload,
  currentStep,
  caseData,
  hasAccess,
}) => {
  const [processFlow, { isSuccess: isProcessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();
  const [file, setFile] = useState({});
  const { data: stepInfoData } = useGetStepInfoQuery({
    caseNo: caseId,
    step_no: currentStepId,
  });
  const [isOpen, setOpen] = useState(false);
  const navigate = useNavigate();
  const [isErrorActive, setIsErrorActive] = useState(false);
  const toast = useRef(null);
  //console.log("Update Tlc license",caseData?.steps[0].sub_steps[0].step_data.tlc_license_info.tlc_license_number)

  useEffect(() => {
    if (isMoveDataSuccess) {
      setOpen(true);
    }
  }, [isMoveDataSuccess]);

  useEffect(() => {
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
      [variable?.[0].id]: "",
      [variable?.[1].id]: "",
      [variable?.[2].id]: "",
      // [variable?.[3].id]: "",
      [variable?.[3].id]: "",
      [variable?.[4].id]: "",
      // [variable?.[6].id]: "",
      // [variable?.[5].id]: "",
      // [variable?.[8].id]: "",
    },
    validateOnChange: true,
    validate: (values) => {
      const errors = {};

      const tlcError = validateTlcLicenseNumber(values.tlc_license_number);
      if (tlcError) {
        errors.tlc_license_number = tlcError;
      }
      if (!currentStep?.tlc_license_document?.document_id) {
        errors["tlc_license_number"] =
          "Please upload the TLC License Document in Step 1";
      }

      if (values.tlc_license_expiry_date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tlcDate = new Date(values.tlc_license_expiry_date);
        tlcDate.setHours(0, 0, 0, 0);

        if (tlcDate <= today) {
          errors["tlc_license_expiry_date"] =
            "TLC License Expiry Date must be a future date";
        }
      }

      return errors;
    },
    onSubmit: (values) => {
      let demoData = {};
      console.log("On Submit", values);
      demoData = {
        step_id: currentStepId,
        data: {
          driver_id: currentStep?.driver_info?.driver_lookup_id,
          [variable?.[0].id]: values[variable?.[0].id],
          [variable?.[1].id]: values[variable?.[1].id]?.code,
          [variable?.[2].id]: yearMonthDate(values[variable?.[2].id]),
          // [variable?.[3].id]: yearMonthDate(values[variable?.[3].id]),
          [variable?.[3].id]: yearMonthDate(values[variable?.[3].id]),
          [variable?.[4].id]: yearMonthDate(values[variable?.[4].id]),
          // [variable?.[6].id]: yearMonthDate(values[variable?.[6].id]),
          // [variable?.[5].id]: yearMonthDate(values[variable?.[5].id]),
          // [variable?.[8].id]: Number(values[variable?.[8].id]),
        },
      };
      console.log("Demo data", demoData);

      if (hasAccess) processFlow({ params: caseId, data: demoData });
    },
  });
  const isUpload = useSelector((state) => state.upload.isUpload);
  const dispatch = useDispatch();
  useEffect(() => {
    if (stepInfoData) {
      const stepData = stepInfoData?.tlc_license_info;
      formik.setFieldValue(
        [variable?.[0].id],
        stepData?.tlc_license_number || "",
        true
      );
      const tlcIssuedState = stepData?.tlc_issued_state;

      if (
        tlcIssuedState &&
        tlcIssuedState !== formik.values.tlc_issued_state?.code
      ) {
        const matchedOption = statesOptions.find(
          (item) => item.code === tlcIssuedState
        );

        formik.setFieldValue("tlc_issued_state", matchedOption || null, true);
      }
      //   formik.setFieldValue(
      //     [variable?.[1].id],
      //     stepData?.[variable?.[1].id] || "",
      //     true
      //   );
      formik.setFieldValue(
        [variable?.[2].id],
        stepData?.[variable?.[2].id]
          ? new Date(stepData?.[variable?.[2].id])
          : "",
        true
      );
      // formik.setFieldValue([variable?.[3].id], stepData?.[variable?.[3].id] ? new Date(stepData?.[variable?.[3].id]) : "", true);
      formik.setFieldValue(
        [variable?.[3].id],
        stepData?.[variable?.[3].id]
          ? new Date(stepData?.[variable?.[3].id])
          : "",
        true
      );
      formik.setFieldValue(
        [variable?.[4].id],
        stepData?.[variable?.[4].id]
          ? new Date(stepData?.[variable?.[4].id])
          : "",
        true
      );
    }
    // dispatch(setIsUpload(false));
  }, [stepInfoData]);

  // useEffect(() => {
  //   dispatch(setIsUpload(false));
  // }, []);

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
            <div
              className="d-flex align-items-center flex-wrap form-grid-1 w-100 p-2"
              style={{ rowGap: "4rem", gap: "4rem 2rem" }}
            >
              <div className="w-100-3">
                <BInputFileView
                  variable={variable?.[0]}
                  formik={formik}
                  apiData={currentStep?.tlc_license_document}
                  object_type={
                    currentStep?.tlc_license_document?.document_object_type
                  }
                  document_type={[
                    {
                      name: removeUnderScore(
                        currentStep?.tlc_license_document?.document_type
                      ),
                      code: currentStep?.tlc_license_document?.document_type,
                    },
                  ]}
                ></BInputFileView>
              </div>
              <div className="w-100-3">
                <BSelect variable={variable?.[1]} formik={formik}></BSelect>
              </div>
              <div className="w-100-3">
                <BCalendar variable={variable?.[2]} formik={formik}></BCalendar>
              </div>
              <div className="w-100-3">
                <BCalendar variable={variable?.[3]} formik={formik}></BCalendar>
              </div>
              <div className="w-100-3">
                <BCaseCard
                  label="Previous TLC License Number"
                  value={
                    caseData?.steps[0].sub_steps[0].step_data?.tlc_license_info
                      ?.tlc_license_number
                  }
                />
              </div>
              <div className="w-100-3">
                <BCalendar variable={variable?.[4]} formik={formik}></BCalendar>
              </div>

              {/* <div className="w-100-3">
                                <BCalendar variable={variable?.[6]} formik={formik} ></BCalendar>
                            </div> */}
              {/* <div className="w-100-3">
                                <BCalendar variable={variable?.[7]} formik={formik} ></BCalendar>
                            </div> */}
              {/* <div className="w-100-3">
                                <BInputText variable={variable?.[8]} formik={formik} ></BInputText>
                            </div> */}
            </div>
            {/* <div className="d-flex flex-column gap-2">
              <BModal>
                <BModal.ToggleButton>
                  <Button
                    disabled={!hasAccess}
                    text
                    label="Upload  Updated TLC License"
                    className="text-black gap-2 w-max-content"
                    type="button"
                    icon={() => <Img name="upload" />}
                  />
                </BModal.ToggleButton>
                <BModal.Content>
                  <BUpload
                    data={currentStep?.tlc_license_document}
                    setFile={setFile}
                    file={file}
                    object_type={
                      currentStep?.tlc_license_document?.document_object_type
                    }
                    object_id={
                      currentStep?.tlc_license_document?.document_object_id
                    }
                    document_id={0}
                    document_type={[
                      {
                        name: "TLC License",
                        code: currentStep?.tlc_license_document?.document_type,
                      },
                    ]}
                  ></BUpload>
                </BModal.Content>
              </BModal>
              <div className="w-max-content">
                {currentStep?.tlc_license_document?.document_name && (
                  <BAttachedFile
                    file={{
                      name: currentStep?.tlc_license_document?.document_name,
                      path: currentStep?.tlc_license_document?.presigned_url,
                      id: currentStep?.tlc_license_document?.document_id,
                      document_type:
                        currentStep?.tlc_license_document?.document_type,
                    }}
                  ></BAttachedFile>
                )}
              </div>
            </div> */}
          </div>
        </div>
      </div>
      <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        {
          <Button
            disabled={!hasAccess}
            label="Submit Updated License"
            type="button"
            severity="warning"
            className="border-radius-0 primary-btn"
            onClick={handleFormSubmit}
          />
        }
      </div>
      <BSuccessMessage
        isOpen={isOpen}
        message={`TLC License update is successful and approved for Driver 
                       ${stepInfoData?.driver_info?.first_name}`}
        title="TLC License update process is successful"
        onCancel={() => {
          setOpen(false);
          navigate("/manage-driver", { replace: true });
        }}
        onConfirm={() => {
          setOpen(false);
          navigate("/manage-driver", { replace: true });
        }}
      />
      <BToast ref={toast} position="top-right" />
    </form>
  );
};

export default UpdateTlcLicense;
