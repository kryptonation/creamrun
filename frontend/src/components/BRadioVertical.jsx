import { RadioButton } from "primereact/radiobutton";

const BRadioVertical = ({ variable, formik, isRequire }) => {
  return (
    <div
      className={`w-100 position-relative ${
        formik.touched[variable.id] && formik.errors[variable.id]
          ? "text-danger-con"
          : ""
      }`}
    >
      <div className="d-flex flex-column gap-3">
        <p className="radio-main-label">
          {variable.label}{" "}
          {(variable.isRequire || isRequire) && (
            <span className="require-star">*</span>
          )}
        </p>

        {variable.options ? (
          variable.options.map((option) => (
            <div className="d-flex align-items-center gap-2" key={option.value}>
              <RadioButton
                inputId={`${variable.id}_${option.value}`}
                data-testid={`${variable.id}_${option.value}`}
                name={variable.id}
                value={option.value}
                onChange={formik.handleChange}
                checked={formik.values[variable.id] === option.value}
              />
              <label
                htmlFor={`${variable.id}_${option.value}`}
                data-testid={`${variable.id}_${option.value}-lable`}
                className="ml-2 radio-label"
              >
                {option.label}
              </label>
            </div>
          ))
        ) : (
          // Render Yes and No radio buttons as default
          <>
            <p className="radio-main-label">
              {variable.label}{" "}
              {isRequire && <span className="require-star">*</span>}
            </p>
            <div className="d-flex align-items-center gap-2">
              <RadioButton
                inputId={variable.options[0].id}
                data-testid={variable.options[0].id}
                name={variable.id}
                value={variable.options[0].id}
                onChange={formik.handleChange}
                checked={formik.values[variable.id] === variable.options[0].id}
              />
              <label
                htmlFor={variable.options[0].id}
                data-testid={`${variable.options[0].id}-label`}
                className="ml-2 radio-label"
              >
                {variable.options[0].label}
              </label>
            </div>
            <div className="d-flex align-items-center gap-2">
              <RadioButton
                inputId={variable.options[1].id}
                data-testid={variable.options[1].id}
                name={variable.id}
                value={variable.options[1].id}
                onChange={formik.handleChange}
                checked={formik.values[variable.id] === variable.options[1].id}
              />
              <label
                htmlFor={variable.options[1].id}
                data-testid={`${variable.options[1].id}-label`}
                className="ml-2"
              >
                {variable.options[1].label}
              </label>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BRadioVertical;
