import { ListBox } from "primereact/listbox";

const BDayInput = ({ variable, formik, isRequire }) => {
  const cities = [
    { name: 'S', code: 'sun' },
    { name: 'M', code: 'mon' },
    { name: 'T', code: 'tus' },
    { name: 'W', code: 'wen' },
    { name: 'T', code: 'thu' },
    { name: 'F', code: 'fri' },
    { name: 'S', code: 'sat' },
  ];
  return (
    <div
      className={`w-100 position-relative day-input ${formik.touched[variable.id] && formik.errors[variable.id]
        ? "text-danger-con"
        : ""
        }`}
    >
      <label htmlFor={variable.id} data-testid={`${variable.id}-label`} className="day-label">{variable.label}
        {(variable.isRequire || isRequire) && <span className="require-star">*</span>}</label>
      <ListBox id={variable.id} multiple={variable.multiple} value={formik.values[variable.id]} onChange={formik.handleChange} options={cities} optionLabel="name" pt={{
        root: "d-flex border-0 bg-transparent",
        list: "d-flex day-check gap-2",
        wrapper: "overflow-unset"
      }} />
      {formik.touched[variable.id] && formik.errors[variable.id] ? (
        <div className="error-msg" data-testid={`${variable.id}-error-msg`}>{formik.errors[variable.id]}</div>
      ) : null}
    </div>
  );
}

export default BDayInput