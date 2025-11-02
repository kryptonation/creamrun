import React, { useRef, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import { Link } from "react-router-dom";
import { BreadCrumb } from "primereact/breadcrumb";
import GridShowingCount from "../../components/GridShowingCount";
import { Menu } from "primereact/menu";
import { Badge } from "primereact/badge";
import { Divider } from "primereact/divider";
import Img from "../../components/Img";
import DataTableComponent from "../../components/DataTableComponent";

const ManageVehicleLedger = () => {
  const [selectedEntries, setSelectedEntries] = useState(null);
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
        <Link to="/manage-vehicle-ledger" className="font-semibold text-grey">
          Vehicles
        </Link>
      ),
    },
    {
      template: () => (
        <Link to="/manage-vehicle-ledger" className="font-semibold text-black">
          Manage Vehicle Ledgers
        </Link>
      ),
    },
  ];
  const [rows, setRows] = useState(5);
  const [page, setPage] = useState(1);
  const menu = useRef(null);
  const bt = useRef(null);
  const [vehicleLedgerData, setVehicleLedgerData] = useState([]);

  const columns = [
    { field: "id", header: "Ledger ID" },
    { field: "vin", header: "VIN No" },
    { field: "medallion_number", header: "Medallion No" },
    { field: "amount", header: "Amount" },
    { field: "transaction_type", header: "Transaction Type" },
    { field: "action", header: "Action" },
  ];
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    vin: true,
    medallion_number: true,
    transaction_type: true,
    amount: true,
  });
  const visibleCount = Object.values(visibleColumns).filter(Boolean).length;
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
  const renderAction = (rowData) => {
    // Dummy action buttons (edit and view) as shown in UI image
    return (
      <>
        <Button
          icon="pi pi-pencil"
          className="p-button-text p-button-sm p-mr-2"
          aria-label="Edit"
        ></Button>
        <Button
          icon="pi pi-eye"
          className="p-button-text p-button-sm"
          aria-label="View"
        ></Button>
      </>
    );
  };
  const customRender = (column, rowData) => {
    if (column.field === "id") {
      return (
        <div className="d-flex align-items-center justify-content-between flex-row">
          <button
            style={{ color: "#1056EF" }}
            className="regular-semibold-text btn p-0 border-0"
            data-testid="grid-ledger-id"
          >
            {rowData?.id}
          </button>
        </div>
      );
    }
    return [column.field];
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
            <p className="topic-txt">Manage Vehicle Ledgers</p>
            {/* <GridShowingCount rows={rows} total={2} /> */}
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
              //   onClick={() => refreshFunc(page, rows)}
            ></Button>
          </div>
        </div>
        <div className="d-flex justify-content-end align-items-center gap-3 ">
          {/* <div className="d-flex align-items-center gap-2">
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
          </div> */}
        </div>
      </div>
      <DataTableComponent
        columns={filteredColumns}
        data={vehicleLedgerData}
        selectionMode="checkbox"
        renderColumn={customRender}
        //selectedData={selectedProducts}
        // onSelectionChange={(e) => setSelectedProducts(e.value)}
        // onSelectionChange={handleSelectionChange}
        // onPageChange={onPageChange}
        emptyMessage={"No records found"}
        // totalRecords={ledgerEntryListData?.total}
        dataKey="ledger_id"
        // filterData={filterData}
        // filterSearchData={searchFilterData}
        // clearAllFilter={clearAllFilter}
        // clearFilter={clearFilter}
        // pSortField={sortField}
        // pSortOrder={sortOrder}
        // searchData={searchData}
        // filterApply={filterApply}
        // onSortApply={onSortApply}
        // filterSearchBy={filterSearchBy}
        // filterApplyList={filterApplyList}
        // fieldMapping={fieldMapping}
      />
    </div>
  );
};

export default ManageVehicleLedger;
