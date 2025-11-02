import { useFormik } from "formik";
import Img from "../../components/Img";
import { Button } from "primereact/button";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  statesOptions,
  createIndividualOwner as variable,
} from "../../utils/variables";
import BInputText from "../../components/BInputText";
import BUploadInput from "../../components/BUploadInput";
import BCalendar from "../../components/BCalendar";
import BSelect from "../../components/BSelect";
import BRadio from "../../components/BRadio";
import {
  useGetStepInfoQuery,
  useLazyGetStepInfoQuery,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../redux/api/medallionApi";
import { useParams } from "react-router-dom";
import { CREATE_INDIVIDUAL_OWNER } from "../../utils/constants";
import { yearMonthDate } from "../../utils/dateConverter";
import BInputNumber from "../../components/BInputNumber";
import { Checkbox } from "primereact/checkbox";
import { removeUnderScore } from "../../utils/utils";
import { getCurrentStep } from "../../utils/caseUtils";
import { useGetBankDetailsMutation } from "../../redux/api/individualListApi";
import { setIsUpload } from "../../redux/slice/uploadSlice";
import { useDispatch, useSelector } from "react-redux";
import BInputFileView from "../../components/BInputFileView";
import BAttachedFile from "../../components/BAttachedFile";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import PdfViewModal from "../../components/PdfViewModal";
import BInputFileViewSSN from "../../components/BInputFileViewSSN";
import {
  validateBankName,
  validateDMVLicenseNumber,
  validateDrivingLicenseNumber,
  validateNameField,
  validateOptionalNameField,
  validateUSZipCode,
  validatePassportNumber,
  validateRoutingNumber,
  validateBankAccountNumber,
} from "../../utils/formUitiles";
import BToast from "../../components/BToast";

const CreateIndividualOwner = ({
  reload,
  currentStep,
  currentStepId,
  caseId,
  caseData,
  hasAccess,
}) => {
  const params = useParams();
  const [getBankDetails, { data }] = useGetBankDetailsMutation();
  const isUpload = useSelector((state) => state.upload.isUpload);
  const dispatch = useDispatch();

  const [secondaryAdd, setSecondaryAdd] = useState(true);
  const [processFlow, { isSuccess: isProccessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [moveCase] = useMoveCaseDetailMutation();
  // const { data: stepInfoData, isSucces: isStepInfoSuccess } =
  //   useGetStepInfoQuery(
  //     { caseNo: caseId, step_no: currentStepId },
  //     { skip: !caseId }
  //   );
  const [triggerGetStepInfo, { data: stepInfoData, isFetching, isSuccess }] =
    useLazyGetStepInfoQuery();
  const toast = useRef(null);
  const [isErrorActive, setIsErrorActive] = useState(false); // Prevents error toast stacking
  console.log("Step infor data", currentStep);
  const validateZipCodeField = (value) => {
    const result = validateUSZipCode(value);
    return result.isValid ? undefined : result.message;
  };
  // 🔹 Call API on page load
  useEffect(() => {
    if (caseId && currentStepId) {
      triggerGetStepInfo({ caseNo: caseId, step_no: "174" });
    }
  }, [caseId, currentStepId, triggerGetStepInfo]);
  const formik = useFormik({
    initialValues: {
      [variable.field_01.id]: "",
      [variable.field_02.id]: "",
      [variable.field_03.id]: "",
      [variable.field_04.id]: "",
      // [variable.field_05.id]: "",
      // [variable.field_06.id]: {
      //   name: "Driving License",
      //   code: "drivingLicense",
      // },
      [variable.field_07.id]: "",
      //[variable.field_08.id]: "",
      [variable.field_09.id]: "",
      //[variable.field_10.id]: "",
      [variable.field_11.id]: "",
      [variable.field_12.id]: "",
      [variable.field_13.id]: "",
      [variable.field_14.id]: "",
      [variable.field_15.id]: "",
      [variable.field_16.id]: "",
      [variable.field_17.id]: "",
      [variable.field_18.id]: "",
      [variable.field_19.id]: "",
      [variable.field_20.id]: "",
      [variable.field_21.id]: "",
      [variable.field_22.id]: "",
      // [variable.field_23.id]: "",
      // [variable.field_24.id]: "",
      [variable.field_25.id]: "Check",
      [variable.field_26.id]: "",
      [variable.field_27.id]: "",
      [variable.field_28.id]: "",
      [variable.field_29.id]: "",
      [variable.field_30.id]: "",
      // [variable.field_31.id]: "",
      // [variable.field_32.id]: "",
      // [variable.field_33.id]: "",
      // [variable.field_34.id]: "",
      // [variable.field_35.id]: "",
      // [variable.field_36.id]: "",
      // [variable.field_37.id]: "",
      [variable.field_38.id]: "",
      [variable.field_39.id]: "",
      [variable.field_40.id]: "",
      // [variable.field_41.id]: "",
      [variable.field_42.id]: "",
    },
    validateOnChange: true,
    // validateOnBlur: true,
    enableReinitialize: true,
    validate: (values) => {
      const errors = {};
      const digitRegex = /^\d+$/;
      const alphaRegex = /^[A-Za-z\s]+$/;
      // if (!values[variable.field_01.id]) {
      //   errors[variable.field_01.id] = `${variable.field_01.label} is required`;
      // } else if (values[variable.field_01.id].length < 3) {
      //   errors[
      //     variable.field_01.id
      //   ] = `${variable.field_01.label} must be at least 3 characters`;
      // } else if (values[variable.field_01.id].length > 25) {
      //   errors[
      //     variable.field_01.id
      //   ] = `${variable.field_01.label} cannot exceed 25 characters`;
      // }

      const firstNameError = validateNameField(
        values[variable.field_01.id],
        "First Name"
      );
      if (firstNameError) {
        errors.firstName = firstNameError;
      }

      const middleNameError = validateOptionalNameField(
        values.middleName,
        "Middle Name"
      );
      if (middleNameError) {
        errors.middleName = middleNameError;
      }

      const lastNameError = validateNameField(values.lastName, "Last Name");
      if (lastNameError) {
        errors.lastName = lastNameError;
      }
      // if (!values[variable.field_03.id]) {
      //   errors[variable.field_03.id] = `${variable.field_03.label} is required`;
      // } else if (values[variable.field_03.id].length < 3) {
      //   errors[
      //     variable.field_03.id
      //   ] = `${variable.field_03.label} must be at least 3 characters`;
      // } else if (values[variable.field_03.id].length > 20) {
      //   errors[
      //     variable.field_03.id
      //   ] = `${variable.field_03.label} cannot exceed 20 characters`;
      // }

      if (!values[variable.field_04.id]) {
        errors[variable.field_04.id] = `${variable.field_04.label} is required`;
      } else if (
        !/^[\dX]{9}$/.test(values[variable.field_04.id]) && // 9 digits/X
        !/^[\dX]{3}-[\dX]{2}-[\dX]{4}$/.test(values[variable.field_04.id]) // XXX-XX-XXXX
      ) {
        errors[variable.field_04.id] =
          "SSN must be 9 digits in the format XXX-XX-XXXX";
      }

      // if (values[variable.field_05.id] >= new Date()) {
      //   errors[
      //     variable.field_05.id
      //   ] = `${variable.field_05.label} must be in the past`;
      // }

      // if (!values[variable.field_06.id]) {
      //   errors[variable.field_06.id] = `${variable.field_06.label} is required`;
      // }

      // if (!values[variable.field_07.id]) {
      //   errors[variable.field_07.id] = `${variable.field_07.label} is required`;
      // }
      const drivingLicenseError = validateDrivingLicenseNumber(
        values.drivingLicenseNo
      );
      if (drivingLicenseError) {
        errors.drivingLicenseNo = drivingLicenseError;
      }

      if (values.passportNo) {
        const passportError = validatePassportNumber(values.passportNo);
        if (passportError) {
          errors.passportNo = passportError;
        }
      }

      // if (!values[variable.field_08.id]) {
      //   errors[variable.field_08.id] = `${variable.field_08.label} is required`;
      // }

      // if (!values[variable.field_09.id]) {
      //   errors[variable.field_09.id] = `${variable.field_09.label} is required`;
      // }
      // if (!values[variable.field_10.id]) {
      //   errors[variable.field_10.id] = `${variable.field_10.label} is required`;
      // }

      if (!values[variable.field_11.id]) {
        errors[variable.field_11.id] = `${variable.field_11.label} is required`;
      }
      if (!values[variable.field_13.id]) {
        errors[variable.field_13.id] = `${variable.field_13.label} is required`;
      }
      if (!values[variable.field_14.id]) {
        errors[variable.field_14.id] = `${variable.field_14.label} is required`;
      }
      if (!values[variable.field_15.id]) {
        errors[variable.field_15.id] = `${variable.field_15.label} is required`;
      }
      const zipError = validateZipCodeField(values.primaryZip);
      if (zipError) {
        errors["primaryZip"] = zipError;
      }

      if (!secondaryAdd) {
        if (!values[variable.field_18.id]) {
          errors[
            variable.field_18.id
          ] = `${variable.field_18.label} is required`;
        }
        if (!values[variable.field_20.id]) {
          errors[
            variable.field_20.id
          ] = `${variable.field_20.label} is required`;
        }
        if (!values[variable.field_21.id]) {
          errors[
            variable.field_21.id
          ] = `${variable.field_21.label} is required`;
        }
        if (!values[variable.field_22.id]) {
          errors[
            variable.field_22.id
          ] = `${variable.field_22.label} is required`;
        }
        const secondaryZipError = validateZipCodeField(values.secondaryZip);
        if (secondaryZipError) {
          errors["secondaryZip"] = secondaryZipError;
        }
      }

      if (values[variable.field_25.id] === "Check") {
        if (!values[variable.field_38.id]) {
          errors[
            variable.field_38.id
          ] = `${variable.field_38.label} is required`;
        } else if (!alphaRegex.test(values[variable.field_38.id])) {
          errors[variable.field_38.id] = "Payee should only contain letters";
        } else if (/^\s|\s$/.test(values[variable.field_38.id])) {
          errors[variable.field_38.id] =
            "Payee Name cannot start or end with spaces";
        }
        // if (!values[variable.field_30.id]) {
        //   errors[
        //     variable.field_30.id
        //   ] = `${variable.field_30.label} is required`;
        // }
      } else {
        // if (!values[variable.field_26.id]) {
        //   errors[
        //     variable.field_26.id
        //   ] = `${variable.field_26.label} is required`;
        // } else if (!digitRegex.test(values.bank_routing_number)) {
        //   errors["bank_routing_number"] =
        //     "Route Number must contain only digits";
        // }

        const routingError = validateRoutingNumber(
          values[variable.field_26.id]
        );
        if (routingError) {
          errors["bank_routing_number"] = routingError;
        }

        // if (!values[variable.field_27.id]) {
        //   errors[
        //     variable.field_27.id
        //   ] = `${variable.field_27.label} is required`;
        // }
        const bankNameError = validateBankName(values.bankName);
        if (bankNameError) {
          errors.bankName = bankNameError;
        }
        // if (!values[variable.field_28.id]) {
        //   errors[
        //     variable.field_28.id
        //   ] = `${variable.field_28.label} is required`;
        // } else if (!digitRegex.test(values.bankAccountNumber)) {
        //   errors["bankAccountNumber"] =
        //     "Bank Account Number must contain only digits";
        // }
        const bankAccError = validateBankAccountNumber(
          values[variable.field_28.id]
        );
        if (bankAccError) {
          errors["bankAccountNumber"] = bankAccError;
        }
        if (!values[variable.field_29.id]) {
          errors[
            variable.field_29.id
          ] = `${variable.field_29.label} is required`;
        }
        if (
          values[variable.field_28.id] &&
          values[variable.field_29.id] &&
          values[variable.field_28.id] !== values[variable.field_29.id]
        ) {
          errors[variable.field_29.id] = `Bank Account Number does not match`;
        }
        if (!values[variable.field_30.id]) {
          errors[
            variable.field_30.id
          ] = `${variable.field_30.label} is required`;
        } else if (!alphaRegex.test(values.payee)) {
          errors["payee"] = "Payee should only contain letters";
        } else if (/^\s|\s$/.test(values.payee)) {
          errors["payee"] = "Payee Name cannot start or end with spaces";
        }

        if (!payeeProofDoc || !payeeProofDoc?.document_id) {
          errors.payeeProof = "Please upload the Payee Proof in Step 1";
        }
        // if (!values[variable.field_31.id]) {
        //   errors[
        //     variable.field_31.id
        //   ] = `${variable.field_31.label} do not match.`;
        // }
      }

      if (!values[variable.field_39.id]) {
        errors[variable.field_39.id] = `${variable.field_39.label} is required`;
      } else if (
        !/^(\+1\s?)?(\([2-9][0-9]{2}\)|[2-9][0-9]{2})[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/.test(
          values[variable.field_39.id]
        )
      ) {
        errors.primaryContactNumber =
          "Enter a valid US mobile number (e.g., 212-456-7890)";
      }

      if (
        values.additionalPhone1 &&
        !/^(\+1\s?)?(\([2-9][0-9]{2}\)|[2-9][0-9]{2})[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/.test(
          values.additionalPhone1
        )
      ) {
        errors.additionalPhone1 =
          "Enter a valid US mobile number (e.g., 212-456-7890)";
      }

      // if (!values["correspondence_signed_mode"]) {
      //   errors["correspondence_signed_mode"] =
      //     "Correspondence Method is required";
      // }
      // Enhanced validation with multiple checks
      const validateEmailAdvanced = (email) => {
        // Basic format check
        const basicPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // More comprehensive pattern
        const detailedPattern =
          /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

        return basicPattern.test(email) && detailedPattern.test(email);
      };

      // In validation
      if (!values[variable.field_42.id]) {
        errors[variable.field_42.id] = `${variable.field_42.label} is required`;
      } else if (!validateEmailAdvanced(values[variable.field_42.id])) {
        errors[variable.field_42.id] = `Please enter a valid email address`;
      }

      console.log("🚀 ~ CreateIndividualOwner ~ errors:", errors);
      return errors;
    },
    onSubmit: (values) => {
      let payload = {
        first_name: values["firstName"],
        middle_name: values["middleName"],
        last_name: values["lastName"],
        ssn: values["ssn"],
        passport_number: values["passportNo"],
        driving_license: values["drivingLicenseNo"],
        driving_license_expiry_date: yearMonthDate(
          values["drivingLicenseExpiryDate"]
        ),
        dob: yearMonthDate(values["dob"]),
        effective_from: yearMonthDate(values["effectiveFrom"]),
        address_line_1: values["primaryAddress1"],
        address_line_2: values["primaryAddress2"],
        city: values["primaryCity"],
        state: values["primaryState"]?.code,
        zip: values["primaryZip"],
        pay_to: values["payTo"],
        // bank_name: values["bankName"].toUpperCase(),
        // bank_account: values["bankAccountNumber"],
        // bank_account_name: values["payee"],
        // bank_address_line_1: values["bankAddress1"],
        // bank_address_line_2: values["bankAddress2"],
        // bank_city: values["bankCity"],
        // bank_state: values["bankState"],
        // bank_zip: values["bankZip"],
        primary_email_address: values["primaryEmailAddress"],
        primary_contact_number: values["primaryContactNumber"],
        additional_phone_number_1: values["additionalPhone1"],
        additional_phone_number_2: values["additionalPhone2"],
        secondary_address_line_1: values["secondaryAddress1"],
        secondary_address_line_2: values["secondaryAddress2"],
        secondary_city: values["secondaryCity"],
        secondary_state: values["secondaryState"]?.code,
        secondary_zip: values["secondaryZip"],
        // bank_routing_number: values["bank_routing_number"],
        // bank_account_number: values["bankAccountNumber"],
        // confirm_bank_account_number: values["confirmBankAccountNumber"],
        // correspondence_method: formik.values.correspondence_signed_mode?.code,
      };

      let paymentDetails = {};

      if (values["payTo"] === "Check") {
        paymentDetails = {
          bank_account_name: values["checkPayee"],
          bank_name: "",
          bank_account: "",
          bank_routing_number: "",
          bank_account_number: "",
          // confirm_bank_account_number: null,
        };
      } else if (values["payTo"] === "ACH") {
        paymentDetails = {
          bank_name: values["bankName"].toUpperCase(),
          bank_account_name: values["payee"],
          bank_routing_number: values["bank_routing_number"],
          bank_account_number: String(values["bankAccountNumber"]),
          bank_address_line_1: values["bankAddress1"],
          bank_address_line_2: values["bankAddress2"],
          bank_city: values["bankCity"],
          bank_state: values["bankState"],
          bank_zip: values["bankZip"],
        };
      }
      payload = {
        ...payload,
        ...paymentDetails,
      };

      if (secondaryAdd) {
        payload = {
          ...payload,
          secondary_address_line_1: values["primaryAddress1"],
          secondary_address_line_2: values["primaryAddress2"],
          secondary_city: values["primaryCity"],
          secondary_state: values["primaryState"]?.code,
          secondary_zip: values["primaryZip"],
        };
      }
      console.log(Object.keys(formik.errors).length);
      if (hasAccess) {
        processFlow({
          params: params["caseId"],
          data: {
            step_id: CREATE_INDIVIDUAL_OWNER,
            data: {
              ...payload,
            },
          },
        });
      }
      // if (hasAccess && Object.keys(formik.errors).length == 0) {
      //   console.log("payload", payload);
      //   processFlow({
      //     params: params["caseId"],
      //     data: {
      //       step_id: CREATE_INDIVIDUAL_OWNER,
      //       data: {
      //         ...payload,
      //       },
      //     },
      //   })
      //     .unwrap()
      //     .then(() => {
      //       toast.current.showToast(
      //         "Success",
      //         "Information saved successfully",
      //         "success",
      //         false,
      //         10000
      //       );
      //       if (
      //         hasAccess &&
      //         caseData &&
      //         caseData.case_info.case_status !== "Closed" &&
      //         getCurrentStep(caseData.steps).step_id === currentStepId
      //       ) {
      //         moveCase({ params: params["caseId"] })
      //           .unwrap()
      //           .then(() => {
      //             reload();
      //           });
      //       }
      //     });
      // }
      // alert(JSON.stringify(values, null, 2));
    },
  });
  useEffect(() => {
    // Force validation when any value changes
    formik.validateForm();
  }, [formik.values]);

  const errorMsgStyle = {
    color: "#ff0000",
  };
  useEffect(() => {
    if (isProccessDataSuccess) {
      toast.current.showToast(
        "Success",
        "Information Saved Sucessfully!!",
        "success",
        false,
        10000
      );
    }
    console.log(
      "Move case",
      hasAccess,
      isProccessDataSuccess,
      caseData,
      caseData.case_info.case_status,
      currentStepId,
      getCurrentStep(caseData.steps).step_id
    );
    if (
      hasAccess &&
      isProccessDataSuccess &&
      caseData &&
      caseData.case_info.case_status !== "Closed" &&
      getCurrentStep(caseData.steps).step_id === currentStepId
    ) {
      moveCase({ params: caseId })
        .unwrap()
        .then(() => {
          reload();
        });
    }
  }, [isProccessDataSuccess]);
  // individual_owner
  useEffect(() => {
    if (stepInfoData) {
      formik.setFieldValue(
        variable.field_01.id,
        stepInfoData?.individual_info?.first_name || "",
        true
      );
      formik.setFieldValue(
        variable.field_02.id,
        stepInfoData?.individual_info?.middle_name,
        true
      );
      formik.setFieldValue(
        variable.field_03.id,
        stepInfoData?.individual_info?.last_name,
        true
      );
      formik.setFieldValue(
        variable.field_04.id,
        stepInfoData?.individual_info?.ssn,
        true
      );
      // formik.setFieldValue(
      //   variable.field_05.id,
      //   stepInfoData?.individual_info?.dob
      //     ? new Date(stepInfoData?.individual_info?.dob)
      //     : "",
      //   true
      // );
      formik.setFieldValue(
        variable.field_07.id,
        stepInfoData?.individual_info?.driving_license,
        true
      );
      // formik.setFieldValue(
      //   variable.field_08.id,
      //   stepInfoData?.individual_info?.driving_license_expiry_date
      //     ? new Date(stepInfoData?.individual_info?.driving_license_expiry_date)
      //     : "",
      //   true
      // );
      formik.setFieldValue(
        variable.field_09.id,
        stepInfoData?.individual_info?.passport,
        true
      );
      // formik.setFieldValue(
      //   variable.field_10.id,
      //   stepInfoData?.individual_info?.driving_license_expiry_date
      //     ? new Date(stepInfoData?.individual_info?.driving_license_expiry_date)
      //     : "",
      //   true
      // );
      formik.setFieldValue(
        variable.field_11.id,
        stepInfoData?.primary_address?.address_line_1,
        true
      );
      formik.setFieldValue(
        variable.field_12.id,
        stepInfoData?.primary_address?.address_line_2,
        true
      );
      formik.setFieldValue(
        variable.field_13.id,
        stepInfoData?.primary_address?.city,
        true
      );

      // formik.setFieldValue(
      //   variable.field_14.id,
      //   stepInfoData?.primary_address?.state,
      //   true
      // );

      const primaryAddressState = stepInfoData?.primary_address?.state;
      if (
        primaryAddressState &&
        primaryAddressState !== formik.values.primaryState?.code
      ) {
        const matchedOption = statesOptions.find(
          (item) => item.code === primaryAddressState
        );

        formik.setFieldValue("primaryState", matchedOption || null, true);
      }

      formik.setFieldValue(
        variable.field_15.id,
        stepInfoData?.primary_address?.zip,
        true
      );
      formik.setFieldValue(
        variable.field_39.id,
        stepInfoData?.individual_info?.primary_contact_number,
        true
      );
      formik.setFieldValue(
        variable.field_40.id,
        stepInfoData?.individual_info?.additional_phone_number_1,
        true
      );
      // formik.setFieldValue(
      //   variable.field_41.id,
      //   stepInfoData?.individual_info?.additional_phone_number_2,
      //   true
      // );
      formik.setFieldValue(
        variable.field_42.id,
        stepInfoData?.individual_info?.primary_email_address,
        true
      );
      if (stepInfoData?.secondary_address?.address_line_1) {
        setSecondaryAdd(false); // Has secondary address, so not same as default
      } else {
        setSecondaryAdd(true); // No secondary address, so same as default
      }
      formik.setFieldValue(
        variable.field_18.id,
        stepInfoData?.secondary_address?.address_line_1,
        true
      );
      formik.setFieldValue(
        variable.field_19.id,
        stepInfoData?.secondary_address?.address_line_2,
        true
      );
      formik.setFieldValue(
        variable.field_20.id,
        stepInfoData?.secondary_address?.city,
        true
      );
      // formik.setFieldValue(
      //   variable.field_21.id,
      //   stepInfoData?.secondary_address?.state,
      //   true
      // );
      const secondaryAddressState = stepInfoData?.secondary_address?.state;
      if (
        secondaryAddressState &&
        secondaryAddressState !== formik.values.secondaryState?.code
      ) {
        const matchedOption = statesOptions.find(
          (item) => item.code === secondaryAddressState
        );

        formik.setFieldValue("secondaryState", matchedOption || null, true);
      }
      formik.setFieldValue(
        variable.field_22.id,
        stepInfoData?.secondary_address?.zip,
        true
      );

      if (stepInfoData?.payee_info?.pay_to_mode === "ACH") {
        formik.setFieldValue(variable.field_25.id, "ACH");
        const bank_account_details = stepInfoData?.payee_info?.data;
        const fields = [
          {
            sourceKey: "bank_routing_number",
            formikVar: variable.field_26,
          },
          {
            sourceKey: "bank_name",
            formikVar: variable.field_27,
          },
          {
            sourceKey: "bank_account_name",
            formikVar: variable.field_30,
          },
          {
            sourceKey: "bank_account_number",
            formikVar: variable.field_28,
          },
          {
            sourceKey: "bank_account_number",
            formikVar: variable.field_29,
          },
        ];
        fields.forEach(({ sourceKey, formikVar }) => {
          const valueFromApi = bank_account_details[sourceKey];
          const currentValue = formik.values[formikVar.id];

          if (valueFromApi && valueFromApi !== currentValue) {
            formik.setFieldValue(formikVar.id, valueFromApi);
          }
        });
      } else if (stepInfoData?.payee_info?.pay_to_mode === "Check") {
        formik.setFieldValue(variable.field_25.id, "Check");
      }
      if (
        stepInfoData?.payee_info?.data?.bank_account_name &&
        stepInfoData?.payee_info?.data?.bank_account_name !==
          formik.values[variable.field_38.id]
      ) {
        formik.setFieldValue(
          variable.field_38.id,
          stepInfoData?.payee_info?.data?.bank_account_name
        );
      }
      // if (
      //   currentStep?.individual_info?.correspondence_method &&
      //   currentStep?.individual_info?.correspondence_method !==
      //     formik.values.correspondence_signed_mode?.code
      // ) {
      //   const options = [
      //     { name: "In Person", code: "in_person" },
      //     { name: "Email", code: "email" },
      //     { name: "Print", code: "print" },
      //   ];

      //   const matchedOption = options.find(
      //     (item) =>
      //       item.code === currentStep?.individual_info?.correspondence_method
      //   );

      //   formik.setFieldValue(
      //     "correspondence_signed_mode",
      //     matchedOption || null,
      //     true
      //   );
      // }
    }
  }, [stepInfoData]);
  // useEffect(() => {
  //   dispatch(setIsUpload(false));
  // }, []);
  useEffect(() => {
    if (data?.name) {
      formik.setFieldValue(variable.field_27.id, data?.name?.toUpperCase());
    } else {
      // Failure case: Clear the bank name field
      formik.setFieldValue(variable.field_27.id, "");
    }
  }, [data]);

  const handleFormSubmit = async () => {
    const errors = await formik.validateForm();
    if (Object.keys(errors).length > 0) {
      formik.setTouched(
        Object.keys(errors).reduce((acc, key) => ({ ...acc, [key]: true }), {}),
        false
      );
      if (!isErrorActive) {
        toast.current.showToast(
          "Error",
          "Please complete all required fields and upload the necessary files before submitting",
          "error",
          false,
          10000
        );
        setIsErrorActive(true);
        setTimeout(() => setIsErrorActive(false), 10000);
      }
    } else {
      formik.submitForm();
    }
  };

  console.log("Current Step", currentStep);

  // const generateDocument = (values) => {
  //   let payload = {
  //     first_name: values["firstName"],
  //     middle_name: values["middleName"],
  //     last_name: values["lastName"],
  //     ssn: values["ssn"],
  //     passport_number: values["passportNo"],
  //     driving_license: values["drivingLicenseNo"],
  //     driving_license_expiry_date: yearMonthDate(
  //       values["drivingLicenseExpiryDate"]
  //     ),
  //     dob: yearMonthDate(values["dob"]),
  //     effective_from: yearMonthDate(values["effectiveFrom"]),
  //     address_line_1: values["primaryAddress1"],
  //     address_line_2: values["primaryAddress2"],
  //     city: values["primaryCity"],
  //     state: values["primaryState"]?.code,
  //     zip: values["primaryZip"],
  //     pay_to: values["payTo"],
  //     bank_name: values["bankName"].toUpperCase(),
  //     bank_account: values["bankAccountNumber"],
  //     bank_account_name: values["payee"],
  //     bank_address_line_1: values["bankAddress1"],
  //     bank_address_line_2: values["bankAddress2"],
  //     bank_city: values["bankCity"],
  //     bank_state: values["bankState"],
  //     bank_zip: values["bankZip"],
  //     primary_email_address: values["primaryEmailAddress"],
  //     primary_contact_number: values["primaryContactNumber"],
  //     additional_phone_number_1: values["additionalPhone1"],
  //     additional_phone_number_2: values["additionalPhone2"],
  //     secondary_address_line_1: values["secondaryAddress1"],
  //     secondary_address_line_2: values["secondaryAddress2"],
  //     secondary_city: values["secondaryCity"],
  //     secondary_state: values["secondaryState"]?.code,
  //     secondary_zip: values["secondaryZip"],
  //     bank_routing_number: values["bank_routing_number"],
  //     bank_account_number: values["bankAccountNumber"],
  //     confirm_bank_account_number: values["confirmBankAccountNumber"],
  //     // correspondence_method: formik.values.correspondence_signed_mode?.code,
  //   };

  //   if (secondaryAdd) {
  //     payload = {
  //       ...payload,
  //       secondary_address_line_1: values["primaryAddress1"],
  //       secondary_address_line_2: values["primaryAddress2"],
  //       secondary_city: values["primaryCity"],
  //       secondary_state: values["primaryState"]?.code,
  //       secondary_zip: values["primaryZip"],
  //     };
  //   }
  //   console.log("Payload", payload);
  //   processFlow({
  //     params: caseId,
  //     data: {
  //       step_id: currentStepId,
  //       data: {
  //         ...payload,
  //       },
  //     },
  //   })
  //     .unwrap()
  //     .then(() => {
  //       reload();
  //     });
  // };

  // const parts = currentStep?.payee_proof?.document_name?.split(".");
  // const extension = parts?.pop();
  // const filename = parts?.join(".");
  // const img = extension === "pdf" ? "pdf" : "img";
  // const path = currentStep?.payee_proof?.presigned_url;
  const mapDocumentData = (currentStep, type) => {
    const doc = stepInfoData?.documents?.find((d) => d?.document_type === type);
    return doc;
  };
  const getDocumentDetails = (item) => {
    if (item === "ssn") {
      const ssn_document = mapDocumentData(stepInfoData, "ssn");
      // console.log("ssn document", ssn_document);
      return {
        apiData: {
          ...ssn_document,
          notes: "SSN document",
        },
        document_type: [
          {
            name: "SSN Document",
            code: ssn_document?.document_type,
          },
        ],
        object_type: ssn_document?.document_object_type,
      };
    } else if (item === "license") {
      const dmv_document = mapDocumentData(stepInfoData, "driving_license");
      // console.log("license document", dmv_document);
      return {
        apiData: {
          ...dmv_document,
          notes: "Driving License document",
        },
        document_type: [
          {
            name: "Driving License Document",
            code: dmv_document?.document_type,
          },
        ],
        object_type: dmv_document?.document_object_type,
      };
    } else if (item === "passport") {
      const passport_document = mapDocumentData(stepInfoData, "passport");
      // console.log("passport document", passport_document);
      return {
        apiData: {
          ...passport_document,
        },
        document_type: [
          {
            name: "DMV License Document",
            code: passport_document?.document_type,
          },
        ],
        object_type: passport_document?.document_object_type,
      };
    }
    return null;
  };
  const payeeProofDoc = useMemo(
    () => mapDocumentData(stepInfoData, "payee_proof"),
    [stepInfoData]
  );

  const { parts, extension, filename, img, path } = useMemo(() => {
    if (!payeeProofDoc) return {};

    const parts = payeeProofDoc?.document_name?.split(".");
    const extension = parts?.pop();
    const filename = parts?.join(".");
    const img = extension === "pdf" ? "pdf" : "img";
    const path = payeeProofDoc?.presigned_url;

    return { parts, extension, filename, img, path };
  }, [payeeProofDoc]);

  return (
    <div className="postion-relative">
      <p className="sec-topic pb-3">Create Individual Owner</p>
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
              <Img name="personal"></Img>Personal Details
            </div>
            <p className="text-require ">
              (Required fields are marked with <span>*</span>)
            </p>
          </div>
          <div className="form-body">
            <div
              className="d-flex align-items-center flex-wrap form-grid-1 w-100 p-2"
              style={{ rowGap: "4rem", gap: "4rem 1rem" }}
            >
              <div className="w-100-3 ">
                <BInputText
                  variable={variable.field_01}
                  formik={formik}
                ></BInputText>
              </div>
              <div className=" w-100-3">
                <BInputText
                  variable={variable.field_02}
                  formik={formik}
                ></BInputText>
              </div>
              <div className="w-100-3">
                <BInputText
                  variable={variable.field_03}
                  formik={formik}
                ></BInputText>
              </div>
              <div className="w-100-3  mb-4">
                <BInputFileViewSSN
                  {...getDocumentDetails("ssn")}
                  variable={variable.field_04}
                  formik={formik}
                ></BInputFileViewSSN>
              </div>
              {/* <div className=" w-100-3 mb-4">
                <BCalendar
                  variable={variable.field_05}
                  formik={formik}
                ></BCalendar>
              </div> */}
              {/* <div className="w-100-3 mb-4">
                <BSelect variable={variable.field_06} formik={formik}></BSelect>
              </div> */}

              <>
                <div className="w-100-3 mb-4">
                  <BInputFileView
                    {...getDocumentDetails("license")}
                    variable={variable.field_07}
                    formik={formik}
                  ></BInputFileView>
                </div>
                {/* <div className="w-100-3 mb-4">
                  <BCalendar
                    variable={variable.field_08}
                    formik={formik}
                  ></BCalendar>
                </div> */}
              </>

              <>
                <div className="w-100-3 mb-4">
                  <BInputFileView
                    {...getDocumentDetails("passport")}
                    variable={variable.field_09}
                    formik={formik}
                  ></BInputFileView>
                </div>
                {/* <div className="w-100-3 mb-4">
                  <BCalendar
                    variable={variable.field_10}
                    formik={formik}
                  ></BCalendar>
                </div> */}
              </>
            </div>
          </div>
        </div>
        <div className="form-section">
          <div
            className="d-flex align-items-center
                 justify-content-between form-sec-header"
          >
            <div className="topic">
              <Img name="primary-address"></Img>Primary Address
            </div>
          </div>
          <div className="form-body ">
            <div className="d-flex flex-column common-gap">
              <div
                className="d-flex align-items-center flex-wrap form-grid-1 w-90 p-2"
                style={{ rowGap: "4rem", gap: "4rem 1rem" }}
              >
                <div className="w-100-2">
                  <BInputText
                    variable={variable.field_11}
                    formik={formik}
                  ></BInputText>
                </div>
                <div className="w-100-2 ">
                  <BInputText
                    variable={variable.field_12}
                    formik={formik}
                  ></BInputText>
                </div>
                <div className="w-100-3  ">
                  <BInputText
                    variable={variable.field_13}
                    formik={formik}
                  ></BInputText>
                </div>
                <div className="w-100-3  ">
                  <BSelect
                    variable={variable.field_14}
                    formik={formik}
                  ></BSelect>
                </div>
                <div className="w-100-3   ">
                  <BInputText
                    variable={variable.field_15}
                    formik={formik}
                  ></BInputText>
                </div>
                <div className="w-100-3 d-none   ">
                  <BInputText
                    variable={variable.field_16}
                    formik={formik}
                  ></BInputText>
                </div>
                <div className="w-100-3 d-none   ">
                  <BInputText
                    variable={variable.field_17}
                    formik={formik}
                  ></BInputText>
                </div>
                <div className="w-100-3  ">
                  <BInputText
                    variable={variable.field_39}
                    formik={formik}
                  ></BInputText>
                </div>
                <div className="w-100-3 ">
                  <BInputText
                    variable={variable.field_40}
                    formik={formik}
                  ></BInputText>
                </div>
                {/* <div className="w-100-3">
                  <BInputText
                    variable={variable.field_41}
                    formik={formik}
                  ></BInputText>
                </div> */}
                <div className="w-100-3">
                  <BInputText
                    variable={variable.field_42}
                    formik={formik}
                  ></BInputText>
                </div>
              </div>
            </div>

            {/* {!secondaryAdd&&<div className="d-flex align-items-center justify-content-end mt-3">
              <Button
                text
                label="Add Secondary Address"
                type="button"
                className="text-black gap-2"
                onClick={() =>{ 
                  setSecondaryAdd(true);
                    formik.setFieldValue('secAddressLine1', '',false);
                    formik.setFieldValue('secAddressLine2', '',false);
                    formik.setFieldValue('secCity', '',false);
                    formik.setFieldValue('secState', '',false);
                    formik.setFieldValue('secZip', '',false);
                    formik.setFieldValue('secLatitude', '',false);
                    formik.setFieldValue('secLongitude', '',false);
                }
                }
                icon={() => <Img name="add" />}
              />
            </div>} */}
          </div>
        </div>

        <div className="w-100">
          <div className="d-flex align-items-center">
            <Checkbox
              inputId="secondaryAdrress"
              name="secondaryAdrress"
              value={true}
              onChange={(e) => {
                setSecondaryAdd(e.checked);

                // If checking "same as default", clear secondary fields
                if (e.checked) {
                  formik.setFieldValue(variable.field_18.id, "", false);
                  formik.setFieldValue(variable.field_19.id, "", false);
                  formik.setFieldValue(variable.field_20.id, "", false);
                  formik.setFieldValue(variable.field_21.id, "", false);
                  formik.setFieldValue(variable.field_22.id, "", false);
                }
              }}
              checked={secondaryAdd}
            />
            <label htmlFor="secondaryAdrress" className="ms-2">
              Mailing address is same as default
            </label>
          </div>
        </div>

        {!secondaryAdd && (
          <div className="form-section">
            <div
              className="d-flex align-items-center
                 justify-content-between form-sec-header"
            >
              <div className="topic">
                <Img name="primary-address"></Img>Secondary Address
              </div>
            </div>
            <div className="form-body ">
              <div
                className="d-flex flex-column common-gap p-2"
                style={{ rowGap: "4rem", gap: "4rem 1rem" }}
              >
                <div className="d-flex align-items-center flex-wrap form-grid-1 w-90">
                  <div className="w-100-2 mb-3  ">
                    <BInputText
                      variable={variable.field_18}
                      formik={formik}
                    ></BInputText>
                  </div>
                  <div className="w-100-2  mb-3 ">
                    <BInputText
                      variable={variable.field_19}
                      formik={formik}
                    ></BInputText>
                  </div>
                </div>
                <div className="w-100 d-flex align-items-center flex-wrap form-grid-1">
                  <div className="w-100-3 mb-3 ">
                    <BInputText
                      variable={variable.field_20}
                      formik={formik}
                    ></BInputText>
                  </div>
                  <div className="w-100-3 mb-3 ">
                    <BSelect
                      variable={variable.field_21}
                      formik={formik}
                    ></BSelect>
                  </div>
                  <div className="w-100-3 mb-3">
                    <BInputText
                      variable={variable.field_22}
                      formik={formik}
                    ></BInputText>
                  </div>
                  {/* <div className="w-100-3  mb-3">
                    <BInputText
                      variable={variable.field_23}
                      formik={formik}
                    ></BInputText>
                  </div>
                  <div className="w-100-3 mb-3">
                    <BInputText
                      variable={variable.field_24}
                      formik={formik}
                    ></BInputText>
                  </div> */}
                </div>
              </div>
              <div className="d-flex align-items-center justify-content-end mt-3">
                <Button
                  text
                  label="Cancel"
                  type="button"
                  className="text-black gap-2"
                  onClick={() => {
                    setSecondaryAdd(true);
                    formik.setFieldValue(variable.field_18.id, "", false);
                    formik.setFieldValue(variable.field_19.id, "", false);
                    formik.setFieldValue(variable.field_20.id, "", false);
                    formik.setFieldValue(variable.field_21.id, "", false);
                    formik.setFieldValue(variable.field_22.id, "", false);
                  }}
                />
              </div>
            </div>
          </div>
        )}
        <div className="form-section">
          <div
            className="d-flex align-items-center
                 justify-content-between form-sec-header"
          >
            <div className="topic">
              <Img name="bank"></Img>Payment Method
            </div>
          </div>
          <div className="form-body" style={{ backgroundColor: "#EEEEEE" }}>
            <div
              className="form-body d-flex flex-column common-gap"
              style={{ rowGap: "4rem", gap: "4rem 1rem" }}
            >
              <div className="d-flex align-items-center flex-wrap form-grid-1 w-100">
                <div className="w-100-2">
                  <BRadio variable={variable.field_25} formik={formik}></BRadio>
                </div>
              </div>
              {formik.values[variable.field_25.id] !== "Check" ? (
                <>
                  <div className="d-flex align-items-center flex-wrap form-grid-1 w-100">
                    <div className="w-100-3">
                      <BInputText
                        variable={variable.field_26}
                        formik={formik}
                        onBlur={(e) => {
                          formik.handleBlur(e);
                          const value = e.target.value.trim();
                          if (value) {
                            getBankDetails(value);
                          }
                        }}
                      ></BInputText>
                    </div>
                    <div className="w-100-3 ">
                      <BInputText
                        variable={variable.field_27}
                        formik={formik}
                      ></BInputText>
                    </div>
                    <div className="w-100-3 ">
                      <BInputText
                        variable={variable.field_28}
                        formik={formik}
                      ></BInputText>
                    </div>
                  </div>
                  <div className="d-flex align-items-center flex-wrap form-grid-1 w-100">
                    <div className="w-100-3 ">
                      <BInputText
                        variable={variable.field_29}
                        formik={formik}
                      ></BInputText>
                    </div>
                    <div className="w-100-3 ">
                      <BInputText
                        variable={variable.field_30}
                        formik={formik}
                      ></BInputText>
                    </div>
                    <div className="w-100-3">
                      {path ? (
                        <div className="d-flex align-items-center gap-2">
                          <PdfViewModal
                            triggerButton={
                              <Button
                                pt={{
                                  root: { "data-testid": `eye-icon-btn` },
                                }}
                                type="button"
                                icon={<Img name="black_ic_eye" />}
                                className="p-button-text p-0"
                              />
                            }
                            title={removeUnderScore(
                              payeeProofDoc?.document_type
                            ).replace(/\b\w/g, (char) => char.toUpperCase())}
                            downloadUrl={path}
                            downloadName={filename}
                            extension={extension}
                            previewUrl={path}
                          />

                          {/* Label with required asterisk positioned next to the icon */}
                          <div className="ms-2">
                            <span className="regular-text">Payee Proof</span>
                            <span className="text-danger ms-1">*</span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-100">
                          <div className="d-flex align-items-center gap-2">
                            <Button
                              pt={{
                                root: { "data-testid": `eye-icon-btn` },
                              }}
                              type="button"
                              icon={<Img name="disabled_eye" />}
                              className="p-button-text p-0"
                            />

                            {/* Label with required asterisk positioned next to the icon */}
                            <div className="ms-2">
                              <span className="regular-text text-muted">
                                Payee Proof
                              </span>
                              <span className="text-danger ms-1">*</span>
                            </div>
                          </div>
                          {formik.errors.payeeProof ? (
                            <div className="mt-2">
                              <small style={errorMsgStyle}>
                                {formik.errors.payeeProof}
                              </small>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                    {/* <div className="w-100-3">
                      <BCalendar
                        variable={variable?.field_37}
                        formik={formik}
                      ></BCalendar>
                    </div> */}
                    {/* <div className="w-100-3 ">
                      <BInputText
                        variable={variable?.field_31}
                        formik={formik}
                      ></BInputText>
                    </div> */}
                  </div>
                  {/* <div className="w-100 d-flex align-items-center flex-wrap form-grid-1">
                    <div className="w-100-2 ">
                      <BInputText
                        variable={variable?.field_32}
                        formik={formik}
                      ></BInputText>
                    </div>
                    <div className="w-100-2 ">
                      <BInputText
                        variable={variable?.field_33}
                        formik={formik}
                      ></BInputText>
                    </div>
                  </div> */}
                  <div className="w-75 d-flex align-items-center flex-wrap form-grid-1">
                    {/* <div className="w-100-3">
                      <BInputText
                        variable={variable?.field_34}
                        formik={formik}
                      ></BInputText>
                    </div> */}
                    {/* <div className="w-100-3">
                      <BInputText
                        variable={variable?.field_35}
                        formik={formik}
                      ></BInputText>
                    </div> */}
                    {/* <div className="w-100-3">
                      <BInputText
                        variable={variable?.field_36}
                        formik={formik}
                      ></BInputText>
                    </div> */}

                    {/* <div className="w-100-3">
                                <BModal>
                                  <BModal.ToggleButton>
                                    <Button
                                      text
                                      label="Upload Payee Proof"
                                      className="text-black gap-2"
                                      type="button"
                                      // icon={() => <Img name="upload" />}
                                      icon={() => (
                                        <div className="position-relative">
                                          {getFile()?.badge_value !== undefined &&
                                            getFile()?.badge_value !== null &&
                                            getFile()?.badge_value > 0 && (
                                              <Badge
                                                className="badge-icon"
                                                value={getFile()?.badge_value}
                                                severity="warning"
                                              ></Badge>
                                            )}
                                          <Img name="upload" />
                                        </div>
                                      )}
                                    />
                                  </BModal.ToggleButton>
                                  <BModal.Content>
                                    <BUpload {...getFile()}></BUpload>
                                  </BModal.Content>
                                </BModal>
                              </div> */}
                  </div>
                </>
              ) : (
                <div className="d-flex align-items-center flex-wrap form-grid-1 w-75">
                  <div className="w-100-3">
                    {/* <BInputText
                      variable={variable.field_30}
                      formik={formik}
                    ></BInputText> */}
                    <BInputText
                      variable={variable?.field_38}
                      formik={formik}
                    ></BInputText>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="w-100 position-sticky bottom-0 py-3 bg-white">
          <Button
            label="Submit Owner Details"
            type="button"
            severity="warning"
            className="border-radius-0 primary-btn "
            onClick={handleFormSubmit}
            disabled={!hasAccess}
          />
        </div>
      </form>
      <BToast ref={toast} position="top-right" />
    </div>
  );
};

export default CreateIndividualOwner;
