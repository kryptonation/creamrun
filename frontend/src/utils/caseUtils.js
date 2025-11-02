import Img from "../components/Img";
import {
  ADDITIONAL_DRIVER,
  ADDITIONAL_DRIVER_TYPE,
  ALLOCATE_MEDALLION,
  ALLOCATE_MEDALLION_TO_VECHILE,
  APPROVE_DRIVER,
  APPROVE_PAYMENT_DRIVER,
  CHOOSE_LEASE_DETAIL,
  COMPLETE_LEASE,
  CORPORATION_UPLOAD_DOCUMENTS,
  CREATE_CORPORATION,
  CREATE_CORRESPONDENCE_TYPE,
  CREATE_DRIVER_PAYMENT,
  CREATE_INDIVIDUAL_OWNER_TYPE,
  CREATE_PVB_ATTACH,
  CREATE_PVB_TYPE,
  CREATE_VEHICLE_OWNER,
  DMV_LICENSE_TYPE,
  DMV_UPDATE_LICENSE,
  DMV_UPDATE_LICENSE_UPLOAD,
  DMV_VIEW_LICENSE,
  DRIVER_LEASE_TERMINATION,
  DRIVER_LEASE_UPDATE,
  DRIVER_LEASE_UPDATE_FINANCIAL,
  DRIVER_PAYEE_TYPE,
  DRIVER_TLC_LICENSE_TYPE,
  DRIVER_UPDATE_ADDRESS,
  DRIVER_UPDATE_ADDRESS_DETAIL,
  DRIVER_UPDATE_ADDRESS_VERIFY,
  DRIVER_UPDATE_PAYEE_DETAIL,
  DRIVER_UPDATE_PAYEE_VERIFY,
  DRIVER_UPDATE_TLC_DETAIL,
  DRIVER_UPDATE_TLC_UPLOAD,
  // DRIVER_UPDATE_TLC_VERIFY,
  EDIT_VEHICLE_OWNER,
  EDIT_VEHICLE_OWNER_DETAILS,
  ENTER_ADDRESS_DETAIL,
  ENTER_CORRESPONDENCE_DETAILS,
  ENTER_LEDGER_DETAILS,
  ENTER_MEDALLION_DETAIL,
  ENTER_PVB_DETAILS,
  ENTER_REHACK_DETAILS,
  ENTER_VEHICLE_DETAIL,
  ENTER_VEHICLE_REPAIR,
  INDIVIDUAL_OWNER_UPLOAD_DOCUMENTS,
  INITIAL_REWMED_STEP_ID,
  LEASE_DETAIL,
  LEDGER_ENTRY_SEARCH_DRIVER_TYPE,
  LEDGER_ENTRY_TYPE,
  MEDALLION_DOCUMENT,
  MO_ENTER_ADDRESS_DETAIL,
  MO_ENTER_PAYEE_DETAILS,
  MO_UPDATE_ADDRESS_PROOF,
  MO_UPDATE_PAYEE_DOCUMENT_VERIFY,
  MO_VERIFY_ADDRESS_DOCUMENTS,
  ENTER_STORAGE_DETAILS,
  NEW_DRIVER,
  NEW_VEHICLE_TYPE,
  NEWMED_CASE_TYPE,
  PAYEE_CASE_TYPE,
  REGISTER_DRIVER,
  RENEW_FINANCIAL_INFO,
  RENEW_LEASE_TYPE,
  RENMED_CASE_TYPE,
  RETMED_CASE_TYPE,
  RETMED_DOCUMENT_INFO,
  REWMED_STEP_ID,
  SEARCH_DRIVER,
  SEARCH_DRIVER_FOR_LEDGER,
  SEARCH_VEHICLE_ENTITY,
  SELECT_LEASE,
  SENDHACKUP,
  SIGN_LEASE,
  STOMED_CASE_TYPE,
  TERMED_CASE_TYPE,
  TERMINATEDRIVERLEASE,
  UPDADRMED_CASE_TYPE,
  UPDATE_LEASE_INFO,
  UPDATE_MEDALLION_DETAIL,
  UPDATE_MEDALLION_TYPE,
  // UPDATE_STORAGE_INFO,
  UPDATEDRIVERLEASE,
  UPLOAD_ADDRESS_PROOF,
  UPLOAD_DRIVER_DOCUMENT,
  VEHICLE_HACK_UP,
  VEHICLE_HACK_UP_INSPECTION,
  VEHICLE_HACK_UP_REGISTER,
  VEHICLEREPAIR,
  VERIFY_CORPORATION_DOCUMENTS,
  VERIFY_INDIVIDUAL_OWNER,
  VERIFY_VEHICLE_OWNER_DOCUMENTS,
  VIEW_DRIVER_PAYMENT,
  VERIFY_MEDALLION_STORAGE_DOCUMENTS,
  UPLOAD_STORAGE_DOCUMENTS,
  UPLOAD_MEDALLION_RENEWAL_PROOF,
  RETMED_UPLOAD_DOCUMENT,
  UPDATE_CORPORATION_DETAILS,
  UPDATE_CORPORATION_DOCUMENTS,
  UPDATE_CORPORATION_DETAILS_FORM,
  VERIFY_UPDATED_CORPORATION_DOCUMENTS,
  UPDATE_INDIVIDUAL_OWNER_DETAILS,
  UPDATE_INDIVIDUAL_OWNER_DOCUMENTS,
  UPDATE_INDIVIDUAL_OWNER_FORM,
  VERIFY_INDIVIDUAL_OWNER_UPDATED_DOCUMENTS,
  ADDITIONAL_DRIVER_SIGN_LEASE,
  ADDITIONAL_DRIVER_COMPLETE_LEASE,
} from "./constants";

