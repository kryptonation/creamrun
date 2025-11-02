import { useParams } from "react-router-dom";
import MedallionRenewal from "../manage/medallionRenewal";
import MedallionRetrieve from "../manage/medallionRetrieve";
import {
  MO_UPDATE_PAYEE_DOCUMENT_VERIFY,
  MO_ENTER_ADDRESS_DETAIL,
  MO_ENTER_PAYEE_DETAILS,
  MO_UPDATE_ADDRESS_PROOF,
  REWMED_STEP_ID,
  RETMED_DOCUMENT_INFO,
  DMV_UPDATE_LICENSE,
  DMV_VIEW_LICENSE,
  DRIVER_UPDATE_PAYEE_DETAIL,
  DRIVER_UPDATE_PAYEE_VERIFY,
  DRIVER_UPDATE_ADDRESS_DETAIL,
  DRIVER_UPDATE_ADDRESS_VERIFY,
  DRIVER_UPDATE_TLC_DETAIL,
  // DRIVER_UPDATE_TLC_VERIFY,
  VEHICLE_HACK_UP,
  SENDHACKUP,
  VEHICLE_HACK_UP_REGISTER,
  VEHICLE_HACK_UP_INSPECTION,
  ALLOCATE_MEDALLION,
  ALLOCATE_MEDALLION_TO_VECHILE,
  SIGN_LEASE_DRIVER,
  ENTER_FINANCIAL_DETAIL,
  ENTER_LEASE_DETAIL,
  DRIVER_LEASE_TERMINATION,
  DRIVER_LEASE_UPDATE,
  DRIVER_LEASE_UPDATE_FINANCIAL,
  SELECT_LEASE,
  ADDITIONAL_DRIVER,
  ADDITIONAL_DRIVER_TYPE,
  ENTER_VEHICLE_REPAIR,
  VEHICLEREPAIR,
  RENEW_LEASE_TYPE,
  UPDATE_LEASE_INFO,
  RENEW_FINANCIAL_INFO,
  SIGN_LEASE,
  COMPLETE_LEASE,
  VEHICLE_REHACK_TYPE,
  ENTER_REHACK_DETAILS,
  CREATE_PVB_CHOOSE_DRIVER,
  CREATE_PVB_ATTACH,
  ENTER_PVB_DETAILS,
  CREATE_DRIVER_PAYMENT,
  CHOOSE_PAY_PERIOD,
  VIEW_DRIVER_PAYMENT,
  APPROVE_PAYMENT_DRIVER,
  ENTER_CORRESPONDENCE_DETAILS,
  SEARCH_ADDITIONAL_DRIVER,
  UPDATE_MEDALLION_DETAIL,
  SEARCH_DRIVER_FOR_LEDGER,
  ENTER_LEDGER_DETAILS,
  CREATE_INDIVIDUAL_OWNER,
  VERIFY_INDIVIDUAL_OWNER,
  ENTER_MEDALLION_DETAIL,
  MEDALLION_DOCUMENT,
  LEASE_DETAIL,
  ENTER_CORPORATION_DETAIL,
  VERIFY_CORPORATION_DOCUMENTS,
  ENTER_VEHICLE_OWNER_DETAIL,
  CREATE_VEHICLE_OWNER,
  VERIFY_VEHICLE_OWNER_DOCUMENTS,
  ENTER_VEHICLE_DETAIL,
  ENTER_VEHICLE_DELIVERY_DETAIL,
  VIEW_VEHICLE_DOCUMENT,
  ENTER_VEHICLE_DELIVERY_COMPLETE,
  EDIT_VEHICLE_OWNER,
  EDIT_VEHICLE_OWNER_DETAILS,
  UPLOAD_ADDRESS_PROOF,
  INDIVIDUAL_OWNER_UPLOAD_DOCUMENTS,
  CORPORATION_UPLOAD_DOCUMENTS,
  SEARCH_DRIVER,
  UPLOAD_DRIVER_DOCUMENT,
  REGISTER_DRIVER,
  APPROVE_DRIVER,
  DMV_UPDATE_LICENSE_UPLOAD,
  DRIVER_UPDATE_TLC_UPLOAD,
  MO_VERIFY_ADDRESS_DOCUMENTS,
  UPLOAD_STORAGE_DOCUMENTS,
  ENTER_STORAGE_DETAILS,
  VERIFY_MEDALLION_STORAGE_DOCUMENTS,
  UPLOAD_MEDALLION_RENEWAL_PROOF,
  RETMED_UPLOAD_DOCUMENT,
  UPDATE_CORPORATION_DOCUMENTS,
  UPDATE_CORPORATION_DETAILS_FORM,
  VERIFY_UPDATED_CORPORATION_DOCUMENTS,
  UPDATE_INDIVIDUAL_OWNER_DOCUMENTS,
  UPDATE_INDIVIDUAL_OWNER_FORM,
  VERIFY_INDIVIDUAL_OWNER_UPDATED_DOCUMENTS,
  DELIVERY_VEHICLE_INFO,
  DELIVERY_VEHICLE,
  SEARCH_AND_SELECT_MEDALLION,
  ADDITIONAL_DRIVER_SIGN_LEASE,
  ADDITIONAL_DRIVER_COMPLETE_LEASE,
} from "../../utils/constants";
import {
  getCaseTitle,
  getCurrentStep,
  getStepById,
  getStepImage,
  getStepTitle,
  getStepIndicator,
  isStepClickable,
  isStepAccessable,
} from "../../utils/caseUtils";
import {
  useGetCaseDetailWithParamsQuery,
  useLazyGetStepInfoQuery,
} from "../../redux/api/medallionApi";
import { useEffect, useState } from "react";
import BCaseCard from "../../components/BCaseCard";
import Img from "../../components/Img";
import EnterAddressDetail from "../manage/medallionAddress/EnterAddressDetail";
import UploadAddressProof from "../manage/medallionAddress/UploadAddressProof";
import EnterMedallionStorage from "../manage/medallionStorage/EnterMedallionStorage";
import UpdateStorageInfo from "../manage/medallionStorage/UpdateStorageInfo";
import BModal from "../../components/BModal";
import { Button } from "primereact/button";
import BUpload from "../../components/BUpload";
import UpdateMedallionPayee from "../manage/payee/UpdateMedallionPayee";
import PayeeDocumentVerify from "../manage/payee/PayeeDocumentVerify";
import { useSelector } from "react-redux";
import UpdateDmvLicense from "../mangeDriver/dmvLicense/UpdateDmvLicense";
// import ViewDmvLicense from "../mangeDriver/dmvLicense/ViewDmvLicense";
import DriverUpdatePayee from "../mangeDriver/updatePayee/DriverUpdatePayee";
import DriverPayeeVerify from "../mangeDriver/updatePayee/DriverPayeeVerify";
import DriverUpdateAddress from "../mangeDriver/updateAddress/DriverUpdateAddress";
import DriverAddressVerify from "../mangeDriver/updateAddress/DriverAddressVerify";
import UpdateTlcLicense from "../mangeDriver/tlcLicense/UpdateTlcLicense";
import ViewTlcLicense from "../mangeDriver/tlcLicense/ViewTlcLicense";
import HackUp from "../mangeVehicle/hackup/HackUp";
import ImageCar from "../../assets/ic_hack_up.svg";
import VechileRegister from "../mangeVehicle/hackup/VechileRegister";
import HackUpInspection from "../mangeVehicle/hackup/HackUpInspection";
import AttachVechile from "../medallion/AttachVechile";
import EnterLease from "../newLease/EnterLease";
import FinancialInfo from "../newLease/FinancialInfo";
import ViewDocAndSign from "../newLease/ViewDocAndSign";
import AdditionalDriver from "../manageLease/AdditionalDriver";
import LeaseTerminate from "../mangeDriver/LeaseTerminate";
import SelectLease from "../mangeDriver/updateLease/SelectLease";
import UpdateLeaseDetail from "../mangeDriver/updateLease/UpdateLeaseDetail";
import UpdateFinancialInfo from "../mangeDriver/updateLease/UpdateFinancialInfo";
import VehicleRepairDetail from "../mangeVehicle/VehicleRepairDetail";
import ViewLease from "../manageLease/renewLease/ViewLease";
import RenewFinancialInfo from "../manageLease/renewLease/RenewFinancialInfo";
import ViewDocAndSignLease from "../manageLease/renewLease/ViewDocAndSignLease";
import ViewGenDocLease from "../manageLease/renewLease/ViewGenDocLease";
import ReHackUp from "../mangeVehicle/ReHackUp";
import BAuditTrailModal from "../../components/BAuditTrailModal";
import PvbCreateDriver from "../miscellaneous/pvb/PvbCreateDriver";
import AttachPVB from "../miscellaneous/pvb/AttachPVB";
import EnterPVBDetails from "../miscellaneous/pvb/EnterPVBDetails";
import ChoosePayPeriod from "../payments/createDriverPayment/ChoosePayPeriod";
import ViewDriverPayment from "../payments/createDriverPayment/ViewDriverPayment";
import ApprovePayment from "../payments/createDriverPayment/ApprovePayment";
import Createcorrespondence from "../miscellaneous/correspondence/Createcorrespondence";
import {
  getFullName,
  removeUnderScore,
  removeUnderScorefilterGenerate,
} from "../../utils/utils";
import UpdateMedallion from "../manage/UpdateMedallion";
import LedgerSearchDriver from "../payments/ledgerEntry/LedgerSearchDriver";
import LedgerEntryDetail from "../payments/ledgerEntry/LedgerEntryDetail";
import CreateIndividualOwner from "../newMedallion/CreateIndividualOwner";
import VerifyIndividualOwnerDoc from "../newMedallion/VerifyIndividualOwnerDoc";
import MedallionDetail from "../newMedallion/MedallionDetail";
import CreatePacket from "../newMedallion/CreatePacket";
import LeaseDetail from "../newMedallion/LeaseDetail";
import CreateCorporation from "../newMedallion/CreateCorporation";
import VerifyCorporationDoc from "../newMedallion/VerifyCorporationDoc";
import CreateNewVehicleOwner from "../newVehicleOwner/VehicleOwnerDetails";
import VerifyVehicleOwnerDocs from "../newVehicleOwner/VerifyVehicleOwnerDocs";
import VehicleDetails from "../newVehicle/VehicleDetails";
import VehicleDeliveryDetails from "../newVehicle/VehicleDeliveryDetails";
import VehicleVerifyDocument from "../newVehicle/VehicleVerifyDocument";
import VehicleDeliveryCompletion from "../newVehicle/VehicleDeliveryCompletion";
import EditVehicleOwner from "../manageVehicleOwner/EditVehicleOwner";
import {
  dateMonthYear,
  monthDateYearHrsMin,
  monthDateYearHrsMinSepartedByUnderscore,
} from "../../utils/dateConverter";
import UploadDocumentsStepComponent from "../../components/UploadDocumentsStepComponents";
import SearchDriver from "../newDriver/SearchDriver";
import DriverRegistration from "../newDriver/DriverRegistration";
import VerifyDetails from "../newDriver/VerifyDetails";
import UploadDocumentsStepComponentDriver from "../../components/UploadDocumentsStepComponentDriver";
import UploadDmvLicense from "../mangeDriver/dmvLicense/UploadDmvLicense";
import UploadTlcLicense from "../mangeDriver/tlcLicense/UploadTlcLicense";
import VerifyOwnerAddressDocuments from "../manage/medallionAddress/VerifyOwnerAddressDocuments";
import UploadStorageDocuments from "../manage/medallionStorage/UploadStorageDocuments";
import VerifyStorageDocuments from "../manage/medallionStorage/VerifyStorageDocuments";
import VerifyUpdatedCorporationDocuments from "../manageOwner/updateCorporationDetails/VerifyUpdatedCoporationDocuments";
import UpdateIndividualOwner from "../manageOwner/updateIndividualOwner/UpdateIndividualOwner";
import VerifyUpdatedIndividualDocuments from "../manageOwner/updateIndividualOwner/VerifyUpdatedIndvidualDocuments";
import UpdateCorporationDetails from "../manageOwner/updateCorporationDetails/UpdateCorporationDetails";
import AttachMedallion from "../mangeVehicle/AttachMedallion";
import HackUpDetails from "../mangeVehicle/hackup/HackUpDetails";
import AddtionalHackUpDetails from "../mangeVehicle/hackup/AddtionalHackUpDetails";
import ChooseDriverLease from "../newLease/ChooseDriverLease";
import AdditionalDriverViewGeneratedDocument from "../manageLease/AdditionalDriverViewGeneratedDocument";
import AdditionalDriverViewDocAndSign from "../manageLease/AdditionalDriverViewDocAndSign";

