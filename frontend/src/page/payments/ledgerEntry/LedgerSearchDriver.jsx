import { Button } from "primereact/button";
import Img from "../../../components/Img";
import { useFormik } from "formik";
import { ledgerSearchDriver as variable } from "../../../utils/variables";
import BInputFields from "../../../components/BInputFileds";
import DataTableComponent from "../../../components/DataTableComponent";
import { useEffect, useState } from "react";
import {
  useLazyGetStepInNewDriverQuery,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../../redux/api/medallionApi";
import { getCurrentStep } from "../../../utils/caseUtils";
import { getFullName, maskSSN } from "../../../utils/utils";
import { useLazyLedgerEntryListQuery } from "../../../redux/api/ledgerApi";
import { useLazyGetDriverQuery } from "../../../redux/api/driverApi";

const LedgerSearchDriver = ({
  caseId,
  caseData,
  reload,
  currentStepId,
  hasAccess,
}) => {
  const [selectedDrivers, setSelectedDrivers] = useState(null);
  console.log("🚀 ~ LedgerSearchDriver ~ selectedDrivers:", selectedDrivers);
  const [triggerSearchDriverQuery, { data: driverDetail }] =
    useLazyGetStepInNewDriverQuery();
  const [drivers, setDrivers] = useState([]);
  const [moveCase] = useMoveCaseDetailMutation();
  const [processFlow, { isSuccess: isProccessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [isSearchEnable, setSearchEnable] = useState(true);
  const [driverDataList, setDriverDataList] = useState([]);
  const [triggerGetDriverData, { data: driverListData }] =
    useLazyGetDriverQuery();
  const [rows, setRows] = useState(5);
  const [page, setPage] = useState(1);

  useEffect(() => {
    triggerSearchDriverData({ page: 1, limit: 5 });
  }, []);
  const triggerSearchDriverData = ({ page, limit }) => {
    const queryParams = new URLSearchParams({
      page,
      per_page: limit,
    });
    queryParams.append("driver_status", "active");
    console.log("Filter apply list", queryParams.toString());
    triggerGetDriverData(`?${queryParams.toString()}`);
  };
  useEffect(() => {
    if (driverListData) {
      console.log("Lease List", driverListData);
      setDrivers(
        driverListData?.items?.map((item) => ({
          ...item.driver_details, // all driver details
          ...item.dmv_license_details, // DMV license details
          ...item.tlc_license_details, // TLC license details
          ...item.tlc_license_number,
          has_documents: item.has_documents,
          has_vehicle: item.has_vehicle,
          is_archived: item.is_archived,
        }))
      );
    }
  }, [driverListData]);
  const onPageChange = (data) => {
    setRows(data.rows);
    triggerSearchDriverData({ page: Number(data.page) + 1, limit: data.rows });
  };

  const formik = useFormik({
    initialValues: {
      medallion_number: "",
      driver_id: "",
      vin: "",
      driver_name: "",
    },
    onSubmit: (values) => {
      const queryParams = new URLSearchParams();

      if (values?.medallion_number) {
        queryParams.append("medallion_number", values.medallion_number);
      }

      if (values?.driver_id) {
        queryParams.append("driver_lookup_id", values.driver_id);
      }

      if (values?.vin) {
        queryParams.append("vin", values.vin);
      }

      if (values?.driver_name) {
        queryParams.append("driver_name", values.driver_name);
      }

      if (queryParams.toString()) {
        // triggerSearchDriverQuery({
        //   caseNo: caseId,
        //   step_no: currentStepId,
        //   data: `?${queryParams.toString()}`,
        // })
        queryParams.append("driver_status", "active");
        console.log("Filter apply list", queryParams.toString());
        triggerGetDriverData(`?${queryParams.toString()}`)
          .unwrap()
          .then((response) => {
            console.log("🚀 ~ .then ~ response:", response);
            if (response) {
              setDrivers([
                {
                  ...response.driver_details,
                  ...response.tlc_license_number,
                  ...response.dmv_license_details,
                  has_documents: response.has_documents,
                  has_vehicle: response.has_vehicle,
                  is_archived: response.is_archived,
                  ...response.tlc_license_details,
                },
              ]);
            }
          })
          .catch(() => {
            setDrivers([]);
          });
      } else {
        console.log("else");
        triggerSearchDriverData({ page: 1, limit: 5 });
      }
    },
    onReset: () => {
      setDrivers([]);
      triggerSearchDriverData({ page: 1, limit: 5 });
    },
  });

  const formReset = () => {
    formik.resetForm();
    triggerSearchDriverData({ page: 1, limit: 5 });
    // setDrivers([])
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
    { field: "m_status", header: "Status" },
    { field: "options", header: "" },
  ];

  const driverStauts = () => {
    return "Active";
  };

  const returnDriver = (id) => {
    const data = {
      step_id: currentStepId,
      data: {
        driverId: id,
      },
    };
    console.log("return Driver", id);
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
      moveCase({ params: caseId })
        .unwrap()
        .then(() => {
          reload();
        });
    }
  }, [isProccessDataSuccess]);

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

  const emptyView = () => {
    return (
      <div
        className="d-flex justify-content-center flex-column  mx-auto"
        style={{ width: "max-content" }}
      >
        <p className=" d-flex align-items-center justify-content-center p-4 mb-4 gap-2">
          <Img name="no-result"></Img>No Results Found
        </p>
      </div>
    );
  };
  const customRender = (column, rowData) => {
    // console.log("🚀 ~ customRender ~ rowData:", rowData);
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
              {getFullName(
                rowData?.first_name,
                rowData?.middle_name,
                rowData?.last_name
              )}
            </p>
          </div>
        </div>
      );
    } else if (column.field === "driver_status") {
      console.log(drivers);
      return (
        <div>
          <p>{rowData?.driver_status}</p>
        </div>
      );
    } else if (column.field === "m_status") {
      return (
        <div style={{ display: "flex", flexDirection: "row", gap: "26px" }}>
          <div className="manage-table-action-svg">
            {rowData.is_archived ? (
              <div onClick={() => returnDriver(rowData)}>
                <Img name="driver_inactive" />
              </div>
            ) : (
              <Img name="driver_active" />
            )}
          </div>
          <div className="manage-table-action-svg">
            {rowData.has_vehicle ? (
              <Img name="car_success" />
            ) : (
              <Img name="car_fail" />
            )}
          </div>
          <div className="manage-table-action-svg">
            {rowData.has_documents ? (
              <div>
                <Img name="ic_pdf_inactive" />
              </div>
            ) : (
              <Img name="ic_pdf_active" />
            )}
          </div>
        </div>
      );
    } else if (column.field === "tlc_license_number") {
      return rowData?.tlc_license_number;
    } else if (column.field === "dmv_license_number") {
      return rowData?.dmv_license_number;
    } else if (column.field === "ssn") {
      return <div>{maskSSN(rowData?.driver_ssn)}</div>;
    }
    return rowData[column.field];
  };

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
                <div key={idx}>
                  <BInputFields variable={item} formik={formik} />
                </div>
              ))}
            </div>
            <Button
              label="Search"
              type="submit"
              severity="warning"
              disabled={!hasAccess || !isSearchEnable}
              className="border-radius-0 primary-btn"
              //   onClick={() => triggerSearch()}
              data-testid="search-btn"
            />
            <Button
              disabled={!hasAccess}
              text
              data-testid="reset-btn"
              type="reset"
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

      <DataTableComponent
        columns={columns}
        data={drivers}
        selectionMode="checkbox"
        selectedData={selectedDrivers}
        onSelectionChange={(e) => setSelectedDrivers(e.value)}
        renderColumn={customRender}
        dataKey="driver_id"
        emptyMessage={emptyView()}
        totalRecords={driverListData?.total_items}
        onPageChange={onPageChange}
      />

      <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        <Button
          disabled={
            !hasAccess ||
            !selectedDrivers ||
            selectedDrivers.length !== 1 ||
            !selectedDrivers[0]?.driver_id ||
            !caseData?.case_info.case_status === "Closed"
          }
          onClick={() => {
            console.log("selected driver", selectedDrivers?.[0]?.driver_id);
            //returnDriver(driverDetail?.driver_details?.driver_id);
            returnDriver(selectedDrivers?.[0]?.driver_id);
          }}
          label="Continue"
          type="submit"
          severity="warning"
          className="border-radius-0 primary-btn "
        />
      </div>
    </div>
  );
};

export default LedgerSearchDriver;