export const getInitalStepId = (caseType) => {
  if (caseType === RENMED_CASE_TYPE) {
    return INITIAL_REWMED_STEP_ID;
  } else if (caseType === STOMED_CASE_TYPE) {
    return INITIAL_REWMED_STEP_ID;
  } else if (caseType === RETMED_CASE_TYPE) {
    return INITIAL_REWMED_STEP_ID;
  } else if (caseType === TERMED_CASE_TYPE) {
    return INITIAL_REWMED_STEP_ID;
  } else if (caseType === UPDADRMED_CASE_TYPE) {
    return INITIAL_REWMED_STEP_ID;
  }
};

export const getCurrentStepFromSubStep = (currentStep, subSteps) => {
  if (!subSteps?.length) return;

  return subSteps.find((item) => item?.step_id === currentStep) || subSteps[0];
};

export const getStepById = (currentStep, subSteps) => {
  if (!subSteps?.length) return;

  return subSteps.find((item) => item?.step_id === currentStep) || subSteps[0];
};

export const getCaseStepById = (steps, currentStep) => {
  if (!steps?.length) return null;

  for (const step of steps) {
    const currentSubStep = step.sub_steps?.find(
      (subStep) => subStep.step_id === currentStep
    );
    if (currentSubStep) {
      return currentSubStep;
    }
  }

  return null;
};

export const getCurrentStep = (steps) => {
  if (!steps?.length) return null;

  for (const step of steps) {
    const currentSubStep = step.sub_steps?.find(
      (subStep) => subStep.is_current_step === true
    );
    if (currentSubStep) {
      return currentSubStep;
    }
  }

  return null;
};

export const getCurrenyStepId = (cases) => {
  for (const step of cases.steps) {
    for (const subStep of step.sub_steps) {
      if (subStep.is_current_step) {
        return subStep.step_id;
      }
    }
  }
  return null;
};

