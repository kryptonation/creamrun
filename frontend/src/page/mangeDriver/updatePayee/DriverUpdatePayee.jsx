import { useFormik } from "formik";
import { useEffect, useRef, useState } from "react";
import { enterDriverPayeeDetail as variable } from "../../../utils/variables";
import { Button } from "primereact/button";
import BRadio from "../../../components/BRadio";
import BInputText from "../../../components/BInputText";
import BCalendar from "../../../components/BCalendar";
import {
  useGetStepInfoQuery,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../../redux/api/medallionApi";
import { yearMonthDate } from "../../../utils/dateConverter";
import { getCurrentStep } from "../../../utils/caseUtils";
import BSuccessMessage from "../../../components/BSuccessMessage";
import { useNavigate } from "react-router-dom";
import BInputNumber from "../../../components/BInputNumber";
import { DRIVER_UPDATE_PAYEE_DETAIL } from "../../../utils/constants";
import PdfViewModal from "../../../components/PdfViewModal";
import Img from "../../../components/Img";
import { removeUnderScore } from "../../../utils/utils";
import { useGetBankDetailsMutation } from "../../../redux/api/individualListApi";
import {
  validateBankAccountNumber,
  validateBankName,
  validateRoutingNumber,
} from "../../../utils/formUitiles";
import BUpload from "../../../components/BUpload";
import BModal from "../../../components/BModal";
import { Badge } from "primereact/badge";
import { useDispatch, useSelector } from "react-redux";
import { setIsUpload } from "../../../redux/slice/uploadSlice";
import BToast from "../../../components/BToast";

const DriverUpdatePayee = ({
  caseId,
  currentStepId,
  currentStep,
  caseData,
  hasAccess,
}) => {
  console.log("🚀 ~ DriverUpdatePayee ~ currentStep:", currentStep);
  const [processFlow, { isSuccess: isProcessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();
  const [isOpen, setOpen] = useState(false);
  const navigate = useNavigate();
  const [getBankDetails, { data }] = useGetBankDetailsMutation();
  const dispatch = useDispatch();
  const isUpload = useSelector((state) => state.upload.isUpload);
  const { data: stepInfoData } = useGetStepInfoQuery(
    { caseNo: caseId, step_no: currentStepId },
    { skip: !caseId }
  );
  const [isErrorActive, setIsErrorActive] = useState(false);
  const toast = useRef(null);

  useEffect(() => {
    if (isMoveDataSuccess) {
      setOpen(true);
    }
  }, [isMoveDataSuccess]);

  useEffect(() => {
    if (
      hasAccess &&
      isProcessDataSuccess &&
      getCurrentStep(caseData.steps).step_id == currentStepId &&
      getCurrentStep(caseData.steps).is_current_step
    ) {
      moveCase({ params: caseId });
    }
  }, [isProcessDataSuccess]);
  useEffect(() => {
    if (data?.name) {
      formik.setFieldValue(variable?.[2].id, data?.name.toUpperCase());
    } else {
      formik.setFieldValue(variable?.[2].id, "");
    }
  }, [data]);

  const formik = useFormik({
    initialValues: {
      [variable?.[0].id]: "Check",
      [variable?.[1].id]: "",
      [variable?.[2].id]: "",
      [variable?.[3].id]: "",
      [variable?.[4].id]: "",
      [variable?.[5].id]: "",
      // [variable?.[6].id]: "",
      // [variable?.[7].id]: "",
      // [variable?.[8].id]: "",
      // [variable?.[9].id]: "",
      // [variable?.[10].id]: "",
      // [variable?.[11].id]: "",
      // [variable?.[12].id]: "",
      [variable?.[13].id]: "",
    },
    validateOnChange: false,
    validate: (values) => {
      const errors = {};
      const digitRegex = /^\d+$/;
      const alphaRegex = /^[A-Za-z\s]+$/;
      if (values[variable[0].id] === "Check") {
        if (!values[variable[13].id]) {
          errors[variable[13].id] = "Payee is required";
        } else if (!alphaRegex.test(values[variable[13].id])) {
          errors[variable[13].id] = "Payee should only contain letters";
        } else if (/^\s|\s$/.test(values[variable[13].id])) {
          errors[variable[13].id] =
            "Payee Name cannot start or end with spaces";
        }
      } else {
        // if (!values[variable[1].id]) {
        //   errors[variable[1].id] = `${variable[1].label} is required`;
        // }
        // if (!values[variable[1].id]) {
        //   errors[variable[1].id] = "Route Number is required";
        // } else if (!digitRegex.test(values[variable[1].id])) {
        //   errors[variable[1].id] = "Route Number must contain only digits";
        // }

        const routingError = validateRoutingNumber(values[variable[1].id]);
        if (routingError) {
          errors[variable[1].id] = routingError;
        }

        const bankNameError = validateBankName(values.bankName);
        if (bankNameError) {
          errors.bankName = bankNameError;
        }

        const bankAccError = validateBankAccountNumber(values[variable[3].id]);
        if (bankAccError) {
          errors[variable[3].id] = bankAccError;
        }

        if (!values[variable[4].id]) {
          errors[variable[4].id] = `${variable[4].label} is required`;
        }
        if (
          values[variable[4].id] &&
          values[variable[3].id] !== values[variable[4].id]
        ) {
          errors[variable[4].id] = `Account numbers do not match.`;
        }

        if (!values[variable[5].id]) {
          errors[variable[5].id] = "Payee is required";
        } else if (!alphaRegex.test(values[variable[5].id])) {
          errors[variable[5].id] = "Payee should only contain letters";
        } else if (/^\s|\s$/.test(values[variable[5].id])) {
          errors[variable[5].id] = "Payee Name cannot start or end with spaces";
        }

        const payeeProofDoc = mapDocumentData(
          stepInfoData,
          "driver_payee_proof"
        );
        console.log("Payee proof doc validation", payeeProofDoc);
        if (!payeeProofDoc || !payeeProofDoc?.document_id) {
          errors.payeeProof = "Please upload the Payee Proof";
        }
        // if (!values[variable[6].id]) {
        //   errors[variable[6].id] = `${variable[6].label} is required`;
        // }
      }
      console.log("🚀 ~ DriverUpdatePayee ~ values:", values);
      return errors;
    },
    onSubmit: (values) => {
      let demoData = {};
      if (values[variable?.[0].id] === "Check") {
        demoData = {
          step_id: DRIVER_UPDATE_PAYEE_DETAIL,
          data: {
            driver_id: currentStep.driver_info?.driver_lookup_id,
            pay_to_mode: values[variable?.[0].id],
            pay_to: values[variable?.[13].id],
          },
        };
      } else {
        demoData = {
          step_id: DRIVER_UPDATE_PAYEE_DETAIL,
          data: {
            driver_id: currentStep.driver_info?.driver_lookup_id,
            pay_to_mode: values[variable?.[0].id],
            bank_routing_number: values[variable?.[1].id],
            bank_name: values[variable?.[2].id].toUpperCase(),
            bank_account_number: values[variable?.[3].id],
            pay_to: values[variable?.[5].id],
            bank_account_name: values[variable?.[5].id],
            // address_line_1: values[variable?.[7].id],
            // address_line_2: values[variable?.[8].id],
            // city: values[variable?.[9].id],
            // state: values[variable?.[10].id],
            // zip: values[variable?.[11].id],
            // effective_from: yearMonthDate(values[variable?.[12].id]),
          },
        };
      }
      console.log("Demo data", demoData);

      processFlow({ params: caseId, data: demoData });
    },
  });

  useEffect(() => {
    if (stepInfoData && !isUpload) {
      const stepData = stepInfoData?.driver_payee_info;
      formik.setFieldValue(
        variable?.[0].id,
        stepData?.pay_to_mode || "Check",
        true
      );
      formik.setFieldValue(
        variable?.[1].id,
        stepData?.data?.bank_routing_number || "",
        true
      );
      formik.setFieldValue(
        variable?.[2].id,
        stepData?.data?.bank_name || "",
        true
      );
      formik.setFieldValue(
        variable?.[3].id,
        stepData?.data?.bank_account_number || "",
        true
      );
      formik.setFieldValue(
        variable?.[4].id,
        stepData?.data?.bank_account_number || "",
        true
      );
      formik.setFieldValue(
        variable?.[5].id,
        stepData?.data?.bank_account_name || "",
        true
      );
      // formik.setFieldValue(
      //   variable?.[6].id,
      //   stepData?.bank_account_name || "",
      //   true
      // );
      // formik.setFieldValue(
      //   variable?.[7].id,
      //   stepData?.address_line_1 || "",
      //   true
      // );
      // formik.setFieldValue(
      //   variable?.[8].id,
      //   stepData?.address_line_2 || "",
      //   true
      // );
      // formik.setFieldValue(variable?.[9].id, stepData?.city || "", true);
      // formik.setFieldValue(variable?.[10].id, stepData?.state || "", true);
      // formik.setFieldValue(variable?.[11].id, stepData?.zip, true);
      // formik.setFieldValue(
      //   variable?.[12].id,
      //   stepData?.effective_from ? new Date(stepData?.effective_from) : "",
      //   true
      // );
      formik.setFieldValue(
        variable?.[13].id,
        stepData?.data?.bank_account_name || "",
        true
      );
    }
  }, [stepInfoData, isUpload]);

  useEffect(() => {
    dispatch(setIsUpload(false));
  }, []);
  // const parts = currentStep?.driver_payee_proofs[0]?.document_name?.split(".");
  // const extension = parts?.pop();
  // const filename = parts?.join(".");
  // const img = extension === "pdf" ? "pdf" : "img";
  // const path = currentStep?.driver_payee_proofs[0]?.presigned_url;
  const errorMsgStyle = {
    color: "#ff0000",
  };
  const mapDocumentData = (currentStep, type) => {
    const doc = stepInfoData?.driver_payee_proofs?.find(
      (d) => d?.document_type === type
    );
    console.log("Mapped Document Data:", doc);
    return doc;
  };

  const payeeProofDoc = mapDocumentData(stepInfoData, "driver_payee_proof");
  const parts = payeeProofDoc?.document_name?.split(".");
  const extension = parts?.pop();
  const filename = parts?.join(".");
  const img = extension === "pdf" ? "pdf" : "img";
  const path = payeeProofDoc?.presigned_url;

  const getUploadDocumentDetails = () => {
    // let upload = {};
    const existingDocument = stepInfoData?.driver_payee_proofs?.find(
      (doc) => doc.document_type === "driver_payee_proof"
    );
    const uploadDocOptions = [
      {
        name: "Payee Proof",
        code: "driver_payee_proof",
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
      document_object_id: stepInfoData?.driver_info?.driver_id,
      document_size: "",
      document_uploaded_date: "",
      presigned_url: "",
    };

    let upload = {
      data: existingDocument ? existingDocument : default_document_data,
      object_type: "driver",
      object_id: stepInfoData?.driver_info?.driver_id,
      document_id: 0,
      document_name: "",
      document_type: [
        {
          name: "Payee Proof",
          code: "driver_payee_proof",
        },
      ],
    };
    return upload;
  };
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
  }, [stepInfoData?.driver_payee_proofs]);

  return (
    <>
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
              {formik.values[variable[0]?.id] !== "Check" ? (
                <>
                  <div className="d-flex align-items-center flex-wrap form-grid-1 w-100 mb-3">
                    <div className="w-100-3 pe-3 mb-2">
                      <BInputText
                        variable={variable?.[1]}
                        formik={formik}
                        isRequire={true}
                        onBlur={(e) => {
                          formik.handleBlur(e);
                          const value = e.target.value.trim();
                          if (value) {
                            getBankDetails(value);
                          }
                        }}
                      ></BInputText>
                    </div>
                    <div className="w-100-3 pe-3 mb-2">
                      <BInputText
                        variable={variable?.[2]}
                        formik={formik}
                      ></BInputText>
                    </div>
                    <div className="w-100-3 mb-2">
                      <BInputText
                        variable={variable?.[3]}
                        formik={formik}
                      ></BInputText>
                    </div>
                  </div>
                  <div className="d-flex align-items-center flex-wrap form-grid-1 w-100 mb-3">
                    <div className="w-100-3 pe-3 mb-2">
                      <BInputText
                        variable={variable?.[4]}
                        formik={formik}
                      ></BInputText>
                    </div>
                    <div className="w-100-3 pe-3 mb-2">
                      <BInputText
                        variable={variable?.[5]}
                        formik={formik}
                      ></BInputText>
                    </div>
                    {/* <div className="w-100-3">
                      <BCalendar
                        variable={variable?.[12]}
                        formik={formik}
                      ></BCalendar>
                    </div> */}
                    {/* <div className="d-flex align-items-center gap-2 mb-2">
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
                          currentStep?.driver_payee_proofs[0]?.document_type
                        ).replace(/\b\w/g, (char) => char.toUpperCase())}
                        downloadUrl={path}
                        downloadName={filename}
                        extension={extension}
                        previewUrl={path}
                      />
                      <div className="ms-2">
                        <span className="regular-text">Payee Proof</span>
                        <span className="text-danger">*</span>
                      </div>
                    </div> */}
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
                            <BUpload {...getUploadDocumentDetails()} />
                          </BModal.Content>
                        </BModal>
                        <div>
                          <span className="text-danger">*</span>
                        </div>
                        {payeeProofDoc?.document_id &&
                          payeeProofDoc?.document_id > 0 && (
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
                    {/* <div className="w-100-3">
                      <BInputText
                        variable={variable?.[6]}
                        formik={formik}
                      ></BInputText>
                    </div> */}
                  </div>
                  {/* Commented out sections with proper spacing classes for future use */}
                  {/* <div className="w-100 d-flex align-items-center flex-wrap form-grid-1 mb-3">
                    <div className="w-100-2 pe-3 mb-2">
                      <BInputText
                        variable={variable?.[7]}
                        formik={formik}
                      ></BInputText>
                    </div>
                    <div className="w-100-2 mb-2">
                      <BInputText
                        variable={variable?.[8]}
                        formik={formik}
                      ></BInputText>
                    </div>
                  </div> */}
                  {/* <div className="w-75 d-flex align-items-center flex-wrap form-grid-1 mb-3">
                    <div className="w-100-3 pe-3 mb-2">
                      <BInputText
                        variable={variable?.[9]}
                        formik={formik}
                      ></BInputText>
                    </div>
                    <div className="w-100-3 pe-3 mb-2">
                      <BInputText
                        variable={variable?.[10]}
                        formik={formik}
                      ></BInputText>
                    </div>
                    <div className="w-100-3 pe-3 mb-2">
                      <BInputText
                        variable={variable?.[11]}
                        formik={formik}
                      ></BInputText>
                    </div>
                    <div className="w-100-3 mb-2">
                      <BCalendar
                        variable={variable?.[12]}
                        formik={formik}
                      ></BCalendar>
                    </div>
                  </div> */}
                </>
              ) : (
                <div className="d-flex align-items-center flex-wrap form-grid-1 w-75 mb-3">
                  <div className="w-100-3 mb-2">
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
            disabled={!hasAccess}
            label="Submit Payee Details"
            type="button"
            severity="warning"
            className="border-radius-0 primary-btn "
            onClick={handleFormSubmit}
          />
        </div>
      </form>
      <BSuccessMessage
        isOpen={isOpen}
        message={`Payee update is successful and approved for Driver  ${currentStep?.driver_info?.first_name}`}
        title="Payee update process is successful"
        onCancel={() => {
          setOpen(false);
          navigate("/manage-driver", { replace: true });
        }}
        onConfirm={() => {
          setOpen(false);
          navigate("/manage-driver", { replace: true });
        }}
      />
      <BToast ref={toast} position="top-right" />
    </>
  );
};

export default DriverUpdatePayee;
