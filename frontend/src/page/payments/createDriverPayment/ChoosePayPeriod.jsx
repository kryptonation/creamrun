import { Button } from "primereact/button";
import { useFormik } from "formik";
import { choosePayPeriod as variable } from "../../../utils/variables";
import BCalendar from "../../../components/BCalendar";
import BTimePicker from "../../../components/BTimePicker";
import {
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../../redux/api/medallionApi";
import { useLazyGetDriverQuery } from "../../../redux/api/driverApi";
import BAutoCompleteWithApi from "../../../components/BAutoCompleteWithApi";
import {
  timeFormatWithRange,
  yearMonthDate,
} from "../../../utils/dateConverter";
import { useParams } from "react-router-dom";
import { CHOOSE_PAY_PERIOD } from "../../../utils/constants";
import { getCurrenyStepId } from "../../../utils/caseUtils";
import { useEffect } from "react";
import BCheckbox from "../../../components/BCheckbox";

const ChoosePayPeriod = ({
  caseId,
  currentStepId,
  reload,
  caseData,
  hasAccess,
}) => {
  const params = useParams();

  const [processFlow, { isSuccess: isProcessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();

  const formik = useFormik({
    initialValues: {
      [variable.field_02.id]: "",
      [variable.field_03.id]: "",
      [variable.field_04.id]: "",
      [variable.field_05.id]: "",
      [variable.field_06.id]: {},
      [variable.field_07.id]: false,
    },
    validate: (values) => {
      const errors = {};
      if (!values[variable.field_02.id]) {
        errors[variable.field_02.id] = `${variable.field_02.label} is required`;
      }
      if (!values[variable.field_03.id]) {
        errors[variable.field_03.id] = `${variable.field_03.label} is required`;
      }
      if (!values[variable.field_04.id]) {
        errors[variable.field_04.id] = `${variable.field_04.label} is required`;
      }
      if (!values[variable.field_05.id]) {
        errors[variable.field_05.id] = `${variable.field_05.label} is required`;
      }

      return errors;
    },
    onSubmit: (values) => {
      let allDriver=values?.include_all_drivers[0]
      const data = {
        start_date: yearMonthDate(values?.startDate),
        start_time: timeFormatWithRange(values?.startTime),
        end_time: timeFormatWithRange(values?.endTime),
        end_date: yearMonthDate(values?.endDate),
        driver_id: values?.driverId?.code || "",
        include_all_drivers: allDriver
      };
      if(allDriver){
        data.driver_id = "";
      }
      processFlow({
        params: params["caseId"],
        data: {
          step_id: CHOOSE_PAY_PERIOD,
          data,
        },
      });
    },
  });

  useEffect(() => {
    if (
      hasAccess &&
      isProcessDataSuccess &&
      getCurrenyStepId(caseData) === currentStepId
    ) {
      moveCase({ params: caseId });
      // reload();
    }
  }, [isProcessDataSuccess]);

  useEffect(() => {
    if (isMoveDataSuccess) {
      reload();
    }
  }, [isMoveDataSuccess]);

  const driverMapValue = (data) => {
    return data?.items.map((item) => ({
      name: item?.driver_details?.driver_lookup_id.toString(),
      code: item?.driver_details?.driver_lookup_id.toString(),
    }));
  };

  console.log(formik.values);
  

  return (
    <form
      className="common-form d-flex flex-column gap-5"
      onSubmit={formik.handleSubmit}
    >
      <div className="form-section">
        <div className="form-body d-flex align-items-center justify-content-between">
          <div className="choose-pay-period">
            <div className="item2">
              <BCalendar variable={variable.field_02} formik={formik} />
            </div>
            <div className="item3">
              <BTimePicker variable={variable.field_04} formik={formik} />
            </div>
            <div className="item4">
              <BCalendar variable={variable.field_03} formik={formik} />
            </div>
            <div className="item5">
              <BTimePicker variable={variable.field_05} formik={formik} />
            </div>
            <div className="item6 d-flex flex-column gap-2">
              <BAutoCompleteWithApi
                variable={variable.field_06}
                formik={formik}
                actionApi={useLazyGetDriverQuery}
                queryParams="driver_lookup_id"
                optionMap={driverMapValue}
              ></BAutoCompleteWithApi>
               <BCheckbox variable={variable.field_07} formik={formik}></BCheckbox>
            </div>
            <div className="item9"></div>
          </div>
        </div>
      </div>
      <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        <Button
          label="Submit Payperiod Details"
          type="submit"
          data-testid="submit-btn"
          severity="warning"
          className="border-radius-0 primary-btn"
        />
      </div>
    </form>
  );
};

export default ChoosePayPeriod;
