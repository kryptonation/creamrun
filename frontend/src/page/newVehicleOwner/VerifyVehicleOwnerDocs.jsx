import { useEffect, useState } from "react";
import DocumentGrid from "../../components/DocumentGrid";
import {
  useGetStepInfoQuery,
  useMoveCaseDetailMutation,
} from "../../redux/api/medallionApi";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import BSuccessMessage from "../../components/BSuccessMessage";
import BAttachedFile from "../../components/BAttachedFile";

const VerifyVehicleOwnerDocs = ({
  caseId,
  currentStepId,
  reload,
  hasAccess,
}) => {
  const navigate = useNavigate();
  const [isOpen, setOpen] = useState(false);
  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();
  const { data: stepInfoData } = useGetStepInfoQuery({
    caseNo: caseId,
    step_no: currentStepId,
  });
  console.log("Verify Vehicle Owner Doc", stepInfoData, isMoveDataSuccess);
  const requiredTypes = ["ein"];
  const requiredDocs = stepInfoData?.documents?.filter((doc) =>
    requiredTypes.includes(doc?.document_type)
  );
  console.log(requiredDocs);

  // Checkbox is enabled ONLY if ALL required docs have either id or presigned url
  var allRequiredDocsValid =
    requiredDocs?.length === requiredTypes?.length &&
    requiredDocs.every((doc) => doc?.document_id || doc?.presigned_url);

  useEffect(() => {
    if (isMoveDataSuccess) {
      setOpen(true);
      reload();
    }
  }, [isMoveDataSuccess]);

  return (
    // <div className="common-layout w-100 h-100 d-flex flex-column gap-3">
    <div>
      {/* <p className="text-grey">Verify Documents</p> */}
      {/* {stepInfoData?.documents[2] && (
        <div className="w-max-content">
          <BAttachedFile
            file={{
              name: stepInfoData?.documents[2].document_name,
              path: stepInfoData?.documents[2].presigned_url,
              id: stepInfoData?.documents[2].document_id,
            }}
          ></BAttachedFile>
        </div>
      )} */}
      {stepInfoData ? (
        <DocumentGrid
          // data={stepInfoData.documents.filter(
          //   (doc) =>
          //     doc &&
          //     doc?.document_type &&
          //     doc?.presigned_url &&
          //     doc?.presigned_url.trim() !== ""
          // )}
          data={stepInfoData?.documents}
          requiredDocTypes={requiredTypes}
        ></DocumentGrid>
      ) : null}
      <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        <Button
          label="Submit Document"
          type="button"
          data-testid="submit-btn"
          disabled={!hasAccess || !allRequiredDocsValid}
          onClick={() => {
            if (hasAccess) moveCase({ params: caseId });
          }}
          severity="warning"
          className="border-radius-0 primary-btn "
        />
      </div>
      {/* <BSuccessMessage
        isOpen={isOpen}
        message={`Create New Vehicle Owner is successful and approved`}
        title="Create New Vehicle Owner process is successful"
        onCancel={() => {
          setOpen(false);
          navigate("/manage-vehicle-owner", { replace: true });
        }}
        onConfirm={() => {
          setOpen(false);
          navigate("/manage-vehicle-owner", { replace: true });
        }}
        isHtml={true}
      /> */}
    </div>
  );
};

export default VerifyVehicleOwnerDocs;
