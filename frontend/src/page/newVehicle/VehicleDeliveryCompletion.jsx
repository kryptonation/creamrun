import { Button } from "primereact/button";
import Img from "../../components/Img";
import { useFormik } from "formik";
import { vehicleDeliveryCompletion as variable } from "../../utils/variables";
import {
  useGetStepInfoQuery,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../redux/api/medallionApi";
import { useEffect, useState } from "react";
import { yearMonthDate } from "../../utils/dateConverter";
import { getCurrentStep } from "../../utils/caseUtils";
import BInputFields from "../../components/BInputFileds";
import BSuccessMessage from "../../components/BSuccessMessage";
import { useNavigate } from "react-router-dom";
import BCaseCard from "../../components/BCaseCard";
import BModal from "../../components/BModal";
import BUpload from "../../components/BUpload";
import BAttachedFile from "../../components/BAttachedFile";
import BRadio from "../../components/BRadio";
import BCalendar from "../../components/BCalendar";
import BInputText from "../../components/BInputText";

const VehicleDeliveryCompletion = ({
  caseId,
  caseData,
  currentStepId,
  hasAccess,
}) => {
  const [processFlow, { isSuccess: isProccessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();
  const { data: stepInfoData } = useGetStepInfoQuery({
    caseNo: caseId,
    step_no: currentStepId,
  });
  const [isOpen, setOpen] = useState(false);
  const [activeUpload, setActiveUpload] = useState(false);
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: {
      [variable?.[0].id]: false,
      [variable?.[1].id]: false,
      [variable?.[2].id]: "",
    },
    validateOnChange: true,
    validate: () => {
      const errors = {};
      // if (!values[variable[0].id]) {
      //     errors[variable[0].id] = `${variable[0].label} is required`;
      // }
      // if (!values[variable[1].id]) {
      //     errors[variable[1].id] = `${variable[1].label} is required`;
      // }
      // if (!values[variable[2].id]) {
      //     errors[variable[2].id] = `${variable[2].label} is required`;
      // }
      return errors;
    },
    onSubmit: (values) => {
      let payload = {
        is_delivered: values.is_delivered,
        is_insurance_procured: values.is_insurance_procured,
        tlc_hackup_inspection_date: yearMonthDate(
          values?.tlc_hackup_inspection_date
        ),
      };
      if (!values.is_delivered) {
        payload = {
          ...payload,
          delay_reason: values?.notes,
        };
      }
      console.log(payload);

      if (hasAccess) {
        processFlow({
          params: caseId,
          data: {
            step_id: currentStepId,
            data: payload,
          },
        });
      }
    },
  });

  useEffect(() => {
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

  useEffect(() => {
    if (isMoveDataSuccess) {
      setOpen(true);
    }
  }, [isMoveDataSuccess]);

  useEffect(() => {
    if (formik.values[variable?.[1].id] === true) {
      setActiveUpload(true);
    } else {
      setActiveUpload(false);
    }
  }, [formik.values[variable?.[1].id]]);

  const getFile = () => {
    let upload = {
      data: stepInfoData?.vehicle_completion_details?.insurance_document,
      object_type: "vehicle",
      object_id: stepInfoData?.vehicle_details?.vehicle?.id,
      document_id: 0,
      document_type: [{ name: "Insurance Reciept", code: "insurance_reciept" }],
    };
    return upload;
  };
  return (
    <div>
      <div className="topic-txt d-flex align-items-center gap-2">
        <Img name="document" className="icon-black"></Img>Vehicle Delivery
        Completion
      </div>
      <div className="d-flex align-items-center gap-5 py-4 ">
        <BCaseCard
          label="Entity Name "
          value={stepInfoData?.vehicle_details?.vehicle?.entity_name}
        />
        <BCaseCard
          label="VIN No"
          value={stepInfoData?.vehicle_details?.vehicle?.vin}
        />
        <BCaseCard
          label="Vehicle Make"
          value={stepInfoData?.vehicle_details?.vehicle?.make}
        />
        <BCaseCard
          label="Model"
          value={stepInfoData?.vehicle_details?.vehicle?.model}
        />
        <BCaseCard
          label="Year"
          value={stepInfoData?.vehicle_details?.vehicle?.year}
        />
        <BCaseCard
          label="Vehicle Type"
          value={stepInfoData?.vehicle_details?.vehicle?.vehicle_type}
        />
      </div>
      <form
        action=""
        className="common-form d-flex flex-column gap-5"
        onSubmit={formik.handleSubmit}
      >
        <div className="form-section">
          <div className="d-flex align-items-center justify-content-between form-sec-header">
            <div className="topic">
              <Img name="search"></Img> Vehicle Delivery Completion
            </div>
          </div>
          <div className="form-body">
            <div className="p-3">
              <div
                className="d-flex row align-items-center"
                style={{ marginBottom: "3rem" }}
              >
                <div className="col-md-4">
                  <BRadio
                    variable={variable[0]}
                    formik={formik}
                    isRequire={false}
                  ></BRadio>
                </div>
                {formik.values.is_delivered === false && (
                  <div className="col-md-4">
                    <BInputText
                      variable={variable[3]}
                      formik={formik}
                      isRequire={false}
                    ></BInputText>
                  </div>
                )}
              </div>
              <div
                className="d-flex row align-items-center"
                style={{ marginBottom: "3rem" }}
              >
                <div className="col-md-4">
                  <BRadio
                    variable={variable[1]}
                    formik={formik}
                    isRequire={false}
                  ></BRadio>
                </div>
                <div className="col-md-4">
                  {activeUpload && (
                    <div className="w-100">
                      <BModal>
                        <BModal.ToggleButton>
                          <Button
                            text
                            label={"Upload Document"}
                            data-testid="upload-documents"
                            className="text-grey gap-2 ms-auto"
                            type="button"
                            icon={() => <Img name="upload" />}
                          />
                        </BModal.ToggleButton>
                        <BModal.Content>
                          <BUpload {...getFile("Upload Document")}></BUpload>
                        </BModal.Content>
                      </BModal>
                      {stepInfoData?.vehicle_completion_details
                        ?.insurance_document?.document_name && (
                        <BAttachedFile
                          file={{
                            name: stepInfoData?.vehicle_completion_details
                              ?.insurance_document?.document_name,
                            path: stepInfoData?.vehicle_completion_details
                              ?.insurance_document?.presigned_url,
                            id: stepInfoData?.vehicle_completion_details
                              ?.insurance_document?.document_id,
                          }}
                        ></BAttachedFile>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="w-25">
                <BCalendar
                  variable={variable[2]}
                  formik={formik}
                  isRequire={false}
                ></BCalendar>
              </div>

              {/* {variable.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    ...(item.size === "xl" && { width: "100%" }),
                  }}
                >
                  <BInputFields variable={item} formik={formik} />
                </div>
              ))} */}
            </div>
          </div>
        </div>
        <div className="w-100 position-sticky bottom-0 py-3 bg-white">
          <Button
            disabled={!hasAccess}
            label="Complete Vehicle Delivery"
            type="submit"
            severity="warning"
            className="border-radius-0 primary-btn "
          />
        </div>
      </form>
      <BSuccessMessage
        isOpen={isOpen}
        message={`Vehicle Registration is successful and approved against VIN No ${stepInfoData?.vehicle_details?.vehicle?.vin}`}
        title="Verified and Approved Successfully"
        onCancel={() => {
          setOpen(false);
          navigate("/manage-vehicle", { replace: true });
        }}
        onConfirm={() => {
          setOpen(false);
          navigate("/manage-vehicle", { replace: true });
        }}
      ></BSuccessMessage>
    </div>
  );
};

export default VehicleDeliveryCompletion;
