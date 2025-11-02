import React, { useEffect, useState } from 'react'
import { vehicleRepairDeatil as variable } from "../../utils/variables";
import BCalendar from '../../components/BCalendar';
import BTimePicker from '../../components/BTimePicker';
import { useFormik } from 'formik';
import BRadio from '../../components/BRadio';
import BModal from '../../components/BModal';
import BUpload from '../../components/BUpload';
import { Button } from 'primereact/button';
import Img from '../../components/Img';
import BInputNumber from '../../components/BInputNumber';
import BSuccessMessage from '../../components/BSuccessMessage';
import { useNavigate } from 'react-router-dom';
import { useMoveCaseDetailMutation, useProcessCaseDeatilMutation } from '../../redux/api/medallionApi';
import { TimeFormat, yearMonthDate } from '../../utils/dateConverter';
import BInputText from '../../components/BInputText';
import { getCurrentStep } from '../../utils/caseUtils';
import { Badge } from 'primereact/badge';

const VehicleRepairDetail = ({ caseId, currentStepId, reload, currentStep, caseData, hasAccess }) => {
console.log("🚀 ~ VehicleRepairDetail ~ currentStep:", currentStep)

    const [isOpen, setOpen] = useState(false);
    const navigate = useNavigate();
    const [processFlow, { isSuccess: isProccessDataSuccess }] = useProcessCaseDeatilMutation();
    const [moveCase,{isSuccess:isMoveDataSuccess}]=useMoveCaseDetailMutation();
    const formik = useFormik({
        initialValues: {
            [variable?.field_01.id]: "",
            [variable?.field_02.id]: "",
            [variable?.field_03.id]: "",
            [variable?.field_04.id]: "",
            [variable?.field_05.id]: "",
            [variable?.field_06.id]: variable?.field_06.value,
            [variable?.field_07.id]: "",
            [variable?.field_08.id]: "",
        },
        validateOnChange: true,
        validate: (values) => {
            const errors = {};
            if (!values[variable?.field_01.id]) {
                errors[variable?.field_01.id] = `${variable?.field_01.label} is required`;
            }
            if (!values[variable?.field_02.id]) {
                errors[variable?.field_02.id] = `${variable?.field_02.label} is required`;
            }
            if (!values[variable?.field_04.id]) {
                errors[variable?.field_04.id] = `${variable?.field_04.label} is required`;
            }
            if (!values[variable?.field_06.id]) {
                errors[variable?.field_06.id] = `${variable?.field_06.label} is required`;
            }
            return errors;
        },
        onSubmit: (values) => {
            const data = {
                ...values,
                vin: currentStep.vehicle_info?.vin,
                invoice_date: yearMonthDate(values[variable?.field_04?.id]),
                vehicle_in_date: yearMonthDate(values?.["vehicle_in_date"]),
                vehicle_out_date: yearMonthDate(values?.["vehicle_out_date"]),
                vehicle_in_time: TimeFormat(values?.["vehicle_in_time"]),
                vehicle_out_time: TimeFormat(values?.["vehicle_out_time"]),
                next_service_due_by: yearMonthDate(values?.["next_service_due_by"]),
            };
            delete data.uploadInvoice;

            processFlow({
                params: caseId, data: {
                    step_id: currentStepId,
                    data: { ...data }
                }
            })
        },
    });
    const getFile = () => {
        let upload = {}
        upload = {
            badge_value: currentStep?.invoice_document?.document_id
          ? "1"
          : "0",
            data: currentStep?.invoice_document,
            object_type: "vehicle",
            object_id: currentStep.vehicle_info?.vin,
            document_id: 0,
            document_type: [{ name: 'Repair invoice', code: "repair_invoice" }],
        }
        return upload
    }

    useEffect(() => {
        if (isProccessDataSuccess ) {
            reload();
            // toast.current.showToast('Success', "Hack up information successfully Saved.", 'success', false, 10000);
        }
        if (hasAccess && isProccessDataSuccess && caseData && caseData.case_info.case_status !== "Closed" && getCurrentStep(caseData.steps).step_id === currentStepId) {
            moveCase({ params: caseId })
        }
    }, [isProccessDataSuccess])

    useEffect(() => {
        if (isMoveDataSuccess) {
            setOpen(true)
        }
    }, [isMoveDataSuccess])
    

    useEffect(() => {
        if (currentStep) {
            // [variable?.field_01.id]: "",
            // [variable?.field_02.id]: "",
            // [variable?.field_03.id]: "",
            // [variable?.field_04.id]: "",
            // [variable?.field_05.id]: "",
            // [variable?.field_06.id]: variable?.field_06.value,
            // [variable?.field_07.id]: "",
            // [variable?.field_08.id]: "",
            // formik.setFieldValue(variable.field_01.id, currentStep?.invoice_date ? new Date(currentStep?.invoice_date) : "", true);
            // formik.setFieldValue(variable.field_02.id, currentStep?.medallion_type && variable.field_02.options.filter(item => item.code === currentStep?.medallion_type)[0], true);
            // formik.setFieldValue(variable.field_03.id, currentStep?.last_renewal_date ? new Date(currentStep?.last_renewal_date) : "", true);
            // formik.setFieldValue(variable.field_04.id, currentStep?.valid_from ? new Date(currentStep?.valid_from) : "", true);
            // formik.setFieldValue(variable.field_05.id, currentStep?.valid_to ? new Date(currentStep?.valid_to) : "", true);
            // formik.setFieldValue(variable.field_08.id, currentStep?.fs6_status || "", true);
            // formik.setFieldValue(variable.field_09.id, currentStep?.fs6_update_date ? new Date(currentStep?.fs6_update_date) : "", true);
        }
    }, [currentStep]);

    useEffect(()=>{
        formik.setFieldValue(variable.field_04.id, "", false);
    },[formik.values[variable.field_02.id]])

    return (
        <div className='w-100'>
            <form
                action=""
                className="common-form d-flex flex-column gap-5"
                onSubmit={formik.handleSubmit}
            >
                <div className="form-section">
                    <div className="form-body">
                        <div className="d-flex align-items-center flex-wrap form-grid-1 w-80">
                            <div className='w-100-3'>
                                <BCalendar variable={variable.field_01} formik={formik}></BCalendar>
                            </div>
                            <div className='w-100-3'>
                                <BCalendar variable={variable.field_02} formik={formik}></BCalendar>
                            </div>
                            <div className='w-100-3'>
                                <BTimePicker variable={variable.field_03} formik={formik}></BTimePicker>
                            </div>
                            <div className='w-100-3'>
                                <BCalendar variable={variable.field_04}  minDate={formik.values[variable.field_02.id]} formik={formik}></BCalendar>
                            </div>
                            <div className='w-100-3'>
                                <BTimePicker variable={variable.field_05} formik={formik}></BTimePicker>
                            </div>
                            <div className='w-100-3'>
                                <BRadio variable={variable.field_06} formik={formik}></BRadio>
                            </div>
                            <div className='w-100-3'>
                                <BInputNumber variable={variable.field_07} formik={formik}></BInputNumber>
                            </div>
                            <div className='w-100-3'>
                                <BModal>
                                    <BModal.ToggleButton>
                                        <Button
                                            text
                                            label="Upload Documents"
                                            className="text-black gap-2"
                                            type="button"
                                            // icon={() => <Img name="upload" />}
                                            icon={() => <div className="position-relative">
                                {/* {console.log(getDocumentDetails(item))} */}
                                  {/* <Badge value="1"  className="badge-icon" severity="warning"></Badge> */}
                                  {getFile()?.badge_value !== undefined &&
                                    getFile()?.badge_value !== null &&
                                    getFile()?.badge_value > 0 && (
                                      <Badge
                                        className="badge-icon"
                                        value={getFile()?.badge_value}
                                        severity="warning"
                                      ></Badge>
                                    )}
                                  <Img name="upload" />
                                </div>}
                                        />
                                    </BModal.ToggleButton>
                                    <BModal.Content >
                                        <BUpload {...getFile()}></BUpload>
                                    </BModal.Content>
                                </BModal>
                            </div>
                            <div className='w-100-3'>
                                <BInputText variable={variable.field_09} formik={formik}></BInputText>
                            </div>
                            <div className='w-100-3'>
                                <BCalendar variable={variable.field_10} formik={formik}></BCalendar>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="w-100 position-sticky bottom-0 py-3 bg-white">
                    <Button
                        // disabled={!hasAccess}
                        label="Submit Vehicle Repair Details"
                        type="submit"
                        severity="warning"
                        className="border-radius-0 primary-btn "
                    />
                </div>
                <BSuccessMessage
                    isOpen={isOpen}
                    message={`Vehicle Repair Details is successful Submitted for VIN No ${currentStep?.vehicle_info?.vin}`}
                    title="Vehicle Repairs Successful"
                    onCancel={() => {
                        setOpen(false); navigate('/manage-vehicle', { replace: true });
                    }}
                    onConfirm={() => {
                        setOpen(false); navigate('/manage-vehicle', { replace: true });
                    }}
                />
            </form>
        </div>
    )
}

export default VehicleRepairDetail