const CaseProtected = ({ type }) => {
  const params = useParams();

  const caseId = params.caseId;

  const selectedMedallionDetail = useSelector(
    (state) => state.medallion.selectedMedallionDetail
  );
  const [hasAccess, setAccess] = useState(false);
  console.log("query params", selectedMedallionDetail);
  const queryParams = {
    caseId: caseId,
    ...(selectedMedallionDetail && {
      objectName: selectedMedallionDetail.object_name,
      objectLookup: selectedMedallionDetail.object_lookup,
    }),
  };

  const {
    data: caseData,
    isSuccess: isCaseSuccess,
    refetch,
  } = useGetCaseDetailWithParamsQuery(queryParams, { skip: !caseId });

  const [currentStepId, setCurrentStepId] = useState(null);
  const [currentStepData, setcurrentStepData] = useState(null);

  console.log("Case Protected", currentStepData);

  const renderCurrentStep = () => {
    if (currentStepId === REWMED_STEP_ID) {
      return (
        <MedallionRenewal
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          // currentStep={currentStepData}
          currentStep={caseData.steps[0].sub_steps[0].step_data}
          caseData={caseData}
          hasAccess={hasAccess}
        />
      );
    } else if (currentStepId === UPLOAD_MEDALLION_RENEWAL_PROOF) {
      return (
        <UploadStorageDocuments
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
          requiredType={["renewal_receipt"]}
        />
      );
    } else if (currentStepId === UPLOAD_STORAGE_DOCUMENTS) {
      return (
        <UploadStorageDocuments
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
          requiredType={["rate_card"]}
        />
      );
    } else if (currentStepId === ENTER_STORAGE_DETAILS) {
      return (
        <EnterMedallionStorage
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        />
      );
    } else if (currentStepId === VERIFY_MEDALLION_STORAGE_DOCUMENTS) {
      return (
        <VerifyStorageDocuments
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        />
      );
    }
    // else if (currentStepId === UPDATE_STORAGE_INFO) {
    //   return (
    //     <UpdateStorageInfo
    //       caseId={params.caseId}
    //       currentStepId={currentStepId}
    //       isCaseSuccess={isCaseSuccess}
    //       reload={refetch}
    //       currentStep={currentStepData}
    //       caseData={caseData}
    //       hasAccess={hasAccess}
    //     />
    //   );
    // }
    else if (currentStepId === MO_ENTER_ADDRESS_DETAIL) {
      return (
        <EnterAddressDetail
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        />
      );
    } else if (currentStepId === MO_UPDATE_ADDRESS_PROOF) {
      return (
        <UploadAddressProof
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        />
      );
    } else if (currentStepId === MO_VERIFY_ADDRESS_DOCUMENTS) {
      return (
        <VerifyOwnerAddressDocuments
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        />
      );
    } else if (currentStepId === MO_ENTER_PAYEE_DETAILS) {
      return (
        <UpdateMedallionPayee
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        />
      );
    } else if (currentStepId === MO_UPDATE_PAYEE_DOCUMENT_VERIFY) {
      return (
        <PayeeDocumentVerify
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        />
      );
    } else if (currentStepId === RETMED_UPLOAD_DOCUMENT) {
      return (
        <UploadStorageDocuments
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        />
      );
    } else if (currentStepId === RETMED_DOCUMENT_INFO) {
      return (
        <MedallionRetrieve
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        />
      );
    } else if (currentStepId === DMV_UPDATE_LICENSE_UPLOAD) {
      return (
        <UploadDmvLicense
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        />
      );
    } else if (currentStepId === DMV_UPDATE_LICENSE) {
      return (
        <UpdateDmvLicense
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        />
      );
    }
    // else if (currentStepId === DMV_VIEW_LICENSE) {
    //   return (
    //     <ViewDmvLicense
    //       caseId={params.caseId}
    //       currentStepId={currentStepId}
    //       isCaseSuccess={isCaseSuccess}
    //       reload={refetch}
    //       currentStep={currentStepData}
    //       caseData={caseData}
    //       hasAccess={hasAccess}
    //     />
    //   );
    // }
    else if (currentStepId === DRIVER_UPDATE_PAYEE_DETAIL) {
      return (
        <DriverUpdatePayee
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        />
      );
    } else if (currentStepId === DRIVER_UPDATE_PAYEE_VERIFY) {
      return (
        <DriverPayeeVerify
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        />
      );
    } else if (currentStepId === DRIVER_UPDATE_ADDRESS_DETAIL) {
      return (
        <DriverUpdateAddress
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        />
      );
    } else if (currentStepId === DRIVER_UPDATE_ADDRESS_VERIFY) {
      return (
        <DriverAddressVerify
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        />
      );
    } else if (currentStepId === DRIVER_UPDATE_TLC_UPLOAD) {
      return (
        <UploadTlcLicense
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        />
      );
    } else if (currentStepId === DRIVER_UPDATE_TLC_DETAIL) {
      return (
        <UpdateTlcLicense
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        />
      );
    }
    // else if (currentStepId === DRIVER_UPDATE_TLC_VERIFY) {
    //   return (
    //     <ViewTlcLicense
    //       caseId={params.caseId}
    //       currentStepId={currentStepId}
    //       isCaseSuccess={isCaseSuccess}
    //       reload={refetch}
    //       currentStep={currentStepData}
    //       caseData={caseData}
    //       hasAccess={hasAccess}
    //     />
    //   );
    // }
    else if (currentStepId === VEHICLE_HACK_UP) {
      return (
        <HackUpDetails
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></HackUpDetails>
      );
    } else if (currentStepId === VEHICLE_HACK_UP_REGISTER) {
      return (
        <AddtionalHackUpDetails
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></AddtionalHackUpDetails>
      );
    } else if (currentStepId === VEHICLE_HACK_UP_INSPECTION) {
      return (
        <VechileRegister
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></VechileRegister>
      );
    } else if (currentStepId === ALLOCATE_MEDALLION_TO_VECHILE) {
      return (
        <AttachVechile
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></AttachVechile>
      );
    } else if (currentStepId === ENTER_LEASE_DETAIL) {
      return (
        <EnterLease
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></EnterLease>
      );
    } else if (currentStepId === ENTER_FINANCIAL_DETAIL) {
      return (
        <FinancialInfo
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></FinancialInfo>
      );
    } else if (currentStepId === SIGN_LEASE_DRIVER) {
      return (
        <ViewDocAndSign
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></ViewDocAndSign>
      );
    } else if (currentStepId === SELECT_LEASE) {
      return (
        <SelectLease
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></SelectLease>
      );
    } else if (currentStepId === DRIVER_LEASE_UPDATE) {
      return (
        <UpdateLeaseDetail
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></UpdateLeaseDetail>
      );
    } else if (currentStepId === DRIVER_LEASE_UPDATE_FINANCIAL) {
      return (
        <UpdateFinancialInfo
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></UpdateFinancialInfo>
      );
    }
    // else if (currentStepId === DRIVERLEASETERMINATION) {
    //     return <ViewGeneratedDocument caseId={params.caseId} currentStepId={currentStepId} isCaseSuccess={isCaseSuccess} reload={refetch} currentStep={currentStepData} caseData={caseData} hasAccess={hasAccess}></ViewGeneratedDocument>
    // }
    else if (currentStepId === ADDITIONAL_DRIVER) {
      return (
        <AdditionalDriver
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          // currentStepData={currentStepData}
          currentStepData={caseData?.steps[0]?.sub_steps[0]?.step_data}
          caseData={caseData}
          hasAccess={hasAccess}
        ></AdditionalDriver>
      );
    } else if (currentStepId === ADDITIONAL_DRIVER_SIGN_LEASE) {
      return (
        <AdditionalDriverViewDocAndSign
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStepData={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></AdditionalDriverViewDocAndSign>
      );
    } else if (currentStepId === ADDITIONAL_DRIVER_COMPLETE_LEASE) {
      return (
        <AdditionalDriverViewGeneratedDocument
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStepData={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></AdditionalDriverViewGeneratedDocument>
      );
    } else if (currentStepId === DRIVER_LEASE_TERMINATION) {
      return (
        <LeaseTerminate
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></LeaseTerminate>
      );
    } else if (currentStepId === ENTER_VEHICLE_REPAIR) {
      return (
        <VehicleRepairDetail
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></VehicleRepairDetail>
      );
    } else if (currentStepId === UPDATE_LEASE_INFO) {
      return (
        <ViewLease
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></ViewLease>
      );
    } else if (currentStepId === RENEW_FINANCIAL_INFO) {
      return (
        <RenewFinancialInfo
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></RenewFinancialInfo>
      );
    } else if (currentStepId === SIGN_LEASE) {
      return (
        <ViewDocAndSignLease
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></ViewDocAndSignLease>
      );
    } else if (currentStepId === COMPLETE_LEASE) {
      return (
        <ViewGenDocLease
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></ViewGenDocLease>
      );
    } else if (currentStepId === ENTER_REHACK_DETAILS) {
      return (
        <ReHackUp
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></ReHackUp>
      );
    } else if (currentStepId === CREATE_PVB_CHOOSE_DRIVER) {
      return (
        <PvbCreateDriver
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></PvbCreateDriver>
      );
    } else if (currentStepId === CREATE_PVB_ATTACH) {
      return (
        <AttachPVB
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></AttachPVB>
      );
    } else if (currentStepId === ENTER_PVB_DETAILS) {
      return (
        <EnterPVBDetails
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></EnterPVBDetails>
      );
    } else if (currentStepId === CHOOSE_PAY_PERIOD) {
      return (
        <ChoosePayPeriod
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></ChoosePayPeriod>
      );
    } else if (currentStepId === VIEW_DRIVER_PAYMENT) {
      return (
        <ViewDriverPayment
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></ViewDriverPayment>
      );
    } else if (currentStepId === APPROVE_PAYMENT_DRIVER) {
      return (
        <ApprovePayment
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></ApprovePayment>
      );
    } else if (currentStepId === ENTER_CORRESPONDENCE_DETAILS) {
      return (
        <Createcorrespondence
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></Createcorrespondence>
      );
    } else if (currentStepId === UPDATE_MEDALLION_DETAIL) {
      return (
        <UpdateMedallion
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></UpdateMedallion>
      );
    } else if (currentStepId === SEARCH_DRIVER_FOR_LEDGER) {
      return (
        <LedgerSearchDriver
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></LedgerSearchDriver>
      );
    } else if (currentStepId === ENTER_LEDGER_DETAILS) {
      return (
        <LedgerEntryDetail
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></LedgerEntryDetail>
      );
    } else if (currentStepId === INDIVIDUAL_OWNER_UPLOAD_DOCUMENTS) {
      return (
        <UploadDocumentsStepComponent
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></UploadDocumentsStepComponent>
      );
    } else if (currentStepId === CREATE_INDIVIDUAL_OWNER) {
      return (
        <CreateIndividualOwner
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></CreateIndividualOwner>
      );
    } else if (currentStepId === VERIFY_INDIVIDUAL_OWNER) {
      return (
        <VerifyIndividualOwnerDoc
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></VerifyIndividualOwnerDoc>
      );
    } else if (currentStepId === UPDATE_INDIVIDUAL_OWNER_DOCUMENTS) {
      return (
        <UploadDocumentsStepComponent
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></UploadDocumentsStepComponent>
      );
    } else if (currentStepId === UPDATE_INDIVIDUAL_OWNER_FORM) {
      return (
        <UpdateIndividualOwner
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></UpdateIndividualOwner>
      );
    } else if (currentStepId === VERIFY_INDIVIDUAL_OWNER_UPDATED_DOCUMENTS) {
      return (
        <VerifyUpdatedIndividualDocuments
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></VerifyUpdatedIndividualDocuments>
      );
    } else if (currentStepId === ENTER_MEDALLION_DETAIL) {
      console.log("currentStepId", currentStepId);
      return (
        <MedallionDetail
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></MedallionDetail>
      );
    } else if (currentStepId === MEDALLION_DOCUMENT) {
      return (
        <CreatePacket
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></CreatePacket>
      );
    } else if (currentStepId === LEASE_DETAIL) {
      return (
        <LeaseDetail
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></LeaseDetail>
      );
    } else if (currentStepId === CORPORATION_UPLOAD_DOCUMENTS) {
      return (
        <UploadDocumentsStepComponent
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></UploadDocumentsStepComponent>
      );
    } else if (currentStepId === ENTER_CORPORATION_DETAIL) {
      return (
        <CreateCorporation
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></CreateCorporation>
      );
    } else if (currentStepId === VERIFY_CORPORATION_DOCUMENTS) {
      return (
        <VerifyCorporationDoc
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></VerifyCorporationDoc>
      );
    } else if (currentStepId === UPDATE_CORPORATION_DOCUMENTS) {
      return (
        <UploadDocumentsStepComponent
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></UploadDocumentsStepComponent>
      );
    } else if (currentStepId === UPDATE_CORPORATION_DETAILS_FORM) {
      return (
        <UpdateCorporationDetails
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></UpdateCorporationDetails>
      );
    } else if (currentStepId === VERIFY_UPDATED_CORPORATION_DOCUMENTS) {
      return (
        <VerifyUpdatedCorporationDocuments
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></VerifyUpdatedCorporationDocuments>
      );
    } else if (currentStepId === ENTER_VEHICLE_OWNER_DETAIL) {
      return (
        <CreateNewVehicleOwner
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></CreateNewVehicleOwner>
      );
    } else if (currentStepId === VERIFY_VEHICLE_OWNER_DOCUMENTS) {
      return (
        <VerifyVehicleOwnerDocs
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></VerifyVehicleOwnerDocs>
      );
    } else if (currentStepId === EDIT_VEHICLE_OWNER_DETAILS) {
      console.log("currentStepId", currentStepId);
      return (
        <EditVehicleOwner
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></EditVehicleOwner>
      );
    } else if (currentStepId === ENTER_VEHICLE_DETAIL) {
      console.log("currentStepId", currentStepId);
      return (
        <UploadDocumentsStepComponent
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></UploadDocumentsStepComponent>
        // <VehicleDetails
        //   caseId={params.caseId}
        //   currentStepId={currentStepId}
        //   isCaseSuccess={isCaseSuccess}
        //   reload={refetch}
        //   currentStep={currentStepData}
        //   caseData={caseData}
        //   hasAccess={hasAccess}
        // ></VehicleDetails>
      );
    } else if (currentStepId === ENTER_VEHICLE_DELIVERY_DETAIL) {
      console.log("currentStepId", currentStepId);
      return (
        // <VehicleDeliveryDetails
        //   caseId={params.caseId}
        //   currentStepId={currentStepId}
        //   isCaseSuccess={isCaseSuccess}
        //   reload={refetch}
        //   currentStep={currentStepData}
        //   caseData={caseData}
        //   hasAccess={hasAccess}
        // ></VehicleDeliveryDetails>
        <>
          <VehicleDetails
            caseId={params.caseId}
            currentStepId={currentStepId}
            isCaseSuccess={isCaseSuccess}
            reload={refetch}
            currentStep={currentStepData}
            caseData={caseData}
            hasAccess={hasAccess}
          ></VehicleDetails>
        </>
      );
    } else if (currentStepId === VIEW_VEHICLE_DOCUMENT) {
      console.log("currentStepId", currentStepId);
      return (
        // <VehicleVerifyDocument
        //   caseId={params.caseId}
        //   currentStepId={currentStepId}
        //   isCaseSuccess={isCaseSuccess}
        //   reload={refetch}
        //   currentStep={currentStepData}
        //   caseData={caseData}
        //   hasAccess={hasAccess}
        // ></VehicleVerifyDocument>
        <VehicleDeliveryDetails
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></VehicleDeliveryDetails>
      );
    } else if (currentStepId === ENTER_VEHICLE_DELIVERY_COMPLETE) {
      console.log("currentStepId", currentStepId);
      return (
        <VehicleDeliveryCompletion
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></VehicleDeliveryCompletion>
      );
    } else if (currentStepId === SEARCH_DRIVER) {
      return (
        <SearchDriver
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></SearchDriver>
      );
    } else if (currentStepId === UPLOAD_DRIVER_DOCUMENT) {
      return (
        <UploadDocumentsStepComponentDriver
          caseId={params.caseId}
          currentStepId={currentStepId}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></UploadDocumentsStepComponentDriver>
      );
    } else if (currentStepId === REGISTER_DRIVER) {
      return (
        <DriverRegistration
          caseId={params.caseId}
          currentStepId={currentStepId}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></DriverRegistration>
      );
    } else if (currentStepId === APPROVE_DRIVER) {
      console.log("current step", currentStepData, caseData, currentStepId);
      return (
        <VerifyDetails
          caseId={params.caseId}
          currentStepId={currentStepId}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></VerifyDetails>
      );
    } else if (currentStepId === DELIVERY_VEHICLE_INFO) {
      console.log("currentStepId", currentStepId);
      return (
        <VehicleDeliveryDetails
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></VehicleDeliveryDetails>
      );
    } else if (currentStepId === SEARCH_AND_SELECT_MEDALLION) {
      return (
        <AttachMedallion
          caseId={params.caseId}
          currentStepId={currentStepId}
          isCaseSuccess={isCaseSuccess}
          reload={refetch}
          currentStep={currentStepData}
          caseData={caseData}
          hasAccess={hasAccess}
        ></AttachMedallion>
      );
    }
  };

  useEffect(() => {
    if (caseData) {
      const currentStep = getCurrentStep(caseData.steps);
      console.log("currentStep : ", currentStep);
      setCurrentStepId(currentStep?.step_id);
      // setcurrentStepData(currentStep?.step_data);
      setAccess(isStepAccessable(currentStep));
    }
  }, [caseData]);

  const [triggerGetStepInfo, { data: stepInfoData, isFetching, isSuccess }] =
    useLazyGetStepInfoQuery();

  //  Call API when component mounts or when caseId/currentStepId changes
  useEffect(() => {
    if (caseId && currentStepId) {
      triggerGetStepInfo({ caseNo: caseId, step_no: currentStepId });
    }
  }, [caseId, currentStepId, triggerGetStepInfo]);

  // Update local state when API response comes in
  useEffect(() => {
    if (isSuccess && stepInfoData) {
      setcurrentStepData(stepInfoData);
    }
  }, [isSuccess, stepInfoData]);

  const getFile = () => {
    let upload = {};
    // if (currentStepId === MO_UPDATE_PAYEE_DOCUMENT_VERIFY) {
    //   console.log("MO_UPDATE_PAYEE_DOCUMENT_VERIFY", currentStepData);
    //   upload = {
    //     data: currentStepData?.owner_payee_proofs[0],
    //     object_type: currentStepData?.object_type,
    //     object_id: currentStepData?.id,
    //     document_id: currentStepData?.owner_payee_proofs[0]?.document_object_id,
    //     document_type: [
    //       {
    //         name: "Medallion Payee Proof",
    //         code: currentStepData?.owner_payee_proofs[0]?.document_type,
    //       },
    //     ],
    //   };
    // }
    // if (currentStepId === DRIVER_UPDATE_PAYEE_VERIFY) {
    //   upload = {
    //     // data: currentStepData?.medallion_owner_payee_proofs,
    //     object_type:
    //       currentStepData?.driver_document_info.object_type ?? "driver",
    //     object_id: currentStepData?.driver_document_info?.object_id,
    //     document_id: 0,
    //     document_type: [
    //       {
    //         name: "Driver Payee Proof",
    //         code: currentStepData?.driver_document_info.document_type,
    //       },
    //     ],
    //   };
    // }
    // if (currentStepId === DRIVER_UPDATE_ADDRESS_VERIFY) {
    //   upload = {
    //     data: currentStepData?.driver_document_info,
    //     object_type: currentStepData?.driver_document_info?.object_type,
    //     object_id: currentStepData?.driver_info?.driver_seq_id,
    //     document_id: 0,
    //     document_type: [
    //       {
    //         name: "Driver Address Proof",
    //         code: currentStepData?.driver_document_info?.document_type,
    //       },
    //     ],
    //   };
    // }
    // if (currentStepId === MO_UPDATE_ADDRESS_PROOF) {
    //   console.log(
    //     "MO_UPDATE_ADDRESS_PROOF",
    //     currentStepData,
    //     currentStepData?.upload_data?.document_type
    //   );

    //   upload = {
    //     data: currentStepData?.medallion_owner_address_proofs,
    //     object_type: currentStepData?.upload_data?.object_type ?? "medallion",
    //     object_id: currentStepData?.owner_id,
    //     document_id: currentStepData?.upload_data?.object_id,
    //     document_type: [
    //       {
    //         name: "Owner Address Proof",
    //         code:
    //           currentStepData?.upload_data?.document_type ??
    //           "medallion_address_proof",
    //       },
    //     ],
    //   };
    // }
    if (currentStepId === CREATE_PVB_ATTACH) {
      const documetDetail = currentStepData.documents;

      upload = {
        // data: documetDetail,
        object_type: documetDetail?.document_object_type,
        object_id: documetDetail?.document_object_id,
        document_id: 0,
        document_type: [
          {
            name: documetDetail?.document_type,
            code: documetDetail?.document_type,
          },
        ],
      };
    }
    if (currentStepId === VEHICLE_HACK_UP_INSPECTION) {
      const documetType = currentStepData?.documents?.map((item) => ({
        name: removeUnderScore(item?.document_type),
        code: item?.document_type,
      }));
      const documetDetail = currentStepData.upload_info;
      upload = {
        data: documetDetail?.medallion_owner_address_proofs,
        object_type: documetDetail?.object_type,
        object_id: documetDetail?.object_id,
        document_id: 0,
        document_type: documetType,
      };
    }
    return upload;
  };

  const naviagteSteps = (idx, item) => {
    const stepData = getStepById(currentStepId, item.sub_steps);
    if (isStepClickable(idx, currentStepId, item.sub_steps, caseData)) {
      setCurrentStepId(stepData.step_id);
      // setcurrentStepData(stepData.step_data);
      setAccess(isStepAccessable(stepData));
    }
  };
  console.log(getCaseTitle(params.caseType));

  return (
    <>
      {caseData ? (
        <div className="common-layout w-100 h-100 d-flex flex-column gap-3">
          <div className="d-flex align-items-center justify-content-between gap-3">
            <p className="topic-txt" data-testid="case-title">
              {getCaseTitle(params.caseType)}
            </p>
            <BAuditTrailModal
              caseId={caseId}
              stepId={currentStepId}
            ></BAuditTrailModal>
          </div>
          <div className="d-flex align-items-center cus-gap-5">
            {caseData?.steps.map((item, idx) => {
              return (
                <button
                  key={idx}
                  data-testid="step-button"
                  onClick={() => naviagteSteps(idx, item)}
                  className={`step-menu d-flex align-items-center gap-2 text-grey btn p-0 border-0 regular-text`}
                >
                  {getStepIndicator(
                    idx,
                    currentStepId,
                    item.sub_steps,
                    caseData
                  )}
                  {item.step_name}
                </button>
              );
            })}
          </div>

          <div className="d-flex align-items-center gap-5">
            <BCaseCard
              label="Case Number"
              value={caseData?.case_info.case_no}
            />
            <BCaseCard
              label="Case Status"
              value={caseData?.case_info.case_status}
            />
            <BCaseCard
              label="Created By"
              value={caseData?.case_info.created_by}
            />
            <BCaseCard
              label="Created On"
              value={monthDateYearHrsMinSepartedByUnderscore(
                caseData?.case_info.case_created_on
              )}
            />
            <BCaseCard
              label="Action Due Date"
              value={monthDateYearHrsMinSepartedByUnderscore(
                caseData?.case_info.action_due_on
              )}
            />
            <BCaseCard
              label="Remaining Days Left"
              value={monthDateYearHrsMinSepartedByUnderscore(
                caseData?.case_info.action_due_on
              )}
            />
          </div>
          <div>
            <Img name="ic_line" />
          </div>
          <div className="d-flex align-items-center">
            {currentStepId !== CREATE_PVB_CHOOSE_DRIVER &&
            currentStepId !== CHOOSE_PAY_PERIOD &&
            currentStepId !== SEARCH_DRIVER_FOR_LEDGER &&
            currentStepId !== CREATE_INDIVIDUAL_OWNER &&
            currentStepId !== ENTER_CORPORATION_DETAIL &&
            currentStepId !== ENTER_VEHICLE_OWNER_DETAIL &&
            currentStepId !== ENTER_VEHICLE_DETAIL &&
            currentStepId !== ENTER_VEHICLE_DELIVERY_DETAIL &&
            currentStepId !== VIEW_VEHICLE_DOCUMENT &&
            currentStepId !== ENTER_VEHICLE_DELIVERY_COMPLETE &&
            currentStepId !== DELIVERY_VEHICLE_INFO &&
            currentStepId !== SEARCH_AND_SELECT_MEDALLION &&
            currentStepId !== EDIT_VEHICLE_OWNER_DETAILS ? (
              currentStepId === VEHICLE_HACK_UP ? (
                <img src={ImageCar} alt="Car" />
              ) : (
                <Img
                  name={getStepImage(currentStepId)}
                  className="icon-black"
                />
              )
            ) : null}
            <p
              className="sec-topic align-items-center px-2"
              data-testid="step-title"
            >
              {getStepTitle(currentStepId)}
            </p>
            {
              // currentStepId === MO_UPDATE_PAYEE_DOCUMENT_VERIFY ||
              (currentStepId === VEHICLE_HACK_UP_INSPECTION ||
                // currentStepId === DRIVER_UPDATE_PAYEE_VERIFY ||
                // currentStepId === DRIVER_UPDATE_ADDRESS_VERIFY ||
                currentStepId === CREATE_PVB_ATTACH) && (
                <BModal>
                  <BModal.ToggleButton>
                    <Button
                      text
                      label="Upload Documents"
                      className="text-blue upload-common-btn gap-2 ms-auto"
                      type="button"
                      data-testid="btn-upload-documents"
                      icon={() => <Img name="upload_blue" />}
                    />
                  </BModal.ToggleButton>
                  <BModal.Content>
                    <BUpload {...getFile()}></BUpload>
                  </BModal.Content>
                </BModal>
              )
            }

            {/* {currentStepId === MO_UPDATE_ADDRESS_PROOF && (
              <div style={{ marginLeft: "auto" }}>
                <BModal>
                  <BModal.ToggleButton>
                    <Button
                      text
                      label="Upload Address Proof"
                      data-testid="upload-documents"
                      className="text-blue  upload-common-btn gap-2"
                      type="button"
                      icon={() => <Img name="upload" />}
                    />
                  </BModal.ToggleButton>
                  <BModal.Content>
                    <BUpload {...getFile()}></BUpload>
                  </BModal.Content>
                </BModal>
              </div>
            )} */}
          </div>

          <div className="d-flex align-items-center gap-5">
            {(() => {
              if (type === "driver") {
                console.log(currentStepData);
                let driver = currentStepData?.lease_info;
                if (currentStepId === SELECT_LEASE) {
                  const driver = currentStepData?.driver_info;
                  return (
                    <>
                      <BCaseCard
                        label="Driver Name"
                        value={
                          getFullName(
                            driver?.first_name,
                            driver?.middle_name,
                            driver?.last_name
                          ) || "N/A"
                        }
                      />
                      <BCaseCard
                        label="Driver ID"
                        value={driver?.driver_lookup_id || "N/A"}
                      />
                      <BCaseCard
                        label="TLC License Number"
                        value={
                          driver?.tlc_license ||
                          driver?.tlc_license_number ||
                          "N/A"
                        }
                      />
                      <BCaseCard
                        label="DMV License Number"
                        value={
                          driver?.dmv_license ||
                          driver?.dmv_license_number ||
                          "N/A"
                        }
                      />
                      {/* <BCaseCard
                        label="Driver Type"
                        value={`${driver?.driver_type || "N/A"}`}
                      /> */}
                    </>
                  );
                }

                if (
                  currentStepId === DRIVER_LEASE_UPDATE ||
                  currentStepId === DRIVER_LEASE_UPDATE_FINANCIAL
                ) {
                  return (
                    <>
                      <BCaseCard
                        label="Lease ID"
                        value={driver?.lease_id || "N/A"}
                      />
                      <BCaseCard
                        label="Vehicle VIN No"
                        value={
                          currentStepData?.lease_case_details?.vehicle_vin ||
                          "N/A"
                        }
                      />
                      <BCaseCard
                        label="Vehicle Plate No"
                        value={`${
                          currentStepData?.lease_case_details?.plate_number ||
                          "N/A"
                        }`}
                      />
                      <BCaseCard
                        label="Lease Date"
                        value={`${driver?.lease_end_date || "N/A"}`}
                      />
                    </>
                  );
                }
                driver = currentStepData?.driver_info;
                return (
                  <>
                    <BCaseCard
                      label="Driver Name"
                      value={
                        getFullName(
                          driver?.first_name,
                          driver?.middle_name,
                          driver?.last_name
                        ) || "N/A"
                      }
                    />
                    <BCaseCard
                      label="Driver ID"
                      value={driver?.driver_lookup_id || "N/A"}
                    />
                    <BCaseCard
                      label="TLC License Number"
                      value={
                        driver?.tlc_license ||
                        driver?.tlc_license_number ||
                        "N/A"
                      }
                    />
                    <BCaseCard
                      label="DMV License Number"
                      value={
                        driver?.dmv_license ||
                        driver?.dmv_license_number ||
                        "N/A"
                      }
                    />
                    {/* <BCaseCard
                      label="Driver Type"
                      value={`${driver?.driver_type || "N/A"}`}
                    /> */}
                  </>
                );
              } else if (
                params.caseType === CREATE_DRIVER_PAYMENT ||
                currentStepId === SEARCH_DRIVER_FOR_LEDGER ||
                currentStepId === ENTER_LEDGER_DETAILS ||
                currentStepId === CREATE_INDIVIDUAL_OWNER ||
                currentStepId === ENTER_CORPORATION_DETAIL ||
                currentStepId === ENTER_VEHICLE_OWNER_DETAIL ||
                currentStepId === ENTER_VEHICLE_DETAIL ||
                currentStepId === ENTER_VEHICLE_DELIVERY_DETAIL ||
                currentStepId === VIEW_VEHICLE_DOCUMENT ||
                currentStepId === ENTER_VEHICLE_DELIVERY_COMPLETE ||
                currentStepId === EDIT_VEHICLE_OWNER_DETAILS ||
                currentStepId === INDIVIDUAL_OWNER_UPLOAD_DOCUMENTS ||
                currentStepId === CORPORATION_UPLOAD_DOCUMENTS
              ) {
                return null;
              } else if (
                currentStepId === CREATE_PVB_CHOOSE_DRIVER ||
                currentStepId === ENTER_CORRESPONDENCE_DETAILS ||
                currentStepId === VERIFY_INDIVIDUAL_OWNER ||
                currentStepId === VERIFY_CORPORATION_DOCUMENTS ||
                currentStepId === VERIFY_VEHICLE_OWNER_DOCUMENTS ||
                currentStepId === SEARCH_DRIVER ||
                currentStepId === UPLOAD_DRIVER_DOCUMENT ||
                currentStepId === REGISTER_DRIVER ||
                currentStepId === APPROVE_DRIVER
              ) {
                return null;
              } else if (
                currentStepId === CREATE_PVB_ATTACH ||
                currentStepId === ENTER_PVB_DETAILS
              ) {
                const stepDetails = currentStepData?.other_details;
                return (
                  <>
                    <BCaseCard
                      label="Medallion No"
                      value={stepDetails?.medallion_number || "N/A"}
                    />
                    <BCaseCard
                      label="Medallion Owner"
                      value={stepDetails?.medallion_owner || "N/A"}
                    />
                    <BCaseCard
                      label="Driver ID"
                      value={stepDetails?.driver_id || "N/A"}
                    />
                    <BCaseCard
                      label="Driver Name"
                      value={stepDetails?.driver_name || "N/A"}
                    />
                    <BCaseCard
                      label="TLC License No"
                      value={stepDetails?.tlc_license_number}
                    />
                    <BCaseCard
                      label="Vehicle Plate No"
                      value={stepDetails?.plate_number}
                    />
                  </>
                );
              } else if (
                params.caseType === VEHICLEREPAIR ||
                params.caseType === VEHICLE_REHACK_TYPE
              ) {
                const vehicle = currentStepData?.vehicle_info;
                return (
                  <>
                    <BCaseCard label="VIN No" value={vehicle?.vin || "N/A"} />
                    <BCaseCard
                      label="Vehicle Make"
                      value={vehicle?.make || "N/A"}
                    />
                    <BCaseCard label="Model" value={vehicle?.model || "N/A"} />
                    <BCaseCard label="Year" value={vehicle?.year || "N/A"} />
                    <BCaseCard
                      label="Entity Name"
                      value={`${vehicle?.entity_name || "N/A"}`}
                    />
                    <BCaseCard
                      label="Vehicle Type"
                      value={`${vehicle?.vehicle_type || "N/A"}`}
                    />
                  </>
                );
              } else if (
                params.caseType === DELIVERY_VEHICLE ||
                currentStepId === SEARCH_AND_SELECT_MEDALLION
              ) {
                const vehicle = currentStepData?.vehicle;
                return (
                  <>
                    <BCaseCard label="VIN No" value={vehicle?.vin || "N/A"} />
                    <BCaseCard
                      label="Vehicle Make"
                      value={vehicle?.make || "N/A"}
                    />
                    <BCaseCard label="Model" value={vehicle?.model || "N/A"} />
                    <BCaseCard label="Year" value={vehicle?.year || "N/A"} />
                    <BCaseCard
                      label="Entity Name"
                      value={`${vehicle?.entity_name || "N/A"}`}
                    />
                    <BCaseCard
                      label="Vehicle Type"
                      value={`${vehicle?.vehicle_type || "N/A"}`}
                    />
                  </>
                );
              } else if (params.caseType === ADDITIONAL_DRIVER_TYPE) {
                // const lease = currentStepData?.lease_case_details;
                const lease =
                  caseData?.steps[0]?.sub_steps[0]?.step_data
                    ?.lease_case_details;
                const drivers =
                  caseData?.steps?.[0]?.sub_steps?.[0]?.step_data
                    ?.lease_case_details?.driver || [];

                const primaryDriver = drivers.find(
                  (d) => d.is_additional_driver === false
                );

                console.log("lease details", currentStepData, caseData);
                return (
                  <>
                    <BCaseCard
                      label="Lease ID"
                      value={lease?.lease_id || "N/A"}
                    />
                    <BCaseCard
                      label="Lease Type"
                      value={`${lease?.lease_type || "N/A"}`}
                    />
                    <BCaseCard
                      label="Medallion No"
                      value={lease?.medallion_number || "N/A"}
                    />
                    {/* <BCaseCard
                      label="Medallion Owner"
                      value={lease?.medallion_owner || "N/A"}
                    /> */}
                    <BCaseCard
                      label="Vehicle VIN No"
                      value={lease?.vehicle_vin_number || "N/A"}
                    />
                    <BCaseCard
                      label="Primary Driver Name"
                      value={primaryDriver?.driver_name || "N/A"}
                    />
                    {/* <BCaseCard
                      label="Vehicle Plate No"
                      value={`${lease?.vehicle_plate_number || "N/A"}`}
                    />
                    <BCaseCard
                      label="Vehicle Type"
                      value={`${lease?.vehicle_type || "N/A"}`}
                    /> */}
                  </>
                );
              } else if (params.caseType === RENEW_LEASE_TYPE) {
                const lease = currentStepData?.lease_case_details;
                return (
                  <>
                    <BCaseCard
                      label="Lease ID"
                      value={currentStepData?.lease_info?.lease_id || "N/A"}
                    />
                    <BCaseCard
                      label="Medallion No"
                      value={lease?.medallion_number || "N/A"}
                    />
                    <BCaseCard
                      label="Medallion Owner"
                      value={lease?.medallion_owner || "N/A"}
                    />
                    <BCaseCard
                      label="Vehicle VIN No"
                      value={lease?.vehicle_vin || "N/A"}
                    />
                    <BCaseCard
                      label="Vehicle Plate No"
                      value={`${lease?.plate_number || "N/A"}`}
                    />
                    <BCaseCard
                      label="Vehicle Type"
                      value={`${lease?.vehicle_type || "N/A"}`}
                    />
                    <BCaseCard
                      label="Lease Type"
                      value={`${lease?.lease_type || "N/A"}`}
                    />
                  </>
                );
              } else if (params.caseType === SENDHACKUP) {
                const vehicle =
                  currentStepData?.vehicle ||
                  currentStepData?.vehicle_details?.vehicle;
                return (
                  <>
                    <BCaseCard
                      label="Vehicle"
                      value={
                        vehicle?.make +
                        " " +
                        vehicle?.model +
                        " " +
                        vehicle?.year
                      }
                    />
                    <BCaseCard label="VIN No" value={vehicle?.vin || "N/A"} />
                    <BCaseCard
                      label="Medallion Number"
                      value={`${
                        currentStepData?.medallion_details?.medallion_number ||
                        currentStepData?.vehicle_details?.medallion_details
                          ?.medallion_number ||
                        "N/A"
                      }`}
                    />
                  </>
                );
              } else if (
                params.caseType === ALLOCATE_MEDALLION ||
                currentStepId === RETMED_DOCUMENT_INFO ||
                currentStepId === RETMED_UPLOAD_DOCUMENT
              ) {
                const madallion = currentStepData?.medallion_info;
                return (
                  <>
                    <BCaseCard
                      label="Medallion Owner Name"
                      value={madallion?.medallion_owner_name || "N/A"}
                    />
                    <BCaseCard
                      label="Medallion Number"
                      value={madallion?.medallion_number || "N/A"}
                    />
                    <BCaseCard
                      label="Expiration Date"
                      value={
                        dateMonthYear(
                          madallion?.medallion_lease?.contract_end_date
                        ) || "N/A"
                      }
                    />
                    <BCaseCard
                      label="Medallion Type"
                      value={madallion?.medallion_type || "N/A"}
                    />
                    <BCaseCard
                      label="Contact"
                      value={`${madallion?.primary_contact_nember || "N/A"} | ${
                        madallion?.primary_email_address || "N/A"
                      }`}
                    />
                  </>
                );
              } else if (
                currentStepId === MO_UPDATE_ADDRESS_PROOF ||
                currentStepId === MO_ENTER_ADDRESS_DETAIL ||
                currentStepId === MO_VERIFY_ADDRESS_DOCUMENTS ||
                currentStepId === MO_UPDATE_PAYEE_DOCUMENT_VERIFY ||
                currentStepId === MO_ENTER_PAYEE_DETAILS
              ) {
                const madallion = currentStepData?.medallion_info;
                return (
                  <>
                    <BCaseCard
                      label="Medallion Owner Name"
                      value={currentStepData?.owner_name || "N/A"}
                    />
                    <BCaseCard
                      label="Contact"
                      value={`${
                        currentStepData?.primary_contact_number || "N/A"
                      } | ${currentStepData?.primary_email_address || "N/A"}`}
                    />
                  </>
                );
              } else if (currentStepId === UPDATE_INDIVIDUAL_OWNER_FORM) {
                return (
                  <>
                    <BCaseCard
                      label="Medallion Owner Name"
                      value={
                        currentStepData?.individual_info?.full_name || "N/A"
                      }
                    />
                    <BCaseCard
                      label="Contact"
                      value={`${
                        currentStepData?.individual_info
                          ?.primary_contact_number || "N/A"
                      } | ${
                        currentStepData?.individual_info
                          ?.primary_email_address || "N/A"
                      }`}
                    />
                  </>
                );
              } else if (
                currentStepId === VERIFY_INDIVIDUAL_OWNER_UPDATED_DOCUMENTS
              ) {
                return (
                  <>
                    <BCaseCard
                      label="Medallion Owner Name"
                      value={
                        currentStepData?.individual_details?.individual_info
                          ?.full_name || "N/A"
                      }
                    />
                    <BCaseCard
                      label="Contact"
                      value={`${
                        currentStepData?.individual_details?.individual_info
                          ?.primary_contact_number || "N/A"
                      } | ${
                        currentStepData?.individual_details?.individual_info
                          ?.primary_email_address || "N/A"
                      }`}
                    />
                  </>
                );
              } else if (currentStepId === UPDATE_INDIVIDUAL_OWNER_DOCUMENTS) {
                return (
                  <>
                    <BCaseCard
                      label="Medallion Owner Name"
                      value={
                        currentStepData?.individual_details?.individual_info
                          ?.full_name || "N/A"
                      }
                    />
                    <BCaseCard
                      label="Contact"
                      value={`${
                        currentStepData?.individual_details?.individual_info
                          ?.primary_contact_number || "N/A"
                      } | ${
                        currentStepData?.individual_details?.individual_info
                          ?.primary_email_address || "N/A"
                      }`}
                    />
                  </>
                );
              } else if (
                currentStepId === UPDATE_CORPORATION_DOCUMENTS ||
                currentStepId === VERIFY_UPDATED_CORPORATION_DOCUMENTS
              ) {
                const madallion = currentStepData?.corporation_details;
                return (
                  <>
                    <BCaseCard
                      label="Medallion Owner Name"
                      value={
                        currentStepData?.corporation_details?.name || "N/A"
                      }
                    />
                    <BCaseCard
                      label="Contact"
                      value={`${
                        currentStepData?.corporation_details
                          ?.primary_contact_number || "N/A"
                      } | ${
                        currentStepData?.corporation_details
                          ?.primary_email_address || "N/A"
                      }`}
                    />
                  </>
                );
              } else if (currentStepId === UPDATE_CORPORATION_DETAILS_FORM) {
                return (
                  <>
                    <BCaseCard
                      label="Medallion Owner Name"
                      value={currentStepData?.name || "N/A"}
                    />
                    <BCaseCard
                      label="Contact"
                      value={`${
                        currentStepData?.primary_contact_number || "N/A"
                      } | ${currentStepData?.primary_email_address || "N/A"}`}
                    />
                  </>
                );
              } else if (
                currentStepId === UPDATE_CORPORATION_DETAILS_FORM ||
                currentStepId === VERIFY_UPDATED_CORPORATION_DOCUMENTS
              ) {
                return (
                  <>
                    <BCaseCard
                      label="Medallion Owner Name"
                      value={currentStepData?.name || "N/A"}
                    />
                    <BCaseCard
                      label="Contact"
                      value={`${
                        currentStepData?.primary_contact_number || "N/A"
                      } | ${currentStepData?.primary_email_address || "N/A"}`}
                    />
                  </>
                );
              } else if (
                currentStepId === "111" ||
                currentStepId === UPDATE_MEDALLION_DETAIL ||
                currentStepId === "119" ||
                currentStepId === ENTER_STORAGE_DETAILS ||
                currentStepId === UPLOAD_MEDALLION_RENEWAL_PROOF
              ) {
                return (
                  <>
                    <BCaseCard
                      label="Medallion Owner Name"
                      value={currentStepData?.medallion_owner_name || "N/A"}
                    />
                    <BCaseCard
                      label="Medallion Number"
                      value={currentStepData?.medallion_number || "N/A"}
                    />
                    <BCaseCard
                      label="Expiration Date"
                      value={
                        dateMonthYear(
                          currentStepData?.medallion_lease?.contract_end_date
                        ) || "N/A"
                      }
                    />
                    <BCaseCard
                      label="Medallion Type"
                      value={currentStepData?.medallion_type || "N/A"}
                    />
                    <BCaseCard
                      label="Contact"
                      value={`${
                        currentStepData?.primary_contact_nember || "N/A"
                      } | ${currentStepData?.primary_email_address || "N/A"}`}
                    />
                  </>
                );
              } else if (
                currentStepId === UPLOAD_STORAGE_DOCUMENTS ||
                currentStepId === VERIFY_MEDALLION_STORAGE_DOCUMENTS
              ) {
                return (
                  <>
                    <BCaseCard
                      label="Medallion Owner Name"
                      value={
                        currentStepData?.medallion_details?.medallion_owner ||
                        "N/A"
                      }
                    />
                    <BCaseCard
                      label="Medallion Number"
                      value={
                        currentStepData?.medallion_details?.medallion_number ||
                        "N/A"
                      }
                    />
                    <BCaseCard
                      label="Expiration Date"
                      value={
                        dateMonthYear(
                          currentStepData?.medallion_details?.contract_end_date
                        ) || "N/A"
                      }
                    />
                    <BCaseCard
                      label="Medallion Type"
                      value={
                        currentStepData?.medallion_details?.medallion_type ||
                        "N/A"
                      }
                    />
                    <BCaseCard
                      label="Contact"
                      value={`${
                        currentStepData?.medallion_details
                          ?.primary_contact_number || "N/A"
                      } | ${
                        currentStepData?.medallion_details
                          ?.primary_email_address || "N/A"
                      }`}
                    />
                  </>
                );
              }
              return (
                <>
                  <BCaseCard
                    label="Medallion Owner Name"
                    value={currentStepData?.medallion_owner_name || "N/A"}
                  />
                  <BCaseCard
                    label="Medallion Number"
                    value={currentStepData?.medallion_number || "N/A"}
                  />
                  <BCaseCard
                    label="Expiration Date"
                    value={
                      dateMonthYear(currentStepData?.last_renewal_date) || "N/A"
                    }
                  />
                  <BCaseCard
                    label="Medallion Type"
                    value={currentStepData?.medallion_type || "N/A"}
                  />
                  <BCaseCard
                    label="Contact"
                    value={`${
                      currentStepData?.primary_contact_nember || "N/A"
                    } | ${currentStepData?.primary_email_address || "N/A"}`}
                  />
                </>
              );
            })()}
          </div>
          <>{renderCurrentStep()}</>
        </div>
      ) : (
        <></>
      )}
    </>
  );
};

export default CaseProtected;
