import { ConfirmDialog } from "primereact/confirmdialog";
import { Button } from "primereact/button";
import Img from "../../../components/Img";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import BInputText from "../../../components/BInputText";
import { useFormik } from "formik";
import { useEffect, useState } from "react";
import BSelect from "../../../components/BSelect";
import { manageLedgerEntry as variable } from "../../../utils/variables";
import { useReassignDriverMutation } from "../../../redux/api/ledgerApi";
import { useLazyGetDriverQuery } from "../../../redux/api/driverApi";
const ReAssignDriverModal = ({
  isOpen,
  title,
  onCancel,
  onConfirm,
  driverIds,
  ledgerIds,
  onSuccess,
}) => {
  const formik = useFormik({
    initialValues: {
      currentUser: driverIds,
      reassignTo: "",
    },
    validateOnChange: true,
    onSubmit: (values) => {
      console.log(
        "Form submitted with values:",
        values,
        values["reassignTo"]?.code,
        ledgerIds
      );
      reassignDriver({
        ledgerId: ledgerIds,
        newDriverId: values["reassignTo"]?.code,
      });
    },
  });
  const [reassignDriver, { isSuccess, isError }] = useReassignDriverMutation();
  const [
    triggerSearchQuery,
    { data: driverDetail, isSuccess: isDriverSuccess },
  ] = useLazyGetDriverQuery();
  console.log("Selected driver id", driverIds);
  const [reassignToOptions, setReassignToOptions] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    console.log(isSuccess, submitted);
    if (isSuccess && submitted) {
      onSuccess && onSuccess(); // Notify parent - show success UI
      onConfirm && onConfirm(); // Close modal if needed
      setSubmitted(false); // Reset flag
    }
  }, [isSuccess, isError, submitted, onSuccess, onConfirm]);

  useEffect(() => {
    if (driverDetail?.items) {
      const options = driverDetail?.items.map((item) => ({
        name: [
          item.driver_details?.first_name,
          item.driver_details?.middle_name?.trim(),
          item.driver_details?.last_name,
        ]
          .filter(Boolean) // Removes any empty or null parts
          .join(" "),
        code: item.driver_details.driver_lookup_id,
      }));
      setReassignToOptions(options);
      console.log("Reassign options", options);

      if (options.length) {
        formik.setFieldValue("reassignTo", options, true);
      }
    }
  }, [driverDetail]);

  useEffect(() => {
    const queryParams = new URLSearchParams({
      page: 1,
      per_page: 100,
    });
    triggerSearchQuery(`?${queryParams.toString()}`);
  }, []);

  if (driverIds && driverIds !== formik.values["currentUser"]) {
    formik.setFieldValue("currentUser", driverIds);
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
                Reassigning Driver ID:&nbsp;
                <span className="text-dark fw-semibold"> {driverIds}</span>
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
          <p className="mb-4">Select Driver to reassign.</p>
          <div className="row">
            <div className="col-md-6 mb-3">
              <BInputText
                variable={{
                  id: "currentUser",
                  label: "Current Driver",
                }}
                formik={formik}
                isDisable={true}
              ></BInputText>
            </div>

            <div className="col-md-6 mb-3">
              <BSelect
                variable={{
                  id: "reassignTo",
                  label: "Reassign To",
                  options: reassignToOptions,
                  isRequire: true,
                }}
                formik={formik}
              ></BSelect>
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

export default ReAssignDriverModal;
