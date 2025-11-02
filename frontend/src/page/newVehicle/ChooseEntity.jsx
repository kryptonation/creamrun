import Img from "../../components/Img";
import { useFormik } from "formik";
import { chooseEntity as variable } from "../../utils/variables";
import { Button } from "primereact/button";
import { useEffect, useState } from "react";
import { useMoveCaseDetailMutation, useProcessCaseDeatilMutation } from "../../redux/api/medallionApi";
import BInputText from "../../components/BInputText";
import DataTableComponent from "../../components/DataTableComponent";
import { useLazyGetEntityQuery } from "../../redux/api/vehicleApi";
import { ENTITY_VEHICLE_LIMIT } from "../../utils/constants";

const ChooseEntity = ({ caseId, currentStepId, hasAccess }) => {
    const [processFlow, { isSuccess: isProccessDataSuccess }] = useProcessCaseDeatilMutation();
    const [moveCase] = useMoveCaseDetailMutation();
    const [selectedDrivers, setSelectedDrivers] = useState(null);
    const [rows, setRows] = useState(5);
    const [page, setPage] = useState(1);

    useEffect(() => {
        if (isProccessDataSuccess) {
            // moveCase({ params: params["case-id"] })
            moveCase({ params: caseId })
        }
    }, [isProccessDataSuccess]);

    const [triggerSearchQuery, { data }] = useLazyGetEntityQuery({ skip: true })

    useEffect(() => { triggerSearch({ page, limit: rows }) }, [])

    const formik = useFormik({
        initialValues: {
            [variable.field_01.id]: "",
            [variable.field_02.id]: "",
        },
        onSubmit: () => {
            triggerSearch({ page: Number(page), limit: rows });
        },
        onReset: () => {
            // setPage(1); // Reset page to 1
            // setRows(10); // Reset rows to 10 or your default value
        },
    });

    const triggerSearch = ({ page, limit }) => {
        const queryParams = new URLSearchParams({
            page,
            limit,
            entity_name: formik.values[variable.field_01.id],
            ein: formik.values[variable.field_02.id],
        });
        triggerSearchQuery(`?${queryParams.toString()}`)
    };

    const onPageChange = (event) => {
        // setFirst(Number(event.first) + 1);
        setPage(Number(event.page) + 1)
        setRows(event.rows);
        triggerSearch({ page: Number(event.page) + 1, limit: event.rows })
    };

    const formReset = () => {
        formik.resetForm();
        const queryParams = new URLSearchParams({
            page: 1,
            limit: 5,
            medallion_owner_name: "",
            ssn_or_ein: "",
        });
        triggerSearchQuery(`?${queryParams.toString()}`)
    }

    const refreshData = () => {
        triggerSearch({ page: page, limit: rows });
    }

    const columns = [
        {
            field: "entity_name",
            header: "Entity Name",
            sortable: false,
            headerAlign: "left",
            bodyAlign: "left",
        },
        { field: "ein", header: "EIN", headerAlign: "left" },
        { field: "contact", header: "Contact", sortable: false },
        { field: "m_status", header: "Status" },
        // { field: "options", header: "" },
    ];

    const newRegister = (rowData) => {
        processFlow({
            params: caseId
            , data: { step_id: currentStepId, data: { entityId: rowData?.entity_id?.toString() } }
        })
    }

    const customRender = (column, rowData) => {
        if (column.field === "entity_name") {
            return (
                <p>{rowData?.entity_name}</p>
            );
        }

        else if (column.field === "ein") {
            return (
                <p>{rowData?.ein}</p>
            );
        }

        else if (column.field === "contact") {
            return (
                <div className="d-flex align-items-center flex-column">
                    <p>{rowData.contact_number}</p>
                    <p>{rowData.contact_email}</p>
                </div>
            );
        }
        else if (column.field === "m_status") {
            return (
                <div className="d-flex align-items-center gap-2 justify-content-center">
                    <p className="regular-semibold-text">{rowData?.vehicles?.length}</p>
                    {rowData?.vehicles?.length >= ENTITY_VEHICLE_LIMIT ?
                        <Button
                            data-testid="car_success" icon={() => (<Img name="car_success"></Img>)} className="p-0"></Button> :
                        <Button
                            data-testid="ic_car_add"
                            disabled={!hasAccess}
                            icon={() => (<Img name="ic_car_add"></Img>)}
                            onClick={() => newRegister(rowData)}
                            className="p-0"></Button>
                    }
                </div>
            );
        }

        return rowData[column.field];
    };

    const header = (
        <div className="d-flex flex-wrap align-items-center justify-content-end table-header-icon-con">
            {/* <Button
                disabled={!hasAccess}
                text
                className="delete-btn"
                icon={() => {
                    return <Img name="delete"></Img>;
                }}
            />
            <Divider layout="vertical" /> */}
            <Button
                text
                disabled={!hasAccess}
                className="refresh-btn"
                icon={() => {
                    return <Img name="refresh"></Img>;
                }}
                onClick={refreshData}
            />
        </div>
    )

    return (
        <>
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
                            <Img name="search"></Img> Entity Search
                        </div>
                    </div>
                    <div className="form-body d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center flex-wrap form-grid-1 w-75">
                            <div className="w-100-2 ">
                                <BInputText variable={variable.field_01} formik={formik}></BInputText>
                            </div>
                            <div className="w-100-2">
                                <BInputText variable={variable.field_02} formik={formik}></BInputText>
                            </div>
                        </div>
                        <Button
                            disabled={!hasAccess}
                            label="Search"
                            type="submit"
                            severity="warning"
                            className="border-radius-0 primary-btn"
                        />
                        <Button
                            text
                            type="button"
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
                data={data?.items}
                selectionMode=""
                selectedData={selectedDrivers}
                onSelectionChange={(e) => setSelectedDrivers(e.value)}
                renderColumn={customRender}
                dataKey="entity_id"
                header={header}
                totalRecords={data?.total_items}
                onPageChange={onPageChange}
                emptyMessage={<div className="d-flex justify-content-center flex-column mx-auto" style={{ width: "max-content" }}>
                    <p className=" d-flex align-items-center justify-content-center p-4 mb-4 gap-2"><Img name="no-result"></Img>No Results Found</p>
                </div>}
            />
        </>
    )
}

export default ChooseEntity