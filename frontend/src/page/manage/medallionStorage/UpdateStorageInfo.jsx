import { updateMedallionStorage as variable } from "../../../utils/variables";
import BInputFields from "../../../components/BInputFileds";
import { Button } from "primereact/button";
import { useFormik } from "formik";
import BSuccessMessage from "../../../components/BSuccessMessage";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  useGetStepInfoQuery,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../../redux/api/medallionApi";
import { yearMonthDate } from "../../../utils/dateConverter";
import { useDispatch, useSelector } from "react-redux";
import { setIsUpload } from "../../../redux/slice/uploadSlice";
import DocumentGrid from "../../../components/DocumentGrid";

const UpdateStorageInfo = ({
  caseId,
  currentStepId,
  reload,
  currentStep,
  hasAccess,
}) => {
  console.log("currentStep", currentStep);
  const [isOpen, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: stepInfoData } = useGetStepInfoQuery({
    caseNo: caseId,
    step_no: currentStepId,
  });
  const [processFlow, { isSuccess: isProcessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();
  const [currentStepData, setcurrentStepData] = useState(currentStep);
  const dispatch = useDispatch();

  const formik = useFormik({
    initialValues: {
      storage_date: "",
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
          storage_date: yearMonthDate(values.storage_date),
        },
      };
      if (hasAccess) processFlow({ params: caseId, data: data });
    },
  });

  const isUpload = useSelector((state) => state.upload.isUpload);

  useEffect(() => {
    if (currentStepData?.storage_info && !isUpload) {
      const { storage_date } = currentStepData.storage_info;
      formik.setFieldValue(
        "storage_date",
        storage_date ? new Date(storage_date) : ""
      );
    }
    dispatch(setIsUpload(false));
  }, [currentStepData]);

  useEffect(() => {
    if (hasAccess && isProcessDataSuccess) {
      moveCase({ params: caseId });
    }
  }, [isProcessDataSuccess]);

  useEffect(() => {
    if (isMoveDataSuccess) {
      reload();
      setOpen(true);
    }
  }, [isMoveDataSuccess]);

  useEffect(() => {
    if (currentStep && stepInfoData) {
      if (stepInfoData.storage_info) {
        setcurrentStepData(stepInfoData);
      }
    }
  }, [stepInfoData]);
  useEffect(() => {
    dispatch(setIsUpload(false));
  }, []);

  const getDocumentDetails = (item) => {
    if (item.id === "uploadStorageReceipt") {
      return {
        badge_value: currentStepData?.storage_documents[0]?.document_id
          ? "1"
          : "0",
        apiData: {
          ...currentStepData?.storage_documents[0],
          notes: "Storage Receipt Notes",
        },
        document_type: [{ name: "Storage Receipt", code: "storage_receipt" }],
        object_id: currentStepData?.storage_documents[0]?.document_object_id,
      };
    } else if (item.id === "uploadAcknowledgementReceipt") {
      return {
        badge_value: currentStepData?.storage_documents[2]?.document_id
          ? "1"
          : "0",
        apiData: {
          ...currentStepData?.storage_documents[2],
          notes: "Acknowledgement Receipt Notes",
        },
        document_type: [
          {
            name: "Acknowledgement Receipt",
            code: "acknowledgement_receipt",
          },
        ],
        object_id: currentStepData?.storage_documents[2]?.document_object_id,
      };
    }
    return null; // No specific handling needed for other item IDs
  };

  return (
    <form onSubmit={formik.handleSubmit}>
      <div
        className="common-form d-flex flex-column"
      >
        <div className="form-section">
          <div
            className="form-body"
            style={{
              backgroundColor: "#EEEEEE",
              padding: 10,
              paddingBottom: 50,
            }}
          >
            <div className="d-flex align-items-center flex-wrap form-grid-1">
              {variable.map((item) => (
                <div
                  key={item.id}
                  style={{
                    marginLeft: "20px",
                    marginRight: "20px",
                    marginTop: "20px",
                    marginBottom: "20px",
                  }}
                >
                  {item.inputType === "UPLOAD" ? (
                    <BInputFields
                      {...getDocumentDetails(item)}
                      // apiData={{ ...currentStep?.step_data?.rate_card_document, notes: "demo" }}
                      variable={item}
                      formik={formik}
                    />
                  ) : (
                    <BInputFields variable={item} formik={formik} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <DocumentGrid  data={currentStepData?.storage_documents} />

      <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        <Button
          type="submit"
          disabled={!hasAccess}
          label="Submit Documents"
          severity="warning"
          className="border-radius-0 primary-btn "
        //   onClick={updateMedallionStorage}
        />
      </div>
      <BSuccessMessage
        isHtml={true}
        isOpen={isOpen}
        message={`Medallion  <strong>${currentStep?.medallion_number}</strong> is ready for storage`}
        title="Medallion Storage Process Updated"
        onCancel={() => {
          setOpen(false);
          navigate("/manage-medallion", { replace: true });
        }}
        onConfirm={() => {
          setOpen(false);
          navigate("/manage-medallion", { replace: true });
        }}
      ></BSuccessMessage>
    </form>
  );
};

export default UpdateStorageInfo;
