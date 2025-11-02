import Img from "../../../components/Img";
import { useFormik } from "formik";
import { retrieveMedallionStorage as variable } from "../../../utils/variables";
import BInputFields from "../../../components/BInputFileds";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import BSuccessMessage from "../../../components/BSuccessMessage";
import { useEffect, useState } from "react";
import BModal from "../../../components/BModal";
import BUpload from "../../../components/BUpload";
import {
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
  useUploadDocumentMutation,
} from "../../../redux/api/medallionApi";
import BAttachedFile from "../../../components/BAttachedFile";
import { yearMonthDate } from "../../../utils/dateConverter";
import { removeUnderScore } from "../../../utils/utils";
import { setIsUpload } from "../../../redux/slice/uploadSlice";
import { useDispatch, useSelector } from "react-redux";
import { useLazyGetUsersDataQuery } from "../../../redux/api/authAPI";

const MedallionRetrieve = ({
  caseId,
  currentStepId,
  reload,
  currentStep,
  hasAccess,
}) => {
  console.log("🚀 ~ currentStep:", currentStep);
  const [isOpen, setOpen] = useState(false);
  const [uploadDoc] = useUploadDocumentMutation();
  const dispatch = useDispatch();

  const isUpload = useSelector((state) => state.upload.isUpload);

  const [processFlow, { isSuccess: isProcessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();

  const [triggerGetUsersData, { data: user, isUserApiSuccess }] =
    useLazyGetUsersDataQuery();
  const [retrievedByOptions, setRetrievedByOptions] = useState([]);
  useEffect(() => {
    if (user) {
      console.log("User List", user);
      const filteredOptions = user?.items
        .filter((item) => !!item.first_name)
        .map((item) => ({
          name: item.first_name,
          code: item.id,
        }));
      setRetrievedByOptions(filteredOptions);
    }
  }, [isUserApiSuccess, user]);

  // 🔹 Call API on page load
  useEffect(() => {
    if (caseId && currentStepId) {
      triggerGetUsersData("");
    }
  }, [caseId, currentStepId]);

  const navigate = useNavigate();
  const formik = useFormik({
    initialValues: {
      retrievedBy: "",
      retrievalDate: "",
    },
    validateOnChange: true,
    validate: (values) => {
      const errors = {};
      if (!values[variable?.[0].id]) {
        errors[variable?.[0].id] = `${variable?.[0].label} is required`;
      }
      if (!values[variable?.[1].id]) {
        errors[variable?.[1].id] = `${variable?.[1].label} is required`;
      }

      console.log("🚀 ~ errors:", errors);
      return errors;
    },
    onSubmit: (values) => {
      const data = {
        step_id: currentStepId,
        data: {
          medallion_number: currentStep?.medallion_info?.medallion_number,
          retrieval_date: yearMonthDate(values.retrievalDate),
          retrieved_by: values.retrievedBy?.name,
        },
      };
      console.log("Payload", data);
      if (hasAccess) processFlow({ params: caseId, data: data });
    },
  });

  const completeStep = () => {
    if (hasAccess && isProcessDataSuccess) moveCase({ params: caseId });
  };

  useEffect(() => {
    if (isProcessDataSuccess) {
      reload();
      completeStep();
    }
  }, [isProcessDataSuccess]);

  useEffect(() => {
    if (isMoveDataSuccess) {
      setOpen(true);
    }
  }, [isMoveDataSuccess]);

  useEffect(() => {
    if (currentStep?.storage_info && !isUpload) {
      const { retrieval_date, retrieved_by } = currentStep.storage_info;
      // formik.setFieldValue(
      //   "retrievedBy",
      //   retrievedByOptions?.filter((item) => item?.code === retrieved_by)[0],
      //   false
      // );
      retrieval_date &&
        formik.setFieldValue("retrievalDate", new Date(retrieval_date));
    }
    // dispatch(setIsUpload(false));
  }, [currentStep]);

  // useEffect(() => {
  //   dispatch(setIsUpload(false));
  // }, []);

  const getDynamicVariable = () => {
    return variable.map((item) => {
      if (item.id === "retrievedBy") {
        return {
          ...item,
          options: retrievedByOptions,
        };
      }
      return item;
    });
  };

  return (
    <div>
      <form
        className="common-form d-flex flex-column"
        onSubmit={formik.handleSubmit}
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
            <div className="d-flex align-items-center flex-wrap form-grid-1 p-3">
              {getDynamicVariable().map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    marginLeft: "20px",
                    marginRight: "20px",
                    marginTop: "20px",
                    marginBottom: "20px",
                  }}
                >
                  <BInputFields variable={item} formik={formik} />
                </div>
              ))}
            </div>
            {/* <div className="p-3">
              <BModal>
                <BModal.ToggleButton>
                  <Button
                    disabled={!hasAccess}
                    text
                    data-testid="upload-renewal-receipt"
                    label="Upload Storage Receipt"
                    className="text-black gap-2"
                    type="button"
                    icon={() => <Img name="upload" />}
                  />
                </BModal.ToggleButton>
                <BModal.Content>
                  <BUpload
                    data={{
                      ...currentStep?.storage_receipt_document,
                      notes: "demo",
                    }}
                    action={uploadDoc}
                    object_type={
                      currentStep?.storage_receipt_document
                        ?.document_object_type
                    }
                    document_id={
                      currentStep?.storage_receipt_document?.document_id
                    }
                    object_id={currentStep?.medallion_info?.medallion_id}
                    document_type={[
                      {
                        name: removeUnderScore(
                          currentStep?.storage_receipt_document?.document_type
                        ),
                        code: currentStep?.storage_receipt_document
                          ?.document_type,
                      },
                    ]}
                  ></BUpload>
                </BModal.Content>
              </BModal>
              {currentStep?.storage_receipt_document?.document_id && (
                <BAttachedFile
                  file={{
                    name: currentStep?.storage_receipt_document?.document_name,
                    path: currentStep?.storage_receipt_document?.presigned_url,
                    id: currentStep?.storage_receipt_document?.document_id,
                    document_type:
                      currentStep?.storage_receipt_document?.document_type,
                  }}
                ></BAttachedFile>
              )}
            </div> */}
          </div>
        </div>
        <div className="w-100 position-sticky bottom-0 py-3 bg-white">
          <Button
            disabled={!hasAccess}
            type="submit"
            label="Submit Retrieve Details"
            severity="warning"
            className="border-radius-0 primary-btn "
            // onClick={() => processCurrentFlow()}
          />
        </div>
      </form>
      <BSuccessMessage
        isOpen={isOpen}
        message={`Medallion ${currentStep?.medallion_info?.medallion_number} is ready for retrieval`}
        title="Medallion Retrieve process successful"
        onCancel={() => {
          setOpen(false);
          navigate("/manage-medallion", { replace: true });
        }}
        onConfirm={() => {
          setOpen(false);
          navigate("/manage-medallion", { replace: true });
        }}
      ></BSuccessMessage>
    </div>
  );
};

export default MedallionRetrieve;
