import { Dropdown } from "primereact/dropdown";
import { FloatLabel } from "primereact/floatlabel";
import { getIn } from "formik"; //  1. Import getIn

const BSelect = ({ variable, formik, isRequire, isDisable = false }) => {
  // Get the nested value, touched status, and error using getIn
  const value = getIn(formik.values, variable.id); //  2. Use getIn to read the value
  const touched = getIn(formik.touched, variable.id); //  3. Use getIn for touched status
  const error = getIn(formik.errors, variable.id); //  4. Use getIn to read the error

  return (
    <div
      className={`w-100 position-relative ${
        touched && error ? "text-danger-con" : ""
      }`}
    >
      <FloatLabel>
        <Dropdown
          inputId={variable.id}
          data-testid={variable.id}
          name={variable.id}
          options={variable.options}
          disabled={isDisable || variable.isDisable || false}
          filter={variable.filter || false}
          optionLabel="name"
          placeholder={`Select a ${variable.label}`}
          onChange={formik.handleChange} // This can stay, it works well with the 'name' prop
          onBlur={formik.handleBlur}
          value={value} // Use the value retrieved with getIn
          showClear={variable.clear ?? false}
          className={`rounded-0 border-0 ps-0 bg-transparent text-field w-100`}
        />
        <label htmlFor={variable.id} data-testid={`${variable.id}-label`}>
          {variable.label}
          {(variable.isRequire || isRequire) && (
            <span className="require-star ms-1">*</span>
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

export default BSelect;
