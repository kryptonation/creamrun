import React from "react";
import BModal from "../../components/BModal";
import { Document, Page } from "react-pdf";
import DownloadBtn from "../../components/DownloadBtn";
import { Button } from "primereact/button";
import Img from "../../components/Img";
import PDFViewer from "../../components/PDFViewer";
import PdfViewModal from "../../components/PdfViewModal";
import { removeUnderScore } from "../../utils/utils";

const PDFViewRender = ({ item }) => {
  const extension = item.document_format;
  const filename = item.document_name;
  const path = item.presigned_url;

  return (
    <>
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
      <PdfViewModal
        triggerButton={
          <div className="pdf-backdrop-view ">
            {extension === "PDF" ? (
              <div className="d-flex w-100 align-items-center justify-content-center pdf-layout">
                <Document file={path} className="z-n1">
                  <Page
                    pageNumber={1}
                    className="d-flex align-items-center justify-content-center"
                  />
                </Document>
              </div>
            ) : (
              <div className="d-flex w-100 align-items-center justify-content-center pdf-layout">
                <img src={path} alt="" className=" img-view" />
              </div>
            )}
          </div>
        }
        title={removeUnderScore(item?.document_type).replace(/\b\w/g, (char) =>
          char.toUpperCase()
        )}
        downloadUrl={path}
        downloadName={filename}
        extension={extension}
        previewUrl={path}
      />
    </>
  );
};

export default PDFViewRender;
