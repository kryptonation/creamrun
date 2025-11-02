export const generateFieldObject = (fields) => {
  return fields.reduce(
    (acc, { key, label, formatType, filter = true, sortable = true }) => {
      acc.sortFieldMapping[key] = key;
      acc.columns.push({
        field: key,
        header: label,
        headerAlign: "left",
        bodyAlign: "left",
        sortable,
        filter,
      });
      acc.filterVar[key] = {
        value: "",
        matchMode: "customFilter",
        label,
        data: [],
        formatType,
      };
      acc.visibleColumns[key] = true;
      acc.fieldMapping[key] = Array.isArray(label) ? [key, key] : key;
      return acc;
    },
    {
      sortFieldMapping: {},
      columns: [],
      filterVar: {},
      visibleColumns: {},
      fieldMapping: {},
    }
  );
};
