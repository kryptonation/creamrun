import { ConfirmDialog } from "primereact/confirmdialog";
import { Button } from "primereact/button";
import Img from "../../components/Img";
import BCalendar from "../../components/BCalendar"; // Added import
import { useFormik } from "formik";
import { useEffect, useState } from "react";
import { useRemoveAdditionalDriverMutation } from "../../redux/api/driverApi"; // Changed import
import { yearMonthDate } from "../../utils/dateConverter";

const RemoveAdditionalDriverModal = ({
  isOpen,
  title,
  onCancel,
  onConfirm,
  driverLeaseId,
  onSuccess,
  additionalDriverData,
}) => {
  console.log(
    " ~ RemoveAdditionalDriverModal ~ additionalDriverData:",
    additionalDriverData
  );
  const formik = useFormik({
    initialValues: {
      driverRemovedDate: new Date(),
    },
    validateOnChange: true,
    onSubmit: (values) => {
      console.log(
        "Form submitted with values:",
        values,
        "Removing driver lease ID:",
        driverLeaseId
      );
      // Call the remove API
      removeAddDriverAPI({
        id: driverLeaseId,
        driverRemovedDate: yearMonthDate(values.driverRemovedDate),
      });
    },
  });

  // Use the remove mutation
  const [removeAddDriverAPI, { isSuccess, isError }] =
    useRemoveAdditionalDriverMutation();

  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    console.log(isSuccess, submitted);
    if (isSuccess && submitted) {
      onSuccess && onSuccess(); // Notify parent - show success UI
      onConfirm && onConfirm(); // Close modal if needed
      setSubmitted(false); // Reset flag
      formik.resetForm(); // Reset form on success
    }
    // Reset submitted flag on error
    if (isError && submitted) {
      setSubmitted(false);
    }
  }, [isSuccess, isError, submitted, onSuccess, onConfirm, formik]);

  return (
    <ConfirmDialog
      visible={isOpen}
      data-testid="remove-driver-modal" // Updated test-id
      className="reassign-driver-modal"
      content={() => (
        <div className="d-flex flex-column gap-4 p-5 bg-light w-100">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h5 className="fw-bold mb-1">{title}</h5>
              <small className="text-muted">
                Driver Name:&nbsp;
                <span className="text-dark fw-semibold">
                  {" "}
                  {additionalDriverData?.driver_name}
                </span>
              </small>
            </div>
            <Button
              text
              className="p-0"
              data-testid="close-icon-btn"
              icon={() => <Img name="modalCancel" />}
              onClick={onCancel}
            />
          </div>

          {/* Form fields */}
          <p className="mb-4">
            Please select the date to proceed with the removal.
          </p>
          <div className="row">
            <div className="col-12 mb-3">
              {/* Added BCalendar as requested */}
              <BCalendar
                variable={{
                  id: "driverRemovedDate",
                  label: "Additional Driver Removed Date",
                  isRequire: true, // Set as required to enable button validation
                }}
                formik={formik}
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="d-flex justify-content-center gap-3 mt-3">
            <Button
              label="Cancel"
              text
              severity="secondary"
              data-testid="cancel-btn"
              onClick={onCancel}
            />
            <Button
              type="submit"
              size="small"
              label="Confirm"
              rounded="true"
              className="bg-warning border-0 text-dark fw-semibold w-30"
              data-testid="confirm-btn"
              // Disable button if date is not selected
              disabled={!formik.values.driverRemovedDate || submitted}
              loading={submitted && !isSuccess && !isError} // Show loading state
              onClick={() => {
                formik.handleSubmit();
                setSubmitted(true);
              }}
            />
          </div>
        </div>
      )}
    />
  );
};

export default RemoveAdditionalDriverModal;
