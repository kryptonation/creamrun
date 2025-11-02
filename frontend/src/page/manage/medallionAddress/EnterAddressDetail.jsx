import Img from "../../../components/Img";
import { useFormik } from "formik";
import {
  statesOptions,
  medallionAddress as variable,
  medallionSecondaryAddress as secondaryAddressVariable,
} from "../../../utils/variables";
import BInputFields from "../../../components/BInputFileds";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { useEffect, useRef, useState } from "react";
import {
  useDeleteDocumentMutation,
  useGetStepInfoQuery,
  useGetUpdatedCaseDetailsWithParamsQuery,
  useLazyGetUpdatedCaseDetailsWithParamsQuery,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../../redux/api/medallionApi";
import { useSelector } from "react-redux";
import BSuccessMessage from "../../../components/BSuccessMessage";
import DataTableComponent from "../../../components/DataTableComponent";
import BModal from "../../../components/BModal";
import DownloadBtn from "../../../components/DownloadBtn";
import PDFViewer from "../../../components/PDFViewer";
import { Accordion, AccordionTab } from "primereact/accordion";
import PdfViewModal from "../../../components/PdfViewModal";
import {
  kbToMb,
  removeUnderScore,
  validateEmailAdvanced,
} from "../../../utils/utils";
import { yearMonthDate } from "../../../utils/dateConverter";
import { validateUSZipCode } from "../../../utils/formUitiles";
import { gridToolTipOptins } from "../../../utils/tooltipUtils";
import BAttachedFile from "../../../components/BAttachedFile";
import { MO_ENTER_ADDRESS_DETAIL } from "../../../utils/constants";
import { getCurrentStep } from "../../../utils/caseUtils";
import { Checkbox } from "primereact/checkbox";
import BInputText from "../../../components/BInputText";
import BSelect from "../../../components/BSelect";

const EnterAddressDetail = ({
  caseId,
  currentStepId,
  reload,
  currentStep,
  hasAccess,
  caseData,
}) => {
  const [processFlow, { isSuccess: isProcessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();
  const [fetchUpdatedCaseDetails, { data: updatedAddressData, isLoading }] =
    useLazyGetUpdatedCaseDetailsWithParamsQuery();
  const docRef = useRef(null);

  // State to track manual user changes
  const [userHasManuallyChanged, setUserHasManuallyChanged] = useState(false);
  const [initialFormValues, setInitialFormValues] = useState(null);
  const [isFormInitialized, setIsFormInitialized] = useState(false);

  const validateZipCodeField = (value) => {
    const result = validateUSZipCode(value);
    return result.isValid ? undefined : result.message;
  };

  const [secondaryAdd, setSecondaryAdd] = useState(true);

  const primaryInitialValues = variable.reduce((acc, field) => {
    acc[field.id] = field.inputType === "SELECT" ? null : "";
    return acc;
  }, {});

  const secondaryInitialValues = Object.values(secondaryAddressVariable).reduce(
    (acc, field) => {
      // treat "State" as a SELECT → null, others as empty string
      acc[field.id] = field.options ? null : "";
      return acc;
    },
    {}
  );

  const initialValues = {
    ...primaryInitialValues,
    ...secondaryInitialValues,
  };

  const formik = useFormik({
    initialValues,
    validateOnChange: true,
    enableReinitialize: true,
    validate: (values) => {
      const errors = {};
      if (!values[variable[0]?.id]) {
        errors[variable[0]?.id] = `${variable[0].label} is required`;
      }
      if (!values[variable[2]?.id]) {
        errors[variable[2]?.id] = `${variable[2].label} is required`;
      }
      if (!values[variable[3]?.id]) {
        errors[variable[3]?.id] = `${variable[3].label} is required`;
      }
      if (!values[variable[5]?.id]) {
        errors[variable[5]?.id] = `${variable[5].label} is required`;
      } else if (
        !/^(\+1\s?)?(\([2-9][0-9]{2}\)|[2-9][0-9]{2})[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/.test(
          values[variable[5].id]
        )
      ) {
        errors[variable[5]?.id] =
          "Enter a valid US mobile number (e.g., 212-456-7890)";
      }

      if (
        values[variable[6]?.id] &&
        !/^(\+1\s?)?(\([2-9][0-9]{2}\)|[2-9][0-9]{2})[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/.test(
          values[variable[6].id]
        )
      ) {
        errors[variable[6]?.id] =
          "Enter a valid US mobile number (e.g., 212-456-7890)";
      }

      const zipError = validateZipCodeField(values.zip);
      if (zipError) {
        errors["zip"] = zipError;
      }
      if (!values.email) {
        errors["email"] = "Email Address is required";
      } else if (!validateEmailAdvanced(values.email)) {
        errors.email = `Please enter a valid email address`;
      }

      const secondaryZipError = validateZipCodeField(values.secondaryZip);
      if (values.secondaryZip && values.secondaryZip.trim()) {
        if (secondaryZipError) {
          errors["secondaryZip"] = secondaryZipError;
        }
      }

      return errors;
    },
    onSubmit: (values) => {
      let payload = {
        owner_id: currentStep?.owner_id,
        is_mailing_address_same: false,
        email: formik?.values.email,
        phone_1: formik?.values.phone_1,
        phone_2: formik?.values.phone_2,
        primary_address: {
          address_line_1: formik?.values.addressLine1,
          address_line_2: formik?.values.addressLine2,
          city: formik?.values.city,
          state: formik?.values.state?.code,
          zip: formik?.values.zip,
        },
        secondary_address: {
          address_line_1: formik?.values.secondaryAddress1,
          address_line_2: formik?.values.secondaryAddress2,
          city: formik?.values.secondaryCity,
          state: formik?.values.secondaryState?.code,
          zip: formik?.values.secondaryZip,
        },
      };
      // if (secondaryAdd) {
      //   payload = {
      //     ...payload,
      //     secondary_address: {
      //       address_line_1: formik?.values.addressLine1,
      //       address_line_2: formik?.values.addressLine2,
      //       city: formik?.values.city,
      //       state: formik?.values.state?.code,
      //       zip: formik?.values.zip,
      //     },
      //   };
      // }

      // let payload = {
      //   owner_id: currentStep?.owner_id,
      //   address_line_1: formik?.values.addressLine1,
      //   address_line_2: formik?.values.addressLine2,
      //   city: formik?.values.city,
      //   state: formik?.values.state?.code,
      //   zip: formik?.values.zip,
      //   email: formik?.values.email,
      //   phone_1: formik?.values.phone_1,
      //   phone_2: formik?.values.phone_2,
      // };

      const data = {
        step_id: MO_ENTER_ADDRESS_DETAIL,
        data: {
          ...payload,
        },
      };
      console.log("payload", data);

      // Reset the manual change flag after successful submission
      if (hasAccess && Object.keys(formik.errors).length == 0) {
        processFlow({ params: caseId, data: data });
        setUserHasManuallyChanged(false);
      }
    },
  });

  // Function to check if current values differ from initial values
  const checkForManualChanges = (currentValues, initialVals) => {
    if (!initialVals) return false;

    // Compare each field
    for (const key in currentValues) {
      const currentValue = currentValues[key];
      const initialValue = initialVals[key];

      // Handle null/undefined/empty string comparisons
      const normalizedCurrent =
        currentValue === null || currentValue === undefined ? "" : currentValue;
      const normalizedInitial =
        initialValue === null || initialValue === undefined ? "" : initialValue;

      // For objects (like state selection), compare by code or value
      if (typeof currentValue === "object" && currentValue !== null) {
        if (typeof initialValue === "object" && initialValue !== null) {
          if (JSON.stringify(currentValue) !== JSON.stringify(initialValue)) {
            return true;
          }
        } else {
          // Current is object but initial is not
          if (currentValue.code !== initialValue) {
            return true;
          }
        }
      } else if (typeof initialValue === "object" && initialValue !== null) {
        // Initial is object but current is not
        if (initialValue.code !== currentValue) {
          return true;
        }
      } else {
        // Both are primitives
        if (normalizedCurrent !== normalizedInitial) {
          return true;
        }
      }
    }

    return false;
  };

  const populateFormikValues = (
    stepData,
    contactNumber,
    emailAddress,
    correspondenceDoc
  ) => {
    if (stepData?.medallion_owner_address_info || stepData) {
      const addressInfo = stepData?.medallion_owner_address_info || stepData;

      formik.setFieldValue(
        [variable?.[0].id],
        addressInfo?.address_line_1 || "",
        false
      );
      formik.setFieldValue(
        [variable?.[1].id],
        addressInfo?.address_line_2 || "",
        false
      );
      formik.setFieldValue([variable?.[2].id], addressInfo?.city || "", false);

      const primaryAddressState = addressInfo?.state;
      if (primaryAddressState) {
        const matchedOption = statesOptions.find(
          (item) => item.code === primaryAddressState
        );
        formik.setFieldValue("state", matchedOption || null, false);
      }

      formik.setFieldValue([variable?.[4].id], addressInfo?.zip || "", false);
    }

    const secondaryAddressInfo = stepData?.secondary_address_info || stepData;

    formik.setFieldValue(
      secondaryAddressVariable.secondaryAddress1.id,
      secondaryAddressInfo?.address_line_1 || "",
      false
    );
    formik.setFieldValue(
      secondaryAddressVariable.secondaryAddress2.id,
      secondaryAddressInfo?.address_line_2 || "",
      false
    );
    formik.setFieldValue(
      secondaryAddressVariable.secondaryCity.id,
      secondaryAddressInfo?.city || "",
      false
    );

    const secondaryAddressState = secondaryAddressInfo?.state;
    if (secondaryAddressState) {
      const matchedOption = statesOptions.find(
        (item) => item.code === secondaryAddressState
      );
      formik.setFieldValue(
        secondaryAddressVariable.secondaryState.id,
        matchedOption || null,
        false
      );
    }

    formik.setFieldValue(
      secondaryAddressVariable.secondaryZip.id,
      secondaryAddressInfo?.zip || "",
      false
    );

    // if (stepData?.is_mailing_address_same) {
    //   setSecondaryAdd(true);
    // } else {
    //   setSecondaryAdd(false);
    //   console.log("Secondary address", stepData);
    //   if (stepData?.secondary_address_info || stepData) {
    //     const secondaryAddressInfo =
    //       stepData?.secondary_address_info || stepData;

    //     formik.setFieldValue(
    //       secondaryAddressVariable.secondaryAddress1.id,
    //       secondaryAddressInfo?.address_line_1 || "",
    //       false
    //     );
    //     formik.setFieldValue(
    //       secondaryAddressVariable.secondaryAddress2.id,
    //       secondaryAddressInfo?.address_line_2 || "",
    //       false
    //     );
    //     formik.setFieldValue(
    //       secondaryAddressVariable.secondaryCity.id,
    //       secondaryAddressInfo?.city || "",
    //       false
    //     );

    //     const secondaryAddressState = secondaryAddressInfo?.state;
    //     if (secondaryAddressState) {
    //       const matchedOption = statesOptions.find(
    //         (item) => item.code === secondaryAddressState
    //       );
    //       formik.setFieldValue(
    //         secondaryAddressVariable.secondaryState.id,
    //         matchedOption || null,
    //         false
    //       );
    //     }

    //     formik.setFieldValue(
    //       secondaryAddressVariable.secondaryZip.id,
    //       secondaryAddressInfo?.zip || "",
    //       false
    //     );
    //   }
    // }
    // Update contact information
    formik.setFieldValue([variable?.[5].id], contactNumber || "", false);
    formik.setFieldValue([variable?.[7].id], emailAddress || "", false);

    // Update correspondence document
    if (correspondenceDoc) {
      setUpdatedAddressDocument(correspondenceDoc);
    }

    // Store the initial values after API population
    setTimeout(() => {
      setInitialFormValues({ ...formik.values });
      setUserHasManuallyChanged(false);
      setIsFormInitialized(true);
    }, 100);
  };

  const completeStep = () => {
    if (
      hasAccess &&
      caseData &&
      caseData.case_info.case_status !== "Closed" &&
      getCurrentStep(caseData.steps).step_id === currentStepId
    ) {
      moveCase({ params: caseId });
    }
  };

  useEffect(() => {
    if (isProcessDataSuccess) {
      fetchUpdatedCaseDetails({ caseId, isAddressSaved: true });
      reload();
    }
  }, [isProcessDataSuccess]);

  useEffect(() => {
    if (isMoveDataSuccess) {
      reload();
    }
  }, [isMoveDataSuccess]);

  const [updatedAddressDocument, setUpdatedAddressDocument] = useState(null);

  // Fetch initial data when page loads
  useEffect(() => {
    if (caseId) {
      fetchUpdatedCaseDetails({ caseId, isAddressSaved: false });
    }
  }, [caseId]);

  // Handle updatedAddressData changes (after Generate Documents is clicked)
  useEffect(() => {
    if (updatedAddressData) {
      // Find the "Enter Address Details" step from the steps array
      const enterAddressStep = updatedAddressData.steps?.find(
        (step) => step.step_name === "Enter Address Details"
      );

      // Get the step data from the sub_steps array
      const enterAddressSubStep = enterAddressStep?.sub_steps?.find(
        (subStep) => subStep.step_name === "Enter Address Details"
      );

      const stepData = enterAddressSubStep?.step_data;

      if (stepData) {
        populateFormikValues(
          stepData,
          stepData?.primary_contact_number,
          stepData?.primary_email_address,
          stepData?.correspondence_info?.document
        );
      }
    }
  }, [updatedAddressData]);

  // useEffect(() => {
  //   if (updatedAddressDocument?.document_id && docRef.current) {
  //     docRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  //   }
  // }, [updatedAddressDocument?.document_id]);

  // Monitor form changes to detect manual user input
  useEffect(() => {
    if (initialFormValues) {
      const hasManualChanges = checkForManualChanges(
        formik.values,
        initialFormValues
      );
      setUserHasManuallyChanged(hasManualChanges);
    }
  }, [formik.values, initialFormValues]);

  // Handle secondary address checkbox changes
  const handleSecondaryAddressChange = (isChecked) => {
    setSecondaryAdd(isChecked);

    // Mark as manually changed when user interacts with checkbox
    if (initialFormValues) {
      setUserHasManuallyChanged(true);
    }

    // If checking "same as default", clear secondary fields
    if (isChecked) {
      formik.setFieldValue(
        secondaryAddressVariable.secondaryAddress1.id,
        "",
        false
      );
      formik.setFieldValue(
        secondaryAddressVariable.secondaryAddress2.id,
        "",
        false
      );
      formik.setFieldValue(
        secondaryAddressVariable.secondaryCity.id,
        "",
        false
      );
      formik.setFieldValue(
        secondaryAddressVariable.secondaryState.id,
        "",
        false
      );
      formik.setFieldValue(secondaryAddressVariable.secondaryZip.id, "", false);
    }
  };

  const handleCancelSecondaryAddress = () => {
    setSecondaryAdd(true);
    formik.setFieldValue(
      secondaryAddressVariable.secondaryAddress1.id,
      "",
      false
    );
    formik.setFieldValue(
      secondaryAddressVariable.secondaryAddress2.id,
      "",
      false
    );
    formik.setFieldValue(secondaryAddressVariable.secondaryCity.id, "", false);
    formik.setFieldValue(secondaryAddressVariable.secondaryState.id, "", false);
    formik.setFieldValue(secondaryAddressVariable.secondaryZip.id, "", false);

    // Reset to initial state
    if (initialFormValues) {
      setUserHasManuallyChanged(false);
    }
  };

  return (
    <form
      className="common-form d-flex flex-column"
      onSubmit={formik.handleSubmit}
    >
      <div className="form-section">
        {/* <div
          className="d-flex align-items-center
                           justify-content-between form-sec-header"
        >
          <div className="topic">
            <Img name="primary-address"></Img>Primary Address
          </div>
        </div> */}
        <div className="form-body">
          <div
            className="d-flex align-items-center flex-wrap form-grid-1 p-4"
            style={{ rowGap: "4rem", gap: "4rem 1rem" }}
          >
            <div className="w-100">
              <p className="sec-topic">Primary Address</p>
            </div>
            {variable.map((item, idx) => (
              <div
                key={idx}
                style={{
                  ...(item.size === "xl" && { width: "100%" }),
                }}
              >
                <BInputFields variable={item} formik={formik} />
              </div>
            ))}
            <div className="w-100">
              <p className="sec-topic">Secondary Address</p>
            </div>
            <div className="w-100-2 mb-3  ">
              <BInputText
                variable={secondaryAddressVariable.secondaryAddress1}
                formik={formik}
              ></BInputText>
            </div>
            <div className="w-100-2  mb-3 ">
              <BInputText
                variable={secondaryAddressVariable.secondaryAddress2}
                formik={formik}
              ></BInputText>
            </div>
            <div className="w-100-3 mb-3 ">
              <BInputText
                variable={secondaryAddressVariable.secondaryCity}
                formik={formik}
              ></BInputText>
            </div>
            <div className="w-100-3 mb-3 ">
              <BSelect
                variable={secondaryAddressVariable.secondaryState}
                formik={formik}
              ></BSelect>
            </div>
            <div className="w-100-3 mb-3">
              <BInputText
                variable={secondaryAddressVariable.secondaryZip}
                formik={formik}
              ></BInputText>
            </div>
          </div>
          <div className="d-flex align-items-center gap-3 p-3">
            <div className="w-100-3">
              <Button
                label="Generate Document"
                type="submit"
                data-testid="generate-doc-btn"
                severity="warning"
                className="border-radius-0 primary-btn "
                disabled={!userHasManuallyChanged || !isFormInitialized}
                // onClick={(e) => {
                //   e.preventDefault(); // ✅ prevent browser from changing URL
                //   // formik.handleSubmit();
                // }}
              />
            </div>
            {updatedAddressDocument?.document_id && (
              <div className="w-100-3">
                <BAttachedFile
                  file={{
                    name: updatedAddressDocument?.document_name,
                    path: updatedAddressDocument?.presigned_url,
                    id: updatedAddressDocument?.document_id,
                    document_type: updatedAddressDocument?.document_type,
                  }}
                  hideDelete={true}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      {/* <div className="w-100 mt-3 mb-3">
        <div className="d-flex align-items-center">
          <Checkbox
            inputId="secondaryAdrress"
            name="secondaryAdrress"
            value={true}
            onChange={(e) => handleSecondaryAddressChange(e.checked)}
            checked={secondaryAdd}
          />
          <label htmlFor="secondaryAdrress" className="ms-2">
            Mailing address is same as default
          </label>
        </div>
      </div> */}
      {/* {!secondaryAdd && (
        <div className="form-section">
          <div
            className="d-flex align-items-center
                 justify-content-between form-sec-header"
          >
            <div className="topic">
              <Img name="primary-address"></Img>Secondary Address
            </div>
          </div>
          <div className="form-body">
            <div
              className="d-flex flex-column common-gap p-2"
              style={{ rowGap: "4rem", gap: "4rem 1rem" }}
            >
              <div className="d-flex align-items-center flex-wrap form-grid-1 w-90">
                <div className="w-100-2 mb-3  ">
                  <BInputText
                    variable={secondaryAddressVariable.secondaryAddress1}
                    formik={formik}
                  ></BInputText>
                </div>
                <div className="w-100-2  mb-3 ">
                  <BInputText
                    variable={secondaryAddressVariable.secondaryAddress2}
                    formik={formik}
                  ></BInputText>
                </div>
              </div>
              <div className="w-100 d-flex align-items-center flex-wrap form-grid-1">
                <div className="w-100-3">
                  <BInputText
                    variable={secondaryAddressVariable.secondaryCity}
                    formik={formik}
                  ></BInputText>
                </div>
                <div className="w-100-3">
                  <BSelect
                    variable={secondaryAddressVariable.secondaryState}
                    formik={formik}
                  ></BSelect>
                </div>
                <div className="w-100-3">
                  <BInputText
                    variable={secondaryAddressVariable.secondaryZip}
                    formik={formik}
                  ></BInputText>
                </div>
              </div>
            </div>
            <div className="d-flex align-items-center justify-content-end mt-3">
              <Button
                text
                label="Cancel"
                type="button"
                className="text-black gap-2"
                onClick={handleCancelSecondaryAddress}
              />
            </div>
          </div>
        </div>
      )} */}

      <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        <Button
          disabled={
            !isProcessDataSuccess ||
            !hasAccess ||
            !(
              updatedAddressDocument?.document_id &&
              updatedAddressDocument?.presigned_url
            )
          }
          type="button"
          label="Submit Address Details"
          severity="warning"
          className="border-radius-0 primary-btn"
          onClick={() => {
            completeStep();
          }}
        />
      </div>
    </form>
  );
};

export default EnterAddressDetail;
