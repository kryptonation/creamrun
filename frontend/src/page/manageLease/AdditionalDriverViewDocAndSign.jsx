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
  useGetStepDetailWithParamsQuery,
  useGetStepInfoQuery,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../redux/api/medallionApi";
import { useDispatch, useSelector } from "react-redux";
import { dateMonthYear, yearMonthDate } from "../../utils/dateConverter";
import BSelect from "../../components/BSelect";
import { useFormik } from "formik";
import BUpload from "../../components/BUpload";
import { removeUnderScore } from "../../utils/utils";
import EnvelopeStatus from "../newLease/EnvelopeStatus";
import { getCurrentStep } from "../../utils/caseUtils";
import PdfViewModalLease from "../newLease/PdfViewModalLease";
import {
  setIsUpload,
  setLastUploadedDocument,
} from "../../redux/slice/uploadSlice";
import BCalendar from "../../components/BCalendar";

const AdditionalDriverViewDocAndSign = ({
  caseId,
  currentStepId,
  currentStepData,
  hasAccess,
  caseData,
  reload,
}) => {
  console.log("currentCaseData", caseData);
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user.user);
  const isUpload = useSelector((state) => state.upload.isUpload);
  const lastUploadedDocument = useSelector(
    (state) => state.upload.lastUploadedDocument
  );

  const [processFlow, { isSuccess: isProccessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();
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
              {/* <Img name={img}></Img> */}
              <p className="three-dot-text">{name}</p>
            </div>
          }
          downloadUrl={path}
          downloadName={filename}
          extension={"PDF"}
          previewUrl={path}
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
  // const {
  //   data: stepInfoData,
  //   error,
  //   isLoading,
  //   refetch: refetchStepInfo,
  // } = useGetStepDetailWithParamsQuery({
  //   caseId: caseId,
  //   step_no: currentStepId,
  //   objectName: "lease",
  //   objectLookup: currentStepData?.lease_case_details?.lease_id,
  // });
  const formik = useFormik({
    initialValues: {
      lease_signed_mode: {
        code: "P",
        name: "Print",
      },
    },
    joinedDate: "",
  });

  useEffect(() => {
    if (isProccessDataSuccess) {
      dispatch(medallionApi.util.invalidateTags(["caseStep"]));
    }
  }, [isProccessDataSuccess]);

  const proccedDelete = () => {
    deleteFunc(deleteDocId);
  };
  useEffect(() => {
    if (isMoveDataSuccess) {
      reload();
    }
  }, [isMoveDataSuccess]);
  const leaseType = {
    ["dov"]: "DOV - Driver Owned Vehicle",
    ["long-term"]: "Long Term",
    ["short-term"]: "True weekly / Short Term",
    ["medallion-only"]: "Medallion-Only",
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
            {caseData.case_info.case_status !== "Closed" && (
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
            )}

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
              // title={removeUnderScore(data?.document_type).replace(
              //   /\b\w/g,
              //   (char) => char.toUpperCase()
              // )}
              title={"Additional Driver Form"}
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
            // title={removeUnderScore(data?.document_type).replace(
            //   /\b\w/g,
            //   (char) => char.toUpperCase()
            // )}
            title={"Additional Driver Form"}
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
          joined_date: yearMonthDate(formik.values.joinedDate),
        },
      },
    });
  };
  const submitMoveHandler = () => {
    console.log("Submit move handler", formik.values.joinedDate);
    if (
      hasAccess &&
      caseData &&
      caseData.case_info.case_status !== "Closed" &&
      getCurrentStep(caseData.steps).step_id === currentStepId
    ) {
      moveCase({ params: caseId });
    }
  };

  // const coLease0 = Array.isArray(stepInfoData?.documents)
  //   ? stepInfoData.documents.filter(
  //       (item) => item?.object_type === "co-leasee-0"
  //     )
  //   : [];
  const coLease0 = Array.isArray(stepInfoData?.documents)
    ? stepInfoData?.documents.filter(
        (item) =>
          item?.object_type === `ad-${stepInfoData?.documents[0]?.driver_id}`
      )
    : [];

  const allSigned = Array.isArray(stepInfoData?.documents)
    ? stepInfoData?.documents.every((item) => item?.has_driver_signed)
    : false;

  const isSignatureSent =
    Array.isArray(stepInfoData?.documents) && stepInfoData?.documents.length > 0
      ? stepInfoData?.documents.every((item) => item.document_envelope_id)
      : false;

  const isSignatureModeSelected = formik.values.lease_signed_mode !== "";

  useEffect(() => {
    if (stepInfoData) {
      const isUploadValue = isUpload;
      const allSigningTypes = Array.isArray(stepInfoData?.documents)
        ? stepInfoData?.documents.map((doc) => doc.signing_type)
        : [];

      const firstSigningType =
        allSigningTypes.length > 0 ? allSigningTypes[0] : null;
      const isSignatureModeSelected = Object.keys(signatureModeMap).find(
        (key) => signatureModeMap[key] === firstSigningType
      );
      if (
        stepInfoData?.lease_case_details?.driver &&
        stepInfoData?.documents?.[0]?.driver_id
      ) {
        const matchedDriver = stepInfoData.lease_case_details.driver.find(
          (d) => d.driver_id === stepInfoData.documents[0].driver_id
        );

        if (matchedDriver) {
          console.log("matchedDriver", matchedDriver?.joined_date);
          const joinedDateValue = matchedDriver?.joined_date
            ? new Date(matchedDriver.joined_date)
            : new Date();
          formik.setFieldValue("joinedDate", joinedDateValue);
        }
      }
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
              joined_date: yearMonthDate(formik.values.joinedDate),
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
      {/* <div className="d-flex align-items-center justify-content-between">
        <div className="topic-txt d-flex align-items-center gap-2">
          <Img name="document" className="icon-black"></Img>Sign Additional
          Driver Form
        </div>
      </div>
      <div className="d-flex align-items-center gap-5 py-4 ">
        <BCaseCard
          label="Lease ID"
          value={currentStepData?.lease_case_details?.medallion_number}
        />
        <BCaseCard
          label="Lease Type"
          value={leaseType[currentStepData?.lease_case_details?.lease_type]}
        />
        <BCaseCard
          label="Medallion No"
          value={currentStepData?.lease_case_details?.medallion_number}
        />
        <BCaseCard
          label="Vehicle VIN No"
          value={currentStepData?.lease_case_details?.vehicle_vin}
        />
      </div> */}

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
        <p className="regular-semibold-text">Additional Driver Document</p>
        <DataTable
          value={coLease0}
          // value={stepInfoData?.documents}
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
            field="Lessee"
            header="Lessee"
            body={(data) => activeIndaction(data, false)}
          ></Column>
          <Column
            field="Additional Driver"
            header="Additional Driver"
            body={(data) => activeIndaction(data, true)}
          ></Column>
          <Column header="" body={viewDocument} />
        </DataTable>
      </>

      {/* {!isSignatureSent && (
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
      )} */}
      <div className="form-body mt-4">
        <p className="regular-semibold-text">
          Driver Record and Signature Method
        </p>
        <div
          className="d-flex align-items-center flex-wrap form-grid-1 w-100 p-3 mt-3"
          style={{ rowGap: "4rem", gap: "4rem 1rem" }}
        >
          <div className="w-100-3">
            <BCalendar
              variable={{
                id: "joinedDate",
                label: "Date Added to Lease",
                // isRequire: true,
              }}
              formik={formik}
            />
          </div>
          {!isSignatureSent && (
            <div className="w-25">
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
        </div>
      </div>

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
              caseData.case_info.case_status === "Closed"
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

export default AdditionalDriverViewDocAndSign;