export const getCaseTitle = (caseType) => {
  if (caseType === RENMED_CASE_TYPE) {
    return "Renew Medallion";
  } else if (caseType === STOMED_CASE_TYPE) {
    return "Move to Storage";
  } else if (caseType === RETMED_CASE_TYPE) {
    return "Retrieve Medallion";
  } else if (caseType === TERMED_CASE_TYPE) {
    return INITIAL_REWMED_STEP_ID;
  } else if (caseType === UPDADRMED_CASE_TYPE) {
    return "Update Address";
  } else if (caseType === PAYEE_CASE_TYPE) {
    return "Update Payee";
  } else if (caseType === DMV_LICENSE_TYPE) {
    return "Update DMV License";
  } else if (caseType === DRIVER_UPDATE_ADDRESS) {
    return "Update Address";
  } else if (caseType === DRIVER_TLC_LICENSE_TYPE) {
    return "Update TLC License";
  } else if (caseType === SENDHACKUP) {
    return "Hack-Up";
  } else if (caseType === ALLOCATE_MEDALLION) {
    return "Medallion";
  } else if (caseType === TERMINATEDRIVERLEASE) {
    return "Lease Termination";
  } else if (caseType === ADDITIONAL_DRIVER_TYPE) {
    return "Additional Driver";
  } else if (caseType === UPDATEDRIVERLEASE) {
    return "Update Driver Lease";
  } else if (caseType === VEHICLEREPAIR) {
    return "Vehicle Repairs";
  } else if (caseType === RENEW_LEASE_TYPE) {
    return "Renew Lease";
  } else if (caseType === CREATE_PVB_TYPE) {
    return "Create PVB";
  } else if (caseType === CREATE_DRIVER_PAYMENT) {
    return "Create Driver Payment";
  } else if (caseType === CREATE_CORRESPONDENCE_TYPE) {
    return "Create Correspondence";
  } else if (caseType === DRIVER_PAYEE_TYPE) {
    return "Update Payee";
  } else if (caseType === UPDATE_MEDALLION_TYPE) {
    return "Update Medallion";
  } else if (caseType === LEDGER_ENTRY_TYPE) {
    return "Ledger Entry";
  } else if (caseType === CREATE_INDIVIDUAL_OWNER_TYPE) {
    return "Create Individual Owner";
  } else if (caseType === CREATE_CORPORATION) {
    return "Create Corporation";
  } else if (
    caseType === UPDATE_CORPORATION_DETAILS ||
    caseType === UPDATE_INDIVIDUAL_OWNER_DETAILS
  ) {
    return "Update Owner Details";
  } else if (caseType === NEWMED_CASE_TYPE) {
    return "New Medallion";
  } else if (caseType === CREATE_VEHICLE_OWNER) {
    return "New Vehicle Owner";
  } else if (caseType === NEW_VEHICLE_TYPE) {
    return "Add Vehicle";
  } else if (caseType === EDIT_VEHICLE_OWNER) {
    return "Edit Owner Details";
  } else if (caseType === NEW_DRIVER) {
    return "New Driver Registration";
  }
  //  else if (caseType === EDIT_VEHICLE_OWNER) {
  //   return "Edit Owner Details";
  // }
};

