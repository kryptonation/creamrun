import { Dropdown } from "primereact/dropdown";
import { FloatLabel } from "primereact/floatlabel";

const BSelectWithSearch = ({ variable, formik, isRequire, isDisable = false, handleSearch }) => {
    // const [loading, setLoading] = useState(false);
    const className = `b-input-fields ${variable.size}`;
    const onSearch = async (event) => {
        if (handleSearch) {
            handleSearch(event.filter);
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
                    <Dropdown
                        inputId={variable.id}
                        name={variable.id}
                        options={variable.options}
                        disabled={isDisable}
                        filter
                        optionLabel="name"
                        placeholder={`Select a ${variable.label}`}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        value={formik.values[variable.id]}
                        showClear={variable.clear ?? false}
                        onFilter={onSearch}
                        className="rounded-0 border-0 ps-0 bg-transparent text-field w-100"
                    />
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
};

export default BSelectWithSearch;
