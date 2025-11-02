import { Button } from "primereact/button"
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column'
import { InputNumber } from "primereact/inputnumber";
import { useCallback, useEffect, useState } from "react";
import BDayInput from "../../../components/BDayInput";
import { useFormik } from "formik";
import { leaseFinancialDetails as variable } from "../../../utils/variables";
import { useGetStepInfoQuery, useMoveCaseDetailMutation, useProcessCaseDeatilMutation } from "../../../redux/api/medallionApi";
import { getCurrentStep } from "../../../utils/caseUtils";
import BSuccessMessage from "../../../components/BSuccessMessage";
import { useNavigate } from "react-router-dom";

const UpdateFinancialInfo = ({ caseId, caseData, currentStepId, hasAccess }) => {
    const [processFlow, { isSuccess: isProccessDataSuccess }] = useProcessCaseDeatilMutation();
    const [moveCase, { isSuccess: isMoveDataSuccess }] = useMoveCaseDetailMutation();
    const [isOpen, setOpen] = useState(false);
    const { data: stepInfoData, refetch, isSuccess } = useGetStepInfoQuery({ caseNo: caseId, step_no: currentStepId }, { skip: !currentStepId || !caseId });
    const [shortTerm, setShortTerm] = useState(variable[stepInfoData?.lease_case_details?.lease_type])
    const navigate = useNavigate();

    const formik = useFormik({
        initialValues: {
            [variable?.dov[0].id]: "",
            [variable?.dov[1].id]: "",
            [variable?.dov[2].id]: "",
            [variable?.dov[3].id]: "",
            [variable?.dov[4].id]: "",
            [variable?.dov[5].id]: "",
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
        // validateOnChange: true,
        // validate: () => {
        //     const errors = {};
        //     return errors;
        // },
        onSubmit: (values) => {
            console.log(values);
            const data = {
                dov: {
                    "management_recommendation": values[variable?.dov[0].id],
                    "med_lease": values[variable?.dov[1].id],
                    "med_tlc_maximum_amount": values[variable?.dov[2].id],
                    "veh_lease": values[variable?.dov[3].id],
                    "veh_tlc_maximum_amount": values[variable?.dov[4].id],
                    "lease_amount": values[variable?.dov[5].id]
                },
                ["long-term"]: {
                    "management_recommendation": values[variable?.["long-term"][0].id],
                    [variable?.["long-term"][1].id]: values[variable?.["long-term"][1].id],
                    [variable?.["long-term"][2].id]: values[variable?.["long-term"][2].id],
                    [variable?.["long-term"][3].id]: values[variable?.["long-term"][3].id],
                    [variable?.["long-term"][4].id]: values[variable?.["long-term"][4].id],
                    "lease_amount": values[variable?.["long-term"][5].id]
                },
                ["medallion-only"]: {
                    [variable?.["medallion-only"][0].id]: values[variable?.["medallion-only"][0].id],
                    [variable?.["medallion-only"][1].id]: values[variable?.["medallion-only"][1].id],
                },
                ["short-term"]: {
                    // "1_week_or_longer": {
                    //   "day_shift":{
                    //     "type":"number"
                    //   },
                    //   "night_shift":{
                    //     "type":"number"
                    //   }
                    // },
                    // "1_week_or_longer_tlc_maximum_amount": {
                    //   "day_shift":{
                    //     "type":"number"
                    //   },
                    //   "night_shift":{
                    //     "type":"number"
                    //   }
                    // },

                    ["1_week_or_longer"]: {
                        "day_shift": values["longer_day_shift"],
                        "night_shift": values["longer_night_shift"]
                    },
                    day_of_week: values?.["day_of_week"] ? values?.["day_of_week"]?.map(item => item.code) : "",
                }
            }

            processFlow({
                params: caseId, data: {
                    step_id: currentStepId,
                    data: {
                        "leaseType": stepInfoData?.lease_case_details?.lease_type,
                        "financialInformation": data[stepInfoData?.lease_case_details?.lease_type]
                    }
                }
            })
        },
    });

    useEffect(() => {
        if (isProccessDataSuccess) {
            refetch()
        }
        if (isProccessDataSuccess && caseData && caseData.case_info.case_status !== "Closed"
            && getCurrentStep(caseData.steps).step_id === currentStepId) {
            moveCase({ params: caseId })
        }
    }, [isProccessDataSuccess]);

    useEffect(() => {
        const value = formik.values[variable?.dov[1].id] + formik.values[variable?.dov[3].id];
        formik.setFieldValue(variable?.dov[5].id, value, true);
    }, [formik.values[variable?.dov[0].id], formik.values[variable?.dov[1].id], formik.values[variable?.dov[3].id]]);

    useEffect(() => {
        const value = formik.values[variable?.["long-term"][1].id] + formik.values[variable?.["long-term"][3].id];
        formik.setFieldValue(variable?.["long-term"][5].id, value, true);
    }, [formik.values[variable?.["long-term"][0].id], formik.values[variable?.["long-term"][1].id], formik.values[variable?.["long-term"][3].id]]);

    useEffect(() => {
        if (formik.values["day_of_week"]) {
            const dayData = [...formik.values["day_of_week"]]?.map(item => {
                const tlcDayId = `${item.code}_day_shift_tlc_maximum_amount`;
                const tlcNightId = `${item.code}_night_shift_tlc_maximum_amount`;
                formik.setFieldValue(tlcDayId, 150, true);
                formik.setFieldValue(tlcNightId, 150, true);
                return ([{
                    category: item.code,
                    amount: {
                        editable: true,
                        field: [
                            {
                                id: `${item.code}_longer_day_shift`,
                                max: 105
                            },
                            {
                                id: `${item.code}_longer_night_shift`,
                                max: 105
                            },
                        ]
                    },
                },
                {
                    category: 'TLC Maximum Amount',
                    amount: {
                        editable: false,
                        field: [
                            {
                                id: `${item.code}_day_shift_tlc_maximum_amount`,
                                value: 105
                            },
                            {
                                id: `${item.code}_night_shift_tlc_maximum_amount`,
                                value: 105
                            },
                        ]
                    },
                }])
            }).flat();

            setShortTerm(() => {
                return ([...variable[stepInfoData?.lease_case_details?.lease_type], ...dayData])
            })
        }
    }, [formik.values["day_of_week"]]);


    useEffect(() => {

        formik.setFieldValue(variable?.dov[2].id, variable?.dov[2].value, true);
        formik.setFieldValue(variable?.dov[4].id, variable?.dov[4].value, true);
        formik.setFieldValue(variable?.["long-term"][2].id, variable?.["long-term"][2].value, true);
        formik.setFieldValue(variable?.["long-term"][4].id, variable?.["long-term"][4].value, true);
        formik.setFieldValue(variable?.["medallion-only"][1].id, variable?.["medallion-only"][1].value, true);
        formik.setFieldValue("longer_day_shift_tlc_maximum_amount", variable?.["short-term"][1]?.amount?.field[0].value, true);
        formik.setFieldValue("longer_night_shift_tlc_maximum_amount", variable?.["short-term"][1]?.amount?.field[1].value, true);
        // longer_day_shift: "",
        //     longer_night_shift: "",
        //     longer_day_shift_tlc_maximum_amount: "",
        //     longer_night_shift_tlc_maximum_amount: "",
    }, []);

    const amountTemplate = useCallback((data) => {
        console.log("🚀 ~ amountTemplate ~ data:", stepInfoData)
        if (variable?.dov[0].id === data?.id) {
            return `${stepInfoData?.financials?.management_recommendation}`
        }
        if (variable?.dov[1].id === data?.id) {
            return `${stepInfoData?.financials?.med_lease}`
        }
        if (variable?.dov[2].id === data?.id) {
            return `${stepInfoData?.financials?.tlc_medallion_cap}`
        }
        if (variable?.dov[3].id === data?.id) {
            return `${stepInfoData?.financials?.veh_lease}`
        }
        if (variable?.dov[4].id === data?.id) {
            return `${stepInfoData?.financials?.tlc_max_vehicle_cap}`
        }
        if (variable?.dov[5].id === data?.id) {
            return `${stepInfoData?.financials?.lease_amount}`
        }
        if (variable?.["long-term"][0].id === data?.id) {
            return `${stepInfoData?.financials?.lease_amount}`
        }
        if (variable?.["long-term"][1].id === data?.id) {
            return `${stepInfoData?.financials?.day_shift_amount}`
        }
        if (variable?.["long-term"][2].id === data?.id) {
            return `${stepInfoData?.financials?.tlc_medallion_cap}`
        }
        if (variable?.["long-term"][3].id === data?.id) {
            return `${stepInfoData?.financials?.night_shift_amount}`
        }
        if (variable?.["long-term"][4].id === data?.id) {
            return `${stepInfoData?.financials?.tlc_max_vehicle_cap}`
        }
        if (variable?.["long-term"][5].id === data?.id) {
            return `${stepInfoData?.financials?.lease_amount}`
        }
        if (variable?.["medallion-only"][0].id === data?.id) {
            return `${stepInfoData?.financials?.lease_amount}`
        }
        if (variable?.["medallion-only"][1].id === data?.id) {
            return `${stepInfoData?.financials?.lease_amount}`
        }

        if (variable?.["short-term"][0].id === data?.id) {
            return `${stepInfoData?.financials?.day_shift_amount}`
        }
        if (variable?.["short-term"][1].id === data?.id) {
            return `${stepInfoData?.financials?.night_shift_amount}`
        }

    }, [stepInfoData])

    const shortTermTemplate = (data) => {
        if (data.key == "dayOfWeek") {
            return (
                <div className="d-flex justify-content-around">
                    {
                        data.option.map((item, idx) => {
                            return <p key={idx}>{item}</p>
                        })
                    }
                </div>
            )
        }
        // if (!data?.amount.editable) {
        //     return value
        // }
        return (
            <div className="d-flex  gap-5">
                {
                    data?.amount?.field?.map((item, idx) => {
                        {/* return<InputNumber key={idx} inputId="currency-us" value={formik.values[item.id]} onValueChange={(e) => setValue(e.value)} mode="currency" className="border border-1 border-dark" currency="USD" locale="en-US" /> */ }
                        const isDisable = !data?.amount.editable;
                        return <InputNumber
                            key={idx}
                            inputId={item.id}
                            id={item.id}
                            className={isDisable ? "input-disabled-border-0" : "border border-1 border-dark"}
                            disabled={isDisable}
                            max={item?.max}
                            value={formik.values[item.id]}
                            onBlur={formik.handleBlur}
                            onValueChange={(e) => formik.setFieldValue(item.id, e.value)}
                            onChange={(e) => formik.handleChange({ target: { id: item.id, value: e.value } })}
                            mode="currency"
                            currency="USD"
                            locale="en-US"
                        />
                    })
                }
                {/* <InputNumber inputId="currency-us" value={value} onValueChange={(e) => setValue(e.value)} mode="currency" className="border border-1 border-dark" currency="USD" locale="en-US" /> */}
            </div>
        )
    }

    const shortCategoryBody = (data) => {
        if (data.key == "dayOfWeek") {

            return (
                <div className="d-flex flex-column">
                    <p>{data.category}</p>
                    <BDayInput variable={{ id: data.id, multiple: data?.multiple }} formik={formik} />
                </div>
            )
        }
        return (
            <div className="d-flex  gap-5">
                <p>{data.category}</p>
            </div>
        )
    }

    useEffect(() => {
        if (isSuccess) {
            setShortTerm(variable[stepInfoData?.lease_case_details?.lease_type])
            const stepData = stepInfoData?.lease_configuration?.configurations?.reduce((acc, item) => {
                return {
                    ...acc,
                    [item.lease_breakup_type]: item.lease_limit
                }
            }, {});
            if (stepInfoData?.lease_case_details?.lease_type === "dov") {
                setTimeout(() => {
                    formik.setFieldValue(variable?.dov[0].id, stepData[variable?.dov[0].id], true);
                    formik.setFieldValue(variable?.dov[1].id, stepData[variable?.dov[1].id], true);
                    formik.setFieldValue(variable?.dov[2].id, stepData[variable?.dov[2].id] || variable?.dov[2].value, true);
                    formik.setFieldValue(variable?.dov[3].id, stepData[variable?.dov[3].id], true);
                    formik.setFieldValue(variable?.dov[4].id, stepData[variable?.dov[4].id] || variable?.dov[4].value, true);
                    formik.setFieldValue(variable?.dov[5].id, stepData[variable?.dov[5].id], true);
                }
                    , 0)
            }
            if (stepInfoData?.lease_case_details?.lease_type === "long-term") {
                setTimeout(() => {
                    formik.setFieldValue(variable?.["long-term"][0].id, stepData["management_recommendation"], false);
                    formik.setFieldValue(variable?.["long-term"][1].id, stepData[variable?.["long-term"][1].id], false);
                    formik.setFieldValue(variable?.["long-term"][2].id, stepData[variable?.["long-term"][2].id] || variable?.dov[2].value, false);
                    formik.setFieldValue(variable?.["long-term"][3].id, stepData[variable?.["long-term"][3].id], false);
                    formik.setFieldValue(variable?.["long-term"][4].id, stepData[variable?.["long-term"][4].id] || variable?.dov[4].value, false);
                    formik.setFieldValue(variable?.["long-term"][5].id, stepData["lease_amount"], false);
                }
                    , 0)
            }
            if (stepInfoData?.lease_case_details?.lease_type === "medallion-only") {
                setTimeout(() => {
                    formik.setFieldValue(variable?.["medallion-only"][0].id, stepData[variable?.["medallion-only"][0].id], true);
                    formik.setFieldValue(variable?.["medallion-only"][1].id, stepData[variable?.["medallion-only"][1].id] || variable?.dov[1].value, true);
                }
                    , 0)
            }
        }
    }, [isSuccess]);

    useEffect(() => {
        if (isMoveDataSuccess) {
            setOpen(true);
        }
    }, [isMoveDataSuccess])
    return (
        <div className='w-100 h-100'>
            <form
                className="common-form d-flex flex-column gap-5"
                onSubmit={formik.handleSubmit}
            >
                <div className="form-section">
                    <div className="form-body">
                        <div className="d-flex align-items-center flex-wrap form-grid-1 ">
                            {
                                stepInfoData?.lease_case_details?.lease_type != "medallion-only" ?
                                    <>
                                        <div className="w-100-3 d-flex align-items-center gap-2">
                                            <p className="text-grey mb-0 regular-text">TLC Maximum Vehicle Cap</p>
                                            <p className="regular-semibold-text">$42,900.00</p>
                                        </div>
                                        <div className="w-100-3 d-flex align-items-center gap-2">
                                            <p className="text-grey mb-0 regular-text">True cost</p>
                                            <p className="regular-semibold-text">$58,000.00</p>
                                        </div>
                                        <div className="w-100-3 d-flex align-items-center gap-2">
                                            <p className="text-grey mb-0 regular-text">Total Weeks</p>
                                            <p className="regular-semibold-text">{stepInfoData?.lease_configuration?.total_weeks}</p>
                                        </div>
                                    </>
                                    :
                                    <div className="w-100-3 d-flex align-items-center gap-2">
                                        <p className="text-grey mb-0 regular-text">Total Weeks</p>
                                        <p className="regular-semibold-text">{stepInfoData?.lease_configuration?.total_weeks}</p>
                                    </div>
                            }
                        </div>
                        {stepInfoData?.lease_case_details?.lease_type !== "short-term" ?
                            <DataTable value={variable[stepInfoData?.lease_case_details?.lease_type]}
                                className="bg-transparent category-table w-75 mt-2"
                                pt={{
                                    bodyRow: "bg-transparent",
                                    thead: "bg-transparent",
                                    headerRow: "bg-transparent",
                                }}>
                                <Column field="category" header="Category"></Column>
                                <Column field="amount" header="Amount" body={amountTemplate}></Column>
                            </DataTable>
                            :
                            <DataTable value={shortTerm}
                                className="bg-transparent category-table w-75 mt-2"
                                pt={{
                                    bodyRow: "bg-transparent",
                                    thead: "bg-transparent",
                                    headerRow: "bg-transparent",
                                }}>
                                <Column field="category" header="Category" body={shortCategoryBody}></Column>
                                <Column field="amount" header="Amount" body={shortTermTemplate}></Column>
                            </DataTable>
                        }
                    </div>
                </div>
                <div className="w-100 position-sticky bottom-0 py-3 bg-white">
                    <Button
                        disabled={!hasAccess}
                        label="Submit Vehicle Details"
                        type="submit"
                        severity="warning"
                        className="border-radius-0 primary-btn "
                    />
                </div>
            </form>
            <BSuccessMessage
                isOpen={isOpen}
                message={`Update Driver Lease is successful for Lease ID: ${stepInfoData?.lease_configuration?.lease_id}`}
                title="Update Driver Lease Successful"
                onCancel={() => {
                    setOpen(false); navigate('/manage-driver', { replace: true });
                }}
                onConfirm={() => {
                    setOpen(false); navigate('/manage-driver', { replace: true });
                }}
            />
        </div>
    )
}

export default UpdateFinancialInfo