import React from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";

const BTable = ({
    value = [],
    columns = [],
    paginator = true,
    rows = 10,
    totalRecords = 0,
    onPageChange = null,
    loading = false,
    rowClassName = null,
    sortField = null,
    sortOrder = null,
    onSort = null,
    globalFilter = null,
    selection = null,
    onSelectionChange = null,
    selectionMode = null,
    header = null,
    footer = null,
    ...restProps
}) => {
    return (
        <DataTable
            value={value}
            paginator={paginator}
            rows={rows}
            totalRecords={totalRecords}
            onPage={onPageChange}
            loading={loading}
            rowClassName={rowClassName}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={onSort}
            globalFilter={globalFilter}
            selection={selection}
            onSelectionChange={onSelectionChange}
            selectionMode={selectionMode}
            header={header}
            footer={footer}
            {...restProps}
        >
            {columns.map((col, index) => (
                <Column key={index} {...col} />
            ))}
        </DataTable>
    );
};

export default BTable;
