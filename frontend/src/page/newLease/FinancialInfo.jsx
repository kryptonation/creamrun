import { nanoid } from "@reduxjs/toolkit";
import { useFormik } from "formik";
import { Button } from "primereact/button";
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from "primereact/dialog";
import { Divider } from "primereact/divider";
import { InputNumber } from "primereact/inputnumber";
import { useCallback, useEffect, useState } from "react";
import BCaseCard from "../../components/BCaseCard";
import Img from "../../components/Img";
import { useGetViewLeaseScheduleQuery } from "../../redux/api/leaseApi";
import { useGetStepInfoDetailMutation, useMoveCaseDetailMutation, useProcessCaseDeatilMutation } from "../../redux/api/medallionApi";
import { getCurrentStep } from "../../utils/caseUtils";
import { leaseFinancialDetails as variable } from "../../utils/variables";

const FinancialInfo = ({ caseId, currentStepId, currentStepData, caseData, hasAccess }) => {
    const [processFlow, { isSuccess: isProccessDataSuccess }] = useProcessCaseDeatilMutation();
    const [moveCase] = useMoveCaseDetailMutation();

    const [getStepInfoDetail, { data: stepInfoData, isSuccess, error }] = useGetStepInfoDetailMutation();
    const [shortTerm, setShortTerm] = useState(variable[stepInfoData?.lease_case_details?.lease_type])
    const [isMoveClicked, setMoveClicked] = useState(false)
    const formik = useFormik({
        initialValues: {
            [variable?.dov[0].id]: 0,
            [variable?.dov[1].id]: 0,
            [variable?.dov[2].id]: 0,
            [variable?.dov[3].id]: 0,
            [variable?.dov[4].id]: 0,
            [variable?.dov[6].id]: 0,
            [variable?.["long-term"][0].id]: "",
            [variable?.["long-term"][1].id]: "",
            [variable?.["long-term"][2].id]: "",
            [variable?.["long-term"][3].id]: "",
            [variable?.["long-term"][4].id]: "",
            [variable?.["long-term"][5].id]: "",
            [variable?.["medallion-only"][0].id]: "",
            [variable?.["medallion-only"][1].id]: "",
            longer_day_shift: "",
            longer_night_shift: "",
            longer_day_shift_tlc_maximum_amount: "",
            longer_night_shift_tlc_maximum_amount: "",
            day_of_week: "",
        },

        validate: (values) => {
            const errors = {};

            const max_total_lease_amt =
                (stepInfoData?.financials?.tlc_vehicle_cap || 0) +
                (stepInfoData?.financials?.tlc_medallion_cap || 0);


            if (values?.total_lease_amt > max_total_lease_amt) {
                errors[
                    "total_lease_amt"
                ] = `Max allowed: ${max_total_lease_amt}`;
            }

            if (values?.security_deposit > 5000) {
                errors[
                    "security_deposit"
                ] = `Max allowed: 5000`;
            }

            if (values?.cancellation_charge > formik.values?.total_lease_amt) {
                errors[
                    "cancellation_charge"
                ] = `Max allowed: ${formik.values?.total_lease_amt}`;
            }

            const medallion_amount = (stepInfoData?.financials?.tlc_medallion_cap + stepInfoData?.financials?.tlc_vehicle_cap)
                - formik.values.total_vehicle_lease_amount
                - formik.values.tlc_inspection_fee
                - formik.values.tax_stamps
                - formik.values.registration


            console.log("xxx medallion_amount: ", medallion_amount)
            console.log("xxx medallion_amount: ", values?.medallion_lease_payment)

            if (values?.medallion_lease_payment > medallion_amount) {
                errors[
                    "medallion_lease_payment"
                ] = `Exceeds Cap`;
            }
            return errors;
        },

        onSubmit: () => {
            processAPI()
        },
    });

    const processAPI = () => {
        const values = formik.values;

        const fin_info = {
            "tlc_vehicle_lifetime_cap": stepInfoData?.financials?.tlc_max_vehicle_cap,
            "amount_collected": "0.00",
            "veh_sales_tax": values.sales_tax,
            "tlc_inspection_fees": values.tlc_inspection_fee,
            "tax_stamps": values.tax_stamps,
            "lease_amount": values.total_lease_amt,
            "veh_lease": values.vehicle_lease,
            "med_lease": values.medallion_lease_payment,
            "registration": values.registration,
            "veh_tlc_maximum_amount": stepInfoData?.financials?.tlc_vehicle_cap,
            "med_tlc_maximum_amount": stepInfoData?.financials?.tlc_medallion_cap,
            "total_vehicle_lease": values.total_vehicle_lease_amount,
            "security_deposit": values.security_deposit,
            "cancellation_charge": values.cancellation_charge,
            "additional_balance_due": values.additional_bal_due,
            "total_medallion_lease_payment": values.total_medallion_lease_payment,
        }
        processFlow({
            params: caseId, data: {
                step_id: currentStepId,
                data: {
                    "lease_type": stepInfoData?.lease_case_details?.lease_type,
                    "financial_information": fin_info
                }
            }
        })
    }
    useEffect(() => {
        if (isProccessDataSuccess) {
            if (currentStepId && caseId) {
                getStepInfoDetail({ caseNo: caseId, step_no: currentStepId });
            }
            leaseRefetch()
            if (isMoveClicked) {
                moveCase({ params: caseId })
            }
        }

    }, [isProccessDataSuccess]);


    useEffect(() => {
        if (currentStepId && caseId) {
            getStepInfoDetail({ caseNo: caseId, step_no: currentStepId });
        }
    }, [currentStepId, caseId]);


    const amountTemplate = useCallback(
        (data) => {
            let max = null;

            if (max < 0) max = 0;
            const isDisable = !data?.amount?.editable;

            if ((stepInfoData?.lease_case_details?.lease_type === "medallion-only") && (data?.id === "vehicle_lease" || data?.id === "sales_tax" || data?.id === "total_vehicle_lease_amount")) {
                return "-"
            } else {
                return (
                    <div className="d-flex align-items-center gap-2" style={{ minHeight: 40 }}>
                        <InputNumber
                            inputId={data?.id}
                            id={data?.id}
                            className={isDisable ? "input-disabled-border-0 p-1" : "border border-1 border-dark p-1"}
                            disabled={isDisable}
                            value={formik.values[data?.id]}
                            onBlur={formik.handleBlur}
                            min={0}
                            onValueChange={(e) => {
                                formik.setFieldValue(data?.id, e.value)
                            }}
                            onChange={(e) => {
                                formik.handleChange({
                                    target: {
                                        id: data?.id, value: e.value
                                    }
                                })
                            }
                            }
                            mode={"currency"}
                            currency="USD"
                            locale="en-US"
                            minFractionDigits={2}
                            maxFractionDigits={10}
                            style={{ height: 40 }}
                        />
                        <span
                            id={`${data?.id}-error-msg`}
                            className="text-danger small"
                            style={{ whiteSpace: "nowrap", width: 200 }}
                        >
                            {formik.errors[data?.id] && (
                                <>
                                    {formik.errors[data?.id]}
                                </>
                            )}
                        </span>

                    </div>
                );
            }

        },
        [formik.values, formik.errors, formik.touched, stepInfoData]
    );

    const catergoryTemplate = useCallback((data) => {
        console.log("🚀 ~ amountTemplate ~ data:", formik.values)

        if (data.id === "total_lease_amt" || data.id === "vehicle_lease" || data.id === "total_vehicle_lease_amount" || data.id === "medallion_lease_payment" || data.id === "tlc_medallion_lease_cap" || data.id === "total_medallion_lease_payment") {
            return <p className="text-grey mb-0 fw-small lease-amount-table-title">{data.category}</p>
        }

        return <p className="text-grey mb-0 fw-small">{data.category}</p>

    }, [formik.values])

    const [isDialogVisible, setDialogVisible] = useState(false);
    const [isDialogPresetVisible, setDialogPresetVisible] = useState(false);
    function getLeaseLimit(type) {
        const item = stepInfoData?.lease_configuration?.configurations.find(c => c.lease_breakup_type === type);
        return item ? Number(item.lease_limit) : null; // convert to number, fallback null
    }
    useEffect(() => {
        console.log("stepInfoData : ", stepInfoData)
        if (stepInfoData) {
            console.log("stepInfoData1 : ", stepInfoData)

            if (stepInfoData?.lease_configuration?.configurations?.length > 0) {
                console.log("stepInfoData2 : ", stepInfoData)

                formik.setFieldValue("total_lease_amt", getLeaseLimit("lease_amount"), true);
                formik.setFieldValue("vehicle_lease", getLeaseLimit("veh_lease"), true);
                formik.setFieldValue("sales_tax", getLeaseLimit("veh_sales_tax"), true);
                formik.setFieldValue("tlc_inspection_fee", getLeaseLimit("tlc_inspection_fees"), true);
                formik.setFieldValue("tax_stamps", getLeaseLimit("tax_stamps"), true);
                formik.setFieldValue("registration", getLeaseLimit("registration"), true);
                formik.setFieldValue("total_vehicle_lease_amount", getLeaseLimit("total_vehicle_lease"), true);
                formik.setFieldValue("medallion_lease_payment", getLeaseLimit("med_lease"), true);
                formik.setFieldValue("security_deposit", stepInfoData?.financials?.security_deposit, true);
                formik.setFieldValue("cancellation_charge", stepInfoData?.financials?.cancellation_amount || 0, true);
                formik.setFieldValue("additional_bal_due", stepInfoData?.financials?.additional_balance_due || 0, true);

            } else {
                console.log("stepInfoData3 : ", stepInfoData)

                const lease_amt = stepInfoData?.financials?.tlc_vehicle_cap -
                    (stepInfoData?.financials?.sales_tax)


                const total =
                    parseFloat(stepInfoData?.financials?.tlc_medallion_cap || 0) +
                    parseFloat(stepInfoData?.financials?.tlc_vehicle_cap || 0);

                formik.setFieldValue("total_lease_amt", total)
                formik.setFieldValue("vehicle_lease", Math.max(0, lease_amt || 0), true);
                formik.setFieldValue("sales_tax", stepInfoData?.financials?.sales_tax, true);
                formik.setFieldValue("tlc_inspection_fee", stepInfoData?.financials?.tlc_inspection_fees, true);
                formik.setFieldValue("tax_stamps", stepInfoData?.financials?.tax_stamps, true);
                formik.setFieldValue("registration", stepInfoData?.financials?.registration, true);
                formik.setFieldValue("total_vehicle_lease_amount", stepInfoData?.financials?.tlc_vehicle_cap, true);
                // formik.setFieldValue("medallion_lease_payment", currentStepData?.financials?.tlc_medallion_cap, true);
                formik.setFieldValue("security_deposit", stepInfoData?.financials?.security_deposit, true);
                formik.setFieldValue("cancellation_charge", stepInfoData?.financials?.cancellation_amount || 0, true);
                formik.setFieldValue("additional_bal_due", stepInfoData?.financials?.additional_balance_due || 0, true);
                formik.setFieldValue("total_vehicle_lease_amount", stepInfoData?.financials?.tlc_vehicle_cap || 0, true);


                const medallion_amount = total - stepInfoData?.financials?.tlc_vehicle_cap - stepInfoData?.financials?.tlc_inspection_fees - stepInfoData?.financials?.tax_stamps - stepInfoData?.financials?.registration
                formik.setFieldValue("medallion_lease_payment", medallion_amount, true);

                const total_medallion = medallion_amount + stepInfoData?.financials?.tlc_inspection_fees + stepInfoData?.financials?.tax_stamps + stepInfoData?.financials?.registration
                formik.setFieldValue("total_medallion_lease_payment", total_medallion, true);

            }
        }
    }, [stepInfoData]);

    useEffect(() => {
        if (currentStepData) {

            if (currentStepData?.lease_configuration?.configurations?.length > 0) {
                formik.setFieldValue("total_lease_amt", getLeaseLimit("lease_amount"), true);
                formik.setFieldValue("vehicle_lease", getLeaseLimit("veh_lease"), true);
                formik.setFieldValue("sales_tax", getLeaseLimit("veh_sales_tax"), true);
                formik.setFieldValue("tlc_inspection_fee", getLeaseLimit("tlc_inspection_fees"), true);
                formik.setFieldValue("tax_stamps", getLeaseLimit("tax_stamps"), true);
                formik.setFieldValue("registration", getLeaseLimit("registration"), true);
                formik.setFieldValue("total_vehicle_lease_amount", getLeaseLimit("total_vehicle_lease"), true);
                formik.setFieldValue("medallion_lease_payment", getLeaseLimit("med_lease"), true);
                formik.setFieldValue("security_deposit", currentStepData?.financials?.security_deposit, true);
                formik.setFieldValue("cancellation_charge", currentStepData?.financials?.cancellation_amount || 0, true);
                formik.setFieldValue("additional_bal_due", currentStepData?.financials?.additional_balance_due || 0, true);

            } else {
                const lease_amt = currentStepData?.financials?.tlc_vehicle_cap -
                    (currentStepData?.financials?.sales_tax)

                const total =
                    parseFloat(currentStepData?.financials?.tlc_medallion_cap || 0) +
                    parseFloat(currentStepData?.financials?.tlc_vehicle_cap || 0);

                formik.setFieldValue("total_lease_amt", total)
                formik.setFieldValue("vehicle_lease", Math.max(0, lease_amt || 0), true);
                formik.setFieldValue("sales_tax", currentStepData?.financials?.sales_tax, true);
                formik.setFieldValue("tlc_inspection_fee", currentStepData?.financials?.tlc_inspection_fees, true);
                formik.setFieldValue("tax_stamps", currentStepData?.financials?.tax_stamps, true);
                formik.setFieldValue("registration", currentStepData?.financials?.registration, true);
                formik.setFieldValue("total_vehicle_lease_amount", currentStepData?.financials?.tlc_vehicle_cap, true);
                // formik.setFieldValue("medallion_lease_payment", currentStepData?.financials?.tlc_medallion_cap, true);
                formik.setFieldValue("security_deposit", currentStepData?.financials?.security_deposit, true);
                formik.setFieldValue("cancellation_charge", currentStepData?.financials?.cancellation_amount || 0, true);
                formik.setFieldValue("additional_bal_due", currentStepData?.financials?.additional_balance_due || 0, true);
                formik.setFieldValue("total_vehicle_lease_amount", currentStepData?.financials?.tlc_vehicle_cap || 0, true);

                const medallion_amount = total - currentStepData?.financials?.tlc_vehicle_cap - currentStepData?.financials?.tlc_inspection_fees - currentStepData?.financials?.tax_stamps - currentStepData?.financials?.registration
                formik.setFieldValue("medallion_lease_payment", medallion_amount, true);

                const total_medallion = medallion_amount + currentStepData?.financials?.tlc_inspection_fees + currentStepData?.financials?.tax_stamps + currentStepData?.financials?.registration
                formik.setFieldValue("total_medallion_lease_payment", total_medallion, true);
            }
        }
    }, [currentStepData]);
    useEffect(() => {
        const medallion_amount = formik.values.total_lease_amt - formik.values.total_vehicle_lease_amount - formik.values.tlc_inspection_fee - formik.values.tax_stamps - formik.values?.registration
        formik.setFieldValue("medallion_lease_payment", medallion_amount, true);

        const total_medallion = medallion_amount + formik.values.tlc_inspection_fee + formik.values.tax_stamps + formik.values?.registration
        formik.setFieldValue("total_medallion_lease_payment", total_medallion, true);


    }, [formik.values.total_lease_amt])



    const leaseType = {
        ["dov"]: 'DOV - Driver Owned Vehicle',
        ["long-term"]: 'Long Term',
        ["short-term"]: 'True weekly / Short Term',
        ["medallion-only"]: 'Medallion-Only',
        ["shift-lease"]: 'Shift Lease',
    }

    const { data: leaseSchedule, refetch: leaseRefetch } = useGetViewLeaseScheduleQuery(
        stepInfoData?.lease_configuration?.lease_id,
        { skip: !stepInfoData }
    );
    const rowClass = (rowData, { rowIndex }) => {
        console.log("xxx rowClass", rowData)
        if (rowData.id === "total_lease_amt" || rowData.id === "total_vehicle_lease_amount") {
            return "row-divider";
        }
        return "";
    };

    return (
        <div className='w-100 h-100'>
            <div className="d-flex align-items-center justify-content-between">
                <div className="topic-txt d-flex align-items-center gap-2">
                    <Img name="financial" className="icon-black"></Img>Enter Financial Information
                </div>
                <div className="d-flex">
                    <Button
                        text
                        label="Lease Schedule"
                        type="button"
                        className="text-blue gap-2"
                        onClick={() => { setDialogVisible(true) }}
                        icon={() => <Img name={"ic_eye"} />}
                    />
                    {/* <Divider layout="vertical" />
                    <Button
                        text
                        label="Lease Preset"
                        type="button"
                        className="text-blue gap-2"
                        onClick={() => { setDialogPresetVisible(true) }}
                        icon={() => <Img name={"ic_eye"} />}
                    /> */}
                </div>
                <Dialog
                    visible={isDialogVisible}
                    modal
                    onHide={() => setDialogVisible(false)}
                    content={() => (<div className="d-flex flex-column align-items-center p-5 bg-light confirm-modal">
                        <div className="w-100 d-flex align-items-center justify-content-between mb-2 header">
                            <div className="header-text">
                                Lease Schedule
                            </div>
                            <Button
                                text
                                className="close-icon"
                                icon={() => <Img name="modalCancel"></Img>}
                                onClick={() => {
                                    setDialogVisible(false)
                                }}
                            ></Button>
                        </div>
                        <DataTable className="custom-data-table" value={leaseSchedule} scrollable
                            scrollHeight="300px">
                            <Column field="installment_no" header="#" />
                            <Column field="period_start" header={"Period Start"} />
                            <Column field="period_end" header={"Period End"} />
                            <Column field="active_days" header={"Active Days"} />
                            <Column field="amount_due" header={"Total Amount"} />
                            <Column
                                field="medallion_amount"
                                header={"Medallion"}
                            />
                            <Column
                                field="vehicle_amount"
                                header={"Vehicle"}
                            />
                        </DataTable>
                    </div>)}
                >
                </Dialog>
            </div>
            <div className="d-flex align-items-center gap-5 py-4 ">
                <BCaseCard label="Medallion No" value={stepInfoData?.lease_case_details?.medallion_number} />
                <BCaseCard label="Medallion Owner" value={stepInfoData?.lease_case_details?.medallion_owner} />
                <BCaseCard label="Vehicle VIN No" value={stepInfoData?.lease_case_details?.vehicle_vin} />
                <BCaseCard
                    label="Vehicle"
                    value={(stepInfoData?.lease_case_details?.make || "") + " " +
                        (stepInfoData?.lease_case_details?.model || "") + " " +
                        (stepInfoData?.lease_case_details?.year || "-")}
                />
                <BCaseCard label="Vehicle Plate No" value={stepInfoData?.lease_case_details?.plate_number} />
                <BCaseCard label="Vehicle Type" value={stepInfoData?.lease_case_details?.vehicle_type.replace("Wav", "WAV")} />
                <BCaseCard label="Lease Type" value={
                    stepInfoData?.lease_case_details?.lease_type === "shift-lease"
                        ? `${leaseType[stepInfoData?.lease_case_details?.lease_type]} - ${stepInfoData?.lease_case_details?.vehicle_availability || ""}`
                        : leaseType[stepInfoData?.lease_case_details?.lease_type]
                } />
            </div>
            <form
                className="common-form d-flex flex-column gap-5"
                onSubmit={formik.handleSubmit}
            >
                <div className="form-section">
                    <div className="form-body">
                        <div style={{ display: 'flex' }}>
                            <div className="pe-5 dotted-divider-right" style={{ width: "70%" }}>
                                <div className="d-flex gap-5">
                                    <div className="d-flex align-items-center flex-wrap gap-5">
                                        {
                                            <div className="w-100-3 d-flex align-items-center gap-2">
                                                <p className="text-grey mb-0 fw-small">Total Weeks</p>
                                                <p className="regular-semibold-text">{stepInfoData?.lease_configuration?.total_weeks}</p>
                                            </div>
                                        }
                                    </div>

                                    <div className="d-flex align-items-center flex-wrap gap-5 ">
                                        {
                                            <div className="w-100-3 d-flex align-items-center gap-2">
                                                <p className="text-grey mb-0 fw-small">Current Segment</p>
                                                <p className="regular-semibold-text">{stepInfoData?.financials?.current_segment}</p>
                                            </div>
                                        }
                                    </div>

                                    <div className="d-flex align-items-center flex-wrap gap-5">
                                        {
                                            <div className="w-100-3 d-flex align-items-center gap-2">
                                                <p className="text-grey mb-0 fw-small">Total Segment</p>
                                                <p className="regular-semibold-text">{stepInfoData?.financials?.total_segments}</p>
                                            </div>
                                        }
                                    </div>
                                </div>
                                {/* {stepInfoData?.lease_case_details?.lease_type !== "short-term" ? */}
                                <DataTable value={variable[stepInfoData?.lease_case_details?.lease_type]}
                                    dataKey={nanoid()}
                                    className="bg-transparent category-table mt-2 lease-amount-table"
                                    pt={{
                                        bodyRow: "bg-transparent",
                                        thead: "bg-transparent",
                                        headerRow: "bg-transparent",
                                    }}
                                    rowClassName={rowClass}
                                >
                                    <Column field="category" header="Category" body={(data) => catergoryTemplate(data)}></Column>
                                    <Column field="amount" header="Amount" body={(data) => amountTemplate(data)}></Column>
                                </DataTable>
                                {/* <div className="mt-2">
                                    <BInputText variable={leaseRemark[0]} formik={formik} />
                                </div> */}
                            </div>
                            {/* <Divider layout="vertical" className="dotted-divider full-height-divider" /> */}

                            <div className="ms-3">
                                <div className="d-flex align-items-center" style={{ width: '100%', justifyContent: 'space-between' }}>
                                    <p className="text-grey mb-0 fw-small" style={{ margin: 0 }}>
                                        TLC Vehicle Lease Cap
                                    </p>
                                    <InputNumber
                                        inputId="TLCMaximum"
                                        id="TLCMaximum"
                                        value={stepInfoData?.financials?.tlc_vehicle_cap}
                                        mode="currency"
                                        currency="USD"
                                        locale="en-US"
                                        inputStyle={{ textAlign: "right", fontWeight: "bold" }}
                                        style={{ height: 40, width: 150 }}
                                        disabled={true}
                                        minFractionDigits={2}
                                        maxFractionDigits={10}
                                    />
                                </div>
                                <div className="d-flex align-items-center" style={{ width: '100%', justifyContent: 'space-between' }}>
                                    <p className="text-grey mb-0 fw-small w-50">TLC Medallion Lease Cap</p>
                                    {/* <p className="regular-semibold-text">$58,000.00</p> */}
                                    <InputNumber
                                        inputId={"trueId"}
                                        id={"trueId"}
                                        disabled={true}
                                        // className={"border border-1 border-dark p-1 sec-topic text-black"}
                                        value={stepInfoData?.financials?.tlc_medallion_cap}
                                        // onValueChange={(e) => formik.setFieldValue(data?.id, e.value)}
                                        // onChange={(e) => formik.handleChange({ target: { id: data?.id, value: e.value } })}
                                        mode="currency"
                                        currency="USD"
                                        locale="en-US"
                                        inputStyle={{ textAlign: "right", fontWeight: "bold" }}
                                        minFractionDigits={2}
                                        maxFractionDigits={10}
                                        style={{ height: 40, width: 150 }}
                                    />
                                </div>
                                <div className="d-flex align-items-center" style={{ width: '100%', justifyContent: 'space-between' }}>
                                    <p className="text-grey mb-0 fw-small w-50">TLC Lifetime Vehicle Cap</p>
                                    {/* <p className="regular-semibold-text">$58,000.00</p> */}
                                    <InputNumber
                                        inputId={"trueId"}
                                        id={"trueId"}
                                        disabled={true}
                                        // className={"border border-1 border-dark p-1 sec-topic text-black"}
                                        value={stepInfoData?.financials?.tlc_max_vehicle_cap ?? 0.00}
                                        // onValueChange={(e) => formik.setFieldValue(data?.id, e.value)}
                                        // onChange={(e) => formik.handleChange({ target: { id: data?.id, value: e.value } })}
                                        mode="currency"
                                        currency="USD"
                                        locale="en-US"
                                        minFractionDigits={2}
                                        maxFractionDigits={10}
                                        inputStyle={{ textAlign: "right", fontWeight: "bold" }}
                                        style={{ height: 40, width: 150 }}
                                    />
                                </div>
                                <Divider layout="horizontal" />

                                <div className="d-flex align-items-center" style={{ width: '100%', justifyContent: 'space-between' }}>
                                    <p className="text-grey mb-0 fw-small w-50">Vehicle True cost</p>
                                    {/* <p className="regular-semibold-text">$58,000.00</p> */}
                                    <InputNumber
                                        inputId={"trueId"}
                                        id={"trueId"}
                                        disabled={true}
                                        // className={"border border-1 border-dark p-1 sec-topic text-black"}
                                        value={stepInfoData?.financials?.vehicle_true_cost || 0}
                                        // onValueChange={(e) => formik.setFieldValue(data?.id, e.value)}
                                        // onChange={(e) => formik.handleChange({ target: { id: data?.id, value: e.value } })}
                                        mode="currency"
                                        currency="USD"
                                        locale="en-US"
                                        minFractionDigits={2}
                                        maxFractionDigits={10}
                                        inputStyle={{ textAlign: "right", fontWeight: "bold" }}
                                        style={{ height: 40, width: 150, textAlign: "right" }}
                                    />
                                </div>

                                <Divider layout="horizontal" />

                                <div className="d-flex align-items-center" style={{ width: '100%', justifyContent: 'space-between' }}>
                                    <p className="text-grey mb-0 fw-small w-50">Vehicle’s Cost</p>
                                    {/* <p className="regular-semibold-text">$58,000.00</p> */}
                                    <InputNumber
                                        inputId={"trueId"}
                                        id={"trueId"}
                                        disabled={true}
                                        // className={"border border-1 border-dark p-1 sec-topic text-black"}
                                        value={stepInfoData?.financials?.total_vehicle_cost || 0}
                                        // onValueChange={(e) => formik.setFieldValue(data?.id, e.value)}
                                        // onChange={(e) => formik.handleChange({ target: { id: data?.id, value: e.value } })}
                                        mode="currency"
                                        currency="USD"
                                        locale="en-US"
                                        minFractionDigits={2}
                                        maxFractionDigits={10}
                                        inputStyle={{ textAlign: "right", fontWeight: "bold" }}
                                        style={{ height: 40, width: 150, textAlign: "right" }}
                                    />
                                </div>

                                {/* <Divider layout="horizontal" /> */}

                                <div className="d-flex align-items-center" style={{ width: '100%', justifyContent: 'space-between' }}>
                                    <p className="text-grey mb-0 fw-small w-50">Sales Tax</p>
                                    {/* <p className="regular-semibold-text">$58,000.00</p> */}
                                    <InputNumber
                                        inputId={"trueId"}
                                        id={"trueId"}
                                        disabled={true}
                                        // className={"border border-1 border-dark p-1 sec-topic text-black"}
                                        value={stepInfoData?.financials?.sales_tax}
                                        // onValueChange={(e) => formik.setFieldValue(data?.id, e.value)}
                                        // onChange={(e) => formik.handleChange({ target: { id: data?.id, value: e.value } })}
                                        mode="currency"
                                        currency="USD"
                                        locale="en-US"
                                        minFractionDigits={2}
                                        maxFractionDigits={10}
                                        inputStyle={{ textAlign: "right", fontWeight: "bold" }}
                                        style={{ height: 40, width: 150, textAlign: "right" }}
                                    />
                                </div>




                                <div className="d-flex align-items-center" style={{ width: '100%', justifyContent: 'space-between' }}>
                                    <p className="text-grey mb-0 fw-small w-50">Medallion Type</p>
                                    {/* <p className="regular-semibold-text">$58,000.00</p> */}
                                    <p className="regular-semibold-text" style={{ padding: 10 }} data-testid={`card`}>{stepInfoData?.lease_case_details?.medallion_type || "-"}</p>

                                </div>
                            </div>
                        </div>
                    </div>


                </div>
                <div className="w-100 position-sticky bottom-0 py-3 bg-white">
                    <Button
                        disabled={!hasAccess || !formik.isValid}
                        label="Submit Financial Info"
                        type="submit"
                        severity="warning"
                        className="border-radius-0 primary-btn "
                    />

                    <Button
                        disabled={
                            !hasAccess ||
                            !(
                                caseData &&
                                caseData.case_info.case_status !== "Closed" &&
                                getCurrentStep(caseData.steps).step_id === currentStepId
                            )
                            || !(stepInfoData?.lease_configuration?.configurations?.length > 0)
                        }
                        label="Move to Next Step"
                        severity="warning"
                        type="button"
                        className="border-radius-0 trinary-btn ms-5"
                        onClick={() => {
                            setMoveClicked(true)
                            processAPI()
                        }
                        }
                    />
                </div>
            </form>

            <Dialog
                visible={isDialogPresetVisible}
                modal
                onHide={() => setDialogPresetVisible(false)}
                content={() => (<div className="d-flex flex-column align-items-center p-5 bg-light confirm-modal">
                    <div className="w-100 d-flex align-items-center justify-content-between mb-2 header">
                        <div className="header-text">
                            Lease Presets
                        </div>
                        <Button
                            text
                            className="close-icon"
                            icon={() => <Img name="modalCancel"></Img>}
                            onClick={() => {
                                setDialogPresetVisible(false)
                            }}
                        ></Button>
                    </div>
                    <DataTable className="custom-data-table" value={leaseSchedule} scrollable
                        scrollHeight="300px">
                        <Column field="lease_type" header="Lease Type" style={{ minWidth: "150px" }} />
                        <Column field="year" header={"Year"} style={{ minWidth: "150px" }} />
                        <Column field="model" header={"Model"} style={{ minWidth: "150px" }} />
                        <Column field="status" header={"Status"} style={{ minWidth: "150px" }} />
                    </DataTable>
                </div>)}
            >
            </Dialog>
        </div>
    )
}

export default FinancialInfo
