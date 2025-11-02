import { Button } from "primereact/button";
import { useMoveCaseDetailMutation } from "../../../redux/api/medallionApi";
import DocumentGrid from "../../../components/DocumentGrid";
import BSuccessMessage from "../../../components/BSuccessMessage";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const VechileRegister = ({ currentStep, hasAccess }) => {
  const [moveCase] = useMoveCaseDetailMutation();
  const { caseId } = useParams();
  const [isOpen, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleMoveCase = async () => {
    await moveCase({ params: caseId })
      .unwrap()
      .then(() => setOpen(true));
  };

  return (
    <>
      <DocumentGrid data={currentStep?.documents} />
      <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        <Button
          disabled={!hasAccess}
          onClick={handleMoveCase}
          label="Submit Hack-Up Details"
          severity="warning"
          className="border-radius-0 primary-btn"
        />
      </div>
      <BSuccessMessage
        isOpen={isOpen}
        message={`Vehicle Hack-Up Process is successful and approved against VIN No ${currentStep?.vehicle_info?.vin}`}
        title="Hack-Up process is successful"
        onCancel={() => {
          setOpen(false);
          navigate("/manage-vehicle", { replace: true });
        }}
        onConfirm={() => {
          setOpen(false);
          navigate("/manage-vehicle", { replace: true });
        }}
      ></BSuccessMessage>
    </>
  );
};

export default VechileRegister;
