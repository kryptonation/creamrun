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
import { useEzpassAssociateMutation, useEzpassPostBATMMutation, useLazyExportEzpassManageQuery } from '../../../redux/api/ezpassApi';
import '../../manage/_manage_medallian.scss';
import { generateFieldObject } from '../../../utils/generateFieldObject';
import ExportBtn from '../../../components/ExportBtn';
import GridShowingCount from '../../../components/GridShowingCount';
import { useLazyManageDriverPaymentsQuery } from '../../../redux/api/paymentApi';
import PdfViewModal from '../../../components/PdfViewModal';
import PdfPrinter from '../../../components/PdfPrinter';
import DownloadBtn from '../../../components/DownloadBtn';
import { gridToolTipOptins } from '../../../utils/tooltipUtils';
import { removeUnderScore } from '../../../utils/utils';

const ManageDriverPayments = () => {
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
  const [triggerGetEzpass, { data: ezpassDetail, isSuccess: isGridDataSuccess }] = useLazyManageDriverPaymentsQuery();
  const [triggerGetSearchEzpass, { data: ezpassSearchDetail }] = useLazyManageDriverPaymentsQuery();
  const [filterSearchBy, setFilterSearchBy] = useState("");

  const receiptNumber = "receipt_number";
  const medallionNumber = "medallion_number";
  const tlcLicense = "tlc_license_number";
  const driverId = "driver_id";
  const plateNumber = "plate_number";
  const due = "due";
  const paid = "paid";
  const applied = "applied";
  const paymentType = "payment_type";
  const status = "View";
  const dateFrom = "date_from";
  const dateTo = "date_to";

  const fields = [
    { key: receiptNumber, label: "Receipt Number", formatType: "Search" },
    { key: medallionNumber, label: "Medallion No", formatType: "Search" },
    { key: tlcLicense, label: "TLC License", formatType: "Search" },
    { key: driverId, label: "Driver ID", formatType: "Search" },
    { key: plateNumber, label: "Plate Number", formatType: "Search" },
    { key: due, label: "Due", formatType: "Search", sortable: false, filter: false },
    { key: paid, label: "Paid", formatType: "select", sortable: false, filter: false },
    { key: applied, label: "Applied", formatType: "select", sortable: false, filter: false },
    { key: paymentType, label: "Payment Type", formatType: "search" },
    { key: dateFrom, label: "  Date From  ", sortable: false, filter: false },
    { key: dateTo, label: "  Date To  ", sortable: false, filter: false },

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
          //   [paid]: {
          //     ...prev[paid],
          //     data: filterSelectGenerate(
          //       ezpassDetail?.statuses || []
          //     ),
          //   },
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
    if (type.field === receiptNumber) {
      queryParams.append(receiptNumber, value);
    }
    if (type.field === medallionNumber) {
      queryParams.append(medallionNumber, value);
    }
    if (type.field === driverId) {
      queryParams.append(driverId, value);
    }
    if (type.field === paymentType) {
      queryParams.append(paymentType, value);
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
      //   [receiptNumber]: ["transaction_from_date", "transaction_to_date"],
      [receiptNumber]: receiptNumber,
      [driverId]: driverId,
      [plateNumber]: plateNumber,
      [medallionNumber]: medallionNumber,
      [tlcLicense]: tlcLicense,
      [paymentType]: paymentType,
      //   [due]: ["posting_from_date", "posting_to_date"],
      //   [paid]: "transaction_status",
      //   [status]: status,
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
      if (filterSearchBy === receiptNumber) {
        const data = ezpassSearchDetail.items.map(item => ({
          name: item[receiptNumber],
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
      if (filterSearchBy === paymentType) {
        const data = ezpassSearchDetail.items.map(item => ({
          name: item[paymentType],
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
      const parts = rowData.document_name?.split('.');
      const extension = "pdf"; // The last element is the extension
      const filename = "receipt";
      const path = rowData.receipt_pdf_url;


      return (
        <PdfViewModal
          triggerButton={
            <div
              className="d-flex align-items-center gap-2 doc-img"
              data-testid="individual-upload-common-btn"
            >
              <Button
                icon={<Img name="black_ic_eye" />}
                pt={{ root: { "data-testid": `eye-icon-btn` } }}
                {...gridToolTipOptins("Preview Document")}
              ></Button>
            </div>
          }
          title={removeUnderScore(rowData?.document_type).replace(
            /\b\w/g,
            (char) => char.toUpperCase()
          )}
          downloadUrl={path}
          downloadName={filename}
          extension={extension}
          previewUrl={path}
        />
      )
      // return (
      //   <div className='d-flex align-items-center gap-4'>
      //     <PdfViewModal
      //       triggerButton={
      //         <Button data-testid="doc-btn" className="manage-table-action-svg" icon={<Img name="document" alt="Car" />}></Button>
      //       }
      //       title="Upload Invoices"
      //       downloadUrl={path}
      //       downloadName={filename}
      //       extension={extension}
      //       previewUrl={path}
      //     />
      //     {/* <PdfPrinter url={""} /> */}
      //     <DownloadBtn url={path} ext={extension} name={filename}>
      //       <a href={path} rel="noreferrer" title={filename} target="_blank" className="download-link ms-1 d-flex align-items-center ">
      //         <Button text icon={() => <Img name="print"></Img>}></Button>
      //       </a>
      //     </DownloadBtn>
      //     {/* <Button data-testid="print-btn" onClick={() => (navigate(`/miscellaneous/manage-ezpass/${rowData?.id}`))} className="manage-table-action-svg" icon={<Img name="print" alt="Car" />}></Button> */}
      //     <Button data-testid="audit-trail-btn" onClick={() => (navigate(`audit-trail`))} className="manage-table-action-svg" icon={<Img name="audit_trail" alt="Car" />}></Button>
      //   </div>
      // )
    }
    if (column.field === dateFrom) {
      return (<>{yearMonthDate(rowData?.date_from)}</>)
    }
    if (column.field === dateTo) {
      return (<>{yearMonthDate(rowData?.date_to)}</>)
    }
    // if (column.field === receiptNumber) {
    //   return <p>{yearMonthDate(rowData?.[column?.field])}</p>
    // }
    // if (column.field === due) {
    //   return <p>{yearMonthDate(rowData?.[column?.field])}</p>
    // }
    return rowData[column.field] || "-";
  }
  const refreshFunc = () => {
    triggerSearch({ page: page, limit: rows });
  }

  const visibleCount = Object.values(visibleColumnsState).filter(Boolean).length;
  const items = [
    { template: () => <Link to="/manage-driver-payments" className="font-semibold text-grey">Payments</Link> },
    { template: () => <Link to="/manage-driver-payments" className="font-semibold text-grey"> Manage Driver Payments</Link> },
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
            <p className="topic-txt">Manage Driver Payments</p>
            <GridShowingCount rows={rows} total={ezpassDetail?.total_items} />
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
              fileName: `manage_driver_payments_`,
            }}
          ></ExportBtn>
        </div>

      </div>
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
};

export default ManageDriverPayments;
