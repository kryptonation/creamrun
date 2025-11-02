import React from "react";
import { InputSwitch } from "primereact/inputswitch";

const SwitchWithLabel = ({ variable, formik, isRequire }) => {
    return (
        <div
            className={`w-100 position-relative ${formik.touched[variable.id] && formik.errors[variable.id]
                ? "text-danger-con"
                : ""
                }`}
        >
            <div className="d-flex align-items-center gap-2">
                <InputSwitch
                    inputId={variable.id}
                    name={variable.id}
                    checked={formik.values[variable.id] || false}
                    onChange={(e) => formik.setFieldValue(variable.id, e.value)}
                />
                <label htmlFor={variable.id} className="ml-2">
                    <p>
                        {variable.label}{" "}
                        {isRequire && <span className="require-star">*</span>}
                    </p>
                </label>
            </div>
            {/* Error message display */}
            {formik.touched[variable.id] && formik.errors[variable.id] && (
                <div className="text-danger mt-1">
                    {formik.errors[variable.id]}
                </div>
            )}
        </div>
    );
};

export default SwitchWithLabel;
