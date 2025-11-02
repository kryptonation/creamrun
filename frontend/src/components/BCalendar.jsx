import { Calendar } from "primereact/calendar";
import { FloatLabel } from "primereact/floatlabel";
import React from "react";
import Img from "./Img";

const BCalendar = ({
  variable,
  formik,
  isRequire,
  isDisable,
  minDate,
  maxDate,
  viewDate, // Add viewDate prop
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
          dateFormat={variable?.dateFormat || "mm/dd/yy"}
          onBlur={formik.handleBlur}
          value={formik.values[variable.id]}
          minDate={minDate || variable?.minDate}
          maxDate={maxDate || variable?.maxDate}
          viewDate={viewDate || variable?.viewDate}
          className={`rounded-0 border-0 ps-0 bg-transparent calendar-field w-100`}
          showIcon
          showButtonBar
          readOnlyInput
          icon={() => (
            <span data-testid={`${variable.id}-cal-icon`}>
              <Img name="calendar" />
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

export default BCalendar;
