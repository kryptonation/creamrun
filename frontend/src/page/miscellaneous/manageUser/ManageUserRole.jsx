import React,{ useEffect, useRef, useState } from 'react'
import BBreadCrumb from '../../../components/BBreadCrumb'
import { Link } from 'react-router-dom';
import DataTableComponent from '../../../components/DataTableComponent';
import Img from "../../../components/Img";
import { Menu } from "primereact/menu";
import { yearMonthDate } from "../../../utils/dateConverter";
import { useDispatch } from "react-redux";
import { Button } from "primereact/button";
import { useLazyGetVehiclesQuery } from "../../../redux/api/vehicleApi";
import { setSelectedMedallion } from "../../../redux/slice/selectedMedallionDetail";
import { Checkbox } from "primereact/checkbox";
import { Badge } from 'primereact/badge';
import { Divider } from 'primereact/divider';
import '../../manage/_manage_medallian.scss'

const ManageUserRole = () => {
    const bt = useRef(null);
    const [selectedProducts, setSelectedProducts] = useState(null);
    const [page, setPage] = useState(1);
    const [rows, setRows] = useState(5);
    const [filterApplyList, setFilterApplyList] = useState(new Map());
    const [sortField, setSortField] = useState('');
    const [sortOrder, setSortOrder] = useState(1);
    const [searchFilterData, setSearchFilterData] = useState([]);
    const [triggerGetVehicles, { data: driverDetail }] = useLazyGetVehiclesQuery();
    const [isFilterSearch, setFilterSearch] = useState(false);
    const [filterSearchBy, setFilterSearchBy] = useState(false);
  
    const sortFieldMapping = {
      vin: "vin",
      make: "make",
      model: "model",
      year: "year",
      vehicle_type: "vehicle_type",
      entity_name: "entity_name",
      m_status: "vehicle_status",
    };
  
    const dataTable=[
        {
            useName:"Alkema",
            lastName:"Angelina",
            mailId:"alkema@gmail.com",
            type:"Internal",
            role:"Management",
            permission:"permission1"
        }
    ]
  
    const columns = [
      {
        field: "useName",
        header: "User Name",
        headerAlign: "left",
        bodyAlign: "left",
        sortable: true, filter: true,
      },
      { field: "lastName", header: "Last Name ", headerAlign: "left", sortable: true, filter: true, },
      { field: "mailId", header: "Mail ID", sortable: true, filter: true, },
      { field: "type", header: "Type", sortable: true, filter: true, },
      { field: "role", header: "Roles", sortable: true, filter: true, },
      { field: "permission", header: "Permissions", sortable: true, filter: true, },
      { field: "m_status", header: "", sortable: false, filter: false, },
      { field: "options", header: "" },
    ];
  
    const filterData = {
      'useName': {
        value: '', matchMode: 'contains', label: "VIN", data: [
        ], formatType: "Search",
      },
      'lastName': {
        value: '', matchMode: 'contains', label: "Make", data: [
          { value: "Kia", label: "Kia" },
          { value: "hyundai", label: "Hyundai" },
          { value: "Toyota", label: "Toyota" },
          { value: "Mahindra", label: "Mahindra" },
          { value: "Maruti", label: "Maruti" },
        ], formatType: "select"
      },
      'mailId': {
        value: '', matchMode: 'contains', label: "Model", data: [
          { value: "Escape", label: "Escape" }], formatType: "select"
      },
      'type': {
        value: '', matchMode: 'contains', label: "Year", formatType: "date"
      },
  
      'role': {
        value: '', matchMode: 'contains', label: "Model", data: [
          { value: "Regular", label: "Regular" },
          { value: "Wav", label: "WAV" },
          { value: "Both", label: "Both" },], formatType: "select"
      },
  
      'permission': {
        value: '', matchMode: 'contains', label: "Model", data: [
          { value: "Available", label: "Available" },
          { value: "Hack-up-in-progress", label: "Hack-up in progress" },
          { value: "Hacked-up", label: "Hacked up" },
          { value: "Active", label: "Active" },
          { value: "De-Hack-up-in-progress", label: "De-Hackup in progress" },
          { value: "Archived", label: "Archived" },], formatType: "select"
      },
    }
  
    const menu = useRef(null);
    const [visibleColumns, setVisibleColumns] = useState({
      useName: true,
      lastName: true,
      mailId: true,
      type: true,
      role: true,
      permission: true,
      m_status: true,
    });
  
    const menuItems = columns.map((col) => ({
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
  
    const handleColumnVisibilityChange = (field) => {
      setVisibleColumns((prev) => ({
        ...prev,
        [field]: !prev[field],
      }));
    };
  
    const filteredColumns = Object.values(visibleColumns).every((isVisible) => !isVisible)
      ? columns
      : columns.filter((col) => visibleColumns[col.field]);
  
    const dispatch = useDispatch();
  
    const handleSelectvehicle = (data) => {
      dispatch(setSelectedMedallion({ object_lookup: data.vin, object_name: "vehicle", ...data }));
    };
  
    const searchData = (type, value) => {
      console.log("searchData ", type, " value : ", value);
      const queryParams = new URLSearchParams({
        page: 1,
        per_page: 5,
      });
  
      if (type.field === "vin") {
        queryParams.append('vin', value);
      }
  
      if (type.field === "entity_name") {
        queryParams.append('entity_name', value);
      }
  
      setFilterSearch(true)
      setFilterSearchBy(type.field)
      triggerGetVehicles(`?${queryParams?.toString()}`)
    }
  
  
    const triggerSearch = ({ page, limit, sField = sortField, sOrder = sortOrder }) => {
      setFilterSearch(false)
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
      triggerGetVehicles(`?${queryParams?.toString()}`)
  
    };
  
    useEffect(() => { triggerSearch({ page: 1, limit: 5 }) }, []);
  
    const clearAllFilter = () => {
      setFilterApplyList(new Map())
    }
  
    const updateFilter = (option, data = null, action = "add") => {
      const updatedFilterApplyList = new Map(filterApplyList);
  
      const fieldMapping = {
        vin: "vin",
        make: "make",
        model: "model",
        year: "year",
        vehicle_type: "vehicle_type",
        entity_name: "entity_name",
        m_status: "vehicle_status",
      };
  
      const fieldKey = fieldMapping[option.field];
  
      if (action === "add") {
        if (Array.isArray(fieldKey)) {
          updatedFilterApplyList.set(fieldKey, yearMonthDate(data.fromDate));
        } else if (fieldKey) {
          updatedFilterApplyList.set(fieldKey, data?.[0]?.name || data);
        }
      } else if (action === "remove") {
        if (Array.isArray(fieldKey)) {
          fieldKey.forEach((key) => updatedFilterApplyList.delete(key));
        } else if (fieldKey && updatedFilterApplyList.has(fieldKey)) {
          updatedFilterApplyList.delete(fieldKey);
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
      if (driverDetail) {
        if (!isFilterSearch) {
          // setVehicles(driverDetail.items)
        } else {
  
          const data = driverDetail.items.map(vehicle => ({
            name: filterSearchBy === "entity_name" ? vehicle.entity_name : vehicle.vin,
            id: vehicle.vehicle_id
          }));
  
          console.log("data : ", data)
          setSearchFilterData(data)
        }
      }
    }, [driverDetail])

    const onPageChange = (data) => {
      setRows(data.rows);
      triggerSearch({ page: Number(data.page) + 1, limit: data.rows })
    }
  

    const moveToHackUp = (rowData) => {
      handleSelectvehicle(rowData)
      // setFlow("HACK_UP")
      // setConfirmationTitle('Confirmation on Vehicle Hack-Up');
    }
  
    const customRender = (column, rowData) => {
      if (column.field === "m_status") {
        return (
            <Button className="w-15" icon={<Img name="pencil_edit" alt="Car" />} onClick={() => moveToHackUp(rowData)}></Button>
        )
      } 
      return rowData[column.field];
    }
    const refreshFunc = () => {
        triggerSearch({ page: page, limit: rows });
    }
  
    const visibleCount = Object.values(visibleColumns).filter(Boolean).length;
    const items = [
        { label: 'Demo', template: () => <Link to="/" className="font-semibold text-grey">Home</Link> },
        { label: 'Demo', template: () => <Link to="/miscellaneous" className="font-semibold text-grey">Miscellaneous</Link> },
        { label: 'Demo', template: () => <Link to={`/miscellaneous/manage-ezpass`} className="font-semibold text-black">Manage User Roles</Link> },
      ];
  return (
    <div className='common-layout w-100 h-100 d-flex flex-column gap-4'>
    <div>
    <BBreadCrumb breadcrumbItems={items} separator={"/"}/> 
    <div className='d-flex align-items-center justify-content-between w-100'>
          <div>
            <p className="topic-txt">Manage User Roles</p>
            <p className='regular-text text-grey'>Showing {rows} of <span data-testid="total_item_count">{driverDetail?.total_items}</span> Lists... </p>
          </div>
          <div className='d-flex gap-3'>
            <Menu model={menuItems} popup ref={menu} />
            <div className="d-flex justify-content-center align-items-center position-relative" style={{ width: 40 }}>
              <Button ref={bt} icon={() => <Img name={"ic_column_filter"} />} onClick={(e) => menu.current.toggle(e)}></Button>
              {visibleCount > 0 && <Badge className="badge-icon" value={visibleCount} severity="warning"></Badge>}
            </div>
            <Divider layout="vertical" />
            <Button data-testid="refresh_btn" icon={() => <Img name={"refresh"} />} onClick={refreshFunc}></Button>
          </div>
        </div>
    </div>
    <DataTableComponent
        columns={filteredColumns}
        data={dataTable}
        selectionMode="checkbox"
        selectedData={selectedProducts}
        onSelectionChange={(e) => setSelectedProducts(e.value)}
        renderColumn={customRender}
        onPageChange={onPageChange}
        totalRecords={driverDetail?.total_items}
        dataKey="vehicle_id"
        filterData={filterData}
        filterSearchData={searchFilterData}
        clearAllFilter={clearAllFilter}
        clearFilter={clearFilter}
        pSortField={sortField}
        pSortOrder={sortOrder}
        searchData={searchData}
        filterApply={filterApply}
        onSortApply={onSortApply}
      />
      </div>
  )
}

export default ManageUserRole