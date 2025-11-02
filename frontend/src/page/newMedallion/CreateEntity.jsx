import { useFormik } from "formik";
import BInputText from "../../components/BInputText";
import { createEntity as variable } from "../../utils/variables";
import { useEffect, useState } from "react";
import Img from "../../components/Img";
import { Button } from "primereact/button";
import BCalendar from "../../components/BCalendar";
import BUploadInput from "../../components/BUploadInput";
import BModal from "../../components/BModal";
import BUpload from "../../components/BUpload";
import BRadio from "../../components/BRadio";
import BMultiSelect from "../../components/BMultiSelect";
import { useNavigate } from "react-router-dom";

const CreateEntity = () => {
    const formik = useFormik({
        initialValues: {
          [variable.field_01.id]: "",
        },
        validateOnChange: true,
        validate: () => {
        },
        onSubmit: (values) => {
          alert(JSON.stringify(values, null, 2));
        },
      });
      useEffect(() => {
        const firstErrorField = Object.keys(formik.errors)[0];
        if (firstErrorField) {
          const field = document.getElementById(firstErrorField);
          if (field) {
            field.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      }, [formik.errors]);

    const [addContPerson,setAddContPerson]=useState(false);
    const navigate=useNavigate();
  return (
    <div className="postion-relative">
      <p className="sec-topic pb-3">Create Entity</p>
      <form
        className="common-form d-flex flex-column gap-5"
        onSubmit={formik.handleSubmit}
      >
        <div className="form-section">
          <div
            className="d-flex align-items-center
                 justify-content-between form-sec-header"
          >
            <div className="topic">
              <Img name="company"></Img> Entity Details
            </div>
            <p className="text-require ">
              (Required fields are marked with <span>*</span>)
            </p>
          </div>
          <div className="form-body">
            <div className="d-flex align-items-center flex-wrap form-grid-1 w-75">
              <div className="w-100-3 ">
              <BInputText variable={variable.field_01} formik={formik} isRequire={true}></BInputText>
              </div>
              <div className="w-100-3 ">
              <BCalendar variable={variable.field_02} formik={formik} isRequire={true}></BCalendar>
              </div>
              <div className="w-100-3 ">
              <BUploadInput variable={variable.field_03} formik={formik} isRequire={true}></BUploadInput>
              </div>
            </div>
          </div>
        </div>
        <div className="form-section">
          <div
            className="d-flex align-items-center
                 justify-content-between form-sec-header"
          >
            <div className="topic">
              <Img name="primary-address"></Img> Address
            </div>
          </div>
          <div className="form-body">
            <div className="d-flex align-items-center flex-wrap form-grid-1 w-75">
              <div className="w-100-2 ">
              <BInputText variable={variable.field_04} formik={formik} isRequire={true}></BInputText>
              </div>
              <div className="w-100-2 ">
              <BInputText variable={variable.field_05} formik={formik} ></BInputText>
              </div>
              <div className="w-100-3 ">
              <BInputText variable={variable.field_06} formik={formik} isRequire={true}></BInputText>
              </div>
              <div className="w-100-3 ">
              <BInputText variable={variable.field_07} formik={formik} isRequire={true}></BInputText>
              </div>
              <div className="w-100-3 ">
              <BInputText variable={variable.field_08} formik={formik} isRequire={true}></BInputText>
              </div>
            </div>
          </div>
        </div>
        <div className="form-section">
          <div
            className="d-flex align-items-center
                 justify-content-between form-sec-header"
          >
            <div className="topic">
              <Img name="personal"></Img> Contact Person Details
            </div>
            {!addContPerson && (
                <Button
                  text
                  label="Add Contact Person"
                  className="text-black gap-2"
                  type="button"
                  onClick={() =>{ 
                    // setAddJointOwner(true);
                  }}
                  icon={() => <Img name="add" />}
                />
              )}
          </div>
          <div className="form-body">
            <div className="d-flex align-items-center flex-wrap form-grid-1 w-75">
              <div className="w-100-3 ">
              <BInputText variable={variable.field_09} formik={formik} isRequire={true}></BInputText>
              </div>
              <div className="w-100-3 ">
              <BInputText variable={variable.field_10} formik={formik} ></BInputText>
              </div>
              <div className="w-100-3 ">
              <BInputText variable={variable.field_11} formik={formik} isRequire={true}></BInputText>
              </div>
              <div className="w-100-3 ">
              <BUploadInput variable={variable.field_12} formik={formik} isRequire={true}></BUploadInput>
              </div>
              <div className="w-100-3 ">
              <BCalendar variable={variable.field_13} formik={formik} isRequire={true}></BCalendar>
              </div>
              <div className="w-100-3 ">
              <BCalendar variable={variable.field_14} formik={formik} isRequire={true}></BCalendar>
              </div>
            </div>
            <div className="d-flex align-items-center justify-content-between mt-3">
            <BModal>
        <BModal.ToggleButton>
        <Button
                text
                label="Upload Documents"
                data-testid="upload-documents"
                className="text-black gap-2"
                type="button"
                icon={() => <Img name="upload" />}
              />
        </BModal.ToggleButton>
        <BModal.Content >
        <BUpload></BUpload>
        </BModal.Content>
      </BModal>
              
            </div>
          </div>
        </div>
        <div className="form-section">
          <div
            className="d-flex align-items-center
                 justify-content-between form-sec-header"
          >
            <div className="topic">
              <Img name="primary-address"></Img> Contact Person Address
            </div>
          </div>
          <div className="form-body">
          <div className="d-flex align-items-center flex-wrap form-grid-1 w-75">
              <div className="w-100-2 ">
              <BInputText variable={variable.field_15} formik={formik} isRequire={true}></BInputText>
              </div>
              <div className="w-100-2 ">
              <BInputText variable={variable.field_16} formik={formik} ></BInputText>
              </div>
              <div className="w-100-3 ">
              <BInputText variable={variable.field_17} formik={formik} isRequire={true}></BInputText>
              </div>
              <div className="w-100-3 ">
              <BInputText variable={variable.field_18} formik={formik} isRequire={true}></BInputText>
              </div>
              <div className="w-100-3 ">
              <BInputText variable={variable.field_19} formik={formik} isRequire={true}></BInputText>
              </div>
            </div>
            {<div className="d-flex align-items-center justify-content-end mt-3">
              <Button
                text
                label="Add Secondary Address"
                type="button"
                className="text-black gap-2"
                onClick={() =>{ 
                }
                }
                icon={() => <Img name="add" />}
              />
            </div>}
          </div>
        </div>
        {/* <div className="form-section">
          <div
            className="d-flex align-items-center
                 justify-content-between form-sec-header"
          >
            <div className="topic">
              <Img name="personal"></Img> Contact Details
            </div>
          </div>
          <div className="form-body">
          <div className="d-flex align-items-center flex-wrap form-grid-1 w-75">
              <div className="w-100-2 ">
              <BInputText variable={variable.field_04} formik={formik} isRequire={true}></BInputText>
              </div>
              <div className="w-100-2 ">
              <BInputText variable={variable.field_05} formik={formik} ></BInputText>
              </div>
              <div className="w-100-3 ">
              <BInputText variable={variable.field_06} formik={formik} isRequire={true}></BInputText>
              </div>
              <div className="w-100-3 ">
              <BInputText variable={variable.field_07} formik={formik} isRequire={true}></BInputText>
              </div>
              <div className="w-100-3 ">
              <BInputText variable={variable.field_08} formik={formik} isRequire={true}></BInputText>
              </div>
            </div>
          </div>
        </div> */}
        <div className="form-section">
          <div
            className="d-flex align-items-center
                 justify-content-between form-sec-header"
          >
            <div className="topic">
              <Img name="mail"></Img> Contact Details
            </div>
          </div>
          <div className="form-body">
          <div className="d-flex align-items-center flex-wrap form-grid-1 w-75">
              <div className="w-100-3 ">
              <BInputText variable={variable.field_20} formik={formik} ></BInputText>
              </div>
              <div className="w-100-3 ">
              <BInputText variable={variable.field_21} formik={formik} ></BInputText>
              </div>
            </div>
          </div>
        </div>
        <div className="form-section">
          <div
            className="d-flex align-items-center
                 justify-content-between form-sec-header"
          >
            <div className="topic">
              <Img name="bank"></Img> Payee Details
            </div>
          </div>
          <div className="form-body">
          <div className="d-flex align-items-center flex-wrap form-grid-1 w-75">
            <div className="w-100">
              <div className="w-100-3 ">
              <BRadio variable={variable.field_22} formik={formik} ></BRadio>
              </div>
            </div>
            <div className="w-100-3 ">
              <BInputText variable={variable.field_23} formik={formik} isRequire={true}></BInputText>
              </div>
            <div className="w-100-3 ">
              <BInputText variable={variable.field_24} formik={formik} isRequire={true}></BInputText>
              </div>
            <div className="w-100-3 ">
              <BInputText variable={variable.field_25} formik={formik} isRequire={true}></BInputText>
              </div>
            <div className="w-100-2 ">
              <BInputText variable={variable.field_26} formik={formik} ></BInputText>
              </div>
            <div className="w-100-2 ">
              <BInputText variable={variable.field_27} formik={formik} ></BInputText>
              </div>
            <div className="w-100-3">
              <BInputText variable={variable.field_28} formik={formik} ></BInputText>
              </div>
            <div className="w-100-3">
              <BInputText variable={variable.field_29} formik={formik} ></BInputText>
              </div>
            <div className="w-100-3">
              <BInputText variable={variable.field_30} formik={formik} ></BInputText>
              </div>
            <div className="w-100-3">
              <BCalendar variable={variable.field_31} formik={formik} ></BCalendar>
              </div>
            </div>
          </div>
        </div>
        <div className="form-section">
          <div
            className="d-flex align-items-center
                 justify-content-between form-sec-header"
          >
            <div className="topic">
              <Img name="personal"></Img> Key People
            </div>
          </div>
          <div className="form-body">
          <div className="d-flex align-items-center flex-wrap form-grid-1 w-75">
              <div className="w-100-3 ">
              <BMultiSelect variable={variable.field_32} formik={formik} ></BMultiSelect>
              </div>
            <div className="w-100-3 ">
            <BMultiSelect variable={variable.field_33} formik={formik} ></BMultiSelect>
              </div>
            <div className="w-100-3 ">
            <BMultiSelect variable={variable.field_34} formik={formik} ></BMultiSelect>
              </div>
            </div>
          </div>
        </div>
        <div className="form-section">
          <div
            className="d-flex align-items-center
                 justify-content-between form-sec-header"
          >
            <div className="topic">
              <Img name="worker"></Img> Workers Compensation Insurance
            </div>
          </div>
          <div className="form-body">
          <div className="d-flex align-items-center flex-wrap form-grid-1 w-75">
              <div className="w-100-3 ">
              <BMultiSelect variable={variable.field_35} formik={formik} ></BMultiSelect>
              </div>
            <div className="w-100-3 ">
            <BMultiSelect variable={variable.field_36} formik={formik} ></BMultiSelect>
              </div>
            <div className="w-100-3 ">
            <BInputText variable={variable.field_37} formik={formik} ></BInputText>
              </div>
            <div className="w-100-3 ">
            <BInputText variable={variable.field_38} formik={formik} ></BInputText>
              </div>
            <div className="w-100-3 ">
            <BCalendar variable={variable.field_39} formik={formik} ></BCalendar>
              </div>
            <div className="w-100-3 ">
            <BCalendar variable={variable.field_40} formik={formik} ></BCalendar>
              </div>
            </div>
          </div>
        </div>
        <div className="form-section">
          <div
            className="d-flex align-items-center
                 justify-content-between form-sec-header"
          >
            <div className="topic">
              <Img name="dashboard"></Img> Other Details
            </div>
          </div>
          <div className="form-body">
          <div className="d-flex align-items-center flex-wrap form-grid-1 w-75">
              <div className="w-100-3 ">
              <BMultiSelect variable={variable.field_41} formik={formik} ></BMultiSelect>
              </div>
            <div className="w-100-3 ">
            <BCalendar variable={variable.field_42} formik={formik} isRequire={true}></BCalendar>
              </div>
            <div className="w-100-3 ">
            <BCalendar variable={variable.field_43} formik={formik} isRequire={true}></BCalendar>
              </div>
            <div className="w-100-3 ">
            <BCalendar variable={variable.field_44} formik={formik} isRequire={true}></BCalendar>
              </div>
            </div>
          </div>
        </div>
        <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        <Button
          label="Submit"
          type="button"
          onClick={() => {
            
            navigate(`/new-medallion/create-corporation`)
            // formik.handleSubmit();
          }}
          severity="warning"
          className="border-radius-0 primary-btn "
        />
        </div>
      </form>
    </div>
  )
}

export default CreateEntity