export const getStepTitle = (stepId) => {
  if (stepId === REWMED_STEP_ID) {
    return "Enter Renewal Details";
  } else if (stepId === ENTER_ADDRESS_DETAIL) {
    return "Enter Address Details";
  } else if (
    stepId === UPLOAD_ADDRESS_PROOF ||
    stepId === INDIVIDUAL_OWNER_UPLOAD_DOCUMENTS ||
    stepId === CORPORATION_UPLOAD_DOCUMENTS ||
    stepId === UPLOAD_STORAGE_DOCUMENTS ||
    stepId === RETMED_UPLOAD_DOCUMENT ||
    stepId === UPDATE_CORPORATION_DOCUMENTS ||
    stepId === UPDATE_INDIVIDUAL_OWNER_DOCUMENTS
  ) {
    return "Upload Documents";
  } else if (
    stepId === DMV_UPDATE_LICENSE_UPLOAD ||
    stepId === DRIVER_UPDATE_TLC_UPLOAD
  ) {
    return "Upload Document";
  } else if (stepId === UPDATE_CORPORATION_DETAILS_FORM) {
    return "Update Corporation Details";
  } else if (stepId === UPDATE_INDIVIDUAL_OWNER_FORM) {
    return "Update Individual Details";
  } else if (stepId === ENTER_STORAGE_DETAILS) {
    return "Storage Info";
  }
  // else if (stepId === UPDATE_STORAGE_INFO) {
  //   return "Update Storage Info";
  // }
  else if (stepId === MO_ENTER_ADDRESS_DETAIL) {
    return "Enter Address Details";
  } else if (stepId === MO_UPDATE_ADDRESS_PROOF) {
    return "Upload Documents";
  } else if (stepId === MO_ENTER_PAYEE_DETAILS) {
    return "Enter Payee Details";
  } else if (
    stepId === MO_UPDATE_PAYEE_DOCUMENT_VERIFY ||
    stepId === UPLOAD_MEDALLION_RENEWAL_PROOF
  ) {
    return "Upload Documents";
  } else if (stepId === RETMED_DOCUMENT_INFO) {
    return "Update Documents";
  } else if (stepId === DMV_LICENSE_TYPE) {
    return "Update License";
  } else if (stepId === DRIVER_UPDATE_PAYEE_DETAIL) {
    return "Enter Payee Details";
  } else if (stepId === DRIVER_UPDATE_PAYEE_VERIFY) {
    return "Upload Documents";
  } else if (stepId === DRIVER_UPDATE_ADDRESS_DETAIL) {
    return "Update Address";
  } else if (stepId === DRIVER_UPDATE_ADDRESS_VERIFY) {
    return "Upload Documents";
  } else if (stepId === DMV_UPDATE_LICENSE) {
    return "Update License";
  }
  //  else if (stepId === DMV_VIEW_LICENSE) {
  //   return "View Updated Details";
  // }
  else if (stepId === DRIVER_UPDATE_TLC_DETAIL) {
    return "Update License";
  }
  // else if (stepId === DRIVER_UPDATE_TLC_VERIFY) {
  //   return "View Updated Details";
  // }
  else if (stepId === VEHICLE_HACK_UP) {
    return "Enter Hack Details";
  } else if (stepId === VEHICLE_HACK_UP_REGISTER) {
    return "Enter Registered Vehicle Details";
  } else if (stepId === VEHICLE_HACK_UP_INSPECTION) {
    return "Upload Invoices";
  } else if (stepId === ALLOCATE_MEDALLION_TO_VECHILE) {
    return "Search Vehicle";
  } else if (stepId === DRIVER_LEASE_TERMINATION) {
    return "Terminate Driver Lease";
  } else if (stepId === SELECT_LEASE) {
    return "Select Lease";
  } else if (stepId === DRIVER_LEASE_UPDATE) {
    return "View Lease Details ";
  } else if (stepId === DRIVER_LEASE_UPDATE_FINANCIAL) {
    return "View and Update Financial Information";
  } else if (stepId === ADDITIONAL_DRIVER) {
    return "Search Additional Drivers";
  } else if (stepId === ADDITIONAL_DRIVER_SIGN_LEASE) {
    return "Sign Additional Driver Form";
  } else if (stepId === ADDITIONAL_DRIVER_COMPLETE_LEASE) {
    return "View Signed Driver Form";
  } else if (stepId === ADDITIONAL_DRIVER_COMPLETE_LEASE) {
    return "Search Additional Drivers";
  } else if (stepId === ENTER_VEHICLE_REPAIR) {
    return "Enter Vehicle Repair Details";
  } else if (stepId === UPDATE_LEASE_INFO) {
    return "View Lease Details";
  } else if (stepId === RENEW_FINANCIAL_INFO) {
    return "Enter Financial Information";
  } else if (stepId === SIGN_LEASE) {
    return "View Documents and Sign";
  } else if (stepId === ENTER_REHACK_DETAILS) {
    return "Enter Re-Hack Details";
  } else if (stepId === CREATE_PVB_ATTACH) {
    return "Attach Proof";
  } else if (stepId === ENTER_PVB_DETAILS) {
    return "Enter PVB Details";
  } else if (stepId === VIEW_DRIVER_PAYMENT) {
    return "Driver Payments";
  } else if (stepId === APPROVE_PAYMENT_DRIVER) {
    return "Approve Payments";
  } else if (stepId === ENTER_CORRESPONDENCE_DETAILS) {
    return "Enter Correspondence Details";
  } else if (stepId === UPDATE_MEDALLION_DETAIL) {
    return "Enter Medallion Details";
  } else if (stepId === ENTER_LEDGER_DETAILS) {
    return "Enter Ledger Details";
  } else if (stepId === COMPLETE_LEASE) {
    return "View Generated Document";
  } else if (
    stepId === VERIFY_INDIVIDUAL_OWNER ||
    stepId === MO_VERIFY_ADDRESS_DOCUMENTS ||
    stepId === VERIFY_MEDALLION_STORAGE_DOCUMENTS ||
    stepId === VERIFY_UPDATED_CORPORATION_DOCUMENTS
  ) {
    return "Verify Documents";
  } else if (stepId === ENTER_MEDALLION_DETAIL) {
    return "Enter Medallion Details";
  } else if (stepId === LEASE_DETAIL) {
    return "Enter Contract Details";
  } else if (stepId === MEDALLION_DOCUMENT) {
    return "Medallion Documents";
  } else if (
    stepId === VERIFY_CORPORATION_DOCUMENTS ||
    stepId === VERIFY_INDIVIDUAL_OWNER_UPDATED_DOCUMENTS
  ) {
    return "Verify Documents";
  } else if (stepId === VERIFY_VEHICLE_OWNER_DOCUMENTS) {
    return "Verify Documents";
  } else if (stepId === ENTER_VEHICLE_DETAIL) {
    return "Enter Vehicle Details";
  } else if (stepId === EDIT_VEHICLE_OWNER_DETAILS) {
    return "Edit Owner Details";
  } else if (stepId === SEARCH_DRIVER) {
    return "Search Driver";
  } else if (stepId === UPLOAD_DRIVER_DOCUMENT) {
    return "Upload Documents";
  } else if (stepId === REGISTER_DRIVER) {
    return "Create Driver";
  } else if (stepId === APPROVE_DRIVER) {
    return "Verify Details and Approve";
  }
};

