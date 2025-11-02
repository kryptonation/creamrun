import Img from "../../../components/Img";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import BSuccessMessage from "../../../components/BSuccessMessage";
import { useEffect, useRef, useState } from "react";
import { DataTable } from "primereact/datatable";
import BModal from "../../../components/BModal";
import DownloadBtn from "../../../components/DownloadBtn";
import PDFViewer from "../../../components/PDFViewer";
import {
  useDeleteDocumentMutation,
  useGetStepInfoQuery,
  useMoveCaseDetailMutation,
} from "../../../redux/api/medallionApi";
import { Column } from "primereact/column";
import BToast from "../../../components/BToast";
import BConfirmModal from "../../../components/BConfirmModal";
import PdfViewModal from "../../../components/PdfViewModal";
import DocumentGrid from "../../../components/DocumentGrid";
import { getCurrentStep } from "../../../utils/caseUtils";

const DriverPayeeVerify = ({
  caseId,
  currentStepId,
  hasAccess,
  currentStep,
  reload,
  caseData,
}) => {
  const navigate = useNavigate();
  const [isOpen, setOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();
  const { data: stepInfoData } = useGetStepInfoQuery({
    caseNo: caseId,
    step_no: currentStepId,
  });
  const [deleteDocId, setDeleteDocId] = useState();
  const toast = useRef(null);

  console.log("Current Step", currentStep);

  useEffect(() => {
    if (isMoveDataSuccess) {
      reload();
    }
  }, [isMoveDataSuccess]);

  const [deleteFunc, { isSuccess: isDeleteSuccess }] =
    useDeleteDocumentMutation();

  const deleteTemplete = (data) => {
    setDeleteDocId(data.document_id);
    return (
      <Button
        text
        onClick={() => setDeleteOpen(true)}
        icon={() => <Img name="delete"></Img>}
      />
    );
  };

  const documentName = (data) => {
    const parts = data?.document_name?.split(".");
    const extension = parts?.pop();
    const filename = parts?.join(".");
    const img = extension === "pdf" ? "pdf" : "img";
    const path = data?.presigned_url;

    return (
      <>
        {/* <BModal>
        <BModal.ToggleButton>
          <div className="d-flex align-items-center gap-2 doc-img">
            <Img name={img}></Img>
            <p>{`${filename}.${img}`}</p>
          </div>
        </BModal.ToggleButton>
        <BModal.SideContent position={"right"}>
          <div className="">
            <div className="d-flex align-items-center justify-content-between">
              <p className="topic-txt">Lease Agreement</p>
              <DownloadBtn url={path} ext={extension} name={filename}>
                <a href={path} rel="noreferrer" title={filename} target="_blank" className="download-link ms-1 d-flex align-items-center ">
                  <Button text icon={() => <Img name="download"></Img>}></Button></a>
              </DownloadBtn>
            </div>
            {
              extension === "pdf" ? <PDFViewer url={path}></PDFViewer> :
                <div className="d-flex w-100 align-items-center justify-content-center ">
                  <img src={path} alt="" className="border border-4  border-black " />
                </div>
            }
          </div>
        </BModal.SideContent>
      </BModal> */}
        <PdfViewModal
          triggerButton={
            <div className="d-flex align-items-center gap-2 doc-img">
              <Img name={img}></Img>
              <p>{`${filename}.${img}`}</p>
            </div>
          }
          title="Upload Invoices"
          downloadUrl={path}
          downloadName={filename}
          extension={extension}
          previewUrl={path}
        />
      </>
    );
  };

  const proccedDelete = () => {
    deleteFunc(deleteDocId);
  };

  useEffect(() => {
    if (isDeleteSuccess) {
      toast.current.showToast(
        "Success",
        "Document successfully removed from system.",
        "success",
        false,
        10000
      );
    }
  }, [isDeleteSuccess]);

  return (
    <div>
      <DocumentGrid
        data={currentStep?.driver_payee_proofs}
        // requiredDocTypes={["driver_payee_proof"]}
      />
      {/* <DataTable
        value={currentStep?.driver_payee_proofs}
        className="primary-table"
        selectionMode={null}
        showGridlines={true}
        dataKey="id"
        tableStyle={{ minWidth: "50rem" }}
      >
        <Column field="document_name" header="Document Name" body={documentName} ></Column>
        <Column field="document_type" header="Document Type" sortable ></Column>
        <Column field="document_date" header="Document Date" sortable></Column>
        <Column field="document_size" header="File Size" sortable></Column>
        <Column field="comments" header="Comments" sortable></Column>
        <Column field="" header="" body={deleteTemplete}></Column>
      </DataTable> */}
      <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        <Button
          disabled={
            !hasAccess
            // ||
            // currentStep?.driver_payee_proofs[0]?.presigned_url === ""
          }
          label="Submit"
          type="button"
          onClick={() => {
            if (
              hasAccess &&
              caseData &&
              caseData.case_info.case_status !== "Closed" &&
              getCurrentStep(caseData.steps).step_id === currentStepId
            )
              moveCase({ params: caseId });
          }}
          severity="warning"
          className="border-radius-0 primary-btn "
        />
      </div>
      {/* <BSuccessMessage
        isOpen={isOpen}
        message={`Payee update is successful and approved for Driver  ${stepInfoData?.driver_info?.first_name}`}
        title="Payee update process is successful"
        onCancel={() => {
          setOpen(false); navigate('/manage-driver', { replace: true });
        }}
        onConfirm={() => {
          setOpen(false); navigate('/manage-driver', { replace: true });
        }}
      /> */}
      <BConfirmModal
        isOpen={isDeleteOpen}
        title="Confirmation on Delete Medallion"
        message="Are you sure to delete the selected Medallion?"
        onCancel={() => {
          setDeleteDocId();
          setDeleteOpen(false);
        }}
        onConfirm={() => {
          setDeleteOpen(false);
          proccedDelete();
        }}
        {...{ iconName: "red-delete" }}
      ></BConfirmModal>
      <BToast ref={toast} position="top-right" />
    </div>
  );
};

export default DriverPayeeVerify;
