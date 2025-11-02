import React, { useEffect, useRef, useState } from 'react'
import BBreadCrumb from '../../../components/BBreadCrumb'
import { Link, useLocation } from 'react-router-dom';
import DataTableComponent from '../../../components/DataTableComponent';
import Img from "../../../components/Img";
import { Menu } from "primereact/menu";
import { useNavigate } from "react-router-dom";
import { yearMonthDate } from "../../../utils/dateConverter";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Badge } from 'primereact/badge';
import { Divider } from 'primereact/divider';
import { useEzpassAssociateMutation, useEzpassPostBATMMutation, useLazyExportEzpassLogsQuery, useLazyExportEzpassManageQuery, useLazyGetEzpassQuery } from '../../../redux/api/ezpassApi';
import '../../manage/_manage_medallian.scss';
import { handleExport } from '../../../utils/gridUtils';
import { generateFieldObject } from '../../../utils/generateFieldObject';
import { filterSelectGenerate } from '../../../utils/utils';
import ExportBtn from '../../../components/ExportBtn';
import GridShowingCount from '../../../components/GridShowingCount';

const ManageEzpass = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedProducts, setSelectedProducts] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(5);
  const [filterApplyList, setFilterApplyList] = useState(new Map());
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState(1);
  const [searchFilterData, setSearchFilterData] = useState({});
  const [triggerGetEzpass, { data: ezpassDetail, isSuccess: isGridDataSuccess }] = useLazyGetEzpassQuery();
  const [triggerGetSearchEzpass, { data: ezpassSearchDetail }] = useLazyGetEzpassQuery();
  const [filterSearchBy, setFilterSearchBy] = useState("");


  const transactionDate = "transaction_date";
  const medallionNumber = "medallion_no";
  const driverId = "driver_id";
  const plateNumber = "plate_no";
  const postingDate = "posting_date";
  const resolutionStatus = "status";
  const status = "View";

  const fields = [
    { key: transactionDate, label: "Transaction Date", formatType: "date" },
    { key: medallionNumber, label: "Medallion No", formatType: "Search" },
    { key: driverId, label: "Driver ID", formatType: "Search" },
    { key: plateNumber, label: "Plate Number", formatType: "Search" },
    { key: postingDate, label: "Posting Date", formatType: "date" },
    { key: resolutionStatus, label: "Status", formatType: "select" },
    { key: status, label: "", formatType: "action", sortable: false, filter: false }, // Assuming "View" is an action button
  ];

  const { sortFieldMapping, columns, filterVar, visibleColumns } =
    generateFieldObject(fields);

  const [filterData, setFilterData] = useState(filterVar);
  const [visibleColumnsState, setVisibleColumnsState] =
    useState(visibleColumns);

  const menu = useRef(null);

  useEffect(() => {
    if (isGridDataSuccess) {
      setFilterData((prev) => {
        return {
          ...prev,
          [resolutionStatus]: {
            ...prev[resolutionStatus],
            data: filterSelectGenerate(
              ezpassDetail?.statuses || []
            ),
          },
        };
      });
    }
  }, [ezpassDetail, isGridDataSuccess]);

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

    if (type.field === plateNumber) {
      queryParams.append(plateNumber, value);
    }
    if (type.field === resolutionStatus) {
      queryParams.append(resolutionStatus, value);
    }
    if (type.field === medallionNumber) {
      queryParams.append(medallionNumber, value);
    }
    if (type.field === driverId) {
      queryParams.append(driverId, value);
    }

    setFilterSearchBy(type.field)
    triggerGetSearchEzpass(`?${queryParams?.toString()}`)
  }


  const triggerSearch = ({ page, limit, sField = sortField, sOrder = sortOrder }) => {
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
    triggerGetEzpass(`?${queryParams?.toString()}`)

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
      [transactionDate]: ["transaction_from_date", "transaction_to_date"],
      [medallionNumber]: medallionNumber,
      [driverId]: driverId,
      [plateNumber]: plateNumber,
      [postingDate]: ["posting_from_date", "posting_to_date"],
      [resolutionStatus]: "transaction_status",
      [status]: status,
    };

    const fieldKey = fieldMapping[option.field];

    if (action === "add") {
      setFilterData(prevState => ({
        ...prevState,
        [option.field]: { ...prevState[option.field], value: "ff", filterDemoData: data },
      }));

      if (Array.isArray(fieldKey)) {
        updatedFilterApplyList.set(fieldKey[0], yearMonthDate(data.fromDate));
        updatedFilterApplyList.set(fieldKey[1], yearMonthDate(data.toDate));
      } else if (fieldKey) {
        if (Array.isArray(data)) {
          updatedFilterApplyList.set(fieldKey, data.map(item => item.name).join(","));
        } else {
          updatedFilterApplyList.set(fieldKey, data.name || data);
        }
        // console.log("🚀 ~ updateFilter ~ fieldKey:", fieldKey,data.name, data)
        // updatedFilterApplyList.set(fieldKey, data.map(item => item.name).join(","));
      }
    } else if (action === "remove") {
      setFilterData(prevState => ({
        ...prevState,
        [option.field]: { ...prevState[option.field], value: "", filterDemoData: "" },
      }));
      if (Array.isArray(fieldKey)) {
        fieldKey.forEach((key) => updatedFilterApplyList.delete(key));
      } else if (fieldKey && updatedFilterApplyList.has(fieldKey)) {
        updatedFilterApplyList.delete(fieldKey);
      }
    }
    console.log(updatedFilterApplyList);

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
    if (ezpassDetail) {
      setVehicles(ezpassDetail.items)
    }
  }, [ezpassDetail])

  const handleSearchItemChange = (newItems) => {
    setSearchFilterData((prev) => ({
      ...prev,
      [filterSearchBy]: newItems,
    }));
  };

  useEffect(() => {
    if (ezpassSearchDetail) {
      if (filterSearchBy === plateNumber) {
        const data = ezpassSearchDetail.items.map(item => ({
          name: item[plateNumber],
          id: item.id
        }));
        handleSearchItemChange(data)
      }
      if (filterSearchBy === resolutionStatus) {
        const data = ezpassSearchDetail.items.map(item => ({
          name: item[resolutionStatus],
          id: item.id
        }));
        handleSearchItemChange(data)
      }
      if (filterSearchBy === medallionNumber) {
        const data = ezpassSearchDetail.items.map(item => ({
          name: item[medallionNumber],
          id: item.id
        }));
        handleSearchItemChange(data)
      }
      if (filterSearchBy === driverId) {
        const data = ezpassSearchDetail.items.map(item => ({
          name: item[driverId],
          id: item.id
        }));
        handleSearchItemChange(data)
      }
    }
  }, [ezpassSearchDetail])

  const onPageChange = (data) => {
    setRows(data.rows);
    triggerSearch({ page: Number(data.page) + 1, limit: data.rows })
  }

  const customRender = (column, rowData) => {
    if (column.field === "View") {
      return (
        <div className='d-flex align-items-center gap-4'>
          {/* <Button className="w-15" icon={<Img name="pencil_edit" alt="Car" />}></Button> */}
          <Button data-testid="eye-icon" onClick={() => (navigate(`/miscellaneous/manage-ezpass/${rowData?.id}`))} className="manage-table-action-svg" icon={<Img name="eye" alt="Car" />}></Button>
        </div>
      )
    }
    if (column.field === transactionDate) {
      return <p>{yearMonthDate(rowData?.[column?.field])}</p>
    }
    if (column.field === postingDate) {
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
    { template: () => <Link to={`/miscellaneous/manage-ezpass`} className="font-semibold text-black">Manage EZPass</Link> },
  ];
  const [triggerExport] = useLazyExportEzpassManageQuery();
  const [lazyAssociate] = useEzpassAssociateMutation();
  const [handlePostBATMApi] = useEzpassPostBATMMutation();

  const handleAssociate = async () => {
    return await lazyAssociate().then(() => {
      refreshFunc();
    });
  }
  const handlePostBATM = async () => {
    return await handlePostBATMApi().then(() => {
      refreshFunc();
    });
  }

  return (
    <div className='common-layout w-100 h-100 d-flex flex-column gap-4'>
      <div>
        <BBreadCrumb breadcrumbItems={items} separator={"/"} />
        <div className='d-flex align-items-center justify-content-between w-100'>
          <div>
            <p className="topic-txt">Manage EZPass</p>
            <GridShowingCount rows={rows} total={ezpassDetail?.total_items} />
            {/* <p className='regular-text text-grey'>Showing { rows } of <span data-testid="total_item_count">{ezpassDetail?.total_items}</span> Lists... </p> */}
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
        <div className="d-flex justify-content-end">
          {
            location.pathname === "/ezpass-trips" ?
              <>
                <Button data-testid="ic_associate" text onClick={handleAssociate} className='regular-text gap-2 d-flex' icon={() => <Img name="ic_associate" className={"icon-blue"} />} >Associate with BATM</Button>
                <Divider layout="vertical" />
                <Button data-testid="create-pvb" text onClick={handlePostBATM} className='regular-text gap-2 d-flex' icon={() => <Img name="batm" className={"icon-blue"} />} >Post to BATM</Button>
                <Divider layout="vertical" />
              </>
              : null}
          <ExportBtn
            {...{
              sortFieldMapping,
              sortField,
              sortOrder,
              triggerExport,
              filterApplyList,
              fileName: `ezpass_`,
            }}
          ></ExportBtn>
        </div>

      </div>
      {/* <div className="d-flex justify-content-end ">
        <Button data-testid="export-btn" text className='regular-text gap-2 d-flex' onClick={exportFile} icon={() => <Img name="ic_export" />} >Export as .XLS</Button>
      </div> */}
      <DataTableComponent
        columns={filteredColumns}
        data={vehicles}
        selectedData={selectedProducts}
        onSelectionChange={(e) => setSelectedProducts(e.value)}
        renderColumn={customRender}
        onPageChange={onPageChange}
        totalRecords={ezpassDetail?.total_items}
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

export default ManageEzpass