export const getStepImage = (stepId) => {
  if (stepId === REWMED_STEP_ID) {
    return "document";
  } else if (stepId === ENTER_ADDRESS_DETAIL) {
    return "ic_location";
  } else if (
    stepId === UPLOAD_ADDRESS_PROOF ||
    stepId === INDIVIDUAL_OWNER_UPLOAD_DOCUMENTS ||
    stepId === CORPORATION_UPLOAD_DOCUMENTS ||
    stepId === UPLOAD_DRIVER_DOCUMENT ||
    stepId === APPROVE_DRIVER ||
    stepId === UPLOAD_MEDALLION_RENEWAL_PROOF ||
    stepId === RETMED_UPLOAD_DOCUMENT ||
    stepId === UPDATE_CORPORATION_DOCUMENTS ||
    stepId === VERIFY_UPDATED_CORPORATION_DOCUMENTS ||
    stepId === UPDATE_INDIVIDUAL_OWNER_DOCUMENTS ||
    stepId === ADDITIONAL_DRIVER_SIGN_LEASE ||
    stepId === ADDITIONAL_DRIVER_COMPLETE_LEASE
  ) {
    return "document";
  } else if (stepId === UPDATE_CORPORATION_DETAILS_FORM) {
    return "corporation_entity";
  } else if (stepId === ENTER_STORAGE_DETAILS) {
    return "ic_medallion";
  } else if (stepId === UPDATE_INDIVIDUAL_OWNER_FORM) {
    return "individual";
  }
  // else if (stepId === UPDATE_STORAGE_INFO) {
  //   return "ic_medallion";
  // }
  else if (stepId === MO_ENTER_ADDRESS_DETAIL) {
    return "ic_location";
  } else if (
    stepId === MO_UPDATE_ADDRESS_PROOF ||
    stepId === MO_VERIFY_ADDRESS_DOCUMENTS ||
    stepId === VERIFY_MEDALLION_STORAGE_DOCUMENTS ||
    stepId === UPLOAD_STORAGE_DOCUMENTS
  ) {
    return "document";
  } else if (stepId === MO_ENTER_PAYEE_DETAILS) {
    return "update_payee";
  } else if (stepId === MO_UPDATE_PAYEE_DOCUMENT_VERIFY) {
    return "document";
  } else if (stepId === RETMED_DOCUMENT_INFO) {
    return "document";
  } else if (stepId === DRIVER_UPDATE_PAYEE_DETAIL) {
    return "bank";
  } else if (stepId === DRIVER_UPDATE_PAYEE_VERIFY) {
    return "document";
  } else if (stepId === DRIVER_UPDATE_ADDRESS_DETAIL) {
    return "ic_location";
  } else if (
    stepId === DRIVER_UPDATE_ADDRESS_VERIFY ||
    stepId === DMV_UPDATE_LICENSE_UPLOAD ||
    stepId === DRIVER_UPDATE_TLC_UPLOAD
  ) {
    return "document";
  } else if (stepId === DMV_UPDATE_LICENSE) {
    return "license";
  }
  // else if (stepId === DMV_VIEW_LICENSE) {
  //   return "license";
  // }
  else if (stepId === DRIVER_UPDATE_TLC_DETAIL) {
    return "license";
  }
  // else if (stepId === DRIVER_UPDATE_TLC_VERIFY) {
  //   return "license";
  // }
  else if (stepId === VEHICLE_HACK_UP_REGISTER) {
    return "ic_hack_up_register";
  } else if (stepId === VEHICLE_HACK_UP_INSPECTION) {
    return "ic_hack_up_doc";
  } else if (stepId === ALLOCATE_MEDALLION_TO_VECHILE) {
    return "vehicle";
  } else if (stepId === DRIVER_LEASE_TERMINATION) {
    return "lease";
  } else if (stepId === SELECT_LEASE) {
    return "lease";
  } else if (stepId === DRIVER_LEASE_UPDATE) {
    return "lease";
  } else if (stepId === DRIVER_LEASE_UPDATE_FINANCIAL) {
    return "financial";
  } else if (
    stepId === ADDITIONAL_DRIVER ||
    stepId === SEARCH_DRIVER ||
    stepId === REGISTER_DRIVER
  ) {
    return "driver";
  } else if (stepId === ENTER_VEHICLE_REPAIR) {
    return "repair";
  } else if (stepId === UPDATE_LEASE_INFO) {
    return "lease";
  } else if (stepId === RENEW_FINANCIAL_INFO) {
    return "financial";
  } else if (stepId === SIGN_LEASE) {
    return "document";
  } else if (stepId === ENTER_REHACK_DETAILS) {
    return "hack_up";
  } else if (stepId === CREATE_PVB_ATTACH) {
    return "document";
  } else if (stepId === ENTER_PVB_DETAILS) {
    return "document";
  } else if (stepId === VIEW_DRIVER_PAYMENT) {
    return "driver";
  } else if (stepId === APPROVE_PAYMENT_DRIVER) {
    return "img_payment";
  } else if (stepId === ENTER_CORRESPONDENCE_DETAILS) {
    return "mail";
  } else if (stepId === UPDATE_MEDALLION_DETAIL) {
    return "medallion";
  } else if (stepId === SEARCH_DRIVER_FOR_LEDGER) {
    return "";
  } else if (stepId === ENTER_LEDGER_DETAILS) {
    return "document";
  } else if (stepId === COMPLETE_LEASE) {
    return "document";
  } else if (stepId === VERIFY_INDIVIDUAL_OWNER) {
    return "document";
  } else if (stepId === ENTER_MEDALLION_DETAIL) {
    return "medallion";
  } else if (stepId === LEASE_DETAIL) {
    return "lease";
  } else if (stepId === MEDALLION_DOCUMENT) {
    return "medallion";
  } else if (
    stepId === VERIFY_CORPORATION_DOCUMENTS ||
    stepId === VERIFY_INDIVIDUAL_OWNER_UPDATED_DOCUMENTS
  ) {
    return "document";
  } else if (stepId === VERIFY_VEHICLE_OWNER_DOCUMENTS) {
    return "document";
  }
};

