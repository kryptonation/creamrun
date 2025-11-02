import { FloatLabel } from "primereact/floatlabel";
import { InputNumber } from "primereact/inputnumber";
import Img from "./Img";
import { getIn } from "formik"; // 1. Import getIn

const BInputNumber = ({
  variable,
  formik,
  isRequire = false,
  isCurrency = false,
  prefix,
  suffix,
  step = 1,
  showButtons = false,
  isDisable = false,
}) => {
  // 2. Get nested value, touched status, and error using getIn
  const value = getIn(formik.values, variable.id);
  const touched = getIn(formik.touched, variable.id);
  const error = getIn(formik.errors, variable.id);

  const isPercentage = prefix === "%" || suffix === "%";
  const percentageStep = isPercentage ? 0.01 : step;

  const incrementButtonTemplate = () => {
    return <Img name="increment_button" />;
  };
  const decrementButtonTemplate = () => {
    return <Img name="decrement_button" />;
  };

  return (
    <div
      className={`w-100 position-relative ${touched && error ? "text-danger-con" : ""
        }`}
    >
      <FloatLabel>
        <InputNumber
          id={variable.id}
          inputId={variable.id}
          name={variable.id} // Add name for handleBlur
          data-testid={variable.dataTestId}
          useGrouping={variable.useGrouping ?? true}
          onValueChange={(e) => formik.setFieldValue(variable.id, e.value)}
          onBlur={formik.handleBlur}
          value={value} // 👈 3. Use the value from getIn
          min={variable?.min ?? (isPercentage ? 0 : undefined)}
          max={variable?.max ?? (isPercentage ? 100 : undefined)}
          step={percentageStep}
          onChange={(e) => {
            formik.setFieldValue(variable.id, e.value)
          }
          }
          className={`rounded-0 border-0 ps-0 bg-transparent text-field w-100`}
          mode={isCurrency ? "currency" : "decimal"}
          currency="USD"
          locale="en-US"
          prefix={prefix}
          suffix={suffix}
          showButtons={showButtons || isPercentage}
          incrementButtonClassName="p-button-secondary"
          decrementButtonClassName="p-button-secondary"
          incrementButtonIcon={incrementButtonTemplate}
          decrementButtonIcon={decrementButtonTemplate}
          disabled={isDisable || variable.isDisable}
        />
        <label htmlFor={variable.id} data-testid={`${variable.id}-label`}>
          {variable.label}{" "}
          {(variable.isRequire || isRequire) && (
            <span className="require-star">*</span>
          )}
        </label>
      </FloatLabel>
      {touched && error ? (
        <div className="error-msg" data-testid={`${variable.id}-error-msg`}>
          {error}
        </div>
      ) : null}
    </div>
  );
};

export default BInputNumber;

// import { FloatLabel } from "primereact/floatlabel";
// import { InputNumber } from "primereact/inputnumber";
// import Img from "./Img";

// const BInputNumber = ({
//   variable,
//   formik,
//   isRequire = false,
//   isCurrency = false,
//   prefix,
//   suffix,
//   step = 1,
//   showButtons = false,
// }) => {
//   // Determine if this is a percentage field
//   const isPercentage = prefix === "%" || suffix === "%";

//   // Set appropriate step for percentage (0.01 for more precision)
//   const percentageStep = isPercentage ? 0.01 : step;

//   const incrementButtonTemplate = () => {
//     return <Img name="increment_button" />;
//   };
//   const decrementButtonTemplate = () => {
//     return <Img name="decrement_button" />;
//   };

//   return (
//     <div
//       className={`w-100 position-relative ${
//         formik.touched[variable.id] && formik.errors[variable.id]
//           ? "text-danger-con"
//           : ""
//       }`}
//     >
//       <FloatLabel>
//         <InputNumber
//           id={variable.id}
//           inputId={variable.id}
//           data-testid={variable.dataTestId}
//           useGrouping={variable.useGrouping ?? true}
//           onValueChange={(e) => formik.setFieldValue(variable.id, e.value)}
//           onChange={(e) =>
//             formik.handleChange({ target: { id: variable.id, value: e.value } })
//           }
//           onBlur={formik.handleBlur}
//           value={formik.values[variable.id]}
//           min={variable?.min ?? (isPercentage ? 0 : undefined)}
//           max={variable?.max ?? (isPercentage ? 100 : undefined)}
//           step={percentageStep}
//           className={`rounded-0 border-0 ps-0 bg-transparent text-field w-100`}
//           mode={isCurrency ? "currency" : "decimal"}
//           currency="USD"
//           locale="en-US"
//           prefix={prefix}
//           suffix={suffix}
//           // Enable buttons for percentage fields or when explicitly requested
//           showButtons={showButtons || isPercentage}
//           incrementButtonClassName="p-button-secondary"
//           decrementButtonClassName="p-button-secondary"
//           // Custom button icons (optional)
//           incrementButtonIcon={incrementButtonTemplate}
//           decrementButtonIcon={decrementButtonTemplate}
//         />
//         <label htmlFor={variable.id} data-testid={`${variable.id}-label`}>
//           {variable.label}{" "}
//           {(variable.isRequire || isRequire) && (
//             <span className="require-star">*</span>
//           )}
//         </label>
//       </FloatLabel>
//       {formik.touched[variable.id] && formik.errors[variable.id] ? (
//         <div className="error-msg" data-testid={`${variable.id}-error-msg`}>
//           {formik.errors[variable.id]}
//         </div>
//       ) : null}
//     </div>
//   );
// };

// export default BInputNumber;
