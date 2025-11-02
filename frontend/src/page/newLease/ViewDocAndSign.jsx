import { DataTable } from "primereact/datatable";
import BCaseCard from "../../components/BCaseCard";
import Img from "../../components/Img";
import { Column } from "primereact/column";
import BModal from "../../components/BModal";
import { Button } from "primereact/button";
import BConfirmModal from "../../components/BConfirmModal";
import BToast from "../../components/BToast";
import { useEffect, useRef, useState } from "react";
import {
  medallionApi,
  useDeleteDocumentMutation,
  useGetStepInfoQuery,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../redux/api/medallionApi";
import { useDispatch, useSelector } from "react-redux";
import { dateMonthYear } from "../../utils/dateConverter";
import BSelect from "../../components/BSelect";
import { useFormik } from "formik";
import BUpload from "../../components/BUpload";
import { removeUnderScore } from "../../utils/utils";
import EnvelopeStatus from "./EnvelopeStatus";
import { getCurrentStep } from "../../utils/caseUtils";
import PdfViewModalLease from "./PdfViewModalLease";
import {
  setIsUpload,
  setLastUploadedDocument,
} from "../../redux/slice/uploadSlice";

const ViewDocAndSign = ({
  caseId,
  currentStepId,
  currentStepData,
  hasAccess,
  caseData,
}) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user.user);
  const isUpload = useSelector((state) => state.upload.isUpload);
  const lastUploadedDocument = useSelector(
    (state) => state.upload.lastUploadedDocument
  );

  const [processFlow, { isSuccess: isProccessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [moveCase] = useMoveCaseDetailMutation();
  const documentName = (data) => {
    const parts = data?.document_name?.split(".");
    const extension = data?.document_format; // The last element is the extension
    const filename = parts.join(".");
    const img = extension === "PDF" ? "pdf" : "img";
    const path = data?.presigned_url;
    const name = data?.document_name;
    return (
      <>
        <PdfViewModalLease
          triggerButton={
            <div className="d-flex align-items-center gap-2 doc-img">
              <Img name={img}></Img>
              <p className="three-dot-text">{name}</p>
            </div>
          }
          downloadUrl={path}
          downloadName={filename}
          extension={"PDF"}
          previewUrl={path}
          title={removeUnderScore(data?.document_type).replace(
            /\b\w/g,
            (char) => char.toUpperCase()
          )}
        />
      </>
    );
  };
  const [isOpen, setOpen] = useState(false);
  const signatureModeMap = {
    P: "print",
    I: "in-person",
  };
  const envelopeStatusTemplete = (rowData) => {
    return (
      <EnvelopeStatus
        id={rowData.document_envelope_id}
        rowData={rowData}
      ></EnvelopeStatus>
    );
  };

  const documentType = (rowData) => {
    return (
      <>
        <span>{removeUnderScore(rowData.document_type)}</span>
      </>
    );
  };

  const [deleteFunc] = useDeleteDocumentMutation();
  const toast = useRef(null);
  const [deleteDocId, setDeleteDocId] = useState();

  const driverName = (data) => {
    return (
      <>
        <p style={{ fontSize: 15, fontWeight: "bold" }}>{data?.driver_name}</p>
      </>
    );
  };
  const { data: stepInfoData, refetch: refetchStepInfo } = useGetStepInfoQuery(
    { caseNo: caseId, step_no: currentStepId },
    { skip: !currentStepId || !caseId }
  );
  const formik = useFormik({
    initialValues: {
      lease_signed_mode: {
        code: "P",
        name: "Print",
      },
    },
  });

  useEffect(() => {
    if (isProccessDataSuccess) {
      dispatch(medallionApi.util.invalidateTags(["caseStep"]));
    }
  }, [isProccessDataSuccess]);

  const proccedDelete = () => {
    deleteFunc(deleteDocId);
  };
  const leaseType = {
    ["dov"]: "DOV - Driver Owned Vehicle",
    ["long-term"]: "Long Term",
    ["short-term"]: "True weekly / Short Term",
    ["medallion-only"]: "Medallion-Only",
    ["shift-lease"]: "Shift Lease",
  };

  const activeIndaction = (data, isLease) => {
    if (isLease && data.has_driver_signed) {
      return (
        <Img name="ic_step_success" className="text-white success-icon"></Img>
      );
    } else if (!isLease && data.has_front_desk_signed) {
      return (
        <Img name="ic_step_success" className="text-white success-icon"></Img>
      );
    }
    return "-";
  };

  const viewDocument = (data) => {
    const parts = data?.document_name?.split(".");
    const filename = parts.join(".");
    const path = data?.presigned_url;
    if (formik.values.lease_signed_mode?.code === "P") {
      return (
        <>
          <div className="d-flex align-items-center justify-content-center gap-3">
            <BModal>
              <BModal.ToggleButton>
                <Button
                  outlined
                  text
                  className="text-blue gap-2 p-0 outline-btn upload-common-btn fs-16-semibold d-flex "
                  type="button"
                  icon={() => <Img name="uploaddoc" />}
                />
              </BModal.ToggleButton>
              <BModal.Content>
                <BUpload
                  data={{ ...data }}
                  object_type={data?.object_type}
                  object_id={data?.object_lookup_id}
                  document_id={0}
                  isAlwaysUpload={true}
                  document_type={[
                    {
                      name: removeUnderScore(data?.document_type),
                      code: data?.document_type,
                    },
                  ]}
                />
              </BModal.Content>
            </BModal>
            <PdfViewModalLease
              triggerButton={
                <div className="d-flex align-items-center gap-2 doc-img">
                  {/* <Img name={img}></Img>
              <p className="three-dot-text">{name}</p> */}
                  <Img name="ic_eye" />
                </div>
              }
              downloadUrl={path}
              downloadName={filename}
              extension={"PDF"}
              previewUrl={path}
              title={removeUnderScore(data?.document_type).replace(
                /\b\w/g,
                (char) => char.toUpperCase()
              )}
            />
          </div>
        </>
      );
    } else {
      return (
        <>
          <PdfViewModalLease
            triggerButton={
              <div className="d-flex align-items-center gap-2 doc-img">
                <Img name="ic_eye" />
              </div>
            }
            downloadUrl={path}
            downloadName={filename}
            extension={"PDF"}
            previewUrl={path}
            title={removeUnderScore(data?.document_type).replace(
              /\b\w/g,
              (char) => char.toUpperCase()
            )}
          />
        </>
      );
    }
  };

  const dateFormate = (data) => {
    if (data.document_date) {
      return dateMonthYear(data.document_date);
    }
    return "-";
  };

  const submitHandler = () => {
    processFlow({
      params: caseId,
      data: {
        step_id: currentStepId,
        data: {
          authorized_agent: user.first_name,
          name: user.first_name,
          email: user.email_address,
          signature_mode:
            signatureModeMap[formik.values.lease_signed_mode?.code] || null,
        },
      },
    });
  };
  const submitMoveHandler = () => {
    if (
      hasAccess &&
      caseData &&
      caseData.case_info.case_status !== "Closed" &&
      getCurrentStep(caseData.steps).step_id === currentStepId
    ) {
      moveCase({ params: caseId });
    }
  };

  const coLease0 = Array.isArray(stepInfoData?.documents)
    ? stepInfoData.documents.filter(
        (item) => item?.object_type === "co-leasee-0"
      )
    : [];

  const allSigned = Array.isArray(stepInfoData?.documents)
    ? stepInfoData.documents.every((item) => item?.has_driver_signed)
    : false;

  const isSignatureSent =
    Array.isArray(stepInfoData?.documents) && stepInfoData.documents.length > 0
      ? stepInfoData.documents.every((item) => item.document_envelope_id)
      : false;

  const isSignatureModeSelected = formik.values.lease_signed_mode !== "";

  useEffect(() => {
    if (stepInfoData) {
      const isUploadValue = isUpload;
      const allSigningTypes = Array.isArray(stepInfoData?.documents)
        ? stepInfoData.documents.map((doc) => doc.signing_type)
        : [];

      const firstSigningType =
        allSigningTypes.length > 0 ? allSigningTypes[0] : null;
      const isSignatureModeSelected = Object.keys(signatureModeMap).find(
        (key) => signatureModeMap[key] === firstSigningType
      );

      if (isSignatureModeSelected === "P") {
        formik.setFieldValue("lease_signed_mode", { name: "Print", code: "P" });
      } else if (isSignatureModeSelected === "I") {
        formik.setFieldValue("lease_signed_mode", {
          name: "in-person",
          code: "I",
        });
      } else if (isSignatureModeSelected === "M") {
        formik.setFieldValue("lease_signed_mode", { name: "email", code: "M" });
      }

      if (isUploadValue && lastUploadedDocument) {
        const doc1 = stepInfoData?.documents.find(
          (doc) => doc.document_id === lastUploadedDocument.document_id
        );
        const doc2 = stepInfoData?.documents.find(
          (doc) => doc.document_id !== lastUploadedDocument.document_id
        );

        const documents = [];

        if (doc1) {
          documents.push({
            document_id: doc1.document_id,
            has_driver_signed:
              lastUploadedDocument.document_id === doc1.document_id
                ? true
                : doc1.has_driver_signed,
            has_front_desk_signed:
              lastUploadedDocument.document_id === doc1.document_id
                ? true
                : doc1.has_front_desk_signed,
          });
        }
        if (doc2) {
          documents.push({
            document_id: doc2.document_id,
            has_driver_signed:
              lastUploadedDocument.document_id === doc2.document_id
                ? true
                : doc2.has_driver_signed,
            has_front_desk_signed:
              lastUploadedDocument.document_id === doc2.document_id
                ? true
                : doc2.has_front_desk_signed,
          });
        }
        processFlow({
          params: caseId,
          data: {
            step_id: currentStepId,
            data: {
              authorized_agent: user.first_name,
              name: user.first_name,
              email: user.email_address,
              signature_mode:
                signatureModeMap[formik.values.lease_signed_mode?.code] || null,
              print_document_details: documents,
            },
          },
        });
      }

      dispatch(setIsUpload(false));
      dispatch(setLastUploadedDocument(null));
    }
  }, [stepInfoData]);

  return (
    <div className="w-100 h-100">
      <div className="d-flex align-items-center justify-content-between">
        <div className="topic-txt d-flex align-items-center gap-2">
          <Img name="document" className="icon-black"></Img>View Documents and
          Sign
        </div>
      </div>
      <div className="d-flex align-items-center gap-5 py-4 ">
        <BCaseCard
          label="Medallion No"
          value={currentStepData?.lease_case_details?.medallion_number}
        />
        <BCaseCard
          label="Medallion Owner"
          value={currentStepData?.lease_case_details?.medallion_owner}
        />
        <BCaseCard
          label="Vehicle VIN No"
          value={currentStepData?.lease_case_details?.vehicle_vin}
        />
        <BCaseCard
          label="Vehicle"
          value={
            (currentStepData?.lease_case_details?.make || "") +
            " " +
            (currentStepData?.lease_case_details?.model || "") +
            " " +
            (currentStepData?.lease_case_details?.year || "-")
          }
        />
        <BCaseCard
          label="Vehicle Plate No"
          value={currentStepData?.lease_case_details?.plate_number}
        />
        <BCaseCard
          label="Vehicle Type"
          value={currentStepData?.lease_case_details?.vehicle_type.replace(
            "Wav",
            "WAV"
          )}
        />
        <BCaseCard
          label="Lease Type"
          value={
            stepInfoData?.lease_case_details?.lease_type === "shift-lease"
              ? `${leaseType[stepInfoData?.lease_case_details?.lease_type]} - ${
                  stepInfoData?.lease_case_details?.vehicle_availability || ""
                }`
              : leaseType[stepInfoData?.lease_case_details?.lease_type]
          }
        />
      </div>

      <>
        <div className="right-content-heder">
          <Button
            data-testid="refresh_btn"
            className="manage-table-action-svg"
            icon={() => <Img name={"refresh"} />}
            onClick={() => {
              refetchStepInfo();
            }}
          ></Button>
        </div>
        <p className="regular-semibold-text">Lease Document</p>
        <DataTable
          value={coLease0}
          className="primary-table"
          selectionMode={null}
          showGridlines={true}
          dataKey="id"
          tableStyle={{ minWidth: "50rem" }}
        >
          <Column field="driver_name" header="Driver Name" body={driverName} />
          <Column
            field="document_name"
            header="Document Name"
            body={documentName}
          />
          <Column
            field="document_status"
            header="Status"
            body={envelopeStatusTemplete}
          />
          <Column
            field="document_type"
            header="Document Type"
            body={documentType}
          />
          <Column
            field="document_date"
            header="Document Date"
            body={dateFormate}
          />
          <Column field="comments" header="Comments" />
          <Column
            field="BATM"
            header="BATM"
            body={(data) => activeIndaction(data, false)}
          ></Column>
          <Column
            field="Lessee"
            header="Lessee"
            body={(data) => activeIndaction(data, true)}
          ></Column>
          <Column header="" body={viewDocument} />
        </DataTable>
      </>

      {!isSignatureSent && (
        <div className="w-25 mb-3 mt-5">
          <BSelect
            variable={{
              id: "lease_signed_mode",
              label: "Lease Signature Method",
              options: [
                { name: "In Person", code: "I" },
                { name: "Print", code: "P" },
              ],
            }}
            formik={formik}
          ></BSelect>
        </div>
      )}

      <BConfirmModal
        isOpen={isOpen}
        title="Confirmation on Delete Medallion"
        message="Are you sure to delete the selected Medallion?"
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

      <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        {!isSignatureSent ? (
          <Button
            disabled={
              !hasAccess ||
              !isSignatureModeSelected ||
              (formik.values.lease_signed_mode?.code === "P"
                ? !allSigned
                : false) ||
              caseData.case_info.case_status === "Closed"
            }
            label={
              formik.values.lease_signed_mode?.code !== "P"
                ? "Generate E-Sign"
                : "Continue"
            }
            type="submit"
            onClick={() => {
              formik.values.lease_signed_mode?.code !== "P"
                ? submitHandler()
                : submitMoveHandler();
            }}
            severity="warning"
            className="border-radius-0 primary-btn "
          />
        ) : (
          <Button
            disabled={
              !hasAccess ||
              !allSigned ||
              getCurrentStep(caseData.steps).step_id != currentStepId ||
              !getCurrentStep(caseData.steps).is_current_step ||
              caseData?.case_info?.case_status === "Closed"
            }
            label={"Continue"}
            type="submit"
            onClick={submitMoveHandler}
            severity="warning"
            className="border-radius-0 primary-btn "
          />
        )}
      </div>
    </div>
  );
};

export default ViewDocAndSign;
