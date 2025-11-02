import { Button } from "primereact/button";
import Img from "../../components/Img";
import BModal from "../../components/BModal";
import BCaseCard from "../../components/BCaseCard";
import {
  useGetStepInfoQuery,
  useMoveCaseDetailMutation,
} from "../../redux/api/medallionApi";
import BUpload from "../../components/BUpload";
import { getCurrentStep } from "../../utils/caseUtils";
import DocumentGrid from "../../components/DocumentGrid";
import { removeUnderScore } from "../../utils/utils";

const VehicleVerifyDocument = ({
  caseId,
  caseData,
  reload,
  currentStepId,
  currentStep,
  hasAccess,
}) => {
  const [moveCase] = useMoveCaseDetailMutation();
  const { data: stepInfoData } = useGetStepInfoQuery({
    caseNo: caseId,
    step_no: currentStepId,
  });

  const caseMoveFunc = () => {
    if (
      hasAccess &&
      caseData &&
      caseData.case_info.case_status !== "Closed" &&
      getCurrentStep(caseData.steps).step_id === currentStepId
    ) {
      moveCase({ params: caseId })
        .unwrap()
        .then(() => {
          reload();
        });
    }
  };

  const removeUnderScorefilterGenerate = (data) => {
    if (!data) {
      return [];
    }
    return data?.map((item) => {
      if (!item) return;
      return { code: item, name: removeUnderScore(item) };
    });
  };

  return (
    <div>
      <div className="topic-txt d-flex align-items-center gap-2">
        <Img name="document" className="icon-black"></Img>Verify Documents
        {/* <BModal>
          <BModal.ToggleButton>
            <Button
              outlined
              text
              label="Upload Documents"
              data-testid="upload-documents"
              className="text-blue gap-2 outline-btn upload-common-btn fs-16-semibold d-flex ms-auto"
              type="button"
              icon={() => <Img name="uploaddoc" />}
            />
          </BModal.ToggleButton>
          <BModal.Content>
            <BUpload
              // data={{ ...currentStep?.signed_lease_document }}
              object_type={currentStep?.object_type}
              object_id={currentStep?.vehicle_details?.vehicle?.id}
              document_id={0}
              document_type={removeUnderScorefilterGenerate(
                currentStep?.document_type
              )}
              // document_type={[
              //   { name: 'Document 1', code: 'vehicle_type' },
              //   { name: 'Document 2', code: 'document2' },
              //   { name: 'Document 3', code: 'document3' },
              // ]}
            />
          </BModal.Content>
        </BModal> */}
      </div>
      <div className="d-flex align-items-center gap-5 py-4 ">
        <BCaseCard
          label="Entity Name "
          value={currentStep?.vehicle_details?.vehicle?.entity_name}
        />
        <BCaseCard
          label="VIN No"
          value={currentStep?.vehicle_details?.vehicle?.vin}
        />
        <BCaseCard
          label="Vehicle Make"
          value={currentStep?.vehicle_details?.vehicle?.make}
        />
        <BCaseCard
          label="Model"
          value={currentStep?.vehicle_details?.vehicle?.model}
        />
        <BCaseCard
          label="Year"
          value={currentStep?.vehicle_details?.vehicle?.year}
        />
        <BCaseCard
          label="Vehicle Type"
          value={currentStep?.vehicle_details?.vehicle?.vehicle_type}
        />
      </div>
      <DocumentGrid data={stepInfoData?.vehicle_documents}></DocumentGrid>
      <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        <Button
          disabled={!hasAccess}
          label="Verify Documents"
          data-testId="verify-documents-submit"
          type="button"
          onClick={caseMoveFunc}
          severity="warning"
          className="border-radius-0 primary-btn "
        />
      </div>
    </div>
  );
};

export default VehicleVerifyDocument;
