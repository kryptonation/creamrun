import React, { useEffect, useState } from "react";
import Img from "../../components/Img";
import BCaseCard from "../../components/BCaseCard";
import { Button } from "primereact/button";
import PDFViewRender from "../newLease/PDFViewRender";
import BSuccessMessage from "../../components/BSuccessMessage";
import {
  medallionApi,
  useGetStepInfoQuery,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../redux/api/medallionApi";
import { useNavigate } from "react-router-dom";
import { getCurrentStep } from "../../utils/caseUtils";
import { useDispatch } from "react-redux";
import PDFEsignViewer from "../newLease/PDFEsignViewer";
import "../newLease/_b-new-lease.scss";

const AdditionalDriverViewGeneratedDocument = ({
  caseId,
  caseData,
  currentStepId,
  currentStepData,
  hasAccess,
  reload,
}) => {
  const leaseType = {
    ["dov"]: "DOV - Driver Owned Vehicle",
    ["long-term"]: "Long Term",
    ["short-term"]: "True weekly / Short Term",
    ["medallion-only"]: "Medallion-Only",
  };
  // const coLease0 = stepInfoData?.documents.filter(
  //   (item) => item?.["object_type"] === "co-leasee-0"
  // );
  const { data: stepInfoData, refetch: refetchStepInfo } = useGetStepInfoQuery(
    { caseNo: caseId, step_no: currentStepId }
    // { skip: !currentStepId || !caseId }
  );
  const [additionalDriverDocs, setAdditionalDriverDocs] = useState([]);
  useEffect(() => {
    // if (stepInfoData) {
    //   const filteredDocs = stepInfoData?.documents.filter(
    //     (item) =>
    //       item?.["object_type"] ===
    //       `ad-${stepInfoData?.documents[0]?.driver_id}`
    //   );
    //   setAdditionalDriverDocs(filteredDocs);
    // }
    if (stepInfoData?.documents?.length) {
      const filteredDocs = stepInfoData?.documents
        .filter(
          (item) =>
            item?.object_type === `ad-${stepInfoData?.documents[0]?.driver_id}`
        )
        .map((doc) => ({
          ...doc,
          document_type: "Additional Driver Form",
        }));

      setAdditionalDriverDocs(filteredDocs);
    }
  }, [stepInfoData]);
  // const coLease0 = stepInfoData?.documents.filter(
  //   (item) =>
  //     item?.["object_type"] === `ad-${stepInfoData?.documents[0]?.driver_id}`
  // );
  const coLease1 = stepInfoData?.documents.filter(
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
    console.log("refetching step info", stepInfoData);
  }, [stepInfoData]);

  useEffect(() => {
    if (isMoveDataSuccess) {
      setOpen(true);
      reload();
    }
  }, [isMoveDataSuccess]);

  const completeLease = () => {
    const allSigningTypes = Array.isArray(stepInfoData?.documents)
      ? stepInfoData?.documents.map((doc) => doc.signing_type)
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
        <div className="d-flex flex-column cus-gap-5">
          <div className="d-flex align-items-center gap-4">
            {additionalDriverDocs.map((item, idx) => {
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
      </div>
      <div
        className="w-100 position-fixed bottom-0 py-3 mt-5 bg-white"
        style={{ zIndex: 1050 }}
      >
        <Button
          label="Complete"
          disabled={!hasAccess || caseData.case_info.case_status === "Closed"}
          onClick={completeLease}
          type="submit"
          severity="warning"
          className="border-radius-0 primary-btn "
        />
      </div>
      <BSuccessMessage
        isOpen={isOpen}
        message={`Additional Driver is successfully added for Lease ID ${stepInfoData?.lease_case_details?.lease_id} .`}
        title="Additional Driver Added Successful"
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

export default AdditionalDriverViewGeneratedDocument;
