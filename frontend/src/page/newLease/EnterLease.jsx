import { useFormik } from "formik";
import { Button } from "primereact/button";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import BCalendar from "../../components/BCalendar.jsx";
import BCaseCard from "../../components/BCaseCard";
import BInputNumber from "../../components/BInputNumber.jsx";
import BInputText from "../../components/BInputText.jsx";
import BRadio from "../../components/BRadio.jsx";
import BSelect from "../../components/BSelect.jsx";
import Img from "../../components/Img";
import {
  medallionApi,
  useGetStepInfoQuery,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../redux/api/medallionApi.js";
import { getCurrentStep } from "../../utils/caseUtils.js";
import { calculateEndDate, yearMonthDate } from "../../utils/dateConverter.js";
import { allLeaseOptions, dayShiftOption, fullShiftOption, nightShiftOption, shiftLeaseOptions, enterLeaseDetails as variable } from "../../utils/variables.js";

const EnterLease = ({
  caseId,
  caseData,
  currentStepId,
  currentStepData,
  hasAccess,
}) => {
  const [processFlow, { isSuccess: isProccessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [moveCase] = useMoveCaseDetailMutation();
  const { data: stepInfoData, isSuccess } = useGetStepInfoQuery(
    { caseNo: caseId, step_no: currentStepId },
    { skip: !currentStepId || !caseId }
  );

  const [selectShiftVariable, setSelectShiftVariable] = useState(variable.field_07)
  const [leaseTypeVariable, setLeaseTypeVariable] = useState(variable.field_02)

  const formik = useFormik({
    initialValues: {
      [variable?.field_01.id]: "",
      [variable?.field_02.id]: "",
      [variable?.field_03.id]: "",
      [variable?.field_04.id]: "",
      [variable?.field_05.id]: "",
      [variable?.field_06.id]: variable?.field_06.value,
      [variable?.field_07.id]: "",
      [variable?.field_08.id]: "",
      [variable?.field_09.id]: 0,
      [variable?.field_10.id]: 0,
      [variable?.field_11.id]: 0,
      [variable?.field_12.id]: 0,
    },
    validateOnChange: true,
    validate: (values) => {
      const errors = {};
      if (!values[variable?.field_02.id]) {
        errors[
          variable?.field_02.id
        ] = `${variable?.field_02.label} is required`;
      }
      if (!values[variable?.field_03.id]) {
        errors[
          variable?.field_03.id
        ] = `${variable?.field_03.label} is required`;
      }
      if (!values[variable?.field_04.id]) {
        errors[
          variable?.field_04.id
        ] = `${variable?.field_04.label} is required`;
      }

      // if (!values[variable?.field_10.id]) {
      //   errors[
      //     variable?.field_10.id
      //   ] = `${variable?.field_10.label} is required`;
      // }

      // if (!values[variable?.field_06.id]) {
      //   errors[variable?.field_06.id] = `${variable?.field_06.label} is required`;
      // }
      return errors;
    },
    onSubmit: (values) => {
      console.log("🚀 ~ EnterLease ~ values:", values);
      const data = {
        ...values,
        lease_type: values[variable?.field_02?.id]?.code,
        is_day_shift:
          values?.[variable?.field_07?.id].code === "full" ||
          values?.[variable?.field_07?.id].code === "day",
        is_night_shift:
          values?.[variable?.field_07?.id].code === "full" ||
          values?.[variable?.field_07?.id].code === "night",
        lease_start_date: yearMonthDate(values[variable?.field_04?.id]),
        lease_end_date: yearMonthDate(values[variable?.field_05?.id]),
        deposit_amount_paid: values[variable?.field_08?.id]
          ? values[variable?.field_09?.id]
          : 0,
        payments: values[variable?.field_08?.id] ? "deposit_paid" : "",
      };
      delete data["is_day_night_shift"];
      processFlow({
        params: caseId,
        data: {
          step_id: currentStepId,
          data,
        },
      });
    },
  });

  const dispatch = useDispatch();

  useEffect(() => {
    if (isProccessDataSuccess) {
      // refetch();
      dispatch(medallionApi.util.invalidateTags(["caseStep"]));
    }
    if (
      isProccessDataSuccess &&
      caseData &&
      caseData.case_info.case_status !== "Closed" &&
      getCurrentStep(caseData.steps).step_id === currentStepId
    ) {
      moveCase({ params: caseId });
    }
  }, [isProccessDataSuccess]);

  const repairs = () => {
    const data = formik?.values[variable.field_02.id]?.code;
    if (data == "dov") {
      return "Drivers";
    }
    if (data == "long-term" || data == "short-term") {
      return "BATM";
    }
    return "Not Applicable";
  };

  useEffect(() => {
    if (stepInfoData) {
      const stepData = stepInfoData?.lease_info;
      const stepDataLease = stepInfoData?.lease_case_details;
      const leaseType = variable?.field_02.options.filter(
        (item) => item.code === stepDataLease?.[variable?.field_02.id]
      )?.[0];
      // const dayType = variable?.field_06.options.filter(item => item.code === stepData?.[variable?.field_06.id])?.[0];

      formik.setFieldValue(
        [variable?.field_01.id],
        stepData?.[variable?.field_01.id] || "",
        true
      );
      formik.setFieldValue([variable?.field_02.id], leaseType || "", true);
      formik.setFieldValue(
        [variable?.field_03.id],
        stepData?.[variable?.field_03.id] || variable?.field_03.value,
        true
      );
      formik.setFieldValue(
        [variable?.field_04.id],
        stepData?.[variable?.field_04?.id]
          ? new Date(stepData?.[variable?.field_04?.id])
          : "",
        true
      );
      formik.setFieldValue(
        [variable?.field_05.id],
        stepData?.[variable?.field_05?.id]
          ? new Date(stepData?.[variable?.field_05?.id])
          : "",
        true
      );
      formik.setFieldValue(
        [variable?.field_06.id],
        stepData?.[variable?.field_06.id] || true,
        true
      );

      let shift = {};
      if (stepData?.is_day_shift && stepData?.is_night_shift) {
        shift = { name: "Full Time Drivers", code: "full", disabled: false };
      } else if (stepData?.is_day_shift) {
        shift = { name: "Day Shift Drivers", code: "day", disabled: false };
      } else if (stepData?.is_night_shift) {
        shift = { name: "Night Shift Drivers", code: "night", disabled: false };
      }

      formik.setFieldValue([variable?.field_07.id], shift, true);
      if (stepData?.payments == "deposit_paid") {
        formik.setFieldValue([variable?.field_08.id], "Deposit Paid", true);
        formik.setFieldValue(
          [variable?.field_09.id],
          stepData?.deposit_amount_paid || 0,
          true
        );
      } else {
        formik.setFieldValue([variable?.field_08.id], "", true);
      }
      formik.setFieldValue(
        [variable?.field_10.id],
        stepData?.[variable?.field_10.id] || 0,
        true
      );

      formik.setFieldValue(
        [variable?.field_11.id],
        stepData?.[variable?.field_11.id] || 0,
        true
      );

      formik.setFieldValue(
        [variable?.field_12.id],
        stepData?.[variable?.field_12.id] || 0,
        true
      );


      var leaseTypeOption = leaseTypeVariable.options
      if (stepInfoData?.lease_case_details?.vehicle_availability === "full") {
        leaseTypeOption = allLeaseOptions;

      } else {
        leaseTypeOption = shiftLeaseOptions
      }
      setLeaseTypeVariable((prev) => ({
        ...prev,
        options: leaseTypeOption,
      }));

    }
  }, [stepInfoData]);

  useEffect(() => {
    const total_weeks = formik.values[variable.field_03.id];
    const lease_start_date = formik.values[variable.field_04.id];
    const calculatedEndDate = calculateEndDate(lease_start_date, total_weeks);

    formik.setFieldValue(
      [variable.field_05?.id],
      calculatedEndDate ? new Date(calculatedEndDate.valueOf()) : ""
    );
  }, [formik.values.total_weeks, formik.values.lease_start_date]);

  useEffect(() => {
    if (formik.values.lease_type?.code === "shift-lease") {

      var option = selectShiftVariable.options
      if (currentStepData?.lease_case_details?.vehicle_availability === "full" || currentStepData?.lease_case_details?.vehicle_availability === "day") {
        formik.setFieldValue("is_day_night_shift", { name: "Day Shift Drivers", code: "day", disabled: false });
        option = fullShiftOption;
        if (currentStepData?.lease_case_details?.vehicle_availability === "day") {
          option = dayShiftOption;
        }
      } else {
        option = nightShiftOption;
        formik.setFieldValue("is_day_night_shift", { name: "Night Shift Drivers", code: "night", disabled: false });
      }
      setSelectShiftVariable((prev) => ({
        ...prev,
        options: option,
      }));
    } else if (formik.values.lease_type?.code === "long-term") {
      formik.setFieldValue("is_day_night_shift", { name: "Full Time Drivers", code: "full", disabled: false });
    } else {
      formik.setFieldValue("is_day_night_shift", {
        name: "Full Time Drivers",
        code: "full",
        disabled: false,
      });
    }

  }, [formik.values.lease_type])

  return (
    <div className="w-100 h-100">
      <div className="topic-txt d-flex align-items-center gap-2">
        <Img name="lease" className="icon-black"></Img>Enter Lease Details
      </div>
      <div className="d-flex align-items-center gap-5 py-4 ">
        <BCaseCard
          label="Medallion No"
          value={currentStepData?.lease_case_details?.medallion_number}
        />
        <BCaseCard
          label="Medallion Owner"
          value={currentStepData?.lease_case_details?.medallion_owner}
        />
        <BCaseCard
          label="Vehicle VIN No"
          value={currentStepData?.lease_case_details?.vehicle_vin}
        />
        <BCaseCard
          label="Vehicle"
          value={(currentStepData?.lease_case_details?.make || "") + " " +
            (currentStepData?.lease_case_details?.model || "") + " " +
            (currentStepData?.lease_case_details?.year || "-")}
        />
        <BCaseCard
          label="Vehicle Plate No"
          value={currentStepData?.lease_case_details?.plate_number}
        />
        <BCaseCard
          label="Vehicle Type"
          value={currentStepData?.lease_case_details?.vehicle_type.replace("Wav", "WAV")}
        />
      </div>
      <form
        action=""
        className="common-form d-flex flex-column gap-5"
        onSubmit={formik.handleSubmit}
      >
        <div className="form-section">
          <div className="form-body">
            <div
              className="d-flex align-items-center flex-wrap form-grid-1 w-80 p-2"
              style={{ rowGap: "4rem", gap: "4rem 1rem" }}
            >
              <div className="w-100-3">
                <BInputText
                  variable={variable.field_01}
                  formik={formik}
                  isDisable={true}
                ></BInputText>
              </div>
              <div className="w-100-3">
                <BSelect variable={leaseTypeVariable} formik={formik}></BSelect>
              </div>
              <div className="w-100-3">
                <BInputNumber
                  variable={variable.field_03}
                  formik={formik}
                ></BInputNumber>
              </div>
              <div className="w-100-3">
                <BCalendar
                  variable={variable.field_04}
                  formik={formik}
                ></BCalendar>
              </div>
              <div className="w-100-3">
                <BCalendar
                  variable={variable.field_05}
                  formik={formik}
                ></BCalendar>
              </div>
              <div className="w-100-3">
                <BRadio
                  variable={variable.field_06}
                  formik={formik}
                  isDisable={true}
                ></BRadio>
              </div>
              <div className="w-100-3">
                <BSelect variable={selectShiftVariable} formik={formik} isDisable={formik.values.lease_type?.code === "shift-lease" ? false : true} ></BSelect>
              </div>
              <div className="w-100-3">
                <BCaseCard label="Repairs" value={repairs()}></BCaseCard>
              </div>
            </div>
          </div>
        </div>
        <div className="w-100 position-sticky bottom-0 py-3 bg-white">
          <Button
            disabled={
              !hasAccess ||
              !formik.isValid ||
              !formik.dirty ||
              caseData?.case_info?.case_status === "Closed"
            }
            label="Submit Lease Details"
            data-testid="submit-vehicle-details"
            type="submit"
            severity="warning"
            className="border-radius-0 primary-btn "
          />
        </div>
      </form>
    </div>
  );
};

export default EnterLease;
