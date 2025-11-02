import { FloatLabel } from 'primereact/floatlabel'
import { Password } from 'primereact/password'
import React from 'react'

const BPassword = ({variable,formik,isRequire=false, isDisable=false}) => {
  return (
      <div
      className={`w-100 position-relative ${
        formik.touched[variable.id] && formik.errors[variable.id]
          ? "text-danger-con"
          : ""
      }`}
    >
      <FloatLabel>
        <Password
          id={variable.id}
          disabled={isDisable}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          value={formik.values[variable.id]}
          keyfilter={variable.keyfilter}
          toggleMask 
          className={`rounded-0 border-0 ps-0 bg-transparent text-field w-100`}
          pt={{
            input:"bg-transparent border-0 w-100",
            root:"w-100"
          }}
        />
        <label htmlFor={variable.id}>
          {variable.label} {(isRequire||variable.isRequire)&&<span className="require-star">*</span>}
        </label>
      </FloatLabel>
      {formik.touched[variable.id] && formik.errors[variable.id] ? (
        <div className="error-msg">{formik.errors[variable.id]}</div>
      ) : null}
    </div>
    )
}

export default BPassword