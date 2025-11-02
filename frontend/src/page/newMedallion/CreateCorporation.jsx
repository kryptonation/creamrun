import { useFormik, FieldArray, getIn } from "formik";
import {
  statesOptions,
  createCorporation as variable,
} from "../../utils/variables";
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
import { useEffect, useMemo, useRef, useState } from "react";
import BSelectWithSearch from "../../components/BSelectWithSearch";
import {
  useDeleteDocumentMutation,
  useGetStepInfoQuery,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
  useLazyGetStepInfoQuery,
} from "../../redux/api/medallionApi";
import {
  CREATE_CORPORATION,
  ENTER_CORPORATION_DETAIL,
} from "../../utils/constants";
import { yearMonthDate } from "../../utils/dateConverter";
import { removeUnderScore, validateEmailAdvanced } from "../../utils/utils";
import { Badge } from "primereact/badge";
import {
  useGetBankDetailsMutation,
  useGetCorporationListQuery,
  useIndividualListQuery,
} from "../../redux/api/individualListApi";
import { getCurrentStep } from "../../utils/caseUtils";
import { useDispatch, useSelector } from "react-redux";
import { setIsUpload } from "../../redux/slice/uploadSlice";
import BInputFileView from "../../components/BInputFileView";
import PdfViewModal from "../../components/PdfViewModal";
import BAttachedFile from "../../components/BAttachedFile";
import BInputFileViewEIN from "../../components/BInputFileViewEIN";
import BInputFileViewSSN from "../../components/BInputFileViewSSN";
import {
  validateBankAccountNumber,
  validateBankName,
  validateNameField,
  validateOptionalNameField,
  validateRoutingNumber,
  validateUSZipCode,
} from "../../utils/formUitiles";
import BInputNumber from "../../components/BInputNumber";
import { Tooltip } from "primereact/tooltip";
import { Dropdown } from "primereact/dropdown";
import { gridToolTipOptins } from "../../utils/tooltipUtils";
import BUploadCorporation from "../../components/BUploadCorporation";
import BToast from "../../components/BToast";

