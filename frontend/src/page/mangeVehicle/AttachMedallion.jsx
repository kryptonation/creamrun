import { Button } from "primereact/button";
import Img from "../../components/Img";
import { useFormik } from "formik";
import { medallionSearch } from "../../utils/variables";
import BInputFields from "../../components/BInputFileds";
import { useEffect, useState } from "react";
import BConfirmModal from "../../components/BConfirmModal";
import BExpandableTable from "../../components/BExpandableTable";
import {
    useLazyGetMedallionsQuery,
    useMoveCaseDetailMutation,
    useProcessCaseDeatilMutation,
} from "../../redux/api/medallionApi";
import BCard from "../../components/BCard";
import BSuccessMessage from "../../components/BSuccessMessage";
import { useNavigate } from "react-router-dom";
import DataTableComponent from "../../components/DataTableComponent";
import { dateMonthYear, yearMonthDate } from "../../utils/dateConverter";

const AttachMedallion = ({
    caseId,
    currentStepId,
    reload,
    currentStep,
    hasAccess,
}) => {
    const navigate = useNavigate();
    const [selectedMedallion, setSelectedMedallion] = useState(null);
    const [medallion, setMedallion] = useState([]);
    const [isOpen, setOpen] = useState(false);
    const [isSuccessOpen, setSuccessOpen] = useState(false);

    const [triggerGetMedallion, { data: medallionData }] = useLazyGetMedallionsQuery();

    const [processFlow, { isSuccess: isProcessDataSuccess }] =
        useProcessCaseDeatilMutation();
    const [moveCase, { isSuccess: isMoveDataSuccess }] =
        useMoveCaseDetailMutation();
    const [rows, setRows] = useState(5);
    console.log("currentstep", currentStep);
    const [vehicleTypeOptions, setVehicleTypeOptions] = useState([]);

    const [visibleColumns, setVisibleColumns] = useState({
        medallion_number: true,
        medallion_status: true,
        medallion_type: true,
        end_date: true,
        lease_expiry: true
    });

    const columns = [
        {
            field: "medallion_number",
            header: "Medallion Number",
            dataTestId: "medallionNumberHeader",
            sortable: false,
            headerAlign: "left",
            bodyAlign: "left",
            filter: false,
        },
        {
            field: "medallion_status",
            header: "Status",
            dataTestId: "statusHeader",
            headerAlign: "left",
            sortable: false,
            filter: false,
        },
        {
            field: "medallion_type",
            header: "Medallion Type",
            dataTestId: "medallionTypeHeader",
            sortable: false,
            filter: false,
        },
        {
            field: "end_date",
            header: "End Date",
            dataTestId: "createOnHeader",
            sortable: false,
            filter: false,
        },
        {
            field: "lease_expiry",
            header: "Lease Expiry",
            dataTestId: "renewalDateHeader",
            sortable: false,
            filter: false,
        },
    ];

    const filteredColumns = Object.values(visibleColumns).every(
        (isVisible) => !isVisible
    )
        ? columns
        : columns.filter((col) => visibleColumns[col.field]);

    // useEffect(() => {
    //     if (currentStep) {
    //         if (currentStep?.medallion_info?.medallion_type === "Wav") {
    //             setVehicleTypeOptions([
    //                 { name: "WAV", code: "Wav" },
    //                 { name: "WAV - Hybrid", code: "Wav-Hybrid" },
    //             ]);
    //         } else if (currentStep?.medallion_info?.medallion_type === "Regular") {
    //             setVehicleTypeOptions([
    //                 { name: "Regular", code: "Regular" },
    //                 { name: "Regular - Hybrid", code: "Regular-Hybrid" },
    //             ]);
    //         }
    //     }
    // }, [currentStep]);
    const triggerSearch = async ({ page = 1, limit = 5 }) => {
        const queryParams = new URLSearchParams({ page, per_page: limit });
        queryParams.append("medallion_status", "Available");
        if (currentStep?.vehicle?.vehicle_type) {
            let vehicleType = currentStep?.vehicle?.vehicle_type

            if (vehicleType === "Wav Hybrid" || vehicleType === "Wav Gas" || vehicleType === "WAV Hybrid" || vehicleType === "WAV Gas") {
                queryParams.set("medallion_type", "WAV");
            } else if (vehicleType == "Non-Wav Hybrid" || vehicleType == "Non-Wav Gas" || vehicleType == "Non-WAV Hybrid" || vehicleType == "Non-WAV Gas") {
                queryParams.set("medallion_type", "Regular");
            }
        }

        if (
            formik?.values?.medallionNumber
        ) {
            if (formik?.values?.medallionNumber) {
                queryParams.append("medallion_number", formik.values.medallionNumber);
            }

            await triggerGetMedallion(`?${queryParams?.toString()}`)
                .unwrap()
                .then((vehicleData) => {
                    if (
                        vehicleData &&
                        vehicleData?.items &&
                        vehicleData?.items.length > 0
                    ) {
                        setMedallion(vehicleData?.items);
                    } else {
                        setMedallion([]);
                    }
                });
        } else {
            await triggerGetMedallion(`?${queryParams?.toString()}`)
                .unwrap()
                .then((vehicleData) => {
                    // if (
                    //   vehicleData &&
                    //   vehicleData.items &&
                    //   vehicleData.items.length > 0
                    // ) {
                    //   const filtered = vehicleData.items.filter(
                    //     (v) =>
                    //       !v.has_medallion &&
                    //       v.vehicle_type?.toLowerCase() ===
                    //         currentStep?.medallion_info?.medallion_type?.toLowerCase()
                    //   );
                    //   setMedallion(filtered);
                    // }
                    if (
                        vehicleData &&
                        vehicleData?.items &&
                        vehicleData?.items.length > 0
                    ) {
                        setMedallion(vehicleData?.items);
                    } else {
                        setMedallion([]);
                    }
                });
        }
    };
    const onPageChange = (data) => {
        setRows(data.rows);

        triggerSearch({
            page: Number(data.page) + 1,
            limit: data.rows,
        });
    };
    const formik = useFormik({
        initialValues: {
            medallionNumber: "",
        },
        onSubmit: () => {
            //TODO Serach API
        },
    });

    const formReset = () => {
        formik.resetForm();
        // triggerSearch({ page: 1, limit: 5 });
        const queryParams = new URLSearchParams({
            page: 1,
            per_page: 5,
            medallion_status: "Available",
        });
        if (currentStep?.vehicle?.vehicle_type) {
            let vehicleType = currentStep?.vehicle?.vehicle_type

            if (vehicleType === "Wav Hybrid" || vehicleType === "Wav Gas" || vehicleType === "WAV Hybrid" || vehicleType === "WAV Gas") {
                queryParams.set("medallion_type", "WAV");
            } else if (vehicleType === "Non-Wav Hybrid" || vehicleType === "Non-Wav Gas" || vehicleType === "Non-WAV Hybrid" || vehicleType === "Non-WAV Gas") {
                queryParams.set("medallion_type", "Regular");
            }
        }

        triggerGetMedallion(`?${queryParams.toString()}`)
            .unwrap()
            .then((vehicleData) => {
                if (vehicleData?.items?.length > 0) {
                    setMedallion(vehicleData.items);
                } else {
                    setMedallion([]);
                }
            });
    };


    const emptyView = () => {
        return (
            <div
                className="justify-items-center"
                style={{ justifyItems: "center", padding: "40px" }}
            >
                <div
                    className="d-flex justify-content-center flex-column mx-auto"
                    style={{ width: "max-content" }}
                >
                    <p className=" d-flex align-items-center justify-content-center p-4 mb-4 gap-2">
                        <Img name="no-result"></Img>No Results Found
                    </p>
                </div>
            </div>
        );
    };
    const customRender = (column, rowData) => {
        // console.log("Row Data", rowData);
        if (column.field === "medallion_type") {
            return <p>{rowData?.medallion_type.replace("Wav", "WAV")}</p>;
        }
        else if (column.field === "first_name") {
            return (
                <div>
                    <div className="d-flex flex-row align-items-center">
                        <Img name="return_driver"></Img>
                        <p style={{ marginLeft: 10 }}>{rowData?.first_name}</p>
                    </div>
                </div>
            );
        } else if (column.field === "license_plate_no") {
            return (
                <div>
                    <div className="d-flex flex-row align-items-center">
                        {/* <Img name="return_driver"></Img> */}
                        <p style={{ marginLeft: 10 }}>
                            {rowData?.registration_details?.plate_number || "-"}
                        </p>
                    </div>
                </div>
            );
        } else if (column.field === "registration_state") {
            return (
                <div>
                    <div className="d-flex flex-row align-items-center">
                        {/* <Img name="return_driver"></Img> */}
                        <p style={{ marginLeft: 10 }}>
                            {rowData?.registration_details?.registration_state || "-"}
                        </p>
                    </div>
                </div>
            );
        } else if (column.field === "end_date") {
            return (
                <p data-testid="grid-medallion-end-date">
                    {dateMonthYear(rowData.contract_end_date)}
                </p>
            )
        }
        else if (column.field === "lease_expiry") {
            return (
                <p data-testid="grid-medallion-validity-end-date">
                    {dateMonthYear(rowData.lease_expiry_date)}
                </p>
            )
        }

        return rowData[column.field];
    };

    const allocateVehicle = () => {
        setOpen(true);
    };

    const proceedAllocateVehicle = () => {
        const data = {
            step_id: currentStepId,
            data: {
                medallion_number: selectedMedallion && selectedMedallion.medallion_number,
            },
        };
        console.log("Attach Vehicle payload", data);
        if (hasAccess) processFlow({ params: caseId, data: data });
    };
    // useEffect(() => {
    //     if (vehicleData && vehicleData.items && vehicleData.items.length > 0 && !vehicleData.items[0].has_medallion) {
    //         setMedallion([vehicleData.items[0]])
    //     }
    // }, [vehicleData,isSuccess])

    useEffect(() => {
        if (hasAccess && isProcessDataSuccess) {
            moveCase({ params: caseId });
        }
    }, [isProcessDataSuccess]);

    useEffect(() => {
        if (isMoveDataSuccess) {
            reload();
            setSuccessOpen(true);
        }
    }, [isMoveDataSuccess]);
    useEffect(() => {
        const fetchInitialVehicles = async () => {
            // await triggerGetVehicles("")
            //   .unwrap()
            //   .then((vehicleData) => {
            //     if (
            //       vehicleData &&
            //       vehicleData.items &&
            //       vehicleData.items.length > 0
            //     ) {
            //       const filtered = vehicleData.items.filter(
            //         (v) =>
            //           !v.has_medallion &&
            //           v.vehicle_type?.toLowerCase() ===
            //             currentStep?.medallion_info?.medallion_type?.toLowerCase()
            //       );
            //       console.log("Filtered vehicle", filtered);
            //       setMedallion(filtered);
            //     } else {
            //       setMedallion([]);
            //     }
            //   });
        };
        triggerSearch({ page: 1, limit: 5 });
        // fetchInitialVehicles();
    }, [currentStep, triggerGetMedallion]);

    // const onPageChange = (data) => {
    //   setRows(data.rows);
    //   triggerSearchDriverData({ page: Number(data.page) + 1, limit: data.rows });
    // };

    return (
        <div>
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
                            <Img name="car"></Img>Vehicle
                        </div>
                    </div>
                    <div className="form-body d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center flex-wrap form-grid-1 w-75">
                            {medallionSearch.map((item, idx) => (
                                <div key={idx}>
                                    <BInputFields variable={item} formik={formik} />
                                </div>
                            ))}
                        </div>
                        <Button
                            disabled={!hasAccess}
                            label="Search"
                            data-testid="search-btn"
                            severity="warning"
                            type="button"
                            onClick={() => triggerSearch({ page: 1, limit: 5 })}
                            className="border-radius-0 primary-btn"
                        />
                        <Button
                            disabled={!hasAccess}
                            text
                            type="reset"
                            data-testid="reset-btn"
                            icon={() => {
                                return (
                                    <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M12.0094 0C18.6375 0 24.0188 5.4 24.0094 12.0281C23.9906 18.6375 18.6 24 12 24C5.37189 24 -0.00936277 18.6 1.2231e-05 11.9719C0.00938723 5.37187 5.40001 0 12.0094 0ZM11.9813 22.7812C17.9344 22.7906 22.7813 17.9531 22.7813 12.0094C22.7813 6.075 17.9625 1.2375 12.0469 1.21875C6.08439 1.2 1.22814 6.02812 1.21876 11.9719C1.20939 17.925 6.03751 22.7719 11.9813 22.7812Z"
                                            fill="black"
                                        />
                                        <path
                                            d="M12.0001 11.0999C13.1064 9.99365 14.1751 8.91553 15.2439 7.84678C15.347 7.74365 15.4408 7.64053 15.5439 7.55615C15.8158 7.3499 16.1064 7.34053 16.3501 7.58428C16.5939 7.82803 16.5751 8.11865 16.3783 8.39053C16.2845 8.5124 16.1626 8.61553 16.0595 8.72803C15.0001 9.7874 13.9408 10.8468 12.8251 11.953C13.1626 12.2812 13.4908 12.5905 13.8001 12.8999C14.6064 13.6968 15.422 14.503 16.2283 15.3093C16.5564 15.6374 16.6033 16.003 16.3689 16.2562C16.1251 16.5187 15.722 16.4812 15.3845 16.153C14.2689 15.0374 13.1626 13.9218 12.0095 12.7687C11.8689 12.8999 11.7376 13.0124 11.6251 13.1249C10.6408 14.1093 9.65638 15.0937 8.68138 16.0687C8.28763 16.4624 7.89388 16.5374 7.63138 16.2562C7.36888 15.9843 7.44388 15.6093 7.85638 15.2062C7.96888 15.0937 8.08138 14.9905 8.1845 14.878C9.15013 13.8937 10.1064 12.9187 11.147 11.8593C10.8751 11.6062 10.5658 11.3343 10.2658 11.0437C9.44075 10.228 8.62513 9.4124 7.8095 8.59678C7.4345 8.22178 7.36888 7.84678 7.63138 7.5749C7.90325 7.29365 8.2595 7.3499 8.64388 7.73428C9.75013 8.8499 10.8564 9.95615 12.0001 11.0999Z"
                                            fill="black"
                                        />
                                    </svg>
                                );
                            }}
                            // onClick={() => {  }}
                            onClick={() => {
                                formik.resetForm();
                                formReset();
                            }}
                        />
                    </div>
                </div>
            </form>

            {
                <div className="mt-2">
                    <DataTableComponent
                        columns={filteredColumns}
                        data={medallion}
                        selectionMode="radiobutton"
                        selectedData={selectedMedallion}
                        onSelectionChange={(e) => setSelectedMedallion(e.value)}
                        renderColumn={customRender}
                        onPageChange={onPageChange}
                        totalRecords={medallionData?.total_items}
                        dataKey="medallion_id"
                        lazy={true}
                    />
                </div>
            }
            {selectedMedallion && (
                <Button
                    label="Assign / Update Medallion"
                    severity="warning"
                    type="button"
                    disabled={!hasAccess}
                    onClick={() => {
                        proceedAllocateVehicle();
                    }}
                    className="border-radius-0 primary-btn m-3"
                />
            )}
            <div>
                <BConfirmModal
                    isOpen={isOpen}
                    title={"Allocating Medallion Confirmation"}
                    message={""}
                    onCancel={() => {
                        setOpen(false);
                        // setMedallion([]);
                    }}
                    onConfirm={() => {
                        setOpen(false);
                        proceedAllocateVehicle();
                    }}
                    customContent={
                        <div>
                            <div className="d-flex">
                                <BCard
                                    label="Medallion No"
                                    value={currentStep?.medallion_info?.medallion_number}
                                />
                                <BCard
                                    label="Owner"
                                    value={currentStep?.medallion_info?.medallion_owner_name}
                                />
                            </div>
                            <div>
                                <BCard
                                    label="Medallion Type"
                                    value={currentStep?.medallion_info?.medallion_type}
                                />
                            </div>
                            <Img name="line_long"></Img>
                            <div>
                                <div className="d-flex">
                                    <BCard
                                        label="Brand"
                                        value={selectedMedallion && selectedMedallion?.make}
                                    />
                                    <BCard
                                        label="VIN"
                                        value={selectedMedallion && selectedMedallion?.vin}
                                    />
                                </div>
                                <div className="d-flex">
                                    <BCard
                                        label="Model"
                                        value={selectedMedallion && selectedMedallion?.model}
                                    />
                                    <BCard
                                        label="Vehicle Type"
                                        value={selectedMedallion && selectedMedallion?.vehicle_type}
                                    />
                                </div>
                            </div>
                        </div>
                    }
                />
            </div>
            <BSuccessMessage
                isOpen={isSuccessOpen}
                message={`Medallion ${selectedMedallion?.medallion_number} has been assigned to VIN: ${currentStep?.vehicle?.vin}.`}
                title="Medallion Assigned / Updated Successfully"
                onCancel={() => {
                    console.log("Cancel");
                    setOpen(false);
                    navigate("/manage-medallion", { replace: true });
                }}
                onConfirm={() => {
                    console.log("onConfirm");
                    setOpen(false);
                    navigate("/manage-medallion", { replace: true });
                }}
            ></BSuccessMessage>
        </div>
    );
};

export default AttachMedallion;
