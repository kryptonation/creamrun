import { Button } from "primereact/button";
import BInputText from "../../../components/BInputText";
import {
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../../redux/api/medallionApi";
import { useEffect, useState } from "react";
import { getCurrentStep } from "../../../utils/caseUtils";
import { useFormik } from "formik";
import { ledgerEnterDriver as variable } from "../../../utils/variables";
import BUploadInput from "../../../components/BUploadInput";
import BInputNumber from "../../../components/BInputNumber";
import BSuccessMessage from "../../../components/BSuccessMessage";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setIsUpload } from "../../../redux/slice/uploadSlice";
import BAddSelect from "../../../components/BAddSelect";
import BCaseCard from "../../../components/BCaseCard";
import BRadioVertical from "../../../components/BRadioVertical";
import BRadioHorizontal from "../../../components/BRadioHorizontal";
import { getFullName } from "../../../utils/utils";
import BTimeInput from "../../../components/BTimeInput";
import BTimePicker from "../../../components/BTimePicker";
import BCalendar from "../../../components/BCalendar";
import { TimeToDateFormat, yearMonthDate } from "../../../utils/dateConverter";

const LedgerEntryDetail = ({
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
  console.log("ledger Entry detail", currentStep);
  useEffect(() => {
    if (isMoveDataSuccess) {
      reload();
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
      [variable?.[0].id]: 0,
      [variable?.[1].id]: true,
      [variable?.[2].id]: "",
      [variable?.[3].id]: "",
      [variable?.[4].id]: "",
      [variable?.[5].id]: "",
      [variable?.[6].id]: "",
      [variable?.[7].id]: "",
    },
    validateOnChange: true,
    validate: (values) => {
      console.log(values);

      const errors = {};
      if (
        values[variable[0].id] === undefined ||
        values[variable[0].id] === null
      ) {
        errors[variable[0].id] = `${variable[0].label} is required`;
      }
      // if (!values[variable[1].id]) {
      //   errors[variable[1].id] = `${variable[1].label} is required`;
      // }
      if (!values[variable[2].id]) {
        errors[variable[2].id] = `${variable[2].label} is required`;
      }
      if (!values[variable[6].id]) {
        errors[variable[6].id] = `${variable[6].label} is required`;
      }
      if (!values[variable[7].id]) {
        errors[variable[7].id] = `${variable[7].label} is required`;
      }

      return errors;
    },
    onSubmit: (values) => {
      let demoData = {};
      demoData = {
        step_id: currentStepId,
        data: {
          [variable?.[0].id]: Number(values[variable?.[0].id]),
          debit: values[variable?.[1].id],
          source_type: values[variable?.[2].id],
          [variable?.[3].id]: values[variable?.[3].id],
          [variable?.[4].id]: values[variable?.[4].id],
          description: values[variable?.[5].id],
          transaction_date: yearMonthDate(values[variable?.[7].id]),
          transaction_time: TimeToDateFormat(values[variable?.[6].id]),
        },
      };
      console.log("payload", demoData);
      if (hasAccess) processFlow({ params: caseId, data: demoData });
    },
  });
  console.log("🚀 ~ LedgerEntryDetail ~ formik:", formik.values, currentStep);

  const isUpload = useSelector((state) => state.upload.isUpload);
  const dispatch = useDispatch();
  const [transactionTypes, setTransactionTypes] = useState();

  useEffect(() => {
    if (currentStep && !isUpload) {
      const stepData = currentStep?.tlc_license_info;
      formik.setFieldValue(
        [variable?.[0].id],
        stepData?.[variable?.[0].id] || 0,
        true
      );
      formik.setFieldValue(
        [variable?.[1].id],
        stepData?.[variable?.[1].id] || true,
        true
      );
      formik.setFieldValue(
        [variable?.[2].id],
        stepData?.[variable?.[2].id] ? stepData?.[variable?.[2].id] : "",
        true
      );
      formik.setFieldValue(
        [variable?.[3].id],
        stepData?.source_type ? stepData?.source_type : "",
        true
      );
      // formik.setFieldValue(
      //   [variable?.[4].id],
      //   stepData?.[variable?.[4].id]
      //     ? new Date(stepData?.[variable?.[4].id])
      //     : "",
      //   true
      // );
      formik.setFieldValue(
        [variable?.[5].id],
        stepData?.[variable?.[5].id] || "",
        true
      );
      formik.setFieldValue(
        [variable?.[6].id],
        stepData?.[variable?.[6].id]
          ? new Date(TimeToDateFormat(stepData?.[variable?.[6].id]))
          : "",
        false
      );
      setTransactionTypes(currentStep?.source_type);
      console.log(currentStep?.source_type);
      dispatch(setIsUpload(false));
    }
  }, [currentStep]);

  useEffect(() => {
    dispatch(setIsUpload(false));
  }, []);

  const navigate = useNavigate();

  return (
    <form
      className="common-form d-flex flex-column"
      onSubmit={formik.handleSubmit}
    >
      <div className="d-flex align-items-center gap-5 pb-4 ">
        <BCaseCard
          label="Driver Name"
          value={getFullName(
            currentStep?.driver_details?.driver_details?.first_name,
            currentStep?.driver_details?.driver_details?.middle_name,
            currentStep?.driver_details?.driver_details?.last_name
          )}
        />
        .
        <BCaseCard
          label="Driver Status"
          value={currentStep?.driver_details?.driver_details?.driver_status}
        />
        <BCaseCard
          label="TLC License Number"
          value={
            currentStep?.driver_details?.tlc_license_details?.tlc_license_number
          }
        />
        <BCaseCard
          label="DMV License Number"
          value={
            currentStep?.driver_details?.dmv_license_details?.dmv_license_number
          }
        />
        <BCaseCard
          label="SSN"
          value={currentStep?.driver_details?.driver_details?.driver_ssn}
        />
      </div>
      <div className="form-section">
        <div className="form-body">
          <div className="form-body d-flex flex-column common-gap">
            <div className="d-flex flex-wrap form-grid-1 w-100 gap-4">
              <BCaseCard
                label={"Ledger ID"}
                className={"col-md-2"}
                value={currentStep?.ledger_details.ledger_id}
              />
              <div className="col-md-4">
                <BRadioHorizontal
                  variable={variable?.[1]}
                  formik={formik}
                  className="d-flex flex-row gaps-2"
                ></BRadioHorizontal>
                {/* <BRadioVertical
                  variable={variable?.[1]}
                  formik={formik}
                  className="d-flex flex-column gap-2"
                ></BRadioVertical> */}
              </div>
              <div className="w-100-3">
                <BAddSelect
                  variable={{
                    id: "sourceType",
                    label: "Transaction Type",
                    options: currentStep?.source_type,
                    isRequire: true,
                  }}
                  formik={formik}
                ></BAddSelect>
              </div>
              <div className="w-100-3 mt-3">
                <BCalendar variable={variable?.[7]} formik={formik}></BCalendar>
              </div>

              <div className="w-100-3 mt-3">
                <BTimePicker
                  variable={variable?.[6]}
                  formik={formik}
                ></BTimePicker>
                {/* <BTimeInput
                  variable={variable?.[6]}
                  formik={formik}
                ></BTimeInput> */}
              </div>
              <div className="w-100-3 mt-3">
                <BInputNumber
                  variable={variable?.[0]}
                  formik={formik}
                  isCurrency={true}
                ></BInputNumber>
              </div>

              <div className="w-100-3 mt-3">
                <BUploadInput
                  badge_value={
                    currentStep?.ledger_document?.document_id ? 1 : 0
                  }
                  object_type={
                    currentStep?.ledger_document.document_object_type
                  }
                  variable={variable?.[4]}
                  formik={formik}
                  document_id={0}
                  document_type={[
                    {
                      name: "Ledger",
                      code: currentStep?.ledger_document.document_type,
                    },
                  ]}
                  apiData={currentStep?.ledger_document}
                ></BUploadInput>
              </div>
            </div>
            <div className="d-flex align-items-center mt-3 flex-wrap form-grid-1 w-75">
              <BInputText variable={variable?.[5]} formik={formik}></BInputText>
            </div>
          </div>
        </div>
      </div>
      <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        {
          <Button
            disabled={!hasAccess || !formik.isValid}
            label="Submit Ledger Details"
            type="submit"
            severity="warning"
            className="border-radius-0 primary-btn "
          />
        }
      </div>
      <BSuccessMessage
        isOpen={isMoveDataSuccess}
        message={`Ledger Entry Created Successfully.`}
        title="Ledger Entry Successful"
        onCancel={() => {
          navigate("/manage-ledger-entry");
        }}
        onConfirm={() => {
          navigate("/manage-ledger-entry");
        }}
      ></BSuccessMessage>
    </form>
  );
};

export default LedgerEntryDetail;
