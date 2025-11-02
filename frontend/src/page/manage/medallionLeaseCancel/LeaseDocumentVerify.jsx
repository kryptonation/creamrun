import BCaseCard from "../../../components/BCaseCard";
import Img from "../../../components/Img";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import BSuccessMessage from "../../../components/BSuccessMessage";
import { useState } from "react";
import DataTableComponent from "../../../components/DataTableComponent";

const LeaseDocumentVerify = () => {
    const [isOpen, setOpen] = useState(false)
    const navigate = useNavigate();
    const columns = [
        {
            field: "name",
            header: "Document Name",
            headerAlign: "left", sortable: true
        },
        { field: "document_type", header: "Document Type", headerAlign: "left", sortable: true },
        { field: "createdDate", header: "Document Date", headerAlign: "left", sortable: true },
        { field: "fileSize", header: "File Size", sortable: true },
        { field: "comments", header: "Comments", sortable: true },
        { field: "options", header: "" },
    ];
    const documents = [
        {
            id: "1001",
            medallionNumber: { code: "1P43", name: "Jose Smith" },
            name: "Placing Medallion in Storage",
            fileSize: "2 MB",
            updatedDate: "12/24/2026",
            createdDate: "12/24/2027",
            comments: "Medallion storage reason....",
            url: "https://projects.wojtekmaj.pl/react-pdf/assets/sample-8bb8af10.pdf",
        },
        {
            id: "1002",
            medallionNumber: { code: "1P43", name: "Jose Smith" },
            name: "Placing Medallion in Storage",
            fileSize: "2 MB",
            updatedDate: "12/24/2026",
            createdDate: "12/24/2027",
            comments: "Medallion storage reason....",
            url: "https://projects.wojtekmaj.pl/react-pdf/assets/sample-8bb8af10.pdf",
        },
        {
            id: "1003",
            medallionNumber: { code: "1P43", name: "Jose Smith" },
            name: "Placing Medallion in Storage",
            fileSize: "2 MB",
            updatedDate: "12/24/2026",
            createdDate: "12/24/2027",
            comments: "Medallion storage reason....",
            url: "https://projects.wojtekmaj.pl/react-pdf/assets/sample-8bb8af10.pdf",
        },
    ]
    const customRender = (column, rowData) => {
        if (column.field === "name") {
            return (
                <div>
                    <Img name='pdf'></Img>
                    <span style={{ marginLeft: 10 }}>{rowData.name}</span>
                </div>
            )
        }
        else if (column.field === "options") {
            return (
                <div>
                    <Img name="trash"></Img>
                </div>
            )
        }

        return rowData[column.field];
    };
    return (
        <div className="common-layout w-100 h-100 d-flex flex-column gap-4">
            <div className="d-flex align-items-center gap-5">
                <BCaseCard label="Case Number" value="REWMED1102"></BCaseCard>
                <BCaseCard label="Case Status" value="InProgress"></BCaseCard>
                <BCaseCard label="Created By" value="10/24/2024"></BCaseCard>
                <BCaseCard label="Created On" value="10/24/2024"></BCaseCard>
                <BCaseCard label="Action Due Date" value="10/24/2024"></BCaseCard>
                <BCaseCard label="Remaining Days Left" value="1 Day"></BCaseCard>
            </div>
            <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                    <Img name="ic_cancel_lease" />
                    <p className="sec-topic align-items-center px-2">Upload Documents</p>
                </div>
                <Button
                    text
                    label="Upload Documents"
                    data-testid="upload-documents"
                    className="text-black gap-2"
                    type="button"
                    icon={() => <Img name="uploaddoc" />}
                />
            </div>

            <div className="d-flex align-items-center gap-5" style={{ marginLeft: '50px' }}>
                <BCaseCard label="Medallion Owner Name" value="Mustafa"></BCaseCard>
                <BCaseCard label="Medallion Number" value="101"></BCaseCard>
                <BCaseCard label="Last Renewal Date" value="10/24/2024"></BCaseCard>
                <BCaseCard label="Medallion Type" value="Regular"></BCaseCard>
                <BCaseCard label="Contact" value="(212) 456-0721 | richardjb@outlook.com"></BCaseCard>
            </div>
            <DataTableComponent
                columns={columns}
                data={documents}
                selectionMode="checkbox"
                renderColumn={customRender}
            />

            <div style={{ paddingBottom: 30 }}>
                <Button
                    label="Submit Payee Details"
                    severity="warning"
                    className="border-radius-0 primary-btn mt-5"
                    onClick={() => setOpen(true)}
                />
            </div>
            <BSuccessMessage isOpen={isOpen} message="Medallion 5X24 is terminated" title="Lease Termination process is successful" onCancel={() => {
            setOpen(false); navigate('/manage-medallion', { replace: true });
            }} onConfirm={() => {
             setOpen(false); navigate('/manage-medallion', { replace: true });

            }}></BSuccessMessage>
        </div>
    )
}

export default LeaseDocumentVerify;
