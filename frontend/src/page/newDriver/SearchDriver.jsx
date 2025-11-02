import { Button } from "primereact/button";
import Img from "../../components/Img";
import { useFormik } from "formik";
import { newDriverSearch as variable } from "../../utils/variables";
import BInputFields from "../../components/BInputFileds";
import DataTableComponent from "../../components/DataTableComponent";
import { useEffect, useState } from "react";
import {
  useLazyGetStepInNewDriverQuery,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../redux/api/medallionApi";
import { getCurrentStep } from "../../utils/caseUtils";
import BConfirmModal from "../../components/BConfirmModal";
import { maskSSN } from "../../utils/utils";
import { isVechileActive } from "../../utils/MedallionUtils";
import {
  useLazyGetDriverQuery,
  useSearchDriverMutation,
} from "../../redux/api/driverApi";

const SearchDriver = ({
  caseId,
  caseData,
  currentStepId,
  hasAccess,
  reload,
}) => {
  const [selectedDrivers, setSelectedDrivers] = useState(null);
  const [
    triggerSearchDriverQuery,
    { data: driverDetail, isSuccess: isSearchDataSuccess, isError },
  ] = useLazyGetStepInNewDriverQuery();

  // const [triggerSearchInactiveDriverQuery, { data: driverSearchDetail }] =
  //     useSearchDriverMutation();

  const [
    triggerSearchInactiveDriverQuery,
    { data: driverSearchDetail, isSuccess: isDriverSuccess },
  ] = useLazyGetDriverQuery();

  const [drivers, setDrivers] = useState([]);
  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();
  const [processFlow, { isSuccess: isProccessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [message, setMessage] = useState(null);
  const [isOpen, setOpen] = useState(false);
  const [isSearchTrigged, setSearchTrigged] = useState(false);
  const [isSearchEnable, setSearchEnable] = useState(true);
  const [rows, setRows] = useState(5);

  // const triggerSearch = () => {
  //   const queryParams = new URLSearchParams();

  //   if (formik?.values?.tlcLicenseNumber) {
  //     queryParams.append("tlc_license_number", formik.values.tlcLicenseNumber);
  //   }

  //   if (formik?.values?.dmvLicenseNumber) {
  //     queryParams.append("dmv_license_number", formik.values.dmvLicenseNumber);
  //   }

  //   if (formik?.values?.ssn) {
  //     queryParams.append("ssn", formik.values.ssn);
  //   }

  //   if (queryParams.toString()) {
  //     triggerSearchDriverQuery({
  //       caseNo: caseId,
  //       step_no: currentStepId,
  //       data: `?${queryParams.toString()}`,
  //     })
  //       .unwrap()
  //       .then((response) => {
  //         setOpen(true);
  //         setMessage(
  //           updateDriverRecordMessage(
  //             response?.driver_ssn,
  //             response?.tlc_license_number,
  //             response?.dmv_license_number,
  //             response.matched_on
  //           )
  //         );
  //       })
  //       .catch(() => {
  //         setDrivers([]);
  //         setSearchTrigged(true);
  //       });
  //   }
  // };
  const triggerSearch = () => {
    const searchParams = {
      tlc_license_number: formik.values.tlcLicenseNumber,
      dmv_license_number: formik.values.dmvLicenseNumber,
      ssn: formik.values.ssn,
      driver_status: "Inactive",
    };
    triggerInactiveDriverApi({
      page: 1, // Reset to first page on search
      limit: rows,
      searchParams,
    });
  };
  const updateDriverRecordMessage = (ssn, tlc, dmv) => {
    const messageParts = [];

    if (ssn) messageParts.push(`SSN ${maskSSN(ssn)}`);
    if (tlc) messageParts.push(`TLC ${tlc}`);
    if (dmv) messageParts.push(`DMV ${dmv}`);

    const fieldsMessage = messageParts.join(",");
    return fieldsMessage
      ? `The driver with ${fieldsMessage} worked earlier here. Do you want to view the record?`
      : "";
  };
  const onPageChange = (data) => {
    setRows(data.rows);
    const searchParams = {
      driver_status: "Inactive",
    };
    triggerInactiveDriverApi({
      page: Number(data.page) + 1,
      limit: data.rows,
      searchParams,
    });
  };

  const formik = useFormik({
    initialValues: {
      tlcLicenseNumber: "",
      dmvLicenseNumber: "",
      ssn: "",
    },
    onSubmit: () => {
      triggerSearch();
    },
    onReset: () => {},
  });

  const formReset = () => {
    formik.resetForm();
    const searchParams = {
      driver_status: "Inactive",
    };
    triggerInactiveDriverApi({ page: 1, limit: 5, searchParams });
    // setDrivers([]);
  };

  const columns = [
    {
      field: "first_name",
      header: "Driver Name",
      sortable: false,
      headerAlign: "left",
      bodyAlign: "left",
    },
    { field: "driver_status", header: "Driver Status", headerAlign: "left" },
    { field: "tlc_license_number", header: "TLC License No", sortable: false },
    { field: "dmv_license_number", header: "DMV License No" },
    { field: "ssn", header: "SSN" },
    // { field: "m_status", header: "Status" },
    // { field: "options", header: "" },
  ];

  const isDriverActive = () => {
    return true;
  };
  const driverStauts = (data) => {
    return data?.driver_details?.driver_status;
  };

  const isDocumentAproved = () => {
    return true;
  };
  const newRegistration = () => {
    if (getCurrentStep(caseData.steps).step_id === currentStepId) {
      const data = {
        step_id: currentStepId,
        data: {
          // driverId:0
        },
      };
      if (hasAccess) processFlow({ params: caseId, data: data });
    }
  };

  const returnDriver = (rowData) => {
    const data = {
      step_id: currentStepId,
      data: {
        driverId: rowData,
      },
    };
    if (hasAccess) processFlow({ params: caseId, data: data });
  };
  useEffect(() => {
    if (
      hasAccess &&
      isProccessDataSuccess &&
      caseData &&
      caseData.case_info.case_status !== "Closed" &&
      getCurrentStep(caseData.steps).step_id === currentStepId
    ) {
      // moveCase({ params: caseId });
      moveCase({ params: caseId })
        .unwrap()
        .then(() => {
          reload();
        });
    }
  }, [isProccessDataSuccess]);

  // useEffect(() => {
  //     if (driverDetail && isSearchDataSuccess) {
  //         setMessage(updateDriverRecordMessage(driverDetail?.driver_ssn, driverDetail?.tlc_license_number, driverDetail?.dmv_license_number, driverDetail.matched_on))
  //         setOpen(true)
  //     }
  // }, [isSearchDataSuccess])

  useEffect(() => {
    if (
      caseData &&
      caseData.case_info.case_status !== "Closed" &&
      getCurrentStep(caseData.steps).step_id === currentStepId
    ) {
      setSearchEnable(true);
    } else {
      setSearchEnable(false);
    }
  }, [caseData]);

  const triggerInactiveDriverApi = ({
    page = 1,
    limit = 5,
    searchParams = {},
  }) => {
    const queryParams = new URLSearchParams({
      page,
      per_page: limit,
      ...searchParams,
    });
    triggerSearchInactiveDriverQuery(`?${queryParams.toString()}`);
  };

  useEffect(() => {
    // const queryParams = new URLSearchParams();
    // queryParams.append("page", "1");
    // queryParams.append("per_page", "5");

    // queryParams.append("driver_status", "Inactive");

    // console.log("Search");
    const searchParams = {
      driver_status: "Inactive",
    };
    triggerInactiveDriverApi({ page: 1, limit: 5, searchParams });

    // triggerSearchInactiveDriverQuery(`?${queryParams.toString()}`);
  }, []);

  useEffect(() => {
    if (driverSearchDetail) {
      setSearchTrigged(true);
      // Flatten the data structure to include driver_lookup_id at root level
      const flattenedDrivers = driverSearchDetail.items.map((item) => ({
        ...item,
        id: item.driver_details.driver_lookup_id, // Add id at root level
        driver_lookup_id: item.driver_details.driver_lookup_id, // Also add this for consistency
      }));
      console.log(flattenedDrivers);
      setDrivers(flattenedDrivers);
      // setDrivers(driverSearchDetail.items);
    }
  }, [driverSearchDetail]);

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
          <p className=" d-flex align-items-center justify-content-center gap-2">
            <Img name="no-result"></Img>No Results Found
          </p>
        </div>
        <div>
          <Img name="line_long" />
        </div>
        {/* <Button
          label="Add Driver"
          severity="warning"
          onClick={() => newRegistration()}
          className="border-radius-0 primary-btn"
          icon={() => <Img name="add"></Img>}
          disabled={
            !hasAccess ||
            !(getCurrentStep(caseData.steps).step_id === currentStepId)
          }
          style={{ marginTop: "20px" }}
        /> */}
      </div>
    );
  };
  const customRender = (column, rowData) => {
    if (column.field === "first_name") {
      return (
        <div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Img name="return_driver"></Img>
            <p style={{ marginLeft: 10 }}>
              {rowData?.driver_details?.first_name}
            </p>
          </div>
        </div>
      );
    } else if (column.field === "driver_status") {
      return (
        <div>
          <p>{driverStauts(rowData)}</p>
        </div>
      );
    }
    // else if (column.field === "options") {
    //   return (
    //     <div
    //       style={{
    //         display: "flex",
    //         flexDirection: "row",
    //         gap: "31px",
    //         alignItems: "center",
    //       }}
    //     >
    //       <div>
    //         {/* <Menu model={menuItems} popup ref={menuRefs.current[menuKey]} /> */}
    //         {/* <div className="three-dot-mennu" onClick={(e) => menuRefs.current[menuKey].current.toggle(e)}> */}
    //         <div className="three-dot-mennu">
    //           <Img name="three_dots_vertival" />
    //         </div>
    //       </div>
    //     </div>
    //   );
    // }
    // else if (column.field === "m_status") {
    //   return (
    //     <div style={{ display: "flex", flexDirection: "row", gap: "26px" }}>
    //       <div>
    //         {isDriverActive(rowData) ? (
    //           <div
    //           //  onClick={() => returnDriver(rowData)}
    //           >
    //             <Img name="ic_driver_inactive" />
    //           </div>
    //         ) : (
    //           <Img name="ic_driver_inactive" />
    //         )}
    //       </div>
    //       <div>
    //         {isVechileActive(rowData) ? (
    //           <Img name="ic_car_add" />
    //         ) : (
    //           <Img name="ic_car_add" />
    //         )}
    //       </div>
    //       <div>
    //         {isDocumentAproved(rowData) ? (
    //           <div>
    //             <Img name="ic_pdf_inactive" />
    //           </div>
    //         ) : (
    //           <Img name="ic_pdf_inactive" />
    //         )}
    //       </div>
    //     </div>
    //   );
    // }
    else if (column.field === "tlc_license_number") {
      return rowData?.tlc_license_details?.tlc_license_number;
    } else if (column.field === "dmv_license_number") {
      return rowData?.dmv_license_details?.dmv_license_number;
    } else if (column.field === "ssn") {
      return <div>{maskSSN(rowData?.driver_details?.driver_ssn)}</div>;
    }
    return rowData[column.field];
  };

  useEffect(() => {
    if (isMoveDataSuccess) {
      console.log("is Moved");
    }
  });
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
              <Img name="search"></Img>Driver
            </div>
          </div>
          <div className="form-body d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center flex-wrap form-grid-1 w-75">
              {variable.map((item, idx) => (
                <div key={idx} className="w-100-3">
                  <BInputFields variable={item} formik={formik} />
                </div>
              ))}
            </div>
            <Button
              data_test_id="Search"
              label="Search"
              severity="warning"
              type="submit"
              disabled={!hasAccess || !isSearchEnable}
              className="border-radius-0 primary-btn"
              // onClick={() => triggerSearch()}
            />
            <Button
              data_test_id="ic_cross"
              disabled={!hasAccess}
              text
              type="button"
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
              onClick={() => {
                formik.resetForm();
                formReset();
              }}
            />
          </div>
        </div>
      </form>

      {/* {isSearchTrigged && <DataTableComponent
                columns={columns}
                data={drivers}
                selectionMode="checkbox"
                selectedData={selectedDrivers}
                onSelectionChange={(e) => setSelectedDrivers(e.value)}
                renderColumn={customRender}
                dataKey="driver_id"
                emptyMessage={emptyView()}
            />
            } */}
      <DataTableComponent
        columns={columns}
        data={drivers}
        selectionMode="radiobutton"
        selectedData={selectedDrivers}
        onSelectionChange={(e) => setSelectedDrivers(e.value)}
        renderColumn={customRender}
        dataKey="driver_lookup_id"
        emptyMessage={emptyView()}
        totalRecords={driverSearchDetail?.total_items}
        onPageChange={onPageChange}
      />
      <div className="w-100 position-sticky bottom-0 py-3 bg-white d-flex gap-3">
        <Button
          label="Select Driver"
          data-testid="select-driver"
          disabled={
            !hasAccess ||
            !selectedDrivers ||
            !selectedDrivers?.driver_details?.driver_lookup_id ||
            drivers.length === 0
          }
          onClick={() => {
            returnDriver(selectedDrivers?.driver_details?.driver_lookup_id);
          }}
          // onClick={() => {
          //   processFlow({
          //     params: caseId,
          //     data: {
          //       step_id: currentStepId,
          //       data: { vehicle_vin: selectedDrivers[0]?.vin?.toString() },
          //     },
          //   });
          // }}

          type="submit"
          severity="warning"
          className="border-radius-0 primary-btn w-max-content"
        />
        {/* Show Add Driver button only if no results */}
        {drivers.length === 0 && (
          <Button
            label="Add Driver"
            severity="warning"
            onClick={() => newRegistration()}
            className="border-radius-0 primary-btn w-max-content"
            icon={() => <Img name="add"></Img>}
            disabled={
              !hasAccess ||
              !(getCurrentStep(caseData.steps).step_id === currentStepId)
            }
            style={{ marginLeft: "10px" }}
          />
        )}
      </div>
      {/* <div>
        <BConfirmModal
          isOpen={isOpen}
          title={"Confirmation on Driver"}
          message={message}
          onCancel={() => {
            setOpen(false);
            setDrivers([]);
            setSearchTrigged(true);
          }}
          onConfirm={() => {
            setSearchTrigged(true);
            setOpen(false);
            setDrivers([driverDetail]);
          }}
        />
      </div> */}
    </div>
  );
};

export default SearchDriver;
