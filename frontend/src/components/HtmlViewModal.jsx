import { useEffect, useState } from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import Img from "./Img";
import DownloadBtn from "./DownloadBtn";
import PdfPrinter from "./PdfPrinter";
import PDFViewer from "./PDFViewer";

const HtmlViewModal = ({ 
  trigger, 
  setTrigger, 
  triggerButton, 
  title = "Document",
  downloadUrl,
  downloadName,
  extension,
  previewUrl
}) => {
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
      <div onClick={() => previewUrl&&setIsOpen(true)}>
        {triggerButton}
      </div>

      {/* Modal Content */}
      <Dialog
        draggable={false}
        visible={isOpen}
        maximizable
        position="right"
        modal={false}
        className="m-0 vh-100 min-vh-100 w-50 bg-light side-modal"
        pt={{
          content: { className: 'scroll-bar' },
        }}
        onHide={() => setIsOpen(false)}
      >
        <div className="h-100">
          <div className="d-flex align-items-center justify-content-between">
            <p className="topic-txt">{title}</p>
            <div className="d-flex align-items-center gap-4">
              <PdfPrinter url={downloadUrl} />
              <DownloadBtn url={downloadUrl} ext={extension} name={downloadName}>
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
          
          {/* {extension === "pdf" ? (
            <PDFViewer url={previewUrl} />
          ) : ( */}
            <div className="d-flex w-100 h-100 align-items-center justify-content-center">
            <iframe src={previewUrl} title={title} className=" w-100 h-100 border border-4 border-black" />
              {/* <img 
                src={previewUrl} 
                alt="" 
                data-testid="pdf-viewer" 
                className="border border-4 border-black" 
              /> */}
            </div>
          {/* )} */}
          
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

export default HtmlViewModal