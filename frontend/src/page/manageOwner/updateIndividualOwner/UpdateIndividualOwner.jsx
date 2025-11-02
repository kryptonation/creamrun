import { useFormik } from "formik";
import Img from "../../../components/Img";
import { Button } from "primereact/button";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  statesOptions,
  createIndividualOwner as variable,
} from "../../../utils/variables";
import BInputText from "../../../components/BInputText";
import BUploadInput from "../../../components/BUploadInput";
import BCalendar from "../../../components/BCalendar";
import BSelect from "../../../components/BSelect";
import BRadio from "../../../components/BRadio";
import {
  useGetStepInfoQuery,
  useLazyGetStepInfoQuery,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../../redux/api/medallionApi";
import { useParams } from "react-router-dom";
import {
  CREATE_INDIVIDUAL_OWNER,
  UPDATE_INDIVIDUAL_OWNER_FORM,
} from "../../../utils/constants";
import { yearMonthDate } from "../../../utils/dateConverter";
import BInputNumber from "../../../components/BInputNumber";
import { Checkbox } from "primereact/checkbox";
import { removeUnderScore } from "../../../utils/utils";
import { getCurrentStep } from "../../../utils/caseUtils";
import { useGetBankDetailsMutation } from "../../../redux/api/individualListApi";
import { setIsUpload } from "../../../redux/slice/uploadSlice";
import { useDispatch, useSelector } from "react-redux";
import BInputFileView from "../../../components/BInputFileView";
import BAttachedFile from "../../../components/BAttachedFile";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import PdfViewModal from "../../../components/PdfViewModal";
import BInputFileViewSSN from "../../../components/BInputFileViewSSN";
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
} from "../../../utils/formUitiles";
import BConfirmModal from "../../../components/BConfirmModal";
import BToast from "../../../components/BToast";

