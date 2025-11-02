import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { filterSelectGenerate } from "../../../utils/utils";
import { Checkbox } from "primereact/checkbox";
import { Badge } from "primereact/badge";
import {
  dateMonthYear,
  timeHourandMinutes,
  TimeToDateFormat,
  yearMonthDate,
} from "../../../utils/dateConverter";
import BAuditTrailManageModal from "../../../components/BAuditTrailManageModal";
import ExportBtn from "../../../components/ExportBtn";
import { gridToolTipOptins } from "../../../utils/tooltipUtils";
import GridShowingCount from "../../../components/GridShowingCount";
import Img from "../../../components/Img";
import { useCreateCaseMutation } from "../../../redux/api/medallionApi";
import { setSelectedMedallion } from "../../../redux/slice/selectedMedallionDetail";
import { Menu } from "primereact/menu";
import { Button } from "primereact/button";
import { Divider } from "primereact/divider";
import React from "react";
import { BreadCrumb } from "primereact/breadcrumb";
import DataTableComponent from "../../../components/DataTableComponent";
import BConfirmModal from "../../../components/BConfirmModal";
import BSuccessMessage from "../../../components/BSuccessMessage";
import ReAssignDriverModal from "./ReAssignDriverModal";
import {
  useLazyExportLedgerEntryQuery,
  useLazyLedgerEntryListQuery,
} from "../../../redux/api/ledgerApi";
import BToast from "../../../components/BToast";

