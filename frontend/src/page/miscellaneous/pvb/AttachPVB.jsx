import Img from "../../../components/Img";
import { Button } from "primereact/button";
import { useEffect } from "react";
import DataTableComponent from "../../../components/DataTableComponent";
import BModal from "../../../components/BModal";
import DownloadBtn from "../../../components/DownloadBtn";
import PDFViewer from "../../../components/PDFViewer";
import { useDeleteDocumentMutation, useMoveCaseDetailMutation } from "../../../redux/api/medallionApi";
import PdfViewModal from "../../../components/PdfViewModal";
import DocumentGrid from "../../../components/DocumentGrid";

const AttachPVB = ({ caseId, reload, currentStep, hasAccess }) => {
console.log("🚀 ~ AttachPVB ~ currentStep:", currentStep)
// const [isOpen, setOpen] = useState(false)
    // const navigate = useNavigate();
    const [deleteFunc] = useDeleteDocumentMutation();
    const columns = [
        {
            field: "document_name",
            header: "Document Name",
            headerAlign: "left", sortable: true,
        },
        { field: "document_type", header: "Document Type", headerAlign: "left", sortable: true },
        { field: "document_date", header: "Document Date", headerAlign: "left", sortable: true },
        { field: "document_size", header: "File Size", sortable: true },
        { field: "document_note", header: "Comments", sortable: true },
        { field: "options", header: "" },
    ];
    const customRender = (column, rowData) => {
        if (column.field === "document_name") {
            const parts = rowData.document_name?.split('.');
            const extension = parts?.pop(); // The last element is the extension
            const filename = parts?.join('.');
            // const img = extension === "pdf" ? "pdf" : "img";;
            const path = rowData.presigned_url;
            console.log(path, rowData.document_format);

            // const path = `${process.env.REACT_APP_API_IMAGE_BASE_URL}/${rowData?.document_path}`;
            return (
                <div>
                    {/* <Img name='pdf'></Img>
                    <span style={{ marginLeft: 10 }}>{rowData.document_name}</span> */}
                    <>
                    {/* <BModal>
                        <BModal.ToggleButton>
                            <div className="d-flex align-items-center gap-2">
                                <Img name='pdf'></Img>
                                <p>{rowData.document_name}</p>
                            </div>
                        </BModal.ToggleButton>
                        <BModal.SideContent position={"right"}>
                            <div className="">
                                <div className="d-flex align-items-center justify-content-between">
                                    <p className="topic-txt">Address Proof</p>
                                    <DownloadBtn url={path} ext={extension} name={filename}>
                                        <a href={path} rel="noreferrer" title={filename} target="_blank" className="download-link ms-1 d-flex align-items-center ">
                                            <Button text icon={() => <Img name="download"></Img>}></Button></a>
                                    </DownloadBtn>
                                </div>
                                {
                                    rowData.document_format === "PDF" ? <PDFViewer url={path}></PDFViewer> :
                                        <div className="d-flex w-100 align-items-center justify-content-center ">
                                            <img src={path} alt="" className="border border-4  border-black " />
                                        </div>
                                }
                            </div>
                        </BModal.SideContent>
                    </BModal> */}
<PdfViewModal
            triggerButton={
              <div className="d-flex align-items-center gap-2">
                                <Img name='pdf'></Img>
                                <p>{rowData.document_name}</p>
                            </div>
            }
            title="Upload Invoices"
            downloadUrl={path}
            downloadName={filename}
            extension={extension}
            previewUrl={path}
          />
                    </>
                </div>
            )
        }
        else if (column.field === "options") {
            return (
                <Button text disabled={!hasAccess||!rowData?.document_id} onClick={() => rowData?.document_id&&deleteFunc(rowData?.document_id)} icon={() => <Img name="trash"></Img>} />
            )
        }

        return rowData[column.field];
    };
    const [moveCase, { isSuccess: isMoveDataSuccess }] = useMoveCaseDetailMutation();
    useEffect(() => {
        if (isMoveDataSuccess) {
            reload();
            // setOpen(true)
        }
    }, [isMoveDataSuccess])
  return (
    <div>
        <DocumentGrid  data={currentStep?.documents?[currentStep.documents] : []} />
            {/* <DataTableComponent
                columns={columns}
                paginator={false}
                data={currentStep?.documents?[currentStep.documents] : []}
                renderColumn={customRender}
            /> */}

            <div className="w-100 position-sticky bottom-0 py-3 bg-white">
                <Button
                    disabled={!hasAccess}
                    data-testid="submit-proof"
                    label="Submit Proof"
                    severity="warning"
                    className="border-radius-0 primary-btn mt-5"
                    // onClick={() => setOpen(true)}
                    onClick={() => {
                        if (hasAccess)
                            moveCase({ params: caseId })
                    }}
                />
            </div>

        </div>
  )
}

export default AttachPVB