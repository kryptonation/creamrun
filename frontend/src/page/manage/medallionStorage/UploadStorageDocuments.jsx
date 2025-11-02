import Img from "../../../components/Img";
import { Button } from "primereact/button";
import { useEffect, useMemo } from "react";
import DataTableComponent from "../../../components/DataTableComponent";
import {
  useDeleteDocumentMutation,
  useMoveCaseDetailMutation,
} from "../../../redux/api/medallionApi";
import PdfViewModal from "../../../components/PdfViewModal";
import { kbToMb, removeUnderScore } from "../../../utils/utils";
import { dateMonthYear } from "../../../utils/dateConverter";
import BModal from "../../../components/BModal";
import { gridToolTipOptins } from "../../../utils/tooltipUtils";
import BUpload from "../../../components/BUpload";
import { getCurrentStep } from "../../../utils/caseUtils";

const UploadStorageDocuments = ({
  caseId,
  reload,
  currentStep,
  hasAccess,
  currentStepId,
  caseData,
  requiredType = [], // Changed default back to empty array for clarity
}) => {
  const [deleteFunc] = useDeleteDocumentMutation();
  const columns = [
    {
      field: "document_type",
      header: "Document Type",
      headerAlign: "left",
      sortable: true,
    },
    {
      field: "document_name",
      header: "Document Name",
      headerAlign: "left",
      sortable: true,
    },
    {
      field: "document_date",
      header: "Document Date",
      headerAlign: "left",
      sortable: true,
    },
    { field: "document_size", header: "File Size", sortable: true },
    { field: "document_note", header: "Comments", sortable: true },
    { field: "options", header: "" },
  ];

  const allMandatoryDocsUploaded = useMemo(() => {
    const currentDocs = currentStep?.documents || [];
    if (!requiredType || requiredType.length === 0) {
      return true;
    }
    // Returns true only if every VALID document type in requiredType
    // exists in the current step's documents and has a valid document_id.
    // The .filter(Boolean) removes any empty strings "" from the check.
    return requiredType
      .filter(Boolean)
      .every((docType) =>
        currentDocs.some(
          (doc) => doc.document_type === docType && doc.document_id
        )
      );
  }, [currentStep?.documents, requiredType]);

  const customRender = (column, rowData) => {
    if (column.field === "document_name") {
      const parts = rowData.document_name?.split(".");
      const extension = parts?.pop();
      const filename = parts?.join(".");
      const path = rowData.presigned_url;
      return rowData.presigned_url ? (
        <PdfViewModal
          triggerButton={
            <div className="d-flex align-items-center gap-2">
              <p>{rowData.document_name}</p>
            </div>
          }
          downloadUrl={path}
          downloadName={filename}
          extension={extension}
          previewUrl={path}
          title={removeUnderScore(rowData?.document_type).replace(
            /\b\w/g,
            (char) => char.toUpperCase()
          )}
        />
      ) : (
        // Display nothing if there is no document name/URL
        "—"
      );
    } else if (column.field === "document_size") {
      return rowData?.document_size ? kbToMb(rowData?.document_size) : "—";
    } else if (column.field === "document_type") {
      const isRequired = requiredType?.includes(rowData?.document_type);
      return (
        <p>
          {removeUnderScore(rowData?.document_type).replace(/\b\w/g, (char) =>
            char.toUpperCase()
          )}
          {isRequired && <span className="require-star">*</span>}
        </p>
      );
    } else if (column.field === "document_date") {
      return rowData?.document_date
        ? dateMonthYear(rowData?.document_date)
        : "—";
    } else if (column.field === "options") {
      const parts = rowData?.document_name?.split(".");
      const extension = parts?.pop();
      const filename = parts?.join(".");
      const path = rowData?.presigned_url;
      return (
        <div className="d-flex align-items-center justify-content-center">
          <span
            className="d-flex align-items-center manage-table-action-svg"
            style={{ gap: "16px" }}
          >
            {!rowData?.document_id ? ( // Simplified check
              <>
                <BModal>
                  <BModal.ToggleButton>
                    <Button
                      outlined
                      text
                      data-testId={`${rowData?.document_type}_upload_documents`}
                      className="text-blue gap-2 p-0 outline-btn upload-common-btn fs-16-semibold d-flex "
                      type="button"
                      icon={() => <Img name="uploaddoc" />}
                      {...gridToolTipOptins("Upload Document")}
                    />
                  </BModal.ToggleButton>
                  <BModal.Content>
                    <BUpload
                      data={{ ...rowData }}
                      object_type={rowData?.document_object_type}
                      object_id={rowData?.document_object_id}
                      document_id={0}
                      document_type={[
                        {
                          name: removeUnderScore(rowData?.document_type),
                          code: rowData?.document_type,
                        },
                      ]}
                    />
                  </BModal.Content>
                </BModal>

                <Button
                  icon={<Img name="disabled_eye" />}
                  {...gridToolTipOptins("No Document Preview Available")}
                ></Button>
                <Button
                  text
                  {...gridToolTipOptins("No Document to Delete")}
                  icon={() => <Img name="trash_disable"></Img>}
                />
              </>
            ) : (
              <>
                <Button
                  text
                  icon={<Img name="iconSuccess"></Img>}
                  {...gridToolTipOptins("Document Uploaded Successfully")}
                ></Button>

                <PdfViewModal
                  triggerButton={
                    <div
                      className="d-flex align-items-center gap-2 doc-img"
                      data-testid="individual-upload-common-btn"
                    >
                      <Button
                        icon={<Img name="black_ic_eye" />}
                        pt={{ root: { "data-testid": `eye-icon-btn` } }}
                        {...gridToolTipOptins("Preview Document")}
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
                  text
                  disabled={!hasAccess}
                  onClick={() => deleteFunc(rowData?.document_id)}
                  {...gridToolTipOptins("Delete Document")}
                  icon={() => <Img name="trash"></Img>}
                />
              </>
            )}
          </span>
        </div>
      );
    }

    return rowData[column.field] || "—";
  };
  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();
  useEffect(() => {
    if (isMoveDataSuccess) {
      reload();
    }
  }, [isMoveDataSuccess, reload]);

  return (
    <div>
      <DataTableComponent
        columns={columns}
        paginator={false}
        data={currentStep?.documents || []}
        renderColumn={customRender}
      />

      <div style={{ paddingBottom: 30 }}>
        <Button
          disabled={!hasAccess || !allMandatoryDocsUploaded}
          label="Submit Document" // Changed label for clarity
          data-testid="upload-documents-btn"
          severity="warning"
          className="border-radius-0 primary-btn mt-5"
          onClick={() => {
            if (
              hasAccess &&
              caseData &&
              caseData.case_info.case_status !== "Closed" &&
              getCurrentStep(caseData.steps).step_id === currentStepId
            )
              moveCase({ params: caseId });
          }}
        />
      </div>
    </div>
  );
};

export default UploadStorageDocuments;
