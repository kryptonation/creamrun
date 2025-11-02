import { Checkbox } from "primereact/checkbox";

const BCheckbox = ({ variable, formik, isRequire, isDisable = false }) => {
    return (
        <div
            className={`w-100 position-relative ${formik.touched[variable.id] && formik.errors[variable.id]
                ? "text-danger-con"
                : ""
                }`}
        >
            <div className="d-flex align-items-center flex-wrap gap-4">
                {variable.options ? (
                    variable.options.map((option) => (
                        <div className={`d-flex align-items-center gap-2 ${isDisable ? "disabled-color" : ""}`} key={option.value}>
                            <Checkbox
                                inputId={`${variable.id}_${option.value}`}
                                data-testid={`${variable.id}_${option.value}`}
                                name={variable.id}
                                value={option.value}
                                disabled={isDisable}
                                onChange={(e) => {
                                    const valueArray = formik.values[variable.id] || [];
                                    const updatedValues = e.checked
                                        ? [...valueArray, e.value]
                                        : valueArray.filter((val) => val !== e.value);
                                    formik.setFieldValue(variable.id, updatedValues);
                                }}
                                checked={
                                    formik.values[variable.id] &&
                                    formik.values[variable.id].includes(option.value)
                                }
                            />
                            <label htmlFor={`${variable.id}_${option.value}`} data-testid={`${variable.id}_${option.value}`} className="ml-2 checkbox-label">
                                {option.label}
                            </label>
                        </div>
                    ))
                ) : (
                    // Render default Yes and No checkboxes if options are not provided
                    <>
                        <div className="d-flex align-items-center gap-2">
                            <Checkbox
                                inputId={`${variable.id}_yes`}
                                name={variable.id}
                                value="Yes"
                                disabled={variable.disabled}
                                onChange={(e) => {
                                    const valueArray = formik.values[variable.id] || [];
                                    const updatedValues = e.checked
                                        ? [...valueArray, "Yes"]
                                        : valueArray.filter((val) => val !== "Yes");
                                    formik.setFieldValue(variable.id, updatedValues);
                                }}
                                checked={
                                    formik.values[variable.id] &&
                                    formik.values[variable.id].includes("Yes")
                                }
                            />
                            <label htmlFor={`${variable.id}_yes`} data-testid={`${variable.id}_yes`} className="ml-2 checkbox-label">
                                <p>
                                    {variable.label}{" "}
                                    {isRequire && <span className="require-star">*</span>}
                                </p>
                            </label>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default BCheckbox;
