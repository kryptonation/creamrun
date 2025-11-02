import { Calendar } from "primereact/calendar";
import { FloatLabel } from "primereact/floatlabel";
import React from "react";
import Img from "./Img";

const BTimeInput = ({
  variable,
  formik,
  isRequire,
  isDisable,
  minDate,
  maxDate,
}) => {
  return (
    <div
      className={`w-100 position-relative ${
        formik.touched[variable.id] && formik.errors[variable.id]
          ? "text-danger-con"
          : ""
      }`}
    >
      <FloatLabel>
        <Calendar
          inputId={variable.id}
          data-testid={variable.id}
          disabled={variable.isDisable || isDisable}
          name={variable.id}
          onChange={formik.handleChange}
          view={variable?.view || "date"}
          onBlur={formik.handleBlur}
          value={formik.values[variable.id]}
          className={`rounded-0 border-0 ps-0 bg-transparent calendar-field w-100`}
          showIcon
          readOnlyInput
          timeOnly
          icon={() => (
            <span data-testid={`${variable.id}-clock-icon`}>
              <Img name="clock" />
            </span>
          )}
        />
        <label htmlFor={variable.id} data-testid={`${variable.id}-label`}>
          {variable.label}{" "}
          {(variable.isRequire || isRequire) && (
            <span className="require-star">*</span>
          )}
        </label>
      </FloatLabel>
      {formik.touched[variable.id] && formik.errors[variable.id] ? (
        <div className="error-msg" data-testid={`${variable.id}-error-msg`}>
          {formik.errors[variable.id]}
        </div>
      ) : null}
    </div>
  );
};

export default BTimeInput;
