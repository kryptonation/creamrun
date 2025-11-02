import { Button } from "primereact/button";
import BCaseCard from "../../../components/BCaseCard";
import { tlcDriverUpdateLicense as variable } from "../../../utils/variables";
import BAttachedFile from "../../../components/BAttachedFile";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  useGetStepInfoQuery,
  useMoveCaseDetailMutation,
} from "../../../redux/api/medallionApi";
import BSuccessMessage from "../../../components/BSuccessMessage";
import { yearMonthDate } from "../../../utils/dateConverter";
const ViewTlcLicense = ({ caseId, currentStepId, currentStep, hasAccess }) => {
  const data = currentStep?.tlc_license_info;
  const [isOpen, setOpen] = useState(false);
  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();
  const navigate = useNavigate();
  const { data: stepInfoData } = useGetStepInfoQuery({
    caseNo: caseId,
    step_no: currentStepId,
  });
  console.log(
    "Step Info Data",
    stepInfoData,
    stepInfoData?.driver_info?.tlc_license
  );
  useEffect(() => {
    if (isMoveDataSuccess) {
      setOpen(true);
    }
  }, [isMoveDataSuccess]);
  return (
    // <div>
    <div className="common-form d-flex flex-column w-100">
      <div className="form-section">
        <div className="form-body">
          <div className="form-body d-flex flex-column common-gap">
            <div className="d-flex align-items-center flex-wrap form-grid-1 w-75">
              <div className="w-100-3">
                <BCaseCard
                  label={variable?.[0]?.label}
                  value={data[variable?.[0]?.id]}
                ></BCaseCard>
              </div>
              <div className="w-100-3">
                <BCaseCard
                  label={variable?.[1]?.label}
                  value={data[variable?.[1]?.id]}
                ></BCaseCard>
              </div>
              <div className="w-100-3">
                <BCaseCard
                  label={variable?.[2]?.label}
                  value={yearMonthDate(data[variable?.[2]?.id])}
                ></BCaseCard>
              </div>
              <div className="w-100-3">
                <BCaseCard
                  label={variable?.[3]?.label}
                  value={yearMonthDate(data[variable?.[3]?.id])}
                ></BCaseCard>
              </div>
              <div className="w-100-3">
                <BCaseCard
                  label={"Previous TLC License No"}
                  value={stepInfoData?.driver_info?.tlc_license}
                ></BCaseCard>
              </div>
              <div className="w-100-3">
                <BCaseCard
                  label={variable?.[4]?.label}
                  value={yearMonthDate(data[variable?.[4]?.id])}
                ></BCaseCard>
              </div>
            </div>
            <div className="w-50">
              {currentStep?.tlc_license_document?.document_name && (
                <BAttachedFile
                  file={{
                    name: currentStep?.tlc_license_document?.document_name,
                    path: currentStep?.tlc_license_document?.presigned_url,
                    id: currentStep?.tlc_license_document?.document_id,
                    document_type:
                      currentStep?.tlc_license_document?.document_type,
                  }}
                ></BAttachedFile>
              )}
            </div>
            {/* {stepInfoData?.signed_lease_document?.document_name&&
          <BAttachedFile file={{name:stepInfoData?.signed_lease_document?.document_name,
          path: stepInfoData?.signed_lease_document?.document_path,id:stepInfoData?.signed_lease_document?.document_id}}></BAttachedFile>} */}
          </div>
        </div>
      </div>
      <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        {
          <Button
            disabled={!hasAccess}
            label="Update TLC License"
            type="type"
            onClick={() => {
              if (hasAccess) moveCase({ params: caseId });
            }}
            severity="warning"
            className="border-radius-0 primary-btn "
          />
        }
      </div>
      <BSuccessMessage
        isOpen={isOpen}
        message={`TLC License update is successful and approved for Driver 
                 ${stepInfoData?.driver_info?.first_name}`}
        title="TLC License update process is successful"
        onCancel={() => {
          setOpen(false);
          navigate("/manage-driver", { replace: true });
        }}
        onConfirm={() => {
          setOpen(false);
          navigate("/manage-driver", { replace: true });
        }}
      />
    </div>
    // </div>
  );
};

export default ViewTlcLicense;
