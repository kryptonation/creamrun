import { Button } from "primereact/button";
import DataTableComponent from "./DataTableComponent";
import Img from "./Img";
import {
  kbToMb,
  removeUnderScore,
  removeUnderScorefilterGenerate,
} from "../utils/utils";
import { useRef, useState } from "react";
import BConfirmModal from "./BConfirmModal";
import BToast from "./BToast";
import { useDeleteDocumentMutation } from "../redux/api/medallionApi";
import PdfViewModal from "./PdfViewModal";
import BModal from "./BModal";
import BUpload from "./BUpload";
import { dateMonthYear, yearMonthDate } from "../utils/dateConverter";

const DocumentGrid = ({
  data,
  contract_signed_mode,
  requiredDocTypes = [],
}) => {
  console.log("DocumentGrid", data, contract_signed_mode);
  const [deleteDocId, setDeleteDocId] = useState();
  const [isOpen, setOpen] = useState(false);
  const toast = useRef(null);
  const [deleteFunc] = useDeleteDocumentMutation();
  const columns = [
    {
      field: "document_type",
      header: "Document Type",
      dataTestId: "typeHeader",
      sortable: true,
      filter: false,
    },
    {
      field: "document_name",
      header: "Document Name",
      dataTestId: "documentNameHeader",
      sortable: true,
      filter: false,
    },
    {
      field: "document_date",
      header: "Document Date",
      dataTestId: "medallionTypeHeader",
      sortable: true,
      filter: false,
    },
    {
      field: "document_size",
      header: "File Size",
      dataTestId: "createOnHeader",
      sortable: true,
      filter: false,
    },
    {
      field: "comments",
      header: "Comments",
      dataTestId: "renewalDateHeader",
      sortable: true,
      filter: false,
    },
    {
      field: "status",
      header: "",
      dataTestId: "statusHeader",
      sortable: false,
      filter: false,
    },
  ];

  const proccedDelete = async () => {
    await deleteFunc(deleteDocId)
      .unwrap()
      .then(() => {
        toast.current.showToast(
          "Success",
          "Document successfully removed from system.",
          "success",
          false,
          10000
        );
      });
    setDeleteDocId();
  };

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
      const img = extension === "pdf" ? "pdf" : "img";
      const path = rowData?.presigned_url;

      if (rowData?.document_id || rowData?.presigned_url) {
        return (
          <div className="d-flex align-items-center justify-content-center">
            <span
              className="d-flex align-items-center manage-table-action-svg"
              style={{ gap: "16px" }}
            >
              <Img name="iconSuccess"></Img>

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
                    ></Button>
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
              <Button
                //text
                pt={{ root: { "data-testid": `delete-icon-btn` } }}
                onClick={() => {
                  setDeleteDocId(rowData.document_id);
                  setOpen(true);
                }}
                icon={() => <Img name="delete"></Img>}
              />
            </span>
          </div>
        );
      }

      return (
        <div className="d-flex align-items-center justify-content-center gap-3">
          {(contract_signed_mode === "P" ||
            ((contract_signed_mode === "I" || contract_signed_mode === "M") &&
              rowData?.document_type !== "royalty_agreement") ||
            // &&
            // rowData?.document_type !== "signed_lease"
            !contract_signed_mode) && (
            <BModal>
              <BModal.ToggleButton>
                <Button
                  outlined
                  text
                  data-testId={`${rowData?.document_type}_upload_documents`}
                  // data-testid="upload-common-btn"
                  className="text-blue gap-2 p-0 outline-btn upload-common-btn fs-16-semibold d-flex "
                  type="button"
                  icon={() => <Img name="uploaddoc" />}
                />
              </BModal.ToggleButton>
              <BModal.Content>
                <BUpload
                  data={{ ...rowData }}
                  object_type={rowData?.document_object_type}
                  object_id={rowData?.document_object_id}
                  document_id={0}
                  // document_type: [{ name: 'Insurance Reciept', code: 'insurance_reciept' }],
                  document_type={[
                    {
                      name: removeUnderScore(rowData?.document_type),
                      code: rowData?.document_type,
                    },
                  ]}
                />
              </BModal.Content>
            </BModal>
          )}
          <Button icon={<Img name="disabled_eye" />} disabled={true}></Button>
          <Button
            text
            onClick={() => {
              setDeleteDocId(rowData.document_id);
              setOpen(true);
            }}
            icon={() => <Img name="trash_disable"></Img>}
            disabled={true}
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
      <BConfirmModal
        isOpen={isOpen}
        title="Confirmation on Delete Document"
        message="Are you sure to delete the selected Document?"
        onCancel={() => {
          setDeleteDocId();
          setOpen(false);
        }}
        onConfirm={() => {
          setOpen(false);
          proccedDelete();
        }}
        {...{ iconName: "red-delete" }}
      ></BConfirmModal>
      <BToast ref={toast} position="top-right" />
    </>
  );
};

export default DocumentGrid;
