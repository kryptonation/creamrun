import React, { useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Paginator } from "primereact/paginator";
import { FilterService } from "primereact/api";
import { Ripple } from "primereact/ripple";
import DataTableFilter from "./DataTableFilter";

const BExpandableTable = ({
  columns = [],
  data = [],
  rowExpansionTemplate = () => null,
  selectionMode,
  selectedData = null,
  onSelectionChange,
  renderColumn,
  dataKey = "id",
  header,
  paginator = true,
  rows = 5,
  filterData,
  filterApply = () => { },
  onSortApply = () => { },
  searchData = () => { },
  totalRecords = 0,
  onPageChange = () => { },
  filterSearchData = [],
  lazy = false,
  pSortField = '',
  pSortOrder = 1,
  clearAllFilter = () => { },
  clearFilter = () => { },
  // filterApplyList = null,
  // fieldMapping = null,
  filterSearchBy = '',
  emptyMessage = "No record found",
}) => {
  const [expandedRows, setExpandedRows] = useState([]);

  FilterService.register('customFilter', () => {
    return true;
  });

  const [firstPagination, setFirstPagination] = useState(0);
  const [rowsPagination, setRowsPagination] = useState(rows);
  const [sortField, setSortField] = useState(pSortField);
  const [sortOrder, setSortOrder] = useState(pSortOrder);

  const onPageChangePagination = (data) => {
    setFirstPagination(Number(data.first) + 1);
    setRowsPagination(data.rows);
    onPageChange(data)
  }

  const template1 = {
    layout: 'FirstPageLink  PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport',
    PageLinks: (options) => {
      if ((options.view.startPage === options.page && options.view.startPage !== 0) || (options.view.endPage === options.page && options.page + 1 !== options.totalPages)) {
        return (
          <span className={"border-0 text-black px-2"} style={{ userSelect: 'none' }}>
            ...
          </span>
        );
      }

      return (
        <button type="button" data-testId={`paginator-count${options.page + 1}`} className={options.className} onClick={options.onClick}>
          {options.page + 1}
          <Ripple />
        </button>
      );
    },
  };

  const filterTemplate = (options) => {
    return (
      <DataTableFilter
        data={
          (options.filterModel?.formatType === "Search" || options.filterModel?.formatType === "search")
            ? filterSearchData[options.field] || []
            : options.filterModel?.data
        }
        filterData={filterData}
        id={options.field}
        formatType={options.filterModel?.formatType}
        label={options.filterModel?.label}
        onValueChange={(value) => value && searchData(options, value)}
        onFilterChange={(data) => filterApply(options, data)}
        clearAllFilter={clearAllFilter}
        clearFilter={() => clearFilter(options)}
      />
    )
  };


  const filterApplyTemplate = () => {
    return null;
  };

  const onSort = (eve) => {
    const { sortField, sortOrder } = eve;
    setSortField(sortField);
    setSortOrder(sortOrder);
    onSortApply(sortField, sortOrder)
  }

  const filteredData = data?.filter(() => {
    return true;
  });

  const onCellClick = (rowData) => {

    let _expandedRows = [...expandedRows];
    if (expandedRows && expandedRows.includes(rowData)) {
      _expandedRows = _expandedRows.filter(item => item !== rowData);
    } else {
      _expandedRows.push(rowData);
    }
    setExpandedRows(_expandedRows);
  };

  return (
    // <div className="b-expandable-table">
    //     <DataTable
    //         className="primary-table"
    //         value={data}
    //         expandedRows={expandedRows}
    //         onRowToggle={(e) => setExpandedRows(e.data)}
    //         rowExpansionTemplate={rowExpansionTemplate}
    //         dataKey={dataKey}
    //         header={header}
    //         lazy={lazy}
    //         emptyMessage={emptyMessage}
    //         responsiveLayout="scroll"
    //         selection={selectedData}
    //         onSelectionChange={onSelectionChange}
    //         selectionMode={selectionMode}
    //         paginator={false} // Paginator handled separately below
    //     >
    //         {selectionMode === "radiobutton" && (
    //             <Column selectionMode="single" headerStyle={{ width: "3rem" }} />
    //         )}

    //         {selectionMode === "checkbox" && (
    //             <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} />
    //         )}
    //         <Column expander={frontExpander} style={{ width: "3em" }} />
    //         {columns.map((col, index) => {
    //             return (
    //                 <Column
    //                     key={index}
    //                     field={col.field}
    //                     header={col.header}
    //                     sortable={col.sortable || false}
    //                     expander={col.expander || false}
    //                     headerClassName={`header-align-${col.headerAlign || "left"}`}
    //                     bodyClassName={`align-${col.bodyAlign || "left"}`}
    //                     body={(rowData) => renderColumn(col, rowData, () => onCellClick(rowData))}
    //                 />
    //             )
    //         })}
    //     </DataTable>
    //     {paginator && (
    //         <Paginator
    //             first={first}
    //             rows={rows}
    //             totalRecords={totalRecords}
    //             onPageChange={handlePageChange}
    //         />
    //     )}
    // </div>
    <div className="table-component"
    >
      <DataTable
        className="primary-table"
        value={filteredData}
        expandedRows={expandedRows}
        onRowToggle={(e) => setExpandedRows(e.data)}
        rowExpansionTemplate={rowExpansionTemplate}
        header={header}
        selectionMode={selectionMode}
        selection={selectedData}
        onSelectionChange={onSelectionChange}
        dataKey={dataKey}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={onSort}
        sortMode="single"
        emptyMessage={<span data-testid="grid-record-not-found">{emptyMessage}</span>}
        filters={filterData}
        removableSort={true}
        lazy={lazy}
      // tableStyle={{ minWidth: "30rem" }}
      >
        {selectionMode === "radiobutton" && (
          <Column selectionMode="single" data-testid="grid-single-checkbox"
            pt={{
              headerCell: { 'data-testid': `grid-single-checkbox` },
            }} headerStyle={{ width: "3rem" }} />
        )}

        {selectionMode === "checkbox" && (
          <Column selectionMode="multiple" data-testid="grid-multiple-checkbox"
            pt={{
              headerCell: { 'data-testid': `grid-single-checkbox` },
            }} headerStyle={{ width: "3rem" }} />
        )}

        {columns.map((col, index) => (
          <Column
            key={index}
            field={col.field}
            pt={{
              headerCell: { 'data-testid': `${col.field}_header` },
              sort: { 'data-testid': `${col.field}_sort` },
              columnFilter: { 'data-testid': `${col.field}_filter` }
            }}
            header={(
              <div className="flex items-center justify-between text-nowrap" data-testid={`${col.field}_label`}>
                {col.header}
              </div>
            )}
            sortable={col.sortable || false}
            filter={col.filter || false}
            showFilterMatchModes={false}
            filterApply={filterApplyTemplate}
            showClearButton={false}
            matchMode={"custom"}
            className="user-select-all"
            virtualScrollerOptions={{ itemSize: 5 }}
            filterElement={filterTemplate}
            headerClassName={`header-align-${col.headerAlign || "left"} `}
            bodyClassName={`align-${col.bodyAlign || "left"}`}
            body={(rowData) => renderColumn(col, rowData, () => onCellClick(rowData))}
          // body={(rowData) => renderColumn(col, rowData)}
          />
        ))}
      </DataTable>
      {data.length > 0 && paginator && <div className="position-sticky bottom-0 border-3 border-black border-top">
        <Paginator data-testid="paginator"
          template={template1} first={firstPagination} rows={rowsPagination} totalRecords={totalRecords}
          onPageChange={onPageChangePagination}
          rowsPerPageOptions={[5, 10, 20]}
        /></div>}
    </div>
  );
};

export default BExpandableTable;