export const getCreateCaseMessage = (caseType) => {
  if (caseType === CREATE_DRIVER_PAYMENT) {
    return {
      title: "Confirmation on Create Driver Payments",
      message:
        "This will create a new case for Driver Payments . Are <br/> you sure to proceed?",
    };
  }
  if (caseType === LEDGER_ENTRY_TYPE) {
    return {
      title: "Confirmation on Ledger entry",
      message:
        "This will create a new case for Ledger Entry . Are <br/> you sure to proceed?",
    };
  }
};

export const isStepClickable = (
  idx,
  currentActiveStepId,
  renderItem,
  caseData
) => {
  const currentStep = getStepById(currentActiveStepId, renderItem);

  // if (caseData.case_info && caseData.case_info.case_status === "Closed") {
  //   return false;
  // }
  if (currentStep.is_current_step) {
    return true;
  }
  if (currentStep.has_already_been_used && !currentStep.is_current_step) {
    if (currentStep.step_id === currentActiveStepId) {
      return true;
    }

    const isSearchStep =
      currentStep.step_id === SEARCH_VEHICLE_ENTITY ||
      currentStep.step_id === SEARCH_DRIVER ||
      currentStep.step_id === CHOOSE_LEASE_DETAIL;

    if (isSearchStep) {
      return false;
    } else {
      return true;
    }
  }
  return false;
};

