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
import { getIn } from "formik"; // 1. Import getIn

const BInputFileViewSSN = ({
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
  const path = apiData?.presigned_url;

  // Get nested values correctly using getIn
  const value = getIn(formik.values, variable.id);
  const touched = getIn(formik.touched, variable.id);
  const error = getIn(formik.errors, variable.id);
  const [isFocused, setIsFocused] = useState(false);

  // Mask SSN except last 4 digits
  const maskSSN = (val) => {
    if (!val) return "";
    const cleaned = val.replace(/\D/g, "");
    if (cleaned.length <= 4) return cleaned;
    return "XXX-XX-" + cleaned.slice(-4);
  };

  // SSN formatter
  const formatSSN = (val) => {
    if (!val) return "";
    const cleaned = val.replace(/\D/g, ""); // only digits
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 5)
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(
      5,
      9
    )}`;
  };

  const displayValue = isFocused ? value || "" : maskSSN(value);
  //masked ssn logic to show only last 4 digits
  return (
    <div
      className={`w-100 position-relative upload-filed ${
        touched && error ? "text-danger-con" : ""
      }`}
    >
      <FloatLabel>
        {!isDisable ? (
          <div>
            <IconField iconPosition="right">
              <InputText
                id={variable.id}
                data-testid={variable.id}
                name={variable.id}
                disabled={isDisable}
                onFocus={() => setIsFocused(true)}
                onBlur={(e) => {
                  setIsFocused(false);
                  formik.handleBlur(e);
                }}
                onChange={(e) => {
                  const formattedValue = formatSSN(e.target.value);
                  formik.setFieldValue(variable.id, formattedValue);
                }}
                value={displayValue}
                maxLength={11}
                className={`rounded-0 border-0 ps-0 bg-transparent text-field w-100`}
                autoComplete="off"
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
          </div>
        ) : (
          <InputText
            id={variable.id}
            data-testid={variable.id}
            name={variable.id}
            disabled={isDisable}
            onFocus={() => setIsFocused(true)}
            onBlur={(e) => {
              setIsFocused(false);
              formik.handleBlur(e);
            }}
            onChange={(e) => {
              const formattedValue = formatSSN(e.target.value);
              formik.setFieldValue(variable.id, formattedValue);
            }}
            value={displayValue}
            maxLength={11}
            className={`rounded-0 border-0 ps-0 bg-transparent text-field w-100`}
            autoComplete="off"
          />
        )}
        <label htmlFor={variable.id}>
          {variable.label}{" "}
          {(variable.isRequire || isRequire) && (
            <span className="require-star">*</span>
          )}
        </label>
      </FloatLabel>
      {touched && error ? <div className="error-msg">{error}</div> : null}
    </div>
  );

  //unmasked ssn logic to show full ssn
  // return (
  //   <div
  //     className={`w-100 position-relative upload-filed ${
  //       touched && error ? "text-danger-con" : ""
  //     }`}
  //   >
  //     <FloatLabel>
  //       {!isDisable ? (
  //         <div>
  //           <IconField iconPosition="right">
  //             <InputText
  //               id={variable.id}
  //               data-testid={variable.id}
  //               name={variable.id} // Add name prop for formik.handleBlur
  //               disabled={isDisable}
  //               onChange={(e) => {
  //                 //  2. Unconditionally format the value
  //                 const formattedValue = formatSSN(e.target.value);
  //                 formik.setFieldValue(variable.id, formattedValue);
  //               }}
  //               onBlur={formik.handleBlur}
  //               value={value || ""} // Use the value from getIn
  //               maxLength={11}
  //               className={`rounded-0 border-0 ps-0 bg-transparent text-field w-100`}
  //             />
  //             {apiData?.document_id && apiData?.document_id !== "" ? (
  //               <InputIcon>
  //                 <PdfViewModal
  //                   triggerButton={
  //                     <Button
  //                       pt={{ root: { "data-testid": `eye-icon-btn` } }}
  //                       icon={<Img name="black_ic_eye" />}
  //                       className="p-button-text p-0"
  //                       type="button"
  //                     />
  //                   }
  //                   title={removeUnderScore(apiData?.document_type).replace(
  //                     /\b\w/g,
  //                     (char) => char.toUpperCase()
  //                   )}
  //                   downloadUrl={path}
  //                   downloadName={filename}
  //                   extension={extension}
  //                   previewUrl={path}
  //                 />
  //               </InputIcon>
  //             ) : (
  //               // <InputIcon>
  //               //   <Button
  //               //     pt={{ root: { "data-testid": `disabled-eye-icon-btn` } }}
  //               //     icon={<Img name="disabled_eye" />}
  //               //     className="p-button-text p-0"
  //               //     type="button"
  //               //     disabled
  //               //   />
  //               // </InputIcon>
  //               <></>
  //             )}
  //           </IconField>
  //         </div>
  //       ) : (
  //         <InputText
  //           id={variable.id}
  //           data-testid={variable.id}
  //           name={variable.id} // Add name prop
  //           disabled={isDisable}
  //           onChange={(e) => {
  //             //  3. Also apply formatting here
  //             const formattedValue = formatSSN(e.target.value);
  //             formik.setFieldValue(variable.id, formattedValue);
  //           }}
  //           onBlur={formik.handleBlur}
  //           value={value || ""} // Use the value from getIn
  //           maxLength={11}
  //           className={`rounded-0 border-0 ps-0 bg-transparent text-field w-100`}
  //         />
  //       )}
  //       <label htmlFor={variable.id}>
  //         {variable.label}{" "}
  //         {(variable.isRequire || isRequire) && (
  //           <span className="require-star">*</span>
  //         )}
  //       </label>
  //     </FloatLabel>
  //     {touched && error ? <div className="error-msg">{error}</div> : null}
  //   </div>
  // );
};

export default BInputFileViewSSN;
