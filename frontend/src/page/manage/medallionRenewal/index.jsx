import { useFormik } from "formik";
import Img from "../../../components/Img";
import { Button } from "primereact/button";
import BSuccessMessage from "../../../components/BSuccessMessage";
import { useEffect, useRef, useState } from "react";
import {
  useGetCaseDetailWithParamsQuery,
  useLazyGetStepInfoQuery,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
  useUploadDocumentMutation,
} from "../../../redux/api/medallionApi";
import { yearMonthDate } from "../../../utils/dateConverter";
import { useNavigate } from "react-router-dom";
import BModal from "../../../components/BModal";
import BUpload from "../../../components/BUpload";
import { DOCUMENT_TYPE, OBJECT_TYPE } from "../../../utils/constants";
import BAttachedFile from "../../../components/BAttachedFile";
import { useDispatch, useSelector } from "react-redux";
import BToast from "../../../components/BToast";
import { setIsUpload } from "../../../redux/slice/uploadSlice";
import BCalendar from "../../../components/BCalendar";
import BInputText from "../../../components/BInputText";
import "../../manage/_manage_medallian.scss";
import BInputNumber from "../../../components/BInputNumber";

const MedallionRenewal = ({
  caseId,
  currentStepId,
  reload,
  currentStep,
  caseData,
  hasAccess,
}) => {
  const [isOpen, setOpen] = useState(false);
  console.log("Case Data", caseData);
  const navigate = useNavigate();
  const [uploadDoc] = useUploadDocumentMutation();
  // const { data: stepInfoData } = useGetStepInfoQuery({ caseNo: caseId, step_no: currentStepId });
  const [processFlow, { isSuccess: isProcessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();

  const [isSumbitDisabled, setIsSumbitDisabled] = useState(true);
  const selectedMedallionDetail = useSelector(
    (state) => state.medallion.selectedMedallionDetail
  );
  const [medallionNumber, setMedallionNumber] = useState(
    selectedMedallionDetail?.medallion_number || ""
  );
  const queryParams = {
    caseId: caseId,
    ...(selectedMedallionDetail && {
      objectName: selectedMedallionDetail.object_name,
      objectLookup: selectedMedallionDetail.object_lookup,
    }),
  };

  const toast = useRef(null);
  const [isEditable, setIsEditable] = useState(true);

  const dispatch = useDispatch();
  const isUpload = useSelector((state) => state.upload.isUpload);
  const [triggerGetStepInfo, { data: stepInfoData, isFetching, isSuccess }] =
    useLazyGetStepInfoQuery();
  const [updatedStepData, setUpdatedStepData] = useState();
  // 🔹 Call API on page load
  useEffect(() => {
    if (caseId && currentStepId) {
      triggerGetStepInfo({ caseNo: caseId, step_no: "111" });
    }
  }, [caseId, currentStepId, triggerGetStepInfo]);

  useEffect(() => {
    if (isMoveDataSuccess) {
      setOpen(true);
    }
  }, [isMoveDataSuccess]);

  useEffect(() => {
    if (isProcessDataSuccess) {
      handleShowToast("Renewal data are updated successfully.");
      setIsSumbitDisabled(false);
      reload();
    }
  }, [isProcessDataSuccess]);

  const handleShowToast = (message) => {
    toast.current.showToast("SUCCESS", message, "success", false, 3000);
  };

  const isFormEditable = () => {
    if (caseData?.case_status !== "Closed" && currentStep?.is_current_step) {
      return true;
    }
    return false;
  };

  const completeStep = () => {
    if (isProcessDataSuccess && hasAccess) moveCase({ params: caseId });
  };

  const formik = useFormik({
    initialValues: {
      renewalDate: "",
      renewalFee: 0,
      newExpiryDate: "",
      renewalFrom: "",
      renewalTo: "",
    },
    validateOnChange: true,
    validate: (values) => {
      const errors = {};
      // const leaseExpiryDate = currentStep?.medallion_lease?.contract_end_date;
      const leaseExpiryDate = currentStep?.medallion_lease?.contract_end_date
        ? new Date(currentStep.medallion_lease.contract_end_date)
        : null;

      if (leaseExpiryDate) {
        leaseExpiryDate.setHours(0, 0, 0, 0);
      }

      if (!values.renewalDate) {
        errors.renewalDate = `Renewal Date is required`;
      } else {
        const renewalDate = new Date(values.renewalDate);
        renewalDate.setHours(0, 0, 0, 0);

        if (renewalDate <= leaseExpiryDate) {
          errors.renewalDate =
            "Renewal Date From must be greater than Lease Expiry Date";
        }
      }

      if (!values.renewalFee) {
        errors.renewalFee = `Renewal Fee is required`;
      }
      //   if (!values.newExpiryDate) {
      //     errors.newExpiryDate = `New Expiry Date is required`;
      //   }

      if (!values.renewalFrom) {
        errors.renewalFrom = `Renewal from is required`;
      } else {
        const renewalFromDate = new Date(values.renewalFrom);
        renewalFromDate.setHours(0, 0, 0, 0);
        if (renewalFromDate <= leaseExpiryDate) {
          errors.renewalFrom =
            "Renewal From Date must be greater than Lease Expiry Date";
        }
      }
      if (!values.renewalTo) {
        errors.renewalTo = `Renewal to is required`;
      } else {
        const renewalToDate = new Date(values.renewalTo);
        renewalToDate.setHours(0, 0, 0, 0);
        if (renewalToDate <= leaseExpiryDate) {
          errors.renewalTo =
            "Renewal To Date must be greater than Lease Expiry Date";
        }
        const renewalFromDate = new Date(values.renewalFrom);
        renewalFromDate.setHours(0, 0, 0, 0);
        if (renewalFromDate) {
          renewalFromDate.setHours(0, 0, 0, 0);
          if (renewalToDate <= renewalFromDate) {
            errors.renewalTo =
              "Renewal To Date must be greater than Renewal From Date";
          }
        }
      }
      console.log(errors);

      return errors;
    },
    onSubmit: (values) => {
      const data = {
        step_id: currentStepId,
        data: {
          medallion_number: medallionNumber,
          renewal_date: yearMonthDate(values.renewalDate),
          renewal_fee: parseFloat(values.renewalFee) || 0,
          new_expiry_date: yearMonthDate(values?.renewalDate),
          renewal_from: yearMonthDate(values.renewalFrom),
          renewal_to: yearMonthDate(values.renewalTo),
        },
      };
      if (hasAccess) {
        processFlow({ params: caseId, data: data });
      }
    },
  });

  useEffect(() => {
    setIsEditable(isFormEditable());
    if (currentStep && !isUpload) {
      const leaseEndDate = currentStep?.medallion_lease?.contract_end_date
        ? new Date(currentStep.medallion_lease.contract_end_date)
        : null;

      let renewalDate = currentStep?.renewal_date
        ? new Date(currentStep.renewal_date)
        : null;
      let renewalFrom = currentStep?.renewal_from
        ? new Date(currentStep.renewal_from)
        : null;
      let renewalTo = currentStep?.renewal_to
        ? new Date(currentStep.renewal_to)
        : null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (leaseEndDate) {
        leaseEndDate.setHours(0, 0, 0, 0);

        const nextDay = new Date(leaseEndDate);
        nextDay.setDate(nextDay.getDate() + 1);

        // Renewal Date
        if (renewalDate && renewalDate > leaseEndDate) {
          formik.setFieldValue("renewalDate", renewalDate);
        } else {
          formik.setFieldValue("renewalDate", nextDay);
        }

        // Renewal From
        if (renewalFrom && renewalFrom > leaseEndDate) {
          formik.setFieldValue("renewalFrom", renewalFrom);
        } else {
          formik.setFieldValue("renewalFrom", nextDay);
        }

        // Renewal To
        if (renewalTo) {
          formik.setFieldValue("renewalTo", renewalTo);
        }
      } else {
        // No lease → set to today's date
        formik.setFieldValue("renewalDate", today);
        formik.setFieldValue("renewalFrom", today);

        if (renewalTo) {
          formik.setFieldValue("renewalTo", renewalTo);
        }
      }

      // formik.setFieldValue("renewalFee", currentStep?.renewal_fee || 0);
      formik.setFieldValue(
        "renewalFee",
        currentStep?.renewal_fee !== null &&
          currentStep?.renewal_fee !== undefined
          ? currentStep?.renewal_fee
          : formik.values.renewalFee // preserve what user had
      );

      if (currentStep?.medallion_number) {
        setMedallionNumber(currentStep?.medallion_number);
      }
    }
    // dispatch(setIsUpload(false));
  }, [currentStep]);

  // useEffect(() => {
  //   dispatch(setIsUpload(false));
  // }, []);

  const variable = {
    field_01: {
      id: "renewalDate",
      label: "Renewal Date",
      isRequire: true,
    },
    field_02: {
      id: "renewalFee",
      label: "Renewal Fee",
      isRequire: true,
      keyfilter: "pnum",
      min: 0,
    },
    field_03: {
      id: "renewalFrom",
      label: "Renewal From",
      isRequire: true,
    },
    field_04: {
      id: "renewalTo",
      label: "Renewal To",
      isRequire: true,
    },
  };
  // Before rendering BCalendar, compute date ranges
  const leaseExpiryDate = currentStep?.medallion_lease?.contract_end_date
    ? new Date(currentStep?.medallion_lease?.contract_end_date)
    : null;

  if (leaseExpiryDate && !isNaN(leaseExpiryDate)) {
    leaseExpiryDate.setHours(0, 0, 0, 0);
  }

  const renewalFromDate = formik.values.renewalFrom
    ? new Date(formik.values.renewalFrom)
    : null;
  if (renewalFromDate && !isNaN(renewalFromDate)) {
    renewalFromDate.setHours(0, 0, 0, 0);
  }

  return (
    <div>
      <div className="form-section">
        <div
          className="form-body"
          style={{ backgroundColor: "#EEEEEE", padding: 10 }}
        >
          <div
            className="row p-3"
            style={{ marginBottom: "4rem", marginTop: "1rem" }}
          >
            <div className="col-3 w-100-3">
              <BCalendar
                variable={variable.field_01}
                formik={formik}
                minDate={
                  leaseExpiryDate
                    ? new Date(leaseExpiryDate.getTime() + 86400000)
                    : new Date()
                }
              ></BCalendar>
            </div>
            <div className="col-3 w-100-3">
              <BInputNumber
                variable={variable.field_02}
                formik={formik}
                isCurrency={true}
              />
            </div>
          </div>
          <div className="row w-75 p-3" style={{ marginBottom: "2rem" }}>
            <div className="col-4 w-100-3">
              <BCalendar
                variable={variable.field_03}
                formik={formik}
                minDate={
                  leaseExpiryDate
                    ? new Date(leaseExpiryDate.getTime() + 86400000)
                    : new Date()
                }
              ></BCalendar>
            </div>
            <div className="col-4 w-100-3">
              <BCalendar
                variable={variable.field_04}
                formik={formik}
                minDate={
                  renewalFromDate
                    ? new Date(renewalFromDate.getTime() + 86400000)
                    : leaseExpiryDate
                    ? new Date(leaseExpiryDate.getTime() + 86400000)
                    : new Date()
                }
              ></BCalendar>
            </div>
          </div>

          {/* <div className="p-3">
            {" "}
            <BModal>
              <BModal.ToggleButton>
                <Button
                  text
                  label="Upload Renewal Receipt"
                  className="text-black gap-2"
                  type="button"
                  icon={() => <Img name="upload" />}
                />
              </BModal.ToggleButton>
              <BModal.Content>
                <BUpload
                  data={{
                    ...stepInfoData?.medallion_renewal_document,
                    notes: "demo",
                  }}
                  action={uploadDoc}
                  object_type={OBJECT_TYPE}
                  document_id={
                    stepInfoData?.medallion_renewal_document?.document_id
                  }
                  object_id={stepInfoData?.medallion_id}
                  document_type={[
                    { name: "Renewal Recepit", code: DOCUMENT_TYPE },
                  ]}
                ></BUpload>
              </BModal.Content>
            </BModal>
            {stepInfoData?.medallion_renewal_document?.document_id && (
              <BAttachedFile
                file={{
                  name: stepInfoData?.medallion_renewal_document?.document_name,
                  path: stepInfoData?.medallion_renewal_document?.presigned_url,
                  id: stepInfoData?.medallion_renewal_document?.document_id,
                  document_type:
                    stepInfoData?.medallion_renewal_document?.document_type,
                }}
              ></BAttachedFile>
            )}
          </div> */}
        </div>

        <div className="w-100 position-sticky bottom-0 py-3 bg-white d-flex justify-content-start gap-3">
          <Button
            label="Submit Renewal Details"
            type="button"
            data-testId="submit-renewal-details"
            onClick={completeStep}
            disabled={isSumbitDisabled || !hasAccess}
            severity="warning"
            className="border-radius-0 primary-btn"
          />
          <Button
            label="Save Renewal Details"
            type="button"
            data-testId="save-renewal-details"
            disabled={isEditable || !hasAccess}
            onClick={formik.handleSubmit}
            className="border-radius-0 primary-btn"
            style={{ backgroundColor: "#FFFFFF" }}
          />
        </div>
      </div>

      <BSuccessMessage
        isOpen={isOpen}
        message={`Medallion ${medallionNumber} renewed successfully`}
        title="Medallion Renewal Successful"
        onCancel={() => {
          setOpen(false);
          navigate("/manage-medallion", { replace: true });
        }}
        onConfirm={() => {
          setOpen(false);
          navigate("/manage-medallion", { replace: true });
        }}
      />
      <BToast ref={toast} position="top-right" />
    </div>
  );
};

export default MedallionRenewal;
