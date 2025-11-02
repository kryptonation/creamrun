import { useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Paginator } from "primereact/paginator";
import { Ripple } from "primereact/ripple";
import { FilterService } from "primereact/api";
import DataTableFilter from "./DataTableFilter";

const DataTableComponent = ({
  columns = [],
  data = [],
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
  lazy = true,
  pSortField = '',
  pSortOrder = 1,
  clearAllFilter = () => { },
  clearFilter = () => { },
  // filterApplyList = null,
  // fieldMapping = null,
  filterSearchBy = '',
  emptyMessage = "No record found",
}) => {

  FilterService.register('customFilter', () => {
    return true;
  });
  // const [currentPage, setCurrentPage] = useState(1);
  // const [filterVisible, setFilterVisible] = useState(true); // State to toggle filter visibility

  const [firstPagination, setFirstPagination] = useState(0);
  const [rowsPagination, setRowsPagination] = useState(rows);
  const [sortField, setSortField] = useState(pSortField); // Current sort field
  const [sortOrder, setSortOrder] = useState(pSortOrder);
  // const dt = useRef(null);

  const onPageChangePagination = (data) => {
    setFirstPagination(data.first);
    setRowsPagination(data.rows);
    onPageChange(data)
  }

  // const hideFilterPopover = () => {
  //   // console.log("dt.current : ", dt.current)
  //   // if (dt.current) {
  //   //   dt.current.getColumn('name').filterElement = null;
  //   //   dt.current.getColumn('name').filterElement = undefined;
  //   // }
  // };

  // const handlePageInputChange = (e) => {
  //   const value = e.target.value.replace(/\D/g, ""); // Allow only numeric input
  //   setCurrentPage(value ? parseInt(value, 10) : ""); // Set empty if no value
  // };

  // const goToPage = () => {
  //   const pageNumber = currentPage || 1; // Default to 1 if input is empty
  //   const validatedPage = Math.min(
  //     Math.max(pageNumber, 1),
  //     Math.ceil(totalRecords / rows)
  //   );
  //   setCurrentPage(validatedPage); // Ensure page is within range
  //   const first = (validatedPage - 1) * rows;
  //   onPageChange({ first, rows }); // Call onPageChange with valid pagination
  // };

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
        onFilterChange={(data) => {
          resetPagination();
          filterApply(options, data)
        }}
        clearAllFilter={clearAllFilter}
        clearFilter={() => clearFilter(options)}
      />
    )
  };


  const filterApplyTemplate = () => {
    // need to use filterApply function in prop
    return null;
    // return <Button type="button" label="Apply Filter" icon="pi pi-check"
    // className="mx-auto"
    //   onClick={(e)=>console.log(e)}
    //   severity="success"></Button>;
  };

  const resetPagination = () => {
    setFirstPagination(0)
    setRowsPagination(rows)
  }
  const onSort = (eve) => {

    const { sortField, sortOrder } = eve;

    setSortField(sortField);
    setSortOrder(sortOrder);
    onSortApply(sortField, sortOrder, firstPagination, rowsPagination)

    // const { sortField: newSortField, sortOrder: newSortOrder } = e;

    // if (newSortField === sortField) {
    //   const toggledSortOrder = sortOrder === 1 ? -1 : 1;
    //   setSortOrder(toggledSortOrder);
    //   onSortApply(newSortField, toggledSortOrder);
    // } else {
    //   setSortField(newSortField);
    //   setSortOrder(1);
    //   onSortApply(newSortField, 1);
    // }
  }
  // const getSortIcon = (sortOrder, sorted,) => {
  //   if (!sorted) return <Img name="ic_sort" />;
  //   return sortOrder === 1 ? <Img name="ic_sort_acs" /> : <Img name="ic_sort_desc" />;
  // };

  const filteredData = Array.isArray(data) ? data.filter(() => true) : [];


  return (
    <div className="table-component"
    >
      <DataTable
        className="primary-table"
        value={filteredData}
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
          <Column selectionMode="single" headerStyle={{ width: "3rem" }} />
        )}

        {selectionMode === "checkbox" && (
          <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} />
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
            body={(rowData) => renderColumn(col, rowData)}
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

export default DataTableComponent;
