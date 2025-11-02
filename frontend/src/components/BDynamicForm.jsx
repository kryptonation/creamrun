import { useFormik } from 'formik';
import BInputText from './BInputText';
import BInputNumber from './BInputNumber';
import { Button } from 'primereact/button';
import BCalendar from './BCalendar';
import BTimePicker from './BTimePicker';
import BRadio from './BRadio';
import { buildYupValidationSchema } from '../utils/formUitiles';
import { forwardRef, useImperativeHandle } from 'react';
import BSelect from './BSelect';

const BDynamicForm = forwardRef(({ schema, handleSubmit }, ref) => {
  const getInitialValues = () => {
    const values = {};
    Object.entries(schema.properties).forEach(([fieldName, fieldSchema]) => {
      if (fieldSchema.default !== undefined) {
        values[fieldName] = fieldSchema.default;
      } else {
        switch (fieldSchema.type) {
          case 'string':
            values[fieldName] = '';
            break;
          case 'integer':
          case 'number':
            values[fieldName] = 0;
            break;
          default:
            values[fieldName] = null;
        }
      }
    });
    return values;
  };

  const validationSchema = buildYupValidationSchema(schema);
  const initialValues = getInitialValues();

  const formik = useFormik({
    initialValues,
    validationSchema,
    onSubmit: (values) => {
      handleSubmit(values);
    },
  });

  // Expose formik methods to parent component
  useImperativeHandle(ref, () => ({
    setFieldValue: formik.setFieldValue,
    setValues: formik.setValues,
    getValues: () => formik.values,
    submitForm: formik.submitForm,
  }));



  const renderField = (fieldName, fieldSchema) => {
    const fieldLabel = fieldSchema.title;
    const isRequire = (schema.required && fieldLabel) && schema.required.includes(fieldName)

    const options = Array.isArray(fieldSchema?.enum)
      ? fieldSchema.enum.map(item => ({
        value: item,
        label: item
      }))
      : [];
    switch (fieldSchema.type) {
      case 'string':
        if (fieldSchema.format === 'email') {
          return (
            <BInputText {...{ variable: { id: fieldName, type: fieldSchema.format, label: fieldSchema.title, isRequire }, formik }} />
          )
        }
        if (fieldSchema.format === 'date') {
          return (
            <BCalendar {...{ variable: { id: fieldName, label: fieldSchema.title, isRequire }, formik }} />
          )
        }
        if (fieldSchema.format === 'time') {
          return (
            <BTimePicker {...{ variable: { id: fieldName, label: fieldSchema.title, isRequire }, formik }} />
          )
        }
        if (fieldSchema.format === 'radio') {
          return (
            <BRadio {...{ variable: { id: fieldName, label: fieldSchema.title, isRequire, options: fieldSchema.enum.map(item => ({ value: item, label: item })) }, formik }} />
          );
        }
        if (fieldSchema.format === 'dropdown') {
          return (
            <BSelect {...{ variable: { id: fieldName, label: fieldSchema.title, isRequire, options: fieldSchema.enum }, formik }} />
          );
        }
        return (
          <BInputText {...{ variable: { id: fieldName, label: fieldSchema.title, isRequire }, formik }} />
        )

      case 'integer':
      case 'number':
        return (
          <BInputNumber {...{ variable: { id: fieldName, label: fieldSchema.title, isRequire }, formik }} />
        )
      default:
        return null
    }
  }

  return (
    <form
      className="common-form d-flex flex-column gap-5"
      onSubmit={formik.handleSubmit}
    >
      <div className="form-section">
        <div className="form-body d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center flex-wrap form-grid-1 w-75">
            {Object.entries(schema.properties).map(([fieldName, fieldSchema]) => (
              <div key={fieldName}>
                {renderField(fieldName, fieldSchema)}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        <Button
          label="Submit"
          data-testId="dynamic-form-submit-btn"
          type="submit"
          data-testid="medallion-detail-btn"
          severity="warning"
          className="border-radius-0 primary-btn "
        />
      </div>
    </form>
  )
})

export default BDynamicForm