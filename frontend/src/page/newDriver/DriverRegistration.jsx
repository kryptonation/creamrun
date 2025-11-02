import { useFormik } from "formik";
import {
  newDriverDetail,
  newDriverPersonalDetail,
  newDriverAddress,
  newDriverSecondaryAddress,
  newDriverPayeeDetail,
  newDriverMorePaymentOption,
  newDriveEmergencyNumber,
  newDriveAddtionalEmergencyNumber,
  getOptionsByIdFromVariable,
  relationshipOptions,
} from "../../utils/variables";
import BInputFields from "../../components/BInputFileds";
import Img from "../../components/Img";
import { Button } from "primereact/button";
import {
  useDeleteDocumentMutation,
  useGetStepInfoQuery,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../redux/api/medallionApi";
import { useEffect, useMemo, useRef, useState } from "react";
import { dateMonthYear, yearMonthDate } from "../../utils/dateConverter";
import BCaseCard from "../../components/BCaseCard";
import { Dialog } from "primereact/dialog";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { getCurrentStep } from "../../utils/caseUtils";
import BToast from "../../components/BToast";
import { useDispatch, useSelector } from "react-redux";
import { setIsUpload } from "../../redux/slice/uploadSlice";
import BModal from "../../components/BModal";
import { Badge } from "primereact/badge";
import BUpload from "../../components/BUpload";
import { removeUnderScore, validateEmailAdvanced } from "../../utils/utils";
import { useGetBankDetailsMutation } from "../../redux/api/individualListApi";
import BInputText from "../../components/BInputText";
import PdfViewModal from "../../components/PdfViewModal";
import {
  validateBankAccountNumber,
  validateNameField,
  validateOptionalNameField,
  validateRoutingNumber,
  validateUSZipCode,
} from "../../utils/formUitiles";
import { parse, parseISO, isValid } from "date-fns";
import { statesOptions } from "../../utils/variables";

const DriverRegistration = ({
  caseId,
  caseData,
  currentStepId,
  hasAccess,
  currentStep,
  reload,
}) => {
  const { data: stepInfoData } = useGetStepInfoQuery(
    { caseNo: caseId, step_no: currentStepId },
    { skip: !caseId }
  );
  console.log(" DriverRegistration ~ caseData:", currentStep, currentStepId);
  // const [isAddtionAddress, setAddtionalAddress] = useState(false);
  const [isView, setIsView] = useState(true);
  const [isAddtionPaymentOption, setAddtionalPaymentOption] = useState(false);
  const [isAddtionContact, setAddtionalContact] = useState(false);
  const [processFlow, { isSuccess: isProccessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [moveCase] = useMoveCaseDetailMutation();
  const [isDialogVisible, setDialogVisible] = useState(false);
  const toast = useRef(null);
  const dispatch = useDispatch();
  const isUpload = useSelector((state) => state.upload.isUpload);
  const [getBankDetails, { data }] = useGetBankDetailsMutation();
  const [isErrorActive, setIsErrorActive] = useState(false); // Prevents error toast stacking
  const payNameSourceRef = useRef(null); // 'bank' | 'name' | 'manual'
  const lastAutoPayName = useRef("");

  const formatDues = (dues) => {
    return Object.entries(dues)
      .filter(([key]) => key !== "dtr_due")
      .map(([key, value]) => {
        const label = key
          .replace(/_/g, " ")
          .replace(/\b[a-z]/g, (char) => char.toUpperCase());
        return {
          label,
          amount: value,
        };
      });
  };

  const validateZipCodeField = (value) => {
    const result = validateUSZipCode(value);
    return result.isValid ? undefined : result.message;
  };

  const errorMsgStyle = {
    color: "#ff0000",
  };
  const [deleteFunc, { isSuccess }] = useDeleteDocumentMutation();

  const formik = useFormik({
    initialValues: {
      firstName: "",
      lastName: "",
      ssn: "",
      confirmssn: "",
      dob: "",
      dmvLicenseNumber: "",
      dmvLicenseIssuedState: "",
      dmvLicenseExpiryDate: "",
      tlcLicenseNumber: "",
      tlcLicenseExpiryDate: "",
      addressLine1: "",
      city: "",
      mailingAddress: "",
      state: "",
      zip: "",
      addressLine1Payee: "",
      bankName: "",
      bank_account_name: "",
      bankAccountNumber: "",
      pay_to: "",
      enterCreditCardNumber: "",
      nameOfThePerson: "",
      relationship: "",
      contactNumber: "",
      // dmvLicenseActive: "No",
      // tlcLicenseActive: "No",
      addressLine2Payee: "",
      addressLine2: "",
      pay_to_mode: "Check",
      confirmBankAccountNumber: "",
      bank_routing_number: "",
    },
    validateOnChange: true,
    validateOnMount: false,
    enableReinitialize: true,

    validate: (values) => {
      const errors = {};
      // if (!currentStep?.violation_document?.presigned_url) {
      //   errors.violationDueAtRegistration = "Violation Receipt is required";
      // }
      const digitRegex = /^\d+$/;
      const alphaRegex = /^[A-Za-z\s]+$/;
      // if (!values.firstName) {
      //   errors["firstName"] = `First Name is required`;
      // } else if (!/^[A-Za-z]+$/.test(values.firstName)) {
      //   errors.firstName = "First Name must contain only letters";
      // }
      // if (values.middleName && !/^[A-Za-z]+$/.test(values.middleName)) {
      //   errors.middleName = "Middle Name must contain only letters";
      // }
      // if (!values.lastName) {
      //   errors["lastName"] = `Last Name is required`;
      // } else if (!/^[A-Za-z]+$/.test(values.lastName)) {
      //   errors.lastName = "Last Name must contain only letters";
      // }
      // First Name validation
      if (!values.firstName) {
        errors["firstName"] = `First Name is required`;
      } else if (values.firstName.trim().length < 1) {
        errors.firstName = "First Name cannot be empty";
      } else if (!/^[A-Za-z\s\-'\.]+$/.test(values.firstName.trim())) {
        errors.firstName = "First Name contains invalid characters";
      } else if (values.firstName.trim().length > 50) {
        errors.firstName = "First Name cannot exceed 50 characters";
      } else if (/^\s|\s$/.test(values.firstName)) {
        errors.firstName = "First Name cannot start or end with spaces";
      }

      // Middle Name validation (optional field)
      if (values.middleName) {
        if (values.middleName.trim().length < 1) {
          errors.middleName = "Middle Name cannot be empty";
        } else if (!/^[A-Za-z\s\-'\.]+$/.test(values.middleName.trim())) {
          errors.middleName = "Middle Name contains invalid characters";
        } else if (values.middleName.trim().length > 50) {
          errors.middleName = "Middle Name cannot exceed 50 characters";
        } else if (/^\s|\s$/.test(values.middleName)) {
          errors.middleName = "Middle Name cannot start or end with spaces";
        }
      }

      // Last Name validation
      if (!values.lastName) {
        errors["lastName"] = `Last Name is required`;
      } else if (values.lastName.trim().length < 1) {
        errors.lastName = "Last Name cannot be empty";
      } else if (!/^[A-Za-z\s\-'\.]+$/.test(values.lastName.trim())) {
        errors.lastName = "Last Name contains invalid characters";
      } else if (values.lastName.trim().length > 50) {
        errors.lastName = "Last Name cannot exceed 50 characters";
      } else if (/^\s|\s$/.test(values.lastName)) {
        errors.lastName = "Last Name cannot start or end with spaces";
      }

      if (!values.ssn) {
        errors["ssn"] = `SSN is required`;
      } else if (
        !/^[\dX]{9}$/.test(values.ssn) && // 9 digits/X
        !/^[\dX]{3}-[\dX]{2}-[\dX]{4}$/.test(values.ssn) // XXX-XX-XXXX
      ) {
        errors["ssn"] = "SSN must be 9 digits in the format XXX-XX-XXXX";
      } else if (
        !stepInfoData?.driver_documents?.find(
          (d) => d.document_type === "driver_ssn"
        )
      ) {
        errors["ssn"] = "Please upload the SSN file in Step 1.";
      }

      if (!values.confirmssn) {
        errors["confirmssn"] = `Confirm SSN is required`;
      }

      if (values.confirmssn && values.ssn !== values.confirmssn) {
        errors["confirmssn"] = `SSN and Confirm SSN should be same`;
      }

      // if (!values.dob) {
      //   errors["dob"] = `DOB is required`;
      // }
      if (!values.Phone1) {
        errors["Phone1"] = "Mobile Number 1 is required";
      } else if (
        !/^(\+1\s?)?(\([2-9][0-9]{2}\)|[2-9][0-9]{2})[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/.test(
          values.Phone1
        )
      ) {
        errors.Phone1 = "Enter a valid US mobile number (e.g., 212-456-7890)";
      }

      if (
        values.Phone2 &&
        !/^(\+1\s?)?(\([2-9][0-9]{2}\)|[2-9][0-9]{2})[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/.test(
          values.Phone2
        )
      ) {
        errors.Phone2 = "Enter a valid US mobile number (e.g., 212-456-7890)";
      }

      if (values.emailID && !validateEmailAdvanced(values.emailID)) {
        errors.emailID = `Please enter a valid email address`;
      }

      if (!values.dmvLicenseNumber) {
        errors["dmvLicenseNumber"] = `DMV License Number is required`;
      } else {
        const trimmedValue = values.dmvLicenseNumber.trim();
        if (!trimmedValue) {
          errors["dmvLicenseNumber"] = "DMV License Number cannot be empty";
        } else if (!/^[A-Z0-9\s]{5,17}$/i.test(trimmedValue)) {
          errors.dmvLicenseNumber =
            "DMV License Number must be 5-17 characters and contain only letters, numbers, and spaces";
        } else if (/^\s|\s$/.test(values.dmvLicenseNumber)) {
          errors.dmvLicenseNumber =
            "DMV License Number cannot start or end with spaces";
        } else if (/\s{2,}/.test(trimmedValue)) {
          errors.dmvLicenseNumber =
            "DMV License Number cannot contain consecutive spaces";
        } else {
          // Check length without spaces to ensure actual content is within range
          const withoutSpaces = trimmedValue.replace(/\s/g, "");
          if (withoutSpaces.length < 5 || withoutSpaces.length > 15) {
            errors.dmvLicenseNumber =
              "DMV License Number must contain 5-15 characters (excluding spaces)";
          }
        }
      }
      if (
        !stepInfoData?.driver_documents?.find(
          (d) => d.document_type === "dmv_license"
        )
      ) {
        errors["dmvLicenseNumber"] =
          "Please upload the DMV License file in Step 1.";
      }

      if (!values.dmvLicenseIssuedState) {
        errors["dmvLicenseIssuedState"] = `DMV License Issue State is required`;
      }

      if (!values.tlcLicenseNumber) {
        errors["tlcLicenseNumber"] = `TLC License Number is required`;
      } else {
        const trimmedValue = values.tlcLicenseNumber.trim();
        if (!trimmedValue) {
          errors["tlcLicenseNumber"] = "TLC License Number cannot be empty";
        } else if (!/^[0-9]{6,7}$/.test(trimmedValue)) {
          errors.tlcLicenseNumber =
            "TLC License Number must be exactly 6 to 7 digits";
        } else if (/^0+$/.test(trimmedValue)) {
          errors.tlcLicenseNumber = "TLC License Number cannot be all zeros";
        }
      }

      if (
        !stepInfoData?.driver_documents?.find(
          (d) => d.document_type === "tlc_license"
        )
      ) {
        errors["tlcLicenseNumber"] =
          "Please upload the TLC License file in Step 1.";
      }

      // if (!values.tlcLicenseExpiryDate) {
      //   errors["tlcLicenseExpiryDate"] = `TLC License Expiry Date is required`;
      // }
      const today = new Date();
      // reset time to 00:00:00 for a fair comparison
      today.setHours(0, 0, 0, 0);

      if (!values.dmvLicenseExpiryDate) {
        errors["dmvLicenseExpiryDate"] = "DMV License Expiry Date is required";
      } else {
        const dmvDate = new Date(values.dmvLicenseExpiryDate);
        dmvDate.setHours(0, 0, 0, 0);
        if (dmvDate <= today) {
          errors["dmvLicenseExpiryDate"] =
            "DMV License Expiry Date must be a future date";
        }
      }

      if (!values.tlcLicenseExpiryDate) {
        errors["tlcLicenseExpiryDate"] = "TLC License Expiry Date is required";
      } else {
        const tlcDate = new Date(values.tlcLicenseExpiryDate);
        tlcDate.setHours(0, 0, 0, 0);
        if (tlcDate <= today) {
          errors["tlcLicenseExpiryDate"] =
            "TLC License Expiry Date must be a future date (starting from tomorrow)";
        }
      }
      if (!values.addressLine1) {
        errors["addressLine1"] = `Address Line 1  is required`;
      }
      if (!values.city) {
        errors["city"] = `City  is required`;
      }
      if (!values.state) {
        errors["state"] = `State is required`;
      }
      if (!values.zip) {
        errors["zip"] = `Zip is required`;
      }
      const zipError = validateZipCodeField(values.zip);
      if (zipError) {
        errors["zip"] = zipError;
      }
      // if (isAddtionAddress) {
      //   if (secondaryZipError) {
      //     errors["zipSecondary"] = secondaryZipError;
      //   }
      // }
      const isAddtionAddress = formik.values.mailingAddress?.[0] !== "yes";
      if (isAddtionAddress) {
        if (!values.addressLine1Secondary) {
          errors["addressLine1Secondary"] = `Address Line 1  is required`;
        }
        if (!values.citySecondary) {
          errors["citySecondary"] = `City  is required`;
        }
        if (!values.stateSecondary) {
          errors["stateSecondary"] = `State is required`;
        }
        const secondaryZipError = validateZipCodeField(values.zipSecondary);
        if (secondaryZipError) {
          errors["zipSecondary"] = secondaryZipError;
        }
      }

      // console.log("formik?.values.pay_to_mode", formik?.values.pay_to_mode);

      if (formik?.values.pay_to_mode === "") {
        console.log(formik?.values.pay_to_mode);

        if (!values.pay_to_mode) {
          errors["pay_to_mode"] = `Pay to mode is required`;
        }
      } else {
        if (formik?.values.pay_to_mode === "ACH") {
          // if (!values.bankName) {
          //   errors["bankName"] = `Bank Name is required`;
          // } else if (!alphaRegex.test(values.bankName)) {
          //   errors["bankName"] = "Bank Name should contain only letters";
          // }
          if (!values.bankName) {
            errors["bankName"] = `Bank Name is required`;
          } else if (values.bankName.trim().length < 2) {
            errors["bankName"] = "Bank Name must be at least 2 characters long";
          } else if (!/^[A-Za-z0-9\s\.\-&,'"()]+$/.test(values.bankName)) {
            errors["bankName"] = "Bank Name contains invalid characters";
          } else if (/^\s|\s$/.test(values.bankName)) {
            errors["bankName"] = "Bank Name cannot start or end with spaces";
          }

          const bankAccError = validateBankAccountNumber(
            values.bankAccountNumber
          );
          if (bankAccError) {
            errors["bankAccountNumber"] = bankAccError;
          }

          if (
            !values.confirmBankAccountNumber ||
            values.confirmBankAccountNumber.trim() === ""
          ) {
            errors["confirmBankAccountNumber"] =
              "Confirm Bank Account Number is required";
          }

          if (
            values.bankAccountNumber &&
            values.confirmBankAccountNumber &&
            values.bankAccountNumber !== values.confirmBankAccountNumber
          ) {
            errors[
              "confirmBankAccountNumber"
            ] = `Bank Account Number does not match`;
          }

          if (!values.pay_to) {
            errors["pay_to"] = `Payee is required`;
          } else if (!alphaRegex.test(values.pay_to)) {
            errors["pay_to"] = "Payee should only contain letters";
          } else if (/^\s|\s$/.test(values.pay_to)) {
            errors["pay_to"] = "Payee Name cannot start or end with spaces";
          }

          // if (
          //   !values.bank_routing_number ||
          //   values.bank_routing_number.trim() === ""
          // ) {
          //   errors["bank_routing_number"] = "Routing Number is required";
          // } else if (!digitRegex.test(values.bank_routing_number)) {
          //   errors["bank_routing_number"] =
          //     "Route Number must contain only digits";
          // } else if (/^\s|\s$/.test(values.bank_routing_number)) {
          //   errors["bank_routing_number"] =
          //     "Routing Number cannot start or end with spaces";
          // }
          const routingError = validateRoutingNumber(
            values.bank_routing_number
          );
          if (routingError) {
            errors["bank_routing_number"] = routingError;
          }
          const payeeProofDoc = mapDocumentData(stepInfoData, "payee_proof");
          console.log("Payee proof doc validation", payeeProofDoc);
          if (!payeeProofDoc || !payeeProofDoc?.document_id) {
            errors.payeeProof = "Please upload the Payee Proof";
          }
          // else if (values.bank_routing_number.length !== 9) {
          //   errors["bank_routing_number"] =
          //     "Route Number must be exactly 9 digits";
          // }
        } else if (formik?.values.pay_to_mode === "Check") {
          if (!values.payeeCheck) {
            errors["payeeCheck"] = `Payee is required`;
          } else if (!alphaRegex.test(values.payeeCheck)) {
            errors["payeeCheck"] = "Payee should only contain letters";
          } else if (/^\s|\s$/.test(values.payeeCheck)) {
            errors["payeeCheck"] = "Payee Name cannot start or end with spaces";
          }
        }
      }

      // if (values?.payByCreditCard?.[0] === "Yes") {
      //   if (isAddtionPaymentOption && !values.enterCreditCardNumber) {
      //     errors[
      //       "enterCreditCardNumber"
      //     ] = `Enter Credit Card Number is required`;
      //   }
      // }

      // if (!values.nameOfThePerson) {
      //   errors["nameOfThePerson"] = `Name of the person is required`;
      // } else if (!/^[A-Za-z\s]+$/.test(values.nameOfThePerson)) {
      //   errors.nameOfThePerson = "Name must contain only letters and spaces";
      // }

      // if (
      //   values.nameOfThePerson &&
      //   !/^[A-Za-z\s]+$/.test(values.nameOfThePerson)
      // ) {
      //   errors.nameOfThePerson = "Name must contain only letters and spaces";
      // }

      const nameError = validateOptionalNameField(
        values.nameOfThePerson,
        "Full Name"
      );
      if (values.nameOfThePerson && nameError)
        errors.nameOfThePerson = nameError;

      // if (!values.relationship) {
      //   errors["relationship"] = `Relationship is required`;
      // }

      // if (!values.contactNumber) {
      //   errors["contactNumber"] = `Contact Number is required`;
      // }
      if (
        values.contactNumber &&
        !/^(\+1\s?)?(\([2-9][0-9]{2}\)|[2-9][0-9]{2})[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/.test(
          values.contactNumber
        )
      ) {
        errors.contactNumber =
          "Enter a valid US mobile number (e.g., 212-456-7890)";
      }

      if (isAddtionContact) {
        const additionalPersonNameError = validateOptionalNameField(
          values.nameOfThePersonAddtional,
          "Full Name"
        );
        if (values.nameOfThePersonAddtional && additionalPersonNameError)
          errors.nameOfThePersonAddtional = additionalPersonNameError;

        // if (
        //   values.nameOfThePersonAddtional &&
        //   !/^[A-Za-z\s]+$/.test(values.nameOfThePersonAddtional)
        // ) {
        //   errors.nameOfThePersonAddtional =
        //     "Name must contain only letters and spaces";
        // }

        if (
          values.contactNumberAddtional &&
          !/^(\+1\s?)?(\([2-9][0-9]{2}\)|[2-9][0-9]{2})[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/.test(
            values.contactNumberAddtional
          )
        ) {
          errors.contactNumberAddtional =
            "Enter a valid US mobile number (e.g., 212-456-7890)";
        }
      }

      // if (errors) {
      //     setIsView(false)
      // }
      console.log("🚀 ~ DriverRegistration ~ errors:", errors);
      return errors;
    },
    onSubmit: () => {
      const driverDetail = {
        driver_id: currentStep?.driver_data?.driver_details?.driver_lookup_id,
        first_name: formik?.values.firstName || "",
        middle_name: formik?.values.middleName || "",
        last_name: formik?.values.lastName || "",
        ssn: formik?.values.ssn || "",
        // confirmssn: formik?.values.confirmssn || "",
        // driver_type: formik?.values.driverType?.code
        //   ? formik?.values.driverType?.code
        //   : "",
        // marital_status: formik?.values.maritalStatus || "",
        dob: formik?.values.dob ? yearMonthDate(formik?.values.dob) : "",
        // gender: formik?.values.gender || "",
        phone_number_1: formik?.values.Phone1 || "",
        phone_number_2: formik?.values.Phone2 || "",
        email_address: formik?.values.emailID || "",
        primary_emergency_contact_person: formik?.values.nameOfThePerson || "",
        primary_emergency_contact_relationship:
          formik?.values.relationship?.code || "",
        primary_emergency_contact_number: formik?.values.contactNumber || "",
        additional_emergency_contact_person:
          formik?.values.nameOfThePersonAddtional || "",
        additional_emergency_contact_relationship:
          formik?.values.relationshipAddtional?.code || "",
        additional_emergency_contact_number:
          formik?.values.contactNumberAddtional || "",
        violation_due_at_registration:
          formik?.values.violationDueAtRegistration || "",
      };

      const dmv_license_details = {
        // is_dmv_license_active:
        //   formik?.values.dmvLicenseActive === "No" ? false : true,
        is_dmv_license_active: true,
        dmv_license_number: formik?.values.dmvLicenseNumber || "",
        dmv_license_issued_state:
          formik?.values.dmvLicenseIssuedState?.code || "",
        dmv_license_expiry_date: formik?.values.dmvLicenseExpiryDate
          ? yearMonthDate(formik?.values.dmvLicenseExpiryDate)
          : "",
      };
      const tlc_license_details = {
        // is_tlc_license_active:
        //   formik?.values.tlcLicenseActive === "No" ? false : true,
        is_tlc_license_active: true,
        tlc_license_number: formik?.values.tlcLicenseNumber || "",
        tlc_license_expiry_date: formik?.values.tlcLicenseExpiryDate
          ? yearMonthDate(formik?.values.tlcLicenseExpiryDate)
          : "",
      };

      const primary_address_details = {
        address_line_1: formik?.values.addressLine1 || "",
        address_line_2: formik?.values.addressLine2 || "",
        city: formik?.values.city || "",
        state: formik?.values.state?.code || "",
        zip: formik?.values.zip || "",
        // latitude: formik?.values.latitude || "",
        // longitude: formik?.values.longitude || "",
        mailingAddress:
          formik.values.mailingAddress?.[0] == "yes" ? true : false,
      };

      let secondary_address_details;

      if (formik.values.mailingAddress?.[0] == "yes") {
        secondary_address_details = { ...primary_address_details };
      } else {
        secondary_address_details = {
          address_line_1: formik?.values.addressLine1Secondary,
          address_line_2: formik?.values.addressLine2Secondary,
          city: formik?.values.citySecondary,
          state: formik?.values.stateSecondary?.code,
          zip: formik?.values.zipSecondary,
          // latitude: formik?.values.latitudeSecondary || "",
          // longitude: formik?.values.longitudeSecondary || ""
        };
      }

      var payee_details;
      if (formik?.values.pay_to_mode === "ACH") {
        payee_details = {
          pay_to_mode: formik?.values.pay_to_mode || "",
          bank_routing_number: formik?.values.bank_routing_number || "",
          bank_name: formik?.values.bankName.toUpperCase() || "",
          bank_account_name: formik?.values.pay_to || "",
          bank_account_number: formik?.values.bankAccountNumber || "",
          address_line_1: formik?.values.addressLine1Payee || "",
          address_line_2: formik?.values.addressLine2Payee || "",
          city: formik?.values.cityPayee || "",
          state: formik?.values.statePayee || "",
          zip: formik?.values.zipPayee || "",
          pay_to: formik?.values.pay_to || "",
          effective_from: yearMonthDate(formik?.values.effective_from),
        };
      } else {
        payee_details = {
          pay_to_mode: formik?.values.pay_to_mode || "",
          payee: formik?.values.payeeCheck || "",
        };
      }
      const data = {
        step_id: currentStepId,
        data: {
          driver_details: driverDetail,
          dmv_license_details,
          tlc_license_details,
          primary_address_details,
          secondary_address_details,
          payee_details,
        },
      };
      console.log("payload", data);
      //delete payee proof document if pay to mode is check
      // if (formik?.values.pay_to_mode === "Check") {
      //   const payeeProofDoc = mapDocumentData(stepInfoData, "payee_proof");
      //   if (payeeProofDoc && payeeProofDoc?.document_id) {
      //     console.log("Payee proof doc to be deleted", payeeProofDoc);
      //     deleteFunc(payeeProofDoc?.document_id);
      //   }
      // }

      if (hasAccess) processFlow({ params: caseId, data: data });
    },
  });
  const isAddtionAddress = useMemo(
    () => formik.values.mailingAddress?.[0] !== "yes",
    [formik.values.mailingAddress]
  );

  const getUploadDocumentDetails = () => {
    // let upload = {};
    const existingDocument = stepInfoData?.driver_documents?.find(
      (doc) => doc.document_type === "payee_proof"
    );
    const uploadDocOptions = [
      {
        name: "Payee Proof",
        code: "payee_proof",
      },
    ];
    console.log("Existing document", existingDocument);
    let default_document_data = {
      document_id: "",
      document_name: "",
      document_note: "",
      document_path: "",
      document_type: uploadDocOptions.map((doc) => doc.code).toString(),
      document_date: "",
      document_object_type: "driver",
      document_object_id: stepInfoData?.driver_data?.driver_details?.driver_id,
      document_size: "",
      document_uploaded_date: "",
      presigned_url: "",
    };

    let upload = {
      data: existingDocument ? existingDocument : default_document_data,
      object_type: "driver",
      object_id: stepInfoData?.driver_data?.driver_details?.driver_id,
      document_id: 0,
      document_name: "",
      document_type: [
        {
          name: "Payee Proof",
          code: "payee_proof",
        },
      ],
    };
    return upload;
  };

  useEffect(() => {
    console.log("useeffect", stepInfoData, isUpload);
    if (stepInfoData && !isUpload) {
      console.log(
        "setField value",
        stepInfoData?.driver_data?.dmv_license_details?.license_expiration_date
      );
      if (!stepInfoData?.personal_details?.driver_status) {
        setIsView(false);
      }

      if (stepInfoData?.driver_data?.dmv_license_details) {
        formik.setFieldValue(
          "dmvLicenseNumber",
          stepInfoData?.driver_data?.dmv_license_details?.dmv_license_number ||
            "",
          true
        );
        // formik.setFieldValue(
        //   "dmvLicenseIssuedState",
        //   stepInfoData?.driver_data?.dmv_license_details
        //     ?.dmv_license_issued_state || "",
        //   true
        // );

        if (stepInfoData?.driver_data?.dmv_license_details) {
          const dmvIssuedState =
            stepInfoData?.driver_data?.dmv_license_details
              ?.dmv_license_issued_state;

          if (
            dmvIssuedState &&
            dmvIssuedState !== formik.values.dmvLicenseIssuedState?.code
          ) {
            const matchedOption = statesOptions.find(
              (item) => item.code === dmvIssuedState
            );

            formik.setFieldValue(
              "dmvLicenseIssuedState",
              matchedOption || null,
              true
            );
          }
        }

        // formik.setFieldValue(
        //   "dmvLicenseExpiryDate",
        //   stepInfoData?.driver_data?.dmv_license_details?.dmv_license_expiry_date
        //     ? parse(
        //         stepInfoData?.driver_data?.dmv_license_details
        //           ?.dmv_license_expiry_date,
        //         "MM/dd/yyyy",
        //         new Date()
        //       )
        //     : "",
        //   true
        // );

        formik.setFieldValue(
          "dmvLicenseExpiryDate",
          (() => {
            const rawDate =
              stepInfoData?.driver_data?.dmv_license_details
                ?.dmv_license_expiry_date;

            if (!rawDate) return "";

            let parsedDate = parseISO(rawDate); // handles "2025-09-09" and "2025-09-09T00:00:00"
            if (!isValid(parsedDate)) {
              // fallback if API sends in "MM/dd/yyyy" format
              parsedDate = parse(rawDate, "MM/dd/yyyy", new Date());
            }

            return parsedDate;
          })(),
          true
        );
      }

      if (stepInfoData?.driver_data?.tlc_license_details) {
        formik.setFieldValue(
          "tlcLicenseNumber",
          stepInfoData?.driver_data?.tlc_license_details?.tlc_license_number ||
            "",
          true
        );
        // formik.setFieldValue(
        //   "tlcLicenseExpiryDate",
        //   stepInfoData?.driver_data?.tlc_license_details?.tlc_license_expiry_date
        //     ? parse(
        //         stepInfoData?.driver_data?.tlc_license_details
        //           ?.tlc_license_expiry_date,
        //         "MM/dd/yyyy",
        //         new Date()
        //       )
        //     : "",
        //   true
        // );
        formik.setFieldValue(
          "tlcLicenseExpiryDate",
          (() => {
            const rawDate =
              stepInfoData?.driver_data?.tlc_license_details
                ?.tlc_license_expiry_date;

            if (!rawDate) return "";

            let parsedDate = parseISO(rawDate); // handles "2025-09-09" and "2025-09-09T00:00:00"
            if (!isValid(parsedDate)) {
              // fallback if API sends in "MM/dd/yyyy" format
              parsedDate = parse(rawDate, "MM/dd/yyyy", new Date());
            }

            return parsedDate;
          })(),
          true
        );
      }

      if (stepInfoData?.driver_data?.driver_details) {
        formik.setFieldValue(
          "firstName",
          stepInfoData?.driver_data?.driver_details?.first_name || "",
          true
        );
        formik.setFieldValue(
          "middleName",
          stepInfoData?.driver_data?.driver_details?.middle_name || "",
          true
        );
        formik.setFieldValue(
          "lastName",
          stepInfoData?.driver_data?.driver_details?.last_name || "",
          true
        );
        formik.setFieldValue(
          "ssn",
          stepInfoData?.driver_data?.driver_details?.driver_ssn || "",
          true
        );
        formik.setFieldValue(
          "confirmssn",
          stepInfoData?.driver_data?.driver_details?.driver_ssn || "",
          true
        );

        // formik.setFieldValue(
        //   "dob",
        //   stepInfoData?.driver_data?.driver_details?.dob
        //     ? parse(
        //         stepInfoData?.driver_data?.driver_details?.dob,
        //         "MM/dd/yyyy",
        //         new Date()
        //       )
        //     : "",
        //   true
        // );
        formik.setFieldValue(
          "dob",
          (() => {
            const rawDate = stepInfoData?.driver_data?.driver_details?.dob;

            if (!rawDate) return "";

            let parsedDate = parseISO(rawDate); // handles "2025-09-09" and "2025-09-09T00:00:00"
            if (!isValid(parsedDate)) {
              // fallback if API sends in "MM/dd/yyyy" format
              parsedDate = parse(rawDate, "MM/dd/yyyy", new Date());
            }

            return parsedDate;
          })(),
          true
        );

        formik.setFieldValue(
          "Phone1",
          stepInfoData?.driver_data?.driver_details?.phone_number_1 || "",
          true
        );
        formik.setFieldValue(
          "Phone2",
          stepInfoData?.driver_data?.driver_details?.phone_number_2 || "",
          true
        );
        formik.setFieldValue(
          "emailID",
          stepInfoData?.driver_data?.driver_details?.email_address || "",
          true
        );

        formik.setFieldValue(
          "nameOfThePerson",
          stepInfoData?.driver_data?.driver_details
            ?.primary_emergency_contact_person || "",
          true
        );
        if (stepInfoData?.driver_data?.dmv_license_details) {
          const dmvIssuedState =
            stepInfoData?.driver_data?.dmv_license_details
              ?.dmv_license_issued_state;

          if (
            dmvIssuedState &&
            dmvIssuedState !== formik.values.dmvLicenseIssuedState?.code
          ) {
            const matchedOption = statesOptions.find(
              (item) => item.code === dmvIssuedState
            );

            formik.setFieldValue("relationship", matchedOption || null, true);
          }
        }
        // formik.setFieldValue(
        //   "relationship",
        //   stepInfoData?.driver_data?.driver_details
        //     ?.primary_emergency_contact_relationship || "",
        //   true
        // );
        const relationshipCode =
          stepInfoData?.driver_data?.driver_details
            ?.primary_emergency_contact_relationship;

        if (
          relationshipCode &&
          relationshipCode !== formik.values.relationship?.code
        ) {
          const matchedOption = relationshipOptions.find(
            (item) => item.code === relationshipCode
          );

          formik.setFieldValue("relationship", matchedOption || null, true);
        }
        formik.setFieldValue(
          "contactNumber",
          stepInfoData?.driver_data?.driver_details
            ?.primary_emergency_contact_number || "",
          true
        );
        if (
          stepInfoData?.driver_data?.driver_details
            ?.additional_emergency_contact_person &&
          stepInfoData?.driver_data?.driver_details
            ?.additional_emergency_contact_person !== ""
        ) {
          setAddtionalContact(true);
        }
        formik.setFieldValue(
          "nameOfThePersonAddtional",
          stepInfoData?.driver_data?.driver_details
            ?.additional_emergency_contact_person || "",
          true
        );
        // formik.setFieldValue(
        //   "relationshipAddtional",
        //   stepInfoData?.driver_data?.driver_details
        //     ?.additional_emergency_contact_relationship || "",
        //   true
        // );
        const additionalRelationshipCode =
          stepInfoData?.driver_data?.driver_details
            ?.additional_emergency_contact_relationship;
        if (
          additionalRelationshipCode &&
          additionalRelationshipCode !==
            formik.values.relationshipAddtional?.code
        ) {
          const matchedOption = relationshipOptions.find(
            (item) => item.code === additionalRelationshipCode
          );

          formik.setFieldValue(
            "relationshipAddtional",
            matchedOption || null,
            true
          );
        }

        formik.setFieldValue(
          "contactNumberAddtional",
          stepInfoData?.driver_data?.driver_details
            ?.additional_emergency_contact_number || "",
          true
        );
      }

      if (stepInfoData?.driver_data?.primary_address_details) {
        formik.setFieldValue(
          "addressLine1",
          stepInfoData?.driver_data?.primary_address_details?.address_line_1 ||
            "",
          true
        );
        formik.setFieldValue(
          "addressLine2",
          stepInfoData?.driver_data?.primary_address_details?.address_line_2 ||
            "",
          true
        );
        formik.setFieldValue(
          "city",
          stepInfoData?.driver_data?.primary_address_details?.city || "",
          true
        );
        // formik.setFieldValue(
        //   "state",
        //   stepInfoData?.driver_data?.primary_address_details?.state || "",
        //   true
        // );
        if (stepInfoData?.driver_data?.primary_address_details) {
          const primaryState =
            stepInfoData?.driver_data?.primary_address_details?.state;

          if (primaryState && primaryState !== formik.values.state?.code) {
            const matchedOption = statesOptions.find(
              (item) => item.code === primaryState
            );

            formik.setFieldValue("state", matchedOption || null, true);
          }
        }
        formik.setFieldValue(
          "zip",
          stepInfoData?.driver_data?.primary_address_details?.zip || "",
          true
        );
      }

      if (stepInfoData?.driver_data?.secondary_address_details) {
        formik.setFieldValue(
          "addressLine1Secondary",
          stepInfoData?.driver_data?.secondary_address_details
            ?.address_line_1 || "",
          true
        );
        formik.setFieldValue(
          "addressLine2Secondary",
          stepInfoData?.driver_data?.secondary_address_details
            ?.address_line_2 || "",
          true
        );
        formik.setFieldValue(
          "citySecondary",
          stepInfoData?.driver_data?.secondary_address_details?.city || "",
          true
        );
        if (stepInfoData?.driver_data?.secondary_address_details) {
          const secondaryState =
            stepInfoData?.driver_data?.secondary_address_details?.state;

          if (
            secondaryState &&
            secondaryState !== formik.values.stateSecondary?.code
          ) {
            const matchedOption = statesOptions.find(
              (item) => item.code === secondaryState
            );

            formik.setFieldValue("stateSecondary", matchedOption || null, true);
          }
        }
        // formik.setFieldValue(
        //   "stateSecondary",
        //   stepInfoData?.driver_data?.secondary_address_details?.state || "",
        //   true
        // );
        formik.setFieldValue(
          "zipSecondary",
          stepInfoData?.driver_data?.secondary_address_details?.zip || "",
          true
        );
      }
      const primary = stepInfoData?.driver_data?.primary_address_details;
      const secondary = stepInfoData?.driver_data?.secondary_address_details;

      const isSecondaryAddressEmpty = (addr) => {
        if (!addr) return true;
        return !addr.address_line_1 && !addr.city && !addr.state && !addr.zip;
      };

      let isMailingAddressSame = false;

      if (isSecondaryAddressEmpty(secondary)) {
        isMailingAddressSame = true;
      } else if (primary && secondary) {
        isMailingAddressSame =
          (primary.address_line_1 || "") === (secondary.address_line_1 || "") &&
          (primary.address_line_2 || "") === (secondary.address_line_2 || "") &&
          (primary.city || "") === (secondary.city || "") &&
          (primary.state || "") === (secondary.state || "") &&
          (primary.zip || "") === (secondary.zip || "");
      }

      if (isMailingAddressSame) {
        formik.setFieldValue("mailingAddress", ["yes"], true);
      } else {
        formik.setFieldValue("mailingAddress", [], true);
      }

      //Payee Details data mapping
      if (stepInfoData?.driver_data?.payee_details) {
        const payeeData = stepInfoData?.driver_data?.payee_details?.data || {};
        // Get driver's first and last name
        const driverFirstName =
          stepInfoData?.driver_data?.driver_details?.first_name || "";
        const driverLastName =
          stepInfoData?.driver_data?.driver_details?.last_name || "";
        // If bank_account_name is empty, use first + last name
        const payName =
          payeeData.bank_account_name &&
          payeeData.bank_account_name.trim() !== ""
            ? payeeData.bank_account_name
            : `${driverFirstName} ${driverLastName}`.trim();
        let initialPayName = "";
        if (
          payeeData.bank_account_name &&
          payeeData.bank_account_name.trim() !== ""
        ) {
          initialPayName = payeeData.bank_account_name;
          payNameSourceRef.current = "bank";
        } else {
          initialPayName = `${driverFirstName} ${driverLastName}`.trim();
          payNameSourceRef.current = "name";
        }
        // store last auto value so we can detect manual edits later
        lastAutoPayName.current = initialPayName;

        formik.setFieldValue(
          "pay_to_mode",
          stepInfoData?.driver_data?.payee_details?.pay_to_mode || "Check",
          true
        );

        if (stepInfoData?.driver_data?.payee_details?.pay_to_mode === "ACH") {
          console.log(
            "ACH routing number setting",
            stepInfoData?.driver_data?.payee_details?.data?.bank_routing_number
          );
          formik.setFieldValue(
            "bank_routing_number",
            stepInfoData?.driver_data?.payee_details?.data
              ?.bank_routing_number || "",
            true
          );
          formik.setFieldValue(
            "bankName",
            (
              stepInfoData?.driver_data?.payee_details?.data?.bank_name || ""
            ).toUpperCase(),
            true
          );
          formik.setFieldValue(
            "bankAccountNumber",
            stepInfoData?.driver_data?.payee_details?.data?.bank_account_number
              ? String(
                  stepInfoData?.driver_data?.payee_details?.data
                    ?.bank_account_number
                )
              : "",
            true
          );
          formik.setFieldValue(
            "confirmBankAccountNumber",
            stepInfoData?.driver_data?.payee_details?.data?.bank_account_number
              ? String(
                  stepInfoData?.driver_data?.payee_details?.data
                    ?.bank_account_number
                )
              : "",
            true
          );
          // formik.setFieldValue("pay_to", payName, true);
          // formik.setFieldValue("payeeCheck", payName, true);
          // set pay_to and payeeCheck to initialPayName (bank name or driver name)
          formik.setFieldValue("pay_to", initialPayName, true);
          formik.setFieldValue("payeeCheck", initialPayName, true);
        } else {
          formik.setFieldValue(
            "payeeCheck",
            stepInfoData?.driver_data?.payee_details?.data?.bank_account_name ||
              "",
            true
          );
          const checkPayName = payeeData.bank_account_name
            ? String(payeeData.bank_account_name)
            : initialPayName; // if bank_account_name empty, fallback to initialPayName (driver name)
          formik.setFieldValue("pay_to", checkPayName, true);
          formik.setFieldValue("payeeCheck", checkPayName, true);

          // If bank_account_name provided, mark source as bank, else name
          if (
            payeeData.bank_account_name &&
            payeeData.bank_account_name.trim() !== ""
          ) {
            payNameSourceRef.current = "bank";
            lastAutoPayName.current = payeeData.bank_account_name;
          } else {
            payNameSourceRef.current = "name";
            lastAutoPayName.current = initialPayName;
          }
          // formik.setFieldValue(
          //   "pay_to",
          //   stepInfoData?.driver_data?.payee_details?.data?.bank_account_name
          //     ? String(
          //         stepInfoData?.driver_data?.payee_details?.data
          //           ?.bank_account_name
          //       )
          //     : "",
          //   true
          // );
        }
        // else if (
        //   stepInfoData?.driver_data?.payee_details?.pay_to_mode === "Check"
        // ) {
        //   formik.setFieldValue(
        //     "payeeCheck",
        //     stepInfoData?.driver_data?.payee_details?.data?.payee_to || "",
        //     true
        //   );
        // },

        // formik.setFieldValue(
        //   "payeeCheck",
        //   stepInfoData?.driver_data?.payee_details?.data?.bank_account_name ||
        //     "",
        //   true
        // );

        // formik.setFieldValue(
        //   "pay_to",
        //   stepInfoData?.driver_data?.payee_details?.data?.bank_account_name
        //     ? String(
        //         stepInfoData?.driver_data?.payee_details?.data
        //           ?.bank_account_name
        //       )
        //     : "",
        //   true
        // );
      }
    }
    // dispatch(setIsUpload(false));
  }, [stepInfoData, isUpload]);

  useEffect(() => {
    if (payNameSourceRef.current === "name") {
      const generated = `${(formik.values.firstName || "").trim()} ${(
        formik.values.lastName || ""
      ).trim()}`.trim();
      // update only when generated value changes
      if (generated !== lastAutoPayName.current) {
        formik.setFieldValue("pay_to", generated, true);
        formik.setFieldValue("payeeCheck", generated, true);
        lastAutoPayName.current = generated;
      }
    }
  }, [formik.values.firstName, formik.values.lastName]);

  useEffect(() => {
    // if current pay_to differs from last auto-generated, mark as manual
    if (
      payNameSourceRef.current === "name" ||
      payNameSourceRef.current === "bank"
    ) {
      if (formik.values.pay_to !== lastAutoPayName.current) {
        payNameSourceRef.current = "manual";
      }
    }
  }, [formik.values.pay_to]);

  useEffect(() => {
    dispatch(setIsUpload(false));
  }, []);
  // useEffect(() => {
  //   reload();
  // }, []);

  // useEffect(() => {
  //   if (formik.values.mailingAddress?.[0] == "yes") {
  //     cancelAdditionAddress();
  //   } else {
  //     addAdditionAddress();
  //   }
  // }, [formik.values.mailingAddress]);

  useEffect(() => {
    if (isProccessDataSuccess) {
      toast.current.showToast(
        "Success",
        "Driver information successfully Saved.",
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

  const mapDocumentData = (currentStep, type) => {
    const doc = stepInfoData?.driver_documents?.find(
      (d) => d?.document_type === type
    );

    return doc;
  };
  const getDocumentDetails = (item) => {
    if (item.id === "dmvLicenseNumber") {
      const dmvLicenseDoc = mapDocumentData(currentStep, "dmv_license");
      return {
        badge_value: dmvLicenseDoc?.document_id ? "1" : "0",
        apiData: {
          ...dmvLicenseDoc,
          notes: "DMV license document",
        },
        document_type: [
          {
            name: "DMV License Document",
            code: dmvLicenseDoc?.document_type,
          },
        ],
        object_type: dmvLicenseDoc?.document_object_type,
        object_id: dmvLicenseDoc?.document_object_id,
      };
    } else if (item.id === "tlcLicenseNumber") {
      const tlcLicenseDoc = mapDocumentData(currentStep, "tlc_license");
      return {
        badge_value: tlcLicenseDoc?.document_id ? "1" : "0",
        apiData: {
          ...tlcLicenseDoc,
          notes: "TLC license document",
        },
        document_type: [
          {
            name: "TLC License Document",
            code: tlcLicenseDoc?.document_type,
          },
        ],
        object_type: tlcLicenseDoc?.document_object_type,
        object_id: tlcLicenseDoc?.document_object_id,
      };
    } else if (item.id === "uploadPhoto") {
      const photoData = mapDocumentData(currentStep, "photo");
      return {
        badge_value: photoData?.document_id ? "1" : "0",
        apiData: {
          ...photoData,
          notes: "Photo",
        },
        document_type: [
          {
            name: "Photo",
            code: photoData?.document_type,
          },
        ],
        object_type: photoData?.document_object_type,

        object_id: photoData?.document_object_id,
      };
    } else if (item.id === "ssn") {
      const ssnDoc = mapDocumentData(currentStep, "driver_ssn");
      return {
        badge_value: ssnDoc?.document_id ? "1" : "0",
        apiData: {
          ...ssnDoc,
          notes: "SSN",
        },
        document_type: [
          {
            name: "SSN",
            code: ssnDoc?.document_type,
          },
        ],
        object_type: ssnDoc?.document_object_type,
        object_id: ssnDoc?.document_object_id,
      };
    } else if (item.id === "violationDueAtRegistration") {
      return {
        badge_value: currentStep?.violation_document?.document_id ? "1" : "0",
        apiData: {
          ...currentStep?.violation_document,
          notes: "violation",
        },
        document_type: [
          {
            name: "violation",
            code: currentStep?.violation_document?.document_type,
          },
        ],
        object_type: currentStep?.violation_document?.document_object_type,
        object_id: currentStep?.violation_document?.document_object_id,
      };
    }
    return null;
  };
  const payeeProofDoc = mapDocumentData(stepInfoData, "payee_proof");
  const parts = payeeProofDoc?.document_name?.split(".");
  const extension = parts?.pop();
  const filename = parts?.join(".");
  const img = extension === "pdf" ? "pdf" : "img";
  const path = payeeProofDoc?.presigned_url;

  // Reusable helper
  const getDocumentInfo = (currentStep, documentType) => {
    const doc = mapDocumentData(currentStep, documentType);

    if (!doc || !doc.document_name) return null;

    const parts = doc.document_name.split(".");
    const extension = parts.pop();
    const filename = parts.join(".");
    const img = extension?.toLowerCase() === "pdf" ? "pdf" : "img";

    return {
      ...doc,
      filename,
      extension,
      img,
      path: doc.presigned_url,
    };
  };

  const violationDoc = getDocumentInfo(currentStep, "violation_receipt");
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
  useEffect(() => {
    formik.validateForm();
  }, [stepInfoData?.driver_documents]);

  const renderChildComponent = (
    title,
    iconName,
    variable,
    leftButtonLable = null,
    leftIconName = null,
    action = null,
    isPayee
  ) => {
    const isAdditionalContactButton =
      leftButtonLable === "Additional Contact Details";
    return (
      <div style={{ paddingTop: "10px", paddingBottom: "20px" }}>
        <div className="d-flex align-items-center justify-content-between form-sec-header">
          <div className="topic">
            <Img name={iconName}></Img>
            {title}
          </div>
        </div>
        <div className="form-body align-items-center justify-content-between">
          <div
            className="d-flex align-items-center flex-wrap form-grid-1 w-100 p-3"
            style={{ rowGap: "4rem", gap: "4rem 1rem" }}
          >
            {variable.map((item) => (
              <>
                {/* {item.inputType === "UPLOAD" ? (
                  <BInputFields
                    {...getDocumentDetails(item)}
                    variable={item}
                    formik={formik}
                  />
                ) : (
                  <>
                    {isPayee && item.id !== "pay_to_mode" ? (
                      <>
                        {(formik?.values.pay_to_mode === "Check" &&
                          item.isCheck) ||
                        (formik?.values.pay_to_mode === "ACH" &&
                          !item.isCheck) ? (
                          <BInputFields variable={item} formik={formik} />
                        ) : (
                          <></>
                        )}
                      </>
                    ) : (
                      <BInputFields variable={item} formik={formik} />
                    )}
                  </>
                )} */}
                {item.inputType === "UPLOAD" ||
                item.inputType === "VIEW_FILE" ||
                item.inputType === "VIEW_FILE_SSN" ? (
                  <BInputFields
                    {...getDocumentDetails(item)}
                    variable={item}
                    formik={formik}
                  />
                ) : item.inputType === "PAYEE_PROOF_UPLOAD" &&
                  formik?.values.pay_to_mode === "ACH" &&
                  !item.isCheck ? (
                  <div className="w-100-3">
                    <div className="d-flex align-items-center gap-1">
                      <BModal>
                        <BModal.ToggleButton>
                          <Button
                            text
                            label="Upload Payee Proof"
                            data-testid="upload-payee-proof-btn"
                            className="text-black gap-2"
                            type="button"
                            icon={() => {
                              // const payeeProofDocument = mapDocumentData(
                              //   stepInfoData,
                              //   "payee_proof"
                              // );
                              return (
                                <div className="position-relative">
                                  {payeeProofDoc?.document_id &&
                                    payeeProofDoc?.document_id > 0 && (
                                      <Badge
                                        className="badge-icon"
                                        value={
                                          payeeProofDoc?.document_id ? 1 : 0
                                        }
                                        severity="warning"
                                      />
                                    )}
                                  <Img name="upload" />
                                </div>
                              );
                            }}
                          />
                        </BModal.ToggleButton>
                        <BModal.Content>
                          <BUpload
                            // data={mapDocumentData(stepInfoData, "payee_proof")}
                            // object_id={
                            //   mapDocumentData(stepInfoData, "payee_proof")
                            //     ?.document_object_id
                            // }
                            // object_type={
                            //   mapDocumentData(stepInfoData, "payee_proof")
                            //     ?.document_object_type
                            // }
                            // document_type={[
                            //   {
                            //     name: "Payee Proof",
                            //     code: "payee_proof",
                            //   },
                            // ]}
                            {...getUploadDocumentDetails()}
                          />
                        </BModal.Content>
                      </BModal>
                      <div>
                        <span className="text-danger">*</span>
                      </div>
                      {payeeProofDoc && (
                        <PdfViewModal
                          triggerButton={
                            <Button
                              pt={{
                                root: {
                                  "data-testid": `eye-icon-btn-payee-proof`,
                                },
                              }}
                              icon={<Img name="black_ic_eye" />}
                              className="p-button-text p-0"
                              type="button"
                            />
                          }
                          title="Payee Proof"
                          downloadUrl={payeeProofDoc?.presigned_url}
                          downloadName={payeeProofDoc?.document_name
                            ?.split(".")
                            ?.join(".")}
                          extension={payeeProofDoc?.document_name
                            ?.split(".")
                            ?.pop()}
                          previewUrl={payeeProofDoc?.presigned_url}
                        />
                      )}
                    </div>
                    {formik.errors.payeeProof ? (
                      <div className="mt-2 ms-3">
                        <small style={errorMsgStyle}>
                          {formik.errors.payeeProof}
                        </small>
                      </div>
                    ) : null}
                  </div>
                ) : item.inputType === "VIOLATION_VIEW_FILE" ? (
                  <div className="d-flex align-items-center gap-1 ms-3">
                    {violationDoc?.presigned_url ? (
                      <PdfViewModal
                        triggerButton={
                          <Button
                            pt={{
                              root: { "data-testid": `eye-icon-btn-violation` },
                            }}
                            icon={<Img name="black_ic_eye" />}
                            className="p-button-text p-0"
                            type="button"
                          />
                        }
                        title={removeUnderScore(
                          violationDoc?.document_type
                        ).replace(/\b\w/g, (char) => char.toUpperCase())}
                        downloadUrl={violationDoc?.path}
                        downloadName={violationDoc?.filename}
                        extension={violationDoc?.extension}
                        previewUrl={violationDoc?.path}
                      />
                    ) : (
                      <Button
                        pt={{
                          root: { "data-testid": `disabled-eye-icon-ss4` },
                        }}
                        icon={<Img name="disabled_eye" />}
                        className="p-button-text p-0"
                        type="button"
                        disabled
                      />
                    )}

                    {/* Label with required asterisk positioned next to the icon */}
                    <div className="ms-2">
                      <span
                        className={`regular-text fs-6 ${
                          violationDoc?.presigned_url ? "" : "text-grey"
                        }`}
                      >
                        Violation Receipt
                      </span>
                    </div>
                  </div>
                ) : item.inputType === "PAYEE_PROOF_VIEW" &&
                  formik?.values.pay_to_mode === "ACH" &&
                  !item.isCheck ? (
                  <div className="w-100-3">
                    <div className="d-flex align-items-center gap-1 ms-2">
                      {payeeProofDoc?.presigned_url ? (
                        <PdfViewModal
                          triggerButton={
                            <Button
                              pt={{
                                root: { "data-testid": `eye-icon-btn` },
                              }}
                              icon={<Img name="black_ic_eye" />}
                              className="p-button-text p-0"
                              type="button"
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
                      ) : (
                        <Button
                          pt={{
                            root: { "data-testid": `disabled-eye-icon-ss4` },
                          }}
                          icon={<Img name="disabled_eye" />}
                          className="p-button-text p-0"
                          type="button"
                          disabled
                        />
                      )}

                      {/* Label with required asterisk positioned next to the icon */}
                      <div className="ms-1">
                        <span
                          className={`regular-text fs-6 ${
                            payeeProofDoc?.presigned_url ? "" : "text-grey"
                          }`}
                        >
                          Payee Proof
                        </span>
                        <span className="text-danger ms-1">*</span>
                      </div>
                    </div>
                    {formik.errors.payeeProof ? (
                      <div className="mt-2 ms-3">
                        <small style={errorMsgStyle}>
                          {formik.errors.payeeProof}
                        </small>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <>
                    {isPayee && item.id !== "pay_to_mode" ? (
                      <>
                        {(formik?.values.pay_to_mode === "Check" &&
                          item.isCheck) ||
                        (formik?.values.pay_to_mode === "ACH" &&
                          !item.isCheck) ? (
                          <>
                            {item.id === "bank_routing_number" ? (
                              <div className="w-100-3">
                                <BInputText
                                  variable={item}
                                  formik={formik}
                                  onBlur={(e) => {
                                    formik.handleBlur(e);
                                    const value = e.target.value.trim();
                                    if (value) {
                                      getBankDetails(value);
                                    } else {
                                      // Optionally clear bank name if user removed routing number
                                      formik.setFieldValue("bankName", "");
                                    }
                                    // getBankDetails(value);
                                  }}
                                />
                              </div>
                            ) : (
                              <BInputFields variable={item} formik={formik} />
                            )}
                          </>
                        ) : null}
                      </>
                    ) : (
                      <BInputFields variable={item} formik={formik} />
                    )}
                  </>
                )}
              </>
            ))}
          </div>
          {leftButtonLable && (
            <div className="d-flex justify-content-end">
              <Button
                disabled={
                  !hasAccess || (isAdditionalContactButton && isAddtionContact)
                }
                text
                label={leftButtonLable}
                type="button"
                className="text-black gap-2"
                onClick={() => {
                  action();
                }}
                {...(leftIconName && {
                  icon: () => <Img name={leftIconName} />,
                })}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderViewChildComponent = (
    title,
    iconName,
    variable,
    leftButtonLable = null,
    leftIconName = null,
    action = null,
    rightButtonLabel = null,
    rightIconName = null,
    rightAction = null
  ) => {
    return (
      <div style={{ paddingTop: "10px", paddingBottom: "20px" }}>
        <div className="d-flex align-items-center justify-content-between form-sec-header">
          <div className="topic">
            <Img name={iconName}></Img>
            {title}
          </div>
        </div>
        <div className="form-body align-items-center justify-content-between">
          <div className="d-flex align-items-center flex-wrap form-grid-1 w-75">
            {variable.map((item) => (
              <div key={item.id}>
                {/* <BInputFields variable={item} formik={formik} /> */}
                {item.inputType === "CALENDAR" ? (
                  <BCaseCard
                    className={`b-card-fields ${item.size}`}
                    label={item.label}
                    value={dateMonthYear(formik.values[item.id])}
                  ></BCaseCard>
                ) : (
                  <>
                    <div className={`b-card-fields ${item.size}`}>
                      <p className="text-grey mb-0 regular-text">
                        {item.label}
                      </p>
                      <p className="regular-semibold-text">
                        {formik.values[item.id] || "-"}
                      </p>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="d-flex justify-content-between align-items-center">
            {rightButtonLabel && (
              <div>
                <Button
                  text
                  label={rightButtonLabel}
                  type="button"
                  className="text-blue gap-2"
                  onClick={() => {
                    rightAction();
                  }}
                  {...(rightIconName && {
                    icon: () => <Img name={rightIconName} />,
                  })}
                />
              </div>
            )}

            {leftButtonLable && (
              <div>
                <Button
                  disabled={!hasAccess}
                  text
                  label={leftButtonLable}
                  type="button"
                  className="text-black gap-2"
                  onClick={() => {
                    action();
                  }}
                  {...(leftIconName && {
                    icon: () => <Img name={leftIconName} />,
                  })}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // const addAdditionAddress = () => {
  //   setAddtionalAddress(true);
  // };
  // const cancelAdditionAddress = () => {
  //   setAddtionalAddress(false);
  //   // formik.setFieldValue("mailingAddress", ["yes"], true);
  //   formik.setFieldValue("mailingAddress", ["yes"], true);
  // };

  const addAdditionPaymentOption = () => {
    setAddtionalPaymentOption(true);
  };
  const cancelAdditionPaymentOption = () => {
    setAddtionalPaymentOption(false);
  };

  const addAdditionContact = () => {
    setAddtionalContact(true);
  };
  const cancelAdditionContact = () => {
    setAddtionalContact(false);
  };

  const setEditForm = () => {
    setIsView(false);
  };

  useEffect(() => {
    if (data?.name) {
      // Success case: Set the bank name
      formik.setFieldValue("bankName", data?.name.toUpperCase());
    } else {
      // Failure case: Clear the bank name field
      formik.setFieldValue("bankName", "");
    }
  }, [data]);
  const morePaymentOptions = useMemo(() => {
    return newDriverMorePaymentOption.map((item) => {
      if (
        item.id === "enterCreditCardNumber" &&
        formik?.values?.payByCreditCard?.[0] !== "Yes" &&
        isAddtionPaymentOption
      ) {
        return { ...item, isRequire: false };
      } else {
        return item;
      }
    });
  }, [newDriverMorePaymentOption, formik.values]);

  return (
    <div>
      <form
        className="common-form d-flex flex-column gap-5"
        onSubmit={formik.handleSubmit}
      >
        {
          // !isView
          true ? (
            <div className="form-section">
              <div>
                {renderChildComponent(
                  "Driver Details",
                  "driver",
                  newDriverDetail
                )}
              </div>

              <div>
                {renderChildComponent(
                  "Personal Details",
                  "driver",
                  newDriverPersonalDetail
                )}
              </div>

              <div>
                {renderChildComponent(
                  "Address Details",
                  "ic_location",
                  newDriverAddress
                )}
              </div>

              {isAddtionAddress && (
                <div>
                  {renderChildComponent(
                    "Secondary Address",
                    "ic_location",
                    newDriverSecondaryAddress,
                    "Cancel",
                    null,
                    //cancelAdditionAddress
                    () => formik.setFieldValue("mailingAddress", ["yes"])
                  )}
                </div>
              )}

              <div>
                {renderChildComponent(
                  "Payee Details",
                  "img_bank",
                  newDriverPayeeDetail,
                  null,
                  null,
                  null,
                  true
                )}
              </div>

              {/* {isAddtionPaymentOption && (
              <div>
                {renderChildComponent(
                  "More Payment Options",
                  "img_payment",
                  morePaymentOptions,
                  "Cancel",
                  null,
                  cancelAdditionPaymentOption
                )}
              </div>
            )} */}
              <div>
                {renderChildComponent(
                  "Emergency Contact Details",
                  "emg_contact",
                  newDriveEmergencyNumber,
                  "Additional Contact Details",
                  "add",
                  addAdditionContact
                )}
              </div>

              {isAddtionContact && (
                <div>
                  {renderChildComponent(
                    "Additional Emergency Contact Details",
                    "emg_contact",
                    newDriveAddtionalEmergencyNumber,
                    "Cancel",
                    null,
                    cancelAdditionContact
                  )}
                </div>
              )}
            </div>
          ) : (
            <></>
            // <div className="form-section">
            //   <div>
            //     {renderViewChildComponent(
            //       "Driver Details",
            //       "driver",
            //       newDriverDetail,
            //       "Modify Details",
            //       "pencil_edit",
            //       setEditForm,
            //       "View Outstanding Balance",
            //       "ic_eye",
            //       () => {
            //         setDialogVisible(true);
            //       }
            //     )}
            //   </div>

            //   <div>
            //     {renderViewChildComponent(
            //       "Personal Details",
            //       "driver",
            //       newDriverPersonalDetail
            //     )}
            //   </div>

            //   <div>
            //     {renderViewChildComponent(
            //       "Address Details",
            //       "ic_location",
            //       newDriverAddress
            //     )}
            //   </div>

            //   {isAddtionAddress && (
            //     <div>
            //       {renderViewChildComponent(
            //         "Secondary Address",
            //         "ic_location",
            //         newDriverSecondaryAddress
            //       )}
            //     </div>
            //   )}

            //   <div>
            //     {renderViewChildComponent(
            //       "Payee Details",
            //       "img_bank",
            //       newDriverPayeeDetail
            //     )}
            //   </div>

            //   {isAddtionPaymentOption && (
            //     <div>
            //       {renderViewChildComponent(
            //         "More Payment Options",
            //         "img_payment",
            //         newDriverMorePaymentOption
            //       )}
            //     </div>
            //   )}
            //   <div>
            //     {renderViewChildComponent(
            //       "Emergency Contact Details",
            //       "emg_contact",
            //       newDriveEmergencyNumber
            //     )}
            //   </div>

            //   {isAddtionContact && (
            //     <div>
            //       {renderViewChildComponent(
            //         "Additional Emergency Contact Details",
            //         "emg_contact",
            //         newDriveAddtionalEmergencyNumber
            //       )}
            //     </div>
            //   )}
            // </div>
          )
        }
        <div className="w-100 position-sticky bottom-0 py-3 bg-white">
          <Button
            disabled={
              !hasAccess
              // !currentStep?.violation_document?.presigned_url
            }
            label="Submit Driver Details"
            data-testid="submit-driver-details"
            type="button"
            severity="warning"
            // onClick={() => setIsView(false)}
            onClick={handleFormSubmit}
            className="border-radius-0 primary-btn"
          />
        </div>
      </form>
      {/* <Dialog
        visible={isDialogVisible}
        modal
        onHide={() => setDialogVisible(false)}
        content={() => (
          <div className="d-flex flex-column gap-4 align-items-center p-5 bg-light confirm-modal">
            <div className="w-100 d-flex align-items-center justify-content-between mb-2 header">
              <div className="header-text">Outstanding Balance</div>
              <Button
                text
                className="close-icon"
                data-testid="close-icon"
                icon={() => <Img name="modalCancel"></Img>}
                onClick={() => {
                  setDialogVisible(false);
                }}
              ></Button>
            </div>
            <DataTable
              className="custom-data-table"
              value={formatDues(currentStep?.outstanding_dues)}
              scrollable
              scrollHeight="300px"
            >
              <Column field="label" header="Total" />
              <Column
                field="amount"
                header={currentStep?.outstanding_dues?.dtr_due}
              />
            </DataTable>
          </div>
        )}
      ></Dialog> */}
      <BToast ref={toast} position="top-right" />
    </div>
  );
};

export default DriverRegistration;
