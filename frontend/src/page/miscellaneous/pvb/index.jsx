import React, { useEffect, useRef, useState } from "react";
import BBreadCrumb from "../../../components/BBreadCrumb";
import { Link, useLocation } from "react-router-dom";
import DataTableComponent from "../../../components/DataTableComponent";
import Img from "../../../components/Img";
import { Menu } from "primereact/menu";
import { useNavigate } from "react-router-dom";
import { TimeFormat, yearMonthDate } from "../../../utils/dateConverter";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Badge } from "primereact/badge";
import { Divider } from "primereact/divider";
import {
  useAssociatePvbBatmMutation,
  useLazyExportManagePvbQuery,
  useLazyGetpvbQuery,
  usePvbPostBATMMutation,
} from "../../../redux/api/pvbApi";
import BConfirmModal from "../../../components/BConfirmModal";
import { useCreateCaseMutation } from "../../../redux/api/medallionApi";
import { CREATE_PVB_TYPE } from "../../../utils/constants";
import "../../manage/_manage_medallian.scss";
import ExportBtn from "../../../components/ExportBtn";
import GridShowingCount from "../../../components/GridShowingCount";

const ManagePVB = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedProducts, setSelectedProducts] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(5);
  const [filterApplyList, setFilterApplyList] = useState(new Map());
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState(1);
  const [searchFilterData, setSearchFilterData] = useState({});
  const [triggerGetEzpass, { data: ezpassDetail }] = useLazyGetpvbQuery();
  const [triggerGetESearchzpass, { data: ezpassSearchDetail }] =
    useLazyGetpvbQuery();

  const [filterSearchBy, setFilterSearchBy] = useState("");
  const [triggerExport] = useLazyExportManagePvbQuery();
  const [isOpen, setIsOpen] = useState(false);
  const [currentCaseType, setCurrentCaseType] = useState("");
  const [createCase, { data, isSuccess }] = useCreateCaseMutation();
  const [lazyAssociate, { isSuccess: isAssociateSuccess }] =
    useAssociatePvbBatmMutation();

  const plateNumber = "plate_number";
  const registerState = "state";
  const vehicleBodyType = "type";
  const summonsNumber = "summons_number";
  const issueDate = "issue_date";
  const issueTime = "issue_time";
  const status = "Actions";
  const sortFieldMapping = {
    [plateNumber]: plateNumber,
    [registerState]: registerState,
    [vehicleBodyType]: vehicleBodyType,
    [summonsNumber]: summonsNumber,
    [issueDate]: issueDate,
    [issueTime]: issueTime,
    [status]: status,
  };

  const columns = [
    {
      field: plateNumber,
      header: "Plate",
      headerAlign: "left",
      bodyAlign: "left",
      sortable: true,
      filter: true,
    },
    {
      field: registerState,
      header: "State",
      headerAlign: "left",
      sortable: true,
      filter: true,
    },
    { field: vehicleBodyType, header: "Type", sortable: true, filter: true },
    { field: summonsNumber, header: "Summons", sortable: true, filter: true },
    { field: issueDate, header: "Issue Date", sortable: true, filter: true },
    { field: issueTime, header: "Issue Time", sortable: true, filter: true },
    { field: status, header: "", sortable: false, filter: false },
  ];

  const filterVar = {
    [plateNumber]: {
      value: "",
      matchMode: "customFilter",
      label: "Plate",
      data: [],
      formatType: "Search",
    },
    [registerState]: {
      value: "",
      matchMode: "customFilter",
      label: "State",
      data: [],
      formatType: "Search",
    },
    [vehicleBodyType]: {
      value: "",
      matchMode: "customFilter",
      label: "Type",
      data: [],
      formatType: "Search",
    },
    [summonsNumber]: {
      value: "",
      matchMode: "customFilter",
      label: "Summons",
      data: [],
      formatType: "Search",
    },
    [issueDate]: {
      value: "",
      matchMode: "customFilter",
      label: "Issue Date",
      data: [],
      formatType: "date",
    },
    [issueTime]: {
      value: "",
      matchMode: "customFilter",
      label: "Issue Time",
      data: [],
      formatType: "time",
    },
    [status]: {
      value: "",
      matchMode: "customFilter",
      label: "Status",
      data: [],
      formatType: "select",
    },
  };

  const [filterData, setFilterData] = useState(filterVar);

  const menu = useRef(null);
  const [visibleColumns, setVisibleColumns] = useState({
    [plateNumber]: true,
    [registerState]: true,
    [vehicleBodyType]: true,
    [summonsNumber]: true,
    [issueDate]: true,
    [issueTime]: true,
    [status]: true,
  });

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

  const searchData = (type, value) => {
    console.log("type, value", value)
    const queryParams = new URLSearchParams({
      page: 1,
      per_page: 5,
    });

    if (type.field === plateNumber) {
      queryParams.append(plateNumber, value);
    }
    if (type.field === summonsNumber) {
      queryParams.append(summonsNumber, value);
    }
    if (type.field === issueTime) {
      queryParams.append(issueTime, value);
    }
    if (type.field === issueDate) {
      queryParams.append(issueDate, value);
    }
    if (type.field === registerState) {
      queryParams.append(registerState, value);
    }
    if (type.field === vehicleBodyType) {
      queryParams.append(vehicleBodyType, value);
    }
    console.log(queryParams?.toString())

    setFilterSearchBy(type.field);
    triggerGetESearchzpass(`?${queryParams?.toString()}`);
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
      [plateNumber]: plateNumber,
      [registerState]: registerState,
      [vehicleBodyType]: vehicleBodyType,
      [summonsNumber]: summonsNumber,
      [issueDate]: ["transaction_from_date", "transaction_to_date"],
      [issueTime]: issueTime,
      [status]: status,
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

      console.log("fieldKey : ", fieldKey)
      console.log("data : ", data)

      if (Array.isArray(fieldKey)) {
        updatedFilterApplyList.set(fieldKey[0], yearMonthDate(data.fromDate));
        updatedFilterApplyList.set(fieldKey[1], yearMonthDate(data.toDate));
        // updatedFilterApplyList.set(
        //   fieldKey[0],
        //   `${yearMonthDate(data.fromDate)},${yearMonthDate(data.toDate)}`
        // );
      } else if (fieldKey) {
        if (fieldKey === issueTime) {
          updatedFilterApplyList.set("issue_time_from", `${TimeFormat(data.fromTime)}`);
          updatedFilterApplyList.set("issue_time_to", `${TimeFormat(data.toTime)}`);
        } else {
          updatedFilterApplyList.set(fieldKey, data?.[0]?.name || data);
        }
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

        if (fieldKey[0] === issueDate) {
          updatedFilterApplyList.delete("transaction_from_date");
          updatedFilterApplyList.delete("transaction_to_date");
        }

        fieldKey.forEach((key) => updatedFilterApplyList.delete(key));
      } else if (fieldKey && updatedFilterApplyList.has(fieldKey)) {
        if (fieldKey === issueTime) {
          updatedFilterApplyList.delete("issue_time_from");
          updatedFilterApplyList.delete("issue_time_to");
        } else {
          updatedFilterApplyList.delete(fieldKey);
        }
      }
    }
    console.log(updatedFilterApplyList);

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
      setVehicles(ezpassDetail.items);
    }
  }, [ezpassDetail]);
  const handleSearchItemChange = (newItems) => {
    setSearchFilterData((prev) => ({
      ...prev,
      [filterSearchBy]: newItems,
    }));
  };
  useEffect(() => {
    if (ezpassSearchDetail) {
      if (filterSearchBy === summonsNumber) {
        const data = ezpassSearchDetail.items.map((item) => ({
          name: item[summonsNumber],
          id: item.id,
        }));
        handleSearchItemChange(data);
      }
      if (filterSearchBy === issueTime) {
        const data = ezpassSearchDetail.items.map((item) => ({
          name: item[issueTime],
          id: item.id,
        }));
        handleSearchItemChange(data);
      }
      if (filterSearchBy === plateNumber) {
        const data = ezpassSearchDetail.items.map((item) => ({
          name: item[plateNumber],
          id: item.id,
        }));
        handleSearchItemChange(data);
      }
      if (filterSearchBy === registerState) {
        const data = ezpassSearchDetail.items.map(item => ({
          name: item[registerState],
          id: item.id
        }));
        handleSearchItemChange(data)
      }
      if (filterSearchBy === vehicleBodyType) {
        const data = ezpassSearchDetail.items.map((item) => ({
          name: item[vehicleBodyType],
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
    if (column.field === "Actions") {
      return (
        <div className="d-flex align-items-center gap-4">
          <Button
            onClick={() => navigate(`/miscellaneous/manage-pvb/${rowData?.id}`)}
            className="manage-table-action-svg"
            icon={<Img name="eye" alt="Car" />}
          ></Button>
        </div>
      );
    }
    if (column.field === plateNumber) {
      return <p>{rowData?.[column?.field]}</p>;
    }
    if (column.field === issueDate) {
      return <p>{yearMonthDate(rowData?.[column?.field])}</p>;
    }
    return rowData[column.field] || "-";
  };
  const refreshFunc = () => {
    triggerSearch({ page: page, limit: rows });
  };

  const visibleCount = Object.values(visibleColumns).filter(Boolean).length;
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
          to={`/miscellaneous/manage-pvb`}
          className="font-semibold text-black"
        >
          Manage PVB Data
        </Link>
      ),
    },
  ];

  const createNewCase = (caseType) => {
    setCurrentCaseType(caseType);
    createCase(caseType);
  };
  useEffect(() => {
    if (isSuccess) {
      const path = `/pvb-trips/case/${currentCaseType}/${data.case_no}`;
      navigate(path);
    }
  }, [isSuccess]);

  const handleAssociate = () => {
    lazyAssociate();
  };

  useEffect(() => {
    if (isAssociateSuccess) {
      refreshFunc();
    }
  }, [isAssociateSuccess]);

  const [handlePostBATMApi] = usePvbPostBATMMutation();
  const handlePostBATM = async () => {
    return await handlePostBATMApi().then(() => {
      refreshFunc();
    });
  };

  return (
    <div className="common-layout w-100 h-100 d-flex flex-column gap-4">
      <div>
        <BBreadCrumb breadcrumbItems={items} separator={"/"} />
        <div className="d-flex align-items-center justify-content-between w-100">
          <div>
            <p className="topic-txt">Manage PVB Data</p>
            <GridShowingCount rows={rows} total={ezpassDetail?.total_items} />
            {/* <p className='regular-text text-grey'>Showing {rows} of <span data-testid="total_item_count">{ezpassDetail?.total_items}</span> Lists... </p> */}
          </div>
          <div className="d-flex gap-3">
            <Menu model={menuItems} popup ref={menu} />
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
        <div className="d-flex justify-content-end">
          {location.pathname === "/pvb-trips" ? (
            <>
              <Button
                data-testid="ic_associate"
                text
                onClick={handleAssociate}
                className="regular-text gap-2 d-flex"
                icon={() => <Img name="ic_associate" className={"icon-blue"} />}
              >
                Associate with BATM
              </Button>
              <Divider layout="vertical" />
              <Button
                data-testid="post-batm"
                text
                onClick={handlePostBATM}
                className="regular-text gap-2 d-flex"
                icon={() => <Img name="batm" className={"icon-blue"} />}
              >
                Post to BATM
              </Button>
              <Divider layout="vertical" />
              <Button
                data-testid="create-pvb"
                text
                onClick={() => setIsOpen(true)}
                className="regular-text gap-2 d-flex"
                icon={() => <Img name="add" className={"icon-blue"} />}
              >
                Create PVB
              </Button>
              <Divider layout="vertical" />
            </>
          ) : null}
          <ExportBtn
            {...{
              sortFieldMapping,
              sortField,
              sortOrder,
              triggerExport,
              filterApplyList,
              fileName: `pvb_`,
            }}
          ></ExportBtn>
          {/* <Button data-testid="export-btn" text onClick={exportFile} className='regular-text gap-2 d-flex' icon={() => <Img name="ic_export" />} >Export as .XLS</Button> */}
        </div>
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
      <BConfirmModal
        isOpen={isOpen}
        title={"Confirmation on Create PVB"}
        message={
          "This will create a New Create PVB case. Are you sure to proceed?"
        }
        onCancel={() => {
          setIsOpen(false);
        }}
        onConfirm={() => {
          setIsOpen(false);
          createNewCase(CREATE_PVB_TYPE);
        }}
      ></BConfirmModal>
    </div>
  );
};

export default ManagePVB;