export const isStepAccessable = (activeStep) => {
  return activeStep?.has_access;
};

export const getStepIndicator = (
  idx,
  currentActiveStepId,
  renderItem,
  caseData
) => {
  const currentStep = getStepById(currentActiveStepId, renderItem);

  if (caseData.case_info && caseData.case_info.case_status === "Closed") {
    const isSearchStep =
      currentStep.step_id === SEARCH_VEHICLE_ENTITY ||
      currentStep.step_id === SEARCH_DRIVER ||
      currentStep.step_id === CHOOSE_LEASE_DETAIL;

    return (
      <span
        className="success-icon border-0"
        data-testid={isSearchStep ? "ic_step_inactive" : "ic_step_success"}
      >
        <Img
          className="icon"
          name={isSearchStep ? "ic_step_inactive" : "ic_step_success"}
        />
      </span>
    );
  }
  if (currentStep.is_current_step) {
    return (
      <span
        className={`d-flex align-items-center justify-content-center rounded-circle current-step`}
        data-testid="current-step"
      >
        {idx + 1}
      </span>
    );
  }
  if (currentStep.has_already_been_used && !currentStep.is_current_step) {
    if (currentStep.step_id === currentActiveStepId) {
      return (
        <span
          data-testid="has_already_been_used"
          className={`d-flex align-items-center justify-content-center rounded-circle active-step`}
        >
          {idx + 1}
        </span>
      );
    }

    const isSearchStep =
      currentStep.step_id === SEARCH_VEHICLE_ENTITY ||
      currentStep.step_id === SEARCH_DRIVER ||
      currentStep.step_id === CHOOSE_LEASE_DETAIL;

    return (
      <span
        className="success-icon border-0"
        data-test={isSearchStep ? "ic_step_inactive" : "ic_step_success"}
      >
        <Img
          className="icon"
          name={isSearchStep ? "ic_step_inactive" : "ic_step_success"}
        />
      </span>
    );
  }
  const currentStepInfo = caseData?.steps
    .map((item) => item.sub_steps)
    .flat()
    .filter((item) => {
      return item.is_current_step;
    });

  if (currentStepInfo.length == 0 && idx === 0) {
    return (
      <span
        className={`d-flex align-items-center justify-content-center rounded-circle current-step`}
        data-testid="current-step"
      >
        {idx + 1}
      </span>
    );
  }
  return (
    <span
      className={`d-flex align-items-center justify-content-center rounded-circle ${
        currentStep.is_current_step ? "current-step" : ""
      }`}
      data-testid="inactive-step"
    >
      {idx + 1}
    </span>
  );
};
