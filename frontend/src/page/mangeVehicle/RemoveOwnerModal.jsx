import { ConfirmDialog } from "primereact/confirmdialog";
import { Button } from "primereact/button";
import Img from "../../components/Img";
import BInputText from "../../components/BInputText";
import { useFormik } from "formik";
import { useEffect, useState } from "react";
import BSelect from "../../components/BSelect";
import { useReassignDriverMutation } from "../../redux/api/ledgerApi";
import { useLazyGetDriverQuery } from "../../redux/api/driverApi";
import {
  useChangeOwnershipMutation,
  useLazyVehicleOwnerListQuery,
} from "../../redux/api/vehicleOwnerAPI";
import { useRemoveOwnerMutation } from "../../redux/api/vehicleOwnerAPI";
const RemoveOwnerModal = ({
  isOpen,
  title,
  onCancel,
  onConfirm,
  onSuccess,
  vehicleData,
}) => {
  const [removeOwnership, { isSuccess, isError }] = useRemoveOwnerMutation();
  const [submitted, setSubmitted] = useState(false);

  const formik = useFormik({
    initialValues: {
      currentOwner: vehicleData?.entity_name,
      reassignTo: "",
      reason: "",
    },
    validateOnChange: true,
    enableReinitialize: true,
    validate: (values) => {
      const errors = {};
      if (!values.reason?.trim()) {
        errors.reason = "Reason is required";
      }
      return errors;
    },
    onSubmit: (values) => {
      console.log(
        "Form submitted with values:",
        values["reason"],
        vehicleData?.vin
      );
      removeOwnership({
        vin: vehicleData?.vin,
      });
    },
  });

  console.log("vehicleData", vehicleData);

  useEffect(() => {
    console.log(isSuccess, submitted);
    if (isSuccess && submitted) {
      onSuccess && onSuccess(); // Notify parent - show success UI
      onConfirm && onConfirm(); // Close modal if needed
      setSubmitted(false); // Reset flag
    }
  }, [isSuccess, isError, submitted, onSuccess, onConfirm]);

  return (
    <ConfirmDialog
      visible={isOpen}
      data-testid="remove-owner-modal"
      className="remove-owner-modal"
      content={() => (
        <div className="d-flex flex-column gap-4 p-5 bg-light w-100">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h5 className="fw-bold mb-1">{title}</h5>
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
          <div className="row">
            <BInputText
              variable={{
                id: "reason",
                label: "Reason",
                isRequire: true,
              }}
              formik={formik}
            ></BInputText>
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
              disabled={!formik.values["reason"]}
              onClick={() => {
                formik.handleSubmit();
                //onConfirm();
                setSubmitted(true);
              }}
            />
          </div>
        </div>
      )}
    />
  );
};

export default RemoveOwnerModal;
