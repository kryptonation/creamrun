import { Button } from "primereact/button";
import {
  getOptionsByIdFromVariable,
  vechileHackup1 as variable,
  registerVechile as variable1,
  vechileHackup1
} from "../../../utils/variables";
import BInputFields from "../../../components/BInputFileds";
import { useFormik } from "formik";
import { yearMonthDate } from "../../../utils/dateConverter";
import {
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../../redux/api/medallionApi";
import { useCallback, useEffect } from "react";
import { getCurrentStep } from "../../../utils/caseUtils";
import { useDispatch, useSelector } from "react-redux";
import { setIsUpload } from "../../../redux/slice/uploadSlice";
import Img from "../../../components/Img";
import BModal from "../../../components/BModal";
import { Badge } from "primereact/badge";
import BUpload from "../../../components/BUpload";

const HackUp = ({
  caseId,
  currentStepId,
  reload,
  currentStep,
  caseData,
  hasAccess,
}) => {
  const [processFlow, { isSuccess: isProccessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();

  const formik = useFormik({
    initialValues: {
      tpep_provider: { name: "Crub", code: "crub" },
      configuration_type: { name: "Camera", code: "Camera" },
      paint: [],
      paintCompletedDate: "",
      paintInvoice: 0,
      camera: [],
      cameraType: "",
      cameraInstalledDate: "",
      cameraInstalledInvoice: 0,
      meter: [],
      meterType: "",
      meterInstalledDate: "",
      meterSerialNo: "",
      meterInstalledInvoice: 0,
      rooftop: [],
      roofTopType: "",
      roofTopInstalledDate: "",
      rooftopInvoice: 0,
      partition: [],
      partitionType: "",
      partitionInstalledDate: "",
      partitionInstalledInvoice: 0,
      registrationDate: "",
      registrationExpiryDate: "",
      registrationFee: 0,
      plateNumber: "",
      registrationCertificate: "",
      registrationFeeDocument: "",
    },
    validateOnChange: true,
    validate: (values) => {
      const errors = {};
      if (values["paint"] && values["paint"].includes("Yes")) {
        if (!values.paintCompletedDate) {
          errors["paintCompletedDate"] = `Paint Completed Date is required`;
        }
      }

      if (values["rooftop"] && values["rooftop"].includes("Yes")) {
        if (!values.roofTopInstalledDate) {
          errors["roofTopInstalledDate"] = `Rooftop Installed Date is required`;
        }

        if (!values.roofTopType) {
          errors["roofTopType"] = `Rooftop Type is required`;
        }
      }

      if (values["configuration_type"].code === "Camera") {
        if (values["camera"] && values["camera"].includes("Yes")) {
          if (!values.cameraInstalledDate) {
            errors["cameraInstalledDate"] = `Camera Installed Date is required`;
          }

          if (!values.cameraType) {
            errors["cameraType"] = `Camera Type is required`;
          }
        }
      } else if (values["configuration_type"].code === "Partition") {
        if (values["partition"] && values["partition"].includes("Yes")) {
          if (!values.partitionInstalledDate) {
            errors[
              "partitionInstalledDate"
            ] = `Partition Installed Date is required`;
          }

          if (!values.partitionType) {
            errors["partitionType"] = `Partition Type is required`;
          }
        }
      }

      if (values["meter"] && values["meter"].includes("Yes")) {
        if (!values.meterInstalledDate) {
          errors["meterInstalledDate"] = `Meter Installed Date is required`;
        }

        if (!values.meterType) {
          errors["meterType"] = `Meter Type is required`;
        }
        if (values.meterSerialNo == undefined || values.meterSerialNo == null || values.meterSerialNo == "") {
          errors["meterSerialNo"] = `Meter Serial No is required`;
        }
      }

      if (!values.registrationDate) {
        errors["registrationDate"] = `Registration Date is required`;
      }
      if (!values.registrationExpiryDate) {
        errors[
          "registrationExpiryDate"
        ] = `Registration Expiry Date is required`;
      }

      return errors;
    },
    onSubmit: () => {
      const formikValues = formik?.values;

      const hackupDetails = {
        tpep_provider: formikValues.tpep_provider?.code || "",
        configuration_type: formikValues.configuration_type?.code || "",
        paint_completed_date: formikValues.paintCompletedDate
          ? yearMonthDate(formikValues.paintCompletedDate)
          : "",
        camera_type: formikValues.cameraType?.code || "",
        camera_installed_date: formikValues.cameraInstalledDate
          ? yearMonthDate(formikValues.cameraInstalledDate)
          : "",
        meter_installed_date: formikValues.meterInstalledDate
          ? yearMonthDate(formikValues.meterInstalledDate)
          : "",
        meter_type: formikValues.meterType?.code || "",
        meter_serial_number: formikValues.meterSerialNo || "",
        rooftop_type: formikValues.roofTopType?.code || "",
        rooftop_installed_date: formikValues.roofTopInstalledDate
          ? yearMonthDate(formikValues.roofTopInstalledDate)
          : "",
        rooftop_installation_charges: Number(formikValues.rooftopInvoice) || 0,
        meter_installed_charges:
          Number(formikValues.meterInstalledInvoice) || 0,
        camera_installed_charges:
          Number(formikValues.cameraInstalledInvoice) || 0,
        paint_completed_charges: Number(formikValues.paintInvoice) || 0,
        partition_type: formikValues.partitionType?.code || "",
        partition_installed_date: formikValues.partitionInstalledDate
          ? yearMonthDate(formikValues.partitionInstalledDate)
          : "",
        partition_installed_charges:
          Number(formikValues.partitionInstalledInvoice) || 0,

        is_paint_completed: formikValues.paint.length > 0 ? true : false,
        is_rooftop_installed: formikValues.rooftop.length > 0 ? true : false,
        is_meter_installed: formikValues.meter.length > 0 ? true : false,
        is_camera_installed: formikValues.camera.length > 0 ? true : false,
        is_partition_installed:
          formikValues.partition.length > 0 ? true : false,
      };

      const vehicleRegisterDetails = {
        registration_date: formikValues.registrationDate
          ? yearMonthDate(formikValues.registrationDate)
          : "",
        registration_expiry_date: formikValues.registrationExpiryDate
          ? yearMonthDate(formikValues.registrationExpiryDate)
          : "",
        registration_fee: formikValues.registrationFee || 0,
        plate_number: formikValues.plateNumber || "",
      };
      const vechileDetails = {
        vin: currentStep?.vehicle_info.vin || "",
        hackup_details: hackupDetails,
        vehicle_register_details: vehicleRegisterDetails,
      };

      const data = {
        step_id: currentStepId,
        data: vechileDetails,
      };
      if (hasAccess) processFlow({ params: caseId, data: data });
    },
  });

  const dispatch = useDispatch();
  const isUpload = useSelector((state) => state.upload.isUpload);

  useEffect(() => {
    if (currentStep && !isUpload) {
      const options = getOptionsByIdFromVariable(
        vechileHackup1,
        "tpep_provider"
      );
      const option = options?.filter(
        (item) => item?.code === currentStep?.hackup_info.tpep_provider
      );
      formik.setFieldValue(
        "tpep_provider",
        option.length ? option[0] : { name: "Crub", code: "crub" },
        false
      );

      const configOptions = getOptionsByIdFromVariable(
        vechileHackup1,
        "configuration_type"
      );
      const configOption = configOptions?.filter(
        (item) => item?.code === currentStep?.hackup_info.configuration_type
      );
      formik.setFieldValue(
        "configuration_type",
        configOption.length
          ? configOption[0]
          : { name: "Camera", code: "Camera" },
        false
      );

      const isPaintCompleted = currentStep?.hackup_info.is_paint_completed;
      const paintValue =
        isPaintCompleted === "" || isPaintCompleted === true
          ? ["Yes"]
          : [];
      formik.setFieldValue("paint", paintValue, false);

      const isCameraInstalled = currentStep?.hackup_info.is_camera_installed;
      formik.setFieldValue(
        "camera",
        isCameraInstalled === undefined || isCameraInstalled === true
          ? ["Yes"]
          : [],
        false
      );

      const isPartitionInstalled =
        currentStep?.hackup_info.is_partition_installed;
      formik.setFieldValue(
        "partition",
        isPartitionInstalled === undefined || isPartitionInstalled === true
          ? ["Yes"]
          : [],
        false
      );

      const isMeterInstalled = currentStep?.hackup_info.is_meter_installed;
      formik.setFieldValue(
        "meter",
        isMeterInstalled === undefined || isMeterInstalled === true
          ? ["Yes"]
          : [],
        false
      );

      const isRooftopInstalled = currentStep?.hackup_info.is_rooftop_installed;
      formik.setFieldValue(
        "rooftop",
        isRooftopInstalled === undefined || isRooftopInstalled === true
          ? ["Yes"]
          : [],
        false
      );

      formik.setFieldValue(
        "paintCompletedDate",
        currentStep?.hackup_info.paint_completed_date
          ? new Date(currentStep?.hackup_info.paint_completed_date)
          : "",
        false
      );

      const cameraOptions = getOptionsByIdFromVariable(
        vechileHackup1,
        "cameraType"
      );
      const cameraOption = cameraOptions?.filter(
        (item) => item?.code === currentStep?.hackup_info.camera_type
      );
      formik.setFieldValue(
        "cameraType",
        cameraOption.length ? cameraOption[0] : "",
        false
      );

      const partitionOptions = getOptionsByIdFromVariable(
        vechileHackup1,
        "partitionType"
      );
      const partitionOption = partitionOptions?.filter(
        (item) => item?.code === currentStep?.hackup_info.partition_type
      );
      formik.setFieldValue(
        "partitionType",
        partitionOption.length ? partitionOption[0] : "",
        false
      );

      const meterOptions = getOptionsByIdFromVariable(
        vechileHackup1,
        "meterType"
      );
      const meterOption = meterOptions?.filter(
        (item) => item?.code === currentStep?.hackup_info.meter_type
      );
      formik.setFieldValue(
        "meterType",
        meterOption.length ? meterOption[0] : "",
        false
      );

      const roofTopOptions = getOptionsByIdFromVariable(
        vechileHackup1,
        "roofTopType"
      );
      const roofTopOption = roofTopOptions?.filter(
        (item) => item?.code === currentStep?.hackup_info.rooftop_type
      );
      formik.setFieldValue(
        "roofTopType",
        roofTopOption.length ? roofTopOption[0] : "",
        false
      );

      formik.setFieldValue(
        "cameraInstalledDate",
        currentStep?.hackup_info.camera_installed_date
          ? new Date(currentStep?.hackup_info.camera_installed_date)
          : "",
        false
      );

      formik.setFieldValue(
        "meterInstalledDate",
        currentStep?.hackup_info.meter_installed_date
          ? new Date(currentStep?.hackup_info.meter_installed_date)
          : "",
        false
      );
      formik.setFieldValue(
        "meterSerialNo",
        currentStep?.hackup_info.meter_serial_number || 0,
        false
      );

      formik.setFieldValue(
        "roofTopInstalledDate",
        currentStep?.hackup_info.rooftop_installed_date
          ? new Date(currentStep?.hackup_info.rooftop_installed_date)
          : "",
        false
      );

      formik.setFieldValue(
        "partitionInstalledDate",
        currentStep?.hackup_info.partition_installed_date
          ? new Date(currentStep?.hackup_info.partition_installed_date)
          : "",
        false
      );

      formik.setFieldValue(
        "registrationDate",
        currentStep?.register_info.registration_date
          ? new Date(currentStep?.register_info.registration_date)
          : "",
        false
      );
      formik.setFieldValue(
        "registrationExpiryDate",
        currentStep?.register_info.registration_expiry_date
          ? new Date(currentStep?.register_info.registration_expiry_date)
          : "",
        false
      );
      formik.setFieldValue(
        "registrationFee",
        currentStep?.register_info.registration_fee || 0,
        false
      );
      formik.setFieldValue(
        "plateNumber",
        currentStep?.register_info.plate_number || 0,
        false
      );
    }
    dispatch(setIsUpload(false));
  }, [currentStep]);

  useEffect(() => {
    dispatch(setIsUpload(false));
  }, []);

  const getDocumentDetails = useCallback((item) => {
    console.log(currentStep, currentStep?.documents?.register_document);

    if (item.id === "uploadRegistrationCertificate") {
      return {
        badge_value: currentStep?.documents?.register_document?.document_id
          ? "1"
          : "0",
        data: {
          ...currentStep?.documents?.register_document,
          notes: "Vehicle Registration Document",
        },
        document_type: [
          {
            name: "Vehicle Registration Document",
            code: currentStep?.documents?.register_document?.document_type,
          },
        ],
        object_type:
          currentStep?.documents?.register_document?.document_object_type,
        object_id:
          currentStep?.documents?.register_document?.document_object_id,
      };
    } else if (item.id === "registrationFee") {
      return {
        badge_value: currentStep?.documents?.registration_fee_document?.document_id
          ? "1"
          : "0",
        data: {
          ...currentStep?.documents?.registration_fee_document,
          notes: "Vehicle Registration Fee",
        },
        document_type: [
          {
            name: "Vehicle Registration Fee",
            code: currentStep?.documents?.registration_fee_document?.document_type,
          },
        ],
        object_type:
          currentStep?.documents?.registration_fee_document?.document_object_type,
        object_id: currentStep?.documents?.registration_fee_document?.document_object_id,
      };
    }
  }, [currentStep]);

  useEffect(() => {
    if (isMoveDataSuccess) {
      reload();
    }
  }, [isMoveDataSuccess]);

  useEffect(() => {
    if (isProccessDataSuccess) {
      // toast.current.showToast('Success', "Driver information successfully Saved.", 'success', false, 10000);
    }
    if (
      hasAccess &&
      isProccessDataSuccess &&
      caseData &&
      caseData.case_info.case_status !== "Closed" &&
      getCurrentStep(caseData.steps).step_id === currentStepId
    ) {
      moveCase({ params: caseId });
    }
  }, [isProccessDataSuccess]);

  //   const getFile = (item) => {
  //     let upload = {}
  //     if (item.id === 'uploadMeterInspectionReport') {
  //         upload = {
  //             badge_value: currentStep?.meter_inspection_report_document?.document_id ? '1' : '0',
  //             data: currentStep?.meter_inspection_report_document,
  //             object_type: currentStep?.meter_inspection_report_document?.document_object_type,
  //             object_id: currentStep?.meter_inspection_report_document?.document_object_id,
  //             document_id: currentStep?.meter_inspection_report_document?.document_id,
  //             document_type: [{ name: 'Meter Inspection Report Document', code: currentStep?.meter_inspection_report_document?.document_type }],
  //         }
  //     } else if (item.id === 'uploadRateCard') {
  //         upload = {
  //             badge_value: currentStep?.rate_card_document?.document_id ? '1' : '0',
  //             data: currentStep?.rate_card_document,
  //             object_type: currentStep?.rate_card_document?.document_object_type,
  //             object_id: currentStep?.rate_card_document?.document_object_id,
  //             document_id: currentStep?.rate_card_document?.document_id,
  //             document_type: [{ name: 'Rate Card Document', code: currentStep?.rate_card_document?.document_type }],
  //         }
  //     } else if (item.id === 'uploadInspectionReceipt') {
  //         upload = {
  //             badge_value: currentStep?.inspection_receipt_document?.document_id ? '1' : '0',
  //             data: currentStep?.inspection_receipt_document,
  //             object_type: currentStep?.inspection_receipt_document?.document_object_type,
  //             object_id: currentStep?.inspection_receipt_document?.document_object_id,
  //             document_id: currentStep?.inspection_receipt_document?.document_id,
  //             document_type: [{ name: 'Inspection Receipt Document', code: currentStep?.inspection_receipt_document?.document_type }],
  //         }
  //     }
  //     return upload
  // }

  return (
    <div>
      <form
        className="common-form d-flex flex-column gap-5 mt-2"
        onSubmit={formik.handleSubmit}
      >
        <div className="form-section">
          <div
            className="d-flex align-items-center
                                 justify-content-between form-sec-header"
          >
            <div className="topic">
              <Img name="hack_up"></Img> Entity Details
            </div>
          </div>
          <div className="form-body d-flex align-items-center flex-wrap gap-4">
            {variable.map((child, index) => (
              <>
                {index === 1 && <label className="w-100">Completed</label>}
                {!(
                  (!formik?.values.configuration_type?.code && index === 3) ||
                  (formik?.values.configuration_type?.code === "Camera" && index === 3) ||
                  (formik?.values.configuration_type?.code === "Partition" && index === 2)
                ) && (
                    <div key={index} className="w-100" style={{ marginTop: 5 }}>
                      <div className="d-flex align-items-center flex-wrap gap-3 w-100  mt-3">
                        {child.map((item, idx) => (
                          <div
                            key={idx}
                            className="hack-up-fields"
                            style={{
                              ...(item.size === "xl" && { width: "100%" }),
                            }}
                          >
                            <BInputFields variable={item} formik={formik} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </>
            ))}
          </div>
        </div>
        <div className="form-section">
          <div
            className="d-flex align-items-center
                                 justify-content-between form-sec-header"
          >
            <div className="topic">
              <Img name="vehicle"></Img> Registered Vehicle Details
            </div>
          </div>
          <div className="form-body d-flex align-items-center flex-wrap gap-4">
            {variable1.map((item, idx) => (
              <div
                key={idx}
                className="d-flex align-items-center flex-wrap gap-3 mt-4 w-25"
              >
                <BInputFields variable={item} formik={formik} />

              </div>
            ))}
          </div>
        </div>
        <div className="w-100 position-sticky bottom-0 py-3 bg-white">
          <Button
            disabled={!hasAccess}
            label="Submit Hack Details"
            severity="warning"
            type="submit"
            className="border-radius-0 primary-btn"
          />
        </div>
      </form>
    </div>
  );
};

export default HackUp;
