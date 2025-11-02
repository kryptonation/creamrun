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
const VehicleOwnershipChangeModal = ({
  isOpen,
  title,
  onCancel,
  onConfirm,
  onSuccess,
  vehicleData,
}) => {
  const [triggerGetVehicleOwnerData, { data: vehicleOwnerListData }] =
    useLazyVehicleOwnerListQuery();
  const [changeOwnership, { isSuccess, isError }] =
    useChangeOwnershipMutation();
  const [reassignToOptions, setReassignToOptions] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  const formik = useFormik({
    initialValues: {
      currentOwner: vehicleData?.entity_name,
      reassignTo: "",
      reason: "",
    },
    validateOnChange: true,
    enableReinitialize: true,
    onSubmit: (values) => {
      console.log(
        "Form submitted with values:",
        values,
        values["reassignTo"]?.code,
        values["reason"]
      );
      changeOwnership({
        vin: vehicleData?.vin,
        owner_id: values["reassignTo"]?.code,
        reason: values["reason"],
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

  useEffect(() => {
    console.log("vehicle lsit data", vehicleOwnerListData);
    if (vehicleOwnerListData?.items) {
      const options = vehicleOwnerListData?.items
        .filter((item) => item.entity_name != null)
        .map((item) => ({
          name: item?.entity_name,
          code: item?.id,
        }));
      setReassignToOptions(options);
      console.log("Reassign options", options);

      if (options.length) {
        formik.setFieldValue("reassignTo", options, true);
      }
    }
  }, [vehicleOwnerListData]);

  useEffect(() => {
    const queryParams = new URLSearchParams({
      page: 1,
      per_page: 100,
    });
    triggerGetVehicleOwnerData(`?${queryParams.toString()}`);
  }, []);

  if (
    vehicleData?.entity_name &&
    vehicleData?.entity_name !== formik.values["currentOwner"]
  ) {
    formik.setFieldValue("currentOwner", vehicleData?.entity_name);
  }

  return (
    <ConfirmDialog
      visible={isOpen}
      data-testid="reassign-driver-modal"
      className="reassign-driver-modal"
      content={() => (
        <div className="d-flex flex-column gap-4 p-5 bg-light w-100">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h5 className="fw-bold mb-1">{title}</h5>
              <small className="text-muted">
                Changer Vehicle VIN:&nbsp;
                <span className="text-dark fw-semibold"> {}</span>
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
          <p className="mb-4">Select the owner to change ownership</p>
          <div className="row">
            <div className="col-md-6 mb-3">
              <BInputText
                variable={{
                  id: "currentOwner",
                  label: "Current Owner",
                }}
                formik={formik}
                isDisable={true}
              ></BInputText>
            </div>

            <div className="col-md-6 mb-3">
              <BSelect
                variable={{
                  id: "reassignTo",
                  label: "Choose Owner",
                  options: reassignToOptions,
                  isRequire: true,
                }}
                formik={formik}
              ></BSelect>
            </div>
          </div>
          <div className="row">
            <BInputText
              variable={{
                id: "reason",
                label: "Reason",
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
              disabled={!formik.values["reassignTo"]?.code}
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

export default VehicleOwnershipChangeModal;
