
import { DataTable } from "primereact/datatable"
import Img from "../../../components/Img"
import { Column } from "primereact/column"
import BModal from "../../../components/BModal"
import DownloadBtn from "../../../components/DownloadBtn"
import PDFViewer from "../../../components/PDFViewer"
import { Button } from "primereact/button"
import BConfirmModal from "../../../components/BConfirmModal"
import BToast from "../../../components/BToast"
import { useEffect, useRef, useState } from "react"
import { medallionApi, useDeleteDocumentMutation, useGetStepInfoQuery, useMoveCaseDetailMutation, useProcessCaseDeatilMutation } from "../../../redux/api/medallionApi"
import { useDispatch } from "react-redux"
import { yearMonthDate } from "../../../utils/dateConverter"
import EnvelopeLink from "../../newLease/EnvelopeLink"
import PdfViewModal from "../../../components/PdfViewModal"

const ViewDocAndSignLease = ({ caseId, currentStepId, hasAccess, reload }) => {
  const dispatch = useDispatch();
    const [processFlow, { isSuccess: isProccessDataSuccess }] = useProcessCaseDeatilMutation();
    const [moveCase] = useMoveCaseDetailMutation();
    const documentName = (data) => {
        const parts = data?.document_name?.split('.');
        const extension = data?.document_format;
        const filename = parts.join('.');
        const img = extension === "PDF" ? "pdf" : "img";;
        const path = data?.presigned_url;
        const name = data?.document_name;
        return (
         <PdfViewModal
            triggerButton={
               <div className="d-flex align-items-center gap-2 doc-img">
                        <Img name={img}></Img>
                        <p className="three-dot-text">{name}</p>
                    </div>
            }
            downloadUrl={path}
            downloadName={filename}
            extension={extension}
            previewUrl={path}
          />
        );
    };
    const [isOpen, setOpen] = useState(false)
    const linkTemplete = (data) => {
        return <EnvelopeLink id={data.document_envelope_id}></EnvelopeLink>;
    };
    const [deleteFunc] = useDeleteDocumentMutation();
    const toast = useRef(null);
    const [deleteDocId, setDeleteDocId] = useState();
    const { data: stepInfoData } = useGetStepInfoQuery({ caseNo: caseId, step_no: currentStepId }, { skip: !currentStepId || !caseId });

    useEffect(() => {
        if (isProccessDataSuccess) {
            dispatch(medallionApi.util.invalidateTags(['caseStep']))
        }
    }, [isProccessDataSuccess]);

    const proccedDelete = () => {
        deleteFunc(deleteDocId)
    }

    const activeIndaction = (data) => {
        if (data.has_front_desk_signed || data.has_driver_signed) {
            return <Img name="ic_step_success" className="text-white success-icon"></Img>
        }
        return "-"
    }
    const dateFormate = (data) => {
        if (data.document_date) {
            return yearMonthDate(data.document_date)
        }
        return "-"
    }

    const submitHandler = () => {
        processFlow({
            params: caseId, data: {
                step_id: currentStepId,
                data: {
                }
            }
        })
    }
    const submitMoveHandler = () => {
        moveCase({ params: caseId }).unwrap().then(() => {
            reload();
        })
    }
    const coLease0 = Array.isArray(stepInfoData?.documents)?stepInfoData?.documents?.filter(item => item?.["object-type"] === "co-leasee-0"):[]
    const coLease1 = Array.isArray(stepInfoData?.documents)?stepInfoData?.documents?.filter(item => item?.["object-type"] === "co-leasee-1"):[]
    const allSigned = Array.isArray(stepInfoData?.documents)?stepInfoData?.documents?.every(item => item.has_front_desk_signed || item.has_driver_signed):[]

    return (
        <div className='w-100 h-100'>
            <p className="regular-semibold-text">Co-Lessee 1</p>
            <DataTable
                value={coLease0}
                className="primary-table"
                selectionMode={null}
                showGridlines={true}
                dataKey="id"
                tableStyle={{ minWidth: "50rem" }}
            >
                <Column field="document_name" header="Document Name" body={documentName} ></Column>
                <Column field="BATM" header="BATM" body={activeIndaction}></Column>
                <Column field="Lessee" header="Lessee" body={activeIndaction}></Column>
                <Column field="document_type" header="Document Type"></Column>
                <Column field="document_date" header="Document Date" body={dateFormate}></Column>
                <Column field="file_size" header="File Size"></Column>
                <Column field="comments" header="Comments"></Column>
                <Column field="" header="" body={linkTemplete}></Column>
            </DataTable>
            {coLease1?.length ? <>
                <p className="regular-semibold-text mt-5">Co-Lessee 2</p>
                <DataTable
                    value={coLease1}
                    className="primary-table"
                    selectionMode={null}
                    showGridlines={true}
                    dataKey="id"
                    tableStyle={{ minWidth: "50rem" }}
                >
                    <Column field="document_name" header="Document Name" body={documentName} ></Column>
                    <Column field="BATM" header="BATM" body={activeIndaction}></Column>
                    <Column field="Leasee" header="Lease" body={activeIndaction}></Column>
                    <Column field="document_type" header="Document Type"></Column>
                    <Column field="document_date" header="Document Date" body={dateFormate}></Column>
                    <Column field="file_size" header="File Size"></Column>
                    <Column field="comments" header="Comments"></Column>
                    <Column field="" header="" body={linkTemplete}></Column>
                </DataTable>
            </> : null}
            <BConfirmModal
                isOpen={isOpen}
                title='Confirmation on Delete Medallion'
                message="Are you sure to delete the selected Medallion?"
                onCancel={() => { setDeleteDocId(); setOpen(false) }}
                onConfirm={() => {
                    setOpen(false);
                    proccedDelete();
                }}
                {...{ iconName: 'red-delete' }}
            ></BConfirmModal>
            <BToast ref={toast} position='top-right' />
            <div className="w-100 position-sticky bottom-0 py-3 bg-white">
                {!allSigned ? <Button
                    disabled={!hasAccess}
                    label={isProccessDataSuccess ? "Finish creating lease" : "Send for Signature"}
                    type="submit"
                    onClick={submitHandler}
                    severity="warning"
                    className="border-radius-0 primary-btn "
                /> :
                    <Button
                        disabled={!hasAccess}
                        label={isProccessDataSuccess ? "Finish creating lease" : "Submit Lease Signature"}
                        type="submit"
                        onClick={submitMoveHandler}
                        severity="warning"
                        className="border-radius-0 primary-btn "
                    />}
            </div>
        </div>
    )
}

export default ViewDocAndSignLease