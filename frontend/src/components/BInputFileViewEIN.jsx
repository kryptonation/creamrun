import { FloatLabel } from "primereact/floatlabel";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import BModal from "./BModal";
import Img from "./Img";
import BUpload from "./BUpload";
import { useState } from "react";
import { Badge } from "primereact/badge";
import PdfViewModal from "./PdfViewModal";
import { Button } from "primereact/button";
import { removeUnderScore } from "../utils/utils";

const BInputFileViewEIN = ({
  variable,
  formik,
  isRequire,
  document_type,
  apiData,
  object_id,
  isDisable = false,
  badge_value,
  object_type = "medallion",
}) => {
  const [file, setFile] = useState(null);
  const parts = apiData?.document_name?.split(".");
  const extension = parts?.pop();
  const filename = parts?.join(".");
  const img = extension === "pdf" ? "pdf" : "img";
  const path = apiData?.presigned_url;

  // Function to format EIN (XX-XXXXXXX)
  const formatEIN = (value) => {
    // Remove all non-numeric characters
    const numericValue = value.replace(/\D/g, "");

    // Limit to 9 digits maximum
    const truncatedValue = numericValue.slice(0, 9);

    // Add hyphen after first 2 digits if we have more than 2 digits
    if (truncatedValue.length > 2) {
      return `${truncatedValue.slice(0, 2)}-${truncatedValue.slice(2)}`;
    }

    return truncatedValue;
  };

  // Check if this is an EIN field
  const isEINField =
    variable.id === "EIN" || variable.label?.toLowerCase().includes("ein");

  // Function to handle input change with formatting
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (isEINField) {
      formik.setFieldValue(name, formatEIN(value)); // format + set
    } else {
      formik.setFieldValue(name, value); // always safe
    }
  };

  // Custom onBlur handler to ensure final formatting
  const handleBlur = (e) => {
    if (isEINField) {
      const formattedValue = formatEIN(e.target.value);
      formik.setFieldValue(e.target.name, formattedValue);
    }

    formik.handleBlur(e);
  };

  return (
    <div
      className={`w-100 position-relative upload-filed ${
        formik.touched[variable.id] && formik.errors[variable.id]
          ? "text-danger-con"
          : ""
      }`}
    >
      <FloatLabel>
        {!isDisable ? (
          <div>
            <IconField iconPosition="right">
              <InputText
                id={variable.id}
                name={variable.id} // ✅ must be set
                data-testid={variable.id}
                disabled={isDisable}
                onChange={handleInputChange}
                onBlur={handleBlur}
                value={formik.values[variable.id] || ""}
                className="rounded-0 border-0 ps-0 bg-transparent text-field w-100"
                placeholder={isEINField ? "XX-XXXXXXX" : undefined}
                maxLength={isEINField ? 10 : undefined}
              />
              {apiData?.document_id && apiData?.document_id !== "" ? (
                <InputIcon>
                  <PdfViewModal
                    triggerButton={
                      <Button
                        pt={{ root: { "data-testid": `eye-icon-btn` } }}
                        icon={<Img name="black_ic_eye" />}
                        className="p-button-text p-0"
                        type="button"
                      />
                    }
                    title={removeUnderScore(apiData?.document_type).replace(
                      /\b\w/g,
                      (char) => char.toUpperCase()
                    )}
                    downloadUrl={path}
                    downloadName={filename}
                    extension={extension}
                    previewUrl={path}
                  />
                </InputIcon>
              ) : (
                // <InputIcon>
                //   <Button
                //     pt={{ root: { "data-testid": `disabled-eye-icon-btn` } }}
                //     icon={<Img name="disabled_eye" />}
                //     className="p-button-text p-0"
                //     type="button"
                //     disabled
                //   />
                // </InputIcon>
                <></>
              )}
            </IconField>

            {/* {badge_value !== undefined &&
              badge_value !== null &&
              badge_value > 0 && (
                <Badge
                  className="badge-icon"
                  value={badge_value}
                  severity="warning"
                ></Badge>
              )} */}
          </div>
        ) : (
          <InputText
            id={variable.id}
            name={variable.id} // ✅ must be set
            data-testid={variable.id}
            disabled={isDisable}
            onChange={handleInputChange}
            onBlur={handleBlur}
            value={formik.values[variable.id] || ""}
            className="rounded-0 border-0 ps-0 bg-transparent text-field w-100"
            placeholder={isEINField ? "XX-XXXXXXX" : undefined}
            maxLength={isEINField ? 10 : undefined}
          />
        )}
        <label htmlFor={variable.id}>
          {variable.label}{" "}
          {(variable.isRequire || isRequire) && (
            <span className="require-star">*</span>
          )}
        </label>
      </FloatLabel>
      {formik.touched[variable.id] && formik.errors[variable.id] ? (
        <div className="error-msg">{formik.errors[variable.id]}</div>
      ) : null}
    </div>
  );
};

export default BInputFileViewEIN;
