import { Button } from "primereact/button";
import Img from "./Img";
import { handleExport } from "../utils/gridUtils";

const ExportBtn = ({
  sortFieldMapping,
  sortField,
  sortOrder,
  triggerExport,
  filterApplyList,
  fileName = `medallion_`,
}) => {
  const exportFile = (fileFormat) => {
    handleExport({
      sortFieldMapping,
      sortField,
      sortOrder,
      triggerExport,
      filterApplyList,
      fileName,
      fileFormat,
    });
  };

  return (
    <div className="d-flex align-items-center justify-content-between gap-1 px-2">
      <Button
        text
        data-testId="export-pdf-file"
        className="regular-text gap-2 d-flex p-0"
        onClick={() => exportFile("pdf")}
        icon={() => <Img name="ic_export_pdf" />}
      ></Button>
      <Button
        text
        data-testId="export-excel-file"
        className="regular-text gap-2 d-flex p-0"
        onClick={() => exportFile("excel")}
        icon={() => <Img name="ic_export_excel" />}
      ></Button>
    </div>
  );
};

export default ExportBtn;
