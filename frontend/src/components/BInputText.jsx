import { FloatLabel } from "primereact/floatlabel";
import { InputText } from "primereact/inputtext";
import { getIn } from "formik"; //  1. Import getIn
import { Tooltip } from "primereact/tooltip";
import Img from "./Img";
import { Button } from "primereact/button";
import { gridToolTipOptins } from "../utils/tooltipUtils";

const BInputText = ({
  variable,
  formik,
  isRequire = false,
  isDisable = false,
  onBlur,
}) => {
  //  2. Get nested value, touched status, and error using getIn
  const value = getIn(formik.values, variable.id);
  const touched = getIn(formik.touched, variable.id);
  const error = getIn(formik.errors, variable.id);

  // Phone number formatting function
  const formatPhoneNumber = (val) => {
    if (!val) return "";
    const cleaned = val.replace(/\D/g, ""); // keep only digits
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6)
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(
      6,
      10
    )}`;
  };

  // Check if field is a phone number field
  const isPhoneField = (fieldId) => {
    const lowercasedId = fieldId.toLowerCase();
    return (
      lowercasedId.includes("phone") || lowercasedId.includes("contactnumber") // More specific check for 'contactNumber'
    );
  };

  // const tooltipTargetClass = `tooltip-icon-${variable.id}`;

  return (
    <div
      className={`w-100 position-relative ${
        touched && error ? "text-danger-con" : ""
      }`}
    >
      <FloatLabel>
        <InputText
          id={variable.id}
          name={variable.id} // Add name prop for formik.handleBlur
          type={variable.type || "text"}
          data-testid={variable.id}
          disabled={isDisable}
          onChange={(e) => {
            let val = e.target.value;
            // Apply phone formatting for phone fields
            if (isPhoneField(variable.id)) {
              val = formatPhoneNumber(val);
            }
            formik.setFieldValue(variable.id, val);
          }}
          onBlur={onBlur || formik.handleBlur}
          value={value || ""} //  3. Use the value from getIn
          keyfilter={variable.keyfilter}
          className={`rounded-0 border-0 ps-0 bg-transparent text-field w-100`}
        />
        <label htmlFor={variable.id} data-testid={`${variable.id}-label`}>
          {variable.label}{" "}
          {(isRequire || variable.isRequire) && (
            <span className="require-star">*</span>
          )}
        </label>
      </FloatLabel>
      {/* {variable.tooltipText && (
        <>
          <Button
            {...gridToolTipOptins(variable.tooltipText)}
            data-testid="info-icon"
            icon={() => <Img name="info_icon"></Img>}
          ></Button>
        </>
      )} */}
      {touched && error ? (
        <div className="error-msg" data-testid={`${variable.id}-error-msg`}>
          {error}
        </div>
      ) : null}
    </div>
  );
};

export default BInputText;
