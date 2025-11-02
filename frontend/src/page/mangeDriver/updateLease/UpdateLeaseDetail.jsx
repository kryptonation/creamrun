import React, { useEffect } from 'react'
import BCaseCard from '../../../components/BCaseCard'
import { Button } from 'primereact/button'
import { useFormik } from 'formik'
import { enterLeaseDetails as variable } from "../../../utils/variables.js";
import BSelect from '../../../components/BSelect.jsx'
import BCalendar from '../../../components/BCalendar.jsx'
import BRadio from '../../../components/BRadio.jsx'
import BCheckbox from '../../../components/BCheckbox.jsx'
import BInputNumber from '../../../components/BInputNumber.jsx'
import { medallionApi, useGetStepInfoQuery, useMoveCaseDetailMutation, useProcessCaseDeatilMutation } from '../../../redux/api/medallionApi.js'
import BInputText from '../../../components/BInputText.jsx'
import { calculateEndDate, yearMonthDate } from '../../../utils/dateConverter.js'
import { getCurrentStep } from '../../../utils/caseUtils.js'
import { useDispatch } from 'react-redux'
import { Checkbox } from 'primereact/checkbox';

const UpdateLeaseDetail = ({ caseId, caseData, reload, currentStepId, hasAccess }) => {
  const [processFlow, { isSuccess: isProccessDataSuccess }] = useProcessCaseDeatilMutation();
  const [moveCase, { isSuccess: isMoveDataSuccess }] = useMoveCaseDetailMutation();
  const { data: stepInfoData, isSuccess } = useGetStepInfoQuery({ caseNo: caseId, step_no: currentStepId }, { skip: !currentStepId || !caseId });
  useEffect(() => {
    if (isMoveDataSuccess) {
      reload();
    }
  }, [isMoveDataSuccess])

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
    },
    validateOnChange: true,
    validate: (values) => {
      const errors = {};
      if (!values[variable?.field_02.id]) {
        errors[variable?.field_02.id] = `${variable?.field_02.label} is required`;
      }
      if (!values[variable?.field_03.id]) {
        errors[variable?.field_03.id] = `${variable?.field_03.label} is required`;
      }
      if (!values[variable?.field_04.id]) {
        errors[variable?.field_04.id] = `${variable?.field_04.label} is required`;
      }
      if (!values[variable?.field_06.id]) {
        errors[variable?.field_06.id] = `${variable?.field_06.label} is required`;
      }
      return errors;
    },
    onSubmit: (values) => {

      const data = {
        ...values,
        lease_type: values[variable?.field_02?.id]?.code,
        is_day_shift: values[variable?.field_07?.id]?.includes('day'),
        is_night_shift: values[variable?.field_07?.id]?.includes('night'),
        lease_start_date: yearMonthDate(values[variable?.field_04?.id]),
        lease_end_date: yearMonthDate(values[variable?.field_05?.id]),
        deposit_amount_paid: values[variable?.field_08?.id] ? values[variable?.field_09?.id] : 0,
        payments: values[variable?.field_08?.id] ? "deposit_paid" : ""
      };

      processFlow({
        params: caseId, data: {
          step_id: currentStepId,
          data: data
        }
      })
    },
  });

  const dispatch = useDispatch();

  useEffect(() => {
    if (isProccessDataSuccess) {
      dispatch(medallionApi.util.invalidateTags(['caseStep']))
    }
    if (isProccessDataSuccess && caseData && caseData.case_info.case_status !== "Closed"
      && getCurrentStep(caseData.steps).step_id === currentStepId) {
      moveCase({ params: caseId })
    }
  }, [isProccessDataSuccess]);

  const repairs = () => {
    const data = formik?.values[variable.field_02.id]?.code
    if (data == "dov") {
      return "Drivers"
    }
    if (data == "long-term" || data == "short-term") {
      return "BATM"
    }
    return "Not Applicable"
  }

  useEffect(() => {
    formik.setFieldValue(variable?.field_03.id, variable?.field_03.value, true);
  }, [])

  useEffect(() => {
    if (isSuccess) {
      const stepData = stepInfoData?.lease_info;
      const stepDataLease = stepInfoData?.lease_case_details;
      const leaseType = variable?.field_02.options.filter(item => item.code === stepDataLease?.[variable?.field_02.id])?.[0];
      // const dayType = variable?.field_06.options.filter(item => item.code === stepData?.[variable?.field_06.id])?.[0];
      let shift = []
      if (stepData?.is_day_shift) {
        shift = [...shift, "day"]
      }
      else {
        shift = [...shift, "night"]
      }

      console.log(stepData?.[variable?.field_09.id])
      formik.setFieldValue([variable?.field_01.id], stepData?.[variable?.field_01.id] || "", true);
      formik.setFieldValue([variable?.field_02.id], leaseType || "", true);
      formik.setFieldValue([variable?.field_03.id], stepData?.[variable?.field_03.id] || variable?.field_03.value, true);
      formik.setFieldValue([variable?.field_04.id], stepData?.[variable?.field_04?.id] ? new Date(stepData?.[variable?.field_04?.id]) : "", true);
      formik.setFieldValue([variable?.field_05.id], stepData?.[variable?.field_05?.id] ? new Date(stepData?.[variable?.field_05?.id]) : "", true);
      formik.setFieldValue([variable?.field_06.id], stepData?.[variable?.field_06.id] === true ? true : false, true);
      formik.setFieldValue([variable?.field_07.id], shift, true);
      if (stepData?.payments == "deposit_paid") {
        formik.setFieldValue([variable?.field_08.id], "Deposit Paid", true);
        formik.setFieldValue([variable?.field_09.id], stepData?.[variable?.field_09.id] || 0, true);
      } else {
        formik.setFieldValue([variable?.field_08.id], "", true);
      }
      formik.setFieldValue([variable?.field_10.id], stepData?.[variable?.field_10.id] || 0, true);
    }
  }, [isSuccess]);

  useEffect(() => {
    const total_weeks = formik.values[variable.field_03.id];
    const lease_start_date = formik.values[variable.field_04.id];
    const calculatedEndDate = calculateEndDate(lease_start_date, total_weeks);

    formik.setFieldValue([variable.field_05?.id], calculatedEndDate ? new Date(calculatedEndDate.valueOf()) : '');
  }, [formik.values.total_weeks, formik.values.lease_start_date]);

  return (
    <div className='w-100 h-100'>
      <form
        action=""
        className="common-form d-flex flex-column gap-5"
        onSubmit={formik.handleSubmit}
      >
        <div className="form-section">
          <div className="form-body">
            <div className="d-flex align-items-center flex-wrap form-grid-1 w-80">
              <div className='w-100-3'>
                <BInputText variable={variable.field_01} formik={formik}></BInputText>
              </div>
              <div className='w-100-3'>
                <BSelect variable={variable.field_02} formik={formik}></BSelect>
              </div>
              <div className='w-100-3'>
                <BInputNumber variable={variable.field_03} formik={formik}></BInputNumber>
              </div>
              <div className='w-100-3'>
                <BCalendar variable={variable.field_04} formik={formik}></BCalendar>
              </div>
              <div className='w-100-3'>
                <BCalendar variable={variable.field_05} formik={formik}></BCalendar>
              </div>
              <div className='w-100-3'>
                <BRadio variable={variable.field_06} formik={formik}></BRadio>
              </div>
              <div className='w-100-3'>
                <BCheckbox variable={variable.field_07} formik={formik}></BCheckbox>
              </div>
              <div className='w-100-3'>
                <div className="d-flex align-items-center gap-2">
                  <Checkbox
                    inputId={`${variable.id}_depositPaid`}
                    data-testid={`${variable.id}_depositPaid`}
                    name={variable.id}
                    onChange={(e) => {
                      formik.setFieldValue(
                        variable.field_08.id,
                        e.checked ? variable.field_08.label : ""
                      );
                    }}
                    checked={formik.values[variable.field_08.id] === variable.field_08.label}
                  />
                  <label
                    htmlFor={`${variable.id}_depositPaid`}
                    data-testid={`${variable.id}_depositPaid`}
                    className="ml-2 checkbox-label"
                  >
                    {variable.field_08.label}
                  </label>
                </div>
                {/* <BCheckbox variable={variable.field_08} formik={formik}></BCheckbox> */}
                {/* <BRadio variable={{...variable.field_08,disabled:DISABLEDAYNIGHTSHIFT.includes(formik.values[variable.field_02.id].code)}} formik={formik}></BRadio> */}
              </div>
              <div className='w-100-3'>
                {formik.values[variable.field_08.id] &&
                  <BInputNumber variable={variable.field_09} formik={formik}></BInputNumber>
                }
              </div>

              <div className='w-100-3'>
                <BCaseCard label="Repairs" value={repairs()}></BCaseCard>
              </div>
              <div className='w-100-3'>
                <BInputNumber variable={variable.field_10} formik={formik}></BInputNumber>
              </div>
            </div>
          </div>
        </div>
        <div className="w-100 position-sticky bottom-0 py-3 bg-white">
          <Button
            disabled={!hasAccess}
            label="Submit Vehicle Details"
            type="submit"
            severity="warning"
            className="border-radius-0 primary-btn "
          />
        </div>
      </form>
    </div>
  )
}

export default UpdateLeaseDetail