import React, { useEffect, useState } from "react";
import Img from "../../components/Img";
import { Button } from "primereact/button";
import { useFormik } from "formik";
import { leaseDetail as variable } from "../../utils/variables";
import { Checkbox } from "primereact/checkbox";
import BCaseCard from "../../components/BCaseCard";
import BModal from "../../components/BModal";
import BUpload from "../../components/BUpload";
import BCalendar from "../../components/BCalendar";
import BSelect from "../../components/BSelect";
import BRadio from "../../components/BRadio";
import { useParams } from "react-router-dom";
import {
  useGetCaseDetailQuery,
  useGetStepInfoQuery,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
  useLazyGetStepInfoQuery,
} from "../../redux/api/medallionApi";
import {
  isEndDateAfterStartDate,
  yearMonthDate,
} from "../../utils/dateConverter";
import { getActiveComponent } from "../../redux/slice/componentSlice";
import { useSelector } from "react-redux";
import BAttachedFile from "../../components/BAttachedFile";
import { getCurrentStep } from "../../utils/caseUtils";
import BInputText from "../../components/BInputText";
import { ENTER_LEASE_DETAIL, LEASE_DETAIL } from "../../utils/constants";
import BInputNumber from "../../components/BInputNumber";

const LeaseDetail = ({
  caseId,
  currentStepId,
  isCaseSuccess,
  reload,
  currentStep,
  caseData,
  hasAccess,
}) => {
  const params = useParams();
  const [processFlow, { isSuccess: isProccessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [moveCase] = useMoveCaseDetailMutation();
  //const currentStepId = useSelector(getActiveComponent);
  const [file, setFile] = useState(null);
  const [submit, setSubmit] = useState(false);
  const [isDocumentGenerated, setDocumentGenerated] = useState(true);
  const [triggerGetStepInfo, { data: stepInfoData, isFetching, isSuccess }] =
    useLazyGetStepInfoQuery();
  // 🔹 Call API on page load
  useEffect(() => {
    if (caseId && currentStepId) {
      triggerGetStepInfo({ caseNo: caseId, step_no: "109" });
    }
  }, [caseId, currentStepId, triggerGetStepInfo]);

  // const {
  //   data: currentStep,
  //   isSuccess: isStepInfoSuccess,
  //   refetch,
  // } = useGetStepInfoQuery({
  //   caseNo: caseId,
  //   step_no: currentStepId,
  // });
  // const { data: caseData } = useGetCaseDetailQuery(caseId, {
  //   skip: !caseId,
  // });
  const [checked, setChecked] = useState(false);
  const formik = useFormik({
    initialValues: {
      [variable.contract_term.id]: "",
      [variable.contract_effective_date.id]: "",
      [variable.royalty_payment_amount.id]: 0,

      [variable.field_03.id]: "",
      [variable.field_04.id]: "",
      [variable.field_05.id]: "P",
      [variable.field_06.id]: "",
      [variable.field_07.id]: "",
      [variable.field_08.id]: "",
      [variable.field_09.id]: false,
      [variable.field_10.id]: "",
      [variable.field_11.id]: "",
    },
    validateOnChange: true,
    validateOnMount: true,
    validate: (values) => {
      const requiredFields = [
        variable.contract_term,
        variable.contract_effective_date,
        variable.royalty_payment_amount,
      ];
      const errors = {};
      requiredFields.forEach((field) => {
        if (!values[field.id]) {
          errors[field.id] = `${field.label} is required`;
        }
      });

      // if (!values[variable.field_03.id]) {
      //   errors[variable.field_03.id] = `${variable.field_03.label} is required`;
      // }
      // if (!values[variable.field_04.id]) {
      //   errors[variable.field_04.id] = `${variable.field_04.label} is required`;
      // }
      // if (!values[variable.field_05.id]) {
      //   errors[variable.field_05.id] = `${variable.field_05.label} is required`;
      // }

      // if (values[variable.field_05.id]?.code === "M") {
      //   if (!values[variable.field_06.id]) {
      //     errors[
      //       variable.field_06.id
      //     ] = `${variable.field_06.label} is required`;
      //   }
      //   if (!values[variable.field_07.id]) {
      //     errors[
      //       variable.field_07.id
      //     ] = `${variable.field_07.label} is required`;
      //   }
      // }

      // if (!values[variable.field_10.id]) {
      //   errors[variable.field_10.id] = `${variable.field_10.label} is required`;
      // }

      // if (
      //   values[variable.field_03.id] &&
      //   values[variable.field_04.id] &&
      //   !isEndDateAfterStartDate(
      //     values[variable.field_03.id],
      //     values[variable.field_04.id]
      //   )
      // ) {
      //   errors[
      //     variable.field_04.id
      //   ] = `${variable.field_04.label} must be a date after ${variable.field_03.label} date`;
      // }

      // if (
      //   values[variable.field_06.id] &&
      //   values[variable.field_07.id] &&
      //   !isEndDateAfterStartDate(
      //     values[variable.field_06.id],
      //     values[variable.field_07.id],
      //     true
      //   )
      // ) {
      //   errors[
      //     variable.field_07.id
      //   ] = `${variable.field_07.label} must be a date after ${variable.field_06.label} date`;
      // }

      return errors;
    },
    onSubmit: (values) => {
      console.log("lease detail on submit", values, {
        contract_effective_from: yearMonthDate(values.contract_effective_date),
        royalty_amount: values.royalty_payment_amount
          ? parseFloat(values.royalty_payment_amount)
          : 0,
        contract_signed_mode: values.contract_signed_mode?.code,
        contract_term: values.contract_term?.code,
      });
      console.log(
        "Move api",
        getCurrentStep(caseData?.steps)?.step_id,
        LEASE_DETAIL,
        getCurrentStep(caseData?.steps).is_current_step
      );
      processFlow({
        params: caseId,
        data: {
          step_id: currentStepId,
          data: {
            contract_effective_from: yearMonthDate(
              values.contract_effective_date
            ),
            royalty_amount: parseFloat(values.royalty_payment_amount) || 0,
            contract_signed_mode: values.contract_signed_mode?.code,
            contract_term: values.contract_term?.code,
          },
        },
      })
        .unwrap()
        .then(() => {
          if (
            getCurrentStep(caseData?.steps)?.step_id == LEASE_DETAIL &&
            getCurrentStep(caseData?.steps).is_current_step
          ) {
            moveCase({ params: caseId })
              .unwrap()
              .then(() => {
                reload();
              });
          }
        });
    },
  });

  // useEffect(() => {
  //   if (isProccessDataSuccess && getCurrentStep(caseData?.steps).step_id == LEASE_DETAIL && getCurrentStep(caseData?.steps).is_current_step) {
  //     console.log("movecase useEffect()");
  //     moveCase({ params: caseId }).unwrap().then(()=>{
  //       reload();
  //     });
  //   }
  // }, [isProccessDataSuccess]);
  useEffect(() => {
    if (
      currentStep?.royalty_document?.presigned_url &&
      currentStep?.lease_document?.presigned_url
    ) {
      setDocumentGenerated(false);
    }
  }, [currentStep]);
  useEffect(() => {
    console.log(
      "currentStep useEffect()",
      currentStep,
      caseData,
      currentStep?.medallion_lease_details?.contract_term
    );
    if (currentStep) {
      if (
        currentStep?.medallion_lease_details?.contract_term &&
        currentStep?.medallion_lease_details?.contract_term !==
          formik.values[variable.contract_term.id]?.code
      ) {
        const matchedOption = variable.contract_term.options.find(
          (item) =>
            item.code === currentStep?.medallion_lease_details?.contract_term
        );
        formik.setFieldValue(
          variable.contract_term.id,
          matchedOption || "",
          true
        );
      }
      const apiDateStr =
        currentStep?.medallion_lease_details?.contract_start_date;
      const formDateVal = formik.values[variable.contract_effective_date.id];

      if (apiDateStr) {
        const apiDate = new Date(apiDateStr);
        const formDate = formDateVal ? new Date(formDateVal) : null;

        const apiDateValid = apiDate instanceof Date && !isNaN(apiDate);
        const formDateValid = formDate instanceof Date && !isNaN(formDate);

        // Only compare toISOString if both valid, otherwise treat as different
        const isDifferent =
          !formDateValid ||
          (apiDateValid &&
            formDateValid &&
            apiDate.toISOString().split("T")[0] !==
              formDate.toISOString().split("T")[0]);

        if (apiDateValid && isDifferent) {
          formik.setFieldValue(variable.contract_effective_date.id, apiDate);
        }
      }
      // formik.setFieldValue(
      //   variable.contract_effective_date.id,
      //   currentStep?.[variable.contract_effective_date.id]
      //     ? new Date(currentStep?.[variable.contract_effective_date.id])
      //     : "",
      //   true
      // );
      const matchedOption = variable.field_05.options.find(
        (item) =>
          item.code === currentStep?.medallion_lease_details?.contract_term
      );

      // // Set the default to the "Print" option object if no match found
      const defaultOption = variable.field_05.options.find(
        (item) => item.code === "P"
      );

      formik.setFieldValue(
        variable.field_05.id,
        matchedOption || defaultOption, // Use the actual option object, not string
        true
      );
      if (
        currentStep?.medallion_lease_details?.royalty_amount &&
        currentStep?.medallion_lease_details?.royalty_amount !=
          formik.values[variable.royalty_payment_amount.id]
      ) {
        formik.setFieldValue(
          variable.royalty_payment_amount.id,
          currentStep?.medallion_lease_details?.royalty_amount || 0
        );
      }
      if (
        currentStep?.medallion_lease_details?.contract_signed_mode &&
        currentStep?.medallion_lease_details?.contract_signed_mode !==
          formik.values[variable.field_05.id]?.code
      ) {
        const matchedOption = variable.field_05.options.find(
          (item) =>
            item.code ===
            currentStep?.medallion_lease_details?.contract_signed_mode
        );
        formik.setFieldValue(variable.field_05.id, matchedOption);
      }
    }
  }, [currentStep]);
  const formatAddressAdvanced = (address) => {
    if (!address) return "No address available";

    const addressParts = [];

    // Street address (line 1 and line 2)
    const streetAddress = [address.address_line_1, address.address_line_2]
      .filter(Boolean) // Remove null/undefined values
      .join(", ");

    if (streetAddress) addressParts.push(streetAddress);

    // City, State ZIP
    const cityStateZip = [address.city, address.state, address.zip]
      .filter(Boolean)
      .join(", ");

    if (cityStateZip) addressParts.push(cityStateZip);

    return addressParts.length > 0
      ? addressParts.join(", ")
      : "Incomplete address";
  };
  useEffect(() => {
    if (isProccessDataSuccess) {
      triggerGetStepInfo({ caseNo: caseId, step_no: "109" });
    }
  }, [isProccessDataSuccess]);

  const generateDocument = (values) => {
    const data = {
      contract_effective_from: yearMonthDate(values.contract_effective_date),
      royalty_amount: parseFloat(values.royalty_payment_amount) || 0,
      contract_signed_mode: values.contract_signed_mode?.code || "P",
      contract_term: values.contract_term?.code,
    };
    processFlow({
      params: caseId,
      data: {
        step_id: currentStepId,
        data,
      },
    })
      .unwrap()
      .then(() => {
        reload();
      });
  };

  return (
    <div>
      {/* <div className="topic-txt d-flex align-items-center gap-2">
        <Img name="lease" className="icon-black"></Img>Enter Contract Details
      </div>
      <div className="d-flex align-items-center gap-5 py-4">
        <BCaseCard
          label="Medallion Owner Name"
          value={currentStep?.medallion_owner_name}
        />
        <BCaseCard label="SSN" value={currentStep?.medallion_ssn} />
        <BCaseCard label="Passport" value={currentStep?.medallion_passport} />
        <BCaseCard
          label="Contact"
          value={currentStep?.primary_email_address}
        />
      </div> */}
      <form
        action=""
        className="common-form d-flex flex-column gap-5 mt-2"
        onSubmit={formik.handleSubmit}
      >
        <div className="form-section common-form d-flex flex-column gap-2">
          <div className="form-body">
            <div
              className="d-flex align-items-center flex-wrap form-grid-1 w-100 p-3 mb-3"
              style={{ rowGap: "4rem", gap: "4rem 1rem" }}
            >
              <div className="w-100-4">
                <BSelect
                  variable={variable.contract_term}
                  formik={formik}
                  isRequire={true}
                ></BSelect>
              </div>
              <div className="w-100-4">
                <BCalendar
                  variable={variable.contract_effective_date}
                  formik={formik}
                  isRequire={true}
                ></BCalendar>
              </div>
              <div className="w-100-4">
                <BInputNumber
                  variable={variable.royalty_payment_amount}
                  formik={formik}
                  isRequire={true}
                  isCurrency={true}
                ></BInputNumber>
              </div>
              <div className="w-100-4">
                <Button
                  label="Generate Documents"
                  type="button"
                  data-testid="generate-doc-btn"
                  severity="warning"
                  onClick={() => generateDocument(formik.values)}
                  className="border-radius-0 primary-btn "
                  disabled={
                    !hasAccess ||
                    !formik.values[variable.contract_term.id] ||
                    !formik.values[variable.contract_effective_date.id] ||
                    !formik.values[variable.royalty_payment_amount.id]
                  }
                />
              </div>
              {/* <div className="w-100 d-flex flex-wrap gap-3 "> */}

              <div className="d-flex flex-wrap gap-3 ">
                {/* {currentStep?.lease_document?.presigned_url && (
                  <BAttachedFile
                    file={{
                      name: currentStep?.lease_document?.document_name,
                      path: currentStep?.lease_document?.presigned_url,
                      id: currentStep?.lease_document?.document_id,
                    }}
                  />
                )} */}
                {currentStep?.cover_letter_document?.presigned_url && (
                  <BAttachedFile
                    file={{
                      name: currentStep?.cover_letter_document?.document_name,
                      path: currentStep?.cover_letter_document?.presigned_url,
                      id: currentStep?.cover_letter_document?.document_id,
                      document_type:
                        currentStep?.cover_letter_document?.document_type,
                    }}
                  />
                )}
                {currentStep?.royalty_document?.presigned_url && (
                  <BAttachedFile
                    file={{
                      name: currentStep?.royalty_document?.document_name,
                      path: currentStep?.royalty_document?.presigned_url,
                      id: currentStep?.royalty_document?.document_id,
                      document_type:
                        currentStep?.royalty_document?.document_type,
                    }}
                  />
                )}
                {currentStep?.lease_document?.presigned_url && (
                  <BAttachedFile
                    file={{
                      name: currentStep?.lease_document?.document_name,
                      path: currentStep?.lease_document?.presigned_url,
                      id: currentStep?.lease_document?.document_id,
                      document_type: currentStep?.lease_document?.document_type,
                    }}
                  />
                )}
                {currentStep?.power_of_attorney_document?.presigned_url && (
                  <BAttachedFile
                    file={{
                      name: currentStep?.power_of_attorney_document
                        ?.document_name,
                      path: currentStep?.power_of_attorney_document
                        ?.presigned_url,
                      id: currentStep?.power_of_attorney_document?.document_id,
                      document_type:
                        currentStep?.power_of_attorney_document?.document_type,
                    }}
                  />
                )}
              </div>
            </div>
            <div className="w-25 p-3">
              <BSelect
                variable={variable.field_05}
                formik={formik}
                isRequire={true}
              ></BSelect>
            </div>
          </div>
          <div className="form-body">
            <div className="d-flex align-items-center flex-wrap form-grid-1 column-gap-4 w-100">
              <BCaseCard
                label={"Owner Name"}
                className={"col-md-3"}
                value={currentStep?.medallion_owner_name || "-"}
              />
              <BCaseCard
                label={"Owner Type"}
                className={"col-md-3"}
                value={currentStep?.owner_type || "-"}
              />
              <BCaseCard
                label={"Owner Address"}
                className={"col-md-3"}
                value={formatAddressAdvanced(currentStep?.owner_address)}
              />
              <BCaseCard
                label={"Phone"}
                className={"col-md-3"}
                value={currentStep?.primary_contact_nember || "-"}
              />
              <BCaseCard
                label={"Email"}
                className={"col-md-3"}
                value={currentStep?.primary_email_address || "-"}
              />
              <BCaseCard
                label={"EIN/SSN"}
                className={"col-md-3"}
                value={currentStep?.medallion_ssn || "-"}
              />
            </div>
          </div>
          {/* )} */}
        </div>
        <div className="w-100 position-sticky bottom-0 py-3 bg-white">
          {/* <div
            className={`d-flex align-items-center pb-3 gap-3 ${
              submit && !checked ? "text-danger" : ""
            }`}
          >
            <Checkbox
              inputId="accept"
              name="accept"
              onChange={(e) => setChecked(e.checked)}
              checked={checked}
            />
            <label htmlFor="accept" data-testid="accept" className="ml-2">
              By Accepting , It is Confirmed that documents are verified and
              contract is signed to create a medallion{" "}
            </label>
          </div> */}
          <Button
            label="Submit"
            type="submit"
            data-testid="lease-detail-submit"
            severity="warning"
            disabled={
              isDocumentGenerated || !formik.values.contract_signed_mode
            }
            // onClick={() => {
            //   setSubmit(true);
            // }}
            className="border-radius-0 primary-btn "
          />
          {/* <Button
            label="Back to Enter Medallion Details"
            //severity="secondary"
            text
          /> */}
        </div>
      </form>
    </div>
  );
};

export default LeaseDetail;
