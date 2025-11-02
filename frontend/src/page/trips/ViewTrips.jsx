import React, { useEffect, useRef, useState } from "react";
import BBreadCrumb from "../../components/BBreadCrumb";
import { Link } from "react-router-dom";
import DataTableComponent from "../../components/DataTableComponent";
import Img from "../../components/Img";
import { Menu } from "primereact/menu";
import { useNavigate } from "react-router-dom";
import { yearMonthDate } from "../../utils/dateConverter";
import { Button } from "primereact/button";
import { Badge } from "primereact/badge";
import { Divider } from "primereact/divider";
import gridColFilterTemplate from "../../components/BGridColFilterTemplate";
import { generateFieldObject } from "../../utils/generateFieldObject";
import "../manage/_manage_medallian.scss";
import {
  useLazyExportCurbQuery,
  useLazyGetCurbQuery,
} from "../../redux/api/curbApi";
import GridShowingCount from "../../components/GridShowingCount";
import ExportBtn from "../../components/ExportBtn";
import { filterSelectGenerate } from "../../utils/utils";
import { formatLabel } from "../../utils/gridUtils";

const ViewTrips = () => {
  const menu = useRef(null);
  const navigate = useNavigate();
  const [selectedProducts, setSelectedProducts] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(5);
  const [filterApplyList, setFilterApplyList] = useState(new Map());
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState(1);
  const [searchFilterData, setSearchFilterData] = useState({});
  const [triggerGetEzpass, { data: ezpassDetail, isSuccess }] =
    useLazyGetCurbQuery();
  const [triggerGetSearchEzpass, { data: ezpassSearchDetail }] =
    useLazyGetCurbQuery();
  console.log("View Trips", ezpassDetail);

  const [filterSearchBy, setFilterSearchBy] = useState("");

  const tripId = "trip_id";
  const medallionNumber = "medallion_number";
  const driverId = "driver_id";
  const cabNumber = "cab_number";
  const tlcLicenseNumber = "tlc_license_number";
  const resolutionStatus = "status";
  const fields = [
    { key: "trip_id", label: "Trip ID", formatType: "search" },
    {
      key: "trip_start_date",
      label: "Trip Start Date",
      formatType: "date",
    },
    {
      key: "trip_end_date",
      label: "Trip End Date",
      formatType: "date",
    },
    {
      key: "start_time",
      label: "Trip Start Time",
      formatType: "time",
    },
    {
      key: "end_time",
      label: "Trip End Time",
      formatType: "time",
    },
    { key: "driver_id", label: "Driver ID", formatType: "search" },
    { key: "cab_number", label: "Vehicle Plate", formatType: "Search" },
    { key: "medallion_number", label: "Medallion No", formatType: "Search" },
    {
      key: "tlc_license_number",
      label: "TLC License No",
      formatType: "Search",
    },
    {
      key: "total_amount",
      label: "Total Amount",
      formatType: "Search",
    },
    {
      key: "payment_type",
      label: "Payment Mode",
      formatType: "select",
    },
    // { key: "status", label: "Status", formatType: "Search" },
    {
      key: "m_status",
      label: "",
      formatType: "select",
      filter: false,
      sortable: false,
    },
  ];

  const { sortFieldMapping, columns, filterVar, visibleColumns, fieldMapping } =
    generateFieldObject(fields);

  const [filterData, setFilterData] = useState(filterVar);
  const [visibleColumnsState, setVisibleColumnsState] =
    useState(visibleColumns);

  const handleColumnVisibilityChange = (field) => {
    setVisibleColumnsState((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };
  const handleSearchItemChange = (newItems) => {
    setSearchFilterData((prev) => ({
      ...prev,
      [filterSearchBy]: newItems,
    }));
  };

  const filteredColumns = Object.values(visibleColumnsState).every(
    (isVisible) => !isVisible
  )
    ? columns
    : columns.filter((col) => visibleColumnsState[col.field]);

  const searchData = (type, value) => {
    const queryParams = new URLSearchParams({
      page: 1,
      per_page: 5,
    });

    if (type.field === tripId) {
      queryParams.append(tripId, value);
    }
    if (type.field === resolutionStatus) {
      queryParams.append(resolutionStatus, value);
    }
    if (type.field === medallionNumber) {
      queryParams.append(medallionNumber, value);
    }
    if (type.field === driverId) {
      queryParams.append(driverId, value);
    }

    setFilterSearchBy(type.field);
    triggerGetSearchEzpass(`?${queryParams?.toString()}`);
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
    triggerGetEzpass(`?${queryParams?.toString()}`);
  };

  useEffect(() => {
    triggerSearch({ page: 1, limit: 5 });
  }, []);

  const clearAllFilter = () => {
    setFilterApplyList(new Map());
    setFilterData((prevState) => {
      const updatedState = { ...prevState };

      Object.keys(updatedState).forEach((field) => {
        updatedState[field].value = "";
        updatedState[field].filterDemoData = "";
      });

      return updatedState;
    });
  };

  const updateFilter = (option, data = null, action = "add") => {
    const updatedFilterApplyList = new Map(filterApplyList);
    const internalFieldMap = {
      cab_number: "cab_number",
      driver_id: "driver_id",
      //start_location_gps: "start_location_gps",
      // start_time: ["start_time_from", "start_time_to"],
      trip_id: "trip_id",
      trip_start_date: ["start_date_from", "start_date_to"],
      start_time: ["start_time_from", "start_time_to"],
      end_time: ["end_time_from", "end_time_to"],
    };
    const fieldKey = internalFieldMap[option.field];
    //const fieldKey = fieldMapping[option.field];

    if (action === "add") {
      setFilterData((prevState) => ({
        ...prevState,
        [option.field]: {
          ...prevState[option.field],
          value: "ff",
          filterDemoData: data,
        },
      }));

      if (Array.isArray(fieldKey)) {
        if (
          fieldKey[0] === "start_time_from" ||
          fieldKey[1] === "start_time_to" ||
          fieldKey[0] === "end_time_from" ||
          fieldKey[1] === "end_time_to"
        ) {
          console.log("transaction_from", data);
          updatedFilterApplyList.set(
            fieldKey[0],
            data.fromTime.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          );
          updatedFilterApplyList.set(
            fieldKey[1],
            data.toTime.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          );
        } else {
          updatedFilterApplyList.set(
            fieldKey[0],
            `${yearMonthDate(data.fromDate)}`
          );
          updatedFilterApplyList.set(
            fieldKey[1],
            `${yearMonthDate(data.toDate)}`
          );
        }

        // updatedFilterApplyList.set(
        //   fieldKey[0],
        //   `${yearMonthDate(data.fromDate)},${yearMonthDate(data.toDate)}`
        // );
      } else if (fieldKey) {
        updatedFilterApplyList.set(fieldKey, data?.[0]?.name || data);
      }
    } else if (action === "remove") {
      setFilterData((prevState) => ({
        ...prevState,
        [option.field]: {
          ...prevState[option.field],
          value: "",
          filterDemoData: "",
        },
      }));
      if (Array.isArray(fieldKey)) {
        fieldKey.forEach((key) => updatedFilterApplyList.delete(key));
      } else if (fieldKey && updatedFilterApplyList.has(fieldKey)) {
        updatedFilterApplyList.delete(fieldKey);
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

  const filterApply = (option, data) => {
    if (data) {
      updateFilter(option, data, "add");
    }
  };

  useEffect(() => {
    setPage(1);
    setRows(5);
    triggerSearch({ page: 1, limit: 5 });
  }, [filterApplyList]);

  useEffect(() => {
    if (ezpassDetail) {
      setVehicles(ezpassDetail?.items);

      setFilterData((prev) => ({
        ...prev,
        payment_type: {
          ...prev["payment_type"],
          data:
            ezpassDetail?.filters?.payment_type?.options?.map((opt) => ({
              label: opt.label,
              value: opt.value,
            })) || [],
        },
      }));
    }
  }, [ezpassDetail, isSuccess]);

  useEffect(() => {
    if (ezpassSearchDetail) {
      if (filterSearchBy === tripId) {
        const data = ezpassSearchDetail.items.map((item) => ({
          name: item[tripId],
          id: item.id,
        }));
        handleSearchItemChange(data);
      }
      if (filterSearchBy === cabNumber) {
        const data = ezpassSearchDetail.items.map((item) => ({
          name: item[cabNumber],
          id: item.id,
        }));
        handleSearchItemChange(data);
      }
      if (filterSearchBy === medallionNumber) {
        const data = ezpassSearchDetail.items.map((item) => ({
          name: item[medallionNumber],
          id: item.id,
        }));
        handleSearchItemChange(data);
      }
      if (filterSearchBy === driverId) {
        const data = ezpassSearchDetail.items.map((item) => ({
          name: item[driverId],
          id: item.id,
        }));
        handleSearchItemChange(data);
      }
      if (filterSearchBy === tlcLicenseNumber) {
        const data = ezpassSearchDetail.items.map((item) => ({
          name: item[tlcLicenseNumber],
          id: item.id,
        }));
        handleSearchItemChange(data);
      }
    }
  }, [ezpassSearchDetail]);

  const onPageChange = (data) => {
    setRows(data.rows);
    triggerSearch({ page: Number(data.page) + 1, limit: data.rows });
  };

  const customRender = (column, rowData) => {
    if (column.field === "m_status") {
      return (
        <div className="d-flex align-items-center gap-4">
          {/* <Button className="w-15" icon={<Img name="pencil_edit" alt="Car" />}></Button> */}
          <Button
            onClick={() => navigate(`/view-trips/${rowData["trip_id"]}`)}
            className="manage-table-location-svg"
            icon={<Img name="location" alt="location" />}
          ></Button>
        </div>
      );
    }
    if (column.field === tripId) {
      return (
        <p
          style={{ color: "#1056EF", cursor: "pointer" }}
          onClick={() => navigate(`/view-trips/${rowData["trip_id"]}`)}
        >
          {rowData?.[column?.field]}
        </p>
      );
    }
    if (column.field === tlcLicenseNumber) {
      return <p>{rowData?.[column?.field]}</p>;
    }
    if (column.field === driverId) {
      return (
        <>
          <p>{rowData?.[column?.field]}</p>
          <p>Andrews JB</p>
        </>
      );
    }
    if (column.field === "total_amount") {
      return (
        <>
          <p>{"$" + rowData?.[column?.field]}</p>
        </>
      );
    }
    if (column.field === "start_time") {
      return (
        <>
          <p>{rowData?.start_time}</p>
        </>
      );
    }
    if (column.field === "end_time") {
      return (
        <>
          <p>{rowData?.end_time}</p>
        </>
      );
    }
    return rowData[column.field] || "-";
  };

  const refreshFunc = () => {
    triggerSearch({ page: page, limit: rows });
  };

  const visibleCount =
    Object.values(visibleColumnsState).filter(Boolean).length;

  const items = [
    {
      template: () => (
        <Link to="/" className="font-semibold text-grey">
          Home
        </Link>
      ),
    },
    {
      template: () => (
        <Link to="/view-trips" className="font-semibold text-grey">
          Trips
        </Link>
      ),
    },
    {
      template: () => (
        <Link to={`/view-trips`} className="font-semibold text-black">
          View Trips
        </Link>
      ),
    },
  ];

  const [triggerExport] = useLazyExportCurbQuery();

  return (
    <div className="common-layout w-100 h-100 d-flex flex-column gap-4">
      <div>
        <BBreadCrumb breadcrumbItems={items} separator={"/"} />
        <div className="d-flex align-items-center justify-content-between w-100">
          <div>
            <p className="topic-txt">View Trips</p>
            <GridShowingCount rows={rows} total={ezpassDetail?.total_items} />
            {/* <p className='regular-text text-grey'>Showing {rows} of <span data-testid="total_item_count">{ezpassDetail?.total}</span> Lists... </p> */}
          </div>
          <div className="d-flex gap-3">
            <Menu
              model={gridColFilterTemplate(
                columns,
                visibleColumnsState,
                handleColumnVisibilityChange
              )}
              popup
              ref={menu}
            />
            <Button
              data-testid="column-filter-btn"
              text
              onClick={(e) => menu.current.toggle(e)}
              className="d-flex justify-content-center w-auto align-items-center position-relative"
              icon={() => <Img name={"ic_column_filter"} />}
            >
              {visibleCount > 0 && (
                <Badge
                  className="badge-icon"
                  value={visibleCount}
                  severity="warning"
                ></Badge>
              )}
            </Button>
            <Divider layout="vertical" />
            <Button
              data-testid="refresh_btn"
              icon={() => <Img name={"refresh"} />}
              onClick={refreshFunc}
            ></Button>
          </div>
        </div>
        {vehicles.length > 0 && (
          <div className="d-flex justify-content-end">
            <span className="fw-bold">Export as:</span>
            <ExportBtn
              {...{
                sortFieldMapping,
                sortField,
                sortOrder,
                triggerExport,
                filterApplyList,
                fileName: `trip_`,
              }}
            ></ExportBtn>
            {/* <Button data-testid="export-btn" text onClick={exportFile} className='regular-text gap-2 d-flex' icon={() => <Img name="ic_export" />} >Export as .XLS</Button> */}
          </div>
        )}
      </div>
      <DataTableComponent
        columns={filteredColumns}
        data={vehicles}
        selectedData={selectedProducts}
        onSelectionChange={(e) => setSelectedProducts(e.value)}
        renderColumn={customRender}
        onPageChange={onPageChange}
        totalRecords={ezpassDetail?.total_items}
        dataKey="id"
        filterData={filterData}
        filterSearchData={searchFilterData}
        clearAllFilter={clearAllFilter}
        clearFilter={clearFilter}
        pSortField={sortField}
        pSortOrder={sortOrder}
        searchData={searchData}
        filterApply={filterApply}
        onSortApply={onSortApply}
        filterSearchBy={filterSearchBy}
      />
    </div>
  );
};

export default ViewTrips;