const UpdateIndividualOwner = ({
  reload,
  currentStep,
  currentStepId,
  caseId,
  caseData,
  hasAccess,
}) => {
  const params = useParams();
  const [getBankDetails, { data }] = useGetBankDetailsMutation();
  const [isHovered, setIsHovered] = useState(false);

  const [secondaryAdd, setSecondaryAdd] = useState(true);
  const [
    processFlow,
    { isSuccess: isProccessDataSuccess, isLoading: isProcessing },
  ] = useProcessCaseDeatilMutation();
  const [moveCase] = useMoveCaseDetailMutation();
  const [triggerGetStepInfo, { data: stepInfoData, isFetching }] =
    useLazyGetStepInfoQuery();

  const [initialAddressState, setInitialAddressState] = useState(null);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const toast = useRef(null);
  const moveCaseOnSuccess = useRef(false);
  const didAddressChangeOnSubmit = useRef(false);

  const validateZipCodeField = (value) => {
    const result = validateUSZipCode(value);
    return result.isValid ? undefined : result.message;
  };
  const errorMsgStyle = {
    color: "#ff0000",
  };

  useEffect(() => {
    if (caseId && currentStepId) {
      triggerGetStepInfo({ caseNo: caseId, step_no: currentStepId });
    }
  }, [caseId, currentStepId]);

  const formik = useFormik({
    initialValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      ssn: "",
      drivingLicenseNo: "",
      passportNo: "",
      primaryAddress1: "",
      primaryAddress2: "",
      primaryCity: "",
      primaryState: null,
      primaryZip: "",
      secondaryAddress1: "",
      secondaryAddress2: "",
      secondaryCity: "",
      secondaryState: null,
      secondaryZip: "",
      payTo: "Check",
      bank_routing_number: "",
      bankName: "",
      bankAccountNumber: "",
      confirmBankAccountNumber: "",
      payee: "",
      checkPayee: "",
      primaryContactNumber: "",
      additionalPhone1: "",
      primaryEmailAddress: "",
    },
    validateOnChange: true,
    enableReinitialize: true,
    validate: (values) => {
      const errors = {};
      const digitRegex = /^\d+$/;
      const alphaRegex = /^[A-Za-z\s]+$/;

      const firstNameError = validateNameField(values.firstName, "First Name");
      if (firstNameError) errors.firstName = firstNameError;

      const middleNameError = validateOptionalNameField(
        values.middleName,
        "Middle Name"
      );
      if (middleNameError) errors.middleName = middleNameError;

      const lastNameError = validateNameField(values.lastName, "Last Name");
      if (lastNameError) errors.lastName = lastNameError;

      const drivingLicenseError = validateDrivingLicenseNumber(
        values.drivingLicenseNo
      );
      if (drivingLicenseError) errors.drivingLicenseNo = drivingLicenseError;
      else if (
        !stepInfoData?.documents?.find(
          (d) => d.document_type === "driving_license"
        )
      ) {
        errors.drivingLicenseNo =
          "Please upload the Driving License in Step 1.";
      }

      if (values.passportNo) {
        const passportError = validatePassportNumber(values.passportNo);
        if (passportError) errors.passportNo = passportError;
      }

      if (!values.primaryAddress1)
        errors.primaryAddress1 = `Address Line 1 is required`;
      if (!values.primaryCity) errors.primaryCity = `City is required`;
      if (!values.primaryState) errors.primaryState = `State is required`;
      // if (!values.primaryZip) errors.primaryZip = `ZIP is required`;
      const zipError = validateZipCodeField(values.primaryZip);
      if (zipError) errors.primaryZip = zipError;

      if (!secondaryAdd) {
        if (!values.secondaryAddress1)
          errors.secondaryAddress1 = `Address Line 1 is required`;
        if (!values.secondaryCity) errors.secondaryCity = `City is required`;
        if (!values.secondaryState) errors.secondaryState = `State is required`;
        // if (!values.secondaryZip) errors.secondaryZip = `ZIP is required`;
        const secondaryZipError = validateZipCodeField(values.secondaryZip);
        if (secondaryZipError) errors.secondaryZip = secondaryZipError;
      }

      if (values.payTo === "Check") {
        if (!values.checkPayee) errors.checkPayee = `Payee Name is required`;
        else if (!alphaRegex.test(values.checkPayee)) {
          errors["checkPayee"] = "Payee should only contain letters";
        } else if (/^\s|\s$/.test(values.checkPayee)) {
          errors["checkPayee"] = "Payee Name cannot start or end with spaces";
        }
      } else {
        // if (!values.bank_routing_number)
        //   errors.bank_routing_number = `Routing Number is required`;
        // else if (!digitRegex.test(values.bank_routing_number))
        //   errors.bank_routing_number = "Must contain only digits";

        const routingError = validateRoutingNumber(values.bank_routing_number);
        if (routingError) {
          errors.bank_routing_number = routingError;
        }

        const bankNameError = validateBankName(values.bankName);
        if (bankNameError) errors.bankName = bankNameError;

        // if (!values.bankAccountNumber)
        //   errors.bankAccountNumber = `Bank Account Number is required`;
        // else if (!digitRegex.test(values.bankAccountNumber))
        //   errors.bankAccountNumber = "Must contain only digits";
        const bankAccError = validateBankAccountNumber(
          values.bankAccountNumber
        );
        if (bankAccError) {
          errors.bankAccountNumber = bankAccError;
        }

        if (!values.confirmBankAccountNumber)
          errors.confirmBankAccountNumber = `Confirm Bank Account Number is required`;
        if (
          values.bankAccountNumber &&
          values.confirmBankAccountNumber &&
          values.bankAccountNumber !== values.confirmBankAccountNumber
        ) {
          errors.confirmBankAccountNumber = `Account Numbers do not match`;
        }

        if (!values.payee) errors.payee = `Payee Name is required`;
        else if (!alphaRegex.test(values.payee))
          errors.payee = "Payee should only contain letters";
        else if (/^\s|\s$/.test(values.payee))
          errors.payee = "Payee Name cannot start or end with spaces";
      }

      if (!values.primaryContactNumber) {
        errors.primaryContactNumber = `Contact Number is required`;
      } else if (
        !/^(\+1\s?)?(\([2-9][0-9]{2}\)|[2-9][0-9]{2})[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/.test(
          values.primaryContactNumber
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

      const validateEmailAdvanced = (email) => {
        if (!email) return false;
        const detailedPattern =
          /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return detailedPattern.test(email);
      };

      if (!values.primaryEmailAddress) {
        errors.primaryEmailAddress = `Email Address is required`;
      } else if (!validateEmailAdvanced(values.primaryEmailAddress)) {
        errors.primaryEmailAddress = `Please enter a valid email address`;
      }

      if (!stepInfoData?.documents?.find((d) => d.document_type === "ssn")) {
        errors.ssn_doc = "Please upload the SSN document in Step 1.";
      }

      if (
        values.payTo === "ACH" &&
        !stepInfoData?.documents?.find((d) => d.document_type === "payee_proof")
      ) {
        errors.payee_proof_doc = "Please upload the Payee Proof in Step 1.";
      }

      return errors;
    },
    onSubmit: (values) => {
      const payload = {
        // Properties from individual_info
        first_name: values["firstName"],
        middle_name: values["middleName"],
        last_name: values["lastName"],
        ssn: values["ssn"],
        passport_number: values["passportNo"],
        driving_license: values["drivingLicenseNo"],
        primary_contact_number: values["primaryContactNumber"],
        additional_phone_number_1: values["additionalPhone1"],
        primary_email_address: values["primaryEmailAddress"],

        // Properties from primary_address
        address_line_1: values["primaryAddress1"],
        address_line_2: values["primaryAddress2"],
        city: values["primaryCity"],
        state: values["primaryState"]?.code,
        zip: values["primaryZip"],

        // Properties from secondary_address
        secondary_address_line_1: secondaryAdd
          ? values["primaryAddress1"]
          : values["secondaryAddress1"],
        secondary_address_line_2: secondaryAdd
          ? values["primaryAddress2"]
          : values["secondaryAddress2"],
        secondary_city: secondaryAdd
          ? values["primaryCity"]
          : values["secondaryCity"],
        secondary_state: secondaryAdd
          ? values["primaryState"]?.code
          : values["secondaryState"]?.code,
        secondary_zip: secondaryAdd
          ? values["primaryZip"]
          : values["secondaryZip"],

        // Properties from payee_info (with key renaming)
        pay_to: values["payTo"],
        bank_routing_number:
          values["payTo"] === "ACH" ? values["bank_routing_number"] : null,
        bank_name:
          values["payTo"] === "ACH" ? values["bankName"]?.toUpperCase() : null,
        bank_account_number:
          values["payTo"] === "ACH"
            ? String(values["bankAccountNumber"])
            : null,
        bank_account_name:
          values["payTo"] === "ACH" ? values["payee"] : values["checkPayee"],

        // Root-level flag
        is_update_address: hasAddressChanged(),

        // Add missing fields from schema as null (as no form inputs exist for them)
        driving_license_expiry_date: null,
        passport_expiry_date: null,
        dob: null,
        bank_address_line_1: null,
        bank_address_line_2: null,
        bank_city: null,
        bank_state: null,
        bank_zip: null,
        effective_from: null,
        additional_phone_number_2: null,
        longitude: null,
        latitude: null,
        correspondence_method: "print",
      };

      didAddressChangeOnSubmit.current = payload.is_update_address;

      if (hasAccess) {
        processFlow({
          params: params["caseId"],
          data: { step_id: UPDATE_INDIVIDUAL_OWNER_FORM, data: payload },
        });
      }
    },
  });

  const hasAddressChanged = () => {
    if (!initialAddressState) return false;
    const { values } = formik;
    if (secondaryAdd !== initialAddressState.secondaryAdd) return true;
    if (
      values.primaryAddress1 !== initialAddressState.primaryAddress1 ||
      values.primaryAddress2 !== initialAddressState.primaryAddress2 ||
      values.primaryCity !== initialAddressState.primaryCity ||
      values.primaryState?.code !== initialAddressState.primaryState?.code ||
      values.primaryZip !== initialAddressState.primaryZip
    )
      return true;
    if (!secondaryAdd) {
      if (
        values.secondaryAddress1 !== initialAddressState.secondaryAddress1 ||
        values.secondaryAddress2 !== initialAddressState.secondaryAddress2 ||
        values.secondaryCity !== initialAddressState.secondaryCity ||
        values.secondaryState?.code !==
          initialAddressState.secondaryState?.code ||
        values.secondaryZip !== initialAddressState.secondaryZip
      )
        return true;
    }
    return false;
  };

  const proceedToMoveCase = () => {
    if (hasAccess && caseData && caseData.case_info.case_status !== "Closed") {
      moveCase({ params: caseId })
        .unwrap()
        .then(() => reload());
    }
  };

  const handleGenerateDocument = async () => {
    console.log("handleGenerateDocument");
    const errors = await formik.validateForm();
    formik.setTouched(errors, true);
    if (Object.keys(errors).length > 0) {
      toast.current.showToast(
        "Error",
        "Please complete all required fields and upload the necessary files before submitting",
        "error",
        false,
        1000
      );
      return;
    }
    formik.handleSubmit();
  };

  const handleFinalSubmit = () => {
    moveCaseOnSuccess.current = true;
    formik.handleSubmit();
  };

  const handleUpdateDetails = async () => {
    const errors = await formik.validateForm();
    formik.setTouched(errors, true);

    if (Object.keys(errors).length > 0) {
      toast.current.showToast(
        "Error",
        "Please complete all required fields and upload the necessary files before submitting",
        "error",
        false,
        1000
      );
      return;
    }

    if (hasAddressChanged()) {
      setShowUpdatePrompt(true);
    } else {
      handleFinalSubmit();
    }
  };

  useEffect(() => {
    if (isProccessDataSuccess) {
      if (didAddressChangeOnSubmit.current) {
        toast.current.showToast(
          "Success",
          "Updated Address Form Generated Successfully",
          "success",
          false,
          10000
        );
      } else {
        toast.current.showToast(
          "Success",
          "Owner details updated successfully.",
          "success",
          false,
          10000
        );
      }
      didAddressChangeOnSubmit.current = false;
      triggerGetStepInfo({ caseNo: caseId, step_no: currentStepId });
    }
  }, [isProccessDataSuccess, caseId, currentStepId, triggerGetStepInfo]);
  const areAddressesEqual = (addr1, addr2) => {
    if (!addr1 || !addr2) {
      return false; // If either address is missing, they aren't the same.
    }
    return (
      addr1.address_line_1 === addr2.address_line_1 &&
      (addr1.address_line_2 || "") === (addr2.address_line_2 || "") && // Treat null/undefined as empty string
      addr1.city === addr2.city &&
      addr1.state === addr2.state &&
      addr1.zip === addr2.zip
    );
  };
  useEffect(() => {
    if (isProccessDataSuccess && !isFetching && stepInfoData) {
      const primaryStateObj = statesOptions.find(
        (item) => item.code === stepInfoData?.primary_address?.state
      );
      const secondaryStateObj = statesOptions.find(
        (item) => item.code === stepInfoData?.secondary_address?.state
      );
      setInitialAddressState({
        secondaryAdd: secondaryAdd,
        primaryAddress1: stepInfoData.primary_address?.address_line_1 || "",
        primaryAddress2: stepInfoData?.primary_address?.address_line_2 || "",
        primaryCity: stepInfoData?.primary_address?.city || "",
        primaryState: primaryStateObj || null,
        primaryZip: stepInfoData?.primary_address?.zip || "",
        secondaryAddress1:
          stepInfoData?.secondary_address?.address_line_1 || "",
        secondaryAddress2:
          stepInfoData?.secondary_address?.address_line_2 || "",
        secondaryCity: stepInfoData?.secondary_address?.city || "",
        secondaryState: secondaryStateObj || null,
        secondaryZip: stepInfoData?.secondary_address?.zip || "",
      });

      if (moveCaseOnSuccess.current) {
        proceedToMoveCase();
        moveCaseOnSuccess.current = false;
      }
    }
  }, [isProccessDataSuccess, isFetching, stepInfoData]);

  useEffect(() => {
    if (stepInfoData) {
      const {
        individual_info,
        primary_address,
        secondary_address,
        payee_info,
      } = stepInfoData;

      const isSameAddress = areAddressesEqual(
        primary_address,
        secondary_address
      );
      setSecondaryAdd(isSameAddress);

      const primaryStateObj = statesOptions.find(
        (item) => item.code === primary_address?.state
      );
      const secondaryStateObj = statesOptions.find(
        (item) => item.code === secondary_address?.state
      );

      const valuesToSet = {
        firstName: individual_info?.first_name || "",
        middleName: individual_info?.middle_name || "",
        lastName: individual_info?.last_name || "",
        ssn: individual_info?.ssn || "",
        drivingLicenseNo: individual_info?.driving_license || "",
        passportNo: individual_info?.passport || "",
        primaryAddress1: primary_address?.address_line_1 || "",
        primaryAddress2: primary_address?.address_line_2 || "",
        primaryCity: primary_address?.city || "",
        primaryState: primaryStateObj || null,
        primaryZip: primary_address?.zip || "",
        secondaryAddress1: secondary_address?.address_line_1 || "",
        secondaryAddress2: secondary_address?.address_line_2 || "",
        secondaryCity: secondary_address?.city || "",
        secondaryState: secondaryStateObj || null,
        secondaryZip: secondary_address?.zip || "",
        primaryContactNumber: individual_info?.primary_contact_number || "",
        additionalPhone1: individual_info?.additional_phone_number_1 || "",
        primaryEmailAddress: individual_info?.primary_email_address || "",
        payTo: payee_info?.pay_to_mode || "Check",
      };

      if (payee_info?.pay_to_mode === "ACH") {
        valuesToSet.bank_routing_number =
          payee_info.data?.bank_routing_number || "";
        valuesToSet.bankName = payee_info.data?.bank_name || "";
        valuesToSet.bankAccountNumber =
          payee_info.data?.bank_account_number || "";
        valuesToSet.confirmBankAccountNumber =
          payee_info.data?.bank_account_number || "";
        // valuesToSet.payee = payee_info.data?.bank_account_name || "";
      }
      // else {
      //   valuesToSet.checkPayee = payee_info?.data?.bank_account_name || "";
      // }
      valuesToSet.payee = payee_info.data?.bank_account_name || "";
      valuesToSet.checkPayee = payee_info?.data?.bank_account_name || "";

      formik.setValues(valuesToSet);

      setInitialAddressState({
        secondaryAdd: isSameAddress,
        primaryAddress1: primary_address?.address_line_1 || "",
        primaryAddress2: primary_address?.address_line_2 || "",
        primaryCity: primary_address?.city || "",
        primaryState: primaryStateObj || null,
        primaryZip: primary_address?.zip || "",
        secondaryAddress1: secondary_address?.address_line_1 || "",
        secondaryAddress2: secondary_address?.address_line_2 || "",
        secondaryCity: secondary_address?.city || "",
        secondaryState: secondaryStateObj || null,
        secondaryZip: secondary_address?.zip || "",
      });
    }
  }, [stepInfoData]);

  useEffect(() => {
    if (data?.name) {
      formik.setFieldValue(variable.field_27.id, data?.name?.toUpperCase());
    } else {
      formik.setFieldValue(variable.field_27.id, "");
    }
  }, [data]);

  const generateButtonStyle = {
    backgroundColor: isHovered ? "#FEC917" : "#FFFFFF",
    border: "1px solid #FEC917",
    color: "#495057",
    transition: "background-color 0.2s ease",
  };

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
    } else if (item === "update_address") {
      const update_address_document = mapDocumentData(
        stepInfoData,
        "update_address"
      );
      return {
        name: update_address_document?.document_name,
        path: update_address_document?.presigned_url,
        id: update_address_document?.document_id,
        document_type: update_address_document?.document_type,
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
  const ssn_doc = useMemo(
    () => mapDocumentData(stepInfoData, "ssn"),
    [stepInfoData]
  );

  return (
    <div className="postion-relative">
      {/* <p className="sec-topic pb-3">Create Individual Owner</p> */}
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
                  isDisable={true}
                ></BInputText>
              </div>
              <div className=" w-100-3">
                <BInputText
                  variable={variable.field_02}
                  formik={formik}
                  isDisable={true}
                ></BInputText>
              </div>
              <div className="w-100-3">
                <BInputText
                  variable={variable.field_03}
                  formik={formik}
                  isDisable={true}
                ></BInputText>
              </div>
              <div className="w-100-3  mb-4">
                <BInputFileViewSSN
                  {...getDocumentDetails("ssn")}
                  variable={variable.field_04}
                  formik={formik}
                  isDisable={true}
                ></BInputFileViewSSN>
              </div>
              <div className="w-100-3">
                <div className="d-flex align-items-center gap-1">
                  {ssn_doc?.presigned_url ? (
                    <PdfViewModal
                      triggerButton={
                        <Button
                          type="button"
                          icon={<Img name="black_ic_eye" />}
                          className="p-button-text p-0"
                          data-testid="ssn-doc-btn"
                        />
                      }
                      title="SSN"
                      downloadUrl={ssn_doc?.presigned_url}
                      downloadName={ssn_doc?.document_name
                        ?.split(".")
                        ?.join(".")}
                      extension={ssn_doc?.document_name?.split(".")?.pop()}
                      previewUrl={ssn_doc.presigned_url}
                    />
                  ) : (
                    <Button
                      type="button"
                      icon={<Img name="disabled_eye" />}
                      className="p-button-text p-0"
                      disabled
                      data-testid="disabled-ssn-doc-btn"
                    />
                  )}
                  <div className="ms-2">
                    <span className="regular-text fs-6">SSN</span>
                    <span className="text-danger ms-1">*</span>
                  </div>
                </div>
                {formik.errors.ssn_doc && (
                  <div className="mt-2">
                    <small style={errorMsgStyle}>{formik.errors.ssn_doc}</small>
                  </div>
                )}
              </div>
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
                  data-testid="address-cancel-btn"
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
                      )}
                      {formik.errors.payee_proof_doc && (
                        <div className="mt-2">
                          <small style={errorMsgStyle}>
                            {formik.errors.payee_proof_doc}
                          </small>
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
        <div className="form-section">
          <div
            className="d-flex align-items-center
                                 justify-content-between form-sec-header"
          >
            <div className="topic">
              <Img name="generate_document"></Img>Generate Document
            </div>
          </div>
          <div
            className="form-body"
            style={{
              backgroundColor: "#EEEEEE",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
              padding: "2rem 0",
            }}
          >
            <div className="form-body d-flex flex-column common-gap">
              <div className="d-flex align-items-center w-100 gap-3">
                <div className="w-100-3">
                  {getDocumentDetails("update_address")?.id && (
                    <BAttachedFile
                      file={getDocumentDetails("update_address")}
                      hideDelete={true}
                    />
                  )}
                </div>
                <div className="w-100-3 d-flex justify-content-center">
                  <Button
                    label="Generate Document"
                    type="button"
                    onClick={handleGenerateDocument}
                    style={generateButtonStyle}
                    disabled={!hasAccess || isProcessing}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    data-testid="generate-doc-btn"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="w-100 position-sticky bottom-0 py-3 bg-white">
          <Button
            label="Update Owner Details"
            type="button"
            onClick={handleUpdateDetails}
            severity="warning"
            className="border-radius-0 primary-btn"
            disabled={!hasAccess || isProcessing}
            data-testid="update-btn"
          />
        </div>
      </form>
      <BToast ref={toast} position="top-right" />
      <BConfirmModal
        isOpen={showUpdatePrompt}
        title="Key owner information has changed!"
        message="A document must be regenerated to reflect the update. Would you like to regenerate the document now?"
        onCancel={() => {
          // Skip
          setShowUpdatePrompt(false);
          handleFinalSubmit();
        }}
        onConfirm={() => {
          // Generate
          setShowUpdatePrompt(false);
          formik.handleSubmit();
        }}
        confirmLabel="Generate"
        cancelLabel="Skip"
      />
    </div>
  );
};

export default UpdateIndividualOwner;
