import {
  getOptionsByIdFromVariable,
  enterMedallionStorage as variable,
} from "../../../utils/variables";
import BInputFields from "../../../components/BInputFileds";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import { useFormik } from "formik";
import { useEffect, useState } from "react";
import {
  useLazyGetStepInfoQuery,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../../redux/api/medallionApi";
import { yearMonthDate } from "../../../utils/dateConverter";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { clearSelectedMedallion } from "../../../redux/slice/selectedMedallionDetail";
import { getCurrentStep, getCurrenyStepId } from "../../../utils/caseUtils";
import { setIsUpload } from "../../../redux/slice/uploadSlice";
import BAttachedFile from "../../../components/BAttachedFile";
import { useLazyGetUsersDataQuery } from "../../../redux/api/authAPI";

const EnterMedallionStorage = ({
  caseId,
  currentStepId,
  reload,
  currentStep,
  caseData,
  hasAccess,
}) => {
  const [processFlow, { isSuccess: isProcessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [moveCase] = useMoveCaseDetailMutation();
  const [storageMode, setstorageMode] = useState(false);
  const selectedMedallionDetail = useSelector(
    (state) => state.medallion.selectedMedallionDetail
  );
  const [triggerGetStepInfo, { data: stepInfoData, isFetching, isSuccess }] =
    useLazyGetStepInfoQuery();
  const [triggerGetUsersData, { data: user, isUserApiSuccess }] =
    useLazyGetUsersDataQuery();
  const [printNameOptions, setPrintNameOptions] = useState([]);

  const dispatch = useDispatch();
  // 🔹 Call API on page load
  useEffect(() => {
    if (caseId && currentStepId) {
      triggerGetStepInfo({ caseNo: caseId, step_no: "113" });
      triggerGetUsersData("");
    }
  }, [caseId, currentStepId, triggerGetStepInfo]);

  const generateDocument = (values) => {
    const data = {
      medallion_number: currentStep?.medallion_number,
      date_place_in_storage: yearMonthDate(values.datePlacedInStorage),
      rate_card_date: yearMonthDate(values.rateCard),
      print_name: values.printName?.name,
      reason_for_storage: values.reasonforPlacinginStorage?.code,
      storage_mode: storageMode,
      storage_date: yearMonthDate(values.storageDate),
    };
    processFlow({
      params: caseId,
      data: {
        step_id: currentStepId,
        data,
      },
    });
  };

  const formik = useFormik({
    initialValues: {
      datePlacedInStorage: "",
      rateCard: "",
      printName: "",
      reason_for_storage: "",
      renewalDate: "",
      storageDate: "",
    },
    validateOnChange: true,
    validate: (values) => {
      const errors = {};
      if (!values[variable?.[0].id]) {
        errors[variable?.[0].id] = `${variable?.[0].label} is required`;
      }
      return errors;
    },
    onSubmit: (values) => {
      const data = {
        step_id: currentStepId,
        data: {
          medallion_number: currentStep?.medallion_number,
          date_place_in_storage: yearMonthDate(values.datePlacedInStorage),
          rate_card_date: yearMonthDate(values.rateCard),
          print_name: values.printName?.name,
          reason_for_storage: values.reasonforPlacinginStorage?.code,
          storage_mode: storageMode,
          storage_date: yearMonthDate(values.storageDate),
        },
      };
      console.log("payload", data);
      if (hasAccess)
        processFlow({ params: caseId, data: data })
          .unwrap()
          .then(() => {
            if (
              getCurrentStep(caseData?.steps)?.step_id == "113" &&
              getCurrentStep(caseData?.steps).is_current_step
            ) {
              moveCase({ params: caseId })
                .unwrap()
                .then(() => {
                  reload();
                });
            }
          });
    },
  });

  const handleStorageMode = (e) => {
    setstorageMode(e.checked);
  };
  useEffect(() => {
    if (currentStep?.storage_info) {
      const {
        storage_initiated_date,
        storage_date,
        storage_rate_card,
        storage_mode,
        storage_reason,
        print_name,
      } = currentStep.storage_info;
      formik.setFieldValue(
        "datePlacedInStorage",
        storage_initiated_date ? new Date(storage_initiated_date) : ""
      );
      formik.setFieldValue(
        "rateCard",
        storage_rate_card ? new Date(storage_rate_card) : ""
      );
      formik.setFieldValue(
        "storageDate",
        storage_date ? new Date(storage_date) : ""
      );
      const options = getOptionsByIdFromVariable(
        variable,
        "reasonforPlacinginStorage"
      );
      formik.setFieldValue(
        "reasonforPlacinginStorage",
        options?.filter((item) => item?.code === storage_reason)[0],
        false
      );

      // const printNameOptions = getOptionsByIdFromVariable(
      //   variable,
      //   "printName"
      // );
      formik.setFieldValue(
        "printName",
        printNameOptions?.filter((item) => item?.code === print_name)[0],
        false
      );

      if (storage_mode === "V") {
        setstorageMode(true);
      } else {
        setstorageMode(false);
      }
    }
  }, [currentStep]);

  // useEffect(() => {
  //   const performMoveCase = async () => {
  //     if (
  //       hasAccess &&
  //       isProcessDataSuccess &&
  //       getCurrenyStepId(caseData) === currentStepId
  //     ) {
  //       reload();
  //       dispatch(clearSelectedMedallion());
  //       await moveCase({ params: caseId }).then(() => {});
  //     }
  //   };

  //   performMoveCase();
  // }, [isProcessDataSuccess, hasAccess, caseData, currentStepId]);
  useEffect(() => {
    if (
      hasAccess &&
      isProcessDataSuccess &&
      getCurrenyStepId(caseData) === currentStepId
    ) {
      triggerGetStepInfo({ caseNo: caseId, step_no: "113" });
    }
  }, [isProcessDataSuccess, hasAccess, caseData, currentStepId]);

  const getDocumentDetails = () => {
    return {
      badge_value: currentStep?.storage_info?.rate_card_document?.document_id
        ? "1"
        : "0",
      apiData: {
        ...currentStep?.storage_info?.rate_card_document,
        notes: "Rate Card Notes",
      },
      document_type: [{ name: "Rate Card", code: "rate_card" }],
      object_id: currentStep?.medallion_id,
    };
    // }
    // return null; // No specific handling needed for other item IDs
  };
  const getDynamicVariable = () => {
    return variable.map((item) => {
      if (item.id === "printName") {
        return {
          ...item,
          options: printNameOptions,
        };
      }
      return item;
    });
  };

  useEffect(() => {
    if (user) {
      console.log("User List", user);
      const filteredOptions = user?.items
        .filter((item) => !!item.first_name)
        .map((item) => ({
          name: item.first_name,
          code: item.first_name,
        }));
      setPrintNameOptions(filteredOptions);
    }
  }, [isUserApiSuccess, user]);
  return (
    <div>
      <form
        className="common-form d-flex flex-column gap-5"
        onSubmit={formik.handleSubmit}
      >
        <div className="form-section">
          <div className="form-body">
            <div
              className="d-flex align-items-center flex-wrap form-grid-1 w-100 p-3"
              style={{ rowGap: "4rem", gap: "4rem 1rem" }}
            >
              {/* {variable.map((item, idx) => (
                <div key={idx}>
                  {item.inputType === "UPLOAD" ? (
                    <BInputFields
                      {...getDocumentDetails(item)}
                      variable={item}
                      formik={formik}
                    />
                  ) : (
                    <BInputFields variable={item} formik={formik} />
                  )}
                </div>
              ))} */}
              {getDynamicVariable().map((item, idx) => (
                <div key={idx}>
                  {item.inputType === "UPLOAD" ? (
                    <BInputFields
                      {...getDocumentDetails(item)}
                      variable={item}
                      formik={formik}
                    />
                  ) : (
                    <BInputFields variable={item} formik={formik} />
                  )}
                </div>
              ))}
              <div className="w-100-3 p-3">
                <Button
                  disabled={!hasAccess || !formik.values.datePlacedInStorage}
                  label="Generate Letter"
                  severity="warning"
                  className="border-radius-0 primary-btn"
                  onClick={() => generateDocument(formik.values)}
                  type="button"
                />
              </div>
            </div>

            {currentStep?.storage_info?.storage_receipt_document
              ?.document_id && (
              <div className="w-100-3 p-3">
                <BAttachedFile
                  file={{
                    name: currentStep?.storage_info?.storage_receipt_document
                      ?.document_name,
                    path: currentStep?.storage_info?.storage_receipt_document
                      ?.presigned_url,
                    id: currentStep?.storage_info?.storage_receipt_document
                      ?.document_id,
                    document_type:
                      currentStep?.storage_info?.storage_receipt_document
                        ?.document_type,
                  }}
                  hideDelete={true}
                />
              </div>
            )}
          </div>

          <div
            className="d-flex align-items-center gap-3"
            style={{ marginTop: 10, marginBottom: 10 }}
          >
            <Checkbox
              inputId="accept"
              name="accept"
              checked={storageMode}
              onChange={handleStorageMode}
            />
            <label htmlFor="accept" className="ml-2">
              Select if this is for Virtual Storage
            </label>
          </div>
          <div className="w-100 position-sticky bottom-0 py-3 bg-white">
            <Button
              disabled={
                !hasAccess ||
                !currentStep?.storage_info?.storage_receipt_document
                  ?.document_id ||
                !isProcessDataSuccess
              }
              label="Submit Storage Details"
              severity="warning"
              className="border-radius-0 primary-btn"
              // onClick={() => {
              //   completeStep();
              // }}
              type="submit"
            />
          </div>
        </div>
      </form>
    </div>
  );
};

export default EnterMedallionStorage;
