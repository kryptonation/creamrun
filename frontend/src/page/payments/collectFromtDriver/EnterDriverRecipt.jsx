import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import React, { useState } from 'react'
import { enterReciptDetail as variable } from "../../../utils/variables";
import { useGetStepInfoQuery } from '../../../redux/api/medallionApi';
import BDayInput from '../../../components/BDayInput';
import { InputNumber } from 'primereact/inputnumber';
import { useFormik } from 'formik';

const EnterDriverRecipt = ({ caseId, currentStepId, caseData, currentStepData, hasAccess }) => {
    const { data: stepInfoData, refetch, isSuccess } = useGetStepInfoQuery({ caseNo: caseId, step_no: currentStepId }, { skip: !currentStepId || !caseId });
    const [shortTerm, setShortTerm] = useState(variable)
    const formik = useFormik({
        initialValues: {
        },
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

            // processFlow({
            //     params: caseId, data: {
            //         step_id: currentStepId,
            //         data: {
            //             "leaseType": stepInfoData?.lease_case_details?.lease_type,
            //             "financialInformation": data[stepInfoData?.lease_case_details?.lease_type]
            //         }
            //     }
            // })
        },
    });

    const shortTermTemplate = (item) => {
        return (
            <div className="d-flex  gap-5">
                <InputNumber
                    inputId={item.category}
                    id={item.category}
                    // className={isDisable ? "input-disabled-border-0" : "border border-1 border-dark"}
                    className={"border border-1 border-dark"}
                    // disabled={isDisable}
                    // max={item?.max}
                    // value={formik.values[item.id]}
                    onBlur={formik.handleBlur}
                    onValueChange={(e) => formik.setFieldValue(item.category, e.value)}
                    onChange={(e) => formik.handleChange({ target: { id: item.id, value: e.value } })}
                    mode="currency"
                    currency="USD"
                    locale="en-US"
                />
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


    return (<DataTable value={shortTerm}
        className="bg-transparent category-table w-75 mt-2"
        pt={{
            bodyRow: "bg-transparent",
            thead: "bg-transparent",
            headerRow: "bg-transparent",
        }}>
        <Column field="category" header="Category" ></Column>
        <Column field="due" header="Due" ></Column>
        <Column field="cash" header="Cash/Check" body={shortTermTemplate}></Column>
        <Column field="dtr" header="DTR" body={shortTermTemplate}></Column>
        <Column field="balance" header="Balance"></Column>
        <Column field="remarks" header="Remarks" body={shortTermTemplate}></Column>
    </DataTable>

    )
    // return null
}

export default EnterDriverRecipt