import { Dialog } from 'primereact/dialog'
import { useEffect, useState } from 'react'
import PdfPrinter from './PdfPrinter';
import DownloadBtn from './DownloadBtn';
import { Button } from 'primereact/button';
import Img from './Img';
import PDFViewer from './PDFViewer';
import { useDtrRecieptQuery } from '../redux/api/paymentApi';

const PdfViewRecipt = ({trigger,setTrigger,rowData}) => {
    console.log("🚀 ~ PdfViewRecipt ~ rowData:", rowData)
    const [isOpen, setIsOpen] = useState(false);
    const { data: receiptData } = useDtrRecieptQuery(rowData,{skip: !isOpen});
    console.log("🚀 ~ PdfViewRecipt ~ receiptData:", receiptData)

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

      const previewUrl= receiptData?.preview_url || '';
      const downloadUrl = receiptData?.download_url || '';

  return (
    <>
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
        <div>
          <div className="d-flex align-items-center justify-content-between">
            <p className="topic-txt">{"title"}</p>
            <div className="d-flex align-items-center gap-4">
              <PdfPrinter url={receiptData?.preview_url } />
              {/* <DownloadBtn url={downloadUrl} ext={extension} name={downloadName}>
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
              </DownloadBtn> */}
            </div>
          </div>
          
          {/* {extension === "pdf" ? ( */}
            <PDFViewer url={receiptData?.preview_url } />
          {/* ) : (
            <div className="d-flex w-100 align-items-center justify-content-center">
              <img 
                src={previewUrl} 
                alt="" 
                data-testid="pdf-viewer" 
                className="border border-4 border-black" 
              />
            </div>
          )} */}
          
          <Button 
            className="cancel-btn" 
            data-testId="side-content-cancel-btn" 
            // onClick={() => setIsOpen(false)} 
            icon={() => <Img name="modalCancel" />}
          />
        </div>
      </Dialog>
    </>
  )
}

export default PdfViewRecipt