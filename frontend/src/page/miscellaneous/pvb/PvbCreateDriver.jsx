import { useFormik } from "formik";
import DataTableComponent from "../../../components/DataTableComponent";
import Img from "../../../components/Img";
import BInputText from "../../../components/BInputText";
import { Button } from "primereact/button";
import { useEffect, useState } from "react";
import { pvbCreateDriver as variable } from "../../../utils/variables";
import { InputSwitch } from "primereact/inputswitch";
import { medallionApi, useLazyGetCaseDetailQuery, useMoveCaseDetailMutation, useProcessCaseDeatilMutation } from "../../../redux/api/medallionApi";
import { DISABLEDAYNIGHTSHIFT } from "../../../utils/constants";
import { getCurrentStep } from "../../../utils/caseUtils";
import { useDispatch } from "react-redux";

const PvbCreateDriver = ({ caseId, currentStepId,caseData,reload, previousSelectedDriver, leaseType, hasAccess }) => {
    const dispatch=useDispatch();
    const [selectedDrivers, setSelectedDrivers] = useState([]);
    const [triggerSearchQuery, { data }] = useLazyGetCaseDetailQuery({ skip: true })
    const [processFlow, { isSuccess: isProccessDataSuccess }] = useProcessCaseDeatilMutation();
      const [moveCase, { isSuccess: isMoveDataSuccess }] = useMoveCaseDetailMutation();
    const triggerSearch = () => {
        const queryParams = new URLSearchParams();

        if (formik?.values?.[variable.field_01.id]) {
            queryParams.append([variable.field_01.id], formik.values[variable.field_01.id]);
        }
        if (formik?.values?.[variable.field_02.id]) {
            queryParams.append([variable.field_02.id], formik.values[variable.field_02.id]);
        }
        if (formik?.values?.[variable.field_03.id]) {
            queryParams.append([variable.field_03.id], formik.values[variable.field_03.id]);
        }

        // if (formik?.values?.[variable.field_02.id]) {
        //     queryParams.append('tlc_no', formik.values.tlc_no);
        // }

        // if (formik?.values?.[variable.field_03.id]) {
        //     queryParams.append('plate_no', formik.values.plate_no);
        // }

        if (queryParams.toString()) {
            triggerSearchQuery(`${caseId}/${currentStepId}?${queryParams.toString()}`)
        }

    };
    useEffect(() => {
        if (isProccessDataSuccess) {
            // refetch();
            dispatch(medallionApi.util.invalidateTags(['caseStep']))
        }
        if (isProccessDataSuccess && caseData && caseData.case_info.case_status !== "Closed"
            && getCurrentStep(caseData.steps).step_id === currentStepId) {
            moveCase({ params: caseId })
        }
    }, [isProccessDataSuccess]);
        useEffect(() => {
            if (isMoveDataSuccess) {
                reload();
            }
        }, [isMoveDataSuccess]);
    const formik = useFormik({
        initialValues: {
            [variable.field_01.id]: "",
            [variable.field_02.id]: "",
            [variable.field_03.id]: "",
        },
        onSubmit: () => {
            console.log("form submitted");

            triggerSearch();
        },
        onReset: () => {
            // setPage(1); // Reset page to 1
            // setRows(10); // Reset rows to 10 or your default value
        },
    });
    const formReset = () => {
        formik.resetForm();
        triggerSearchQuery(`${caseId}/${currentStepId}`)
        setSelectedDrivers && setSelectedDrivers([]);
    };
    const columns = [
        {
            field: "medallion_number",
            header: "Medallion No",
            sortable: false,
            headerAlign: "left",
            bodyAlign: "left",
        },
        // { field: "medallion_owner", header: "Medallion Owner", headerAlign: "left" },
        // { field: "driver_id", header: "Driver ID", sortable: false },
        { field: "driver_name", header: "Driver Name" },
        { field: "tlc_license_number", header: "TLC License No" },
        { field: "plate_number", header: "Vehicle Plate No" },
    ];
    const [checked, setChecked] = useState(false);
    const customRender = (column, rowData) => {
        if (column.field === "shift") {
            return (
                <div className="d-flex align-items-center gap-1">D<InputSwitch disabled={DISABLEDAYNIGHTSHIFT.includes(leaseType)} checked={checked} onChange={(e) => setChecked(e.value)} />N</div>
            );
        }

        return rowData[column.field];
    };
    // const data = data;
    const submitBtnDisabled = () => {
        console.log(previousSelectedDriver);

        if (formik.values?.[variable.field_01.id] === previousSelectedDriver?.tlc_license_number) {
            console.log("tlc_license_number");

            return true
        }
        console.log("dmv_license_number", formik.values?.[variable.field_02.id], previousSelectedDriver?.dmv_license_number);
        if (formik.values?.[variable.field_02.id] === previousSelectedDriver?.dmv_license_number) {

            return true
        }
        if (formik.values?.[variable.field_03.id] === previousSelectedDriver?.ssn) {
            console.log("ssn", formik.values?.[variable.field_03.id], previousSelectedDriver?.ssn);

            return true
        }
        return !formik.values?.[variable.field_01.id] && !formik.values?.[variable.field_02.id] && !formik.values?.[variable.field_03.id]
    };
    useEffect(() => {
        if (setSelectedDrivers) {
            setSelectedDrivers(data);
        }
    }, [checked]);

    return (
        <div className="d-flex flex-column">
            <form
            data-testid="create-pvb-form"
                className="common-form d-flex flex-column gap-5"
                onSubmit={formik.handleSubmit}
            >
                <div className="form-section">
                    <div
                        className="d-flex align-items-center justify-content-between form-sec-header"
                    >
                        <div className="topic">
                            <Img name="search"></Img> Driver
                        </div>
                    </div>
                    <div className="form-body d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center flex-wrap form-grid-1 w-75">
                            <div className="w-100-3 ">
                                <BInputText variable={variable.field_01} formik={formik}></BInputText>
                            </div>
                            <div className="w-100-3">
                                <BInputText variable={variable.field_02} formik={formik}></BInputText>
                            </div>
                            <div className="w-100-3">
                                <BInputText variable={variable.field_03} formik={formik}></BInputText>
                            </div>
                        </div>
                        <Button
                            label="Search"
                            data-testid="search-btn"
                            disabled={!hasAccess || submitBtnDisabled()}
                            type="submit"
                            severity="warning"
                            className="border-radius-0 primary-btn"
                        />
                        <Button
                            text
                            type="button"
                            data-testid="reset-btn"
                            icon={() => {
                                return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12.0094 0C18.6375 0 24.0188 5.4 24.0094 12.0281C23.9906 18.6375 18.6 24 12 24C5.37189 24 -0.00936277 18.6 1.2231e-05 11.9719C0.00938723 5.37187 5.40001 0 12.0094 0ZM11.9813 22.7812C17.9344 22.7906 22.7813 17.9531 22.7813 12.0094C22.7813 6.075 17.9625 1.2375 12.0469 1.21875C6.08439 1.2 1.22814 6.02812 1.21876 11.9719C1.20939 17.925 6.03751 22.7719 11.9813 22.7812Z" fill="black" />
                                    <path d="M12.0001 11.0999C13.1064 9.99365 14.1751 8.91553 15.2439 7.84678C15.347 7.74365 15.4408 7.64053 15.5439 7.55615C15.8158 7.3499 16.1064 7.34053 16.3501 7.58428C16.5939 7.82803 16.5751 8.11865 16.3783 8.39053C16.2845 8.5124 16.1626 8.61553 16.0595 8.72803C15.0001 9.7874 13.9408 10.8468 12.8251 11.953C13.1626 12.2812 13.4908 12.5905 13.8001 12.8999C14.6064 13.6968 15.422 14.503 16.2283 15.3093C16.5564 15.6374 16.6033 16.003 16.3689 16.2562C16.1251 16.5187 15.722 16.4812 15.3845 16.153C14.2689 15.0374 13.1626 13.9218 12.0095 12.7687C11.8689 12.8999 11.7376 13.0124 11.6251 13.1249C10.6408 14.1093 9.65638 15.0937 8.68138 16.0687C8.28763 16.4624 7.89388 16.5374 7.63138 16.2562C7.36888 15.9843 7.44388 15.6093 7.85638 15.2062C7.96888 15.0937 8.08138 14.9905 8.1845 14.878C9.15013 13.8937 10.1064 12.9187 11.147 11.8593C10.8751 11.6062 10.5658 11.3343 10.2658 11.0437C9.44075 10.228 8.62513 9.4124 7.8095 8.59678C7.4345 8.22178 7.36888 7.84678 7.63138 7.5749C7.90325 7.29365 8.2595 7.3499 8.64388 7.73428C9.75013 8.8499 10.8564 9.95615 12.0001 11.0999Z" fill="black" />
                                </svg>
                            }}
                            onClick={() => { formik.resetForm(); formReset() }}
                        />
                    </div>
                </div>
            </form>
            <DataTableComponent
                columns={columns}
                data={data?.driver_id || data?.Medallion_number ? [{
                    ...data
                }] : []}
                selectionMode="checkbox"
                selectedData={selectedDrivers}
                onSelectionChange={(e) => setSelectedDrivers(e.value)}
                renderColumn={customRender}
                paginator={false}
                dataKey="driver_id"
                emptyMessage={() => <div className="d-flex justify-content-center flex-column mx-auto" style={{ width: "max-content" }}>
                    <p className=" d-flex align-items-center justify-content-center p-4 mb-4 gap-2"><Img name="no-result"></Img>No Results Found</p>
                </div>}
            />
            <div className="w-100 position-sticky bottom-0 py-3 bg-white">
                <Button
                    label="Submit Search Details"
                    disabled={!hasAccess || selectedDrivers?.length === 0}
                    onClick={() => {
                        processFlow({
                            params: caseId, data: {
                                step_id: currentStepId,
                                data: { ...selectedDrivers[0] }
                            }
                        })
                    }}
                    type="submit"
                    data-testid="submit-btn"
                    severity="warning"
                    className="border-radius-0 primary-btn w-max-content"
                />
            </div>
        </div>
    );
}

export default PvbCreateDriver