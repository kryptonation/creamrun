import { Button } from "primereact/button";
import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Img from "../../../components/Img";
import { Divider } from "primereact/divider";
import DataTableComponent from "../../../components/DataTableComponent";
import { Menu } from "primereact/menu";
import {
  useLazyExportDriversQuery,
  useSearchDriverMutation,
} from "../../../redux/api/driverApi";
import { Checkbox } from "primereact/checkbox";
import { Badge } from "primereact/badge";
import { yearMonthDate } from "../../../utils/dateConverter";
import BBreadCrumb from "../../../components/BBreadCrumb";
import { useLazyViewInspectionQuery } from "../../../redux/api/vehicleApi";
import { handleExport } from "../../../utils/gridUtils";

const ViewInspection = () => {
  const params = useParams();
  const [triggerExport] = useLazyExportDriversQuery();

  const [selectedProducts, setSelectedProducts] = useState(null);

  const inspectionType = "inspection_type";
  const medallionNumber = "medallion_number";
  const mileRun = "mile_run";
  const inspectionDate = "inspection_date";
  const odometerReading = "odometer_reading";
  const result = "result";
  const nextInspectionDueDate = "next_inspection_due_date";

  const columns = [
    {
      field: inspectionDate,
      header: "Inspection Date",
      headerAlign: "left",
      bodyAlign: "left",
      filter: true,
      sortable: true,
    },
    {
      field: medallionNumber,
      header: "Medallion Number",
      headerAlign: "left",
      bodyAlign: "left",
      filter: true,
      sortable: true,
    },
    {
      field: inspectionType,
      header: "Type",
      sortable: true,
      filter: true,
      headerAlign: "left",
    },
    {
      field: mileRun,
      header: "Mile Run",
      sortable: true,
      filter: true,
    },
    {
      field: odometerReading,
      header: "Odometer Reading",
      sortable: true,
      filter: true,
    },
    { field: result, header: "Result", sortable: true, filter: true },
    {
      field: nextInspectionDueDate,
      header: "Next Inspection Due",
      sortable: true,
      filter: true,
    },
    { field: "m_status", header: "" },
  ];

  const [filterData, setFilterData] = useState({
    [inspectionDate]: {
      value: "",
      matchMode: "customFilter",
      label: "Inspection Date",
      data: [],
      formatType: "date",
    },
    [medallionNumber]: {
      value: "",
      matchMode: "customFilter",
      label: "Medallion Number",
      data: [],
      formatType: "Search",
    },
    [inspectionType]: {
      value: "",
      matchMode: "customFilter",
      label: "Select Inspection Type",
      data: [
        { label: "WAV", value: "Wav" },
        { label: "WAV Hybrid", value: "Wav Hybrid" },
        { label: "WAV Gas", value: "Wav Gas" },
        { label: "Non-WAV Hybrid", value: "Non-Wav Hybrid" },
        { label: "Non-WAV Gas", value: "Non-WAV Gas" },
        { label: "Regular", value: "Regular" },
      ],
      formatType: "select",
    },
    [mileRun]: {
      value: "",
      matchMode: "customFilter",
      label: "Select Mile Run",
      data: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ],
      formatType: "select",
    },
    [odometerReading]: {
      value: "",
      matchMode: "customFilter",
      label: "Odometer Reading",
      data: [],
      formatType: "Search",
    },
    [result]: {
      value: "",
      matchMode: "customFilter",
      label: "Result",
      data: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ],
      formatType: "select",
    },
    [nextInspectionDueDate]: {
      value: "",
      matchMode: "customFilter",
      data: [],
      label: "DMV License Expriy",
      formatType: "Search",
    },
  });

  const menu = useRef(null);
  const [visibleColumns, setVisibleColumns] = useState({
    [inspectionDate]: true,
    [medallionNumber]: true,
    [inspectionType]: true,
    [mileRun]: true,
    [odometerReading]: true,
    [result]: true,
    [nextInspectionDueDate]: true,
    m_status: true,
  });

  // const handleExport = async () => {
  //     try {
  //         const queryParams = new URLSearchParams({

  //         });

  //         if (sortField) {
  //             const apiSortField = sortFieldMapping[sortField] || sortField;
  //             const order = sortOrder === 1 ? "asc" : "desc";
  //             queryParams.append("sort_by", apiSortField);
  //             queryParams.append("sort_order", order);
  //         }
  //         filterApplyList.forEach((value, key) => {
  //             queryParams.append(key, value);
  //         });
  //         const blob = await triggerExport(`?${queryParams?.toString()}`).unwrap();

  //         const url = window.URL.createObjectURL(blob);
  //         const a = document.createElement('a');
  //         a.href = url;
  //         const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, "");
  //         a.download = `driver_${timestamp}.csv`;

  //         document.body.appendChild(a);
  //         a.click();
  //         a.remove();
  //         window.URL.revokeObjectURL(url);
  //     } catch (error) {
  //         console.error('Export failed:', error);
  //     }
  // };

  const exportFile = () => {
    handleExport({
      sortFieldMapping,
      sortField,
      sortOrder,
      triggerExport,
      filterApplyList,
      fileName: `driver_`,
    });
  };

  const menuItems = columns.map((col) => ({
    template: (
      <div className="p-field-checkbox d-flex align-items-center p-2">
        <Checkbox
          inputId={col.field}
          checked={visibleColumns[col.field]}
          onChange={() => handleColumnVisibilityChange(col.field)}
        />
        <label className="p-1" htmlFor={col.field}>
          {col.header ? col.header : col.field}
        </label>
      </div>
    ),
  }));

  const handleColumnVisibilityChange = (field) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const filteredColumns = Object.values(visibleColumns).every(
    (isVisible) => !isVisible
  )
    ? columns
    : columns.filter((col) => visibleColumns[col.field]);

  const customRender = (column, rowData) => {
    console.log(column.field);

    if (column.field === inspectionDate) {
      return <p>{rowData?.[inspectionDate]}</p>;
    }
    if (column.field === medallionNumber) {
      return <p>{rowData?.[medallionNumber] || "-"}</p>;
    } else if (column.field === inspectionType) {
      return <p>{rowData?.[inspectionType]}</p>;
    } else if (column.field === mileRun) {
      return <p>{rowData?.[mileRun] ? "YES" : "NO"}</p>;
    } else if (column.field === odometerReading) {
      return (
        <div>
          <p>{rowData?.[odometerReading]}</p>
        </div>
      );
    } else if (column.field === result) {
      return (
        <div>
          <p>{rowData?.[result]}</p>
        </div>
      );
    } else if (column.field === nextInspectionDueDate) {
      return <p>{rowData?.[nextInspectionDueDate] || "-"}</p>;
    } else if (column.field === "m_status") {
      return (
        <Link to={`${rowData.id}`}>
          <Img name="inspect"></Img>
        </Link>
      );
    }
    return [column.field];
  };

  const [rows, setRows] = useState(5);
  const [page, setPage] = useState(1);
  const sortFieldMapping = {
    driver_id: "first_name",
    driver_type: "driver_type",
    lease_info: "lease_type",
    tlc_license_number: "tlc_license_number",
    tlc_license_expriy: "tlc_license_expriy",
    dmv_license_number: "dmv_license_number",
    dmv_license_expriy: "dmv_license_expriy",
    m_status: "driver_status",
  };

  const triggerSearch = ({
    page,
    limit,
    sField = sortField,
    sOrder = sortOrder,
  }) => {
    const queryParams = new URLSearchParams({
      page,
      per_page: limit,
      vin_numbers: params["id"],
    });

    if (sField) {
      const apiSortField = sortFieldMapping[sField] || sField;
      const order = sOrder === 1 ? "asc" : "desc";
      queryParams.append("sort_by", apiSortField);
      queryParams.append("sort_order", order);
    }

    filterApplyList.forEach((value, key) => {
      queryParams.append(key, value);
    });

    triggerSearchQuery(`?${queryParams.toString()}`);
  };

  const onPageChange = (data) => {
    setPage(Number(data.page) + 1);
    setRows(data.rows);
    triggerSearch({ page: Number(data.page) + 1, limit: data.rows });
  };
  const filterApply = (option, data) => {
    console.log(data);
    console.log(option);

    if (data) {
      updateFilter(option, data, "add");
    }
    console.log(filterApplyList, "filterMap");
  };

  const triggerSearchDriver = (queryParams) => {
    if (queryParams.toString()) {
      triggerSearchDriverQuery(`?${queryParams.toString()}`);
    }
  };
  const [filterSearchBy, setFilterSearchBy] = useState(false);

  const searchData = (type, value) => {
    const queryParams = new URLSearchParams();
    if (type.field === "driver_lookup_id") {
      queryParams.append("driver_id", value);
    } else if (type.field === "tlc_license_number") {
      queryParams.append("tlc_license_number", value);
    } else if (type.field === "dmv_license_number") {
      queryParams.append("dmv_license_number", value);
    }
    setFilterSearchBy(type.field);
    triggerSearchDriver(queryParams);
  };

  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState(1);
  const [searchFilterData, setSearchFilterData] = useState([]);

  //   const [driverIDFilter, setDriverIdFilter] = useState([]);
  const [filterApplyList, setFilterApplyList] = useState(new Map());

  const clearAllFilter = () => {
    setFilterApplyList(new Map());
    setFilterData((prevState) => {
      const updatedState = { ...prevState };

      Object.keys(updatedState).forEach((field) => {
        updatedState[field].value = "";
      });

      return updatedState;
    });
  };

  const fieldMapping = {
    driver_lookup_id: "driver_id",
    driver_type: "driver_type",
    lease_info: "lease_type",
    tlc_license_number: "tlc_license_number",
    dmv_license_number: "dmv_license_number",
    tlc_license_expriy: ["tlc_license_expiry_from", "tlc_license_expiry_to"],
    dmv_license_expriy: ["dmv_license_expiry_from", "dmv_license_expiry_to"],
    driver_status: "driver_status",
  };

  const updateFilter = (option, data = null, action = "add") => {
    const updatedFilterApplyList = new Map(filterApplyList);

    const fieldMapping = {
      [inspectionDate]: [inspectionDate],
      [inspectionType]: inspectionType,
      [mileRun]: mileRun,
      [odometerReading]: odometerReading,
      [result]: result,
      // [nextInspectionDueDate]: ["tlc_license_expiry_from", "tlc_license_expiry_to"],
      // dmv_license_expriy: ["dmv_license_expiry_from", "dmv_license_expiry_to"],
      // driver_status: "driver_status",
    };

    const fieldKey = fieldMapping[option.field];

    if (filterData) {
      if (action === "add") {
        // Update the filterData's value
        if (Array.isArray(fieldKey)) {
          // Handle the case for multiple fields, like 'fromDate' and 'toDate'
          setFilterData((prevState) => ({
            ...prevState,
            [option.field]: { ...prevState[option.field], value: "ff" },
          }));
          updatedFilterApplyList.set(fieldKey[0], yearMonthDate(data.fromDate));
          updatedFilterApplyList.set(fieldKey[1], yearMonthDate(data.toDate));
        } else if (fieldKey) {
          if (Array.isArray(data)) {
            const value = data.map((item) => item.name).join(",");

            setFilterData((prevState) => ({
              ...prevState,
              [option.field]: { ...prevState[option.field], value: "ff" },
            }));
            updatedFilterApplyList.set(fieldKey, value);
          } else {
            const value = data.name || data;
            setFilterData((prevState) => ({
              ...prevState,
              [option.field]: { ...prevState[option.field], value: "ff" },
            }));
            updatedFilterApplyList.set(fieldKey, value);
          }
        }
      } else if (action === "remove") {
        // Handle removal of filter values
        setFilterData((prevState) => ({
          ...prevState,
          [option.field]: { ...prevState[option.field], value: "" },
        }));
        if (Array.isArray(fieldKey)) {
          fieldKey.forEach((key) => {
            updatedFilterApplyList.delete(key);
          });
        } else if (fieldKey && updatedFilterApplyList.has(fieldKey)) {
          updatedFilterApplyList.delete(fieldKey);
        }
      }
    }
    setFilterApplyList(updatedFilterApplyList);
  };

  const clearFilter = (option) => {
    updateFilter(option, null, "remove");
  };
  const onSortApply = (field, order) => {
    setSortOrder(() => {
      return order;
    });
    setSortField(() => {
      return field;
    });
    setPage(1);
    setRows(5);
    triggerSearch({ page: 1, limit: 5, sField: field, sOrder: order });
  };
  const [triggerSearchQuery, { data: driverDetail }] =
    useLazyViewInspectionQuery();

  const [triggerSearchDriverQuery, { data: driverSearchDetail }] =
    useSearchDriverMutation();

  useEffect(() => {
    setPage(1);
    setRows(5);
    triggerSearch({ page: 1, limit: 5 });
  }, [filterApplyList]);

  useEffect(() => {
    if (driverSearchDetail) {
      if (filterSearchBy === "driver_lookup_id") {
        const data = driverSearchDetail.items.map((driver) => ({
          name: driver.driver_lookup_id,
          id: driver.driver_id,
        }));
        setSearchFilterData(data);
      } else if (filterSearchBy === "tlc_license_number") {
        const data = driverSearchDetail.items.map((driver) => ({
          name: driver.license_info?.tlc_license?.number,
          id: driver.driver_id,
        }));
        setSearchFilterData(data);
      } else if (filterSearchBy === "dmv_license_number") {
        const data = driverSearchDetail.items.map((driver) => ({
          name: driver.license_info?.dmv_license?.number,
          id: driver.driver_id,
        }));
        setSearchFilterData(data);
      }
    }
  }, [driverSearchDetail]);

  const visibleCount = Object.values(visibleColumns).filter(Boolean).length;

  const breadcrumbItems = [
    {
      label: "Home",
      template: () => (
        <Link to="/" className="font-semibold text-grey">
          Home
        </Link>
      ),
    },
    {
      label: "Vehicle",
      template: () => (
        <Link to="/manage-vehicle" className="font-semibold text-grey">
          Vehicle
        </Link>
      ),
    },
    {
      label: "Manage vehicle",
      template: () => (
        <Link to={`/manage-vehicle`} className="font-semibold text-grey">
          Manage vehicle
        </Link>
      ),
    },
    {
      label: "id",
      template: () => (
        <Link
          to={`/manage-vehicle/view-inspection/${params["id"]}`}
          className="font-semibold text-black"
        >
          {params["id"]}
        </Link>
      ),
    },
  ];

  const refreshFunc = () => {
    triggerSearch({ page: page, limit: rows });
  };

  return (
    <div className="common-layout w-100 h-100 d-flex flex-column gap-4">
      <div>
        <BBreadCrumb breadcrumbItems={breadcrumbItems} separator="/" />
        <div className="d-flex align-items-center justify-content-between w-100">
          <p className="topic-txt">View Inspection</p>
          <div className="d-flex gap-3">
            {/* <Button icon={() => <Img name={"trash"} />}></Button> */}
            {/* <Divider layout="vertical" /> */}
            <Menu model={menuItems} popup ref={menu} />
            <div
              className="d-flex justify-content-center align-items-center position-relative"
              style={{ width: 40 }}
            >
              <Button
                icon={() => <Img name={"ic_column_filter"} />}
                onClick={(e) => menu.current.toggle(e)}
              ></Button>
              {visibleCount > 0 && (
                <Badge
                  className="badge-icon"
                  value={visibleCount}
                  severity="warning"
                ></Badge>
              )}
            </div>
            {/* <Divider layout="vertical" />
                        <Button icon={() => <Img name={"vector"} />}></Button> */}
            <Divider layout="vertical" />
            <Button
              onClick={() => refreshFunc(page, rows)}
              icon={() => <Img name={"refresh"} />}
            ></Button>
          </div>
        </div>
        {/* <div className="d-flex justify-content-end py-2">
                    <Button text onClick={exportFile} icon={() => <Img name="ic_export" />} >Export as .XLS</Button>
                </div> */}
      </div>
      <DataTableComponent
        columns={filteredColumns}
        data={driverDetail?.items}
        selectionMode="checkbox"
        filterData={filterData}
        filterApply={filterApply}
        onSortApply={onSortApply}
        selectedData={selectedProducts}
        onSelectionChange={(e) => setSelectedProducts(e.value)}
        renderColumn={customRender}
        onPageChange={onPageChange}
        emptyMessage={"No records found"}
        totalRecords={driverDetail?.total_items}
        searchData={searchData}
        dataKey="id"
        pSortField={sortField}
        pSortOrder={sortOrder}
        filterSearchData={searchFilterData}
        clearAllFilter={clearAllFilter}
        clearFilter={clearFilter}
        filterSearchBy={filterSearchBy}
        filterApplyList={filterApplyList}
        fieldMapping={fieldMapping}
      />
    </div>
  );
};

export default ViewInspection;
