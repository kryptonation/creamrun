import { useFormik } from "formik";
import { enterPayeeDetail as variable } from "../../../utils/variables";
import { Button } from "primereact/button";
import { useEffect, useMemo, useState } from "react";
import BRadio from "../../../components/BRadio";
import BInputText from "../../../components/BInputText";
import BCalendar from "../../../components/BCalendar";
import {
  useGetStepInfoQuery,
  useLazyGetStepInfoQuery,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../../redux/api/medallionApi";
import { yearMonthDate } from "../../../utils/dateConverter";
import { MO_ENTER_PAYEE_DETAILS } from "../../../utils/constants";
import { getCurrentStep } from "../../../utils/caseUtils";
import BSuccessMessage from "../../../components/BSuccessMessage";
import { useNavigate } from "react-router-dom";
import BInputNumber from "../../../components/BInputNumber";
import { useGetBankDetailsMutation } from "../../../redux/api/individualListApi";
import { validateBankName } from "../../../utils/formUitiles";
import PdfViewModal from "../../../components/PdfViewModal";
import { removeUnderScore } from "../../../utils/utils";
import Img from "../../../components/Img";
// import { yearMonthDate } from "../../../utils/dateConverter";

const UpdateMedallionPayee = ({
  caseId,
  currentStepId,
  reload,
  currentStep,
  caseData,
  hasAccess,
}) => {
  const [isOpen, setOpen] = useState(false);
  const navigate = useNavigate();
  const [processFlow, { isSuccess: isProcessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();
  const [getBankDetails, { data }] = useGetBankDetailsMutation();
  // const { data: stepInfoData, isSucces: isStepInfoSuccess } =
  //   useGetStepInfoQuery({ caseNo: caseId, step_no: "118" }, { skip: !caseId });
  const [triggerGetStepInfo, { data: stepInfoData, isFetching, isSuccess }] =
    useLazyGetStepInfoQuery();

  useEffect(() => {
    if (isMoveDataSuccess) {
      reload();
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
    // if (
    //   hasAccess &&
    //   caseData &&
    //   caseData.case_info.case_status !== "Closed" &&
    //   getCurrentStep(caseData.steps).step_id === currentStepId
    // ) {
    //   moveCase({ params: caseId });
    // }
  }, [isProcessDataSuccess]);

  // 🔹 Call API on page load
  useEffect(() => {
    if (caseId && currentStepId) {
      triggerGetStepInfo({ caseNo: caseId, step_no: "118" });
    }
  }, [caseId, currentStepId, triggerGetStepInfo]);

  useEffect(() => {
    if (data?.routingNumber) {
      formik.setFieldValue(variable?.[2].id, data?.name?.toUpperCase());
    }
  }, [data]);

  const formik = useFormik({
    initialValues: {
      [variable?.[0].id]: "check",
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
      [variable?.[12].id]: "",
      [variable?.[13].id]: "",
    },
    validateOnChange: true,
    //validateOnBlur: true,
    validate: (values) => {
      const errors = {};
      const digitRegex = /^\d+$/;
      const alphaRegex = /^[A-Za-z\s]+$/;
      if (values[variable[0].id] === "check") {
        if (!values[variable[13].id]) {
          // console.log("🚀 ~ EnterPayee ~ variable:", variable);
          errors[variable[13].id] = `${variable[13].label} is required`;
        } else if (!alphaRegex.test(values.checkPayee)) {
          errors["checkPayee"] = "Payee should only contain letters";
        }
      } else {
        if (!values[variable[1].id]) {
          errors[variable[1].id] = `${variable[1].label} is required`;
        } else if (!digitRegex.test(values.bank_routing_number)) {
          errors["bank_routing_number"] =
            "Route Number must contain only digits";
        }
        const bankNameError = validateBankName(values.bankName);
        if (bankNameError) {
          errors.bankName = bankNameError;
        }

        if (!values[variable[3].id]) {
          errors[variable[3].id] = `${variable[3].label} is required`;
        } else if (!digitRegex.test(values.bankAccountNumber)) {
          errors["bankAccountNumber"] =
            "Bank Account Number must contain only digits";
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
          errors[variable[5].id] = `${variable[5].label} is required`;
        } else if (!alphaRegex.test(values.payee)) {
          errors["payee"] = "Payee should only contain letters";
        }
        // if (!values[variable[6].id]) {
        //   errors[variable[6].id] = `${variable[6].label} is required`;
        // }
      }
      return errors;
    },
    onSubmit: (values) => {
      let demoData = {};
      if (values[variable?.[0].id] === "check") {
        demoData = {
          step_id: MO_ENTER_PAYEE_DETAILS,
          data: {
            owner_id: currentStep?.owner_id,
            payto: values[variable?.[0].id],
            payee: values[variable?.[13].id],
          },
        };
      } else {
        demoData = {
          step_id: MO_ENTER_PAYEE_DETAILS,
          data: {
            //medallion_number: currentStep.medallion_number,
            owner_id: currentStep?.owner_id,
            payto: values[variable?.[0].id],
            bank_routing_number: values[variable?.[1].id],
            bank_name: values[variable?.[2].id]?.toUpperCase(),
            bank_account_number: parseInt(values[variable?.[3].id]),
            confirm_bank_account_number: parseInt(values[variable?.[4].id]),
            payee: values[variable?.[5].id],
            bank_account_name: values[variable?.[5].id],
          },
        };
      }

      if (hasAccess && Object.keys(formik.errors).length == 0) {
        processFlow({ params: caseId, data: demoData });
      }
    },
  });

  useEffect(() => {
    if (stepInfoData) {
      const stepData = stepInfoData?.medallion_payee_info;
      if (stepData?.pay_to_mode?.toLowerCase() === "check") {
        formik.setFieldValue(variable?.[0].id, "check", true);
      } else if (stepData?.pay_to_mode === "ACH") {
        formik.setFieldValue(variable?.[0].id, "ACH", true);
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
      }
      formik.setFieldValue(
        variable?.[13].id,
        stepData?.data?.bank_account_name || "",
        true
      );
      formik.setFieldValue(
        variable?.[5].id,
        stepData?.data?.bank_account_name || "",
        true
      );
    }
  }, [stepInfoData]);

  const parts =
    stepInfoData?.medallion_payee_proofs?.[0]?.document_name?.split(".");
  const extension = parts?.pop();
  const filename = parts?.join(".");
  const img = extension === "pdf" ? "pdf" : "img";
  const path = stepInfoData?.medallion_payee_proofs?.[0]?.presigned_url;

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
              {formik.values[variable[0]?.id] !== "check" ? (
                <>
                  <div
                    className="d-flex align-items-center flex-wrap form-grid-1 w-75"
                    style={{ marginBottom: "30px" }}
                  >
                    <div className="w-100-3">
                      <BInputText
                        variable={variable?.[1]}
                        formik={formik}
                        onBlur={(e) => {
                          formik.handleBlur(e);
                          const value = e.target.value.trim();
                          if (value) {
                            getBankDetails(value);
                          }
                        }}
                      ></BInputText>
                    </div>
                    <div className="w-100-3">
                      <BInputText
                        variable={variable?.[2]}
                        formik={formik}
                      ></BInputText>
                    </div>
                    <div className="w-100-3">
                      <BInputText
                        variable={variable?.[3]}
                        formik={formik}
                      ></BInputText>
                    </div>
                  </div>
                  <div
                    className="d-flex align-items-center flex-wrap form-grid-1 w-75"
                    style={{ marginBottom: "30px" }}
                  >
                    <div className="w-100-3">
                      <BInputText
                        variable={variable?.[4]}
                        formik={formik}
                      ></BInputText>
                    </div>
                    <div className="w-100-3">
                      <BInputText
                        variable={variable?.[5]}
                        formik={formik}
                      ></BInputText>
                    </div>
                    {/* <div className="w-100-3">
                      <BInputText
                        variable={variable?.[6]}
                        formik={formik}
                      ></BInputText>
                    </div> */}

                    {path ? (
                      <div className="w-100-3">
                        <div className="d-flex align-items-center gap-2">
                          <PdfViewModal
                            triggerButton={
                              <Button
                                pt={{
                                  root: { "data-testid": `eye-icon-btn` },
                                }}
                                type="button"
                                icon={<Img name="black_ic_eye" />}
                                className="p-button-text p-0"
                              />
                            }
                            title={removeUnderScore(
                              stepInfoData?.medallion_payee_proofs?.[0]
                                ?.document_type || ""
                            ).replace(/\b\w/g, (char) => char.toUpperCase())}
                            downloadUrl={path}
                            downloadName={filename}
                            extension={extension}
                            previewUrl={path}
                          />
                          <div className="ms-2">
                            <span className="regular-text">Payee Proof</span>
                            <span className="text-danger ms-1">*</span>
                          </div>
                        </div>
                      </div>
                    ) : null}
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
          {currentStepId === MO_ENTER_PAYEE_DETAILS && (
            <Button
              label="Submit Payee Details"
              type="submit"
              disabled={!hasAccess}
              severity="warning"
              className="border-radius-0 primary-btn "
            />
          )}
        </div>
      </form>

      <BSuccessMessage
        isOpen={isOpen}
        message={`Payee update is successful for Medallion <strong>${currentStep?.owner_name}</strong>.`}
        title="Payee update is successful"
        onCancel={() => {
          setOpen(false);
          navigate("/manage-owner", { replace: true });
        }}
        onConfirm={() => {
          setOpen(false);
          navigate("/manage-owner", { replace: true });
        }}
        isHtml={true}
      />
    </>
  );
};

export default UpdateMedallionPayee;
