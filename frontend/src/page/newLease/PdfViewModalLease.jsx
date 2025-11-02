import React, { useEffect, useRef, useState } from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import Img from "../../components/Img";
import PdfPrinter from "../../components/PdfPrinter";
import DownloadBtn from "../../components/DownloadBtn";
import { Document, Page } from "react-pdf";
import { Paginator } from "primereact/paginator";
// import Img from "./Img";
// import DownloadBtn from "./DownloadBtn";
// import PdfPrinter from "./PdfPrinter";
// import PDFViewer from "./PDFViewer";
// import { Paginator } from "primereact/paginator";
// import { Document, Page } from "react-pdf";

const PdfViewModalLease = ({
    trigger,
    setTrigger,
    triggerButton,
    title = "Document",
    downloadUrl,
    downloadName,
    extension,
    previewUrl,
}) => {
    const [numPages, setNumPages] = useState();
    const [first, setFirst] = useState(0);

    const onPageChange = (event) => {
        setFirst(event.first);
    };

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
    }

    const [isOpen, setIsOpen] = useState(false);
    useEffect(() => {
        if (trigger) {
            setIsOpen(trigger);
        }
    }, [trigger]);

    useEffect(() => {
        if (!isOpen && setTrigger) {
            setTrigger(false);
        }
    }, [isOpen, setTrigger]);

    return (
        <>
            {/* Trigger Button */}
            <div onClick={() => previewUrl && setIsOpen(true)}>{triggerButton}</div>

            {/* Modal Content */}
            <Dialog
                draggable={false}
                visible={isOpen}
                maximizable
                position="right"
                modal={false}
                className="m-0 vh-100 min-vh-100 w-50 bg-light side-modal"
                pt={{
                    content: { className: "scroll-bar" },
                }}
                onHide={() => setIsOpen(false)}
            >
                <div>
                    <div className="d-flex align-items-center justify-content-between">
                        <p className="topic-txt">{title}</p>
                        <div className="d-flex align-items-center gap-4">
                            <PdfPrinter url={previewUrl} />
                            <DownloadBtn
                                url={downloadUrl}
                                ext={extension}
                                name={downloadName}
                            >
                                <a
                                    href={downloadUrl}
                                    rel="noreferrer"
                                    data-testid="download-btn"
                                    title={downloadName}
                                    target="_blank"
                                    className="download-link ms-1 d-flex align-items-center"
                                >
                                    <Button text icon={() => <Img name="download" />} />
                                </a>
                            </DownloadBtn>
                        </div>
                    </div>

                    <div
                        className="position-relative pdf-viewer mt-10"
                        data-testid="pdf-viewer"
                        style={{ width: "100%", height: "100%", overflow: "auto", marginTop: 30 }}
                    >
                        {numPages && (
                            <Paginator
                                data-testid="paginator-pdf"
                                first={first}
                                rows={1}
                                className="position-absolute shadow"
                                totalRecords={numPages}
                                onPageChange={onPageChange}
                                template="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
                            />
                        )}

                        <Document
                            file={downloadUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            className="z-n1"
                        >
                            <Page
                                pageNumber={first + 1}
                                width={600} // ✅ Set page width explicitly (adjust as per container)
                                className="d-flex align-items-center justify-content-center"
                            // width={window.innerWidth * 0.8}
                            />
                        </Document>
                    </div>

                    <Button
                        className="cancel-btn"
                        data-testId="side-content-cancel-btn"
                        onClick={() => setIsOpen(false)}
                        icon={() => <Img name="modalCancel" />}
                    />
                </div>
            </Dialog>
        </>
    );
};

export default PdfViewModalLease;
