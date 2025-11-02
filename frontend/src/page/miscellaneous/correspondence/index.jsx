import { useCallback, useEffect, useRef, useState } from 'react'
import BBreadCrumb from '../../../components/BBreadCrumb'
import { Link } from 'react-router-dom';
import DataTableComponent from '../../../components/DataTableComponent';
import Img from "../../../components/Img";
import { Menu } from "primereact/menu";
import { useNavigate } from "react-router-dom";
import { timeHourandMinutes, yearMonthDate } from "../../../utils/dateConverter";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Badge } from 'primereact/badge';
import { Divider } from 'primereact/divider';
import '../../manage/_manage_medallian.scss';
import { useLazyExportCorrespondenceQuery, useLazyGetCorrespondenceQuery } from '../../../redux/api/correspondenceApi';
import { generateFieldObject } from '../../../utils/generateFieldObject';
import GridShowingCount from '../../../components/GridShowingCount';
import ExportBtn from '../../../components/ExportBtn';
import {
  filterSelectGenerate,
} from "../../../utils/utils";

const MangeCorrespondence = () => {
  const navigate = useNavigate();
  const [selectedProducts, setSelectedProducts] = useState(null);
  const [gridData, setGridData] = useState([]);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(5);
  const [filterApplyList, setFilterApplyList] = useState(new Map());
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState(1);
  const [searchFilterData, setSearchFilterData] = useState({});
  const [triggerGridAction, { data: gridApiData, isSuccess }] = useLazyGetCorrespondenceQuery();
  const [triggerSearchGridAction, { data: gridSearchApiData }] = useLazyGetCorrespondenceQuery();

  // const [isFilterSearch, setFilterSearch] = useState(false);
  const [filterSearchBy, setFilterSearchBy] = useState("");

  const dateSent = "date_sent";
  const medallionNumber = "medallion_number";
  const driverId = "driver_id";
  const vehicleId = "vehicle_id";
  const mode = "mode";
  const actions = "actions";
  const timeSent = "time_sent";

  const fields = [
    { key: medallionNumber, label: "Medallion No", formatType: "search" },
    { key: driverId, label: "Driver ID", formatType: "search" },
    { key: vehicleId, label: "Vehicle ID", formatType: "search" },
    { key: dateSent, label: "Sent Date", formatType: "date" },
    { key: timeSent, label: "Time", formatType: "time" },
    { key: "is_active", label: "Status", formatType: "select" },
    { key: mode, label: "Mode", formatType: "select" },
  ];

  const { sortFieldMapping, columns, filterVar, visibleColumns } = generateFieldObject(fields);
  const [filterData, setFilterData] = useState(filterVar);
  console.log("🚀 ~ MangeCorrespondence ~ filterData:", filterData)
  useEffect(() => {
    if (isSuccess) {
      setFilterData(prev => {
          console.log("🚀 ~ useEffect ~ gridApiData:", gridApiData)
        return ({
          ...prev,
          // vehicle_status: { ...prev["vehicle_status"], data: filterSelectGenerate(vehicleData?.filtered_status) },
          // make: { ...prev["make"], data: filterSelectGenerate(vehicleData?.filtered_make) },
          mode: { ...prev["mode"], data: filterSelectGenerate(gridApiData?.modes) },
          // vehicle_type: { ...prev["vehicle_type"], data: filterSelectGenerate(vehicleData?.filtered_vehicle_type) },
        })
      })
    }
  }, [gridApiData, isSuccess])

  const menu = useRef(null);
  const [visibleColumnsState, setVisibleColumnsState] = useState(visibleColumns);
  const menuItems = columns.map((col) => ({
    template: (
      <div className="p-field-checkbox d-flex align-items-center p-2">
        <Checkbox
          inputId={col.field}
          checked={visibleColumnsState[col.field]}
          onChange={() => handleColumnVisibilityChange(col.field)}
        />
        <label className="p-1" htmlFor={col.field}>{col.header ? col.header : col.field}</label>
      </div>
    ),
  }));

  const handleColumnVisibilityChange = (field) => {
    setVisibleColumnsState((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const filteredColumns = Object.values(visibleColumnsState).every((isVisible) => !isVisible)
    ? columns
    : columns.filter((col) => visibleColumnsState[col.field]);

  const searchData = (type, value) => {
    const queryParams = new URLSearchParams({
      page: 1,
      per_page: 5,
    });
    if (type.field === medallionNumber) {
      queryParams.append(medallionNumber, value);
    }
    if (type.field === driverId) {
      queryParams.append(driverId, value);
    }
    if (type.field === vehicleId) {
      queryParams.append(vehicleId, value);
    }

    // setFilterSearch(true)
    setFilterSearchBy(type.field)
    triggerSearchGridAction(`?${queryParams?.toString()}`)
  }


  const triggerSearch = ({ page, limit, sField = sortField, sOrder = sortOrder }) => {
    // setFilterSearch(false)
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
    triggerGridAction(`?${queryParams?.toString()}`)

  };

  useEffect(() => { triggerSearch({ page: 1, limit: 5 }) }, []);

  const clearAllFilter = () => {
    setFilterApplyList(new Map());
    setFilterData(prevState => {
      const updatedState = { ...prevState };

      Object.keys(updatedState).forEach(field => {
        updatedState[field].value = "";
        updatedState[field].filterDemoData = "";
      });

      return updatedState;
    });
  }

  const updateFilter = (option, data = null, action = "add") => {
    const updatedFilterApplyList = new Map(filterApplyList);

    const fieldMapping = {
      [dateSent]: ["from_date", "to_date"],
      [timeSent]: ["from_time", "to_time"],
      [medallionNumber]: medallionNumber,
      [driverId]: driverId,
      [vehicleId]: vehicleId,
      [mode]: mode,
      [actions]: actions,
    };

    const fieldKey = fieldMapping[option.field];

    if (action === "add") {
      setFilterData(prevState => ({
        ...prevState,
        [option.field]: { ...prevState[option.field], value: "ff", filterDemoData: data },
      }));

      if (Array.isArray(fieldKey)) {
        if (timeSent === option.field) {
          updatedFilterApplyList.set(fieldKey[0], timeHourandMinutes(data.fromTime));
          updatedFilterApplyList.set(fieldKey[1], timeHourandMinutes(data.toTime));
        }
        else {
          updatedFilterApplyList.set(fieldKey[0], yearMonthDate(data.fromDate));
          updatedFilterApplyList.set(fieldKey[1], yearMonthDate(data.toDate));
        }
      } else if (fieldKey) {
        if (Array.isArray(data)) {
          updatedFilterApplyList.set(fieldKey, data.map(item => item.name).join(","));
        } else {
          if (fieldKey === "mode") {
            updatedFilterApplyList.set("correspondence_mode", data.name || data);
          } else {
            updatedFilterApplyList.set(fieldKey, data.name || data);

          }
        }
      }
    } else if (action === "remove") {
      setFilterData(prevState => ({
        ...prevState,
        [option.field]: { ...prevState[option.field], value: "", filterDemoData: "" },
      }));
      if (Array.isArray(fieldKey)) {
        fieldKey.forEach((key) => updatedFilterApplyList.delete(key));
      } else if (fieldKey && updatedFilterApplyList.has(fieldKey)) {
        if (fieldKey === "mode") {
          updatedFilterApplyList.delete("correspondence_mode");
        } else {
          updatedFilterApplyList.delete(fieldKey);
        }
      }
    }
    setFilterApplyList(updatedFilterApplyList);
  };

  const clearFilter = (option) => {
    updateFilter(option, null, "remove");
  }
  const onSortApply = (field, order) => {
    setSortOrder(() => {
      return order;
    });
    setSortField(() => {
      return field;
    });
    setPage(1)
    setRows(5)
    triggerSearch({ page: 1, limit: 5, sField: field, sOrder: order })
  }

  const filterApply = (option, data) => {
    if (data) {
      updateFilter(option, data, "add");
    }
  }

  useEffect(() => {
    setPage(1)
    setRows(5);
    triggerSearch({ page: 1, limit: 5 })
  }, [filterApplyList]);

  useEffect(() => {
    if (gridApiData) {
      setGridData(gridApiData.items)
    }
  }, [gridApiData])


  const handleSearchItemChange = (newItems) => {
    setSearchFilterData((prev) => ({
      ...prev,
      [filterSearchBy]: newItems,
    }));
  };


  useEffect(() => {
    if (gridSearchApiData) {
      console.log(filterSearchBy);
      if (filterSearchBy === vehicleId) {
        const data = gridApiData.items.map(item => ({
          name: item[vehicleId],
          id: item.id
        }));
        handleSearchItemChange(data)
      }
      if (filterSearchBy === actions) {
        const data = gridApiData.items.map(item => ({
          name: item[actions],
          id: item.id
        }));
        handleSearchItemChange(data)
      }
      if (filterSearchBy === medallionNumber) {
        const data = gridApiData.items.map(item => ({
          name: item[medallionNumber],
          id: item.id
        }));
        handleSearchItemChange(data)
      }
      if (filterSearchBy === driverId) {
        const data = gridApiData.items.map(item => ({
          name: item[driverId],
          id: item.id
        }));
        handleSearchItemChange(data)
      }
    }
  }, [gridSearchApiData])

  const onPageChange = useCallback((data) => {
    setRows(data.rows);
    triggerSearch({ page: Number(data.page) + 1, limit: data.rows })
  }, [])

  const customRender = (column, rowData) => {
    if (column.field === "actions") {
      return (
        <div className='d-flex align-items-center gap-4'>
          <Button onClick={() => (navigate(`/miscellaneous/manage-ezpass/${rowData?.id}`))} className="manage-table-action-svg" icon={<Img name="audit_trail" alt="Car" />}></Button>
        </div>
      )
    }
    if (column.field === dateSent) {
      return <p>{yearMonthDate(rowData?.[column?.field])}</p>
    }

    return rowData[column.field] || "-";
  }
  const refreshFunc = () => {
    triggerSearch({ page: page, limit: rows });
  }

  const visibleCount = Object.values(visibleColumnsState).filter(Boolean).length;
  const items = [
    { template: () => <Link to="/" className="font-semibold text-grey">Home</Link> },
    { template: () => <Link to="/miscellaneous" className="font-semibold text-grey">Miscellaneous</Link> },
    { template: () => <Link to="/miscellaneous" className="font-semibold text-grey">Correspondence</Link> },
    { template: () => <Link to={`/miscellaneous/manage-correspondence`} className="font-semibold text-black">Manage Correspondence</Link> },
  ];
  const [triggerExport] = useLazyExportCorrespondenceQuery();


  return (
    <div className='common-layout w-100 h-100 d-flex flex-column gap-4'>
      <div>
        <BBreadCrumb breadcrumbItems={items} separator={"/"} />
        <div className='d-flex align-items-center justify-content-between w-100'>
          <div>
            <p className="topic-txt">Manage Correspondence</p>
            <GridShowingCount rows={rows} total={gridApiData?.total_count} />
          </div>
          <div className='d-flex gap-3'>
            <Menu model={menuItems} popup ref={menu} />
            <Button data-testid="column-filter-btn"
              text
              onClick={(e) => menu.current.toggle(e)}
              className="d-flex justify-content-center w-auto align-items-center position-relative" icon={() => <Img name={"ic_column_filter"} />} >
              {visibleCount > 0 && <Badge className="badge-icon" value={visibleCount} severity="warning"></Badge>}
            </Button>
            <Divider layout="vertical" />
            <Button data-testid="refresh_btn" icon={() => <Img name={"refresh"} />} onClick={refreshFunc}></Button>
          </div>
        </div>
        <div className="d-flex justify-content-end ">
          <ExportBtn
            {...{
              sortFieldMapping,
              sortField,
              sortOrder,
              triggerExport,
              filterApplyList,
              fileName: `correspondence_`,
            }}
          ></ExportBtn>
        </div>
      </div>
      <DataTableComponent
        columns={filteredColumns}
        data={gridData}
        selectionMode=""
        selectedData={selectedProducts}
        onSelectionChange={(e) => setSelectedProducts(e.value)}
        renderColumn={customRender}
        onPageChange={onPageChange}
        totalRecords={gridApiData?.total_count}
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
  )
}

export default MangeCorrespondence