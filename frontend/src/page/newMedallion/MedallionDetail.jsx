import { Button } from "primereact/button";
import Img from "../../components/Img";
import { useFormik } from "formik";
import { medallionDetail as variable } from "../../utils/variables";
import BInputText from "../../components/BInputText";
import BCalendar from "../../components/BCalendar";
import BRadio from "../../components/BRadio";
import BSelect from "../../components/BSelect";
import BUploadInput from "../../components/BUploadInput";
import BCaseCard from "../../components/BCaseCard";
import { useParams } from "react-router-dom";
import {
  useGetCaseDetailQuery,
  useGetStepInfoQuery,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../redux/api/medallionApi";
import BInputNumber from "../../components/BInputNumber";
import { useEffect, useState } from "react";
import {
  isEndDateAfterStartDate,
  yearMonthDate,
} from "../../utils/dateConverter";
import { getActiveComponent } from "../../redux/slice/componentSlice";
import { useSelector } from "react-redux";
import { getCurrentStep } from "../../utils/caseUtils";
import { ENTER_MEDALLION_DETAIL } from "../../utils/constants";
const MedallionDetail = ({
  caseId,
  currentStepId,
  isCaseSuccess,
  reload,
  currentStep,
  caseData,
  hasAccess,
}) => {
  const params = useParams();
  const [processFlow, { isSuccess: isProccessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [moveCase] = useMoveCaseDetailMutation();
  const activeComponent = useSelector(getActiveComponent);
  const [submitBtnStatus, setSubmitBtnStatus] = useState(true);
  // const {
  //   data: currentStep,
  //   isSuccess: isStepInfoSuccess,
  //   refetch,
  // } = useGetStepInfoQuery({
  //   caseNo: params["case-id"],
  //   step_no: activeComponent,
  // });
  // const { data: caseData } = useGetCaseDetailQuery(params["case-id"], {
  //   skip: !params["case-id"],
  // });
  console.log(activeComponent, currentStep);

  // const toast = useRef(null);

  const formik = useFormik({
    initialValues: {
      [variable.field_01.id]: "", //medallion number
      [variable.field_02.id]: "", //medallion type
      [variable.field_05.id]: "", //expiration date
      [variable.field_06.id]: "", //renewal receipt
      [variable.field_08.id]: "", //fs6 receipt
      [variable.medallion_storage_receipt.id]: "", //medallion storage receipt

      [variable.field_03.id]: "",
      [variable.field_04.id]: "",
      [variable.field_07.id]: false,
      [variable.field_09.id]: "",
      [variable.field_10.id]: "",
      [variable.field_11.id]: variable.field_11.value,
      [variable.field_12.id]: variable.field_12.value,
      [variable.field_13.id]: 0,
    },
    validateOnChange: true,
    // validateOnMount: true,
    // enableReinitialize: true,
    validate: (values) => {
      const errors = {};
      const regex = /^\d[A-Z]\d{2}$/;
      if (!values[variable.field_01.id]) {
        errors[variable.field_01.id] = `${variable.field_01.label} is required`;
      } else if (values[variable.field_01.id].length !== 4) {
        errors[
          variable.field_01.id
        ] = `${variable.field_01.label} must be 4 characters`;
      } else if (!regex.test(values[variable.field_01.id])) {
        errors[
          variable.field_01.id
        ] = `Please enter a valid format (e.g., 1A11)`;
      }

      if (!values[variable.field_02.id]) {
        errors[variable.field_02.id] = `${variable.field_02.label} is required`;
      }

      // if (
      //   values[variable.field_05.id] &&
      //   values[variable.field_04.id] &&
      //   !isEndDateAfterStartDate(
      //     values[variable.field_04.id],
      //     values[variable.field_05.id]
      //   )
      // ) {
      //   errors[
      //     variable.field_05.id
      //   ] = `${variable.field_05.label} must be a date after ${variable.field_04.label} date`;
      // }
      return errors;
    },
    onSubmit: (values) => {
      values = { ...values, medallionType: values?.medallionType?.code };
      console.log("on submit", values);

      processFlow({
        params: caseId,
        data: {
          step_id: ENTER_MEDALLION_DETAIL,
          data: {
            medallionNumber: values.medallionNumber,
            medallionType: values.medallionType,
            expirationDate: yearMonthDate(values.validToDate),
            // lastRenewalDate: yearMonthDate(values.lastRenewalDate),
            // validFromDate: yearMonthDate(values.validFromDate),
            // validToDate: yearMonthDate(values.validToDate),
            // fs6Date: yearMonthDate(values.fs6Date),
            // first_signed: yearMonthDate(values.firstSignedDate),
            // isStorage: values.isStorage,
          },
        },
      });

      // processFlow({
      //   params: params["case-id"],
      //   data: {
      //     step_id: ENTER_MEDALLION_DETAIL,
      //     data: {
      //       ...values,
      //       expirationDate: yearMonthDate(values.validToDate)

      //       // lastRenewalDate: yearMonthDate(values.lastRenewalDate),
      //       // validFromDate: yearMonthDate(values.validFromDate),
      //       // validToDate: yearMonthDate(values.validToDate),
      //       // fs6Date: yearMonthDate(values.fs6Date),
      //       // first_signed: yearMonthDate(values.firstSignedDate),
      //       // isStorage: values.isStorage,
      //     },
      //   },
      // });
    },
  });

  useEffect(() => {
    console.log(
      "useEffect()",
      isProccessDataSuccess,
      getCurrentStep(caseData?.steps)?.step_id,
      activeComponent,
      getCurrentStep(caseData?.steps).is_current_step
    );
    // if (isProccessDataSuccess) {
    //  // refetch();
    // }
    if (
      isProccessDataSuccess &&
      getCurrentStep(caseData?.steps)?.step_id == ENTER_MEDALLION_DETAIL &&
      getCurrentStep(caseData?.steps).is_current_step
    ) {
      moveCase({ params: caseId })
        .unwrap()
        .then(() => {
          reload();
        });
    }
  }, [isProccessDataSuccess]);

  useEffect(() => {
    console.log("Step Info Data", currentStep);
    if (currentStep) {
      if (
        currentStep?.medallion_number &&
        currentStep?.medallion_number !== formik.values[variable.field_01.id]
      ) {
        formik.setFieldValue(
          variable.field_01.id,
          currentStep?.medallion_number
        );
      }
      if (
        currentStep?.medallion_type &&
        currentStep?.medallion_type !==
          formik.values[variable.field_02.id]?.code
      ) {
        const medallionTypeOption = variable.field_02.options.find(
          (item) => item.code === currentStep?.medallion_type
        );
        formik.setFieldValue(variable.field_02.id, medallionTypeOption);
      }
      if (
        currentStep?.valid_to &&
        new Date(currentStep?.valid_to).toISOString().split("T")[0] !==
          (formik.values[variable.field_05.id]
            ? new Date(formik.values[variable.field_05.id])
                .toISOString()
                .split("T")[0]
            : "")
      ) {
        formik.setFieldValue(
          variable.field_05.id,
          new Date(currentStep?.valid_to)
        );
      }
      formik.setFieldValue(
        [variable.field_06.id],
        currentStep?.[variable.field_06?.id]
          ? currentStep?.[variable.field_06?.id]
          : "",
        true
      );
      formik.setFieldValue(
        variable.field_08.id,
        currentStep?.fs6_status || "",
        true
      );
      formik.setFieldValue(
        variable.medallion_storage_receipt,
        currentStep?.storage_receipt_document || "",
        true
      );
    }
  }, [currentStep]);

  return (
    <div>
      {/* <div className="topic-txt d-flex align-items-center gap-2">
        <Img name="medallion" className="icon-black"></Img>Enter Medallion
        Details
      </div>
      <div className="d-flex align-items-center gap-5 py-4 ">
        <BCaseCard
          label="Medallion Owner Name"
          value={currentStep?.medallion_owner_name}
          dataTestId="medallion-owner-name"
        />
        <BCaseCard
          label="SSN"
          value={currentStep?.medallion_ssn}
          dataTestId="ssn"
        />
        <BCaseCard label="MVL" value={currentStep?.mvl} dataTestId="mvl" />
        <BCaseCard
          label="Passport"
          value={currentStep?.medallion_passport}
          dataTestId="passport"
        />
        <BCaseCard
          label="Contact"
          value={currentStep?.primary_email_address}
          dataTestId="contact"
        />
      </div> */}
      <p className="text-require d-flex ms-auto w-max-content">
        {" "}
        (Required fields are marked with <span className="require-star">*</span>
        ){" "}
      </p>
      <form
        action=""
        className="common-form d-flex flex-column gap-5"
        onSubmit={formik.handleSubmit}
      >
        <div className="form-section">
          <div className="form-body">
            <div
              className="d-flex align-items-center flex-wrap form-grid-2 w-100 p-3"
              style={{ rowGap: "4rem", gap: "4rem 1rem" }}
            >
              <div className="w-100-3 ">
                <BInputText
                  variable={variable.field_01}
                  formik={formik}
                  isRequire={true}
                ></BInputText>
              </div>
              <div className="w-100-3 ">
                <BSelect
                  variable={variable.field_02}
                  formik={formik}
                  isRequire={true}
                ></BSelect>
              </div>
              {/* <div className="w-100-3 ">
                <BCalendar
                  variable={variable.field_03}
                  formik={formik}
                  isRequire={false}
                  maxDate={new Date()}
                ></BCalendar>
              </div>
              <div className="w-100-3 ">
                <BCalendar
                  variable={variable.field_04}
                  formik={formik}
                  isRequire={false}
                ></BCalendar>
              </div> */}
              <div className="w-100-3 ">
                <BCalendar
                  variable={variable.field_05}
                  formik={formik}
                  isRequire={false}
                ></BCalendar>
              </div>
              <div className="w-100-3 ">
                <BUploadInput
                  badge_value={
                    currentStep?.renewal_receipt_document?.document_id ? 1 : 0
                  }
                  variable={variable.field_06}
                  formik={formik}
                  isRequire={false}
                  document_id={0}
                  document_type={[
                    {
                      name: "Renewal Receipt",
                      code: currentStep?.renewal_receipt_document
                        ?.document_type,
                    },
                  ]}
                  apiData={currentStep?.renewal_receipt_document}
                ></BUploadInput>
              </div>
              {/* <div className="w-100-3 ">
                <BRadio
                  variable={variable.field_07}
                  formik={formik}
                  isRequire={false}
                ></BRadio>
              </div> */}
              <div className="w-100-3">
                <BUploadInput
                  badge_value={currentStep?.fs6_document?.document_id ? 1 : 0}
                  variable={variable.field_08}
                  formik={formik}
                  isRequire={false}
                  document_id={0}
                  document_type={[
                    {
                      name: "FS6",
                      code: currentStep?.fs6_document?.document_type,
                    },
                  ]}
                  apiData={currentStep?.fs6_document}
                ></BUploadInput>
              </div>
              <div className="w-100-3">
                <BUploadInput
                  badge_value={
                    currentStep?.storage_receipt_document?.document_id ? 1 : 0
                  }
                  variable={variable.medallion_storage_receipt}
                  formik={formik}
                  isRequire={false}
                  document_id={0}
                  document_type={[
                    {
                      name: "Medallion Storage Receipt",
                      code: currentStep?.storage_receipt_document
                        ?.document_type,
                    },
                  ]}
                  apiData={currentStep?.storage_receipt_document}
                ></BUploadInput>
              </div>
              {/* <div className="w-100-3 ">
                <BCalendar
                  variable={variable.field_09}
                  formik={formik}
                  isRequire={false}
                ></BCalendar>
              </div>
              <div className="w-100-3 ">
                <BCalendar
                  variable={variable.field_10}
                  formik={formik}
                  isRequire={false}
                ></BCalendar>
              </div>
              <div className="w-100-3 ">
                <BInputText
                  variable={variable.field_11}
                  formik={formik}
                  isRequire={false}
                ></BInputText>
              </div>
              <div className="w-100-3 ">
                <BInputText
                  variable={variable.field_12}
                  formik={formik}
                  isRequire={false}
                ></BInputText>
              </div>
              <div className="w-100-3 ">
                <BInputNumber
                  variable={variable.field_13}
                  formik={formik}
                  isRequire={false}
                ></BInputNumber>
              </div> */}
            </div>
          </div>
        </div>
        <div className="w-100 position-sticky bottom-0 py-3 bg-white">
          {/* <BToast ref={toast} position='top-right' /> */}
          <Button
            disabled={!formik.isValid || !formik.dirty}
            label="Submit Medallion Details"
            type="submit"
            data-testid="medallion-detail-btn"
            severity="warning"
            className="border-radius-0 primary-btn "
          />
        </div>
      </form>
    </div>
  );
};

export default MedallionDetail;
