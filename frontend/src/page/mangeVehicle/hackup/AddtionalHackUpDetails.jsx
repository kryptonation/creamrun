import { Button } from "primereact/button";
import { addtionHackUpDetails as variable } from "../../../utils/variables";
import BInputFields from "../../../components/BInputFileds";
import { useFormik } from "formik";
import { useMoveCaseDetailMutation, useProcessCaseDeatilMutation } from "../../../redux/api/medallionApi";
import { yearMonthDate } from "../../../utils/dateConverter";
import { getCurrentStep } from "../../../utils/caseUtils";
import { useEffect, useRef, useState } from "react";
import BSuccessMessage from "../../../components/BSuccessMessage";
import { useNavigate } from "react-router-dom";
import BToast from "../../../components/BToast";
import { useDispatch } from "react-redux";
import { setIsUpload } from "../../../redux/slice/uploadSlice";
import { isValidTaxiIdentifier } from "../../../utils/utils";

const AddtionalHackUpDetails = ({ caseId, currentStepId, reload, currentStep, caseData, hasAccess }) => {
    const [processFlow, { isSuccess: isProccessDataSuccess }] = useProcessCaseDeatilMutation();
    const [moveCase, { isSuccess: isMoveDataSuccess }] = useMoveCaseDetailMutation();
    const [isOpen, setOpen] = useState(false)
    const navigate = useNavigate()
    const toast = useRef(null);
    const dispatch = useDispatch();

    const formik = useFormik({
        initialValues: {

        },
        validateOnChange: false,
        validate: (values) => {
            const errors = {};
            if (!values["plate_number"]) {
                errors["plate_number"] = `Plate number is required`;
            } else if (!isValidTaxiIdentifier(values["plate_number"])) {
                errors["plate_number"] = `Plate number is not valid`;
            }

            if (!values["meter_serial_no"]) {
                errors["meter_serial_no"] = `Meter Serial number is required`;
            }

            if (!values["insurance_number"]) {
                errors["insurance_number"] = `Insurance number is required`;
            }

            if (!values["insurance_start_date"]) {
                errors["insurance_start_date"] = `Insurance Start Date is required`;
            }

            if (!values["insurance_end_date"]) {
                errors["insurance_end_date"] = `Insurance End Date is required`;
            }

            return errors;
        },
        onSubmit: () => {
            const formikValues = formik?.values;
            console.log("🚀 ~ HackUpInspection ~ formikValues:", formikValues)
            const vechileData = {
                vin: currentStep?.vehicle?.vin || currentStep?.vehicle_details?.vehicle?.vin || "",
                plate_number: formikValues.plate_number,
                meter_serial_number: formikValues.meter_serial_no,
                insurance_number: formikValues.insurance_number,
                insurance_start_date: yearMonthDate(formikValues.insurance_start_date),
                insurance_end_date: yearMonthDate(formikValues.insurance_end_date),
            }
            const data = {
                step_id: currentStepId,
                data: vechileData
            }
            if (hasAccess)
                processFlow({ params: caseId, data: data });
        }
    });


    useEffect(() => {
        if (isProccessDataSuccess) {
            reload();
        }
        if (hasAccess && isProccessDataSuccess && caseData && caseData.case_info.case_status !== "Closed" && getCurrentStep(caseData.steps).step_id === currentStepId) {
            moveCase({ params: caseId })
        }
    }, [isProccessDataSuccess])

    useEffect(() => {
        if (isMoveDataSuccess) {
            reload();
            setOpen(true)
        }
    }, [isMoveDataSuccess])


    useEffect(() => {
        dispatch(setIsUpload(false));
    }, [currentStep])

    useEffect(() => {
        dispatch(setIsUpload(false));
    }, [])


    return (
        <>
            <form
                className="common-form d-flex flex-column"
                onSubmit={formik.handleSubmit}
            >
                <div className="form-section">
                    <div className="form-body">

                        <div className="d-flex align-items-center flex-wrap form-grid-1">

                            {variable.map((item, idx) => (
                                <div key={idx} className="w-100-3">
                                    <BInputFields variable={item} formik={formik} />
                                </div>
                            ))}
                        </div>

                    </div>
                </div>
                <div className="w-100 position-sticky bottom-0 py-3 bg-white">
                    {/* <div className="d-flex align-items-center gap-3" style={{ marginTop: 10, marginBottom: 10 }}>
                        <Checkbox inputId="accept" name="accept" onChange={e => setChecked(e.checked)} checked={checked} />
                        <label htmlFor="accept" className="ml-2">By Accepting , All Documents received and uploaded in the system.</label>
                    </div> */}
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

            <BSuccessMessage
                isOpen={isOpen}
                message={`VIN ${currentStep?.vehicle?.vin || currentStep?.vehicle_details?.vehicle?.vin || ""}`}
                title="Hack-Up Process Successful"
                onCancel={() => {
                    setOpen(false);
                    navigate("/manage-vehicle", { replace: true });
                }}
                onConfirm={() => {
                    setOpen(false);
                    navigate("/manage-vehicle", { replace: true });
                }}
            ></BSuccessMessage>
        </>
    )
}

export default AddtionalHackUpDetails