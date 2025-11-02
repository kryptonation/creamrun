import { BreadCrumb } from "primereact/breadcrumb";
import { Link } from "react-router-dom";
import { Formik } from "formik";
import { Button } from "primereact/button";
import { useFormik } from "formik";
import BInputText from "../../../components/BInputText";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BCalendar from "../../../components/BCalendar";
import { manageLedgerEntry as variable } from "../../../utils/variables";

const EditLedgerEntry = () => {
  const params = useParams();
  console.log(params);

  const location = useLocation();
  console.log(location.state);

  const navigate = useNavigate();

  const items = [
    {
      template: () => (
        <Link to="/" className="font-semibold text-grey">
          Payments
        </Link>
      ),
    },
    {
      template: () => (
        <Link to="/manage-ledger-entry" className="font-semibold text-grey">
          Manage Ledger Entry
        </Link>
      ),
    },
    {
      template: () => (
        <Link to="/manage-ledger-entry" className="font-semibold text-black">
          {params.driverId}
        </Link>
      ),
    },
  ];

  const formik = useFormik({
    initialValues: {
      [variable.field_03.id]: variable.field_03.value,
      [variable.field_04.id]: variable.field_04.value,
      [variable.field_05.id]: variable.field_05.value,
      [variable.field_06.id]: variable.field_06.value,
      [variable.field_07.id]: variable.field_07.value,
      [variable.field_08.id]: variable.field_08.value,
      [variable.field_09.id]: variable.field_09.value,
      [variable.field_10.id]: variable.field_10.value,
      [variable.field_11.id]: variable.field_11.value,
    },
    onSubmit: (values) => {
      // const formattedValues = {
      //   ...values,
      //   [variable.field_10.id]: yearMonthDate(values[variable.field_10.id]),
      // };
      console.log("Form submitted with values:", values);
      navigate(
        `/manage-ledger-entry/view-ledger/${location.state?.driver_id}`,
        {
          state: values,
        }
      );
    },
  });
  useEffect(() => {
    formik.setFieldValue(variable.field_03.id, location.state?.driver_id, true);
    formik.setFieldValue(
      variable.field_04.id,
      location.state?.medallion_number,
      true
    );
    formik.setFieldValue(variable.field_05.id, location.state?.vin, true);
    formik.setFieldValue(variable.field_06.id, location.state?.amount, true);
    formik.setFieldValue(
      variable.field_07.id,
      location.state?.transaction_type,
      true
    );
    formik.setFieldValue(
      variable.field_08.id,
      location.state?.source_type,
      true
    );
    formik.setFieldValue(variable.field_09.id, location.state?.source_id, true);
    formik.setFieldValue(
      variable.field_10.id,
      location.state?.created_on ? new Date(location.state?.created_on) : "",
      true
    );
    formik.setFieldValue(
      variable.field_11.id,
      location.state?.description,
      true
    );
  }, []);

  return (
    <div
      className="common-layout w-100 h-100 d-flex flex-column gap-4"
      onSubmit={formik.handleSubmit}
    >
      <div>
        <BreadCrumb
          model={items}
          separatorIcon="/"
          className="bg-transparent p-0"
          pt={{ menu: "p-0" }}
        />
        <div className="d-flex align-items-center justify-content-between w-100">
          <div>
            <p className="topic-txt">Edit</p>
          </div>
        </div>
      </div>
      <form className="common-form d-flex flex-column gap-5">
        <div className="form-section">
          <div className="form-body">
            <div className="d-flex flex-wrap column-gap-5 p-3 w-100">
              <div className="col-md-3 mb-5">
                <BInputText
                  variable={variable.field_03}
                  formik={formik}
                ></BInputText>
              </div>
              <div className="col-md-3 mb-5 ">
                <BInputText
                  variable={variable.field_04}
                  formik={formik}
                ></BInputText>
              </div>
              <div className="col-md-3 mb-5 ">
                <BInputText
                  variable={variable.field_05}
                  formik={formik}
                ></BInputText>
              </div>
              <div className="col-md-3 mb-5 ">
                <BInputText
                  variable={variable.field_06}
                  formik={formik}
                ></BInputText>
              </div>
              <div className="col-md-3 mb-5 ">
                <BInputText
                  variable={variable.field_07}
                  formik={formik}
                ></BInputText>
              </div>
              <div className="col-md-3 mb-5 ">
                <BInputText
                  variable={variable.field_08}
                  formik={formik}
                ></BInputText>
              </div>
              <div className="col-md-3 mb-5 ">
                <BInputText
                  variable={variable.field_09}
                  formik={formik}
                ></BInputText>
              </div>
              <div className="col-md-3 mb-5 ">
                {/* <BInputText
                  variable={variable.field_10}
                  formik={formik}
                ></BInputText> */}
                <BCalendar
                  variable={variable.field_10}
                  formik={formik}
                  isRequire={false}
                ></BCalendar>
              </div>
              <div className="col-12">
                <BInputText
                  variable={variable.field_11}
                  formik={formik}
                ></BInputText>
              </div>
            </div>
          </div>
        </div>
        <div className="w-100 position-sticky bottom-0 py-3 bg-white">
          <Button
            label="Save Changes"
            type="submit"
            data-testid="submit-btn"
            severity="warning"
            className="border-radius-0 primary-btn"
          />
        </div>
      </form>
    </div>
  );
};
export default EditLedgerEntry;