const ManageLedgerEntry = () => {
  const menuRefs = useRef({});
  const navigate = useNavigate();
  const [isOpen, setOpen] = useState(false);
  const [isSuccessfulMessageOpen, setSuccessfulMessageOpen] = useState(false);
  const [flow, setFlow] = useState("");
  const dispatch = useDispatch();
  const bt = useRef(null);
  const [rows, setRows] = useState(5);
  const [page, setPage] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState(null);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [confirmationTitle, setConfirmationTitle] = useState("");

  const [selectedDriverIds, setSelectedDriverIds] = useState("");
  const [selectedLedgerId, setSelectedLedgerId] = useState("");
  const menu = useRef(null);
  const [filterSearchBy, setFilterSearchBy] = useState(false);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState(1);
  const [searchFilterData, setSearchFilterData] = useState({});
  const [filterApplyList, setFilterApplyList] = useState(new Map());
  const toast = useRef(null);

  const [triggerExport] = useLazyExportLedgerEntryQuery();
  const [ledgerEntryList, setLedgerEntryList] = useState([]);
  const [triggerGetLedgerEntry, { data: ledgerEntryListData }] =
    useLazyLedgerEntryListQuery();
  const [triggerLedgerEntrySearch, { data: ledgerEntrySearchListData }] =
    useLazyLedgerEntryListQuery();
  const [createCase, { data, isSuccess }] = useCreateCaseMutation();

  const items = [
    {
      template: () => (
        <Link to="/" className="font-semibold text-grey">
          Payments
        </Link>
      ),
    },
    {
      template: () => (
        <Link to="/manage-ledger-entry" className="font-semibold text-black">
          Manage Ledger Entry
        </Link>
      ),
    },
  ];

  const columns = [
    {
      field: "id",
      header: "Ledger ID",
      headerAlign: "left",
      bodyAlign: "left",
      filter: true,
      sortable: true,
    },
    {
      field: "driver_id",
      header: "Driver ID",
      headerAlign: "left",
      bodyAlign: "left",
      filter: true,
      sortable: true,
    },
    {
      field: "driver_name",
      header: "Driver Name",
      headerAlign: "left",
      bodyAlign: "left",
      filter: true,
      sortable: true,
    },
    {
      field: "created_on",
      header: "Ledger Date",
      sortable: true,
      filter: true,
    },
    {
      field: "ledger_time",
      header: "Ledger Time",
      sortable: true,
      filter: true,
    },
    {
      field: "transaction_date",
      header: "Transaction Date",
      sortable: true,
      filter: true,
    },
    {
      field: "transaction_time",
      header: "Transaction Time",
      sortable: true,
      filter: true,
    },
    {
      field: "medallion_number",
      header: "Medallion Number",
      sortable: true,
      filter: true,
      headerAlign: "left",
    },
    {
      field: "vin",
      header: "VIN No",
      sortable: true,
      filter: true,
    },
    {
      field: "amount",
      header: "Amount",
      sortable: true,
      filter: true,
    },
    {
      field: "transaction_type",
      header: "Dr/Cr",
      sortable: true,
      filter: true,
    },
    {
      field: "source_type",
      header: "Transaction Type",
      sortable: true,
      filter: true,
    },
    // {
    //   field: "source_id",
    //   header: "Source ID",
    //   sortable: true,
    //   filter: true,
    // },
    {
      field: "description",
      header: "Description",
      sortable: true,
      filter: true,
    },

    { field: "m_status", header: "Actions" },
  ];

  const filterVar = {
    id: {
      value: "",
      matchMode: "customFilter",
      label: "Ledger ID",
      data: [],
      formatType: "Search",
    },
    created_on: {
      value: "",
      matchMode: "customFilter",
      label: "Ledger Date",
      data: [],
      formatType: "date",
    },
    transaction_time: {
      value: "",
      matchMode: "customFilter",
      label: "Transaction Time",
      data: [],
      formatType: "time",
    },
    transaction_date: {
      value: "",
      matchMode: "customFilter",
      label: "Transaction Date",
      data: [],
      formatType: "date",
    },
    ledger_time: {
      value: "",
      matchMode: "customFilter",
      label: "Ledger Time",
      data: [],
      formatType: "time",
    },
    driver_id: {
      value: "",
      matchMode: "customFilter",
      label: "Driver ID",
      data: [],
      formatType: "Search",
    },
    driver_name: {
      value: "",
      matchMode: "customFilter",
      label: "Driver Name",
      data: [],
      formatType: "Search",
    },
    transaction_type: {
      value: "",
      matchMode: "customFilter",
      label: "Select Dr/Cr",
      data: filterSelectGenerate(["Pay To Big Apple", "Pay To Driver"]),
      formatType: "select",
    },
    source_type: {
      value: "",
      matchMode: "customFilter",
      label: "Select Source Type",
      data: filterSelectGenerate([
        "EZPASS",
        "PVB",
        "CURB",
        "LEASE",
        "FEE",
        "MANUAL_FEE",
        "CURB_CARD_TXN",
        "DTR",
        "OTHERS",
      ]),
      formatType: "select",
    },
    medallion_number: {
      value: "",
      matchMode: "customFilter",
      label: "Medallion Number",
      data: [],
      formatType: "Search",
    },
    vin: {
      value: "",
      matchMode: "customFilter",
      label: "VIN No",
      data: [],
      formatType: "Search",
    },
    amount: {
      value: "",
      matchMode: "customFilter",
      label: "Amount",
      data: [],
      formatType: "amount",
    },

    // source_id: {
    //   value: "",
    //   matchMode: "customFilter",
    //   label: "Source ID",
    //   data: [],
    //   formatType: "Search",
    // },
    description: {
      value: "",
      matchMode: "customFilter",
      label: "Description",
      data: [],
      formatType: "Search",
    },
    m_status: {
      value: "",
      matchMode: "customFilter",
      label: "Driver Status",
      data: [],
      formatType: "select",
    },
  };
  const [filterData, setFilterData] = useState(filterVar);
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    driver_id: true,
    driver_name: true,
    medallion_number: false,
    vin: false,
    amount: true,
    transaction_type: true,
    source_type: false,
    // source_id: false,
    description: false,
    created_on: true,
    transaction_time: true,
    transaction_date: true,
    ledger_time: true,
    m_status: true,
  });
  const visibleCount = Object.values(visibleColumns).filter(Boolean).length;
  useEffect(() => {
    if (ledgerEntryListData) {
      console.log("Ledger Entry List", ledgerEntryListData.items);
      // const filteredData = ledgerEntryListData.items.filter(
      //   (row) =>
      //     row.amount !== 0 && row.medallion_number !== null && row.vin !== null
      // );
      // console.log("Filtered data", filteredData);
      setLedgerEntryList(ledgerEntryListData?.items);
    }
  }, [ledgerEntryListData]);

  useEffect(() => {
    triggerSearch({ page: 1, limit: 5 });
  }, []);

  useEffect(() => {
    setPage(1);
    setRows(5);
    triggerSearch({ page: 1, limit: 5 });
  }, [filterApplyList]);

  useEffect(() => {
    console.log("useEffect", ledgerEntrySearchListData, filterSearchBy);
    if (ledgerEntrySearchListData) {
      if (filterSearchBy === "driver_id") {
        console.log("driver search", ledgerEntrySearchListData, filterSearchBy);
        const data = ledgerEntrySearchListData.items.map((driver) => ({
          name: driver.driver_id,
          id: driver.driver_id,
        }));
        handleSearchItemChange(data);
      }
      if (filterSearchBy === "driver_name") {
        console.log("driver search", ledgerEntrySearchListData, filterSearchBy);
        const data = ledgerEntrySearchListData.items.map((driver) => ({
          name: driver.driver_name,
          id: driver.driver_name,
        }));
        handleSearchItemChange(data);
      }
      if (filterSearchBy === "id") {
        console.log(
          "Ledger id search",
          ledgerEntrySearchListData,
          filterSearchBy
        );
        const data = ledgerEntrySearchListData.items.map((driver) => ({
          name: driver.ledger_id,
          id: driver.ledger_id,
        }));
        handleSearchItemChange(data);
      } else if (filterSearchBy === "medallion_number") {
        const data = ledgerEntrySearchListData.items.map((driver) => ({
          name: driver?.medallion_number,
          id: driver?.medallion_number,
        }));
        handleSearchItemChange(data);
      } else if (filterSearchBy === "vin") {
        const data = ledgerEntrySearchListData.items.map((driver) => ({
          name: driver?.vin,
          id: driver?.vin,
        }));
        handleSearchItemChange(data);
      }
      // else if (filterSearchBy === "amount") {
      //   const data = ledgerEntrySearchListData.items.map((driver) => ({
      //     name: driver?.amount,
      //     id: driver?.amount,
      //   }));
      //   handleSearchItemChange(data);
      // }
      // else if (filterSearchBy === "source_id") {
      //   const data = ledgerEntrySearchListData.items.map((driver) => ({
      //     name: driver.source_id,
      //     id: driver.source_id,
      //   }));
      //   handleSearchItemChange(data);
      // }
      else if (filterSearchBy === "description") {
        const data = ledgerEntrySearchListData.items.map((driver) => ({
          name: driver?.description,
          id: driver?.description,
        }));
        handleSearchItemChange(data);
      }
    }
  }, [ledgerEntrySearchListData]);

  const handleSelectionChange = (e) => {
    setSelectedProducts(e.value);
    setSelectedDriverIds(
      e.value?.map((item) => item.driver_name).join(",") || ""
    );
    setSelectedLedgerId(e.value?.map((item) => item.id).join(",") || "");
    console.log("Selected row(s):", e.value, selectedDriverIds);
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

  const openReassignDriver = () => {
    setConfirmationTitle("Re-Assign Driver");
    // setConfirmationMessage(
    //   `Are you sure you want to lock this driver ${data}?`
    // );
    setOpen(true);
  };

  // const isDriverStatus = (data) => {
  //   // if (medallion.medallion_status === 'A') {
  //   return !data.driver_status;
  //   // }
  //   // return false;
  // };

  const customRender = (column, rowData) => {
    if (column.field === "driver_id") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <button
              // style={{ color: "#1056EF" }}
              className="regular-text btn p-0 border-0"
              data-testid="grid-driver-id"
            // onClick={() =>
            //   navigate(`/manage-driver/view/${rowData?.driver_id}`, {
            //     state: rowData?.driver_id,
            //   })
            // }
            >
              {rowData?.driver_id}
            </button>
          </div>
        </div>
      );
    } else if (column.field === "id") {
      return (
        <div className="d-flex align-items-center justify-content-between flex-row">
          <button
            style={{ color: "#1056EF" }}
            className="regular-semibold-text btn p-0 border-0"
            data-testid="grid-ledger-id"
            onClick={() =>
              navigate(`/manage-ledger-entry/view/${rowData?.id}`, {
                state: rowData?.id,
              })
            }
          >
            {rowData?.ledger_id}
          </button>
        </div>
      );
    } else if (column.field === "driver_name") {
      return (
        <div className="d-flex align-items-center justify-content-between flex-row">
          <button
            // style={{ color: "#1056EF" }}
            className="regular-text btn p-0 border-0"
            data-testid="grid-driver-name"
          // onClick={() =>
          //   navigate(`/manage-driver/view/${rowData?.driver_id}`, {
          //     state: rowData?.driver_id,
          //   })
          // }
          >
            {rowData?.driver_name}
          </button>
        </div>
      );
    } else if (column.field === "medallion_number") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-medallion-number">
              {rowData?.medallion_number || "-"}
              <p className="fst-italic" data-testid="grid-medallion-owner">
                {" "}
                {rowData?.medallion_owner || "-"}
              </p>
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "vin") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-vin-no">
              {rowData?.vin || "-"}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "amount") {
      return (
        <div className="text-center">
          <h1 className="regular-text" data-testid="grid-amount">
            {"$" + rowData?.amount}
          </h1>
        </div>
      );
    } else if (column.field === "transaction_type") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-transaction-type">
              {rowData?.transaction_type}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "source_type") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-source-type">
              {rowData?.source_type}
            </h1>
          </div>
        </div>
      );
    }
    // else if (column.field === "source_id") {
    //   return (
    //     <div>
    //       <div className="d-flex align-items-center justify-content-between flex-row">
    //         <h1 className="regular-text" data-testid="grid-source-id">
    //           {rowData?.source_id}
    //         </h1>
    //       </div>
    //     </div>
    //   );
    // }
    else if (column.field === "description") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-description">
              {rowData?.description}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "created_on") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-ledger-date">
              {yearMonthDate(rowData?.created_on) || "-"}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "transaction_date") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-ledger-date">
              {rowData?.transaction_date || "-"}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "transaction_time") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-ledger-date">
              {rowData?.transaction_time || "-"}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "ledger_time") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-ledger-date">
              {timeHourandMinutes(rowData?.created_on) || "-"}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "m_status") {
      return (
        <div className="d-flex flex-row gap-3">
          <Button
            data-testid="pencil_edit"
            {...gridToolTipOptins("Edit")}
            icon={() => <Img name="pencil_edit" />}
          // onClick={() => {
          //   console.log(rowData);
          //   navigate(`/manage-ledger-entry/edit/${rowData?.driver_id}`, {
          //     state: rowData,
          //   });
          // }}
          ></Button>

          <Button
            data-testid="view-ledger"
            {...gridToolTipOptins("View")}
            icon={() => <Img name="ic_eye" />}
            onClick={() =>
              navigate(
                `/manage-ledger-entry/view-ledger/${rowData?.ledger_id}`,
                {
                  state: rowData,
                }
              )
            }
          ></Button>
        </div>
      );
    }
    return [column.field];
  };

  const sortFieldMapping = {
    amount: "amount",
    created_on: "created_on",
    transaction_date: "transaction_date",
    transaction_time: "transaction_time",
    description: "description",
    driver_id: "driver_id",
    driver_name: "driver_name",
    id: "ledger_id",
    medallion_number: "medallion_number",
    receipt_number: "receipt_number",
    // source_id: "source_id",
    source_type: "source_type",
    transaction_type: "transaction_type",
    vin: "vin",
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
    console.log("Filter apply list", filterApplyList, queryParams.toString());
    triggerGetLedgerEntry(`?${queryParams.toString()}`);
  };

  const onPageChange = (data) => {
    // console.log("OnPageChange", data);
    // setPage(data);
    setRows(data.rows);
    triggerSearch({ page: Number(data.page) + 1, limit: data.rows });
  };

  const filterApply = (option, data) => {
    if (data) {
      updateFilter(option, data, "add");
    }
  };

  const searchData = (type, value) => {
    const queryParams = new URLSearchParams({
      page: 1,
      per_page: 5,
    });
    if (type.field === "driver_id") {
      queryParams.append("driver_id", value);
    } else if (type.field === "id") {
      console.log("query params append", type.field, value);
      queryParams.append("ledger_id", (value));
    } else if (type.field === "driver_name") {
      console.log("query params append", type.field, value);
      queryParams.append("driver_name", value);
    } else if (type.field === "medallion_number") {
      queryParams.append("medallion_number", value);
    } else if (type.field === "vin") {
      queryParams.append("vin", value);
    }
    // else if (type.field === "amount") {
    //   queryParams.append("amount_from", value);
    //   queryParams.append("amount_to", value);
    // }
    setFilterSearchBy(type.field);
    triggerLedgerEntrySearch(`?${queryParams?.toString()}`);
  };

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

  const fieldMapping = {
    driver_lookup_id: "driver_id",
    driver_name: "driver_name",
    id: "ledger_id",
    medallion_number: "medallion_number",
    vin: "vin",
    amount: "amount",
    transaction_type: "transaction_type",
    source_type: "source_type",
    source_id: "source_id",
    description: "description",
    created_on: "created_on",
    transaction_date: "transaction_date",
  };

  const updateFilter = (option, data = null, action = "add") => {
    const updatedFilterApplyList = new Map(filterApplyList);

    const fieldMapping = {
      driver_id: "driver_id",
      driver_name: "driver_name",
      id: "ledger_id",
      medallion_number: "medallion_number",
      vin: "vin",
      amount: ["amount_from", "amount_to"],
      transaction_type: "transaction_type",
      source_type: "source_type",
      // source_id: "source_id",
      description: "description",
      created_on: ["start_date", "end_date"],
      transaction_date: ["transaction_date_from", "transaction_date_to"],
      ledger_time: ["start_time", "end_time"],
      transaction_time: ["transaction_time_from", "transaction_time_to"],
    };

    const fieldKey = fieldMapping[option.field];

    if (filterData) {
      if (action === "add") {
        setFilterData((prevState) => ({
          ...prevState,
          [option.field]: {
            ...prevState[option.field],
            value: "ff",
            filterDemoData: data,
          },
        }));
        console.log("inside if", data, option.field);

        if (Array.isArray(fieldKey)) {
          // updatedFilterApplyList.set(fieldKey, yearMonthDate(data.fromDate));
          updatedFilterApplyList.delete("created_on");
          console.log("inside is Array", fieldKey, data);
          if (
            fieldKey[0] === "transaction_time_from" ||
            fieldKey[1] === "transaction_time_to" ||
            fieldKey[0] === "start_time" ||
            fieldKey[1] === "end_time"
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
          } else if (
            fieldKey[0] === "amount_from" ||
            fieldKey[1] === "amount_to"
          ) {
            updatedFilterApplyList.set(fieldKey[0], data.amountFrom);
            updatedFilterApplyList.set(fieldKey[1], data.amountTo);
          } else {
            updatedFilterApplyList.set(
              fieldKey[0],
              yearMonthDate(data.fromDate)
            );
            updatedFilterApplyList.set(fieldKey[1], yearMonthDate(data.toDate));
          }
        } else if (fieldKey) {
          if (Array.isArray(data)) {
            updatedFilterApplyList.set(
              fieldKey,
              data.map((item) => item.name).join(",")
            );
          } else {
            console.log("Update Filter apply", fieldKey, data);
            if (fieldKey == "transaction_type" && data == "Pay To Big Apple") {
              data = false;
            }
            if (fieldKey == "transaction_type" && data == "Pay To Driver") {
              data = true;
            }
            console.log("Filter data", filterData, data);
            updatedFilterApplyList.set(fieldKey, data.name || data);
          }
        }
      } else if (action === "remove") {
        // Handle removal of filter values
        setFilterData((prevState) => ({
          ...prevState,
          [option.field]: {
            ...prevState[option.field],
            value: "",
            filterDemoData: "",
          },
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
    console.log("OnSortApply()", field, order);
    triggerSearch({ page: 1, limit: 5, sField: field, sOrder: order });
  };

  const handleSearchItemChange = (newItems) => {
    setSearchFilterData((prev) => ({
      ...prev,
      [filterSearchBy]: newItems,
    }));
  };

  const refreshFunc = () => {
    triggerSearch({ page: page, limit: rows });
  };

  const handleReassignSuccess = () => {
    setOpen(false);
    setSuccessfulMessageOpen(true);
  };

  const handleSuccessModalClose = () => {
    setSuccessfulMessageOpen(false);
    console.log(isOpen, isSuccessfulMessageOpen);
    refreshFunc();
    //triggerSearch({ page: 1, limit: 5 });
    setTimeout(() => {
      navigate("/manage-ledger-entry", { replace: true });
    }, 500);
  };

  return (
    <div className="common-layout w-100 h-100 d-flex flex-column gap-4">
      <div>
        <BreadCrumb
          model={items}
          separatorIcon="/"
          className="bg-transparent p-0"
          pt={{ menu: "p-0" }}
        />
        <div className="d-flex align-items-center justify-content-between w-100">
          <div>
            <p className="topic-txt">Manage Ledger Entry</p>
            <GridShowingCount rows={rows} total={ledgerEntryListData?.total} />
          </div>
          <div className="d-flex gap-3">
            <Menu model={menuItems} popup ref={menu} />
            <Button
              data-testid="column-filter-btn"
              text
              onClick={(e) => menu.current.toggle(e)}
              className="d-flex justify-content-center w-auto align-items-center position-relative"
              ref={bt}
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
              onClick={() => refreshFunc(page, rows)}
            ></Button>
          </div>
        </div>
        <div className="d-flex justify-content-end align-items-center gap-3 ">
          <Button
            label="Reassign"
            className="bg-warning border-0 w-auto text-dark fw-semibold w-30"
            data-testid="reassign-btn"
            disabled={!selectedLedgerId}
            onClick={() => {
              console.log("Modal clicked");
              openReassignDriver();
            }}
          />
          <Divider layout="vertical" />
          {ledgerEntryList.length > 0 && (
            <div className="d-flex align-items-center gap-2">
              <span className="fw-bold">Export as:</span>
              <ExportBtn
                {...{
                  sortFieldMapping,
                  sortField,
                  sortOrder,
                  triggerExport,
                  filterApplyList,
                  fileName: `ledger_`,
                }}
              ></ExportBtn>
            </div>
          )}

          {/* <Button data-testid="export-btn" text className='regular-text gap-2 d-flex' onClick={exportFile} icon={() => <Img name="ic_export" />} >Export as .XLS</Button> */}
        </div>
      </div>
      <DataTableComponent
        columns={filteredColumns}
        data={ledgerEntryList}
        selectionMode="checkbox"
        selectedData={selectedProducts}
        // onSelectionChange={(e) => setSelectedProducts(e.value)}
        onSelectionChange={handleSelectionChange}
        renderColumn={customRender}
        onPageChange={onPageChange}
        emptyMessage={"No records found"}
        totalRecords={ledgerEntryListData?.total}
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
        filterApplyList={filterApplyList}
        fieldMapping={fieldMapping}
      />
      <ReAssignDriverModal
        isOpen={isOpen}
        title={confirmationTitle}
        onCancel={() => {
          setOpen(false);
        }}
        onConfirm={() => {
          setOpen(false);
          //setSuccessfulMessageOpen(true);
        }}
        driverIds={selectedDriverIds}
        ledgerIds={selectedLedgerId}
        onSuccess={handleReassignSuccess}
      ></ReAssignDriverModal>
      <BSuccessMessage
        isOpen={isSuccessfulMessageOpen}
        message={"Driver has been successfully reassigned"}
        title="Reassign Driver Successful"
        onCancel={handleSuccessModalClose}
      // onConfirm={() => {
      //   setSuccessfulMessageOpen(false);
      //   console.log(isOpen, isSuccessfulMessageOpen);
      //   setTimeout(() => {
      //     navigate("/manage-ledger-entry", { replace: true });
      //   }, 150);
      // }}
      ></BSuccessMessage>
      {/* <BToast ref={toast} position="top-right" /> */}
    </div>
  );
};

export default ManageLedgerEntry;
