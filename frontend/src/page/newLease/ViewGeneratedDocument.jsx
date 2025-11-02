import React, { useEffect, useState } from "react";
import Img from "../../components/Img";
import BCaseCard from "../../components/BCaseCard";
import { Button } from "primereact/button";
import PDFViewRender from "./PDFViewRender";
import BSuccessMessage from "../../components/BSuccessMessage";
import {
  medallionApi,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../redux/api/medallionApi";
import { useNavigate } from "react-router-dom";
import { getCurrentStep } from "../../utils/caseUtils";
import { useDispatch } from "react-redux";
import PDFEsignViewer from "./PDFEsignViewer";

const ViewGeneratedDocument = ({
  caseId,
  caseData,
  currentStepId,
  currentStepData,
  hasAccess,
}) => {
  const leaseType = {
    ["dov"]: 'DOV - Driver Owned Vehicle',
    ["long-term"]: 'Long Term',
    ["short-term"]: 'True weekly / Short Term',
    ["medallion-only"]: 'Medallion-Only',
    ["shift-lease"]: 'Shift Lease',
  };
  const coLease0 = currentStepData?.documents.filter(
    (item) => item?.["object_type"] === "co-leasee-0"
  );
  const coLease1 = currentStepData?.documents.filter(
    (item) => item?.["object_type"] === "co-leasee-1"
  );
  const [isOpen, setOpen] = useState(false);
  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();
  const [processFlow, { isSuccess: isProccessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    if (isMoveDataSuccess) {
      setOpen(true);
    }
  }, [isMoveDataSuccess]);

  const completeLease = () => {
    const allSigningTypes = Array.isArray(currentStepData?.documents)
      ? currentStepData.documents.map((doc) => doc.signing_type)
      : [];

    const firstSigningType =
      allSigningTypes.length > 0 ? allSigningTypes[0] : null;

    processFlow({
      params: caseId,
      data: {
        step_id: currentStepId,
        data: {
          signature_mode: firstSigningType,
        },
      },
    });
  };

  useEffect(() => {
    if (isProccessDataSuccess) {
      dispatch(medallionApi.util.invalidateTags(["caseStep"]));
    }
    if (
      isProccessDataSuccess &&
      caseData &&
      caseData.case_info.case_status !== "Closed" &&
      getCurrentStep(caseData.steps).step_id === currentStepId
    ) {
      moveCase({ params: caseId });
    }
  }, [isProccessDataSuccess]);

  return (
    <>
      <div className="w-100 h-100">
        <div className="d-flex align-items-center justify-content-between">
          <div className="topic-txt d-flex align-items-center gap-2">
            <Img name="document" className="icon-black"></Img>View Generated
            Document
          </div>
        </div>
        <div className="d-flex align-items-center gap-5 py-4 ">
          <BCaseCard label="Medallion No" value={currentStepData?.lease_case_details?.medallion_number} />
          <BCaseCard label="Medallion Owner" value={currentStepData?.lease_case_details?.medallion_owner} />
          <BCaseCard label="Vehicle VIN No" value={currentStepData?.lease_case_details?.vehicle_vin} />
          <BCaseCard
            label="Vehicle"
            value={(currentStepData?.lease_case_details?.make || "") + " " +
              (currentStepData?.lease_case_details?.model || "") + " " +
              (currentStepData?.lease_case_details?.year || "-")}
          />
          <BCaseCard label="Vehicle Plate No" value={currentStepData?.lease_case_details?.plate_number} />
          <BCaseCard label="Vehicle Type" value={currentStepData?.lease_case_details?.vehicle_type.replace("Wav", "WAV")} />
          <BCaseCard label="Lease Type" value={
            currentStepData?.lease_case_details?.lease_type === "shift-lease"
              ? `${leaseType[currentStepData?.lease_case_details?.lease_type]} - ${currentStepData?.lease_case_details?.vehicle_availability || ""}`
              : leaseType[currentStepData?.lease_case_details?.lease_type]
          } />
        </div>
        <div className="d-flex flex-column cus-gap-5">
          <p className="regular-semibold-text pb-3 ">Lease Documents</p>
          <div className="d-flex align-items-center gap-4">
            {coLease0.map((item, idx) => {
              return <PDFEsignViewer key={idx} item={item} />;
            })}
          </div>
          {/* {coLease1.length ? <><p className="regular-semibold-text pb-3 ">Co-Lessee 2 Documents</p>
          <div className='d-flex align-items-center gap-4'>
            {
              coLease1.map((item, idx) => {
                return <PDFEsignViewer key={idx} item={item} />
              })
            }
          </div></> : null} */}
        </div>
        <div
          className="w-100 position-fixed bottom-0 py-3 mt-5 bg-white"
          style={{ zIndex: 1050 }}
        >
          <Button
            label="Complete Lease"
            disabled={!hasAccess || caseData.case_info.case_status === "Closed"}
            onClick={completeLease}
            type="submit"
            severity="warning"
            className="border-radius-0 primary-btn "
          />
        </div>
      </div>
      <BSuccessMessage
        isOpen={isOpen}
        message={`Lease completion process is successful for Medallion No ${currentStepData?.lease_case_details?.medallion_number} .`}
        title="Lease Completion Successful"
        onCancel={() => {
          setOpen(false);
          navigate("/manage-lease", { replace: true });
        }}
        onConfirm={() => {
          setOpen(false);
          navigate("/manage-lease", { replace: true });
        }}
      />
    </>
  );
};

export default ViewGeneratedDocument;
