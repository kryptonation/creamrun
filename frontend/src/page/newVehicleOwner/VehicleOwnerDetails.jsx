import { useFormik } from "formik";
import {
  statesOptions,
  createVehicleOwner as variable,
} from "../../utils/variables";
//import { createVehicleOwner as vehicleVariable } from "../../utils/variables";
import BInputText from "../../components/BInputText";
import { Button } from "primereact/button";
import { useNavigate, useParams } from "react-router-dom";
import Img from "../../components/Img";
import BCalendar from "../../components/BCalendar";
import BUploadInput from "../../components/BUploadInput";
import BCaseCard from "../../components/BCaseCard";
import BSelect from "../../components/BSelect";
import BModal from "../../components/BModal";
import BUpload from "../../components/BUpload";
import BMultiSelect from "../../components/BMultiSelect";
import BRadio from "../../components/BRadio";
import { Checkbox } from "primereact/checkbox";
import { useEffect, useState } from "react";
import BSelectWithSearch from "../../components/BSelectWithSearch";
import {
  useGetStepInfoQuery,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../redux/api/medallionApi";
import { yearMonthDate } from "../../utils/dateConverter";
import { removeUnderScore } from "../../utils/utils";
import { Badge } from "primereact/badge";
import { useIndividualListQuery } from "../../redux/api/individualListApi";
import { ENTER_VEHICLE_OWNER_DETAIL } from "../../utils/constants";
import BUploadFileRequired from "../../components/BUploadFileRequired";
import BInputFileViewEIN from "../../components/BInputFileViewEIN";
import { validateUSZipCode } from "../../utils/formUitiles";
import BSuccessMessage from "../../components/BSuccessMessage";
const CreateNewVehicleOwner = ({
  caseId,
  currentStepId,
  isCaseSuccess,
  reload,
  currentStep,
  caseData,
  hasAccess,
}) => {
  const params = useParams();
  console.log(
    "Create New Vehicle Owner",
    caseId,
    currentStepId,
    isCaseSuccess,
    currentStep,
    caseData,
    hasAccess,
    params["caseId"]
  );
  const [processFlow, { isSuccess: isProccessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [isOpen, setOpen] = useState(false);
  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();
  const { data: stepInfoData, isSucces: isStepInfoSuccess } =
    useGetStepInfoQuery(
      { caseNo: caseId, step_no: currentStepId },
      { skip: !caseId }
    );
  const [secondaryAdd, setSecondaryAdd] = useState(true);
  const [isCorporation, setIsCorporation] = useState(false);
  const [showPayeeProofModal, setShowPayeeProofModal] = useState(false);
  const [payeeProofTouched, setPayeeProofTouched] = useState(false);

  const formik = useFormik({
    initialValues: {
      [variable.corporationName.id]: "",
      [variable.ein.id]: "",
    },
    validateOnChange: true,
    validate: (values) => {
      const errors = {};
      const requiredFields = [
        variable.corporationName,
        variable.addressLine1,
        variable.city,
        variable.state,
      ];

      requiredFields.forEach((field) => {
        if (!values[field.id]) {
          errors[field.id] = `${field.label} is required`;
        }
      });

      // EIN validation
      if (values[variable.ein.id]) {
        const einValue = values[variable.ein.id];
        const einPattern = /^\d{2}-\d{7}$/;

        if (!einPattern.test(einValue)) {
          errors[variable.ein.id] =
            "EIN must be in format XX-XXXXXXX (9 digits total)";
        }
      }

      const zipError = validateZipCodeField(values.zip);
      if (zipError) {
        errors["zip"] = zipError;
      }

      return errors;
    },
    onSubmit: (values) => {
      console.log("values:", values);
      let payload = {
        entity_details: {
          entity_name: values[variable.corporationName.id],
          ein: values[variable.ein.id],
          address_line_1: values[variable.addressLine1.id],
          address_line_2: values[variable.addressLine2.id],
          city: values[variable.city.id],
          state: values[variable.state.id]?.code,
          zip: values[variable.zip.id],
          po_box: "",
        },
      };
      console.log("payload", payload);

      processFlow({
        params: params["caseId"],
        data: {
          step_id: ENTER_VEHICLE_OWNER_DETAIL,
          data: payload,
        },
      })
        .unwrap()
        .then(() => {
          moveCase({ params: params["caseId"] })
            .unwrap()
            .then(() => {
              reload();
            });
        });
    },
  });

  useEffect(() => {
    if (isMoveDataSuccess) {
      setOpen(true);
    }
  }, [isMoveDataSuccess]);

  const navigate = useNavigate();
  useEffect(() => {
    console.log("Populating data from currentstep", currentStep);
    if (stepInfoData) {
      if (
        stepInfoData?.entity_name &&
        stepInfoData?.entity_name !== formik.values[variable.corporationName.id]
      ) {
        formik.setFieldValue(
          variable.corporationName.id,
          stepInfoData?.entity_name
        );
      }
      if (
        stepInfoData?.ein &&
        stepInfoData?.ein !== formik.values[variable.ein.id]
      ) {
        formik.setFieldValue(variable.ein.id, stepInfoData?.ein);
      }
      if (
        stepInfoData?.entity_address?.address_line_1 &&
        stepInfoData?.entity_address.address_line_1 !==
          formik.values[variable.addressLine1.id]
      ) {
        formik.setFieldValue(
          variable.addressLine1.id,
          stepInfoData?.entity_address.address_line_1
        );
      }
      if (
        stepInfoData?.entity_address?.address_line_2 &&
        stepInfoData?.entity_address.address_line_2 !==
          formik.values[variable.addressLine2.id]
      ) {
        formik.setFieldValue(
          variable.addressLine2.id,
          stepInfoData?.entity_address.address_line_2
        );
      }
      if (
        stepInfoData?.entity_address?.city &&
        stepInfoData?.entity_address.city !== formik.values[variable.city.id]
      ) {
        formik.setFieldValue(
          variable.city.id,
          stepInfoData?.entity_address.city
        );
      }
      // if (
      //   stepInfoData?.entity_address?.state &&
      //   stepInfoData?.entity_address.state !== formik.values[variable.state.id]
      // ) {
      //   formik.setFieldValue(
      //     variable.state.id,
      //     stepInfoData?.entity_address.state
      //   );
      // }

      if (
        stepInfoData?.entity_address?.state &&
        stepInfoData?.entity_address?.state !== formik.values.state?.code
      ) {
        const matchedOption = statesOptions.find(
          (item) => item.code === stepInfoData?.entity_address?.state
        );

        formik.setFieldValue("state", matchedOption || null, true);
      }

      if (
        stepInfoData?.entity_address?.zip &&
        stepInfoData?.entity_address.zip !== formik.values[variable.zip.id]
      ) {
        formik.setFieldValue(variable.zip.id, stepInfoData?.entity_address.zip);
      }
    }
  }, [stepInfoData]);

  const mapDocumentData = (currentStep, type) => {
    const doc = currentStep?.documents?.find((d) => d?.document_type === type);
    return doc;
  };

  const getDocumentDetails = (item) => {
    if (item === "ein") {
      const ein_document = mapDocumentData(currentStep, "ein");
      console.log("ein document", ein_document);
      return {
        apiData: {
          ...ein_document,
          notes: "EIN document",
        },
        document_type: [
          {
            name: "EIN Document",
            code: ein_document?.document_type,
          },
        ],
        object_type: ein_document?.document_object_type,
      };
    }
    return null;
  };

  const validateZipCodeField = (value) => {
    const result = validateUSZipCode(value);
    return result.isValid ? undefined : result.message;
  };

  return (
    <div className="postion-relative">
      {/* <div class="alert alert-warning" role="alert">
        You don't have an access to this page
      </div> */}
      <div>
        <p className="sec-topic pb-3">Create Vehicle Owner</p>
        <form
          className="common-form d-flex flex-column gap-5"
          onSubmit={formik.handleSubmit}
        >
          <div className="form-section">
            <div
              className="d-flex align-items-center
                 justify-content-between form-sec-header"
            >
              <div className="topic">
                <Img name="company"></Img> Entity Details
              </div>
              <p className="text-require ">
                (Required fields are marked with{" "}
                <span className="require-star">*</span>)
              </p>
            </div>
            <div className="form-body">
              <div
                className="d-flex align-items-center flex-wrap form-grid-1 w-100 p-3"
                style={{ rowGap: "4rem", gap: "4rem 1rem" }}
              >
                <div className="w-100-3 ">
                  <BInputText
                    variable={variable.corporationName}
                    formik={formik}
                  ></BInputText>
                </div>
                <div className="w-100-3">
                  <BInputFileViewEIN
                    {...getDocumentDetails("ein")}
                    variable={variable.ein}
                    formik={formik}
                    isRequire={true}
                  ></BInputFileViewEIN>
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div
              className="d-flex align-items-center
                           justify-content-between form-sec-header"
            >
              <div className="topic">
                <Img name="primary-address"></Img>Address
              </div>
            </div>
            <div className="form-body ">
              <div className="d-flex flex-column common-gap">
                <div
                  className="d-flex align-items-center flex-wrap form-grid-1 w-90 p-3"
                  style={{ rowGap: "4rem", gap: "4rem 1rem" }}
                >
                  <div className="w-100-2">
                    <BInputText
                      variable={variable.addressLine1}
                      formik={formik}
                    ></BInputText>
                  </div>
                  <div className="w-100-2">
                    <BInputText
                      variable={variable.addressLine2}
                      formik={formik}
                    ></BInputText>
                  </div>
                </div>
                <div
                  className="w-100 d-flex align-items-center flex-wrap form-grid-1 p-4"
                  style={{ rowGap: "4rem", gap: "4rem 1rem" }}
                >
                  <div className="w-100-3 mb-2">
                    <BInputText
                      variable={variable.city}
                      formik={formik}
                    ></BInputText>
                  </div>
                  <div className="w-100-3">
                    <BSelect
                      variable={variable.state}
                      formik={formik}
                    ></BSelect>
                  </div>
                  <div className="w-100-3">
                    <BInputText
                      variable={variable.zip}
                      formik={formik}
                    ></BInputText>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-100 position-sticky bottom-0 py-3 bg-white">
            <Button
              disabled={!hasAccess || !formik.isValid || !formik.dirty}
              label="Submit Vehicle Details"
              type="submit"
              severity="warning"
              className="border-radius-0 primary-btn "
            />
          </div>
          <BSuccessMessage
            isOpen={isOpen}
            message={`New Vehicle Owner Registration Successful`}
            title="New Vehicle Owner Registration has been successfully Registered"
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
    </div>
  );
};

export default CreateNewVehicleOwner;
