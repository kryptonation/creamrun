import { useRef,useState } from "react";
import Spreadsheet from "x-data-spreadsheet";
import * as XLSX from "xlsx";
import "x-data-spreadsheet/dist/xspreadsheet.css";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import Img from "./Img";
import DownloadBtn from "./DownloadBtn";

const SpreadsheetViewer = ({ 
  triggerButton, 
  title = "Document",
  downloadUrl,
  downloadName,
  extension,
  previewUrl
}) => {
    const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef(null);

  const handleShow = () => {
    if(!containerRef.current) return;
    const loadExcel=()=>{
        fetch(
          previewUrl
        )
          .then((res) => res.arrayBuffer())
          .then((buffer) => {
            const workbook = XLSX.read(buffer, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
            const rows = {};
            json.forEach((row, rowIndex) => {
              const cells = {};
              row.forEach((cell, colIndex) => {
                cells[colIndex] = { text: String(cell ?? "") };
              });
              rows[rowIndex] = { cells };
            });
    
            new Spreadsheet(containerRef.current, {
              mode: "read", // or 'edit'
              showToolbar: false,
              showGrid: true,
            }).loadData({
              name: "Sheet1",
              styles: [],
              merges: [],
              rows: rows,
            });
          });
    }
    loadExcel();
    };

  return (
    <>
      <div onClick={() => previewUrl && setIsOpen(true)}>{triggerButton}</div>
      <Dialog
        draggable={false}
        visible={isOpen}
        maximizable
        position="right"
        modal={false}
        onShow={handleShow}
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
              <DownloadBtn url={downloadUrl} ext={extension} name={downloadName}>
                  <Button text icon={() => <Img name="download" />} />
              </DownloadBtn>
            </div>
          </div>
            <div className="d-flex w-100 align-items-center justify-content-center">
                <div ref={containerRef} style={{ height: '500px', width: '100%' }} />
            </div>
          <Button
            className="cancel-btn"
            data-testid="side-content-cancel-btn"
            onClick={() => setIsOpen(false)}
            icon={() => <Img name="modalCancel" />}
          />
        </div>
      </Dialog>
    </>
  );
};

export default SpreadsheetViewer;
