import { useFormik } from "formik";
import { useEffect, useRef, useState } from "react";
import { driverUpdateAddress as variable } from "../../../utils/variables";
import { Button } from "primereact/button";
import BInputText from "../../../components/BInputText";
import {
  useGetStepInfoQuery,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../../redux/api/medallionApi";
import { getCurrentStep } from "../../../utils/caseUtils";
import BSuccessMessage from "../../../components/BSuccessMessage";
import { useNavigate } from "react-router-dom";
import Img from "../../../components/Img";
import { Accordion, AccordionTab } from "primereact/accordion";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import BModal from "../../../components/BModal";
import DownloadBtn from "../../../components/DownloadBtn";
import PDFViewer from "../../../components/PDFViewer";
import PdfViewModal from "../../../components/PdfViewModal";
import DocumentGrid from "../../../components/DocumentGrid";
import BSelect from "../../../components/BSelect";
import { getFullName, kbToMb, removeUnderScore } from "../../../utils/utils";
import { validateUSZipCode } from "../../../utils/formUitiles";
import { yearMonthDate } from "../../../utils/dateConverter";
import { statesOptions } from "../../../utils/variables";
import BToast from "../../../components/BToast";

const DriverUpdateAddress = ({
  caseId,
  currentStepId,
  currentStep,
  caseData,
  hasAccess,
}) => {
  const [processFlow, { isSuccess: isProcessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();
  const navigate = useNavigate();
  const [isOpen, setOpen] = useState(false);
  const { data: stepInfoData } = useGetStepInfoQuery({
    caseNo: caseId,
    step_no: currentStepId,
  });
  const [isErrorActive, setIsErrorActive] = useState(false);
  const toast = useRef(null);
  useEffect(() => {
    if (isMoveDataSuccess) {
      //   reload();
      setOpen(true);
    }
  }, [isMoveDataSuccess]);

  useEffect(() => {
    if (
      hasAccess &&
      isProcessDataSuccess &&
      getCurrentStep(caseData.steps).step_id == currentStepId &&
      getCurrentStep(caseData.steps).is_current_step
    ) {
      moveCase({ params: caseId });
    }
  }, [isProcessDataSuccess]);
  const validateZipCodeField = (value) => {
    const result = validateUSZipCode(value);
    return result.isValid ? undefined : result.message;
  };
  const formik = useFormik({
    initialValues: {
      [variable?.[0].id]: "",
      [variable?.[1].id]: "",
      [variable?.[2].id]: "",
      [variable?.[3].id]: "",
      [variable?.[4].id]: "",
      // [variable?.[5].id]: "",
      [variable?.[6].id]: "",
      [variable?.[7].id]: "",
      [variable?.[8].id]: "",
      [variable?.[9].id]: "",
    },
    validateOnChange: false,
    validate: (values) => {
      const errors = {};
      if (!values[variable[0].id]) {
        errors[variable[0].id] = `${variable[0].label} is required`;
      }
      if (!values[variable[2].id]) {
        errors[variable[2].id] = `${variable[2].label} is required`;
      }
      if (!values[variable[3].id]) {
        errors[variable[3].id] = `${variable[3].label} is required`;
      }
      if (!values[variable[4].id]) {
        errors[variable[4].id] = `${variable[4].label} is required`;
      }
      const zipError = validateZipCodeField(values[variable[4].id]);
      if (zipError) {
        errors.zip = zipError;
      }

      if (values.seczip && values.seczip.trim()) {
        const zipError = validateZipCodeField(values.seczip);
        if (zipError) {
          errors.seczip = zipError;
        }
      }
      // if (!values[variable[5].id]) {
      //     errors[variable[5].id] = `${variable[5].label} is required`;
      // }
      console.log("Errors", errors);
      return errors;
    },
    onSubmit: (values) => {
      let demoData = {};
      demoData = {
        step_id: currentStepId,
        data: {
          driver_id: currentStep?.driver_info?.driver_lookup_id,
          primary_address_detail: {
            address_line_1: values[variable?.[0].id],
            address_line_2: values[variable?.[1].id],
            city: values[variable?.[2].id],
            state: values[variable?.[3].id]?.code,
            zip: values[variable?.[4].id],
            // po_box: values[variable?.[5].id],
          },
          secondary_address_detail: {
            address_line_1: values[variable?.[6].id],
            address_line_2: values[variable?.[7].id],
            city: values[variable?.[8].id],
            state: values[variable?.[9].id]?.code,
            zip: values[variable?.[10].id],
            // po_box: values[variable?.[11].id],
          },
        },
      };
      if (hasAccess) processFlow({ params: caseId, data: demoData });
    },
  });

  //  const [deleteFunc, { isSuccess: isDeleteSuccess }] = useDeleteDocumentMutation();

  //   const deleteTemplete = (data) => {
  //     setDeleteDocId(data.document_id);
  //     return <Button disabled={!hasAccess} text onClick={() => setDeleteOpen(true)} icon={() => <Img name="delete"></Img>} />;
  //   };

  const handleFormSubmit = async () => {
    const errors = await formik.validateForm();
    if (Object.keys(errors).length > 0) {
      formik.setTouched(
        Object.keys(errors).reduce((acc, key) => ({ ...acc, [key]: true }), {}),
        false
      );
      if (!isErrorActive) {
        toast.current.showToast(
          "Error",
          "Please complete all required fields and upload the necessary files before submitting",
          "error",
          false,
          10000
        );
        setIsErrorActive(true);
        setTimeout(() => setIsErrorActive(false), 10000);
      }
    } else {
      formik.submitForm();
    }
  };

  const documentName = (data) => {
    console.log("Data", data);
    const parts = data?.document_name?.split(".");
    const extension = parts?.pop(); // The last element is the extension
    const filename = parts?.join(".");
    // const [filename, extension] = splitFileName("https://projects.wojtekmaj.pl/react-pdf/assets/sample-8bb8af10.pdf");
    const img = extension === "pdf" ? "pdf" : "img";
    // const path=`${process.env.REACT_APP_API_IMAGE_BASE_URL}/${data?.document_path}`;
    const path = data?.presigned_url;

    return (
      <>
        {/* <BModal>
                <BModal.ToggleButton>
                    <div className="d-flex align-items-center gap-2 doc-img">
                        <Img name={img}></Img>
                        <p>{`${filename}.${img}`}</p>
                    </div>
                </BModal.ToggleButton>
                <BModal.SideContent position={"right"}>
                    <div className="">
                        <div className="d-flex align-items-center justify-content-between">
                            <p className="topic-txt">Lease Agreement</p>
                            <DownloadBtn url={path} ext={extension} name={filename}>
                                <a href={path} rel="noreferrer" title={filename} target="_blank" className="download-link ms-1 d-flex align-items-center ">
                                    <Button disabled={!hasAccess} text icon={() => <Img name="download"></Img>}></Button></a>
                            </DownloadBtn>
                        </div>
                        {
                            extension === "pdf" ? <PDFViewer url={path}></PDFViewer> :
                                <div className="d-flex w-100 align-items-center justify-content-center ">
                                    <img src={path} alt="" className="border border-4  border-black " />
                                </div>
                        }
                    </div>
                </BModal.SideContent>
            </BModal> */}
        {/* <PdfViewModal
          triggerButton={
            <div className="d-flex align-items-center gap-2 doc-img">
              <Img name={img}></Img>
              <p>{`${filename}.${img}`}</p>
            </div>
          }
          downloadUrl={path}
          downloadName={filename}
          extension={extension}
          previewUrl={path}
        /> */}
        <PdfViewModal
          triggerButton={
            <div
              className="d-flex align-items-center gap-2 doc-img"
              data-testid="individual-upload-common-btn"
            >
              {filename ? (
                <div className="d-flex align-items-center gap-2 doc-img">
                  {/* <Img name={img}></Img> */}
                  <p>{`${filename}.${extension}`}</p>
                </div>
              ) : (
                removeUnderScore(data?.document_type)
              )}
            </div>
          }
          title={removeUnderScore(data?.document_type).replace(
            /\b\w/g,
            (char) => char.toUpperCase()
          )}
          downloadUrl={path}
          downloadName={filename}
          extension={extension}
          previewUrl={path}
        />
      </>
    );
  };
  const docViewTemplate = (data) => {
    const parts = data?.document_name?.split(".");
    const extension = parts?.pop(); // The last element is the extension
    const filename = parts?.join(".");
    // const [filename, extension] = splitFileName("https://projects.wojtekmaj.pl/react-pdf/assets/sample-8bb8af10.pdf");
    const img = extension === "pdf" ? "pdf" : "img";
    // const path=`${process.env.REACT_APP_API_IMAGE_BASE_URL}/${data?.document_path}`;
    const path = data?.presigned_url;
    return (
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
        title={removeUnderScore(data?.document_type).replace(/\b\w/g, (char) =>
          char.toUpperCase()
        )}
        downloadUrl={path}
        downloadName={filename}
        extension={extension}
        previewUrl={path}
      />
    );
  };
  const viewDocType = (data) => {
    if (!data?.document_type) return null;

    const formatted = removeUnderScore(data.document_type).replace(
      /\b\w/g,
      (char) => char.toUpperCase()
    );

    return <>{formatted}</>;
  };
  const renderDocumentDate = (data) => {
    return data?.document_date ? yearMonthDate(data?.document_date) : "-";
  };
  const renderDocumentSize = (data) => {
    return data?.document_size ? kbToMb(data?.document_size) : "-";
  };

  useEffect(() => {
    if (currentStep) {
      const primaryAddress = currentStep?.primary_driver_address_info;
      const secondaryAddress = currentStep?.secondary_driver_address_info;
      formik.setFieldValue(
        [variable?.[0].id],
        primaryAddress?.[variable?.[0].id] || "",
        true
      );
      formik.setFieldValue(
        [variable?.[1].id],
        primaryAddress?.[variable?.[1].id] || "",
        true
      );
      formik.setFieldValue(
        [variable?.[2].id],
        primaryAddress?.[variable?.[2].id] || "",
        true
      );
      // formik.setFieldValue(
      //   [variable?.[3].id],
      //   primaryAddress?.[variable?.[3].id] || "",
      //   true
      // );

      const dmvIssuedState = primaryAddress?.[variable?.[3].id];

      if (
        dmvIssuedState &&
        dmvIssuedState !== formik.values.dmvLicenseIssuedState?.code
      ) {
        const matchedOption = statesOptions.find(
          (item) => item.code === dmvIssuedState
        );

        formik.setFieldValue([variable?.[3].id], matchedOption || null, true);
      }
      formik.setFieldValue(
        [variable?.[4].id],
        primaryAddress?.[variable?.[4].id] || "",
        true
      );
      // formik.setFieldValue(
      //   [variable?.[5].id],
      //   primaryAddress?.po_box || "",
      //   true
      // );
      formik.setFieldValue(
        [variable?.[6].id],
        secondaryAddress?.address_line_1 || "",
        true
      );
      formik.setFieldValue(
        [variable?.[7].id],
        secondaryAddress?.address_line_2 || "",
        true
      );
      formik.setFieldValue(
        [variable?.[8].id],
        secondaryAddress?.city || "",
        true
      );
      // formik.setFieldValue(
      //   [variable?.[9].id],
      //   secondaryAddress?.state || "",
      //   true
      // );
      // const secondaryState = secondaryAddress?.[variable?.[9].id];

      const secondaryState = secondaryAddress?.state; // "NY"

      if (secondaryState && secondaryState !== formik.values.secstate?.code) {
        const matchedOption = statesOptions.find(
          (item) => item.code === secondaryState
        );

        formik.setFieldValue(variable?.[9].id, matchedOption || null, true);
      }

      formik.setFieldValue(
        [variable?.[10].id],
        secondaryAddress?.zip || "",
        true
      );
      // formik.setFieldValue(
      //   [variable?.[11].id],
      //   secondaryAddress?.po_box || "",
      //   true
      // );
    }
  }, [currentStep]);
  const updateEnterAddress = () => {
    // const data = {
    //     step_id: currentStepId,
    //     data: {
    //         medallion_number: medallionNumber,
    //         address_line_1: formik?.values.addressLine1,
    //         address_line_2: formik?.values.addressLine2,
    //         city: formik?.values.city,
    //         state: formik?.values.state,
    //         zip: formik?.values.zip
    //     }
    // };
    // if (hasAccess)
    //     processFlow({ params: caseId, data: data });
    let demoData = {};
    demoData = {
      step_id: currentStepId,
      data: {
        driver_id: currentStep?.driver_info?.driver_lookup_id,
        primary_address_detail: {
          address_line_1: formik?.values[variable?.[0].id],
          address_line_2: formik?.values[variable?.[1].id],
          city: formik?.values[variable?.[2].id],
          state: formik?.values[variable?.[3].id]?.code || "",
          zip: formik?.values[variable?.[4].id],
          // po_box: formik?.values[variable?.[5].id],
        },
        secondary_address_detail: {
          address_line_1: formik?.values[variable?.[5].id],
          address_line_2: formik?.values[variable?.[6].id],
          city: formik?.values[variable?.[7].id],
          state: formik?.values[variable?.[8].id]?.code,
          zip: formik?.values[variable?.[9].id],
          // po_box: formik?.values[variable?.[11].id],
        },
      },
    };
    console.log("payload", demoData);
    //if (hasAccess) processFlow({ params: caseId, data: demoData });
  };

  return (
    <form onSubmit={formik.handleSubmit}>
      <Accordion
        multiple
        activeIndex={[0, 1]}
        collapseIcon={() => (
          <Img className="arrow-icon" name="ic_arrow_up"></Img>
        )}
        expandIcon={() => (
          <Img className="arrow-icon" name="ic_arrow_down"></Img>
        )}
      >
        {/* <AccordionTab
          header="Uploaded Documents"
          pt={{
            content: { className: "bg-transparent border-0 p-0" },
            header: { className: "bg-transparent border-0" },
            headerAction: {
              className:
                "bg-transparent border-0 text-black address-accordion d-flex align-items-center flex-row-reverse",
            },
          }}
        >
          <DataTable
            value={currentStep?.driver_address_proof}
            className="primary-table"
            selectionMode={null}
            showGridlines={true}
            dataKey="id"
            tableStyle={{ minWidth: "50rem" }}
          >
            <Column
              field="document_name"
              header="Document Name"
              body={documentName}
              sortable
            ></Column>
            <Column
              field="document_type"
              header="Document Type"
              body={viewDocType}
              sortable
            ></Column>
            <Column
              field="document_date"
              header="Document Date"
              body={renderDocumentDate}
              sortable
            ></Column>
            <Column
              field="document_size"
              header="File Size"
              body={renderDocumentSize}
              sortable
            ></Column>
            <Column field="comments" header="Comments" sortable></Column>
            <Column field="" header="" body={docViewTemplate}></Column>
          </DataTable>
        </AccordionTab> */}
        <AccordionTab
          header="Address Details"
          pt={{
            content: { className: "bg-transparent border-0 p-0" },
            header: { className: "bg-transparent border-0" },
            headerAction: {
              className:
                "bg-transparent border-0 text-black address-accordion d-flex align-items-center flex-row-reverse",
            },
          }}
        >
          <div className="common-form d-flex flex-column">
            <div className="form-section">
              <div className="form-body d-flex flex-column common-gap">
                <div
                  className="d-flex align-items-center flex-wrap form-grid-1 w-100"
                  style={{ rowGap: "4rem", gap: "4rem 1rem" }}
                >
                  <div className="w-100">
                    <p className="sec-topic">Primary Address</p>
                  </div>
                  <div className="w-100-2">
                    <BInputText
                      variable={variable?.[0]}
                      formik={formik}
                    ></BInputText>
                  </div>
                  <div className="w-100-2">
                    <BInputText
                      variable={variable?.[1]}
                      formik={formik}
                    ></BInputText>
                  </div>
                  <div className="w-100-3">
                    <BInputText
                      variable={variable?.[2]}
                      formik={formik}
                    ></BInputText>
                  </div>
                  <div className="w-100-3">
                    <BSelect variable={variable?.[3]} formik={formik}></BSelect>
                  </div>
                  <div className="w-100-3">
                    <BInputText
                      variable={variable?.[4]}
                      formik={formik}
                    ></BInputText>
                  </div>
                  {/* <div className="w-100-2">
                    <BInputText
                      variable={variable?.[5]}
                      formik={formik}
                    ></BInputText>
                  </div> */}
                  <div className="w-100">
                    <p className="sec-topic">Secondary Address</p>
                  </div>
                  <div className="w-100-2">
                    <BInputText
                      variable={variable?.[6]}
                      formik={formik}
                    ></BInputText>
                  </div>
                  <div className="w-100-2">
                    <BInputText
                      variable={variable?.[7]}
                      formik={formik}
                    ></BInputText>
                  </div>
                  <div className="w-100-3">
                    <BInputText
                      variable={variable?.[8]}
                      formik={formik}
                    ></BInputText>
                  </div>
                  <div className="w-100-3">
                    <BSelect variable={variable?.[9]} formik={formik}></BSelect>
                  </div>
                  <div className="w-100-3">
                    <BInputText
                      variable={variable?.[10]}
                      formik={formik}
                    ></BInputText>
                  </div>
                  {/* <div className="w-100-3">
                    <BInputText
                      variable={variable?.[11]}
                      formik={formik}
                    ></BInputText>
                  </div> */}
                </div>
              </div>
            </div>
          </div>
        </AccordionTab>
      </Accordion>
      <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        <Button
          disabled={!hasAccess}
          // onClick={() => updateEnterAddress()}
          label="Submit Updated Address"
          type="button"
          severity="warning"
          className="border-radius-0 primary-btn "
          onClick={handleFormSubmit}
        />
      </div>
      <BSuccessMessage
        isOpen={isOpen}
        message={`Address update is success and approved for Driver ${getFullName(
          stepInfoData?.driver_info?.first_name,
          stepInfoData?.driver_info?.middle_name,
          stepInfoData?.driver_info?.last_name
        )}`}
        title="Driver Address Update Process is Successful"
        onCancel={() => {
          setOpen(false);
          navigate("/manage-driver", { replace: true });
        }}
        onConfirm={() => {
          setOpen(false);
          navigate("/manage-driver", { replace: true });
        }}
      />
      {/* <div className="w-100 position-sticky bottom-0 py-3 bg-white">
                <Button
                    disabled={!hasAccess}
                    label="Submit Address Details"
                    severity="warning"
                    className="border-radius-0 primary-btn"
                    onClick={() => updateEnterMedallionAddress()}
                />
            </div>
            <BSuccessMessage isHtml={true} isOpen={isOpen} message={`Medallion <strong>${currentStep?.[0]?.object_lookup_id || ""}</strong> owner address update is successful and approved`} title="MO Owner Address update process is successful" onCancel={() => {
                setOpen(false); navigate('/manage-medallion', { replace: true });
            }} onConfirm={() => {
                setOpen(false); navigate('/manage-medallion', { replace: true });

            }}></BSuccessMessage> */}
      <BToast ref={toast} position="top-right" />
    </form>
  );
};

export default DriverUpdateAddress;
