import { Button } from "primereact/button";
import Img from "../../components/Img";
import {
  getOptionsByIdFromVariable,
  vehicleDeliveryDetail,
  vehicleDeliveryDetailUpdate,
} from "../../utils/variables.js";
import BCaseCard from "../../components/BCaseCard";
import {
  useGetStepInfoQuery,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../redux/api/medallionApi";
import { useEffect, useState } from "react";
import BInputFields from "../../components/BInputFileds";
import { useFormik } from "formik";
import { yearMonthDate } from "../../utils/dateConverter.js";
import { getCurrentStep } from "../../utils/caseUtils.js";
import BSuccessMessage from "../../components/BSuccessMessage.jsx";
import { useNavigate } from "react-router-dom";
import { DELIVERY_VEHICLE_INFO } from "../../utils/constants.js";

const VehicleDeliveryDetails = ({
  caseId,
  caseData,
  reload,
  currentStepId,
  currentStep,
  hasAccess,
}) => {
  console.log("VehicleDeliveryDetails", caseData, currentStep);
  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();
  const [processFlow, { isSuccess: isProccessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [isOpen, setOpen] = useState(false);
  const navigate = useNavigate();

  const variable = currentStepId === DELIVERY_VEHICLE_INFO ? vehicleDeliveryDetailUpdate : vehicleDeliveryDetail
  const {
    data: stepInfoData,
    refetch,
    isSuccess,
  } = useGetStepInfoQuery(
    { caseNo: caseId, step_no: currentStepId },
    { skip: !currentStepId || !caseId }
  );

  const formik = useFormik({
    initialValues: {
      [variable?.[0].id]: "",
      [variable?.[1].id]: "",
    },
    validateOnChange: true,
    validate: (values) => {
      const errors = {};
      if (!values.delivery_location) {
        errors["delivery_location"] = `${variable[1].label} is required`;
      }

      if (currentStepId === DELIVERY_VEHICLE_INFO && !values?.expected_delivery_date) {
        errors["expected_delivery_date"] = `${variable[0].label} is required`;
      }
      // if (!values.cameraType) {
      //   errors[
      //     "cameraType"
      //   ] = `${vehicleDeliveryHackUpDetail[0].label} is required`;
      // }

      // if (!values.cameraLocation) {
      //   errors[
      //     "cameraLocation"
      //   ] = `${vehicleDeliveryHackUpDetail[1].label} is required`;
      // }

      // if (!values.meterType) {
      //   errors[
      //     "meterType"
      //   ] = `${vehicleDeliveryHackUpDetail[2].label} is required`;
      // }

      // if (!values.meterLocation) {
      //   errors[
      //     "meterLocation"
      //   ] = `${vehicleDeliveryHackUpDetail[3].label} is required`;
      // }

      // if (!values.roofTopType) {
      //   errors[
      //     "roofTopType"
      //   ] = `${vehicleDeliveryHackUpDetail[4].label} is required`;
      // }

      // if (!values.roofTopLocation) {
      //   errors[
      //     "roofTopLocation"
      //   ] = `${vehicleDeliveryHackUpDetail[5].label} is required`;
      // }

      // if (!values.dmvRegLocation) {
      //   errors[
      //     "dmvRegLocation"
      //   ] = `${vehicleDeliveryHackUpDetail[6].label} is required`;
      // }

      // if (!values.tlcInspectionLocation) {
      //   errors[
      //     "tlcInspectionLocation"
      //   ] = `${vehicleDeliveryHackUpDetail[7].label} is required`;
      // }

      return errors;
    },
    onSubmit: (values) => {
      if (hasAccess) {

        const baseData = {
          expected_delivery_date: yearMonthDate(values?.expected_delivery_date),
          delivery_location: values?.delivery_location?.code,
          delivery_note: values?.note,
        };

        const data =
          currentStepId === DELIVERY_VEHICLE_INFO
            ? { ...baseData, vin: currentStep?.vehicle?.vin, is_delivered: true, delivery_date: yearMonthDate(values?.expected_delivery_date) }
            : baseData;

        console.log("xxx data : ", data)
        processFlow({
          params: caseId,
          data: {
            step_id: currentStepId,
            data,
          },
        });
      }
    },
  });

  useEffect(() => {
    if (isMoveDataSuccess) {
      setOpen(true);
    }
  }, [isMoveDataSuccess]);

  useEffect(() => {
    if (isProccessDataSuccess) {
      refetch();
    }
    if (
      isProccessDataSuccess &&
      caseData &&
      caseData.case_info.case_status !== "Closed" &&
      getCurrentStep(caseData.steps).step_id === currentStepId &&
      hasAccess
    ) {
      moveCase({ params: caseId })
        .unwrap()
        .then(() => {
          reload();
        });
    }
  }, [isProccessDataSuccess]);

  useEffect(() => {
    if (!isSuccess) return;

    const stepData =
      currentStepId === DELIVERY_VEHICLE_INFO
        ? stepInfoData?.delivery_details
        : stepInfoData?.vehicle_delivery_details;

    if (!stepData) return;

    const deliveryDate = stepData?.expected_delivery_date
      ? new Date(stepData.expected_delivery_date)
      : "";

    const options = getOptionsByIdFromVariable(variable, "delivery_location");
    const option =
      options?.find((item) => item?.code === stepData?.delivery_location) || "";

    formik.setFieldValue(variable?.[0]?.id, deliveryDate, false);
    formik.setFieldValue(variable?.[1]?.id, option, false);
    formik.setFieldValue(variable?.[2]?.id, stepData?.delivery_note || "", false);

  }, [isSuccess, stepInfoData, currentStepId]);


  return (
    <>
      <div className="topic-txt d-flex align-items-center gap-2">
        <Img name="document" className="icon-black"></Img>Vehicle Delivery
        Details
      </div>
      {currentStepId === DELIVERY_VEHICLE_INFO ?
        <>
          <div className="d-flex align-items-center gap-5 py-4 ">

            <BCaseCard
              label="VIN No"
              value={currentStep?.vehicle?.vin}
            />
            <BCaseCard
              label="Vehicle"
              value={currentStep?.vehicle?.make + " " + currentStep?.vehicle?.model + " " + currentStep?.vehicle?.year}
            />
            <BCaseCard
              label="Vehicle Type"
              value={currentStep?.vehicle?.vehicle_type}
            />
            <BCaseCard
              label="Plate Number"
              value={currentStep?.vehicle?.plate_number}
            />


          </div>
        </> :

        <>
          <div className="d-flex align-items-center gap-5 py-4 ">
            <BCaseCard
              label="Entity Name "
              value={currentStep?.vehicle_details?.vehicle?.entity_name}
            />
            <BCaseCard
              label="VIN No"
              value={currentStep?.vehicle_details?.vehicle?.vin}
            />
            <BCaseCard
              label="Vehicle Make"
              value={currentStep?.vehicle_details?.vehicle?.make}
            />
            <BCaseCard
              label="Model"
              value={currentStep?.vehicle_details?.vehicle?.model}
            />
            <BCaseCard
              label="Year"
              value={currentStep?.vehicle_details?.vehicle?.year}
            />
            <BCaseCard
              label="Vehicle Type"
              value={currentStep?.vehicle_details?.vehicle?.vehicle_type}
            />
          </div>
        </>

      }

      <form
        action=""
        className="common-form d-flex flex-column gap-5"
        onSubmit={formik.handleSubmit}
      >
        <div className="form-section">
          <div className="form-body">
            <div
              className="d-flex align-items-center flex-wrap form-grid-1 w-100 p-2"
              style={{ rowGap: "4rem", gap: "4rem 1rem" }}
            >
              {variable.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    rowGap: "4rem", gap: "4rem 1rem",
                  }}
                >
                  <BInputFields variable={item} formik={formik} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* <div className="form-section">
          <div className="form-body">
            <div
              className="d-flex align-items-center flex-wrap form-grid-1 w-75 p-2"
              style={{ rowGap: "4rem", gap: "4rem 1rem" }}
            >
              {vehicleDeliveryHackUpDetail.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    ...(item.size === "xl" && { width: "100%" }),
                  }}
                >
                  <BInputFields variable={item} formik={formik} />
                </div>
              ))}
            </div>
          </div>
        </div> */}

        <div className="w-100 position-sticky bottom-0 py-3 bg-white">
          <Button
            disabled={!hasAccess || !formik.isValid}
            label="Submit Vehicle Delivery Details"
            type="submit"
            severity="warning"
            className="border-radius-0 primary-btn "
          />
        </div>
      </form>

      <BSuccessMessage
        isOpen={isOpen}
        message={currentStepId === DELIVERY_VEHICLE_INFO ? `VIN : ${stepInfoData?.vehicle?.vin}` : `Vehicle Registration is successful and approved against VIN No ${stepInfoData?.vehicle_details?.vehicle?.vin}`}
        title={currentStepId === DELIVERY_VEHICLE_INFO ? "Vehicle Delivery Marked Successfully" : "Verified and Approved Successfully"}
        onCancel={() => {
          setOpen(false);
          navigate("/manage-vehicle", { replace: true });
        }}
        onConfirm={() => {
          setOpen(false);
          navigate("/manage-vehicle", { replace: true });
        }}
      ></BSuccessMessage>
      {/* <BConfirmModal
            isOpen={isOpen}
            title='Confirmation on Delete Medallion'
            message="Are you sure to delete the selected Medallion?"
            onCancel={() => { setDeleteDocId(); setOpen(false) }}
            onConfirm={() => {
              setOpen(false);
              proccedDelete();
            }}
            {...{ iconName: 'red-delete' }}
          ></BConfirmModal>
          <BToast ref={toast} position='top-right' /> */}
    </>
  );
};

export default VehicleDeliveryDetails;
