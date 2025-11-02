import { useFormik } from "formik";
import Img from "../../components/Img";
import { useEffect } from "react";
import { createIndividualOwner as variable } from "../../utils/variables";
import BInputText from "../../components/BInputText";
import BUploadInput from "../../components/BUploadInput";
import BCalendar from "../../components/BCalendar";
import BSelect from "../../components/BSelect";
import BRadio from "../../components/BRadio";
import { useGetStepInfoQuery } from "../../redux/api/medallionApi";
import { useParams } from "react-router-dom";
import { CHOOSE_INDIVIDUAL_OWNER } from "../../utils/constants";

const ViewIndividualOwner = () => {
    const params=useParams();
  // const [secondaryAdd, setSecondaryAdd]=useState(false);
  const {data:stepInfoData,isSuccess:isStepInfoSuccess}=useGetStepInfoQuery({caseNo:params["case-id"],step_no:CHOOSE_INDIVIDUAL_OWNER});
  console.log(stepInfoData,isStepInfoSuccess);
  const formik = useFormik({
    initialValues: {
      [variable.field_01.id]: "",
      [variable.field_02.id]: "",
      [variable.field_03.id]: "",
      [variable.field_04.id]: "",
      [variable.field_05.id]: "",
      [variable.field_06.id]:  { name: 'Driving License', code: 'drivingLicense' },
      [variable.field_07.id]: "",
      [variable.field_08.id]: "",
      [variable.field_09.id]: "",
      [variable.field_10.id]: "",
      [variable.field_11.id]: "",
      [variable.field_12.id]: "",
      [variable.field_13.id]: "",
      [variable.field_14.id]: "",
      [variable.field_15.id]: "",
      [variable.field_16.id]: "",
      [variable.field_17.id]: "",
      [variable.field_18.id]: "",
      [variable.field_19.id]: "",
      [variable.field_20.id]: "",
      [variable.field_21.id]: "",
      [variable.field_22.id]: "",
      [variable.field_23.id]: "",
      [variable.field_24.id]: "",
      [variable.field_25.id]: "",
      [variable.field_26.id]: "",
      [variable.field_27.id]: "",
      [variable.field_28.id]: "",
      [variable.field_29.id]: "",
      [variable.field_30.id]: "",
      [variable.field_31.id]: "",
      [variable.field_32.id]: "",
      [variable.field_33.id]: "",
      [variable.field_34.id]: "",
      [variable.field_35.id]: "",
      [variable.field_36.id]: "",
      [variable.field_37.id]: "",
      [variable.field_38.id]: "",
    },
    // validateOnChange: true,
    // validate: (values) => {
    //   const errors = {};
    //   if (!values[variable.field_01.id]) {
    //     errors[variable.field_01.id] = `${variable.field_01.label} is required`;
    //   } else if (values[variable.field_01.id].length < 3) {
    //     errors[variable.field_01.id] = `${variable.field_01.label} must be at least 3 characters`;
    //   } else if (values[variable.field_01.id].length > 25) {
    //     errors[variable.field_01.id] = `${variable.field_01.label} cannot exceed 25 characters`;
    //   }

    //   if (!values[variable.field_03.id]) {
    //     errors[variable.field_03.id] = `${variable.field_02.label} is required`;;
    //   } else if (values[variable.field_03.id].length < 3) {
    //     errors[variable.field_03.id] = `${variable.field_02.label} must be at least 3 characters`;
    //   } else if (values[variable.field_03.id].length > 20) {
    //     errors[variable.field_03.id] = `${variable.field_02.label} cannot exceed 20 characters`;
    //   }

    //   if (!values[variable.field_04.id]) {
    //     errors[variable.field_04.id] = `${variable.field_02.label} is required`;;
    //   }

    //   if (!values[variable.field_05.id]) {
    //     errors[variable.field_05.id] = `${variable.field_05.label} is required`;
    //   } else if (values[variable.field_05.id] >= new Date()) {
    //     errors[variable.field_05.id] = `${variable.field_05.label} must be in the past`;
    //   }

    //   if (!values[variable.field_06.id]) {
    //     errors[variable.field_06.id] =`${variable.field_06.label} is required`;
    //   }

    //   if(values[variable.field_06.id].code=="drivingLicense"){
    //     if (!values[variable.field_07.id]) {
    //       errors[variable.field_07.id] =`${variable.field_07.label} is required`;
    //     }
    //     if (!values[variable.field_08.id]) {
    //       errors[variable.field_08.id] =`${variable.field_08.label} is required`;
    //     }
    //   }
    //   if(values[variable.field_06.id].code=="passport"){
    //     if (!values[variable.field_09.id]) {
    //       errors[variable.field_09.id] =`${variable.field_09.label} is required`;
    //     }
    //     if (!values[variable.field_10.id]) {
    //       errors[variable.field_10.id] =`${variable.field_10.label} is required`;
    //     }
    //   }

    //   if (!values[variable.field_11.id]) {
    //     errors[variable.field_11.id] =`${variable.field_11.label} is required`;
    //   }
    //   if (!values[variable.field_13.id]) {
    //     errors[variable.field_13.id] =`${variable.field_13.label} is required`;
    //   }
    //   if (!values[variable.field_14.id]) {
    //     errors[variable.field_14.id] =`${variable.field_14.label} is required`;
    //   }
    //   if (!values[variable.field_15.id]) {
    //     errors[variable.field_15.id] =`${variable.field_15.label} is required`;
    //   }

    //   if(secondaryAdd){
    //     if (!values[variable.field_18.id]) {
    //       errors[variable.field_18.id] =`${variable.field_18.label} is required`;
    //     }
    //     if (!values[variable.field_20.id]) {
    //       errors[variable.field_20.id] =`${variable.field_20.label} is required`;
    //     }
    //     if (!values[variable.field_21.id]) {
    //       errors[variable.field_21.id] =`${variable.field_21.label} is required`;
    //     }
    //     if (!values[variable.field_22.id]) {
    //       errors[variable.field_22.id] =`${variable.field_22.label} is required`;
    //     }
    //   }

    //   if (!values[variable.field_26.id]) {
    //     errors[variable.field_26.id] =`${variable.field_26.label} is required`;
    //   }
    //   if (!values[variable.field_27.id]) {
    //     errors[variable.field_27.id] =`${variable.field_27.label} is required`;
    //   }
    //   if (!values[variable.field_28.id]) {
    //     errors[variable.field_28.id] =`${variable.field_28.label} is required`;
    //   }
    //   if (!values[variable.field_35.id]) {
    //     errors[variable.field_35.id] =`${variable.field_35.label} is required`;
    //   }
    //   if (!values[variable.field_38.id]) {
    //     errors[variable.field_38.id] =`${variable.field_38.label} is required`;
    //   }
      
    //   return errors;
    // },
    // onSubmit: (values) => {
      // console.log("values:", values)
      // setErrors({
      //   ...{
      //     firstName: "Backend validation error for First Name",
      //     lastName: "Backend validation error for Last Name",
      //   },
      // });
      // alert(JSON.stringify(values, null, 2));
    // },
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

  useEffect(()=>{
    if(isStepInfoSuccess){
      formik.setFieldValue([variable.field_01.id], stepInfoData?.details?.[variable.field_01.id],true);
      formik.setFieldValue([variable.field_02.id], stepInfoData?.details?.[variable.field_02.id],true);
      formik.setFieldValue([variable.field_03.id], stepInfoData?.details?.[variable.field_03.id],true);
      formik.setFieldValue([variable.field_04.id], stepInfoData?.details?.[variable.field_04.id],true);
      formik.setFieldValue([variable.field_05.id], new Date(stepInfoData?.details?.[variable.field_05.id]),true);
      // formik.setFieldValue([variable.field_06.id], variable.field_06.options.filter(item=>item?.code===stepInfoData?.details?.[variable.field_05.id])[0],true);
      formik.setFieldValue([variable.field_07.id], stepInfoData?.details?.[variable.field_07.id],true);
      formik.setFieldValue([variable.field_08.id], stepInfoData?.details?.[variable.field_08.id]?new Date(stepInfoData?.details?.[variable.field_08.id]):"",true);
      formik.setFieldValue([variable.field_09.id], stepInfoData?.details?.[variable.field_09.id],true);
      formik.setFieldValue([variable.field_10.id], stepInfoData?.details?.[variable.field_10.id]?new Date(stepInfoData?.details?.[variable.field_10.id]):"",true);
      formik.setFieldValue([variable.field_11.id], stepInfoData?.details?.[variable.field_11.id],true);
      formik.setFieldValue([variable.field_12.id], stepInfoData?.details?.[variable.field_12.id],true);
      formik.setFieldValue([variable.field_13.id], stepInfoData?.details?.[variable.field_13.id],true);
      formik.setFieldValue([variable.field_14.id], stepInfoData?.details?.[variable.field_14.id],true);
      formik.setFieldValue([variable.field_15.id], stepInfoData?.details?.[variable.field_15.id],true);
      formik.setFieldValue([variable.field_16.id], stepInfoData?.details?.[variable.field_16.id],true);
      formik.setFieldValue([variable.field_17.id], stepInfoData?.details?.[variable.field_17.id],true);
      formik.setFieldValue([variable.field_18.id], stepInfoData?.details?.[variable.field_18.id],true);
      formik.setFieldValue([variable.field_19.id], stepInfoData?.details?.[variable.field_19.id],true);
      formik.setFieldValue([variable.field_20.id], stepInfoData?.details?.[variable.field_20.id],true);
      formik.setFieldValue([variable.field_21.id], stepInfoData?.details?.[variable.field_21.id],true);
      formik.setFieldValue([variable.field_22.id], stepInfoData?.details?.[variable.field_22.id],true);
      formik.setFieldValue([variable.field_23.id], stepInfoData?.details?.[variable.field_23.id],true);
      formik.setFieldValue([variable.field_24.id], stepInfoData?.details?.[variable.field_24.id],true);
      // formik.setFieldValue([variable.field_25.id], stepInfoData?.details?.[variable.field_25.id],true);
      formik.setFieldValue([variable.field_26.id], stepInfoData?.details?.[variable.field_26.id],true);
      formik.setFieldValue([variable.field_27.id], stepInfoData?.details?.[variable.field_27.id],true);
      formik.setFieldValue([variable.field_28.id], stepInfoData?.details?.[variable.field_28.id],true);
      formik.setFieldValue([variable.field_29.id], stepInfoData?.details?.[variable.field_29.id],true);
      formik.setFieldValue([variable.field_30.id], stepInfoData?.details?.[variable.field_30.id],true);
      formik.setFieldValue([variable.field_32.id], stepInfoData?.details?.[variable.field_32.id],true);
      formik.setFieldValue([variable.field_33.id], stepInfoData?.details?.[variable.field_33.id],true);
      formik.setFieldValue([variable.field_34.id], stepInfoData?.details?.[variable.field_34.id],true);
      formik.setFieldValue([variable.field_35.id], stepInfoData?.details?.[variable.field_35.id],true);
      formik.setFieldValue([variable.field_36.id], stepInfoData?.details?.[variable.field_36.id],true);
      formik.setFieldValue([variable.field_37.id], stepInfoData?.details?.[variable.field_37.id],true);
      formik.setFieldValue([variable.field_38.id], stepInfoData?.details?.[variable.field_38.id],true);
    }
},[isStepInfoSuccess])

  return (
    <div className="postion-relative">
      <p className="sec-topic pb-3">Create Individual Owner</p>
      <form
        className="common-form disable-form d-flex flex-column gap-5"
        // onSubmit={formik.handleSubmit}
      >
        <div className="form-section">
          <div
            className="d-flex align-items-center
                 justify-content-between form-sec-header"
          >
            <div className="topic">
              <Img name="personal"></Img> Personal Details
            </div>
            <p className="text-require ">
              (Required fields are marked with <span>*</span>)
            </p>
          </div>
          <div className="form-body">
            <div className="d-flex align-items-center flex-wrap form-grid-1 w-75">
              <div className="w-100-3 ">
              <BInputText variable={variable.field_01} formik={formik} isDisable={true} ></BInputText>
              </div>
              <div className=" w-100-3">
              <BInputText variable={variable.field_02} formik={formik} isDisable={true} ></BInputText>
              </div>
              <div className=" w-100-3">
              <BInputText variable={variable.field_03} formik={formik} isDisable={true} ></BInputText>
              </div>
              <div className="w-100-3">
              <BUploadInput  variable={variable.field_04} formik={formik} isDisable={true} ></BUploadInput>
              </div>
              <div className=" w-100-3">
              <BCalendar variable={variable.field_05} formik={formik} isDisable={true} ></BCalendar>
              </div>
              <div className="w-100-3 ">
              <BSelect variable={variable.field_06} formik={formik} isDisable={true} ></BSelect>
              </div>
              {
                formik.values[variable.field_06.id]?.code==="drivingLicense"?<>
              <div className="w-100-3 ">
              <BUploadInput variable={variable.field_07} formik={formik} isDisable={true}></BUploadInput>
              </div>
              <div className="w-100-3 ">
              <BCalendar variable={variable.field_08} formik={formik} isDisable={true} ></BCalendar>
              </div>
                </>:
                <>
              <div className="w-100-3 ">
              <BUploadInput variable={variable.field_09} formik={formik} isDisable={true}></BUploadInput>
              </div>
              <div className="w-100-3 ">
              <BCalendar variable={variable.field_10} formik={formik} isDisable={true} ></BCalendar>
              </div>
                </>
              }
            </div>
            {/* <div className="d-flex align-items-center justify-content-between mt-3">
              <BModal>
        <BModal.ToggleButton>
       <Button
                text
                label="Upload Documents"
                className="text-black gap-2"
                type="button"
                icon={() => <Img name="upload" />}
              />
        </BModal.ToggleButton>
        <BModal.Content >
        <BUpload></BUpload>
        </BModal.Content>
      </BModal>
            </div> */}
          </div>
        </div>
        <div className="form-section">
          <div
            className="d-flex align-items-center
                 justify-content-between form-sec-header"
          >
            <div className="topic">
              <Img name="primary-address"></Img> Primary Address
            </div>
          </div>
          <div className="form-body ">
            <div className="d-flex flex-column common-gap">
            <div className="d-flex align-items-center flex-wrap form-grid-1 w-90">
              <div className="w-100-2">
              <BInputText variable={variable.field_11} formik={formik} isDisable={true} ></BInputText>
              </div>
              <div className="w-100-2">
              <BInputText variable={variable.field_12} formik={formik} isDisable={true} ></BInputText>
              </div>
            </div>
            <div className="w-75 d-flex align-items-center flex-wrap form-grid-1">
            <div className="w-100-3">
              <BInputText variable={variable.field_13} formik={formik} isDisable={true} ></BInputText>
              </div>
              <div className="w-100-3">
              <BInputText variable={variable.field_14} formik={formik} isDisable={true} ></BInputText>
              </div>
              <div className="w-100-3">
              <BInputText variable={variable.field_15} formik={formik} isDisable={true} ></BInputText>
              </div>
              <div className="w-100-3">
              <BInputText variable={variable.field_16} formik={formik} isDisable={true} ></BInputText>
              </div>
              <div className="w-100-3">
              <BInputText variable={variable.field_17} formik={formik} isDisable={true} ></BInputText>
              </div>
            </div>
            </div>
            {/* {!secondaryAdd&&<div className="d-flex align-items-center justify-content-end mt-3">
              <Button
                text
                label="Add Secondary Address"
                type="button"
                className="text-black gap-2"
                onClick={() =>{ 
                  setSecondaryAdd(true);
                    formik.setFieldValue('secAddressLine1', '',false);
                    formik.setFieldValue('secAddressLine2', '',false);
                    formik.setFieldValue('secCity', '',false);
                    formik.setFieldValue('secState', '',false);
                    formik.setFieldValue('secZip', '',false);
                    formik.setFieldValue('secLatitude', '',false);
                    formik.setFieldValue('secLongitude', '',false);
                }
                }
                icon={() => <Img name="add" />}
              />
            </div>} */}
          </div>
        </div>
        {
          <div className="form-section">
          <div
            className="d-flex align-items-center
                 justify-content-between form-sec-header"
          >
            <div className="topic">
              <Img name="primary-address"></Img> Secondary Address
            </div>
          </div>
          <div className="form-body ">
          <div className="d-flex flex-column common-gap">
            <div className="d-flex align-items-center flex-wrap form-grid-1 w-90">
              <div className="w-100-2">
              <BInputText variable={variable.field_18} formik={formik} isDisable={true} ></BInputText>
              </div>
              <div className="w-100-2">
              <BInputText variable={variable.field_19} formik={formik} isDisable={true} ></BInputText>
              </div>
            </div>
            <div className="w-75 d-flex align-items-center flex-wrap form-grid-1">
            <div className="w-100-3">
              <BInputText variable={variable.field_20} formik={formik} isDisable={true} ></BInputText>
              </div>
              <div className="w-100-3">
              <BInputText variable={variable.field_21} formik={formik} isDisable={true} ></BInputText>
              </div>
              <div className="w-100-3">
              <BInputText variable={variable.field_22} formik={formik} isDisable={true} ></BInputText>
              </div>
              <div className="w-100-3">
              <BInputText variable={variable.field_23} formik={formik} isDisable={true} ></BInputText>
              </div>
              <div className="w-100-3">
              <BInputText variable={variable.field_24} formik={formik} isDisable={true} ></BInputText>
              </div>
            </div>
            </div>
            <div className="d-flex align-items-center justify-content-end mt-3">
              {/* <Button
                text
                label="Cancel"
                type="button"
                className="text-black gap-2"
                onClick={() =>{ 
                  setSecondaryAdd(false);
                    formik.setFieldValue('secAddressLine1', '',false);
                    formik.setFieldValue('secAddressLine2', '',false);
                    formik.setFieldValue('secCity', '',false);
                    formik.setFieldValue('secState', '',false);
                    formik.setFieldValue('secZip', '',false);
                    formik.setFieldValue('secLatitude', '',false);
                    formik.setFieldValue('secLongitude', '',false);
                }
                }
              /> */}
            </div>
          </div>
        </div>
        }
        <div className="form-section">
          <div
            className="d-flex align-items-center
                 justify-content-between form-sec-header"
          >
            <div className="topic">
              <Img name="bank"></Img> Bank Details
            </div>
          </div>
          <div className="form-body d-flex flex-column common-gap">
            <div className="d-flex align-items-center flex-wrap form-grid-1 w-100">
            <div className="w-100-2">
              <BRadio variable={variable.field_25} formik={formik} isDisable={true} ></BRadio>
            </div>
            </div>
            <div className="d-flex align-items-center flex-wrap form-grid-1 w-75">
            <div className="w-100-3">
              <BInputText variable={variable.field_26} formik={formik} isDisable={true} ></BInputText>
            </div>
             <div className="w-100-3">
              <BInputText variable={variable.field_27} formik={formik} isDisable={true} ></BInputText>
              </div>
             <div className="w-100-3">
              <BInputText variable={variable.field_28} formik={formik} isDisable={true} ></BInputText>
              </div>
            </div>
            <div className="d-flex align-items-center flex-wrap form-grid-1 w-100">
            <div className="w-100-2">
              <BInputText variable={variable.field_29} formik={formik} isDisable={true} ></BInputText>
            </div>
             <div className="w-100-2">
              <BInputText variable={variable.field_30} formik={formik} isDisable={true} ></BInputText>
              </div>
            </div>
            <div className="w-75 d-flex align-items-center flex-wrap form-grid-1">
             <div className="w-100-3">
              <BInputText variable={variable.field_31} formik={formik} isDisable={true} ></BInputText>
              </div>
             <div className="w-100-3">
              <BInputText variable={variable.field_32} formik={formik} isDisable={true} ></BInputText>
              </div>
             <div className="w-100-3">
              <BInputText variable={variable.field_33} formik={formik} isDisable={true} ></BInputText>
              </div>
             <div className="w-100-3">
              <BCalendar variable={variable.field_34} formik={formik} isDisable={true} ></BCalendar>
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
              <Img name="mail"></Img> Contact Details
            </div>
          </div>
          <div className="form-body d-flex flex-column common-gap">
            <div className="w-75 d-flex align-items-center flex-wrap form-grid-1">
            <div className="w-100-3">
              <BInputText variable={variable.field_35} formik={formik} isDisable={true} ></BInputText>
              </div>
             <div className="w-100-3">
              <BInputText variable={variable.field_36} formik={formik} isDisable={true} ></BInputText>
              </div>
             <div className="w-100-3">
              <BInputText variable={variable.field_37} formik={formik} isDisable={true} ></BInputText>
              </div>
             <div className="w-100-3">
              <BInputText variable={variable.field_38} formik={formik} isDisable={true} ></BInputText>
              </div>
            </div>
          </div>
        </div>
        {/* <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        <Button
          label="Submit"
          type="button"
          onClick={() => {
            formik.handleSubmit();
          }}
          severity="warning"
          className="border-radius-0 primary-btn "
        />
        </div> */}
      </form>
    </div>
  );
};

export default ViewIndividualOwner;
