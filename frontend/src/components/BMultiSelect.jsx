import { MultiSelect } from 'primereact/multiselect';
import { FloatLabel } from 'primereact/floatlabel';
const BMultiSelect = ({variable,formik,isRequire}) => {

  return (
    <div
      className={`w-100 position-relative ${
        formik.touched[variable.id] && formik.errors[variable.id]
          ? "text-danger-con"
          : ""
      }`}
    >
      <FloatLabel>
      <MultiSelect
    //    value={selectedCities} 
    //   onChange={(e) => setSelectedCities(e.value)} 
    options={variable.options}
     optionLabel="name" 
      id={variable.id}
      data-testid={variable.id}
      onChange={formik.handleChange}
      onBlur={formik.handleBlur}
      value={formik.values[variable.id]}
      filter
      placeholder="Select Cities" 
      className={`rounded-0 border-0 ps-0 bg-transparent text-field w-100`}
      maxSelectedLabels={3} />
        <label htmlFor="middletName" data-testid={`${variable.id}-label`}>
          {variable.label}
          {isRequire&&<span className="require-star">*</span>}
        </label>
      </FloatLabel>
      {formik.touched[variable.id] &&
      formik.errors[variable.id] ? (
        <div className="error-msg" data-testid={`${variable.id}-err-msg`}>{formik.errors[variable.id]}</div>
      ) : null}
    </div>
    
  )
}

export default BMultiSelect