import { Button } from "primereact/button";
import Img from "./Img";
import BInputText from "./BInputText";
import BSelect from "./BSelect";
import { useFormik } from "formik";
import Bcalendar from "./BCalendar";
import { useEffect, useRef, useState } from "react";
import { FileUpload } from "primereact/fileupload";
import { splitFileName } from "../utils/splitFileName";
import { yearMonthDate } from "../utils/dateConverter";
import BAttachedFile from "./BAttachedFile";
import { useUploadDocumentMutation } from "../redux/api/medallionApi";
import { useDispatch } from "react-redux";
import { setIsUpload } from "../redux/slice/uploadSlice";
import { Dialog } from "primereact/dialog";
import BWebCamCapture from "./BWebCamCapture";
import { dataURItoBlob } from "../utils/formUitiles";

const BUploadFileRequired = ({
  setIsOpen,
  action,
  object_type,
  object_id,
  document_type,
  ismultiple = false,
  data: apiData,
}) => {
  const dispatch = useDispatch();

  const variable = {
    field_01: {
      id: "documentDate",
      label: "Document Date",
      isRequire: true,
    },
    field_02: {
      id: "documentType",
      label: "Document Type",
      isRequire: true,
    },
    field_03: {
      id: "notes",
      label: "Notes",
    },
  };
  const [file, setFile] = useState(null);
  const [visibleCam, setVisibleCam] = useState(false);

  const [uploadDoc, { isSuccess: isDocSuccess, isFetching }] =
    useUploadDocumentMutation();

  useEffect(() => {
    if (apiData) {
      setFile({
        name: apiData.document_name,
        id: apiData.document_id,
        path: apiData.presigned_url,
      });
      formik.setFieldValue(
        "notes",
        apiData.document_note ? apiData.document_note : "",
        false
      );
      formik.setFieldValue(
        "documentType",
        apiData.document_type
          ? document_type?.filter(
              (item) => item?.code === apiData.document_type
            )[0]
          : [],
        false
      );
      formik.setFieldValue(
        "documentDate",
        apiData.document_date ? new Date(apiData.document_date) : new Date(),
        false
      );
    }
  }, [apiData]);

  const formik = useFormik({
    initialValues: {
      [variable.field_01.id]: "",
      [variable.field_02.id]: "",
      [variable.field_03.id]: "",
    },
    onSubmit: (values) => {
      const formdata = new FormData();
      if (!apiData?.document_id) {
        formdata.append("file", file);
      }
      // formdata.append("file", file);
      formdata.append("notes", values[variable.field_03.id]);
      formdata.append("object_type", object_type);
      formdata.append("document_type", values[variable.field_02.id].code);
      formdata.append(
        "document_date",
        yearMonthDate(values[variable.field_01.id])
      );
      formdata.append("object_id", object_id);
      formdata.append("document_id", apiData?.document_id || "0");
      // action(formdata)
      console.log(formdata);

      if (apiData?.document_id == "1") {
        formdata.delete("file");
      }
      dispatch(setIsUpload(true));
      uploadDoc(formdata);
    },
  });

  useEffect(() => {
    if (isDocSuccess) {
      setIsOpen(false);
    }
  }, [isDocSuccess, isFetching, action]);

  const fileUploadRef = useRef(null);

  const handleChooseClick = () => fileUploadRef.current?.getInput()?.click();

  const openCameraModal = () => {
    setVisibleCam(true);
  };

  const emptyTemplate = () => (
    <div className="b-empty-container">
      <Img name="uploadFile" />
      <div className="align-items-center flex-column">
        <div className="d-flex align-items-center flex-column">
          <span className="b-upload-click-text" onClick={handleChooseClick}>
            Click to upload
          </span>
          or
          <span className="b-upload-click-text" onClick={openCameraModal}>
            Capture Picture
          </span>
        </div>
        <span> or drag and drop</span>
      </div>
      <span className="b-upload-message-text">Max file size 5MB</span>
    </div>
  );

  const itemTemplate = (file) => {
    const [, extension] = splitFileName(file.name);
    const img = extension === "pdf" ? "pdf" : "img";
    return (
      <div className="d-flex align-items-center">
        <Img name={img}></Img>
        <span className="d-flex flex-column text-left ml-3">
          {file.name}
          <small>{new Date().toLocaleDateString()}</small>
        </span>
        <Button
          type="button"
          icon={() => {
            return (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12.0094 0C18.6375 0 24.0188 5.4 24.0094 12.0281C23.9906 18.6375 18.6 24 12 24C5.37189 24 -0.00936277 18.6 1.2231e-05 11.9719C0.00938723 5.37187 5.40001 0 12.0094 0ZM11.9813 22.7812C17.9344 22.7906 22.7813 17.9531 22.7813 12.0094C22.7813 6.075 17.9625 1.2375 12.0469 1.21875C6.08439 1.2 1.22814 6.02812 1.21876 11.9719C1.20939 17.925 6.03751 22.7719 11.9813 22.7812Z"
                  fill="black"
                />
                <path
                  d="M12.0001 11.0999C13.1064 9.99365 14.1751 8.91553 15.2439 7.84678C15.347 7.74365 15.4408 7.64053 15.5439 7.55615C15.8158 7.3499 16.1064 7.34053 16.3501 7.58428C16.5939 7.82803 16.5751 8.11865 16.3783 8.39053C16.2845 8.5124 16.1626 8.61553 16.0595 8.72803C15.0001 9.7874 13.9408 10.8468 12.8251 11.953C13.1626 12.2812 13.4908 12.5905 13.8001 12.8999C14.6064 13.6968 15.422 14.503 16.2283 15.3093C16.5564 15.6374 16.6033 16.003 16.3689 16.2562C16.1251 16.5187 15.722 16.4812 15.3845 16.153C14.2689 15.0374 13.1626 13.9218 12.0095 12.7687C11.8689 12.8999 11.7376 13.0124 11.6251 13.1249C10.6408 14.1093 9.65638 15.0937 8.68138 16.0687C8.28763 16.4624 7.89388 16.5374 7.63138 16.2562C7.36888 15.9843 7.44388 15.6093 7.85638 15.2062C7.96888 15.0937 8.08138 14.9905 8.1845 14.878C9.15013 13.8937 10.1064 12.9187 11.147 11.8593C10.8751 11.6062 10.5658 11.3343 10.2658 11.0437C9.44075 10.228 8.62513 9.4124 7.8095 8.59678C7.4345 8.22178 7.36888 7.84678 7.63138 7.5749C7.90325 7.29365 8.2595 7.3499 8.64388 7.73428C9.75013 8.8499 10.8564 9.95615 12.0001 11.0999Z"
                  fill="black"
                />
              </svg>
            );
          }}
          className=""
          onClick={() => console.log()}
        />
      </div>
    );
  };

  const customBase64Uploader = async (event) => {
    const file = event.files[0];
    const allowedTypes = ["image/jpeg", "application/pdf"];

    if (!allowedTypes.includes(file.type)) {
      return;
    }

    setFile(file);
    const reader = new FileReader();
    let blob = await fetch(file.objectURL).then((r) => r.blob()); //blob:url

    reader.readAsDataURL(blob);

    reader.onloadend = function () {
      // const base64data = reader.result;
    };
  };

  const isSubmitBtnActive = () => {
    return (
      file?.name &&
      formik.values[variable.field_01.id] &&
      formik.values[variable.field_02.id]?.code
    );
  };

  const chooseOptions = {
    icon: "pi pi-fw pi-images",
    iconOnly: true,
    className: "custom-choose-btn p-button-rounded p-button-outlined",
  };

  const headerElement = (
    <div className="w-100 topic-txt d-flex align-items-center justify-content-between header">
      Webcam Capture
    </div>
  );

  const closeWebCam = (data) => {
    setFile({ ...dataURItoBlob(data), name: "webcam.png" });
    setVisibleCam(false);
  };

  return (
    <div className="d-flex flex-column gap-4 align-items-center p-5 bg-light confirm-modal">
      <div className="w-100 d-flex align-items-center justify-content-between mb-2 header">
        <div>
          <div className="topic-txt">
            Attach Document
            <p className="text-grey fw-small">
              Supported formats: .pdf and .jpg
            </p>
          </div>
        </div>
        <Button
          text
          className="close-icon"
          data-testId="close-icon"
          icon={() => <Img name="modalCancel"></Img>}
          onClick={() => {
            setIsOpen(false);
          }}
        ></Button>
      </div>
      <div className="mb-0 text-center modal-body d-flex gap-4 w-100">
        <div className="b-upload-left-container">
          {file?.name ? (
            <BAttachedFile file={file} setIsOpen={setIsOpen} />
          ) : (
            <div className="attach-con">
              <FileUpload
                ref={fileUploadRef}
                name="demo[]"
                url={null}
                multiple={ismultiple}
                accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg,image/jpg"
                maxFileSize={5242880}
                // onUpload={onUpload}
                // mode="advanced"
                onSelect={(e) => {
                  const file = e.files[0];
                  const validTypes = [
                    "application/pdf",
                    "image/jpeg",
                    "image/jpg",
                  ];
                  console.log(
                    "🚀 ~ validTypes.includes(file.type):",
                    validTypes.includes(file.type),
                    fileUploadRef.current
                  );
                  if (!validTypes.includes(file.type)) {
                    if (fileUploadRef.current) {
                      console.log(
                        "🚀 ~ fileUploadRef.current:",
                        fileUploadRef.current
                      );
                      fileUploadRef?.current?.clear();
                    }
                  }
                }}
                invalidFileTypeMessage="Only PDF and JPG files are allowed"
                customUpload={true}
                auto
                emptyTemplate={emptyTemplate}
                uploadHandler={customBase64Uploader}
                itemTemplate={itemTemplate}
                chooseOptions={chooseOptions}
              />
            </div>
          )}
        </div>
        <div className="d-flex flex-column text-start regular-text justify-content-evenly h-100 gap-4">
          <div className="w-100 pb-4">
            <Bcalendar variable={variable.field_01} formik={formik}></Bcalendar>
          </div>
          <div className="w-100 pb-3">
            <BSelect
              variable={{ ...variable.field_02, options: document_type }}
              formik={formik}
            ></BSelect>
          </div>
          <div className="w-100 pb-3">
            <BInputText
              variable={variable.field_03}
              formik={formik}
            ></BInputText>
          </div>
        </div>
      </div>
      <div className="w-100 d-flex align-items-center justify-content-end gap-2 mt-4 modal-footer">
        <Button
          text
          label="Cancel"
          data-testId="upload-cancel-btn"
          outlined
          onClick={() => {
            setIsOpen(false);
            // reject();
          }}
        ></Button>
        <Button
          label="Attach File"
          className="primary-btn"
          data-testId="upload-attach-btn"
          type="submit"
          disabled={!isSubmitBtnActive()}
          onClick={() => {
            // action("CRECASE")
            // setIsOpen(false)
            // accept();
            isSubmitBtnActive() && formik.handleSubmit();
          }}
        ></Button>
      </div>
      <Dialog
        pt={{ header: "border-0 pb-0" }}
        header={headerElement}
        visible={visibleCam}
        onHide={() => {
          if (!visibleCam) return;
          setVisibleCam(false);
        }}
      >
        <BWebCamCapture setFile={setFile} closeWebCam={closeWebCam} />
      </Dialog>
    </div>
  );
};

export default BUploadFileRequired;
