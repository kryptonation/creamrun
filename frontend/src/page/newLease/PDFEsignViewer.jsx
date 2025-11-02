import React, { useEffect, useState } from "react";
import { Document, Page } from "react-pdf";
import Img from "../../components/Img";
import { removeUnderScore, capitalizeWords } from "../../utils/utils";
import { useGetSignedEnvelopeQuery } from "../../redux/api/esignApi";
import PdfViewModalLease from "./PdfViewModalLease";

const PDFEsignViewer = ({ item }) => {
  // const extension = item.document_format;
  const filename = item.document_name;
  // const path = item.presigned_url;
  const { data: fileBlob, isLoading, error } = useGetSignedEnvelopeQuery(item.document_envelope_id, {
    skip: !item.document_envelope_id,
  });

  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    if (fileBlob) {
      const url = URL.createObjectURL(fileBlob);
      setPdfUrl(url);

      // cleanup
      return () => URL.revokeObjectURL(url);
    }
  }, [fileBlob]);




  useEffect(() => {
    if (item.signing_type === "print") {
      setPdfUrl(item.presigned_url)
    }
  }, [item]);

  return (
    <div>
      {/* <BModal>
        <BModal.ToggleButton>
          <div  className='pdf-backdrop-view '>
            {extension === "PDF" ?
              <div className="d-flex w-100 align-items-center justify-content-center pdf-layout">
                <Document file={path} className="z-n1">
                  <Page pageNumber={1} className="d-flex align-items-center justify-content-center" />
                </Document>
              </div>
              :
              <div className="d-flex w-100 align-items-center justify-content-center pdf-layout">
                <img src={path} alt="" className=" img-view" />
              </div>}
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
              extension === "PDF" ? <PDFViewer url={path}></PDFViewer> :
                <div className="d-flex w-100 align-items-center justify-content-center ">
                  <img src={path} alt="" className="border border-4  border-black " />
                </div>
            }
          </div>
        </BModal.SideContent>
      </BModal> */}
      <p className="mb-3">{capitalizeWords(removeUnderScore(item?.document_type))}</p>
      <PdfViewModalLease
        triggerButton={
          <div className="pdf-backdrop-view position-relative">

            {/* Grey transparent overlay at top */}
            <div className="pdf-top-overlay"></div>

            {/* Eye icon centered */}
            <div className="pdf-eye-icon d-flex align-items-center justify-content-center">
              <Img name="black_ic_eye" /> {/* Replace with your eye icon */}
            </div>

            <div className="d-flex w-100 align-items-center justify-content-center pdf-layout">
              <Document file={pdfUrl} className="z-n1">
                <Page
                  pageNumber={1}
                  className="d-flex align-items-center justify-content-center"
                />
              </Document>
            </div>

          </div>

        }
        title={removeUnderScore(item?.document_type).replace(/\b\w/g, (char) =>
          char.toUpperCase()
        )}
        downloadUrl={pdfUrl}
        downloadName={filename}
        extension={"PDF"}
        previewUrl={pdfUrl}
      />
    </div>
  );
};

export default PDFEsignViewer;
