import React, { useEffect, useState } from "react";
import Img from "../../components/Img";
import { Button } from "primereact/button";
import { useFormik } from "formik";
import { enterMedallionPayeeDetail as variable } from "../../utils/variables";
import BCaseCard from "../../components/BCaseCard";
import BCalendar from "../../components/BCalendar";
import BRadio from "../../components/BRadio";
import { useNavigate, useParams } from "react-router-dom";
import {
  useGetCaseDetailQuery,
  useGetStepInfoQuery,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../redux/api/medallionApi";
import { yearMonthDate } from "../../utils/dateConverter";
import { getCurrentStep } from "../../utils/caseUtils";
import BInputText from "../../components/BInputText";
import {
  ENTER_MEDALLION_PAYEE_DETAIL,
} from "../../utils/constants";
import BModal from "../../components/BModal";
import { Badge } from "primereact/badge";
import BUpload from "../../components/BUpload";
import { removeUnderScore } from "../../utils/utils";
import { setIsUpload } from "../../redux/slice/uploadSlice";
import { useDispatch, useSelector } from "react-redux";
import BSuccessMessage from "../../components/BSuccessMessage";
import { getActiveComponent } from "../../redux/slice/componentSlice";
import BInputNumber from "../../components/BInputNumber";

const EnterPayee = () => {
  const params = useParams();
  const navigate = useNavigate();
  const caseId = params["case-id"];
  const dispatch = useDispatch();
  const isUpload = useSelector((state) => state.upload.isUpload);
  const activeComponent = useSelector(getActiveComponent);

  const [processFlow, { isSuccess: isProcessDataSuccess }] = useProcessCaseDeatilMutation();
  const [moveCase, { isSuccess: isMoveDataSuccess }] = useMoveCaseDetailMutation();
  const { data: getCaseData } = useGetCaseDetailQuery(params["case-id"], {
      skip: !params["case-id"],
    },);
  const { data: currentStep } = useGetStepInfoQuery({ caseNo: params["case-id"], step_no: ENTER_MEDALLION_PAYEE_DETAIL, });

  useEffect(() => {
    if (
      isProcessDataSuccess &&
      getCurrentStep(getCaseData?.steps).step_id == activeComponent &&
      getCurrentStep(getCaseData?.steps).is_current_step
    ) {
      moveCase({ params: params["case-id"] });
    }
  }, [isProcessDataSuccess]);

  const formik = useFormik({
    initialValues: {
      [variable?.[0].id]: "check",
      [variable?.[1].id]: "",
      [variable?.[2].id]: "",
      [variable?.[3].id]: "",
      [variable?.[4].id]: "",
      [variable?.[5].id]: "",
      [variable?.[6].id]: "",
      [variable?.[7].id]: "",
      [variable?.[8].id]: "",
      [variable?.[9].id]: "",
      [variable?.[10].id]: "",
      [variable?.[11].id]: "",
      [variable?.[12].id]: "",
      [variable?.[13].id]: "",
    },
    validateOnChange: false,
    validate: (values) => {
      const errors = {};
      console.log(
        "🚀 ~ EnterPayee ~ values[variable[13]:",
        values,
        values[variable[13]]
      );
      if (values[variable[0].id] === "check") {
        if (!values[variable[13].id]) {
          console.log("🚀 ~ EnterPayee ~ variable:", variable);
          errors[variable[13].id] = `${variable[13].label} is required`;
        }
      } else {
        if (!values[variable[1].id]) {
          errors[variable[1].id] = `${variable[1].label} is required`;
        }
        if (!values[variable[2].id]) {
          errors[variable[2].id] = `${variable[2].label} is required`;
        }
        if (!values[variable[3].id]) {
          errors[variable[3].id] = `${variable[3].label} is required`;
        }
        if (!values[variable[4].id]) {
          errors[variable[4].id] = `${variable[4].label} is required`;
        }
        if (
          values[variable[4].id] &&
          values[variable[3].id] !== values[variable[4].id]
        ) {
          errors[
            variable[4].id
          ] = `Account numbers do not match.`;
        }
        if (!values[variable[5].id]) {
          errors[variable[5].id] = `${variable[5].label} is required`;
        }
        if (!values[variable[6].id]) {
          errors[variable[6].id] = `${variable[6].label} is required`;
        }
      }
      return errors;
    },
    onSubmit: (values) => {
      let demoData = {};
      if (values[variable?.[0].id] === "check") {
        demoData = {
          step_id: ENTER_MEDALLION_PAYEE_DETAIL,
          data: {
            medallion_number: currentStep.medallion_number,
            payto: values[variable?.[0].id],
            payee: values[variable?.[13].id],
          },
        };
      } else {
        demoData = {
          step_id: ENTER_MEDALLION_PAYEE_DETAIL,
          data: {
            medallion_number: currentStep.medallion_number,
            payto: values[variable?.[0].id],
            bank_routing_number: values[variable?.[1].id],
            bank_name: values[variable?.[2].id],
            bank_account_number: values[variable?.[3].id],
            confirm_bank_account_number: values[variable?.[4].id],
            payee: values[variable?.[5].id],
            bank_account_name: values[variable?.[6].id],
            address_line_1: values[variable?.[7].id],
            address_line_2: values[variable?.[8].id],
            city: values[variable?.[9].id],
            state: values[variable?.[10].id],
            zip: values[variable?.[11].id],
            effective_from: yearMonthDate(values[variable?.[12].id]),
          },
        };
      }

      processFlow({ params: caseId, data: demoData });
    },
  });

  useEffect(() => {
    if (currentStep && !isUpload) {
      const stepData = currentStep?.medallion_payee_info;
      formik.setFieldValue(variable?.[0].id, stepData?.pay_to || "check", true);
      formik.setFieldValue(
        variable?.[1].id,
        stepData?.bank_routing_number || "",
        true
      );
      formik.setFieldValue(variable?.[2].id, stepData?.bank_name || "", true);
      formik.setFieldValue(
        variable?.[3].id,
        stepData?.bank_account_number || "",
        true
      );
      formik.setFieldValue(
        variable?.[4].id,
        stepData?.bank_account_number || "",
        true
      );
      formik.setFieldValue(variable?.[5].id, stepData?.payee || "", true);
      formik.setFieldValue(
        variable?.[6].id,
        stepData?.bank_account_name || "",
        true
      );
      formik.setFieldValue(
        variable?.[7].id,
        stepData?.address_line_1 || "",
        true
      );
      formik.setFieldValue(
        variable?.[8].id,
        stepData?.address_line_2 || "",
        true
      );
      formik.setFieldValue(variable?.[9].id, stepData?.city || "", true);
      formik.setFieldValue(variable?.[10].id, stepData?.state || "", true);
      formik.setFieldValue(variable?.[11].id, stepData?.zip, true);
      formik.setFieldValue(
        variable?.[12].id,
        stepData?.effective_from ? new Date(stepData?.effective_from) : "",
        true
      );
      formik.setFieldValue(variable?.[13].id, stepData?.payee || "", true);
    }
    dispatch(setIsUpload(false));
  }, [currentStep]);

  useEffect(() => {
    dispatch(setIsUpload(false));
  }, []);

  const getFile = () => {
    let upload = {};
    upload = {
      badge_value: currentStep?.medallion_payee_proof?.document_id ? "1" : "0",
      data: currentStep?.medallion_payee_proof,
      object_type: currentStep?.medallion_payee_proof?.document_object_type,
      object_id: currentStep?.medallion_payee_proof?.document_object_id,
      document_id: 0,
      document_type: [
        {
          name: removeUnderScore(
            currentStep?.medallion_payee_proof?.document_type
          ),
          code: currentStep?.medallion_payee_proof?.document_type,
        },
      ],
    };
    return upload;
  };

  return (
    <div>
      <div className="topic-txt d-flex align-items-center gap-2">
        <Img name="lease" className="icon-black"></Img>Enter Contract Details
        {/* <Button
          outlined
          label="Upload Documents"
          data-testid="upload-documents"
          className="text-black gap-2 outline-btn fs-16-semibold d-flex ms-auto"
          type="button"
          icon={() => <Img name="uploaddoc" />}
        /> */}
      </div>
      <div className="d-flex align-items-center gap-5 py-4">
        <BCaseCard
          label="Medallion Owner Name"
          value={currentStep?.medallion_owner_name}
        />
        <BCaseCard label="SSN" value={currentStep?.medallion_ssn} />
        <BCaseCard label="Passport" value={currentStep?.medallion_passport} />
        <BCaseCard
          label="Contact"
          value={currentStep?.primary_email_address}
        />
      </div>
      <form
        className="common-form d-flex flex-column"
        onSubmit={formik.handleSubmit}
      >
        <div className="form-section">
          <div className="form-body" style={{ backgroundColor: "#EEEEEE" }}>
            <div className="form-body d-flex flex-column common-gap">
              <div className="d-flex align-items-center flex-wrap form-grid-1 w-100">
                <div className="w-100-2">
                  <BRadio variable={variable?.[0]} formik={formik}></BRadio>
                </div>
              </div>
              {formik.values[variable[0]?.id] !== "check" ? (
                <>
                  <div className="d-flex align-items-center flex-wrap form-grid-1 w-75">
                    <div className="w-100-3">
                      <BInputText
                        variable={variable?.[1]}
                        formik={formik}
                      ></BInputText>
                    </div>
                    <div className="w-100-3">
                      <BInputText
                        variable={variable?.[2]}
                        formik={formik}
                      ></BInputText>
                    </div>
                    <div className="w-100-3">
                      <BInputNumber
                        variable={variable?.[3]}
                        formik={formik}
                      ></BInputNumber>
                    </div>
                  </div>
                  <div className="d-flex align-items-center flex-wrap form-grid-1 w-75">
                    <div className="w-100-3">
                      <BInputNumber
                        variable={variable?.[4]}
                        formik={formik}
                      ></BInputNumber>
                    </div>
                    <div className="w-100-3">
                      <BInputText
                        variable={variable?.[5]}
                        formik={formik}
                      ></BInputText>
                    </div>
                    <div className="w-100-3">
                      <BInputText
                        variable={variable?.[6]}
                        formik={formik}
                      ></BInputText>
                    </div>
                  </div>
                  <div className="w-100 d-flex align-items-center flex-wrap form-grid-1">
                    <div className="w-100-2">
                      <BInputText
                        variable={variable?.[7]}
                        formik={formik}
                      ></BInputText>
                    </div>
                    <div className="w-100-2">
                      <BInputText
                        variable={variable?.[8]}
                        formik={formik}
                      ></BInputText>
                    </div>
                  </div>
                  <div className="w-75 d-flex align-items-center flex-wrap form-grid-1">
                    <div className="w-100-3">
                      <BInputText
                        variable={variable?.[9]}
                        formik={formik}
                      ></BInputText>
                    </div>
                    <div className="w-100-3">
                      <BInputText
                        variable={variable?.[10]}
                        formik={formik}
                      ></BInputText>
                    </div>
                    <div className="w-100-3">
                      <BInputText
                        variable={variable?.[11]}
                        formik={formik}
                      ></BInputText>
                    </div>
                    <div className="w-100-3">
                      <BCalendar
                        variable={variable?.[12]}
                        formik={formik}
                      ></BCalendar>
                    </div>
                    <div className="w-100-3">
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
                                {/* {console.log(getDocumentDetails(item))} */}
                                {/* <Badge value="1"  className="badge-icon" severity="warning"></Badge> */}
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
                    </div>
                  </div>
                </>
              ) : (
                <div className="d-flex align-items-center flex-wrap form-grid-1 w-75">
                  <div className="w-100-3">
                    <BInputText
                      variable={variable?.[13]}
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
            label="Submit"
            type="submit"
            // disabled={!hasAccess}
            severity="warning"
            className="border-radius-0 primary-btn "
          />
          {/* {currentStepId === MO_ENTER_PAYEE_DETAILS && (
          )} */}
        </div>
      </form>

      <BSuccessMessage
        isOpen={isMoveDataSuccess}
        message={`Medallion ${currentStep?.medallion_number} is created and available for assignment`}
        title="Medallion Creation Successful"
        onCancel={() => {
          navigate("/manage-medallion");
        }}
        onConfirm={() => {
          navigate("/manage-medallion");
        }}
      ></BSuccessMessage>

      {/* <BSuccessMessage
              isOpen={isOpen}
              message={`Payee update is successful for Medallion <strong>${currentStep?.medallion_owner_name}</strong>.`}
              title="Payee update is successful"
              onCancel={() => {
                setOpen(false); navigate('/manage-medallion', { replace: true });
              }}
              onConfirm={() => {
                setOpen(false); navigate('/manage-medallion', { replace: true });
              }}
              isHtml={true}
            /> */}
    </div>
  );
};

export default EnterPayee;
