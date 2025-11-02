import { Button } from "primereact/button";
import { useFormik } from "formik";
import { updateMedallionDetail as variable } from "../../utils/variables";
import BCalendar from "../../components/BCalendar";
import BRadio from "../../components/BRadio";
import BSelect from "../../components/BSelect";
import BUploadInput from "../../components/BUploadInput";
import { useNavigate, useParams } from "react-router-dom";
import {
  useGetStepInfoQuery,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../redux/api/medallionApi";
import { useEffect } from "react";
import { yearMonthDate } from "../../utils/dateConverter";
import BSuccessMessage from "../../components/BSuccessMessage";

const UpdateMedallion = ({ currentStepId }) => {
  const params = useParams();
  const [processFlow, { isSuccess: isProccessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [moveCase, { isSuccess: isMoveSucess }] = useMoveCaseDetailMutation();
  console.log("🚀 ~ UpdateMedallion ~ isMoveSucess:", isMoveSucess);
  const { data: stepInfoData, isSuccess: isStepInfoSuccess } =
    useGetStepInfoQuery({ caseNo: params["caseId"], step_no: currentStepId });
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: {
      [variable.field_02.id]: "",
      [variable.field_06.id]: "",
      [variable.field_07.id]: false,
      [variable.field_10.id]: "",
    },
    validateOnChange: true,
    validate: (values) => {
      const errors = {};

      if (!values[variable.field_02.id]) {
        errors[variable.field_02.id] = `${variable.field_02.label} is required`;
      }

      return errors;
    },
    onSubmit: (values) => {
      const { first_signed, ...restValues } = values; // Remove first_signed
      const updatedValues = {
        ...restValues,
        medallionType: restValues?.medallionType?.code,
      };
      console.log("🚀 ~ UpdateMedallion ~ values:", values);
      processFlow({
        params: params["caseId"],
        data: {
          step_id: currentStepId,
          data: {
            ...updatedValues,
            firstSignedDate: yearMonthDate(first_signed), // Use the extracted first_signed
            isStorage: updatedValues.isStorage,
          },
        },
      });
    },
  });

  useEffect(() => {
    if (isProccessDataSuccess) {
      // refetch()
      moveCase({ params: params["caseId"] });
    }
    // if (isProccessDataSuccess && getCurrentStep(getCaseData?.steps).step_id == activeComponent && getCurrentStep(getCaseData?.steps).is_current_step) {
    //   moveCase({ params: params["case-id"] })
    // }
  }, [isProccessDataSuccess]);

  useEffect(() => {
    if (isStepInfoSuccess) {
      formik.setFieldValue(
        variable.field_02.id,
        stepInfoData?.medallion_type &&
          variable.field_02.options.filter(
            (item) => item.code === stepInfoData?.medallion_type
          )[0],
        true
      );
      formik.setFieldValue(
        [variable.field_06.id],
        stepInfoData?.[variable.field_06?.id]
          ? new Date(stepInfoData?.[variable.field_06?.id])
          : "",
        true
      );
      // formik.setFieldValue([variable.field_07.id], new Date(stepInfoData?.[variable.field_07.id]),true);
      formik.setFieldValue(
        [variable.field_10.id],
        stepInfoData?.first_signed ? new Date(stepInfoData?.first_signed) : "",
        true
      );
    }
  }, [isStepInfoSuccess]);

  return (
    <form
      action=""
      className="common-form d-flex flex-column gap-5"
      onSubmit={formik.handleSubmit}
    >
      <div className="form-section">
        <div className="form-body">
          <div
            className="d-flex align-items-center flex-wrap form-grid-1 w-75 p-3"
            style={{ rowGap: "4rem", gap: "4rem 1rem" }}
          >
            <div className="w-100-3 ">
              <BSelect
                variable={variable.field_02}
                formik={formik}
                isRequire={true}
              ></BSelect>
            </div>
            <div className="w-100-3 ">
              <BUploadInput
                badge_value={
                  stepInfoData?.renewal_receipt_document?.document_id ? 1 : 0
                }
                variable={variable.field_06}
                formik={formik}
                isRequire={false}
                document_id={0}
                document_type={[
                  { name: "Renewal Receipt", code: "renewal_receipt" },
                ]}
                apiData={stepInfoData?.renewal_receipt_document}
              ></BUploadInput>
            </div>
            <div className="w-100-3 ">
              <BRadio
                variable={variable.field_07}
                formik={formik}
                isRequire={false}
              ></BRadio>
            </div>
            {/* <div className="w-100-3 ">
                <BUploadInput badge_value={stepInfoData?.fs6_document?.document_id ? 1 : 0} variable={variable.field_08} formik={formik} isRequire={false} document_id={0}
                  document_type={[
                    { name: 'FS6', code: 'fs6' },
                  ]} apiData={stepInfoData?.fs6_document}></BUploadInput>
              </div> */}
            <div className="w-100-3 ">
              <BCalendar
                variable={variable.field_10}
                formik={formik}
                isRequire={false}
              ></BCalendar>
            </div>
          </div>
        </div>
      </div>
      <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        {/* <BToast ref={toast} position='top-right' /> */}
        <Button
          label="Submit"
          type="submit"
          data-testid="medallion-detail-btn"
          // onClick={() => {
          //   formik.handleSubmit();
          // }}
          severity="warning"
          className="border-radius-0 primary-btn "
        />
      </div>

      <BSuccessMessage
        isOpen={isMoveSucess}
        message={`Medallion ${stepInfoData?.medallion_number} update is successful`}
        title="Medallion updated Successful"
        onCancel={() => {
          navigate("/manage-medallion");
        }}
        onConfirm={() => {
          navigate("/manage-medallion");
        }}
      ></BSuccessMessage>
    </form>
  );
};

export default UpdateMedallion;
