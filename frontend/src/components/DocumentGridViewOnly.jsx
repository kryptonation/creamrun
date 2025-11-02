import { Button } from "primereact/button";
import DataTableComponent from "./DataTableComponent";
import Img from "./Img";
import { kbToMb, removeUnderScore } from "../utils/utils";
import { useRef } from "react";
import PdfViewModal from "./PdfViewModal";
import { dateMonthYear, yearMonthDate } from "../utils/dateConverter";
import BToast from "./BToast";

const DocumentGridViewOnly = ({ data, requiredDocTypes = [] }) => {
  const toast = useRef(null);

  const columns = [
    {
      field: "document_type",
      header: "Document Type",
      dataTestId: "typeHeader",
      // sortable: true,
      // filter: false,
    },
    {
      field: "document_name",
      header: "Document Name",
      dataTestId: "documentNameHeader",
      // sortable: true,
      // filter: false,
    },
    {
      field: "document_date",
      header: "Document Date",
      dataTestId: "medallionTypeHeader",
      // sortable: true,
      // filter: false,
    },
    {
      field: "document_size",
      header: "File Size",
      dataTestId: "createOnHeader",
      // sortable: true,
      // filter: false,
    },
    {
      field: "comments",
      header: "Comments",
      dataTestId: "renewalDateHeader",
      // sortable: true,
      // filter: false,
    },
    {
      field: "status",
      header: "",
      dataTestId: "statusHeader",
      // sortable: false,
      // filter: false,
    },
  ];

  const customRender = (column, rowData) => {
    if (column.field === "document_name") {
      const parts = rowData?.document_name?.split(".");
      const extension = parts?.pop();
      const filename = parts?.join(".");
      const img = extension === "pdf" ? "pdf" : "img";
      const path = rowData?.presigned_url;

      return (
        <PdfViewModal
          triggerButton={
            <div
              className="d-flex align-items-center gap-2 doc-img"
              data-testid="individual-upload-common-btn"
            >
              {filename ? (
                <p>{`${filename}.${img}`}</p>
              ) : (
                removeUnderScore(rowData?.document_type)
              )}
            </div>
          }
          title={removeUnderScore(rowData?.document_type).replace(
            /\b\w/g,
            (char) => char.toUpperCase()
          )}
          downloadUrl={path}
          downloadName={filename}
          extension={extension}
          previewUrl={path}
        />
      );
    }

    if (column.field === "document_size") {
      return rowData?.document_size ? kbToMb(rowData?.document_size) : "-";
    }

    if (column.field === "document_type") {
      const isRequired = requiredDocTypes.includes(rowData?.document_type);
      return (
        <>
          {isRequired ? (
            <>
              {removeUnderScore(rowData?.document_type).replace(
                /\b\w/g,
                (char) => char.toUpperCase()
              )}
              <span className="require-star ms-1">*</span>
            </>
          ) : (
            removeUnderScore(rowData?.document_type).replace(/\b\w/g, (char) =>
              char.toUpperCase()
            )
          )}
        </>
      );
      // return removeUnderScore(rowData?.document_type).replace(/\b\w/g, (char) =>
      //   char.toUpperCase()
      // );
    }

    if (column.field === "document_date") {
      return rowData?.document_date
        ? dateMonthYear(rowData?.document_date)
        : "-";
    }

    if (column.field === "comments") {
      return rowData?.comments ? rowData?.comments : "-";
    }

    if (column.field === "status") {
      const parts = rowData?.document_name?.split(".");
      const extension = parts?.pop();
      const filename = parts?.join(".");
      const path = rowData?.presigned_url;

      if (rowData?.document_id || rowData?.presigned_url) {
        return (
          <div className="d-flex align-items-center justify-content-center">
            <PdfViewModal
              triggerButton={
                <div
                  className="d-flex align-items-center gap-2 doc-img"
                  data-testid="individual-upload-common-btn"
                >
                  <Button
                    pt={{ root: { "data-testid": `eye-icon-btn` } }}
                    icon={<Img name="eye" />}
                    type="button"
                  />
                </div>
              }
              title={removeUnderScore(rowData?.document_type).replace(
                /\b\w/g,
                (char) => char.toUpperCase()
              )}
              downloadUrl={path}
              downloadName={filename}
              extension={extension}
              previewUrl={path}
            />
          </div>
        );
      }

      return (
        <div className="d-flex align-items-center justify-content-center">
          <Button
            pt={{ root: { "data-testid": `eye-icon-btn` } }}
            icon={<Img name="disabled_eye" />}
            type="button"
          />
        </div>
      );
    }

    return rowData[column.field];
  };

  return (
    <>
      <DataTableComponent
        columns={columns}
        data={data}
        renderColumn={customRender}
        paginator={false}
      />
      <BToast ref={toast} position="top-right" />
    </>
  );
};

export default DocumentGridViewOnly;
