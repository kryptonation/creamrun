import { useFormik } from "formik";
import DataTableComponent from "../../components/DataTableComponent";
import Img from "../../components/Img";
import BInputText from "../../components/BInputText";
import { Button } from "primereact/button";
import { useEffect, useState, useRef, useMemo } from "react";
import { chooseDriverLease as variable } from "../../utils/variables";
import { InputSwitch } from "primereact/inputswitch";
import { useLazyGetCaseDetailQuery } from "../../redux/api/medallionApi";
import { DISABLEDAYNIGHTSHIFT } from "../../utils/constants";
import { useLazyGetDriverQuery } from "../../redux/api/driverApi";
import { getFullName } from "../../utils/utils";

const ChooseAdditionalDriverTable = ({
  stepInfoData,
  caseId,
  currentStepId,
  selectedDrivers,
  setSelectedDrivers,
  previousSelectedDriver,
  leaseType,
  hasAccess,
  selectionMode = "multiple",
}) => {
  console.log("selectedDrivers : ", selectedDrivers);
  const [triggerSearchQuery, { data }] = useLazyGetCaseDetailQuery({
    skip: true,
  });
  const [triggerGetDriverData, { data: driverListData }] =
    useLazyGetDriverQuery();
  const [rows, setRows] = useState(5);
  const [page, setPage] = useState(1);
  const [registeredDriverData, setRegisteredDriverData] = useState([]);
  const [shiftChecked, setShiftChecked] = useState({});

  // Use ref to track if we're updating from shift change to prevent selection reset
  const isShiftUpdateRef = useRef(false);

  useEffect(() => {
    triggerSearchDriverData({ page: 1, limit: 5 });
  }, []);

  const triggerSearchDriverData = ({ page, limit }) => {
    const queryParams = new URLSearchParams({
      page,
      per_page: limit,
    });
    // queryParams.append("driver_status", "Active");
    console.log("Filter apply list", queryParams.toString());
    triggerGetDriverData(`?${queryParams.toString()}`);
  };

  useEffect(() => {
    if (driverListData) {
      console.log("Lease List", driverListData);
      setRegisteredDriverData(
        driverListData?.items?.map((item) => ({
          ...item.driver_details,
          ...item.dmv_license_details,
          ...item.tlc_license_details,
          ...item.tlc_license_number,
          has_documents: item.has_documents,
          has_vehicle: item.has_vehicle,
          is_archived: item.is_archived,
        }))
      );
    }
  }, [driverListData]);

  const triggerSearch = () => {
    const queryParams = new URLSearchParams();

    if (formik?.values?.TLCLicenseNo) {
      queryParams.append("tlc_license_number", formik.values.TLCLicenseNo);
    }

    if (formik?.values?.DMVLicenseNo) {
      queryParams.append("dmv_license_number", formik.values.DMVLicenseNo);
    }

    if (formik?.values?.SSN) {
      queryParams.append("ssn", formik.values.SSN);
    }

    if (queryParams.toString()) {
      // queryParams.append("driver_status", "registered,Active");
      triggerGetDriverData(`?${queryParams.toString()}`);
    }
  };

  const onPageChange = (data) => {
    setRows(data.rows);
    triggerSearchDriverData({ page: Number(data.page) + 1, limit: data.rows });
  };

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
      // Reset logic if needed
    },
  });

  const formReset = () => {
    formik.resetForm();
    triggerSearchDriverData({ page: 1, limit: 5 });
    setSelectedDrivers && setSelectedDrivers([]);
    setShiftChecked({});
  };

  const columns = [
    {
      field: "driver_name",
      header: "Driver Name",
      sortable: false,
      headerAlign: "left",
      bodyAlign: "left",
    },
    // { field: "driver_lookup_id", header: "Driver ID", headerAlign: "left" },
    { field: "tlc_license_number", header: "TLC License No", sortable: false },
    { field: "dmv_license_number", header: "DMV License No" },
    { field: "ssn", header: "SSN" },
    { field: "status", header: "Status", sortable: false },
    { field: "contact_number", header: "Contact" },
    // { field: "shift", header: "Shifts" },
  ];

  const customRender = (column, rowData) => {
    if (column.field === "driver_name") {
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
    } else if (column.field === "ssn") {
      return <p>{rowData?.driver_ssn}</p>;
    } else if (column.field === "contact_number") {
      return <p>{rowData?.phone_number_1 || rowData?.phone_number_2}</p>;
    } else if (column.field === "status") {
      return <p>{rowData?.driver_status || "-"}</p>;
    } else if (column.field === "shift") {
      const isRowSelected = selectedDrivers?.some(
        (driver) => driver.driver_lookup_id === rowData.driver_lookup_id
      );

      return (
        <div className="d-flex align-items-center gap-1">
          D
          <InputSwitch
            disabled={
              !isRowSelected || DISABLEDAYNIGHTSHIFT.includes(leaseType)
            }
            checked={shiftChecked[rowData.driver_lookup_id] || false}
            onChange={(e) =>
              handleShiftChange(rowData?.driver_lookup_id, e.value)
            }
          />
          N
        </div>
      );
    }

    return rowData[column.field];
  };

  const submitBtnDisabled = () => {
    if (previousSelectedDriver) {
      if (
        formik.values?.[variable.field_01.id] ===
        previousSelectedDriver?.tlc_license_number
      ) {
        return true;
      }
      if (
        formik.values?.[variable.field_02.id] ===
        previousSelectedDriver?.dmv_license_number
      ) {
        return true;
      }
      if (
        formik.values?.[variable.field_03.id] === previousSelectedDriver?.ssn
      ) {
        return true;
      }
    }
    return (
      !formik.values?.[variable.field_01.id] &&
      !formik.values?.[variable.field_02.id] &&
      !formik.values?.[variable.field_03.id]
    );
  };

  // Handle shift change without affecting selection
  const handleShiftChange = (driverId, value) => {
    // Update shift state
    setShiftChecked((prev) => ({
      ...prev,
      [driverId]: value,
    }));
  };

  // Get combined driver data with shift information
  const getCombinedDriverData = () => {
    return selectedDrivers.map((driver) => ({
      ...driver,
      is_day_night_shift: shiftChecked[driver.driver_lookup_id] || false,
    }));
  };

  // Expose combined data to parent when selection or shift changes
  useEffect(() => {
    if (selectedDrivers.length > 0) {
      const combinedData = getCombinedDriverData();
      // Only update parent if there's an actual difference
      const hasShiftChanges = combinedData.some(
        (driver) => shiftChecked[driver.driver_lookup_id] !== undefined
      );

      if (hasShiftChanges && setSelectedDrivers) {
        // Use a timeout to prevent infinite loops
        const timeoutId = setTimeout(() => {
          setSelectedDrivers(combinedData);
        }, 0);

        return () => clearTimeout(timeoutId);
      }
    }
  }, [shiftChecked]); // Only trigger on shift changes

  // Handle selection change based on selection mode
  const handleSelectionChange = (e) => {
    const newSelection = e.value;

    if (selectionMode === "single") {
      setSelectedDrivers([newSelection]);
      // For single selection, only allow one driver
      // if (newSelection.length > 1) {
      //   // If more than one is selected, keep only the last selected one
      //   // const lastSelected = newSelection[newSelection.length - 1];
      //   setSelectedDrivers([newSelection]);

      //   // Preserve existing shift state for the selected driver
      //   setShiftChecked((prev) => {
      //     const updated = {};
      //     updated[newSelection.driver_id] =
      //       prev[newSelection.driver_id] || false;
      //     return updated;
      //   });
      // } else {
      //   // Handle deselection or normal selection
      //   if (newSelection.length === 0) {
      //     setShiftChecked({});
      //   }
      //   setSelectedDrivers(newSelection);
      // }
    } else {
      // For multiple selection (co-lease), allow multiple drivers
      // Find deselected drivers
      const deselected = selectedDrivers.filter(
        (driver) =>
          !newSelection.some(
            (sel) => sel.driver_lookup_id === driver.driver_lookup_id
          )
      );

      // Reset shift for deselected drivers
      setShiftChecked((prev) => {
        const updated = { ...prev };
        deselected.forEach((driver) => {
          delete updated[driver.driver_lookup_id]; // Remove instead of setting to false
        });
        return updated;
      });

      // Filter out the previous selected driver if it exists in co-lease selection
      const filteredSelection = previousSelectedDriver
        ? newSelection.filter(
            (driver) =>
              driver.driver_lookup_id !==
              previousSelectedDriver.driver_lookup_id
          )
        : newSelection;

      setSelectedDrivers(filteredSelection);
    }
  };

  // Filter out previously selected driver from available options for co-lease
  const availableDriverData =
    selectionMode === "multiple" && previousSelectedDriver
      ? registeredDriverData.filter(
          (driver) =>
            driver.driver_lookup_id !== previousSelectedDriver.driver_lookup_id
        )
      : registeredDriverData;

  return (
    <>
      <form
        className="common-form d-flex flex-column gap-5"
        onSubmit={formik.handleSubmit}
      >
        <div className="form-section">
          <div className="d-flex align-items-center justify-content-between form-sec-header">
            <div className="topic">
              <Img name="search"></Img> Driver
              {selectionMode === "single" && (
                <span className="ms-2 text-muted">(Select one)</span>
              )}
              {selectionMode === "multiple" && (
                <span className="ms-2 text-muted">(Select multiple)</span>
              )}
            </div>
          </div>
          <div className="form-body d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center flex-wrap form-grid-1 w-75">
              <div className="w-100-3 ">
                <BInputText
                  variable={variable.field_01}
                  formik={formik}
                ></BInputText>
              </div>
              <div className="w-100-3">
                <BInputText
                  variable={variable.field_02}
                  formik={formik}
                ></BInputText>
              </div>
              <div className="w-100-3">
                <BInputText
                  variable={variable.field_03}
                  formik={formik}
                ></BInputText>
              </div>
            </div>
            <Button
              label="Search"
              disabled={!hasAccess || submitBtnDisabled()}
              type="submit"
              severity="warning"
              className="border-radius-0 primary-btn"
            />
            <Button
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
      <DataTableComponent
        columns={columns}
        data={availableDriverData}
        selectionMode={selectionMode === "single" ? "radiobutton" : "checkbox"}
        selectedData={selectedDrivers}
        onSelectionChange={handleSelectionChange}
        renderColumn={customRender}
        totalRecords={driverListData?.total_items}
        onPageChange={onPageChange}
        dataKey="driver_lookup_id"
        // isDataSelectable={isRowSelectable}
        emptyMessage={() => (
          <div
            className="d-flex justify-content-center flex-column mx-auto"
            style={{ width: "max-content" }}
          >
            <p className=" d-flex align-items-center justify-content-center p-4 mb-4 gap-2">
              <Img name="no-result"></Img>No Results Found
            </p>
          </div>
        )}
      />
    </>
  );
};

export default ChooseAdditionalDriverTable;
