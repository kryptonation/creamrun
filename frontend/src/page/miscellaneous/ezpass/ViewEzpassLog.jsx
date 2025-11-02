import React, { useEffect, useRef, useState } from "react";
import BBreadCrumb from "../../../components/BBreadCrumb";
import { Link } from "react-router-dom";
import DataTableComponent from "../../../components/DataTableComponent";
import Img from "../../../components/Img";
import { Menu } from "primereact/menu";
import { useNavigate } from "react-router-dom";
import { yearMonthDate } from "../../../utils/dateConverter";
import { Button } from "primereact/button";
import { Badge } from "primereact/badge";
import { Divider } from "primereact/divider";
import gridColFilterTemplate from "../../../components/BGridColFilterTemplate";
import { generateFieldObject } from "../../../utils/generateFieldObject";
import { filterSelectGenerate } from "../../../utils/utils";
import {
  useLazyExportEzpassLogsQuery,
  useLazyGetEzpassLogsQuery,
} from "../../../redux/api/ezpassApi";
import GridShowingCount from "../../../components/GridShowingCount";
import ExportBtn from "../../../components/ExportBtn";

const ViewEzpassLog = () => {
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
  const [
    triggerGetEzpass,
    { data: ezpassDetail, isSuccess: isGridDataSuccess, isFetching },
  ] = useLazyGetEzpassLogsQuery();
  const [triggerGetSearchEzpass, { data: ezpassSearchDetail }] =
    useLazyGetEzpassLogsQuery();
  const [filterSearchBy, setFilterSearchBy] = useState("");

  const logDate = "log_date";
  const logType = "log_type";
  const recordsImpacted = "records_impacted";
  const success = "success_count";
  const unidentifiedCount = "unidentified_count";
  const logStatus = "log_status";
  const fields = [
    { key: logDate, label: "Log Date", formatType: "date" },
    { key: logType, label: "Log Type", formatType: "select" },
    { key: recordsImpacted, label: "Records Impacted", formatType: "Search" },
    { key: success, label: "Success", formatType: "Search" },
    { key: unidentifiedCount, label: "Unidentified", formatType: "Search" },
    { key: logStatus, label: "Log Status", formatType: "select" },
  ];

  const { sortFieldMapping, columns, filterVar, visibleColumns } =
    generateFieldObject(fields);

  const [filterData, setFilterData] = useState(filterVar);
  const [visibleColumnsState, setVisibleColumnsState] =
    useState(visibleColumns);

  useEffect(() => {
    if (isGridDataSuccess) {
      setFilterData((prev) => {
        return {
          ...prev,
          log_type: {
            ...prev[logType],
            data: filterSelectGenerate(ezpassDetail?.types),
          },
          log_status: {
            ...prev[logStatus],
            data: filterSelectGenerate(ezpassDetail?.statuses),
          },
        };
      });
    }
  }, [ezpassDetail?.filter_options, isGridDataSuccess]);

  console.log(filterData);

  const handleColumnVisibilityChange = (field) => {
    setVisibleColumnsState((prev) => ({
      ...prev,
      [field]: !prev[field],
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

    // if (type.field === success) {
    //   queryParams.append(success, value);
    // }
    if (type.field === logStatus) {
      queryParams.append("log_status", value);
    }
    if (type.field === logType) {
      queryParams.append(logType, value);
    }
    if (type.field === recordsImpacted) {
      queryParams.append(recordsImpacted, value);
    }
    if (type.field === unidentifiedCount) {
      console.log("Unidentified", value);
      queryParams.append(unidentifiedCount, value);
    }
    if (type.field === success) {
      queryParams.append("success_count", value);
    }

    setFilterSearchBy(type.field);
    console.log("query params", queryParams?.toString());
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
    const fieldMapping = {
      [logDate]: ["log_from_date", "log_to_date"],
      [logType]: logType,
      [recordsImpacted]: recordsImpacted,
      [success]: "success_count",
      [unidentifiedCount]: "unidentified_count",
      [logStatus]: logStatus,
    };

    const fieldKey = fieldMapping[option.field];

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
        updatedFilterApplyList.set(
          fieldKey[0],
          `${yearMonthDate(data.fromDate)}`
        );
        updatedFilterApplyList.set(
          fieldKey[1],
          `${yearMonthDate(data.toDate)}`
        );
      }
      //  else if (fieldKey) {

      //   updatedFilterApplyList.set(fieldKey, data?.[0]?.name || data);
      // }
      else if (fieldKey) {
        let value;
        if (Array.isArray(data)) {
          // Map to just the `name` values or IDs and join them with commas
          value = data.map((item) => item.name ?? item.id ?? "").join(",");
        } else if (typeof data === "object" && data !== null) {
          value = data.name ?? data.id ?? "";
        } else {
          value = data;
        }
        updatedFilterApplyList.set(fieldKey, value);
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
    console.log("🚀 ~ filterApply ~ option, data:", option, data);
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
      setVehicles(ezpassDetail.items);
    }
  }, [ezpassDetail, isFetching]);

  const handleSearchItemChange = (newItems) => {
    setSearchFilterData((prev) => ({
      ...prev,
      [filterSearchBy]: newItems,
    }));
  };
  useEffect(() => {
    if (ezpassSearchDetail) {
      if (filterSearchBy === success) {
        const data = ezpassSearchDetail.items.map((item) => ({
          name: item["success"],
          id: item.id,
        }));
        handleSearchItemChange(data);
      }
      if (filterSearchBy === logStatus) {
        const data = ezpassSearchDetail.items.map((item) => ({
          name: item["status"],
          id: item.id,
        }));
        handleSearchItemChange(data);
      }
      if (filterSearchBy === logType) {
        const data = ezpassSearchDetail.items.map((item) => ({
          name: item[logType],
          id: item.id,
        }));
        handleSearchItemChange(data);
      }
      if (filterSearchBy === recordsImpacted) {
        const data = ezpassSearchDetail.items.map((item) => ({
          name: item[recordsImpacted],
          id: item.id,
        }));
        handleSearchItemChange(data);
      }
      if (filterSearchBy === unidentifiedCount) {
        const data = ezpassSearchDetail.items.map((item) => ({
          name: item["unidentified"],
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
            onClick={() => navigate("/view-trips/1")}
            className="manage-table-location-svg"
            icon={<Img name="location" alt="location" />}
          ></Button>
        </div>
      );
    }
    if (column.field === logDate) {
      return <p>{yearMonthDate(rowData?.[column?.field])}</p>;
    }
    if (column.field === recordsImpacted) {
      return <p>{rowData?.["records_impacted"]}</p>;
    }
    if (column.field === unidentifiedCount) {
      return <p>{rowData?.["unidentified"]}</p>;
    }
    if (column.field === success) {
      return <p>{rowData?.["success"]}</p>;
    }
    if (column.field === logStatus) {
      return <p>{rowData?.["status"]}</p>;
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
        <Link to="/miscellaneous" className="font-semibold text-grey">
          Miscellaneous
        </Link>
      ),
    },
    {
      template: () => (
        <Link
          to={`/miscellaneous/view-ezpass`}
          className="font-semibold text-black"
        >
          View EZPass Log
        </Link>
      ),
    },
  ];
  const [triggerExport] = useLazyExportEzpassLogsQuery();
  // const exportFile = () => {
  //   handleExport({
  //     sortFieldMapping,
  //     sortField,
  //     sortOrder,
  //     triggerExport,
  //     filterApplyList,
  //     fileName: `ezpass_log_`,
  //   });
  // };

  return (
    <div className="common-layout w-100 h-100 d-flex flex-column gap-4">
      <div>
        <BBreadCrumb breadcrumbItems={items} separator={"/"} />
        <div className="d-flex align-items-center justify-content-between w-100">
          <div>
            <p className="topic-txt">View EZpass Log</p>
            <GridShowingCount rows={rows} total={ezpassDetail?.total_items} />
            {/* <p className="regular-text text-grey">
              Showing {rows} of{" "}
              <span data-testid="total_item_count">{ezpassDetail?.total_items}</span>{" "}
              Lists...{" "}
            </p> */}
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
      </div>
      <div className="d-flex justify-content-end align-items-center gap-2">
        <span className="fw-bold">Export as:</span>
        <ExportBtn
          {...{
            sortFieldMapping,
            sortField,
            sortOrder,
            triggerExport,
            filterApplyList,
            fileName: `ezpass_log_`,
          }}
        ></ExportBtn>
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

export default ViewEzpassLog;
