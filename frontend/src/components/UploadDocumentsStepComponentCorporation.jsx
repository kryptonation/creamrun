import Img from "./Img";
import { Button } from "primereact/button";
import { useEffect, useState } from "react";
import DataTableComponent from "./DataTableComponent";
import {
  useDeleteDocumentMutation,
  useMoveCaseDetailMutation,
} from "../redux/api/medallionApi";
import PdfViewModal from "./PdfViewModal";
import { kbToMb, removeUnderScore } from "../utils/utils";
import { yearMonthDate } from "../utils/dateConverter";
import BModal from "./BModal";
import BUpload from "./BUpload";
import { gridToolTipOptins } from "../utils/tooltipUtils";

const UploadDocumentsStepComponentCorporation = ({
  caseId,
  reload,
  currentStep,
  hasAccess,
}) => {
  const [deleteFunc] = useDeleteDocumentMutation();
  // State to manage documents locally
  const [documents, setDocuments] = useState([]);

  // Initialize documents from currentStep
  useEffect(() => {
    if (currentStep?.documents) {
      // Filter out additional_payee documents with empty document_id
      const filteredDocs = currentStep.documents.filter(
        (doc) =>
          !(doc.document_type === "additional_payee" && doc.document_id === "")
      );
      setDocuments(filteredDocs);
    }
  }, [currentStep?.documents]);

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

  // Function to add more payee document
  const addMorePayeeDocument = () => {
    const newAdditionalPayeeDoc = {
      document_id: "",
      document_name: "",
      document_note: "",
      document_path: "",
      document_type: "additional_payee",
      document_date: "",
      document_object_type: currentStep?.object_type,
      document_object_id: currentStep?.object_id,
      document_size: "",
      document_uploaded_date: "",
      presigned_url: "",
    };
    setDocuments((prevDocuments) => [...prevDocuments, newAdditionalPayeeDoc]);
  };

  // Function to remove a payee document
  const removePayeeDocument = (index) => {
    setDocuments((prevDocuments) =>
      prevDocuments.filter((_, i) => i !== index)
    );
  };

  // Check if additional payee document exists and is uploaded
  const getAdditionalPayeeStatus = () => {
    const additionalPayeeDoc = documents.find(
      (doc) => doc.document_type === "additional_payee"
    );

    if (!additionalPayeeDoc) {
      return { exists: false, isUploaded: false };
    }

    return {
      exists: true,
      isUploaded: additionalPayeeDoc.document_id !== "",
    };
  };

  const customRender = (column, rowData, rowIndex) => {
    if (column.field === "document_name") {
      console.log("rowData", rowData, rowIndex);
      const parts = rowData.document_name?.split(".");
      const extension = parts?.pop();
      const filename = parts?.join(".");
      const path = rowData.presigned_url;
      return rowData.presigned_url !== "" ? (
        <PdfViewModal
          triggerButton={
            <div className="d-flex align-items-center gap-2">
              <Img name="pdf"></Img>
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
        <p>
          {" "}
          {removeUnderScore(rowData?.document_type).replace(/\b\w/g, (char) =>
            char.toUpperCase()
          )}
        </p>
      );
    } else if (column.field === "document_size") {
      return rowData?.document_size ? kbToMb(rowData?.document_size) : "-";
    } else if (column.field === "document_type") {
      const isRequired = currentStep?.required_documents?.includes(
        rowData?.document_type
      );
      return (
        <p>
          {removeUnderScore(rowData?.document_type).replace(/\b\w/g, (char) =>
            char.toUpperCase()
          )}
          {isRequired && <span className="require-star ms-1">*</span>}
        </p>
      );
    } else if (column.field === "document_date") {
      return rowData?.document_date
        ? yearMonthDate(rowData?.document_date)
        : "-";
    } else if (column.field === "options") {
      const parts = rowData?.document_name?.split(".");
      const extension = parts?.pop();
      const filename = parts?.join(".");
      const img = extension === "pdf" ? "pdf" : "img";
      const path = rowData?.presigned_url;
      return (
        <div className="d-flex align-items-center justify-content-center">
          <span
            className="d-flex align-items-center manage-table-action-svg"
            style={{ gap: "16px" }}
          >
            {rowData?.document_id === "" && (
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
                      // onUploadSuccess={(updatedDocument) => {
                      //   // Update the specific document in the documents array
                      //   setDocuments((prevDocuments) =>
                      //     prevDocuments.map((doc, index) =>
                      //       index === rowIndex
                      //         ? { ...doc, ...updatedDocument }
                      //         : doc
                      //     )
                      //   );
                      //   reload(); // Refresh the main data
                      // }}
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
                  type="button"
                />

                {/* Show remove button only for additional_payee document type
                {rowData?.document_type === "additional_payee" && (
                  <Button
                    text
                    onClick={() => removePayeeDocument(rowIndex)}
                    {...gridToolTipOptins("Remove Payee Document")}
                    icon={() => <Img name="trash"></Img>}
                  />
                )} */}
              </>
            )}

            {rowData?.document_id != "" && (
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
                  type="button"
                  onClick={() => {
                    deleteFunc(rowData?.document_id);
                    // If it's an additional_payee document, remove from local state
                    if (rowData?.document_type === "additional_payee") {
                      removePayeeDocument(rowIndex);
                    }
                    reload(); // Refresh the main data
                  }}
                  {...gridToolTipOptins("Delete Document")}
                  icon={() => <Img name="trash"></Img>}
                />
              </>
            )}
          </span>
        </div>
      );
    }

    return rowData[column.field];
  };

  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();

  useEffect(() => {
    if (isMoveDataSuccess) {
      reload();
    }
  }, [isMoveDataSuccess]);

  console.log("Current Step", currentStep);
  console.log("Documents", documents);

  // Check if all required documents are uploaded
  // const areAllRequiredDocumentsUploaded = () => {
  //   if (!currentStep?.required_documents || !documents) return false;

  //   const requiredTypes = new Set(currentStep?.required_documents);
  //   const uploadedRequiredTypes = new Set();

  //   documents.forEach((doc) => {
  //     if (
  //       requiredTypes.has(doc.document_type) &&
  //       doc.document_id &&
  //       doc.document_id !== ""
  //     ) {
  //       uploadedRequiredTypes.add(doc.document_type);
  //     }
  //   });

  //   return uploadedRequiredTypes.size === requiredTypes.size;
  // };

  const additionalPayeeStatus = getAdditionalPayeeStatus();

  return (
    <div>
      <DataTableComponent
        columns={columns}
        paginator={false}
        data={documents || []}
        renderColumn={customRender}
      />

      {/* Only show More Payee button if no additional payee exists or it's not uploaded yet */}
      {/* {(!additionalPayeeStatus.exists || !additionalPayeeStatus.isUploaded) && ( */}
      {/* <div className="d-flex mt-3">
        <Button
          text
          label="Additional Payee Proof"
          className="text-black gap-2"
          type="button"
          disabled={!hasAccess || additionalPayeeStatus.exists}
          onClick={addMorePayeeDocument}
          icon={() => <Img name="add" />}
          data-testid="additional-payee-btn"
        />
      </div> */}
      {/* )} */}

      <div style={{ paddingBottom: 30 }}>
        <Button
          // disabled={!hasAccess || !areAllRequiredDocumentsUploaded()}
          disabled={!hasAccess}
          label="Upload Documents"
          data-testid="upload-documents-btn"
          severity="warning"
          className="border-radius-0 primary-btn mt-5"
          // onClick={() => {
          //   if (hasAccess && areAllRequiredDocumentsUploaded()) {
          //     moveCase({ params: caseId });
          //   }
          // }}
          onClick={() => {
            if (hasAccess) {
              moveCase({ params: caseId });
            }
          }}
        />
      </div>
    </div>
  );
};

export default UploadDocumentsStepComponentCorporation;
