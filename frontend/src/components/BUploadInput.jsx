import { FloatLabel } from "primereact/floatlabel";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import BModal from "./BModal";
import Img from "./Img";
import BUpload from "./BUpload";
import { useState } from "react";
import { Badge } from "primereact/badge";

const BUploadInput = ({
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
              <BModal>
                <BModal.ToggleButton>
                  <InputIcon>
                    <span
                      data-testid={`${variable.id}-icon`}
                      style={{ cursor: "pointer" }}
                    >
                      <Img name="upload"></Img>
                    </span>{" "}
                  </InputIcon>
                </BModal.ToggleButton>
                <BModal.Content>
                  <BUpload
                    data={{ ...apiData }}
                    setFile={setFile}
                    file={file}
                    object_type={object_type}
                    object_id={apiData?.document_object_id || object_id}
                    document_id={0}
                    document_type={document_type}
                  ></BUpload>
                </BModal.Content>
              </BModal>
              <InputText
                id={variable.id}
                data-testid={variable.id}
                disabled={isDisable}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values[variable.id]}
                className={`rounded-0 border-0 ps-0 bg-transparent text-field w-100`}
              />
            </IconField>
            {badge_value !== undefined &&
              badge_value !== null &&
              badge_value > 0 && (
                <Badge
                  className="badge-icon"
                  value={badge_value}
                  severity="warning"
                ></Badge>
              )}
          </div>
        ) : (
          <InputText
            id={variable.id}
            data-testid={variable.id}
            disabled={isDisable}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            value={formik.values[variable.id]}
            className={`rounded-0 border-0 ps-0 bg-transparent text-field w-100`}
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

export default BUploadInput;
