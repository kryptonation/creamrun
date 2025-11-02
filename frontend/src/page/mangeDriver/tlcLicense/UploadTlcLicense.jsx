import Img from "../../../components/Img";
import { Button } from "primereact/button";
import { useEffect, useRef, useState } from "react";
import { DataTable } from "primereact/datatable";
import BModal from "../../../components/BModal";
import DownloadBtn from "../../../components/DownloadBtn";
import PDFViewer from "../../../components/PDFViewer";
import {
  useDeleteDocumentMutation,
  useMoveCaseDetailMutation,
} from "../../../redux/api/medallionApi";
import { Column } from "primereact/column";
import BConfirmModal from "../../../components/BConfirmModal";
import BToast from "../../../components/BToast";
import PdfViewModal from "../../../components/PdfViewModal";
import DocumentGrid from "../../../components/DocumentGrid";
import { getCurrentStep } from "../../../utils/caseUtils";

const UploadTlcLicense = ({
  caseId,
  currentStep,
  hasAccess,
  reload,
  currentStepId,
  caseData,
}) => {
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [deleteDocId, setDeleteDocId] = useState();
  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();
  const toast = useRef(null);

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
        disabled={!hasAccess}
        text
        onClick={() => setDeleteOpen(true)}
        icon={() => <Img name="delete"></Img>}
      />
    );
  };

  const documentName = (data) => {
    const parts = data?.document_name?.split(".");
    const extension = parts?.pop(); // The last element is the extension
    const filename = parts?.join(".");
    // const [filename, extension] = splitFileName("https://projects.wojtekmaj.pl/react-pdf/assets/sample-8bb8af10.pdf");
    const img = extension === "pdf" ? "pdf" : "img";
    // const path=`${process.env.REACT_APP_API_IMAGE_BASE_URL}/${data?.document_path}`;
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
                  <Button disabled={!hasAccess} text icon={() => <Img name="download"></Img>}></Button></a>
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
        data={[currentStep?.tlc_license_document]}
        requiredDocTypes={["tlc_license"]}
      />
      {/* <DataTable
        value={currentStep?.driver_info_address_proofs}
        className="primary-table"
        selectionMode={null}
        showGridlines={true}
        dataKey="id"
        tableStyle={{ minWidth: "50rem" }}
      >
        <Column field="document_name" header="Document Name" body={documentName}  sortable></Column>
        <Column field="document_type" header="Document Type" sortable ></Column>
        <Column field="document_date" header="Document Date" sortable></Column>
        <Column field="document_size" header="File Size" sortable></Column>
        <Column field="comments" header="Comments" sortable></Column>
        <Column field="" header="" body={deleteTemplete}></Column>
      </DataTable> */}
      <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        <Button
          disabled={
            !hasAccess || currentStep?.tlc_license_document?.document_id === ""
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
        message={`Address update is success and approved for Driver ${stepInfoData?.driver_info?.first_name}`}
        title="Driver Address update process is successful"
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

export default UploadTlcLicense;