const CreateCorporation = ({
  caseId,
  currentStepId,
  isCaseSuccess,
  reload,
  currentStep,
  caseData,
  hasAccess,
}) => {
  console.log(
    "Create Corporation",
    caseId,
    currentStepId,
    isCaseSuccess,
    currentStep,
    caseData,
    hasAccess
  );
  const params = useParams();
  console.log("Create Corporation params", params);
  const [processFlow, { isSuccess: isProccessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [moveCase] = useMoveCaseDetailMutation();
  // const { data: stepInfoData, isSucces: isStepInfoSuccess } =
  //   useGetStepInfoQuery(
  //     { caseNo: caseId, step_no: currentStepId },
  //     { skip: !caseId }
  //   );
  const [triggerGetStepInfo, { data: stepInfoData, isFetching }] =
    useLazyGetStepInfoQuery();
  const { data: individualListData } = useIndividualListQuery();
  const { data: corporationListData } = useGetCorporationListQuery();
  const [getBankDetails, { data, isLoading }] = useGetBankDetailsMutation();
  const [lastRoutingFieldTriggered, setLastRoutingFieldTriggered] =
    useState(null);
  const [activePayeeIndex, setActivePayeeIndex] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const toast = useRef(null);

  console.log("Step info data", individualListData);
  const filteredOptions = individualListData?.items
    .filter((item) => !!item.full_name)
    .map((item) => ({
      name: item.full_name,
      code: item.id,
    }));
  console.log("Filter options", filteredOptions);
  const [isLLC, setIsLLC] = useState(false);
  const [isHoldingCompany, setIsHoldingCompany] = useState(false);
  const [isKeyPerson, setKeyPerson] = useState(false);
  const isUpload = useSelector((state) => state.upload.isUpload);
  const dispatch = useDispatch();
  const [secondaryAdd, setSecondaryAdd] = useState(true);

  const mapDocumentData = (currentStep, type) => {
    const doc = currentStep?.documents?.find((d) => d?.document_type === type);
    return doc;
  };

  const validateZipCodeField = (value) => {
    const result = validateUSZipCode(value);
    return result.isValid ? undefined : result.message;
  };

  // 🔹 Call API on page load
  useEffect(() => {
    if (caseId && currentStepId) {
      triggerGetStepInfo({ caseNo: caseId, step_no: currentStepId });
    }
  }, [caseId, currentStepId, triggerGetStepInfo]);

  const riderDocument =
    stepInfoData?.documents?.find(
      (doc) => doc.document_type === "rider_document"
    ) ||
    currentStep?.documents?.find(
      (doc) => doc.document_type === "rider_document"
    );
  const [deleteFunc, { isSuccess }] = useDeleteDocumentMutation();

  const initialOwner = {
    id: `owner_${Date.now()}`,
    fullName: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: null,
    zip: "",
    // governmentIdType: null,
    governmentIdFile: null,
    ssnOrItin: "",
    role: null,
    otherRole: "",
    isPrimaryContact: true,
    isAuthorizedSigner: true,
    isPayee: false,
    phone: "",
    email: "",
  };

  const defaultCorporationPayee = {
    id: "payee_this_corporation",
    payeeType: { name: "This Corporation", code: "Corporation" },
    allocationPercentage: 100.0,
    paymentMethod: { name: "ACH Transfer", code: "ACH" },
    routingNumber: "",
    bankName: "",
    bankAccountNumber: "",
    confirmBankAccountNumber: "",
    payeeProofFile: null,
    ownerData: null,
  };

  const governmentIdOptions = [
    { name: "Driver's License", code: "driving_license" },
    { name: "Passport", code: "passport" },
  ];

  const roleOptions = [
    { name: "Member", code: "member" },
    { name: "Managing Member", code: "managing_member" },
    { name: "Manager", code: "manager" },
    { name: "President", code: "president" },
    { name: "Secretary", code: "secretary" },
    { name: "Treasurer", code: "treasurer" },
    { name: "Authorized Representative", code: "authorized_rep" },
    { name: "Other", code: "other" },
  ];

  const selectedBadgeStyle = {
    backgroundColor: "#FEC9171A",
    border: "1px solid #FEC917",
    borderRadius: "2rem",
    color: "#495057",
    width: "fit-content",
  };

  const errorMsgStyle = {
    color: "#ff0000",
  };

  const unselectedBadgeStyle = {
    backgroundColor: "#FFFFFF",
    border: "1px solid #DEE2E6",
    borderRadius: "2rem",
    color: "#495057",
    width: "fit-content",
  };
  const infoBoxStyle = {
    backgroundColor: "#e7f3ff",
    border: "1px solid #b8daff",
    borderRadius: "6px",
    padding: "1rem",
    color: "#004085",
    width: "100%",
    marginTop: "1.5rem",
  };
  const generateButtonStyle = {
    backgroundColor: isHovered ? "#FEC917" : "#FFFFFF",
    border: "1px solid #FEC917",
    color: "#495057",
    transition: "background-color 0.2s ease, color 0.2s ease",
  };
  const ss4_doc = useMemo(
    () => mapDocumentData(currentStep, "ss4"),
    [currentStep]
  );

  const { parts, extension, filename, img, path } = useMemo(() => {
    if (!ss4_doc) return {};
    const parts = ss4_doc?.document_name?.split(".");
    const extension = parts?.pop();
    const filename = parts?.join(".");
    const img = extension === "pdf" ? "pdf" : "img";
    const path = ss4_doc?.presigned_url;

    return { parts, extension, filename, img, path };
  }, [ss4_doc]);

  const parentHoldingCompanyOptions = useMemo(() => {
    // Start with "None" as the default first option
    const options = [{ name: "None", code: "None" }];
    if (corporationListData?.items) {
      const mappedCorps = corporationListData.items.map((corp) => ({
        name: corp.name,
        code: corp.id,
      }));
      // Combine "None" with the list of corporations from the API
      return [...options, ...mappedCorps];
    }
    return options;
  }, [corporationListData]);

  const formik = useFormik({
    // initialValues: {
    //   [variable.field_01.id]: "",
    //   [variable.field_02.id]: "",
    //   [variable.field_03.id]: "",
    //   [variable.field_04.id]: "",
    //   [variable.field_05.id]: "",
    //   [variable.field_06.id]: "",
    //   [variable.field_07.id]: "",
    //   [variable.field_08.id]: "",
    //   [variable.field_11.id]: "",
    //   [variable.field_12.id]: "",
    //   // [variable.field_13.id]: "",
    //   ["llc"]: false,

    //   [variable.field_14.id]: "",
    //   [variable.field_15.id]: "",
    //   [variable.field_16.id]: "",
    //   [variable.field_17.id]: "",
    //   [variable.field_18.id]: null,
    //   [variable.field_19.id]: {
    //     name: "Driving License",
    //     code: "drivingLicense",
    //   },
    //   [variable.passportNo.id]: "",
    //   [variable.passportExpiryDate.id]: "",
    //   [variable.field_17.id]: "",
    //   [variable.field_20.id]: "",
    //   [variable.field_21.id]: "",

    //   [variable.field_24.id]: "Check",
    //   [variable.field_25.id]: "",
    //   [variable.field_26.id]: "",
    //   [variable.field_27.id]: "",
    //   [variable.field_28.id]: "",
    //   [variable.field_29.id]: "",
    //   // [variable.field_30.id]: "",
    //   // [variable.field_31.id]: "",
    //   // [variable.field_32.id]: "",
    //   // [variable.field_33.id]: "",
    //   // [variable.field_34.id]: "",
    //   // [variable.field_35.id]: "",
    //   // [variable.field_36.id]: "",
    //   [variable.field_37.id]: "",
    //   [variable.field_38.id]: null,
    //   [variable.field_22.id]: null,
    //   [variable.field_23.id]: null,
    //   // [variable.contract_signed_mode.id]: "",
    //   [variable.field_43.id]: "", // keyPeoplefirstName
    //   [variable.field_44.id]: "", // keyPeopleMiddleName
    //   [variable.field_45.id]: "", // keyPeopleLastName
    //   [variable.field_46.id]: "", // keyPeopleAddressLine1
    //   [variable.field_47.id]: "", // keyPeopleAddressLine2
    //   ["payTo2"]: "Check",
    //   ["bank_routing_number2"]: "",
    //   ["bankName2"]: "",
    //   ["bankAccountNumber2"]: "",
    //   ["confirmBankAccountNumber2"]: "",
    //   ["payee2"]: "",
    //   ["effectiveFrom2"]: "",
    //   beneficialOwners: [initialOwner],
    //   payees: [defaultCorporationPayee],
    // },
    initialValues: {
      nameCorporation: "",
      EIN: "",
      emailAddress: "",
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
      parent_holding_company: null,
      correspondence_signed_mode: null,
      beneficialOwners: [initialOwner],
      payees: [defaultCorporationPayee],
    },
    validateOnChange: true,
    // validate: (values) => {
    //   const requiredFields = [
    //     variable.field_01,
    //     variable.field_02,
    //     variable.field_03,
    //     variable.field_04,
    //     variable.field_06,
    //     variable.field_07,
    //     variable.field_08,
    //     variable.field_12,
    //   ];
    //   const errors = {};
    //   const digitRegex = /^\d+$/;
    //   const alphaRegex = /^[A-Za-z\s]+$/;

    //   requiredFields.forEach((field) => {
    //     if (!values[field.id]) {
    //       errors[field.id] = `${field.label} is required`;
    //     }
    //   });

    //   const zipError = validateZipCodeField(values.zip);
    //   if (zipError) {
    //     errors["zip"] = zipError;
    //   }
    //   // EIN validation
    //   if (values[variable.field_02.id]) {
    //     const einValue = values[variable.field_02.id];
    //     const einPattern = /^\d{2}-\d{7}$/;

    //     if (!einPattern.test(einValue)) {
    //       errors[variable.field_02.id] =
    //         "EIN must be in format XX-XXXXXXX (9 digits total)";
    //     }
    //   }

    //   if (!values[variable.field_12.id]) {
    //     errors[variable.field_12.id] = `Email Address is required`;
    //   } else if (!validateEmailAdvanced(values[variable.field_12.id])) {
    //     errors[variable.field_12.id] = `Please enter a valid email address`;
    //   }
    //   if (values[variable.field_01.id].length < 3) {
    //     errors[
    //       variable.field_01.id
    //     ] = `${variable.field_01.label} must be at least 3 characters`;
    //   }

    //   if (values[variable.field_18.id] >= new Date()) {
    //     errors[
    //       variable.field_18.id
    //     ] = `${variable.field_18.label} must be in the past`;
    //   }

    //   if (!isLLC) {
    //     const firstNameError = validateNameField(
    //       values[variable.field_14.id],
    //       "First Name"
    //     );
    //     if (firstNameError) {
    //       errors.cpfirstName = firstNameError;
    //     }

    //     const middleNameError = validateOptionalNameField(
    //       values.cpMiddleName,
    //       "Middle Name"
    //     );
    //     if (middleNameError) {
    //       errors.middleName = middleNameError;
    //     }

    //     const lastNameError = validateNameField(values.cpLastName, "Last Name");
    //     if (lastNameError) {
    //       errors.cpLastName = lastNameError;
    //     }

    //     if (!values[variable.field_17.id]) {
    //       errors[
    //         variable.field_17.id
    //       ] = `${variable.field_17.label} is required`;
    //     } else if (
    //       !/^[\dX]{9}$/.test(values[variable.field_17.id]) && // 9 digits/X
    //       !/^[\dX]{3}-[\dX]{2}-[\dX]{4}$/.test(values[variable.field_17.id]) // XXX-XX-XXXX
    //     ) {
    //       errors[variable.field_04.id] =
    //         "SSN must be 9 digits in the format XXX-XX-XXXX";
    //     }
    //     if (!values[variable.field_39.id]) {
    //       errors[variable.field_39.id] = `Email Address is required`;
    //     } else if (!validateEmailAdvanced(values[variable.field_39.id])) {
    //       errors[variable.field_39.id] = `Please enter a valid email address`;
    //     }

    //     if (!values.primaryContactNumber) {
    //       errors.primaryContactNumber = "Contact Number is required";
    //     }
    //   }

    //   if (!values["correspondence_signed_mode"]) {
    //     errors["correspondence_signed_mode"] =
    //       "Correspondence Method is required";
    //   }

    //   const ownerErrors = [];
    //   let primaryContactCount = 0;
    //   let authorizedSignerCount = 0;
    //   values.beneficialOwners.forEach((owner, index) => {
    //     const currentOwnerErrors = {};
    //     if (!owner.fullName)
    //       currentOwnerErrors.fullName = "Full Name is required";
    //     if (!owner.addressLine1)
    //       currentOwnerErrors.addressLine1 = "Address Line 1 is required";
    //     if (!owner.city) currentOwnerErrors.city = "City is required";
    //     if (!owner.state) currentOwnerErrors.state = "State is required";
    //     if (!owner.zip) {
    //       currentOwnerErrors.zip = "ZIP is required";
    //     } else {
    //       const ownerZipError = validateZipCodeField(owner.zip);
    //       if (ownerZipError) currentOwnerErrors.zip = ownerZipError;
    //     }
    //     // if (!owner.governmentIdType)
    //     //   currentOwnerErrors.governmentIdType = "ID Type is required";
    //     if (!owner.role) currentOwnerErrors.role = "Role is required";
    //     if (owner.isPayee) {
    //       if (!owner.ssnOrItin) {
    //         currentOwnerErrors.ssnOrItin = "SSN/ITIN is required for payees";
    //       } else if (
    //         !/^\d{3}-?\d{2}-?\d{4}$/.test(owner.ssnOrItin) &&
    //         !/^\d{9}$/.test(owner.ssnOrItin)
    //       ) {
    //         currentOwnerErrors.ssnOrItin = "SSN/ITIN must be 9 digits";
    //       }
    //     }
    //     if (owner.isPrimaryContact || owner.isAuthorizedSigner) {
    //       if (!owner.phone)
    //         currentOwnerErrors.phone = "Contact Number is required";
    //       if (!owner.email) {
    //         currentOwnerErrors.email = "Email Address is required";
    //       } else if (!validateEmailAdvanced(owner.email)) {
    //         currentOwnerErrors.email = "Invalid email format";
    //       }
    //     }
    //     if (owner.role?.code === "other" && !owner.otherRole) {
    //       currentOwnerErrors.otherRole = "Please specify role";
    //     }
    //     if (owner.isPrimaryContact) primaryContactCount++;
    //     if (owner.isAuthorizedSigner) authorizedSignerCount++;
    //     if (Object.keys(currentOwnerErrors).length) {
    //       ownerErrors[index] = currentOwnerErrors;
    //     }
    //   });
    //   if (ownerErrors.length) {
    //     errors.beneficialOwners = ownerErrors;
    //   }
    //   let arrayLevelError = null;
    //   if (primaryContactCount !== 1) {
    //     arrayLevelError = "Error: There must be exactly one Primary Contact.";
    //   } else if (authorizedSignerCount < 1 || authorizedSignerCount > 2) {
    //     arrayLevelError =
    //       "Error: You must have at least 1 and no more than 2 Authorized Signers.";
    //   }
    //   if (arrayLevelError) {
    //     errors.beneficialOwners_error = arrayLevelError;
    //   }

    //   // --- New Payees Validation Logic ---
    //   const payeeErrors = [];
    //   let totalAllocation = 0;

    //   values.payees.forEach((payee, index) => {
    //     const currentPayeeErrors = {};
    //     if (!payee.payeeType) {
    //       currentPayeeErrors.payeeType = "Payee Type is required";
    //     }
    //     if (
    //       payee.allocationPercentage === null ||
    //       payee.allocationPercentage === undefined ||
    //       payee.allocationPercentage < 0
    //     ) {
    //       currentPayeeErrors.allocationPercentage = "Allocation is required";
    //     } else {
    //       totalAllocation += Number(payee.allocationPercentage) || 0;
    //     }

    //     if (payee.payeeType?.code === "Individual" && !payee.paymentMethod) {
    //       currentPayeeErrors.paymentMethod = "Payment Method is required";
    //     }

    //     if (
    //       (payee.payeeType?.code === "Corporation" ||
    //         payee.payeeType?.code === "Individual") &&
    //       payee.paymentMethod?.code === "ACH"
    //     ) {
    //       if (!payee.routingNumber)
    //         currentPayeeErrors.routingNumber = "Required";
    //       if (!payee.bankName) currentPayeeErrors.bankName = "Required";
    //       if (!payee.bankAccountNumber)
    //         currentPayeeErrors.bankAccountNumber = "Required";
    //       if (!payee.confirmBankAccountNumber)
    //         currentPayeeErrors.confirmBankAccountNumber = "Required";
    //       if (payee.bankAccountNumber !== payee.confirmBankAccountNumber) {
    //         currentPayeeErrors.confirmBankAccountNumber =
    //           "Account numbers must match";
    //       }
    //     }

    //     if (
    //       payee.payeeType?.code === "Individual" &&
    //       payee.paymentMethod?.code === "Direct To Lender"
    //     ) {
    //       if (!payee.routingNumber)
    //         currentPayeeErrors.routingNumber = "Required";
    //       if (!payee.bankName) currentPayeeErrors.bankName = "Required";
    //       if (!payee.bankAccountNumber)
    //         currentPayeeErrors.bankAccountNumber = "Required";
    //       if (!payee.confirmBankAccountNumber)
    //         currentPayeeErrors.confirmBankAccountNumber = "Required";
    //       if (payee.bankAccountNumber !== payee.confirmBankAccountNumber) {
    //         currentPayeeErrors.confirmBankAccountNumber =
    //           "Account numbers must match";
    //       }
    //     }

    //     if (Object.keys(currentPayeeErrors).length) {
    //       payeeErrors[index] = currentPayeeErrors;
    //     }
    //   });

    //   if (payeeErrors.length) {
    //     errors.payees = payeeErrors;
    //   }

    //   if (Math.round(totalAllocation) !== 100 && values.payees.length > 0) {
    //     // Corrected the error message to be more descriptive
    //     errors.payees_error = `Total Allocation must be 100%.`;
    //   }
    //   console.log("errors:", errors);
    //   return errors;
    // },
    validate: (values) => {
      const errors = {};
      const digitRegex = /^\d+$/;
      const alphaRegex = /^[A-Za-z\s]+$/;

      // --- Entity Information Validation ---
      if (!values.nameCorporation)
        errors.nameCorporation = "Corporation Name is required";
      else if (/^\s|\s$/.test(values.nameCorporation)) {
        errors.nameCorporation =
          "Corporation Name cannot start or end with spaces";
      }
      if (!values.EIN) {
        errors.EIN = "EIN is required";
      } else if (!/^\d{2}-\d{7}$/.test(values.EIN)) {
        errors.EIN = "EIN must be in format XX-XXXXXXX";
      }
      if (!values.entity_type) {
        errors.entity_type = "Entity Type is required";
      }
      // if (!values.emailAddress) {
      //   errors.emailAddress = "Email Address is required";
      // } else if (!validateEmailAdvanced(values.emailAddress)) {
      //   errors.emailAddress = "Please enter a valid email address";
      // }

      if (!isHoldingCompany) {
        if (!values.parent_holding_company) {
          errors.parent_holding_company =
            "A Parent Holding Company must be selected.";
        }
      }

      // --- Address Validation ---
      if (!values.primaryAddress1)
        errors.primaryAddress1 = "Address Line 1 is required";
      if (!values.primaryCity) errors.primaryCity = "City is required";
      if (!values.primaryState) errors.primaryState = "State is required";
      const zipError = validateZipCodeField(values.primaryZip);
      if (zipError) errors.primaryZip = zipError;

      if (!secondaryAdd) {
        if (!values.secondaryAddress1)
          errors.secondaryAddress1 = "Address Line 1 is required";
        if (!values.secondaryCity) errors.secondaryCity = "City is required";
        if (!values.secondaryState) errors.secondaryState = "State is required";
        const secondaryZipError = validateZipCodeField(values.secondaryZip);
        if (secondaryZipError) errors.secondaryZip = secondaryZipError;
      }

      // --- Correspondence Validation ---
      // if (!values.correspondence_signed_mode) {
      //   errors.correspondence_signed_mode = "Correspondence Method is required";
      // }

      // --- Beneficial Owner Validation ---
      const ownerErrors = [];
      let primaryContactCount = 0;
      let authorizedSignerCount = 0;
      values.beneficialOwners.forEach((owner, index) => {
        const currentOwnerErrors = {};
        // if (!owner.fullName)
        //   currentOwnerErrors.fullName = "Full Name is required";
        const nameError = validateNameField(owner.fullName, "Full Name");
        if (nameError) currentOwnerErrors.fullName = nameError;
        if (!owner.addressLine1)
          currentOwnerErrors.addressLine1 = "Address Line 1 is required";
        if (!owner.city) currentOwnerErrors.city = "City is required";
        if (!owner.state) currentOwnerErrors.state = "State is required";
        const ownerZipError = validateZipCodeField(owner.zip);
        if (ownerZipError) currentOwnerErrors.zip = ownerZipError;
        if (!owner.role) currentOwnerErrors.role = "Role is required";
        // if (owner.role?.code === "other" && !owner.otherRole) {
        //   currentOwnerErrors.otherRole = "Please specify role";
        // }
        if (owner.isPayee && !owner.ssnOrItin) {
          currentOwnerErrors.ssnOrItin = "SSN/ITIN is required for payees";
        }
        if (owner.ssnOrItin && !/^\d{3}-?\d{2}-?\d{4}$/.test(owner.ssnOrItin)) {
          currentOwnerErrors.ssnOrItin =
            "SSN/ITIN must be in the format XXX-XX-XXXX";
        }
        if (
          owner.phone &&
          !/^(\+1\s?)?(\([2-9][0-9]{2}\)|[2-9][0-9]{2})[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/.test(
            owner.phone
          )
        ) {
          currentOwnerErrors.phone =
            "Enter a valid US phone number (e.g., 212-456-7890)";
        }
        if (owner.email && !validateEmailAdvanced(owner.email)) {
          currentOwnerErrors.email = "Invalid email format";
        }
        if (owner.isPrimaryContact || owner.isAuthorizedSigner) {
          if (!owner.phone)
            currentOwnerErrors.phone = "Contact Number is required";
          if (!owner.email) {
            currentOwnerErrors.email = "Email Address is required";
          }
        }
        if (owner.isPrimaryContact) primaryContactCount++;
        if (owner.isAuthorizedSigner) authorizedSignerCount++;
        const dlDocType = `driving_license_${index + 1}`;
        const passportDocType = `passport_${index + 1}`;
        const govIdDoc = currentStep?.documents?.find(
          (doc) =>
            doc.document_type === dlDocType ||
            doc.document_type === passportDocType
        );
        if (!govIdDoc) {
          currentOwnerErrors.governmentIdFile =
            "Please upload the Government ID";
        }
        if (Object.keys(currentOwnerErrors).length) {
          ownerErrors[index] = currentOwnerErrors;
        }
      });
      if (ownerErrors.length) errors.beneficialOwners = ownerErrors;
      let arrayLevelError = null;
      if (primaryContactCount !== 1) {
        arrayLevelError = "Error: There must be exactly one Primary Contact.";
      } else if (authorizedSignerCount < 1 || authorizedSignerCount > 2) {
        arrayLevelError =
          "Error: You must have at least 1 and no more than 2 Authorized Signers.";
      }
      if (arrayLevelError) errors.beneficialOwners_error = arrayLevelError;

      // --- Payees Validation ---
      const payeeErrors = [];
      let totalAllocation = 0;
      values.payees.forEach((payee, index) => {
        const currentPayeeErrors = {};
        if (!payee.payeeType)
          currentPayeeErrors.payeeType = "Payee Type is required";
        if (
          payee.allocationPercentage === null ||
          payee.allocationPercentage === undefined ||
          payee.allocationPercentage < 0
        ) {
          currentPayeeErrors.allocationPercentage = "Allocation is required";
        } else {
          totalAllocation += Number(payee.allocationPercentage) || 0;
        }
        if (payee.payeeType?.code === "Individual" && !payee.paymentMethod) {
          currentPayeeErrors.paymentMethod = "Payment Method is required";
        }
        if (
          ((payee.payeeType?.code === "Corporation" ||
            payee.payeeType?.code === "Individual") &&
            payee.paymentMethod?.code === "ACH") ||
          (payee.payeeType?.code === "Individual" &&
            payee.paymentMethod?.code === "Direct To Lender")
        ) {
          // if (!payee.routingNumber)
          //   currentPayeeErrors.routingNumber = "Routing Number is required";
          const routingError = validateRoutingNumber(payee.routingNumber);
          if (routingError) {
            currentPayeeErrors.routingNumber = routingError;
          }

          // if (!payee.bankName) currentPayeeErrors.bankName = "Bank Name is required";
          // if (!payee.bankAccountNumber)
          //   currentPayeeErrors.bankAccountNumber = "Account Number is required";
          //  if (
          //   payee.bankAccountNumber &&
          //   !digitRegex.test(payee.bankAccountNumber)
          // ) {
          //   currentPayeeErrors.bankAccountNumber =
          //     "Account Number must contain only digits";
          // }

          const bankAccError = validateBankAccountNumber(
            payee.bankAccountNumber
          );
          if (bankAccError) {
            currentPayeeErrors.bankAccountNumber = bankAccError;
          }

          if (!payee.confirmBankAccountNumber)
            currentPayeeErrors.confirmBankAccountNumber =
              "Confirm Bank Account Number is required";
          if (payee.bankAccountNumber !== payee.confirmBankAccountNumber) {
            currentPayeeErrors.confirmBankAccountNumber =
              "Account numbers must match";
          }
          // if (
          //   payee.routingNumber &&
          //   !digitRegex.test(payee.routingNumber.replace(/-/g, ""))
          // ) {
          //   currentPayeeErrors.routingNumber =
          //     "Routing Number must contain only digits";
          // }

          const bankNameError = validateBankName(payee.bankName);
          if (bankNameError) currentPayeeErrors.bankName = bankNameError;
        }
        if (
          payee.paymentMethod?.code === "ACH" &&
          payee.payeeType?.code !== "Holding Entity"
        ) {
          let docType =
            payee.payeeType.code === "Corporation"
              ? "payee_proof_this_corporation"
              : `payee_proof_${index + 1}`;
          const payeeProofDoc = currentStep?.documents?.find(
            (doc) => doc.document_type === docType
          );
          if (!payeeProofDoc) {
            currentPayeeErrors.payeeProofFile = "Please upload Payee Proof";
          }
        }
        if (payee.paymentMethod?.code === "Direct To Lender") {
          const docType = `authorization_letter_${index + 1}`;
          const authLetterDoc = currentStep?.documents?.find(
            (doc) => doc.document_type === docType
          );
          if (!authLetterDoc) {
            currentPayeeErrors.paymentAuthFile =
              "Please upload Authorization Letter";
          }
        }
        if (Object.keys(currentPayeeErrors).length)
          payeeErrors[index] = currentPayeeErrors;
      });
      if (payeeErrors.length) errors.payees = payeeErrors;
      if (totalAllocation !== 100 && values.payees.length > 0) {
        errors.payees_error = `Total Allocation must be exactly 100.00%.`;
      }

      return errors;
    },
    onSubmit: (values) => {
      console.log("Validation passed. Generating document for values:", values);

      if (
        values.payees.length === 1 &&
        ["Corporation", "Holding Entity"].includes(
          values.payees[0].payeeType.code
        )
      ) {
        console.log("Cleaning up unused individual payee documents...");

        // Regex to find document types like 'payee_proof_1' or 'authorization_letter_12'
        const individualPayeeDocRegex =
          /^(payee_proof_\d+|authorization_letter_\d+)$/;

        const docsToDelete = currentStep?.documents?.filter((doc) =>
          individualPayeeDocRegex.test(doc.document_type)
        );

        if (docsToDelete && docsToDelete.length > 0) {
          console.log("Found documents to delete:", docsToDelete);
          docsToDelete.forEach((doc) => {
            console.log(
              `Deleting document: ${doc.document_name} (ID: ${doc.document_id})`
            );
            deleteFunc(doc.document_id);
          });
        }
      }

      const isIndividualPayeeSetup = values.payees.some(
        (p) => p.payeeType.code === "Individual"
      );
      if (isIndividualPayeeSetup) {
        const corpPayeeDoc = currentStep?.documents?.find(
          (doc) => doc.document_type === "payee_proof_this_corporation"
        );

        if (corpPayeeDoc?.document_id) {
          console.log(
            "Cleaning up unused corporation payee document:",
            corpPayeeDoc
          );
          deleteFunc(corpPayeeDoc.document_id);
        }
      }
      const payload = generatePayload(values);

      console.log("Generate document payload", payload, formik.errors);
      if (hasAccess) {
        processFlow({
          params: caseId,
          data: {
            step_id: currentStepId,
            data: {
              ...payload,
            },
          },
        });
        // .unwrap()
        // .then(() => {
        //   reload();
        // });
      }
    },
  });
  const handleGenerateDocument = async () => {
    const errors = await formik.validateForm();
    console.log("errors", errors);

    if (Object.keys(errors).length === 0) {
      formik.handleSubmit();
    }
  };
  useEffect(() => {
    if (isProccessDataSuccess) {
      console.log("Process flow succeeded, reloading data...");
      toast.current.showToast(
        "Success",
        "Rider Document Generated Successfully",
        "success",
        false,
        10000
      );
      triggerGetStepInfo({ caseNo: caseId, step_no: currentStepId });
    }
  }, [isProccessDataSuccess]);
  useEffect(() => {
    if (isInitialLoad) return;

    const individualOwnerPayees = formik.values.beneficialOwners.filter(
      (o) => o.isPayee && o.fullName?.trim()
    );

    if (individualOwnerPayees.length > 0) {
      const newPayees = individualOwnerPayees.map((owner) => {
        const existingPayee = formik.values.payees.find(
          (p) => p.ownerData?.id === owner.id
        );
        return (
          existingPayee || {
            id: `payee_${owner.id}`,
            payeeType: { name: "Individual Owner", code: "Individual" },
            // allocationPercentage: formik.values.payees.length > 0 ? null : 100,
            allocationPercentage: individualOwnerPayees.length > 1 ? null : 100,
            paymentMethod: { name: "ACH Transfer", code: "ACH" },
            ownerData: owner,
          }
        );
      });
      formik.setFieldValue("payees", newPayees);
    } else {
      if (
        formik.values.payees.length !== 1 ||
        formik.values.payees[0].id !== "payee_this_corporation"
      ) {
        formik.setFieldValue("payees", [defaultCorporationPayee]);
      }
    }
  }, [
    isInitialLoad,
    formik.values.beneficialOwners.map((o) => o.isPayee).join(","),
  ]);
  // useEffect(() => {
  //   // Skip on initial form load or when payees already loaded from API
  //   if (isInitialLoad) return;

  //   // ✅ Skip if payees are already populated from API mapping
  //   const hasApiPayees = formik.values.payees?.some(
  //     (p) => p.id && p.id.startsWith("payee_") && p.ownerData
  //   );
  //   if (hasApiPayees) return;

  //   const individualOwnerPayees = formik.values.beneficialOwners.filter(
  //     (o) => o.isPayee && o.fullName?.trim()
  //   );

  //   if (individualOwnerPayees.length > 0) {
  //     const newPayees = individualOwnerPayees.map((owner) => {
  //       const existingPayee = formik.values.payees.find(
  //         (p) => p.ownerData?.id === owner.id
  //       );
  //       return (
  //         existingPayee || {
  //           id: `payee_${owner.id}`,
  //           payeeType: { name: "Individual Owner", code: "Individual" },
  //           allocationPercentage: individualOwnerPayees.length > 1 ? null : 100,
  //           paymentMethod: { name: "ACH Transfer", code: "ACH" },
  //           ownerData: owner,
  //         }
  //       );
  //     });

  //     if (JSON.stringify(newPayees) !== JSON.stringify(formik.values.payees)) {
  //       formik.setFieldValue("payees", newPayees);
  //     }
  //   } else {
  //     const hasSpecialPayees = formik.values.payees.some(
  //       (p) =>
  //         p.payeeType.code === "Individual" ||
  //         p.payeeType.code === "Holding Entity"
  //     );

  //     if (!hasSpecialPayees) {
  //       if (
  //         formik.values.payees.length !== 1 ||
  //         formik.values.payees[0].id !== "payee_this_corporation"
  //       ) {
  //         formik.setFieldValue("payees", [defaultCorporationPayee]);
  //       }
  //     }
  //   }
  // }, [
  //   isInitialLoad,
  //   formik.values.beneficialOwners.map((o) => o.isPayee).join(","),
  // ]);

  useEffect(() => {
    formik.validateForm();
  }, [currentStep?.documents]);

  useEffect(() => {
    const parentCompanyIsNone =
      !formik.values.parent_holding_company ||
      formik.values.parent_holding_company.code === "None";

    // Check if we need to make a correction
    const needsCorrection = formik.values.payees.some(
      (p) => p.payeeType.code === "Holding Entity" && parentCompanyIsNone
    );

    if (needsCorrection) {
      const correctedPayees = formik.values.payees.map((p) => {
        // If this payee is the invalid one, reset it to the default "This Corporation" state
        if (p.payeeType.code === "Holding Entity" && parentCompanyIsNone) {
          return {
            ...defaultCorporationPayee,
            id: p.id, // Preserve the unique key
          };
        }
        // Otherwise, leave it as is
        return p;
      });
      formik.setFieldValue("payees", correctedPayees);
    }
  }, [formik.values.parent_holding_company, formik.values.payees]);

  const addOwner = () => {
    const newOwners = [
      ...formik.values.beneficialOwners,
      { ...initialOwner, isPrimaryContact: false, isAuthorizedSigner: false },
    ];
    formik.setFieldValue("beneficialOwners", newOwners);
  };

  const removeOwner = (indexToRemove, existingDocument) => {
    if (formik.values.beneficialOwners.length <= 1) return; // Guard against deleting the last owner
    const newOwners = formik.values.beneficialOwners.filter(
      (_, index) => index !== indexToRemove
    );
    formik.setFieldValue("beneficialOwners", newOwners);
    if (existingDocument?.presigned_url) {
      dispatch(setIsUpload(true));
      deleteFunc(existingDocument?.document_id);
    }

    // e.stopPropagation();
  };
  const handlePayeeToggle = (owner, index) => {
    // If the user is unchecking the payee badge...
    if (owner.isPayee) {
      console.log(
        `Unchecking payee at index ${index}. Searching for documents to delete.`
      );

      // Define the document types associated with this payee index
      const payeeProofDocType = `payee_proof_${index + 1}`;
      const authLetterDocType = `authorization_letter_${index + 1}`;

      // Find the documents in the currentStep data
      const payeeProofDoc = currentStep?.documents?.find(
        (doc) => doc.document_type === payeeProofDocType
      );
      const authLetterDoc = currentStep?.documents?.find(
        (doc) => doc.document_type === authLetterDocType
      );

      // If a document exists, call the delete API mutation
      if (payeeProofDoc?.document_id) {
        console.log("Deleting payee proof:", payeeProofDoc.document_id);
        dispatch(setIsUpload(true));
        deleteFunc(payeeProofDoc.document_id);
      }
      if (authLetterDoc?.document_id) {
        console.log(
          "Deleting authorization letter:",
          authLetterDoc.document_id
        );
        dispatch(setIsUpload(true));
        deleteFunc(authLetterDoc.document_id);
      }
    }

    // Finally, toggle the isPayee state in the form
    formik.setFieldValue(`beneficialOwners[${index}].isPayee`, !owner.isPayee);
  };
  useEffect(() => {
    // Only proceed if a lookup was triggered AND the API call is no longer in progress.
    if (activePayeeIndex !== null && !isLoading) {
      const bankNameField = `payees[${activePayeeIndex}].bankName`;

      // Now that we know the API call has finished, we can safely check the result.
      if (data?.name) {
        // Success case: Set the bank name
        formik.setFieldValue(bankNameField, data.name.toUpperCase());
      } else {
        // Failure case: Clear the bank name field
        formik.setFieldValue(bankNameField, "");
      }

      // The API call has been processed, so reset the active index.
      setActivePayeeIndex(null);
    }
  }, [data, isLoading, activePayeeIndex, formik.setFieldValue]); // Add isLoading to the dependency array

  // useEffect(() => {
  //   if (data?.routingNumber && data?.name) {
  //     // Update the appropriate bank name field based on which routing field was last used
  //     if (lastRoutingFieldTriggered === "primary") {
  //       formik.setFieldValue(variable.field_26.id, data.name.toUpperCase());
  //     } else if (lastRoutingFieldTriggered === "secondary") {
  //       formik.setFieldValue("bankName2", data.name.toUpperCase());
  //     }
  //   }
  // }, [data, lastRoutingFieldTriggered]);
  // useEffect(() => {
  //   if (stepInfoData && !isUpload) {
  //     console.log("Current step", currentStep, stepInfoData);
  //     if (
  //       stepInfoData?.name &&
  //       stepInfoData?.name !== formik.values[variable.field_01.id]
  //     ) {
  //       formik.setFieldValue(variable.field_01.id, stepInfoData?.name);
  //     }
  //     if (
  //       stepInfoData?.ein &&
  //       stepInfoData?.ein !== formik.values[variable.field_02.id]
  //     ) {
  //       formik.setFieldValue(variable.field_02.id, stepInfoData?.ein);
  //     }
  //     if (
  //       stepInfoData?.primary_contact_number &&
  //       stepInfoData?.primary_contact_number !==
  //         formik.values[variable.field_03.id]
  //     ) {
  //       formik.setFieldValue(
  //         variable.field_03.id,
  //         stepInfoData?.primary_contact_number
  //       );
  //     }
  //     if (
  //       stepInfoData?.primary_email_address &&
  //       stepInfoData?.primary_email_address !==
  //         formik.values[variable.field_12.id]
  //     ) {
  //       formik.setFieldValue(
  //         variable.field_12.id,
  //         stepInfoData?.primary_email_address
  //       );
  //     }

  //     // if (
  //     //   stepInfoData?.account_id &&
  //     //   stepInfoData?.account_id !== formik.values[variable.field_13.id]
  //     // ) {
  //     //   formik.setFieldValue(variable.field_13.id, stepInfoData?.account_id);
  //     // }

  //     if (stepInfoData?.is_llc && stepInfoData?.is_llc !== isLLC) {
  //       setIsLLC(stepInfoData?.is_llc);
  //       if (
  //         stepInfoData?.secretary &&
  //         stepInfoData?.secretary !== formik.values.member?.code
  //       ) {
  //         // Define options directly instead of getting from formik values

  //         const matchedOption = filteredOptions.find(
  //           (item) => item.code === stepInfoData?.secretary?.id
  //         );

  //         formik.setFieldValue(
  //           "member", // Use the field id directly
  //           matchedOption || null,
  //           true
  //         );
  //       }

  //       if (
  //         stepInfoData?.president &&
  //         stepInfoData?.president !== formik.values.president?.code
  //       ) {
  //         // Define options directly instead of getting from formik values

  //         const matchedOption = filteredOptions.find(
  //           (item) => item.code === stepInfoData?.president?.id
  //         );

  //         formik.setFieldValue(
  //           "president", // Use the field id directly
  //           matchedOption || null,
  //           true
  //         );
  //       }

  //       if (
  //         stepInfoData?.corporate_officer &&
  //         stepInfoData?.corporate_officer !==
  //           formik.values.corporateOfficers?.code
  //       ) {
  //         // Define options directly instead of getting from formik values

  //         const matchedOption = filteredOptions.find(
  //           (item) => item.code === stepInfoData?.corporate_officer?.id
  //         );

  //         formik.setFieldValue(
  //           "corporateOfficers", // Use the field id directly
  //           matchedOption || null,
  //           true
  //         );
  //       }
  //     }
  //     if (stepInfoData?.secondary_address?.address_line_1) {
  //       setSecondaryAdd(false); // Has secondary address, so not same as default
  //     } else {
  //       setSecondaryAdd(true); // No secondary address, so same as default
  //     }

  //     if (stepInfoData?.primary_address) {
  //       const primary_address = stepInfoData?.primary_address;
  //       const fields = [
  //         {
  //           sourceKey: "address_line_1",
  //           formikVar: variable.field_04,
  //         },
  //         {
  //           sourceKey: "address_line_2",
  //           formikVar: variable.field_05,
  //         },
  //         {
  //           sourceKey: "city",
  //           formikVar: variable.field_06,
  //         },
  //         {
  //           sourceKey: "zip",
  //           formikVar: variable.field_08,
  //         },
  //       ];
  //       fields.forEach(({ sourceKey, formikVar }) => {
  //         const valueFromApi = primary_address[sourceKey];
  //         const currentValue = formik.values[formikVar.id];

  //         if (valueFromApi && valueFromApi !== currentValue) {
  //           formik.setFieldValue(formikVar.id, valueFromApi);
  //         }
  //       });
  //       const primaryState = stepInfoData?.primary_address?.state;

  //       if (primaryState && primaryState !== formik.values.state?.code) {
  //         const matchedOption = statesOptions.find(
  //           (item) => item.code === primaryState
  //         );

  //         formik.setFieldValue("state", matchedOption || null, true);
  //       }
  //     }

  //     if (stepInfoData?.primary_contact_person) {
  //       const primary_contact_person = stepInfoData?.primary_contact_person;
  //       const fields = [
  //         {
  //           sourceKey: "first_name",
  //           formikVar: variable.field_14,
  //         },
  //         {
  //           sourceKey: "middle_name",
  //           formikVar: variable.field_15,
  //         },
  //         {
  //           sourceKey: "last_name",
  //           formikVar: variable.field_16,
  //         },
  //         {
  //           sourceKey: "email",
  //           formikVar: variable.field_39,
  //         },
  //         {
  //           sourceKey: "phone",
  //           formikVar: variable.field_40,
  //         },
  //         {
  //           sourceKey: "additional_number",
  //           formikVar: variable.field_41,
  //         },
  //         { sourceKey: "ssn", formikVar: variable.field_17 },
  //       ];
  //       fields.forEach(({ sourceKey, formikVar }) => {
  //         const valueFromApi = primary_contact_person[sourceKey];
  //         const currentValue = formik.values[formikVar.id];

  //         if (valueFromApi && valueFromApi !== currentValue) {
  //           formik.setFieldValue(formikVar.id, valueFromApi);
  //         }
  //       });
  //     }
  //     if (stepInfoData?.payee_details?.pay_to_mode === "ACH") {
  //       formik.setFieldValue(variable.field_24.id, "ACH");
  //       // Check if bank_account_number is present
  //       const bank_account_details = stepInfoData?.payee_details?.data;
  //       const fields = [
  //         {
  //           sourceKey: "bank_routing_number",
  //           formikVar: variable.field_25,
  //         },
  //         {
  //           sourceKey: "bank_name",
  //           formikVar: variable.field_26,
  //         },
  //         {
  //           sourceKey: "bank_account_number",
  //           formikVar: variable.field_27,
  //         },
  //         {
  //           sourceKey: "bank_account_number",
  //           formikVar: variable.field_28,
  //         },
  //         {
  //           sourceKey: "bank_account_name",
  //           formikVar: variable.field_29,
  //         },
  //       ];
  //       fields.forEach(({ sourceKey, formikVar }) => {
  //         const valueFromApi = bank_account_details[sourceKey];
  //         const currentValue = formik.values[formikVar.id];

  //         if (valueFromApi && valueFromApi !== currentValue) {
  //           formik.setFieldValue(formikVar.id, valueFromApi);
  //         }
  //       });
  //     } else {
  //       if (
  //         stepInfoData?.payee_details?.data?.bank_account_name &&
  //         stepInfoData?.payee_details?.data?.bank_account_name !==
  //           formik.values[variable.field_29.id]
  //       ) {
  //         formik.setFieldValue(
  //           variable.field_29.id,
  //           stepInfoData?.payee_details?.data?.bank_account_name
  //         );
  //       }
  //     }

  //     if (hasAdditionalPayeeDocument() && stepInfoData?.additional_payee) {
  //       if (stepInfoData?.additional_payee?.pay_to_mode === "ACH") {
  //         formik.setFieldValue("payTo2", "ACH");

  //         // Get additional payee bank account details
  //         const additional_bank_account_details =
  //           stepInfoData?.additional_payee?.data;

  //         const additionalPayeeFields = [
  //           {
  //             sourceKey: "bank_routing_number",
  //             formikField: "bank_routing_number2",
  //           },
  //           {
  //             sourceKey: "bank_name",
  //             formikField: "bankName2",
  //           },
  //           {
  //             sourceKey: "bank_account_number",
  //             formikField: "bankAccountNumber2",
  //           },
  //           {
  //             sourceKey: "bank_account_number",
  //             formikField: "confirmBankAccountNumber2",
  //           },
  //           {
  //             sourceKey: "bank_account_name",
  //             formikField: "payee2",
  //           },
  //         ];

  //         additionalPayeeFields.forEach(({ sourceKey, formikField }) => {
  //           const valueFromApi = additional_bank_account_details[sourceKey];
  //           const currentValue = formik.values[formikField];

  //           if (valueFromApi && valueFromApi !== currentValue) {
  //             formik.setFieldValue(formikField, valueFromApi);
  //           }
  //         });
  //       } else {
  //         // For Check mode
  //         formik.setFieldValue("payTo2", "Check");

  //         if (
  //           stepInfoData?.additional_payee?.data?.payee &&
  //           stepInfoData?.additional_payee?.data.payee !==
  //             formik.values["payee2"]
  //         ) {
  //           formik.setFieldValue(
  //             "payee2",
  //             stepInfoData?.additional_payee?.data.payee
  //           );
  //         }
  //       }
  //     }
  //     if (
  //       stepInfoData?.key_people?.primary_address?.address_line_1 &&
  //       stepInfoData?.key_people?.primary_address?.address_line_1 !==
  //         formik.values[variable.field_46.id]
  //     ) {
  //       formik.setFieldValue(
  //         variable.field_46.id,
  //         stepInfoData?.key_people?.primary_address?.address_line_1
  //       );
  //     }
  //     if (
  //       stepInfoData?.key_people?.primary_address?.address_line_2 &&
  //       stepInfoData?.key_people?.primary_address?.address_line_2 !==
  //         formik.values[variable.field_47.id]
  //     ) {
  //       formik.setFieldValue(
  //         variable.field_47.id,
  //         stepInfoData?.key_people?.primary_address?.address_line_2
  //       );
  //     }
  //     if (
  //       stepInfoData?.contract_signed_mode &&
  //       stepInfoData?.contract_signed_mode !==
  //         formik.values.correspondence_signed_mode?.code
  //     ) {
  //       // Define options directly instead of getting from formik values
  //       const options = [
  //         { name: "In Person", code: "I" },
  //         { name: "Email", code: "M" },
  //         { name: "Print", code: "P" },
  //       ];

  //       const matchedOption = options.find(
  //         (item) => item.code === stepInfoData?.contract_signed_mode
  //       );

  //       formik.setFieldValue(
  //         "correspondence_signed_mode", // Use the field id directly
  //         matchedOption || null,
  //         true
  //       );
  //     }
  //   }
  // }, [stepInfoData]);
  const generatePayload = (values) => {
    const payload = {
      // --- CORPORATION DETAILS ---
      corporation_details: {
        corporation_name: values.nameCorporation || "",
        ein: values.EIN || "",
        holding_entity:
          values.parent_holding_company?.code === "None"
            ? null
            : values.parent_holding_company?.code || null,
        is_llc: values.entity_type?.code || false,
        is_holding_entity: isHoldingCompany,
        contract_signed_mode: "P",
        is_mailing_address_same: secondaryAdd,
      },

      // --- PRIMARY ADDRESS ---
      primary_address: {
        address_line_1: values.primaryAddress1 || "",
        address_line_2: values.primaryAddress2 || null,
        city: values.primaryCity || "",
        state: values.primaryState?.code || "",
        zip: values.primaryZip || "",
      },

      // --- BENEFICIAL OWNERS ---
      beneficial_owners: values.beneficialOwners.map((owner) => ({
        full_name: owner.fullName || "",
        // role:
        //   owner.role?.code === "other"
        //     ? owner.otherRole
        //     : owner.role?.name || "",
        role: owner.role?.name || "",
        ssn_or_itin: owner.ssnOrItin || null,
        email: owner.email || null,
        phone: owner.phone || null,
        is_authorized_signer: owner.isAuthorizedSigner,
        is_primary_contact: owner.isPrimaryContact,
        is_payee: owner.isPayee,
        address: {
          address_line_1: owner.addressLine1 || null,
          address_line_2: owner.addressLine2 || null,
          city: owner.city || null,
          state: owner.state?.code || null,
          zip: owner.zip || null,
        },
      })),

      // --- PAYEE DETAILS ---
      payee_details: values.payees.map((payee) => {
        const payeeDetail = {
          payee_type: payee.payeeType?.code || null,
          allocation_percentage: parseFloat(payee.allocationPercentage) || 0,
          individual_name: null,
          corporation_name: null,
          holding_entity_name: null,
        };
        console.log("payeeDetail", payeeDetail);

        // Set the correct name field based on the payee type
        switch (payee.payeeType?.code) {
          case "Individual":
            payeeDetail.individual_name = payee.ownerData?.fullName || null;
            break;
          case "Corporation":
            payeeDetail.corporation_name = values.nameCorporation || null;
            break;
          case "Holding Entity":
            payeeDetail.holding_entity_name =
              values.parent_holding_company?.name || null;
            break;
          default:
            break;
        }

        // Add bank_data if the payee type requires it (not for Holding Entity)
        if (["Individual", "Corporation"].includes(payee.payeeType?.code)) {
          let payeeName =
            payee.payeeType?.code === "Individual"
              ? payee.ownerData?.fullName
              : values.nameCorporation;

          payeeDetail.bank_data = {
            pay_to_mode: payee.paymentMethod?.code || null,
            bank_name: payee.bankName || null,
            bank_account_number: String(payee.bankAccountNumber) || null,
            bank_routing_number: payee.routingNumber || null,
            bank_account_name: payeeName || null, // Name on the bank account
            effective_from: null, // This field does not exist in the form
            payee: payeeName || "", // Payee name for checks
          };
        }
        return payeeDetail;
      }),
    };
    if (secondaryAdd) {
      // If addresses are the same, copy the primary address values.
      payload.secondary_address = {
        address_line_1: values.primaryAddress1 || "",
        address_line_2: values.primaryAddress2 || null,
        city: values.primaryCity || null,
        state: values.primaryState?.code || null,
        zip: values.primaryZip || null,
        po_box: null,
      };
    } else {
      // If addresses are different, use the secondary (mailing) address values.
      payload.secondary_address = {
        address_line_1: values.secondaryAddress1 || "",
        address_line_2: values.secondaryAddress2 || null,
        city: values.secondaryCity || null,
        state: values.secondaryState?.code || null,
        zip: values.secondaryZip || null,
        po_box: null,
      };
    }
    return payload;
  };

  useEffect(() => {
    // Only populate the form if currentStep data exists and we're not in the middle of a file upload.
    if (stepInfoData && !isUpload) {
      // --- Map Corporation Details & Address ---
      formik.setFieldValue("nameCorporation", stepInfoData?.name || "");
      formik.setFieldValue("EIN", stepInfoData?.ein || "");
      formik.setFieldValue(
        "emailAddress",
        stepInfoData?.primary_email_address || ""
      );
      setIsLLC(stepInfoData?.is_llc);
      const entityTypeObj = variable.entity_type.options.find(
        (opt) => opt.code === stepInfoData?.is_llc
      );
      formik.setFieldValue("entity_type", entityTypeObj || null);
      setSecondaryAdd(stepInfoData?.is_mailing_address_same ?? true);
      setIsHoldingCompany(stepInfoData?.is_holding_entity ?? false);
      if (stepInfoData?.holding_entity) {
        const holdingCompanyObj = parentHoldingCompanyOptions.find(
          (opt) => opt.code === stepInfoData.holding_entity
        );
        formik.setFieldValue(
          "parent_holding_company",
          holdingCompanyObj || null
        );
      }

      if (stepInfoData?.primary_address) {
        formik.setFieldValue(
          "primaryAddress1",
          stepInfoData?.primary_address.address_line_1 || ""
        );
        formik.setFieldValue(
          "primaryAddress2",
          stepInfoData?.primary_address.address_line_2 || ""
        );
        formik.setFieldValue(
          "primaryCity",
          stepInfoData?.primary_address.city || ""
        );
        formik.setFieldValue(
          "primaryZip",
          stepInfoData?.primary_address.zip || ""
        );
        const primaryStateObj = statesOptions.find(
          (opt) => opt.name === stepInfoData?.primary_address.state
        );
        formik.setFieldValue("primaryState", primaryStateObj || null);
      }

      if (stepInfoData?.secondary_address) {
        formik.setFieldValue(
          "secondaryAddress1",
          stepInfoData.secondary_address.address_line_1 || ""
        );
        formik.setFieldValue(
          "secondaryAddress2",
          stepInfoData.secondary_address.address_line_2 || ""
        );
        formik.setFieldValue(
          "secondaryCity",
          stepInfoData.secondary_address.city || ""
        );
        formik.setFieldValue(
          "secondaryZip",
          stepInfoData.secondary_address.zip || ""
        );
        const secondaryStateObj = statesOptions.find(
          (opt) => opt.name === stepInfoData.secondary_address.state
        );
        formik.setFieldValue("secondaryState", secondaryStateObj || null);
      }

      // --- Map Beneficial Owners ---
      if (
        stepInfoData?.benificial_owners &&
        stepInfoData?.benificial_owners.length > 0
      ) {
        const newBeneficialOwners = stepInfoData?.benificial_owners.map(
          (apiOwner) => {
            const ownerAddress = apiOwner.individual_data.primary_address;
            const ownerState = statesOptions.find(
              (opt) => opt.name === ownerAddress.state
            );
            const ownerRole = roleOptions.find(
              (opt) => opt.name === apiOwner.owner_type
            );

            return {
              id: `owner_${apiOwner.individual_owner_id}`,
              fullName: apiOwner.owner_name || "",
              addressLine1: ownerAddress?.address_line_1 || "",
              addressLine2: ownerAddress?.address_line_2 || "",
              city: ownerAddress?.city || "",
              state: ownerState || null,
              zip: ownerAddress?.zip || "",
              ssnOrItin: apiOwner.individual_data.masked_ssn || "",
              role: ownerRole || null,
              otherRole: "",
              isPrimaryContact: apiOwner.is_primary_contact,
              isAuthorizedSigner: apiOwner.is_authorized_signatory, // Note: Mapped from is_authorized_signatory
              isPayee: apiOwner.is_payee,
              phone: apiOwner.individual_data.primary_contact_number || "",
              email: apiOwner.individual_data.primary_email_address || "",
              governmentIdFile: null,
            };
          }
        );
        formik.setFieldValue("beneficialOwners", newBeneficialOwners);
      }

      // --- Map Payee Details ---
      if (
        stepInfoData?.payee_details &&
        stepInfoData?.payee_details.length > 0
      ) {
        const paymentMethodOptions = [
          { name: "Check", code: "Check" },
          { name: "ACH Transfer", code: "ACH" },
          { name: "Direct to Lender", code: "Direct To Lender" },
        ];

        const newPayees = stepInfoData?.payee_details
          .map((apiPayee) => {
            const ownerDataSource = stepInfoData?.benificial_owners.find(
              (o) => o.individual_owner_id === apiPayee.individual_owner_id
            );
            const paymentMethod = paymentMethodOptions.find(
              (opt) => opt.code === apiPayee.pay_to_mode
            );
            if (apiPayee.payee_type === "Corporation") {
              return {
                id: "payee_this_corporation",
                payeeType: { name: "This Corporation", code: "Corporation" },
                allocationPercentage: apiPayee.allocation_percentage,
                paymentMethod: paymentMethod || null,
                ownerData: null,
                routingNumber: apiPayee.data?.bank_routing_number || "",
                bankName: apiPayee.data?.bank_name || "",
                bankAccountNumber: apiPayee.data?.bank_account_number || "",
                confirmBankAccountNumber:
                  apiPayee.data?.bank_account_number || "",
              };
            }

            if (apiPayee.payee_type === "Individual") {
              const ownerDataSource = stepInfoData.benificial_owners.find(
                (o) => o.individual_owner_id === apiPayee.individual_owner_id
              );

              // If for some reason the owner isn't found, skip this payee to prevent a crash
              if (!ownerDataSource) {
                return null;
              }

              return {
                id: `payee_${apiPayee.individual_owner_id}`,
                payeeType: { name: "Individual Owner", code: "Individual" },
                allocationPercentage: apiPayee.allocation_percentage,
                paymentMethod: paymentMethod || null,
                ownerData: {
                  id: `owner_${ownerDataSource.individual_owner_id}`,
                  fullName: ownerDataSource.owner_name,
                },
                routingNumber: apiPayee.data?.bank_routing_number || "",
                bankName: apiPayee.data?.bank_name || "",
                bankAccountNumber: apiPayee.data?.bank_account_number || "",
                confirmBankAccountNumber:
                  apiPayee.data?.bank_account_number || "",
              };
            }
            if (apiPayee.payee_type === "Holding Entity") {
              return {
                id: `payee_holding_${apiPayee.corporation_owner_id}`,
                payeeType: {
                  name: "Parent Holding Company",
                  code: "Holding Entity",
                },
                allocationPercentage: apiPayee.allocation_percentage,
                paymentMethod: null, // Holding entities have no UI for payment method
                ownerData: null,
                // Bank details can be included if needed, but the UI hides them.
                routingNumber: apiPayee.data?.bank_routing_number || "",
                bankName: apiPayee.data?.bank_name || "",
                bankAccountNumber: apiPayee.data?.bank_account_number || "",
                confirmBankAccountNumber:
                  apiPayee.data?.bank_account_number || "",
              };
            }

            return null; // Ignore any other payee types
          })
          .filter((p) => p !== null); // Filter out any null entries

        if (newPayees.length > 0) {
          formik.setFieldValue("payees", newPayees);
        }
      }

      //     return {
      //       id: `payee_${apiPayee.individual_owner_id}`,
      //       payeeType: { name: "Individual Owner", code: "Individual" },
      //       allocationPercentage: apiPayee.allocation_percentage,
      //       paymentMethod: paymentMethod || null,
      //       ownerData: {
      //         id: `owner_${ownerDataSource.individual_owner_id}`,
      //         fullName: ownerDataSource.owner_name,
      //       },
      //       routingNumber: apiPayee.data?.bank_routing_number || "",
      //       bankName: apiPayee.data?.bank_name || "",
      //       bankAccountNumber: apiPayee.data?.bank_account_number || "",
      //       confirmBankAccountNumber: apiPayee.data?.bank_account_number || "", // Pre-fill confirmation field
      //     };
      //   });
      //   formik.setFieldValue("payees", newPayees);
      // }
      setIsInitialLoad(false);
    }
  }, [stepInfoData, isUpload]); // This effect runs when the currentStep data changes

  useEffect(() => {
    dispatch(setIsUpload(false));
  }, []);

  const navigate = useNavigate();

  const completeAndMoveCase = () => {
    if (hasAccess && caseData && caseData.case_info.case_status !== "Closed") {
      moveCase({ params: caseId })
        .unwrap()
        .then(() => {
          reload();
        });
    }
  };

  const generateDocument = async (values) => {
    const payload = {
      // --- CORPORATION DETAILS ---
      corporation_details: {
        corporation_name: values.nameCorporation || "",
        ein: values.EIN || "",
        holding_entity:
          values.parent_holding_company?.code === "None"
            ? null
            : values.parent_holding_company?.code || null,
        is_llc: values.llc || false,
        is_holding_entity: isHoldingCompany,
        contract_signed_mode: "P",
        is_mailing_address_same: secondaryAdd,
      },

      // --- PRIMARY ADDRESS ---
      primary_address: {
        address_line_1: values.primaryAddress1 || "",
        address_line_2: values.primaryAddress2 || null,
        city: values.primaryCity || "",
        state: values.primaryState?.code || "",
        zip: values.primaryZip || "",
      },

      // --- BENEFICIAL OWNERS ---
      beneficial_owners: values.beneficialOwners.map((owner) => ({
        full_name: owner.fullName || "",
        // role:
        //   owner.role?.code === "other"
        //     ? owner.otherRole
        //     : owner.role?.name || "",
        role: owner.role?.name || "",
        ssn_or_itin: owner.ssnOrItin || null,
        email: owner.email || null,
        phone: owner.phone || null,
        is_authorized_signer: owner.isAuthorizedSigner,
        is_primary_contact: owner.isPrimaryContact,
        is_payee: owner.isPayee,
        address: {
          address_line_1: owner.addressLine1 || null,
          address_line_2: owner.addressLine2 || null,
          city: owner.city || null,
          state: owner.state?.code || null,
          zip: owner.zip || null,
        },
      })),

      // --- PAYEE DETAILS ---
      payee_details: values.payees.map((payee) => {
        const payeeDetail = {
          payee_type: payee.payeeType?.code || null,
          allocation_percentage: parseFloat(payee.allocationPercentage) || 0,
          individual_name: null,
          corporation_name: null,
          holding_entity_name: null,
        };
        console.log("payeeDetail", payeeDetail);

        // Set the correct name field based on the payee type
        switch (payee.payeeType?.code) {
          case "Individual":
            payeeDetail.individual_name = payee.ownerData?.fullName || null;
            break;
          case "Corporation":
            payeeDetail.corporation_name = values.nameCorporation || null;
            break;
          case "Holding Entity":
            payeeDetail.holding_entity_name =
              values.parent_holding_company?.name || null;
            break;
          default:
            break;
        }

        // Add bank_data if the payee type requires it (not for Holding Entity)
        if (["Individual", "Corporation"].includes(payee.payeeType?.code)) {
          let payeeName =
            payee.payeeType?.code === "Individual"
              ? payee.ownerData?.fullName
              : values.nameCorporation;

          if (payee.paymentMethod?.code === "Check") {
            // If payment method is "Check", send a simplified bank_data object
            payeeDetail.bank_data = {
              pay_to_mode: payee.paymentMethod?.code || null,
              bank_name: payee.bankName || null,
              bank_account_number: null,
              bank_routing_number: null,
              bank_account_name: payeeName || null,
              effective_from: null,
              payee: payeeName || "",
            };
          } else {
            // For all other payment methods (ACH, etc.), send the full bank_data object
            payeeDetail.bank_data = {
              pay_to_mode: payee.paymentMethod?.code || null,
              bank_name: payee.bankName || null,
              bank_account_number: String(payee.bankAccountNumber) || null,
              bank_routing_number: payee.routingNumber || null,
              bank_account_name: payeeName || null,
              effective_from: null,
              payee: payeeName || "",
            };
          }

          // payeeDetail.bank_data = {
          //   pay_to_mode: payee.paymentMethod?.code || null,
          //   bank_name: payee.bankName || null,
          //   bank_account_number: String(payee.bankAccountNumber) || null,
          //   bank_routing_number: payee.routingNumber || null,
          //   bank_account_name: payeeName || null, // Name on the bank account
          //   effective_from: null, // This field does not exist in the form
          //   payee: payeeName || "", // Payee name for checks
          // };
        }
        return payeeDetail;
      }),
    };
    if (secondaryAdd) {
      // If addresses are the same, copy the primary address values.
      payload.secondary_address = {
        address_line_1: values.primaryAddress1 || "",
        address_line_2: values.primaryAddress2 || null,
        city: values.primaryCity || null,
        state: values.primaryState?.code || null,
        zip: values.primaryZip || null,
        po_box: null,
      };
    } else {
      // If addresses are different, use the secondary (mailing) address values.
      payload.secondary_address = {
        address_line_1: values.secondaryAddress1 || "",
        address_line_2: values.secondaryAddress2 || null,
        city: values.secondaryCity || null,
        state: values.secondaryState?.code || null,
        zip: values.secondaryZip || null,
        po_box: null,
      };
    }
    console.log("Generate document payload", payload, formik.errors);
    // if (hasAccess && Object.keys(formik.errors).length == 0) {
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
    // }
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
    } else if (item === "ssn") {
      const ssn_document = mapDocumentData(currentStep, "ssn");
      console.log("ssn document", ssn_document);
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
    } else if (item === "rider_document") {
      const rider_document = mapDocumentData(currentStep, "rider_document");
      // console.log("rider document", rider_document);
      return {
        name: rider_document?.document_name,
        path: rider_document?.presigned_url,
        id: rider_document?.document_id,
        document_type: rider_document?.document_type,
      };
    }
    return null;
  };
  // Add this helper function to check for additional payee document
  const hasAdditionalPayeeDocument = () => {
    return currentStep?.documents?.some(
      (doc) =>
        doc.document_type === "additional_payee" &&
        doc.document_id &&
        doc.document_id !== ""
    );
  };

  // Get the additional payee document for payee proof display
  const getAdditionalPayeeDocument = () => {
    return currentStep?.documents?.find(
      (doc) =>
        doc.document_type === "additional_payee" &&
        doc.document_id &&
        doc.document_id !== ""
    );
  };

  const authorizedSignerCount = formik.values.beneficialOwners.filter(
    (o) => o.isAuthorizedSigner
  ).length;
  const primaryContactIndex = formik.values.beneficialOwners.findIndex(
    (o) => o.isPrimaryContact
  );

  const getFile = (owner_index, existingDocument, onSuccessCallback) => {
    // let upload = {};
    // console.log("Existing document", existingDocument);
    let default_document_data = {
      document_id: "",
      document_name: "",
      document_note: "",
      document_path: "",
      document_type: "",
      document_date: "",
      document_object_type: "corporation",
      document_object_id: currentStep?.id,
      document_size: "",
      document_uploaded_date: "",
      presigned_url: "",
    };

    let upload = {
      data: existingDocument ? existingDocument : default_document_data,
      object_type: "corporation",
      object_id: currentStep?.id,
      document_id: 0,
      document_name: "",
      document_type: governmentIdOptions,
      owner_index,
      onSuccess: onSuccessCallback,
    };
    return upload;
  };
  const getPayeeFile = (owner_index, existingDocument, uploadDocoptions) => {
    // let upload = {};
    console.log("Existing document", existingDocument);
    let default_document_data = {
      document_id: "",
      document_name: "",
      document_note: "",
      document_path: "",
      document_type: "",
      document_date: "",
      document_object_type: "corporation",
      document_object_id: currentStep?.id,
      document_size: "",
      document_uploaded_date: "",
      presigned_url: "",
    };

    let upload = {
      data: existingDocument ? existingDocument : default_document_data,
      object_type: "corporation",
      object_id: currentStep?.id,
      document_id: 0,
      document_name: "",
      document_type: uploadDocoptions,
      owner_index,
    };
    return upload;
  };
  const getAuthorizationFile = (
    owner_index,
    existingDocument,
    uploadDocoptions
  ) => {
    // let upload = {};
    console.log("Existing document", existingDocument);
    let default_document_data = {
      document_id: "",
      document_name: "",
      document_note: "",
      document_path: "",
      document_type: "",
      document_date: "",
      document_object_type: "corporation",
      document_object_id: currentStep?.id,
      document_size: "",
      document_uploaded_date: "",
      presigned_url: "",
    };

    let upload = {
      data: existingDocument ? existingDocument : default_document_data,
      object_type: "corporation",
      object_id: currentStep?.id,
      document_id: 0,
      document_name: "",
      document_type: uploadDocoptions,
      owner_index,
    };
    return upload;
  };

  return (
    <div className="postion-relative">
      <p className="sec-topic pb-3">Create Corporation</p>
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
              <Img name="company"></Img>Entity Information
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
              <div className="w-100-3">
                <BInputText
                  variable={variable.field_01}
                  formik={formik}
                  isRequire={true}
                ></BInputText>
              </div>
              <div className="w-100-3">
                <BSelect
                  variable={variable.entity_type}
                  isRequire={true}
                  formik={formik}
                ></BSelect>
              </div>
              <div className="w-100-3">
                <BInputFileViewEIN
                  {...getDocumentDetails("ein")}
                  variable={variable.field_02}
                  formik={formik}
                  isRequire={true}
                ></BInputFileViewEIN>
              </div>
              {/* <div className="w-100-3 ">
                <BInputText
                  variable={variable.field_03}
                  formik={formik}
                  isRequire={true}
                ></BInputText>
              </div>
              <div className="w-100-3 ">
                <BInputText
                  variable={variable.field_11}
                  formik={formik}
                ></BInputText>
              </div>
              <div className="w-100-3 ">
                <BInputText
                  variable={variable.field_12}
                  formik={formik}
                  isRequire={true}
                ></BInputText>
              </div>
              <div className="w-100-2 ">
                <BInputText
                  variable={variable.field_04}
                  formik={formik}
                  isRequire={true}
                ></BInputText>
              </div>
              <div className="w-100-2 ">
                <BInputText
                  variable={variable.field_05}
                  formik={formik}
                ></BInputText>
              </div>
              <div className="w-100-3 ">
                <BInputText
                  variable={variable.field_06}
                  formik={formik}
                  isRequire={true}
                ></BInputText>
              </div>
              <div className="w-100-3 ">
                <BSelect
                  variable={variable.field_07}
                  formik={formik}
                  isRequire={true}
                ></BSelect>
              </div> 
              <div className="w-100-3">
                <BInputText
                  variable={variable.field_08}
                  formik={formik}
                  isRequire={true}
                ></BInputText>
              </div>*/}
              <div className="w-100-3">
                <div className="d-flex align-items-center gap-1 ms-3">
                  {ss4_doc?.presigned_url ? (
                    <PdfViewModal
                      triggerButton={
                        <Button
                          pt={{ root: { "data-testid": `eye-icon-ss4` } }}
                          icon={<Img name="black_ic_eye" />}
                          className="p-button-text p-0"
                          type="button"
                        />
                      }
                      title={removeUnderScore(ss4_doc?.document_type).replace(
                        /\b\w/g,
                        (char) => char.toUpperCase()
                      )}
                      downloadUrl={path}
                      downloadName={filename}
                      extension={extension}
                      previewUrl={path}
                    />
                  ) : (
                    <Button
                      pt={{ root: { "data-testid": `disabled-eye-icon-ss4` } }}
                      icon={<Img name="disabled_eye" />}
                      className="p-button-text p-0"
                      type="button"
                      disabled
                    />
                  )}

                  {/* Label with required asterisk positioned next to the icon */}
                  <div className="ms-2">
                    <span className="regular-text fs-6">SS4</span>
                    <span className="text-danger">*</span>
                  </div>
                </div>
                {!ss4_doc?.document_id && (
                  <div className="mt-2 ms-3">
                    <small style={errorMsgStyle}>
                      Please upload the SS4 in Step 1
                    </small>
                  </div>
                )}
              </div>
              <div className="w-100-3">
                <div className="d-flex align-items-center gap-2">
                  <Checkbox
                    inputId="holding-company-checkbox"
                    name="holdingCompany"
                    checked={isHoldingCompany}
                    onChange={(e) => {
                      const isChecked = e.checked;
                      setIsHoldingCompany(isChecked);
                      if (isChecked) {
                        const parentOptions =
                          variable.parent_holding_company.options || [];
                        const noneOption = parentOptions.find(
                          (opt) => opt.name === "None"
                        );
                        if (noneOption) {
                          formik.setFieldValue(
                            variable.parent_holding_company.id,
                            noneOption
                          );
                        } else {
                          formik.setFieldValue(
                            variable.parent_holding_company.id,
                            null
                          );
                        }
                      }
                    }}
                  />
                  <label htmlFor="llc-checkbox" className="ml-2">
                    Is this a holding company
                  </label>
                </div>
              </div>
              {!isHoldingCompany && (
                <div className="w-100-3">
                  <BSelect
                    variable={{
                      ...variable.parent_holding_company,
                      options: parentHoldingCompanyOptions,
                    }}
                    isRequire={true}
                    formik={formik}
                  ></BSelect>
                </div>
              )}

              {/* <div className="w-100-3 ">
                <BInputText
                  variable={variable.field_13}
                  formik={formik}
                  isRequire={true}
                ></BInputText>
              </div> */}
            </div>
          </div>
        </div>
        <div className="form-section">
          <div
            className="d-flex align-items-center
                         justify-content-between form-sec-header"
          >
            <div className="topic">
              <Img name="primary-address"></Img>Legal Address
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
                    variable={variable.primaryAddress1}
                    formik={formik}
                  ></BInputText>
                </div>
                <div className="w-100-2">
                  <BInputText
                    variable={variable.primaryAddress2}
                    formik={formik}
                  ></BInputText>
                </div>
                <div className="w-100-3">
                  <BInputText
                    variable={variable.primaryCity}
                    formik={formik}
                  ></BInputText>
                </div>
                <div className="w-100-3">
                  <BSelect
                    variable={variable.primaryState}
                    formik={formik}
                  ></BSelect>
                </div>
                <div className="w-100-3">
                  <BInputText
                    variable={variable.primaryZip}
                    formik={formik}
                  ></BInputText>
                </div>
                {/* <div className="w-100-3">
                  <BInputNumber
                    variable={variable.primaryZip}
                    formik={formik}
                    suffix="%"
                    showButtons={true}
                  ></BInputNumber>
                </div> */}
                {/* <div className="w-100-3">
                  <BInputText
                    variable={variable.primaryContactNumber1}
                    formik={formik}
                  ></BInputText>
                </div>
                <div className="w-100-3">
                  <BInputText
                    variable={variable.additionalPhoneNumber1}
                    formik={formik}
                  ></BInputText>
                </div>
                <div className="w-100-3">
                  <BInputText
                    variable={variable.primaryEmailAddress1}
                    formik={formik}
                  ></BInputText>
                </div> */}
              </div>
            </div>
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
                  formik.setFieldValue(
                    variable.secondaryAddress1.id,
                    "",
                    false
                  );
                  formik.setFieldValue(
                    variable.secondaryAddress2.id,
                    "",
                    false
                  );
                  formik.setFieldValue(variable.secondaryCity.id, "", false);
                  formik.setFieldValue(variable.secondaryState.id, "", false);
                  formik.setFieldValue(variable.secondaryZip.id, "", false);
                }
              }}
              checked={secondaryAdd}
            />
            <label htmlFor="secondaryAdrress" className="ms-2">
              Mailing address is same as Legal Address
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
                <Img name="primary-address"></Img>Mailing Address
              </div>
            </div>
            <div className="form-body ">
              <div
                className="d-flex flex-column common-gap p-3"
                style={{ rowGap: "4rem", gap: "4rem 1rem" }}
              >
                <div className="d-flex align-items-center flex-wrap form-grid-1 w-90">
                  <div className="w-100-2 mb-3  ">
                    <BInputText
                      variable={variable.secondaryAddress1}
                      formik={formik}
                    ></BInputText>
                  </div>
                  <div className="w-100-2  mb-3 ">
                    <BInputText
                      variable={variable.secondaryAddress2}
                      formik={formik}
                    ></BInputText>
                  </div>
                </div>
                <div className="w-100 d-flex align-items-center flex-wrap form-grid-1">
                  <div className="w-100-3 mb-3 ">
                    <BInputText
                      variable={variable.secondaryCity}
                      formik={formik}
                    ></BInputText>
                  </div>
                  <div className="w-100-3 mb-3 ">
                    <BSelect
                      variable={variable.secondaryState}
                      formik={formik}
                    ></BSelect>
                  </div>
                  <div className="w-100-3 mb-3">
                    <BInputText
                      variable={variable.secondaryZip}
                      formik={formik}
                    ></BInputText>
                  </div>
                </div>
              </div>
              <div className="d-flex align-items-center justify-content-end mt-3">
                <Button
                  pt={{ root: { "data-testid": `cancel-btn` } }}
                  text
                  label="Cancel"
                  type="button"
                  className="text-black gap-2"
                  onClick={() => {
                    setSecondaryAdd(true);
                    formik.setFieldValue(
                      variable.secondaryAddress1.id,
                      "",
                      false
                    );
                    formik.setFieldValue(
                      variable.secondaryAddress2.id,
                      "",
                      false
                    );
                    formik.setFieldValue(variable.secondaryCity.id, "", false);
                    formik.setFieldValue(variable.secondaryState.id, "", false);
                    formik.setFieldValue(variable.secondaryZip.id, "", false);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="form-section">
          <div className="d-flex align-items-center justify-content-between form-sec-header">
            <div className="topic">
              <Img name="personal"></Img>Beneficial Owners
            </div>
          </div>
          <div className="form-body p-0">
            <div className="d-flex flex-column">
              {formik.values.beneficialOwners.map((owner, index) => {
                const baseOwnerFieldName = `beneficialOwners[${index}]`;

                const dlDocType = `driving_license_${index + 1}`;
                const passportDocType = `passport_${index + 1}`;

                const existingDocument = currentStep?.documents?.find(
                  (doc) =>
                    doc.document_type === dlDocType ||
                    doc.document_type === passportDocType
                );
                return (
                  <div
                    key={index}
                    className="owner-container p-3 border-bottom"
                  >
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <div className="d-flex flex-wrap align-items-center gap-3">
                        <h5 className="m-0">Owner {index + 1}</h5>
                        {/* <Button
                        type="button"
                        className="p-button-sm"
                        style={
                          owner.isAuthorizedSigner
                            ? selectedBadgeStyle
                            : unselectedBadgeStyle
                        }
                        onClick={() =>
                          formik.setFieldValue(
                            `beneficialOwners[${index}].isAuthorizedSigner`,
                            !owner.isAuthorizedSigner
                          )
                        }
                      >
                        {owner.isAuthorizedSigner && (
                          <Img name="tick_icon"></Img>
                        )}
                        <span>Authorized Signer</span>
                      </Button>

                      <Button
                        type="button"
                        className="p-button-sm"
                        style={
                          owner.isPrimaryContact
                            ? selectedBadgeStyle
                            : unselectedBadgeStyle
                        }
                        onClick={() =>
                          formik.setFieldValue(
                            `beneficialOwners[${index}].isPrimaryContact`,
                            !owner.isPrimaryContact
                          )
                        }
                      >
                        {owner.isPrimaryContact && <Img name="tick_icon"></Img>}
                        <span>Primary Contact</span>
                      </Button>

                      <Button
                        type="button"
                        className="p-button-sm"
                        style={
                          owner.isPayee
                            ? selectedBadgeStyle
                            : unselectedBadgeStyle
                        }
                        onClick={() =>
                          formik.setFieldValue(
                            `beneficialOwners[${index}].isPayee`,
                            !owner.isPayee
                          )
                        }
                      >
                        {owner.isPayee && <Img name="tick_icon"></Img>}
                        <span>Payee</span>
                      </Button> */}
                        <Button
                          type="button"
                          className="p-button-sm"
                          style={
                            owner.isAuthorizedSigner
                              ? selectedBadgeStyle
                              : unselectedBadgeStyle
                          }
                          onClick={() =>
                            formik.setFieldValue(
                              `beneficialOwners[${index}].isAuthorizedSigner`,
                              !owner.isAuthorizedSigner
                            )
                          }
                          disabled={
                            authorizedSignerCount >= 2 &&
                            !owner.isAuthorizedSigner
                          }
                          pt={{
                            root: { "data-testid": `authorized-signer-btn` },
                          }}
                        >
                          {owner.isAuthorizedSigner && (
                            <Img name="tick_icon"></Img>
                          )}
                          <span>Authorized Signer</span>
                        </Button>

                        {/* --- Primary Contact Button with Disabling Logic --- */}
                        <Button
                          type="button"
                          className=""
                          style={
                            owner.isPrimaryContact
                              ? selectedBadgeStyle
                              : unselectedBadgeStyle
                          }
                          onClick={() =>
                            formik.setFieldValue(
                              `beneficialOwners[${index}].isPrimaryContact`,
                              !owner.isPrimaryContact
                            )
                          }
                          disabled={
                            primaryContactIndex !== -1 &&
                            primaryContactIndex !== index
                          }
                          pt={{
                            root: { "data-testid": `primary-contact-btn` },
                          }}
                        >
                          {owner.isPrimaryContact && (
                            <Img name="tick_icon"></Img>
                          )}
                          <span>Primary Contact</span>
                        </Button>

                        {/* --- Payee Button with Disabling Logic --- */}
                        <Button
                          type="button"
                          className="p-button-sm"
                          style={
                            owner.isPayee
                              ? selectedBadgeStyle
                              : unselectedBadgeStyle
                          }
                          onClick={() => handlePayeeToggle(owner, index)}
                          disabled={
                            !owner.fullName || owner.fullName.trim() === ""
                          }
                          pt={{
                            root: { "data-testid": `payee-btn` },
                          }}
                        >
                          {owner.isPayee && <Img name="tick_icon"></Img>}
                          <span>Payee</span>
                        </Button>
                      </div>
                      <Button
                        text
                        label="Delete Owner"
                        icon={() => <Img name="red_trash"></Img>}
                        className="text-red gap-2"
                        type="button"
                        disabled={formik.values.beneficialOwners.length <= 1}
                        onClick={() => removeOwner(index, existingDocument)}
                        data-testid="delete-owner-icon"
                      />
                    </div>
                    <div
                      className="d-flex align-items-center flex-wrap form-grid-1 w-100 p-3"
                      style={{ rowGap: "4rem", gap: "4rem 1rem" }}
                    >
                      <div className="w-100-3">
                        <BInputText
                          variable={{
                            id: `beneficialOwners[${index}].fullName`,
                            label: "Full Name",
                          }}
                          formik={formik}
                          isRequire={true}
                        />
                      </div>
                      <div className="w-100-3">
                        <BSelect
                          variable={{
                            id: `beneficialOwners[${index}].role`,
                            label: "Role",
                            options: roleOptions,
                          }}
                          formik={formik}
                          isRequire={true}
                        />
                      </div>
                      {/* {owner.role?.code === "other" && (
                        <div className="w-100-3">
                          <BInputText
                            variable={{
                              id: `beneficialOwners[${index}].otherRole`,
                              label: "Specify Role",
                            }}
                            formik={formik}
                            isRequire={true}
                          />
                        </div>
                      )} */}
                      <div className="w-100-2">
                        <BInputText
                          variable={{
                            id: `beneficialOwners[${index}].addressLine1`,
                            label: "Address Line 1",
                          }}
                          formik={formik}
                          isRequire={true}
                        />
                      </div>
                      <div className="w-100-2">
                        <BInputText
                          variable={{
                            id: `beneficialOwners[${index}].addressLine2`,
                            label: "Address Line 2",
                          }}
                          formik={formik}
                        />
                      </div>
                      <div className="w-100-3">
                        <BInputText
                          variable={{
                            id: `beneficialOwners[${index}].city`,
                            label: "City",
                          }}
                          formik={formik}
                          isRequire={true}
                        />
                      </div>
                      <div className="w-100-3">
                        <BSelect
                          variable={{
                            id: `beneficialOwners[${index}].state`,
                            label: "State",
                            options: statesOptions,
                          }}
                          formik={formik}
                          isRequire={true}
                        />
                      </div>
                      <div className="w-100-3">
                        <BInputText
                          variable={{
                            id: `beneficialOwners[${index}].zip`,
                            label: "ZIP",
                          }}
                          formik={formik}
                          isRequire={true}
                        />
                      </div>
                      {/* <div className="w-100-3">
                      <BSelect
                        variable={{
                          id: `beneficialOwners[${index}].governmentIdType`,
                          label: "Government ID Type",
                          options: governmentIdOptions,
                        }}
                        formik={formik}
                        isRequire={true}
                      />
                    </div> */}
                      <div className="w-100-3">
                        <div className="d-flex align-items-center gap-1">
                          <BModal>
                            <BModal.ToggleButton>
                              <Button
                                text
                                label="Upload Government ID"
                                className="text-black gap-2"
                                type="button"
                                // icon={() => <Img name="upload" />}
                                icon={() => (
                                  <div className="position-relative">
                                    {existingDocument && (
                                      <Badge
                                        className="badge-icon"
                                        value="1"
                                        severity="warning"
                                      ></Badge>
                                    )}
                                    <Img name="upload" />
                                  </div>
                                )}
                                data-testid="upload-government-btn"
                              />
                            </BModal.ToggleButton>
                            <BModal.Content>
                              <BUploadCorporation
                                {...getFile(index, existingDocument, () =>
                                  triggerGetStepInfo({
                                    caseNo: caseId,
                                    step_no: currentStepId,
                                  })
                                )}
                              />
                            </BModal.Content>
                          </BModal>
                          <div>
                            <span className="text-danger">*</span>
                          </div>
                          {existingDocument && (
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
                                existingDocument?.document_type
                              ).replace(/\b\w/g, (char) => char.toUpperCase())}
                              downloadUrl={existingDocument?.presigned_url}
                              downloadName={existingDocument?.document_name
                                ?.split(".")
                                ?.join(".")}
                              extension={existingDocument?.document_name
                                ?.split(".")
                                ?.pop()}
                              previewUrl={existingDocument?.presigned_url}
                            />
                          )}
                        </div>
                        {getIn(
                          formik.errors,
                          `${baseOwnerFieldName}.governmentIdFile`
                        ) &&
                          formik.submitCount > 0 && (
                            <small style={errorMsgStyle}>
                              {getIn(
                                formik.errors,
                                `${baseOwnerFieldName}.governmentIdFile`
                              )}
                            </small>
                          )}
                      </div>
                      {/* <div className="w-100-3">
                      <BUploadInput
                        variable={{
                          id: `beneficialOwners[${index}].governmentIdFile`,
                          label: "Upload Government ID",
                        }}
                        formik={formik}
                        isRequire={true}
                      />
                    </div> */}
                      <div className="w-100-3">
                        <BInputFileViewSSN
                          variable={{
                            id: `beneficialOwners[${index}].ssnOrItin`,
                            label: "SSN/ITIN",
                          }}
                          formik={formik}
                          isRequire={owner.isPayee}
                        />

                        {/* <small className="p-d-block mt-1">
                        <i
                          className="pi pi-info-circle mr-1"
                          data-pr-tooltip="Individual Taxpayer Identification Number - used by people who need to file taxes but don't have a Social Security Number (such as non-resident)"
                          data-pr-position="bottom"
                        ></i>
                        {owner.isPayee
                          ? "Required for owners designated as payees"
                          : "Required only if owner is a payee"}
                      </small>
                      <Tooltip target=".pi-info-circle" /> */}
                      </div>
                      <div className="w-100-3">
                        <BInputText
                          variable={{
                            id: `beneficialOwners[${index}].phone`,
                            label: "Contact Number",
                          }}
                          formik={formik}
                          isRequire={
                            owner.isPrimaryContact || owner.isAuthorizedSigner
                          }
                        />
                      </div>
                      <div className="w-100-3">
                        <BInputText
                          variable={{
                            id: `beneficialOwners[${index}].email`,
                            label: "Email Address",
                          }}
                          formik={formik}
                          isRequire={
                            owner.isPrimaryContact || owner.isAuthorizedSigner
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {formik.errors.beneficialOwners_error &&
                typeof formik.errors.beneficialOwners_error === "string" && (
                  <div className="p-3 text-center" style={errorMsgStyle}>
                    {formik.errors.beneficialOwners_error}
                  </div>
                )}
              <div className="d-flex justify-content-end p-3">
                <Button
                  text
                  label="Add Owner"
                  className="text-primary gap-2"
                  type="button"
                  onClick={addOwner}
                  icon={() => <Img name="blue_plus_icon" />}
                  data-testid="add-owner-btn"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="form-section">
          <div className="d-flex align-items-center justify-content-between form-sec-header">
            <div className="topic">
              <Img name="bank" />
              Payees
            </div>
          </div>
          <div className="form-body p-0">
            <div className="d-flex flex-column">
              {formik.values.payees.map((payee, index) => {
                const basePayeeFieldName = `payees[${index}]`;
                const payeeError =
                  getIn(formik.errors, `payees[${index}]`) || {};
                const payeeTouched =
                  getIn(formik.touched, `payees[${index}]`) || {};

                // --- Payee Type Dropdown Options ---
                let payeeTypeOptions = [
                  { name: "This Corporation", code: "Corporation" },
                ];
                if (
                  formik.values.parent_holding_company &&
                  formik.values.parent_holding_company.code !== "None"
                ) {
                  payeeTypeOptions.push({
                    name: "Parent Holding Company",
                    code: "Holding Entity",
                  });
                }

                return (
                  <div
                    key={payee.id}
                    className="owner-container p-3 border-bottom"
                  >
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h5 className="m-0">Payee {index + 1}</h5>
                      {/* You can add a delete button here if manual deletion is needed */}
                    </div>

                    <div className="d-flex flex-column gap-4">
                      {/* --- Payee Details Row --- */}
                      <div className="d-flex align-items-center flex-wrap form-grid-1 w-100 p-3">
                        {/* Payee Type */}
                        <div className="w-100-3">
                          {payee.payeeType.code === "Individual" ? (
                            <BInputText
                              variable={{
                                id: "payeeTypeDisplay",
                                label: "Payee Type",
                              }}
                              formik={{
                                values: {
                                  payeeTypeDisplay: "Individual Owner",
                                },
                              }}
                              isDisable={true}
                            />
                          ) : (
                            <span className="p-float-label">
                              <Dropdown
                                id={`${basePayeeFieldName}.payeeType`}
                                value={payee.payeeType}
                                options={payeeTypeOptions}
                                optionLabel="name"
                                className={`rounded-0 border-0 ps-0 bg-transparent text-field w-100`}
                                onChange={(e) => {
                                  const newPayeeType = e.value;
                                  formik.setFieldValue(
                                    `${basePayeeFieldName}.payeeType`,
                                    newPayeeType
                                  );
                                  if (
                                    ["Corporation", "Holding Entity"].includes(
                                      newPayeeType?.code
                                    )
                                  ) {
                                    formik.setFieldValue(
                                      `${basePayeeFieldName}.allocationPercentage`,
                                      100
                                    );
                                  }
                                }}
                              />
                              <label>Payee Type*</label>
                            </span>
                          )}
                        </div>

                        {/* Conditional Owner / Holding Company Field */}
                        {payee.payeeType.code === "Individual" && (
                          <div className="w-100-3">
                            <BInputText
                              variable={{ id: "ownerDisplay", label: "Payee" }}
                              formik={{
                                values: {
                                  ownerDisplay: payee.ownerData.fullName,
                                },
                              }}
                              isDisable={true}
                            />
                          </div>
                        )}
                        {payee.payeeType.code === "Holding Entity" && (
                          <div className="d-flex w-100-3">
                            <BInputText
                              variable={{
                                id: "holdingDisplay",
                                label: "Payee",
                                tooltipText:
                                  "Automatically linked to parent company selected above",
                              }}
                              formik={{
                                values: {
                                  holdingDisplay:
                                    formik.values.parent_holding_company.name,
                                },
                              }}
                              isDisable={true}
                            />
                            <Button
                              type="button"
                              {...gridToolTipOptins(
                                "Automatically linked to parent company selected above"
                              )}
                              data-testid="info-icon"
                              icon={() => <Img name="info_icon"></Img>}
                            ></Button>
                          </div>
                        )}

                        {/* Allocation Percentage */}

                        <div className="w-100-3">
                          <BInputNumber
                            variable={{
                              id: `${basePayeeFieldName}.allocationPercentage`,
                              label: "Allocation Percentage*",
                            }}
                            formik={formik}
                            suffix="%"
                            showButtons={true}
                            isDisable={[
                              "Corporation",
                              "Holding Entity",
                            ].includes(payee.payeeType?.code)}
                          />
                          {/* <BInputNumber
                              variable={{
                                id: `${basePayeeFieldName}.allocationPercentage`,
                                label: "Allocation Percentage*",
                              }}
                              formik={formik} //  <-- This was the missing prop
                              mode="decimal"
                              minFractionDigits={2}
                              maxFractionDigits={2}
                              suffix=" %"
                            /> */}
                        </div>
                      </div>

                      {/* --- Payment Method and Details --- */}
                      {(payee.payeeType.code === "Corporation" ||
                        payee.payeeType.code === "Individual") && (
                        <div
                          className="d-flex align-items-center flex-wrap form-grid-1 w-100 p-3"
                          style={{ rowGap: "4rem", gap: "4rem 1rem" }}
                        >
                          {/* Payment Method Dropdown */}
                          <div className="w-100-3">
                            <BSelect
                              variable={{
                                id: `${basePayeeFieldName}.paymentMethod`,
                                label: "Payment Method",
                                options:
                                  payee.payeeType.code === "Individual"
                                    ? [
                                        { name: "Check", code: "Check" },
                                        { name: "ACH Transfer", code: "ACH" },
                                        {
                                          name: "Direct to Lender",
                                          code: "Direct To Lender",
                                        },
                                      ]
                                    : [
                                        { name: "Check", code: "Check" },
                                        { name: "ACH Transfer", code: "ACH" },
                                      ],
                              }}
                              formik={formik}
                              isRequire={true}
                            />
                          </div>

                          {payee.paymentMethod?.code === "Direct To Lender" && (
                            <div style={infoBoxStyle}>
                              <strong>Direct to Lender:</strong> Payments will
                              be sent directly to the owner's financing
                              institution. Enter the lender's bank details
                              below.
                            </div>
                          )}

                          {/* ACH / Direct to Lender Fields */}
                          {(payee.paymentMethod?.code === "ACH" ||
                            payee.paymentMethod?.code ===
                              "Direct To Lender") && (
                            <div
                              className="d-flex align-items-start flex-wrap"
                              style={{ rowGap: "4rem", gap: "4rem 1rem" }}
                            >
                              <div className="w-100-3">
                                <BInputText
                                  variable={{
                                    id: `${basePayeeFieldName}.routingNumber`,
                                    label: "Routing Number",
                                  }}
                                  formik={formik}
                                  isRequire={true}
                                  onBlur={(e) => {
                                    formik.handleBlur(e);
                                    const value = e.target.value.trim();
                                    if (value) {
                                      setActivePayeeIndex(index); // Set the current payee index
                                      getBankDetails(value);
                                    }
                                  }}
                                />
                              </div>
                              <div className="w-100-3">
                                <BInputText
                                  variable={{
                                    id: `${basePayeeFieldName}.bankName`,
                                    label: "Bank Name",
                                  }}
                                  formik={formik}
                                  isRequire={true}
                                />
                              </div>
                              <div className="w-100-3">
                                <BInputText
                                  variable={{
                                    id: `${basePayeeFieldName}.bankAccountNumber`,
                                    label: "Bank Account Number",
                                  }}
                                  formik={formik}
                                  isRequire={true}
                                />
                              </div>
                              <div className="w-100-3">
                                <BInputText
                                  variable={{
                                    id: `${basePayeeFieldName}.confirmBankAccountNumber`,
                                    label: "Confirm Bank Account Number",
                                  }}
                                  formik={formik}
                                  isRequire={true}
                                />
                              </div>

                              {payee.paymentMethod?.code === "ACH" && (
                                <div className="w-100-3">
                                  {(() => {
                                    let docType = "";
                                    if (
                                      payee.payeeType.code === "Corporation"
                                    ) {
                                      docType = "payee_proof_this_corporation";
                                    } else if (
                                      payee.payeeType.code === "Individual"
                                    ) {
                                      docType = `payee_proof_${index + 1}`;
                                    }

                                    if (!docType) return null;

                                    const existingPayeeDocument =
                                      currentStep?.documents?.find(
                                        (doc) => doc.document_type === docType
                                      );

                                    const uploadDocOptions = [
                                      { name: "Payee Proof", code: docType },
                                    ];

                                    return (
                                      <div className="d-flex align-items-center gap-1">
                                        <BModal>
                                          <BModal.ToggleButton>
                                            <Button
                                              text
                                              label="Upload Payee Proof"
                                              className="text-black gap-2"
                                              type="button"
                                              icon={() => (
                                                <div className="position-relative">
                                                  {existingPayeeDocument && (
                                                    <Badge
                                                      className="badge-icon"
                                                      value="1"
                                                      severity="warning"
                                                    />
                                                  )}
                                                  <Img name="upload" />
                                                </div>
                                              )}
                                              data-testid="upload-payee-proof-icon"
                                            />
                                          </BModal.ToggleButton>
                                          <BModal.Content>
                                            <BUploadCorporation
                                              {...getPayeeFile(
                                                index,
                                                existingPayeeDocument,
                                                uploadDocOptions
                                              )}
                                            />
                                          </BModal.Content>
                                        </BModal>
                                        <div>
                                          <span className="text-danger">*</span>
                                        </div>
                                        {existingPayeeDocument && (
                                          <PdfViewModal
                                            triggerButton={
                                              <Button
                                                pt={{
                                                  root: {
                                                    "data-testid": `eye-icon-btn-payee-${index}`,
                                                  },
                                                }}
                                                icon={
                                                  <Img name="black_ic_eye" />
                                                }
                                                className="p-button-text p-0"
                                                type="button"
                                              />
                                            }
                                            title="Payee Proof"
                                            downloadUrl={
                                              existingPayeeDocument?.presigned_url
                                            }
                                            downloadName={existingPayeeDocument?.document_name
                                              ?.split(".")
                                              ?.join(".")}
                                            extension={existingPayeeDocument?.document_name
                                              ?.split(".")
                                              ?.pop()}
                                            previewUrl={
                                              existingPayeeDocument?.presigned_url
                                            }
                                          />
                                        )}
                                      </div>
                                    );
                                  })()}
                                  {getIn(
                                    formik.errors,
                                    `${basePayeeFieldName}.payeeProofFile`
                                  ) &&
                                    formik.submitCount > 0 && (
                                      <small
                                        className="mt-1"
                                        style={errorMsgStyle}
                                      >
                                        {getIn(
                                          formik.errors,
                                          `${basePayeeFieldName}.payeeProofFile`
                                        )}
                                      </small>
                                    )}
                                </div>
                              )}
                              {payee.paymentMethod?.code ===
                                "Direct To Lender" && (
                                <div className="w-100-3">
                                  {(() => {
                                    // 1. Determine the final, correct document type string
                                    const docType = `authorization_letter_${
                                      index + 1
                                    }`;
                                    // const docType = `authorization_letter`;

                                    // 2. Find any existing document that matches
                                    const existingAuthDocument =
                                      currentStep?.documents?.find(
                                        (doc) => doc.document_type === docType
                                      );

                                    // 3. Prepare the options for the upload modal
                                    const uploadDocOptions = [
                                      {
                                        name: "Authorization Letter",
                                        code: docType,
                                      },
                                    ];

                                    return (
                                      <div className="d-flex align-items-center gap-1">
                                        <BModal>
                                          <BModal.ToggleButton>
                                            <Button
                                              text
                                              label="Upload Authorization Letter"
                                              className="text-black gap-2"
                                              type="button"
                                              icon={() => (
                                                <div className="position-relative">
                                                  {existingAuthDocument && (
                                                    <Badge
                                                      className="badge-icon"
                                                      value="1"
                                                      severity="warning"
                                                    />
                                                  )}
                                                  <Img name="upload" />
                                                </div>
                                              )}
                                              data-testid="upload-authorization-file-icon"
                                            />
                                          </BModal.ToggleButton>
                                          <BModal.Content>
                                            <BUploadCorporation
                                              {...getAuthorizationFile(
                                                index,
                                                existingAuthDocument,
                                                uploadDocOptions
                                              )}
                                            />
                                          </BModal.Content>
                                        </BModal>
                                        <div>
                                          <span className="text-danger">*</span>
                                        </div>
                                        {existingAuthDocument && (
                                          <PdfViewModal
                                            triggerButton={
                                              <Button
                                                pt={{
                                                  root: {
                                                    "data-testid": `eye-icon-auth-${index}`,
                                                  },
                                                }}
                                                icon={
                                                  <Img name="black_ic_eye" />
                                                }
                                                className="p-button-text p-0"
                                                type="button"
                                              />
                                            }
                                            title="Authorization Letter"
                                            downloadUrl={
                                              existingAuthDocument?.presigned_url
                                            }
                                            downloadName={existingAuthDocument?.document_name
                                              ?.split(".")
                                              ?.join(".")}
                                            extension={existingAuthDocument?.document_name
                                              ?.split(".")
                                              ?.pop()}
                                            previewUrl={
                                              existingAuthDocument?.presigned_url
                                            }
                                          />
                                        )}
                                      </div>
                                    );
                                  })()}
                                  {getIn(
                                    formik.errors,
                                    `${basePayeeFieldName}.paymentAuthFile`
                                  ) &&
                                    formik.submitCount > 0 && (
                                      <small
                                        className="mt-1"
                                        style={errorMsgStyle}
                                      >
                                        {getIn(
                                          formik.errors,
                                          `${basePayeeFieldName}.paymentAuthFile`
                                        )}
                                      </small>
                                    )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {payee.payeeType.code === "Holding Entity" && (
                        <div className="d-flex align-items-center w-100-25 p-3">
                          <div className="w-100-3">
                            <BInputText
                              variable={{
                                id: "holdingEntityPaymentMethod",
                                label: "Payment Method",
                                tooltipText:
                                  "Auto-configured from holding company",
                              }}
                              formik={{
                                values: {
                                  holdingEntityPaymentMethod: "ACH Transfer",
                                },
                              }}
                              isDisable={true}
                            />
                          </div>

                          <Button
                            type="button"
                            {...gridToolTipOptins(
                              "ACH Transfer (Auto-configured from holding company)"
                            )}
                            data-testid="info-icon"
                            icon={() => <Img name="info_icon"></Img>}
                          ></Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  padding: "1rem 1rem",
                  borderRadius: "8px",
                  border: "1px solid #dee2e6",
                  backgroundColor: "#ffffff",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                  maxWidth: "400px",
                  margin: "1.5rem auto",
                  gap: "1.5rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.3rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: "bold",
                      color: "#343a40",
                    }}
                  >
                    Total Allocation
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "#6c757d" }}>
                    Allocation must be 100.00%
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "1.8rem",
                    fontWeight: "bold",

                    color: formik.errors.payees_error
                      ? errorMsgStyle
                      : "#198754",
                  }}
                >
                  {formik.values.payees
                    .reduce(
                      (acc, p) => acc + (Number(p.allocationPercentage) || 0),
                      0
                    )
                    .toFixed(2)}
                  %
                </span>
              </div>
            </div>

            {/* --- Total Allocation Footer --- */}
            {/* <div className="d-flex justify-content-end align-items-center p-3 bg-light border-top">
              <span className="font-bold mr-2">Total Allocation:</span>
              <span
                className={`font-bold ${
                  formik.errors.payees_error ? "text-danger" : "text-success"
                }`}
              >
                {formik.values.payees
                  .reduce(
                    (acc, p) => acc + (Number(p.allocationPercentage) || 0),
                    0
                  )
                  .toFixed(2)}
                %
              </span>
            </div> */}

            {formik.errors.payees_error && (
              <div className="p-3 text-right" style={errorMsgStyle}>
                {formik.errors.payees_error}
              </div>
            )}
          </div>
        </div>
        {/* {isLLC && (
          <div className="form-section">
            <div
              className="d-flex align-items-center
                 justify-content-between form-sec-header"
            >
              <div className="topic">
                <Img name="personal"></Img> Key People
              </div>
            </div>
            <div className="form-body">
              <div
                className="d-flex align-items-center flex-wrap form-grid-1 w-100 p-3"
                style={{ rowGap: "4rem", gap: "4rem 1rem" }}
              >
                <div className="w-100-3 ">
                  <BSelectWithSearch
                    variable={{
                      id: "president",
                      label: "President",
                      options: filteredOptions,
                    }}
                    formik={formik}
                  ></BSelectWithSearch>
                </div>
                <div className="w-100-3 ">
                  <BSelectWithSearch
                    variable={{
                      id: "member",
                      label: "Secretary",
                      options: filteredOptions,
                    }}
                    formik={formik}
                  ></BSelectWithSearch>
                </div>
                <div className="w-100-3 ">
                  <BSelectWithSearch
                    variable={{
                      id: "corporateOfficers",
                      label: "Corporate Officers",
                      options: filteredOptions,
                    }}
                    formik={formik}
                  ></BSelectWithSearch>
                </div>
              </div>
            </div>
          </div>
        )} */}
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
              height: "100%", // optional if you want vertical centering too
              padding: "2rem 0",
            }}
          >
            <div className="form-body d-flex flex-column common-gap">
              <div className="d-flex align-items-center w-100 gap-3">
                {/* <div className="w-100-3">
                  <BSelect
                    variable={{
                      id: "correspondence_signed_mode",
                      label: "Correspondence Method",
                      options: [
                        { name: "In Person", code: "I" },
                        { name: "Email", code: "M" },
                        { name: "Print", code: "P" },
                      ],
                    }}
                    isRequire={true}
                    formik={formik}
                  ></BSelect>
                </div> */}
                <div className="w-100-3">
                  {getDocumentDetails("rider_document")?.id && (
                    <BAttachedFile
                      file={getDocumentDetails("rider_document")}
                      hideDelete={true}
                    />
                  )}
                </div>
                <div className="w-100-3 d-flex justify-content-center">
                  <Button
                    label="Generate Document"
                    type="submit"
                    // onClick={() => handleGenerateDocument()}
                    data-testid="generate-doc-btn"
                    style={generateButtonStyle}
                    disabled={!hasAccess}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-100 position-sticky bottom-0 py-3 bg-white">
          {/* <Button
            disabled={!hasAccess || !riderDocument?.document_id}
            label="Submit Corporation Details"
            type="button"
            severity="warning"
            className="border-radius-0 primary-btn "
          /> */}
          <Button
            disabled={!hasAccess || !riderDocument?.document_id}
            label="Submit Corporation Details"
            type="button"
            onClick={completeAndMoveCase}
            severity="warning"
            className="border-radius-0 primary-btn "
            data-testid="submit-corporation-detail-btn"
          />
        </div>
      </form>
      <BToast ref={toast} position="top-right" />
    </div>
  );
};

export default CreateCorporation;
