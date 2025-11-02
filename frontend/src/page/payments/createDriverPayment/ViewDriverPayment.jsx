import { useEffect, useState } from "react";
import DataTableComponent from "../../../components/DataTableComponent";
import { useNavigate } from "react-router-dom";
import { timeFormatWithRange, timeHourandMinutes, yearMonthDate } from "../../../utils/dateConverter";
import Img from "../../../components/Img";
import { generateFieldObject } from "../../../utils/generateFieldObject";
import { useLazyGetTripsQuery } from "../../../redux/api/tripApi";
import { Button } from "primereact/button";
import { useMoveCaseDetailMutation } from "../../../redux/api/medallionApi";
import { useLazyViewDriverPaymentsQuery } from "../../../redux/api/paymentApi";

const ViewDriverPayment = ({ currentStep, caseId, reload, currentStepId }) => {
  const navigate = useNavigate();
  const [selectedProducts, setSelectedProducts] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(5);
  const [filterApplyList, setFilterApplyList] = useState(new Map());
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState(1);
  const [searchFilterData, setSearchFilterData] = useState([]);
  const [triggerGetEzpass, { data: ezpassDetail }] = useLazyViewDriverPaymentsQuery();
  console.log("🚀 ~ ViewDriverPayment ~ ezpassDetail:", ezpassDetail)
  const [isFilterSearch, setFilterSearch] = useState(false);
  const [filterSearchBy, setFilterSearchBy] = useState(false);
  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();

  const tripId = "trip_id";
  const medallionNumber = "medallion_number";
  const driverId = "driver_id";
  const plateNumber = "plate_number";
  const postingDate = "posting_date";
  const resolutionStatus = "resolution_status";
  const fields = [
    { key: "trip_id", label: "Trip ID", formatType: "search" },
    { key: "trip_date", label: "Trip Date", formatType: "Search" },
    { key: "driver_id", label: "Driver ID", formatType: "Search" },
    { key: "medallion_number", label: "Medallion No", formatType: "Search" },
    { key: "plate_number", label: "Vehicle Plate", formatType: "Search" },
    { key: "tlc_license", label: "TLC License No", formatType: "date" },
    { key: "trip_begin_time", label: "Trip Begin Time", formatType: "date" },
    { key: "trip_end_time", label: "Trip End Time", formatType: "date" },
    { key: "dtr_amount", label: "DTR", formatType: "Search" },
    {
      key: "m_status",
      label: "",
      formatType: "select",
      filter: false,
      sortable: false,
    },
  ];

  const { sortFieldMapping, columns, filterVar, fieldMapping } =
    generateFieldObject(fields);

  const [filterData, setFilterData] = useState(filterVar);

  const searchData = (type, value) => {
    const queryParams = new URLSearchParams({
      page: 1,
      per_page: 5,
    });

    if (type.field === tripId) {
      queryParams.append(tripId, value);
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

    setFilterSearch(true);
    setFilterSearchBy(type.field);
    triggerGetEzpass(`${caseId}/${currentStepId}?${queryParams?.toString()}`);
  };

  const triggerSearch = ({
    page,
    limit,
    sField = sortField,
    sOrder = sortOrder,
  }) => {
    setFilterSearch(false);
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
    triggerGetEzpass(`${caseId}/${currentStepId}?${queryParams?.toString()}`);
  };

  useEffect(() => {
    triggerSearch({ page: 1, limit: 5 });
  }, []);

  const clearAllFilter = () => {
    setFilterApplyList(new Map());
    setFilterData((prevState) => {
      const updatedState = { ...prevState };

      Object.keys(updatedState).forEach((field) => {
        updatedState[field].value = "";
        updatedState[field].filterDemoData = "";
      });

      return updatedState;
    });
  };

  const updateFilter = (option, data = null, action = "add") => {
    const updatedFilterApplyList = new Map(filterApplyList);
    const fieldKey = fieldMapping[option.field];

    if (action === "add") {
      setFilterData((prevState) => ({
        ...prevState,
        [option.field]: {
          ...prevState[option.field],
          value: "ff",
          filterDemoData: data,
        },
      }));

      if (Array.isArray(fieldKey)) {
        updatedFilterApplyList.set(
          fieldKey[0],
          `${yearMonthDate(data.fromDate)},${yearMonthDate(data.toDate)}`
        );
      } else if (fieldKey) {
        updatedFilterApplyList.set(fieldKey, data?.[0]?.name || data);
      }
    } else if (action === "remove") {
      setFilterData((prevState) => ({
        ...prevState,
        [option.field]: {
          ...prevState[option.field],
          value: "",
          filterDemoData: "",
        },
      }));
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
  };

  const onSortApply = (field, order) => {
    setSortOrder(() => {
      return order;
    });
    setSortField(() => {
      return field;
    });
    setPage(1);
    setRows(5);
    triggerSearch({ page: 1, limit: 5, sField: field, sOrder: order });
  };

  const filterApply = (option, data) => {
    if (data) {
      updateFilter(option, data, "add");
    }
  };

  useEffect(() => {
    setPage(1);
    setRows(5);
    triggerSearch({ page: 1, limit: 5 });
  }, [filterApplyList]);

  useEffect(() => {
    if (ezpassDetail) {
      if (!isFilterSearch) {
        setVehicles(ezpassDetail.items);
      } else {
        if (filterSearchBy === plateNumber) {
          const data = ezpassDetail.items.map((item) => ({
            name: item[plateNumber],
            id: item.id,
          }));
          console.log("🚀 ~ data ~ ezpassDetail:", ezpassDetail)
          setSearchFilterData(data);
        }
        if (filterSearchBy === resolutionStatus) {
          const data = ezpassDetail.items.map((item) => ({
            name: item[resolutionStatus],
            id: item.id,
          }));
          console.log("🚀 ~ data ~ ezpassDetail:", ezpassDetail)
          setSearchFilterData(data);
        }
        if (filterSearchBy === medallionNumber) {
          const data = ezpassDetail.items.map((item) => ({
            name: item[medallionNumber],
            id: item.id,
          }));
          console.log("🚀 ~ data ~ ezpassDetail:", ezpassDetail)
          setSearchFilterData(data);
        }
        if (filterSearchBy === driverId) {
          const data = ezpassDetail.items.map((item) => ({
            name: item[driverId],
            id: item.id,
          }));
          console.log("🚀 ~ data ~ ezpassDetail:", ezpassDetail)
          setSearchFilterData(data);
        }
      }
        console.log("🚀 ~ useEffect ~ ezpassDetail:", ezpassDetail)
    }
  }, [ezpassDetail]);
  console.log("🚀 ~ ViewDriverPayment ~ ezpassDetail:", ezpassDetail)

  const onPageChange = (data) => {
    setRows(data.rows);
    triggerSearch({ page: Number(data.page) + 1, limit: data.rows });
  };

  const customRender = (column, rowData) => {
    console.log(rowData);
    
    if (column.field === "m_status") {
      return (
        <div className="d-flex align-items-center gap-4">
          {/* <Button className="w-15" icon={<Img name="pencil_edit" alt="Car" />}></Button> */}
          <Button
            onClick={() => navigate(`/view-trips/${rowData?.trip_id}`)}
            className="manage-table-location-svg"
            icon={<Img name="location" alt="location" />}
          ></Button>
        </div>
      );
    }
    if (column.field === tripId) {
      return <p>{rowData?.[column?.field]}</p>;
    }
    if (column.field === postingDate) {
      return <p>{yearMonthDate(rowData?.[column?.field])}</p>;
    }
    if (column.field === "trip_start_time") {
      return <p>{timeFormatWithRange(rowData?.[column?.field])}</p>; 
    }
    if (column.field === "trip_end_time") {
      return <p>{rowData?.[column?.field]}</p>; 
    }
    return rowData[column.field] || "-";
  };

  const handleSubmit = () => {
    moveCase({ params: caseId });
  };

  useEffect(() => {
    if (isMoveDataSuccess) {
      reload();
    }
  }, [isMoveDataSuccess]);
  return (
    <>
      <DataTableComponent
        columns={columns}
        data={vehicles}
        selectionMode=""
        selectedData={selectedProducts}
        onSelectionChange={(e) => setSelectedProducts(e.value)}
        renderColumn={customRender}
        onPageChange={onPageChange}
        totalRecords={ezpassDetail?.total}
        dataKey="trip_id"
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
      <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        <Button
          label="Submit Driver Payments"
          type="submit"
          onClick={() => {
            handleSubmit();
          }}
          data-testid="create-dtr"
          severity="warning"
          className="border-radius-0 primary-btn "
        />
      </div>
    </>
  );
};

export default ViewDriverPayment;
