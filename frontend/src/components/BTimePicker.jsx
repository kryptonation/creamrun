import { Calendar } from "primereact/calendar";
import { FloatLabel } from "primereact/floatlabel";
import Img from "./Img";

const BTimePicker = ({ variable, formik, isRequire, isDisable }) => {
    // const handleHidePicker = (calendarRef) => {
    //     if (calendarRef.current) {
    //         const input = document.getElementById(variable.id);
    //         input?.blur();
    //     }
    // };

    let calendarRef = null;

    // const footerTemplate = () => (
    //     <div className="p-d-flex p-jc-end">
    //         <button
    //             type="button"
    //             className="p-button p-button-text p-button-sm"
    //             onClick={() => handleHidePicker(calendarRef)}
    //         >
    //             OK
    //         </button>
    //     </div>
    // );

    return (
        <div
            className={`w-100 position-relative ${formik.touched[variable.id] && formik.errors[variable.id]
                ? "text-danger-con"
                : ""
                }`}
        >
            <FloatLabel>
                <Calendar
                    ref={(el) => (calendarRef = el)}
                    inputId={variable.id}
                    disabled={isDisable}
                    name={variable.id}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values[variable.id]}
                    className={`rounded-0 border-0 ps-0 bg-transparent calendar-field w-100`}
                    showTime
                    timeOnly
                    readOnlyInput
                    showIcon
                    showSeconds
                    icon={() => <Img name="ic_clock" />}
                />
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

export default BTimePicker;
