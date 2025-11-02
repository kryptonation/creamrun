import { FloatLabel } from "primereact/floatlabel";
import { AutoComplete } from "primereact/autocomplete";
import Img from "./Img";

const BAutoComplete = ({ variable, formik, isRequire, isDisable = false, handleSearch }) => {
    const className = `b-input-fields ${variable.size}`;
    const onSearch = async (event) => {
        if (handleSearch) {
            handleSearch(event.query);
        }
    };

    return (
        <div className={className} >
            <div
                className={`w-100 position-relative ${formik.touched[variable.id] && formik.errors[variable.id]
                    ? "text-danger-con"
                    : ""
                    }`}
            >
                <FloatLabel>
                    <AutoComplete
                        inputId={variable.id}
                        name={variable.id}
                        disabled={isDisable}
                        filter
                        field="name"
                        optionLabel="label"
                        placeholder={`Search a ${variable.label}`}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        value={formik.values[variable.id]}
                        className="rounded-0 border-0 ps-0 bg-transparent text-field w-100"
                        inputStyle={{ backgroundColor: 'transparent', border: '0px',width:"100%" }}
                        pt={{ root: "border-0 bg-danger", container: "border-0 bg-transparent",input: "border-0 bg-transparent", }}
                        loadingIcon={()=>null}
                        emptyMessage="No countries found"
                        suggestions={variable.options}
                         completeMethod={onSearch}
                        forceSelection />
                    <label htmlFor={variable.id}>
                        {variable.label}
                        {(variable.isRequire || isRequire) && <span className="require-star">*</span>}
                    </label>
                </FloatLabel>
                {formik.touched[variable.id] && formik.errors[variable.id] && (
                    <div className="error-msg">{formik.errors[variable.id]}</div>
                )}
            </div>
        </div>
    );
}

export default BAutoComplete