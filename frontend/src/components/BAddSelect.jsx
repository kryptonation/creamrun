import { useState }  from 'react'
import { Dropdown } from 'primereact/dropdown';
import { FloatLabel } from 'primereact/floatlabel';

const BAddSelect = ({ variable, formik, isRequire, isDisable = false }) => {
  const [countries, setCountries] = useState(variable.options);

  const onFilter = (e) => {
    const typedValue = e.filter?.trim();
    setCountries((prev) => prev.filter((c) => !c.custom));
    const exists = countries.some(
      (c) => c.name.toLowerCase() === typedValue?.toLowerCase()
    );

    if (typedValue && !exists) {
      const customOption = {
        name: typedValue,
        code: `NEW_${typedValue.toUpperCase().slice(0, 4)}`,
        custom: true,
      };
      setCountries((prev) => [...prev, customOption]);
    }
  };

    return (
      <div
        className={`w-100 position-relative ${formik?.touched[variable.id] && formik?.errors[variable.id]
            ? "text-danger-con"
            : ""
          }`}
      >
        <FloatLabel>
          <Dropdown
            inputId={variable.id}
            data-testid={variable.id}
            name={variable.id}
            options={countries}
            disabled={isDisable||variable.isDisable || false}
            filter={variable.filter || false}
            optionLabel="name"
            onFilter={onFilter}
            placeholder={`Select a ${variable.label}`}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            value={formik.values[variable.id]}
            showClear={variable.clear ?? false}
            className={`rounded-0 border-0 ps-0 bg-transparent text-field w-100`}
          />
          <label htmlFor={variable.id} data-testid={`${variable.id}-label`}>
            {variable.label}
            {(variable.isRequire || isRequire) && <span className="require-star">*</span>}
          </label>
        </FloatLabel>
        {
          formik.touched[variable.id] && formik.errors[variable.id] ? (
            <div className="error-msg"  data-testid={`${variable.id}-error-msg`}>{formik.errors[variable.id]}</div>
          ) : null}
      </div>
    );
}

export default BAddSelect