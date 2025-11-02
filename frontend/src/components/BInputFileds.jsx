import { InputText } from "primereact/inputtext";
import BCalendar from "./BCalendar";
import BSelect from "./BSelect";
import { FloatLabel } from "primereact/floatlabel";
import BUploadInput from "./BUploadInput";
import BRadio from "./BRadio";
import BCheckbox from "./BCheckbox";
import BTimePicker from "./BTimePicker";
import SwitchWithLabel from "./SwitchWithLabel";
import BInputFileView from "./BInputFileView";
import BInputFileViewSSN from "./BInputFileViewSSN";
import { useState } from "react";

const BInputFields = ({
  variable,
  formik,
  document_type = "",
  apiData = "",
  object_id = "",
  badge_value = null,
  object_type = "medallion",
}) => {
  const className = `b-input-fields ${variable.size}`;
  const [isFocused, setIsFocused] = useState(false);

  // Phone number formatting function
  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, ""); // keep only digits
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
    return (
      fieldId === "Phone1" ||
      fieldId === "Phone2" ||
      fieldId === "contactNumber" ||
      fieldId === "contactNumberAddtional" ||
      fieldId.toLowerCase().includes("phone") ||
      fieldId.toLowerCase().includes("contact")
    );
  };
  if (variable.inputType === "SELECT") {
    return (
      <div className={className}>
        <BSelect
          variable={variable}
          formik={formik}
          isRequire={variable.isRequire}
        ></BSelect>
      </div>
    );
  } else if (variable.inputType === "CALENDAR") {
    return (
      <div className={className}>
        <BCalendar
          variable={variable}
          formik={formik}
          isRequire={variable.isRequire}
        ></BCalendar>
      </div>
    );
  } else if (variable.inputType === "TIME") {
    return (
      <div className={className}>
        <BTimePicker
          variable={variable}
          formik={formik}
          isRequire={variable.isRequire}
        ></BTimePicker>
      </div>
    );
  } else if (variable.inputType === "UPLOAD") {
    return (
      <div className={className}>
        <BUploadInput
          variable={variable}
          formik={formik}
          isRequire={variable.isRequire}
          iconName="ic_upload"
          document_type={document_type}
          apiData={apiData}
          object_id={object_id}
          badge_value={badge_value}
          object_type={object_type}
        ></BUploadInput>
      </div>
    );
  } else if (variable.inputType === "VIEW_FILE") {
    return (
      <div className={className}>
        <BInputFileView
          variable={variable}
          formik={formik}
          isRequire={variable.isRequire}
          iconName="ic_upload"
          document_type={document_type}
          apiData={apiData}
          object_id={object_id}
          badge_value={badge_value}
          object_type={object_type}
        ></BInputFileView>
      </div>
    );
  } else if (variable.inputType === "VIEW_FILE_SSN") {
    return (
      <div className={className}>
        <BInputFileViewSSN
          variable={variable}
          formik={formik}
          isRequire={variable.isRequire}
          iconName="ic_upload"
          document_type={document_type}
          apiData={apiData}
          object_id={object_id}
          badge_value={badge_value}
          object_type={object_type}
        ></BInputFileViewSSN>
      </div>
    );
  } else if (variable.inputType === "RADIO") {
    return (
      <div className={className}>
        <BRadio variable={variable} formik={formik} isRequire={false}></BRadio>
      </div>
    );
  } else if (variable.inputType === "CHECK") {
    return (
      <div className={className}>
        <BCheckbox
          variable={variable}
          formik={formik}
          isRequire={false}
        ></BCheckbox>
      </div>
    );
  } else if (variable.inputType === "SWITCH") {
    return (
      <div className={className}>
        <SwitchWithLabel
          variable={variable}
          formik={formik}
          isRequire={variable.isRequire}
        />
      </div>
    );
  } else if (variable.inputType === "FORMATTED_SSN") {
    const value = formik.values[variable.id];
    // Mask SSN except last 4 digits
    const maskSSN = (val) => {
      if (!val) return "";
      const cleaned = val.replace(/\D/g, "");
      if (cleaned.length <= 4) return cleaned;
      return "XXX-XX-" + cleaned.slice(-4);
    };

    // format SSN (XXX-XX-XXXX)
    const formatSSN = (value) => {
      const cleaned = value.replace(/\D/g, ""); // keep only digits
      if (cleaned.length <= 3) return cleaned;
      if (cleaned.length <= 5)
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(
        5,
        9
      )}`;
    };
    const displayValue = isFocused ? value || "" : maskSSN(value);
    return (
      <div
        className={`${className} position-relative ${
          formik.touched[variable.id] && formik.errors[variable.id]
            ? "text-danger-con"
            : ""
        }`}
      >
        <FloatLabel>
          <InputText
            id={variable.id}
            onFocus={() => setIsFocused(true)}
            onBlur={(e) => {
              setIsFocused(false);
              formik.handleBlur(e);
            }}
            onChange={(e) => {
              let value = e.target.value;
              value = formatSSN(value);
              formik.setFieldValue(variable.id, value);
            }}
            value={displayValue}
            maxLength={11}
            className="rounded-0 border-0 ps-0 bg-transparent text-field w-100"
          />
          <label htmlFor={variable.id}>
            {variable.label}{" "}
            {variable.isRequire && <span className="require-star">*</span>}
          </label>
        </FloatLabel>
        {formik.touched[variable.id] && formik.errors[variable.id] ? (
          <div className="error-msg">{formik.errors[variable.id]}</div>
        ) : null}
      </div>
    );

    // return (
    //   <div
    //     className={`${className} position-relative ${
    //       formik.touched[variable.id] && formik.errors[variable.id]
    //         ? "text-danger-con"
    //         : ""
    //     }`}
    //   >
    //     <FloatLabel>
    //       <InputText
    //         id={variable.id}
    //         onChange={(e) => {
    //           let value = e.target.value;
    //           if (variable.id.toLowerCase().includes("ssn")) {
    //             value = formatSSN(value); // mask SSN
    //           }
    //           formik.setFieldValue(variable.id, value);
    //         }}
    //         onBlur={formik.handleBlur}
    //         value={formik.values[variable.id]}
    //         maxLength={
    //           variable.id.toLowerCase().includes("ssn") ? 11 : undefined
    //         }
    //         className="rounded-0 border-0 ps-0 bg-transparent text-field w-100"
    //       />
    //       <label htmlFor={variable.id}>
    //         {variable.label}{" "}
    //         {variable.isRequire && <span className="require-star">*</span>}
    //       </label>
    //     </FloatLabel>
    //     {formik.touched[variable.id] && formik.errors[variable.id] ? (
    //       <div className="error-msg">{formik.errors[variable.id]}</div>
    //     ) : null}
    //   </div>
    // );
  } else {
    return (
      <div
        className={`${className} position-relative ${
          formik.touched[variable.id] && formik.errors[variable.id]
            ? "text-danger-con"
            : ""
        }`}
      >
        <FloatLabel>
          <InputText
            id={variable.id}
            // onChange={formik.handleChange}
            onChange={(e) => {
              let value = e.target.value;
              // Apply phone formatting for phone fields
              if (isPhoneField(variable.id)) {
                value = formatPhoneNumber(value);
              }
              formik.setFieldValue(variable.id, value);
            }}
            onBlur={formik.handleBlur}
            value={formik.values[variable.id]}
            className={`rounded-0 border-0 ps-0 bg-transparent text-field w-100`}
          />
          <label htmlFor={variable.id}>
            {variable.label}{" "}
            {variable.isRequire && <span className="require-star">*</span>}
          </label>
        </FloatLabel>
        {formik.touched[variable.id] && formik.errors[variable.id] ? (
          <div className="error-msg">{formik.errors[variable.id]}</div>
        ) : null}
      </div>
    );
  }
};

export default BInputFields;
