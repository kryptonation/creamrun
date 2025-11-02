import { BreadCrumb } from "primereact/breadcrumb";
import { Link } from "react-router-dom";
import { Formik } from "formik";
import { Button } from "primereact/button";
import { useFormik } from "formik";
import BInputText from "../../components/BInputText";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BCalendar from "../../components/BCalendar";
// import { manageLedgerEntry as variable } from "../../utils/variables";]
import BUploadInput from "../../components/BUploadInput";
import { removeUnderScore } from "../../utils/utils";
import { createVehicleOwner as variable } from "../../utils/variables";
import BCaseCard from "../../components/BCaseCard";
import { useProcessCaseDeatilMutation } from "../../redux/api/medallionApi";
import { EDIT_VEHICLE_OWNER_DETAILS } from "../../utils/constants";
import BSuccessMessage from "../../components/BSuccessMessage";
const EditVehicleOwner = ({
  caseId,
  currentStepId,
  isCaseSuccess,
  reload,
  currentStep,
  caseData,
  hasAccess,
}) => {
  const params = useParams();
  console.log(params);

  const location = useLocation();
  console.log(location.state);

  const navigate = useNavigate();

  const [processFlow, { isSuccess: isProccessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [isOpen, setOpen] = useState(false);

  const formik = useFormik({
    initialValues: {
      // [variable.corporationName.id]: variable.corporationName.value,
      // [variable.corporateEIN.id]: variable.corporateEIN.value,
      // [variable.addressLine1.id]: variable.addressLine1.value,
      // [variable.addressLine2.id]: variable.addressLine2.value,
      // [variable.city.id]: variable.city.value,
      // [variable.state.id]: variable.state.value,
      // [variable.zip.id]: variable.zip.value,
      [variable.corporationName.id]: "",
      // [variable.corporateEIN.id]: "",
      [variable.addressLine1.id]: "",
      [variable.addressLine2.id]: "",
      [variable.city.id]: "",
      [variable.state.id]: "",
      [variable.zip.id]: "",
    },
    validateOnChange: true,
    // enableReinitialize: true,
    validate: (values) => {
      const errors = {};
      const requiredFields = [variable.corporationName, variable.corporateEIN];

      requiredFields.forEach((field) => {
        if (!values[field.id]) {
          errors[field.id] = `${field.label} is required`;
        }
      });
      return errors;
    },
    onSubmit: (values) => {
      console.log("Form submitted with values:", values);
      let payload = {
        entity_details: {
          entity_name: values[variable.corporationName.id],
          ein: values[variable.corporateEIN.id],
          address_line_1: values[variable.addressLine1.id],
          address_line_2: values[variable.addressLine2.id],
          city: values[variable.city.id],
          state: values[variable.state.id],
          zip: values[variable.zip.id],
          po_box: "",
        },
      };
      console.log("payload", payload);
      processFlow({
        params: params["caseId"],
        data: {
          step_id: EDIT_VEHICLE_OWNER_DETAILS,
          data: payload,
        },
      });
      // .unwrap()
      // .then(() => {
      //   moveCase({ params: params["caseId"] })
      //     .unwrap()
      //     .then(() => {
      //       reload();
      //     });
      // });
    },
  });

  useEffect(() => {
    if (isProccessDataSuccess) {
      setOpen(true);
      // reload();
    }
  }, [isProccessDataSuccess]);
  const [isFormInitialized, setIsFormInitialized] = useState(false);
  useEffect(() => {
    console.log("Currentstep", currentStep);

    if (currentStep && !isFormInitialized) {
      if (
        currentStep?.entity_name &&
        currentStep?.entity_name != formik.values[variable.corporationName.id]
      ) {
        formik.setFieldValue(
          variable.corporationName.id,
          currentStep?.entity_name || ""
        );
      }
      formik.setFieldValue(
        variable.corporationName.id,
        currentStep?.entity_name,
        true
      );
      formik.setFieldValue(variable.corporateEIN.id, currentStep?.ein, true);
      formik.setFieldValue(
        variable.addressLine1.id,
        currentStep?.entity_address.address_line_1,
        true
      );
      formik.setFieldValue(
        variable.addressLine2.id,
        currentStep?.entity_address.address_line_2,
        true
      );
      formik.setFieldValue(
        variable.city.id,
        currentStep?.entity_address?.city,
        true
      );
      formik.setFieldValue(
        variable.state.id,
        currentStep?.entity_address?.state,
        true
      );
      formik.setFieldValue(
        variable.zip.id,
        currentStep?.entity_address?.zip,
        true
      );
      //formik.validateForm();
      setIsFormInitialized(true);
    }
  }, [currentStep, isFormInitialized]);

  return (
    <div className="position-relative">
      <form
        className="common-form d-flex flex-column gap-5 "
        onSubmit={formik.handleSubmit}
      >
        <div className="d-flex align-items-center gap-5 ms-1 ">
          <BCaseCard
            label="Name of Entity"
            value={currentStep?.entity_name || "-"}
          />
          <BCaseCard label="EIN" value={currentStep?.ein || "-"} />
        </div>
        <div className="form-section">
          <div className="form-body">
            <div className="d-flex flex-wrap column-gap-5 p-3 w-100">
              <div className="col-md-3 mb-5">
                <BCaseCard label="Owner Id" value={currentStep?.owner_id} />
              </div>
              <div className="col-md-3 mb-5">
                <BInputText
                  variable={variable.corporationName}
                  formik={formik}
                ></BInputText>
              </div>
              <div className="col-md-3 mb-5 ">
                <BUploadInput
                  badge_value={currentStep?.documents[0]?.document_id ? 1 : 0}
                  apiData={currentStep?.documents[0]}
                  object_type={currentStep?.documents[0]?.document_object_type}
                  document_type={[
                    {
                      name: removeUnderScore(
                        currentStep?.documents[0]?.document_type
                      ),
                      code: currentStep?.documents[0]?.document_type,
                    },
                    {
                      name: removeUnderScore(
                        currentStep?.documents[0]?.document_type
                      ),
                      code: currentStep?.documents[0]?.document_type,
                    },
                  ]}
                  variable={variable.corporateEIN}
                  formik={formik}
                ></BUploadInput>
              </div>
              <div className="col-md-4 mb-5 ">
                <BInputText
                  variable={variable.addressLine1}
                  formik={formik}
                ></BInputText>
              </div>
              <div className="col-md-4 mb-5 ">
                <BInputText
                  variable={variable.addressLine2}
                  formik={formik}
                ></BInputText>
              </div>
              <div className="col-md-3 mb-5 ">
                <BInputText
                  variable={variable.city}
                  formik={formik}
                ></BInputText>
              </div>
              <div className="col-md-3 mb-5 ">
                <BInputText
                  variable={variable.state}
                  formik={formik}
                ></BInputText>
              </div>
              <div className="col-md-3 mb-5 ">
                <BInputText
                  variable={variable.zip}
                  formik={formik}
                ></BInputText>
              </div>
            </div>
          </div>
        </div>
        <div className="w-100 position-sticky bottom-0 py-3 bg-white">
          <Button
            label="Save Changes"
            type="submit"
            data-testid="submit-btn"
            severity="warning"
            className="border-radius-0 primary-btn"
            disabled={!hasAccess || !formik.isValid}
          />
        </div>
        <BSuccessMessage
          isOpen={isOpen}
          message={`Edit Vehicle Owner is successful`}
          title="Edit Vehicle Owner process is successful"
          onCancel={() => {
            setOpen(false);
            navigate("/manage-vehicle-owner", { replace: true });
          }}
          onConfirm={() => {
            setOpen(false);
            navigate("/manage-vehicle-owner", { replace: true });
          }}
          isHtml={true}
        />
      </form>
    </div>
  );
};
export default EditVehicleOwner;
