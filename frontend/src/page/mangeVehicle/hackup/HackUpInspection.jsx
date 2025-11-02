import { Button } from "primereact/button";
import { inspectionHackup as variable } from "../../../utils/variables";
import BInputFields from "../../../components/BInputFileds";
import { useFormik } from "formik";
import { useMoveCaseDetailMutation, useProcessCaseDeatilMutation } from "../../../redux/api/medallionApi";
import { TimeFormat, TimeToDateFormat, yearMonthDate } from "../../../utils/dateConverter";
import { getCurrentStep } from "../../../utils/caseUtils";
import { useEffect, useRef, useState } from "react";
import BModal from "../../../components/BModal";
import Img from "../../../components/Img";
import BUpload from "../../../components/BUpload";
import BSuccessMessage from "../../../components/BSuccessMessage";
import { useNavigate } from "react-router-dom";
import BCaseCard from "../../../components/BCaseCard";
import { Checkbox } from "primereact/checkbox";
import BToast from "../../../components/BToast";
import { useDispatch, useSelector } from "react-redux";
import { setIsUpload } from "../../../redux/slice/uploadSlice";
import { Badge } from "primereact/badge";

const HackUpInspection = ({ caseId, currentStepId, reload, currentStep, caseData, hasAccess }) => {
    const [processFlow, { isSuccess: isProccessDataSuccess }] = useProcessCaseDeatilMutation();
    const [moveCase, { isSuccess: isMoveDataSuccess }] = useMoveCaseDetailMutation();
    const [isOpen, setOpen] = useState(false)
    const navigate = useNavigate()
    const [checked, setChecked] = useState(false);
    const toast = useRef(null);
    const dispatch = useDispatch();
    const isUpload = useSelector((state) => state.upload.isUpload);

    const formik = useFormik({
        initialValues: {
    mileRun: false,
    inspectionDate: "",
    loggedDate: "",
    nextInspectionDue:  "",
    odometerReadingDate:"",
    result:"",
    loggedTime: "",
    odometerReadingTime: "",
    inspectionTime: "",
    odometerReading:  "",
    inspectionFee:  "",
    renewalDate: "" 
  },
        validateOnChange: false,
        onSubmit: () => {
            const formikValues = formik?.values;
            console.log("🚀 ~ HackUpInspection ~ formikValues:", formikValues)
            const vechileData = {
                vin: currentStep?.vehicle_info.vin || "",
                mile_run: formikValues.mileRun,
                inspection_date: formikValues.inspectionDate ? yearMonthDate(formikValues.inspectionDate) : "",
                inspection_time: formikValues.inspectionTime ? TimeFormat(formikValues.inspectionTime) : "",
                // odometer_reading_date: formikValues.odometerReadingDate ? yearMonthDate(formikValues.odometerReadingDate) : "",
                // odometer_reading_time: formikValues.odometerReadingTime ? TimeFormat(formikValues.odometerReadingTime) : "",
                // odometer_reading: Number(formikValues.odometerReading) || 0,
                // logged_date: formikValues.loggedDate ? yearMonthDate(formikValues.loggedDate) : "",
                // logged_time: formikValues.loggedTime ? TimeFormat(formikValues.loggedTime) : "",
                inspection_fee: Number(formikValues.inspectionFee) || 0,
                result: formikValues.result || "",
                next_inspection_due_date: formikValues.nextInspectionDue ? yearMonthDate(formikValues.nextInspectionDue) : "",
            };

            const data = {
                step_id: currentStepId,
                data: vechileData
            }
            if (hasAccess)
                processFlow({ params: caseId, data: data });
        }
    });


    useEffect(() => {
        if (isProccessDataSuccess && !checked) {
            reload();
            toast.current.showToast('Success', "Hack up information successfully Saved.", 'success', false, 10000);
        }
        if (hasAccess && checked && isProccessDataSuccess && caseData && caseData.case_info.case_status !== "Closed" && getCurrentStep(caseData.steps).step_id === currentStepId) {
            moveCase({ params: caseId })
        }
    }, [isProccessDataSuccess])

    useEffect(() => {
        if (isMoveDataSuccess) {
            reload();
            // setOpen(true)
        }
    }, [isMoveDataSuccess])


    useEffect(() => {
        if (currentStep && !isUpload &&currentStep?.inspection_info) {
            let mileRun = currentStep?.inspection_info?.mile_run ?? true;
            let result = currentStep?.inspection_info?.result ?? "Pass";
            formik.setFieldValue('mileRun', mileRun, false);
            formik.setFieldValue('inspectionDate', currentStep?.inspection_info?.inspection_date ? new Date(currentStep?.inspection_info?.inspection_date) : "", false);
            formik.setFieldValue('inspectionTime', currentStep?.inspection_info.inspection_time ? new Date(TimeToDateFormat(currentStep?.inspection_info?.inspection_time)) : "", false);
            // formik.setFieldValue('loggedDate', currentStep?.inspection_info?.logged_date ? new Date(currentStep?.inspection_info?.logged_date) : "", false);
            formik.setFieldValue('nextInspectionDue', currentStep?.inspection_info?.next_inspection_due ? new Date(currentStep?.inspection_info?.next_inspection_due) : "", false);
            // formik.setFieldValue('odometerReadingDate', currentStep?.inspection_info?.odometer_reading_date ? new Date(currentStep?.inspection_info?.odometer_reading_date) : "", false);
            formik.setFieldValue('result', result, false);
            // formik.setFieldValue('loggedTime', currentStep?.inspection_info?.logged_time ? new Date(TimeToDateFormat(currentStep?.inspection_info?.logged_time)) : "", false);
            // formik.setFieldValue('odometerReadingTime', currentStep?.inspection_info.odometer_reading_time ? new Date(TimeToDateFormat(currentStep?.inspection_info?.odometer_reading_time)) : "", false);
            // formik.setFieldValue('odometerReading', currentStep?.inspection_info?.odometer_reading, false);
            formik.setFieldValue('inspectionFee', currentStep?.inspection_info?.inspection_fee, false);
        }
        dispatch(setIsUpload(false));
    }, [currentStep])

    useEffect(() => {
        dispatch(setIsUpload(false));
    }, [])

    const getFile = (item) => {
        let upload = {}
        if (item.id === 'uploadMeterInspectionReport') {
            upload = {
                badge_value: currentStep?.meter_inspection_report_document?.document_id ? '1' : '0',
                data: currentStep?.meter_inspection_report_document,
                object_type: currentStep?.meter_inspection_report_document?.document_object_type,
                object_id: currentStep?.meter_inspection_report_document?.document_object_id,
                document_id: currentStep?.meter_inspection_report_document?.document_id,
                document_type: [{ name: 'Meter Inspection Report Document', code: currentStep?.meter_inspection_report_document?.document_type }],
            }
        } else if (item.id === 'uploadRateCard') {
            upload = {
                badge_value: currentStep?.rate_card_document?.document_id ? '1' : '0',
                data: currentStep?.rate_card_document,
                object_type: currentStep?.rate_card_document?.document_object_type,
                object_id: currentStep?.rate_card_document?.document_object_id,
                document_id: currentStep?.rate_card_document?.document_id,
                document_type: [{ name: 'Rate Card Document', code: currentStep?.rate_card_document?.document_type }],
            }
        } else if (item.id === 'uploadInspectionReceipt') {
            upload = {
                badge_value: currentStep?.inspection_receipt_document?.document_id ? '1' : '0',
                data: currentStep?.inspection_receipt_document,
                object_type: currentStep?.inspection_receipt_document?.document_object_type,
                object_id: currentStep?.inspection_receipt_document?.document_object_id,
                document_id: currentStep?.inspection_receipt_document?.document_id,
                document_type: [{ name: 'Inspection Receipt Document', code: currentStep?.inspection_receipt_document?.document_type }],
            }
        }
        return upload
    }

    return (
        <>
            <form
                className="common-form d-flex flex-column"
                onSubmit={formik.handleSubmit}
            >
                <div className="form-section">
                    <div className="form-body">

                        <div className="d-flex align-items-center flex-wrap form-grid-1">

                            {variable.map((child, parentIndex) => (
                                <div key={parentIndex} className={`d-flex align-items-center flex-wrap form-grid-1 ${parentIndex == 0  ? 'w-100' : ''}`}>
                                    {child.map((item, index) => (
                                        <div className="d-flex" key={index} style={{
                                             ...(item.size === 'xl' && { width: '100%' })
                                        }}>
                                            {(parentIndex == 0 && index == 0) ? (
                                                <div className="w-100">
                                                <BCaseCard label={item.label} value="Hack up"></BCaseCard>
                                                </div>
                                            ) : (
                                                <>
                                                    {
                                                        item.inputType === 'UPLOAD' ? (
                                                            <BModal>
                                                                <BModal.ToggleButton>
                                                                    <Button
                                                                        text
                                                                        label={item.label}
                                                                        className="text-grey gap-2 ms-auto individual-upload-btn"
                                                                        type="button"
                                                                        icon={() => <div className="position-relative">
                                                                        {/* <Badge value="1"  className="badge-icon" severity="warning"></Badge> */}
                                                                        {getFile(item)?.badge_value !== undefined && getFile(item)?.badge_value !== null && getFile(item)?.badge_value > 0 && (
                                                                          <Badge className="badge-icon" value={getFile(item)?.badge_value} severity="warning"></Badge>
                                                                        )}
                                                                        <Img name="upload" /></div>}
                                                                    >
                                                                    
                                                                    </Button>
                                                                </BModal.ToggleButton>
                                                                <BModal.Content >
                                                                    <BUpload
                                                                        {...getFile(item)}
                                                                    ></BUpload>
                                                                </BModal.Content>
                                                            </BModal>
                                                        ) : (
                                                            <BInputFields variable={item} formik={formik} />
                                                        )
                                                    }
                                                </>
                                            )
                                            }
                                        </div>
                                    ))
                                    }
                                </div>
                            ))}
                        </div>

                    </div>
                </div>
                 <div className="w-100 position-sticky bottom-0 py-3 bg-white">
                    <div className="d-flex align-items-center gap-3" style={{ marginTop: 10, marginBottom: 10 }}>
                        <Checkbox inputId="accept" name="accept" onChange={e => setChecked(e.checked)} checked={checked} />
                        <label htmlFor="accept" className="ml-2">By Accepting , All Documents received and uploaded in the system.</label>
                    </div>
                    <Button
                        disabled={!hasAccess}
                        type="submit"
                        label="Submit Vehicle Details"
                        severity="warning"
                        className="border-radius-0 primary-btn"
                    />
                </div>
            </form>
            <BToast ref={toast} position='top-right' />

            <BSuccessMessage isOpen={isOpen} message={`Vehicle Hack-Up Process is successful and approved against VIN No ${currentStep?.vehicle_info?.vin}`} title="Hack-Up process is successful" onCancel={() => {
                setOpen(false); navigate('/manage-vehicle', { replace: true });
            }} onConfirm={() => {
                setOpen(false); navigate('/manage-vehicle', { replace: true });
            }}></BSuccessMessage>
        </>
    )
}

export default HackUpInspection