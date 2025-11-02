import { nanoid } from "@reduxjs/toolkit";

export const handleExport = async ({
  sortField,
  sortFieldMapping,
  sortOrder,
  triggerExport,
  filterApplyList,
  fileName,
  fileFormat = "xlsx",
}) => {
  try {
    const queryParams = new URLSearchParams({});
    if (sortField) {
      const apiSortField = sortFieldMapping[sortField] || sortField;
      const order = sortOrder === 1 ? "asc" : "desc";
      queryParams.append("sort_by", apiSortField);
      queryParams.append("sort_order", order);
    }
    filterApplyList.forEach((value, key) => {
      queryParams.append(key, value);
    });
    queryParams.append("format",   fileFormat);
    const blob = await triggerExport(`?${queryParams?.toString()}`).unwrap();

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    if(fileFormat==="excel"){
      fileFormat = "xlsx";
    }
    a.download = `${fileName}${nanoid()}.${fileFormat}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Export failed:", error);
  }
};

export const menuTemplate = (item, options) => {
  return (
    <div
      type="button"
      data-testid={item.dataTestId}
      className={`p-menuitem-content p-2 px-3 ${item.disabled ? "opacity-75" : ""}`}
      disabled={item.disabled} onClick={options.onClick}
    >
    {item.label}
    </div>
  );
};

export const gridFilterTransform=(filters)=>{
  const transformed = Object.entries(filters).reduce((acc, [key, value]) => {
    acc[key] = {
      value: '',
      matchMode: 'customFilter',
      label: value.label,
      data: [],
      formatType: value.type === 'text' ? 'Search' : value.type
    };
    return acc;
  }, {});
  return transformed;
}

export function formatLabel(str) {
  return str
    .split('_') 
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)) 
    .join(' '); 
}