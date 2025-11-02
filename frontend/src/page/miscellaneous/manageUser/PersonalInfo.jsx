import React from 'react'
import { Link } from 'react-router-dom'
import BBreadCrumb from '../../../components/BBreadCrumb';
import { Button } from 'primereact/button';
import { useFormik } from 'formik';
import BInputText from '../../../components/BInputText';
import { personalInfo as variable } from "../../../utils/variables";
import BCalendar from '../../../components/BCalendar';
import BPassword from '../../../components/BPassword';
import BRadio from '../../../components/BRadio';
import BSelect from '../../../components/BSelect';
import profile from '../../../assets/image.png';

const PersonalInfo = () => {
  const items = [
    { label: 'Demo', template: () => <Link to="/" className="font-semibold text-grey">Home</Link> },
    { label: 'Demo', template: () => <Link to="/miscellaneous" className="font-semibold text-grey">Miscellaneous</Link> },
    { label: 'Demo', template: () => <Link to={`/miscellaneous/manage-user-role`} className="font-semibold text-grey">Manage User Roles</Link> },
    { label: 'Demo', template: () => <Link to={`/manage-user-role`} className="font-semibold text-black">Aklema</Link> },
  ];

  const formik = useFormik({
    initialValues: {
      // [variable?.field_01.id]: "",
      // [variable?.field_02.id]: "",
      // [variable?.field_03.id]: "",
      // [variable?.field_04.id]: "",
      // [variable?.field_05.id]: "",
      // [variable?.field_06.id]: "",
      // [variable?.field_07.id]: variable?.field_07.value,
      // [variable?.field_08.id]: "",
      // [variable?.field_09.id]: variable?.field_09.value,
      // [variable?.field_10.id]: "",
    },
    validateOnChange: true,
    // validate: (values) => {
    //   const errors = {};
    //   if (!values[variable?.field_02.id]) {
    //     errors[variable?.field_02.id] = `${variable?.field_02.label} is required`;
    //   }
    //   if (!values[variable?.field_03.id]) {
    //     errors[variable?.field_03.id] = `${variable?.field_03.label} is required`;
    //   }
    //   if (!values[variable?.field_04.id]) {
    //     errors[variable?.field_04.id] = `${variable?.field_04.label} is required`;
    //   }
    //   if (!values[variable?.field_06.id]) {
    //     errors[variable?.field_06.id] = `${variable?.field_06.label} is required`;
    //   }
    //   return errors;
    // },
    // onSubmit: (values) => {
    //   processFlow({
    //     params: caseId, data: {
    //       step_id: currentStepId,
    //       data: {
    //         ...values,
    //         lease_type: values[variable?.field_02?.id]?.code,
    //         is_day_night_shift: values[variable?.field_08?.id][0] === "Yes" ? true : false,
    //         lease_start_date: yearMonthDate(values[variable?.field_04?.id]),
    //         lease_end_date: yearMonthDate(values[variable?.field_05?.id]),
    //         pay_day: values[variable?.field_06?.id]?.code,
    //       }
    //     }
    //   })
    // },
  });
  return (
    <div className='common-layout w-100 h-100 d-flex flex-column gap-4'>
      <div>
        <BBreadCrumb breadcrumbItems={items} separator={"/"} />
        <p className="topic-txt">Management</p>
      </div>
      <div className='d-flex align-items-center justify-content-between w-100'>
        <p className='regular-semibold-text'>Personal Information</p>
        <Button label='Delete Account' text className='text-red'></Button>
      </div>
      <form
        action=""
        className="common-form d-flex flex-column gap-5"
        onSubmit={formik.handleSubmit}
      >
        <div className="form-section">
          <div className="form-body">
            <div className='d-flex flex-column'>
              <img src={profile} className='user-img' />
              <Button label='Change Picture' text className='text-blue w-max-content'></Button>
            </div>
            <div className="d-flex align-items-center flex-wrap form-grid-1 w-80">
              <div className='w-100-3'>
                <BInputText variable={variable.field_01} formik={formik}></BInputText>
              </div>
              <div className='w-100-3'>
                <BInputText variable={variable.field_02} formik={formik}></BInputText>
              </div>
              <div className='w-100-3'>
                <BInputText variable={variable.field_03} formik={formik}></BInputText>
              </div>
              <div className='w-100-3'>
                <BInputText variable={variable.field_04} formik={formik}></BInputText>
              </div>
              <div className='w-100-3'>
                <BInputText variable={variable.field_05} formik={formik}></BInputText>
              </div>
              <div className='w-100-3'>
                <BCalendar variable={variable.field_06} formik={formik}></BCalendar>
              </div>
              <div className='w-100-3'>
                <BPassword variable={variable.field_07} formik={formik}></BPassword>
              </div>
              <div className='w-100-3'>
                <BRadio variable={variable.field_08} formik={formik}></BRadio>
              </div>
            </div>
            <p className='regular-semibold-text pt-3'>Role and Type</p>
            <div className="d-flex align-items-center flex-wrap form-grid-1 w-80">
              <div className='w-100-3'>
                <BSelect variable={variable.field_09} formik={formik}></BSelect>
              </div>
              <div className='w-100-3'>
                <BSelect variable={variable.field_10} formik={formik}></BSelect>
              </div>
            </div>
          </div>
          <div className="w-100 position-sticky bottom-0 py-3 bg-white">
            <Button
              // disabled={!hasAccess}
              label="Save Changes"
              type="submit"
              severity="warning"
              className="border-radius-0 primary-btn "
            />
          </div>
        </div>
      </form>
    </div>
  )
}

export default PersonalInfo