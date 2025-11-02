import { Checkbox } from "primereact/checkbox";

const BGridColFilterTemplate = (columns, visibleColumns, handleColumnVisibilityChange) => {
    return columns.map((col) => ({
        template: (
            <div className="p-field-checkbox d-flex align-items-center p-2">
                <Checkbox
                    inputId={col.field}
                    checked={visibleColumns[col.field]}
                    onChange={() => handleColumnVisibilityChange(col.field)}
                />
                <label className="p-1" htmlFor={col.field}>{col.header ? col.header : col.field}</label>
            </div>
        ),
    }));
};

export default BGridColFilterTemplate;