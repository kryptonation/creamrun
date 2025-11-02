import React, { useEffect, useRef, useState } from "react";
import DataTableComponent from "../../components/DataTableComponent";
import BBreadCrumb from "../../components/BBreadCrumb";
import Img from "../../components/Img";
import { Menu } from "primereact/menu";
import "../manage/_manage_medallian.scss";
import BConfirmModal from "../../components/BConfirmModal";
import { Link, useNavigate } from "react-router-dom";
import {
  CREATE_VEHICLE_OWNER,
  SENDHACKUP,
  VEHICLE_REHACK_TYPE,
  VEHICLEREPAIR,
  DELIVERY_VEHICLE,
  ASSIGN_MEDALLION_TO_VEHICLE
} from "../../utils/constants";
import { useCreateCaseMutation } from "../../redux/api/medallionApi";
import { getYear, yearMonthDate } from "../../utils/dateConverter";
import { useDispatch, useSelector } from "react-redux";
import BToast from "../../components/BToast";
import { Button } from "primereact/button";
import { Divider } from "primereact/divider";
import {
  useLazyExportVehiclesQuery,
  useLazyGetVehiclesQuery,
  useLazyTerminateVehicleQuery,
  useLazyVehicleDehackUpQuery,
} from "../../redux/api/vehicleApi";
import { setSelectedMedallion } from "../../redux/slice/selectedMedallionDetail";
import { Checkbox } from "primereact/checkbox";
import { Badge } from "primereact/badge";
import BSuccessMessage from "../../components/BSuccessMessage";
import { filterSelectGenerate } from "../../utils/utils";
import BAuditTrailManageModal from "../../components/BAuditTrailManageModal";
import { menuTemplate } from "../../utils/gridUtils";
import ExportBtn from "../../components/ExportBtn";
import { gridToolTipOptins } from "../../utils/tooltipUtils";
import GridShowingCount from "../../components/GridShowingCount";
import VehicleOwnershipChangeModal from "./VehicleOwnershipChangeModal";
import RemoveOwnerModal from "./RemoveOwnerModal";
import { InputNumber } from "primereact/inputnumber";

const ManageVehicle = () => {
  const [isOpen, setOpen] = useState(false);
  const [ownershipModalOpen, setOwnershipModalOpen] = useState(false);
  const [removeOwnerModalOpen, setRemoveOwnerModalOpen] = useState(false);
  const [isSuccessModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState({
    title: "",
    message: "",
  });
  const [ownershipModalData, setOwnershipModalData] = useState([]);
  const navigate = useNavigate();
  const [selectedProducts, setSelectedProducts] = useState(null);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [confirmationTitle, setConfirmationTitle] = useState("");
  const [currentCaseType, setCurrentCaseType] = useState("");
  const [vehicles, setVehicles] = useState([]);
  // const [currentVehicleToDeactivateselectedProducts, setCurrentVehicleToDeactivate] = useState(null);
  const toast = useRef(null);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(5);
  const [filterApplyList, setFilterApplyList] = useState(new Map());
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState(1);
  const [searchFilterData, setSearchFilterData] = useState({});
  const [
    triggerGetVehicles,
    { data: vehicleData, isSuccess: isVehicleDataSuccess },
  ] = useLazyGetVehiclesQuery();
  const [triggerSearchGetVehicles, { data: vehicleSearchData }] =
    useLazyGetVehiclesQuery();

  const [filterSearchBy, setFilterSearchBy] = useState("");
  const [triggerExport] = useLazyExportVehiclesQuery();

  const [flow, setFlow] = useState("");
  const filterVar = {
    vin: {
      value: "",
      matchMode: "customFilter",
      label: "VIN",
      data: [],
      formatType: "Search",
    },
    vehicle_status: {
      value: "",
      matchMode: "customFilter",
      label: "Vehicle Status",
      data: filterSelectGenerate(vehicleData?.filtered_status),
      formatType: "select",
    },
    make: {
      value: "",
      matchMode: "customFilter",
      label: "Make",
      data: filterSelectGenerate(vehicleData?.filtered_make),
      formatType: "select",
    },
    model: {
      value: "",
      matchMode: "customFilter",
      label: "Model",
      data: filterSelectGenerate(vehicleData?.filtered_model),
      formatType: "select",
    },
    year: {
      value: "",
      matchMode: "customFilter",
      label: "Year",
      formatType: "year",
    },

    vehicle_type: {
      value: "",
      matchMode: "customFilter",
      label: "Vehicle type",
      data: filterSelectGenerate(vehicleData?.filtered_vehicle_type),
      formatType: "select",
    },

    m_status: {
      value: "",
      matchMode: "customFilter",
      label: "Model",
      data: [],
      formatType: "select",
    },
    entity_name: {
      value: "",
      matchMode: "customFilter",
      label: "Entity Name",
      data: [],
      formatType: "Search",
    },
  };
  const [filterData, setFilterData] = useState(filterVar);

  useEffect(() => {
    if (isVehicleDataSuccess) {
      setFilterData((prev) => {
        return {
          ...prev,
          vehicle_status: {
            ...prev["vehicle_status"],
            data: filterSelectGenerate(vehicleData?.filtered_status),
          },
          make: {
            ...prev["make"],
            data: filterSelectGenerate(vehicleData?.filtered_make),
          },
          model: {
            ...prev["model"],
            data: filterSelectGenerate(vehicleData?.filtered_model),
          },
          vehicle_type: {
            ...prev["vehicle_type"],
            data: filterSelectGenerate(vehicleData?.filtered_vehicle_type),
          },
        };
      });
    }
  }, [vehicleData, isVehicleDataSuccess]);

  const sortFieldMapping = {
    vin: "vin",
    vehicle_status: "vehicle_status",
    make: "make",
    model: "model",
    year: "year",
    vehicle_type: "vehicle_type",
    entity_name: "entity_name",
    m_status: "vehicle_status",
  };

  const columns = [
    {
      field: "vin",
      header: "VIN No",
      headerAlign: "left",
      bodyAlign: "left",
      dataTestId: "grid-vin",
      sortable: true,
      filter: true,
    },
    {
      field: "medallion_number",
      dataTestId: "grid-vehicle-status",
      header: "Medallion No",
      headerAlign: "left",
      sortable: false,
      filter: false,
    },
    {
      field: "vehicle_status",
      dataTestId: "grid-vehicle-status",
      header: "Status",
      headerAlign: "left",
      sortable: true,
      filter: true,
    },

    {
      field: "vehicle",
      dataTestId: "grid-vehicle-make",
      header: "Vehicle",
      headerAlign: "left",
      sortable: false,
      filter: false,
    },
    // {
    //   field: "model",
    //   dataTestId: "grid-vehicle-model",
    //   header: "Model",
    //   sortable: true,
    //   filter: true,
    // },
    // {
    //   field: "year",
    //   dataTestId: "grid-vehicle-year",
    //   header: "Year",
    //   sortable: true,
    //   filter: true,
    // },
    {
      field: "vehicle_type",
      dataTestId: "grid-vehicle-type",
      header: "Vehicle Type",
      sortable: true,
      filter: true,
    },
    {
      header: "Plate No",
      dataTestId: "grid-vehicle-year",
      field: "plate_number",
      sortable: false,
      filter: false,
    },
    {
      header: "Vehicle Price",
      dataTestId: "grid-vehicle-year",
      field: "vehicle_price",
      sortable: false,
      filter: false,
    },
    {
      header: "Total Hack Up Cost",
      dataTestId: "grid-vehicle-year",
      field: "vehicle_hack_up_cost",
      sortable: false,
      filter: false,
    },
    {
      header: "True Vehicle Cost",
      dataTestId: "grid-vehicle-year",
      field: "vehicle_true_cost",
      sortable: false,
      filter: false,
    },
    {
      header: "Lifetime Vehicle Cap",
      dataTestId: "grid-vehicle-year",
      field: "vehicle_lifetime_cap",
      sortable: false,
      filter: false,
    },
    {
      header: "Vehicle Revenue",
      dataTestId: "grid-vehicle-year",
      field: "vehicle_revenue",
      sortable: false,
      filter: false,
    },
    {
      header: "Odometer",
      dataTestId: "grid-vehicle-year",
      field: "odometer",
      sortable: false,
      filter: false,
    },
    {
      header: "Hack-up status",
      dataTestId: "grid-vehicle-year",
      field: "hack_up_status",
      sortable: false,
      filter: false,
    },
    {
      header: "Current Location",
      dataTestId: "grid-vehicle-year",
      field: "current_location",
      sortable: false,
      filter: false,
    },

    {
      field: "medallion_owner",
      dataTestId: "grid-entity-name",
      header: "Medallion Owner",
      sortable: false,
      filter: false,
    },
    {
      field: "vehicle_owner",
      dataTestId: "grid-entity-name",
      header: "Vehicle Owner",
      sortable: false,
      filter: false,
    },
    {
      field: "m_status",
      dataTestId: "gird-vehicle-status",
      header: "Actions",
      sortable: false,
      filter: false,
    },
    { field: "options", header: "" },
  ];

  const menu = useRef(null);
  const [visibleColumns, setVisibleColumns] = useState({
    vin: true,
    vehicle_status: true,
    medallion_number: true,
    vehicle: true,
    plate_number: true,
    vehicle_true_cost: true,
    vehicle_lifetime_cap: true,
    make: true,
    model: true,
    year: true,
    vehicle_type: true,
    entity_name: true,
    m_status: true,
    options: true,
  });

  const menuItems = columns.map((col) => ({
    template: (
      <div className="p-field-checkbox d-flex align-items-center p-2">
        <Checkbox
          inputId={col.field}
          checked={visibleColumns[col.field]}
          onChange={() => handleColumnVisibilityChange(col.field)}
        />
        <label className="p-1" htmlFor={col.field}>
          {col.header ? col.header : col.field}
        </label>
      </div>
    ),
  }));

  const handleColumnVisibilityChange = (field) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const filteredColumns = Object.values(visibleColumns).every(
    (isVisible) => !isVisible
  )
    ? columns
    : columns.filter((col) => visibleColumns[col.field]);

  const dispatch = useDispatch();

  const handleSelectvehicle = (data) => {
    dispatch(
      setSelectedMedallion({
        object_lookup: data.vin,
        object_name: "vehicle",
        ...data,
      })
    );
  };

  const menuRefs = useRef({});
  const [createCase, { data, isSuccess }] = useCreateCaseMutation();

  const createNewCase = (caseType) => {
    setCurrentCaseType(caseType);
    createCase(caseType);
  };

  const searchData = (type, value) => {
    const queryParams = new URLSearchParams({
      page: 1,
      per_page: 5,
    });

    if (type.field === "vin") {
      queryParams.append("vin", value);
    }

    if (type.field === "entity_name") {
      queryParams.append("entity_name", value);
    }

    setFilterSearchBy(type.field);
    triggerSearchGetVehicles(`?${queryParams?.toString()}`);
  };

  const triggerSearch = ({
    page,
    limit,
    sField = sortField,
    sOrder = sortOrder,
  }) => {
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
    triggerGetVehicles(`?${queryParams?.toString()}`);
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

    const fieldMapping = {
      vin: "vin",
      vehicle_status: "vehicle_status",
      make: "make",
      model: "model",
      year: ["from_make_year", "to_make_year"],
      vehicle_type: "vehicle_type",
      entity_name: "entity_name",
      m_status: "vehicle_status",
    };

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

      if (Array.isArray(fieldKey) && option.field !== "year") {
        // updatedFilterApplyList.set(fieldKey, yearMonthDate(data.fromDate));
        updatedFilterApplyList.set(fieldKey[0], yearMonthDate(data.fromDate));
        updatedFilterApplyList.set(fieldKey[1], yearMonthDate(data.toDate));
      } else if (option.field === "year") {
        updatedFilterApplyList.set(fieldKey[0], getYear(data.fromDate));
        updatedFilterApplyList.set(fieldKey[1], getYear(data.toDate));
      } else if (fieldKey) {
        if (Array.isArray(data)) {
          updatedFilterApplyList.set(
            fieldKey,
            data.map((item) => item.name).join(",")
          );
        } else {
          updatedFilterApplyList.set(fieldKey, data.name || data);
        }
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
    // setPage(1);
    // setRows(5);
    triggerSearch({ page: page, limit: rows, sField: field, sOrder: order });
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
    if (vehicleData) {
      console.log("Vehicle Data", vehicles);
      setVehicles(vehicleData.items);
    }
  }, [vehicleData]);

  const handleSearchItemChange = (newItems) => {
    setSearchFilterData((prev) => ({
      ...prev,
      [filterSearchBy]: newItems,
    }));
  };

  useEffect(() => {
    if (vehicleSearchData) {
      const data = vehicleSearchData.items.map((vehicle) => ({
        name:
          filterSearchBy === "entity_name" ? vehicle.entity_name : vehicle.vin,
        id: vehicle.vehicle_id,
      }));
      handleSearchItemChange(data);
    }
  }, [vehicleSearchData]);

  const onPageChange = (data) => {
    setRows(data.rows);
    setPage(Number(data.page) + 1);
    triggerSearch({ page: Number(data.page) + 1, limit: data.rows });
  };

  useEffect(() => {
    if (isSuccess) {
      const path = `/manage-vehicle/case/${currentCaseType}/${data.case_no}`;
      navigate(path);
    }
  }, [isSuccess]);

  const moveToHackUp = (rowData) => {
    if (rowData.latest_hackup_case !== "") {
      const path = `/manage-vehicle/case/SENDHACKUP/${rowData.latest_hackup_case}`;
      navigate(path);
    } else {
      // handleSelectvehicle(rowData);
      handleSelectMedallion(rowData, "vehicle");
      setFlow("HACK_UP");
      setConfirmationTitle("Confirmation on Vehicle Hack-Up");
      setConfirmationMessage(
        `This will create a new case for Vehicle Hack-Up for VIN ${rowData?.vin}. Are you sure to proceed?`
      );
      setOpen(true);
    }
  };

  const selectedMedallionDetail = useSelector(
    (state) => state.medallion.selectedMedallionDetail
  );
  const handleSelectMedallion = (data, objectName = "driver") => {
    if (objectName === "vehicle") {
      dispatch(
        setSelectedMedallion({
          object_lookup: data.vehicle_id,
          object_name: "vehicle",
          ...data,
        })
      );
    } else {
      dispatch(
        setSelectedMedallion({
          object_lookup: data.driver_lookup_id,
          object_name: objectName,
          ...data,
        })
      );
    }
  };

  const customRender = (column, rowData) => {

    console.log("rowData : ", rowData)
    if (column.field === "hack_up_status") {
      return (<div>
        <span>{rowData?.hackup_status}</span>
      </div>)
    }
    if (column.field === 'vehicle_revenue') {
      return (

        <div>
          <div className="d-flex d-flex align-items-center" style={{ marginLeft: 26 }}>

            <InputNumber
              inputId={"trueId"}
              id={"trueId"}
              disabled={true}
              // className={"border border-1 border-dark p-1 sec-topic text-black"}
              value={(rowData?.vehicle_revenue?.dov + rowData?.vehicle_revenue?.["non-dov"])}
              // onValueChange={(e) => formik.setFieldValue(data?.id, e.value)}
              // onChange={(e) => formik.handleChange({ target: { id: data?.id, value: e.value } })}
              mode="currency"
              currency="USD"
              locale="en-US"
              minFractionDigits={2}
              maxFractionDigits={10}
              inputStyle={{ textAlign: "right", fontWeight: "bold", color: 'black', fontSize: 18 }}
              style={{ height: 40, width: 150, textAlign: "right", fontWeight: "bold", color: 'black' }}
            />
          </div>
          <div className="d-flex d-flex align-items-center">
            DOV:
            <InputNumber
              inputId={"trueId"}
              id={"trueId"}
              disabled={true}
              // className={"border border-1 border-dark p-1 sec-topic text-black"}
              value={(rowData?.vehicle_revenue?.dov)}
              // onValueChange={(e) => formik.setFieldValue(data?.id, e.value)}
              // onChange={(e) => formik.handleChange({ target: { id: data?.id, value: e.value } })}
              mode="currency"
              currency="USD"
              locale="en-US"
              minFractionDigits={2}
              maxFractionDigits={10}
              inputStyle={{ textAlign: "right" }}
              style={{ height: 30, width: 150, textAlign: "right" }}
            />
          </div>
          <div className="d-flex d-flex align-items-center">
            Non DOV:
            <InputNumber
              inputId={"trueId"}
              id={"trueId"}
              disabled={true}
              // className={"border border-1 border-dark p-1 sec-topic text-black"}
              value={(rowData?.vehicle_revenue?.["non-dov"])}
              // onValueChange={(e) => formik.setFieldValue(data?.id, e.value)}
              // onChange={(e) => formik.handleChange({ target: { id: data?.id, value: e.value } })}
              mode="currency"
              currency="USD"
              locale="en-US"
              minFractionDigits={2}
              maxFractionDigits={10}
              inputStyle={{ textAlign: "right" }}
              style={{ height: 30, width: 150, textAlign: "right" }}
            />
          </div>
        </div>

        // </p>
      );
    }
    if (column.field === "vin") {
      return (
        <p
          className="regular-semibold-text"
          data-testid="grid-vin"
          onClick={() => {
            navigate(`/manage-vehicle/view/${rowData?.vin}`, {
              state: rowData?.vin,
            });
          }}
          style={{ color: "#1056EF", cursor: "pointer" }}
        >
          {rowData?.vin}
        </p>
      );
    }
    if (column.field === "vehicle") {
      return (
        // <p
        //   className="regular-semibold-text"
        //   data-testid="grid-vin"
        //   onClick={() => {
        //     navigate(`/manage-vehicle/view/${rowData?.vin}`, {
        //       state: rowData?.vin,
        //     });
        //   }}
        //   style={{ color: "#1056EF", cursor: "pointer" }}
        // >
        <>
          {rowData?.make + " " + rowData?.model + " " + rowData?.year}
        </>

        // </p>
      );
    }
    if (column.field === "vehicle_price") {
      return (

        <div>
          <div className="d-flex d-flex align-items-center" style={{ marginLeft: 26 }}>

            <InputNumber
              inputId={"trueId"}
              id={"trueId"}
              disabled={true}
              // className={"border border-1 border-dark p-1 sec-topic text-black"}
              value={(rowData.base_price + rowData.sales_tax)}
              // onValueChange={(e) => formik.setFieldValue(data?.id, e.value)}
              // onChange={(e) => formik.handleChange({ target: { id: data?.id, value: e.value } })}
              mode="currency"
              currency="USD"
              locale="en-US"
              minFractionDigits={2}
              maxFractionDigits={10}
              inputStyle={{ textAlign: "right", fontWeight: "bold", color: 'black', fontSize: 12, fontFamily: "DMSans, sans-serif", }}
              style={{ height: 40, width: 150, textAlign: "right", fontWeight: "bold", color: 'black' }}
            />
          </div>
          <div className="d-flex d-flex align-items-center">
            Base:
            <InputNumber
              inputId={"trueId"}
              id={"trueId"}
              disabled={true}
              // className={"border border-1 border-dark p-1 sec-topic text-black"}
              value={(rowData.base_price)}
              // onValueChange={(e) => formik.setFieldValue(data?.id, e.value)}
              // onChange={(e) => formik.handleChange({ target: { id: data?.id, value: e.value } })}
              mode="currency"
              currency="USD"
              locale="en-US"
              minFractionDigits={2}
              maxFractionDigits={10}
              inputStyle={{ textAlign: "right", fontSize: 10 }}
              style={{ height: 30, width: 150, textAlign: "right" }}
            />
          </div>
          <div className="d-flex d-flex align-items-center" >
            <span disabled>Sales:</span>
            <InputNumber
              inputId={"trueId"}
              id={"trueId"}
              disabled={true}
              // className={"border border-1 border-dark p-1 sec-topic text-black"}
              value={(rowData.sales_tax)}
              // onValueChange={(e) => formik.setFieldValue(data?.id, e.value)}
              // onChange={(e) => formik.handleChange({ target: { id: data?.id, value: e.value } })}
              mode="currency"
              currency="USD"
              locale="en-US"
              minFractionDigits={2}
              maxFractionDigits={10}
              inputStyle={{ textAlign: "right", fontSize: 10 }}
              style={{ height: 30, width: 150, textAlign: "right" }}
            />
          </div>
        </div>

        // </p>
      );
    }
    if (column.field === "vehicle_hack_up_cost") {
      return (
        <div className="d-flex d-flex align-items-center" style={{ marginLeft: 26 }}>
          <InputNumber
            inputId={"trueId"}
            id={"trueId"}
            disabled={true}
            value={(rowData.vehicle_hack_up_cost)}
            mode="currency"
            currency="USD"
            locale="en-US"
            minFractionDigits={2}
            maxFractionDigits={10}
            inputStyle={{ textAlign: "right", fontWeight: "bold", color: 'black', fontSize: 12 }}
            style={{ height: 40, width: 150, textAlign: "right", fontWeight: "bold", color: 'black' }}
          />
        </div>)
    }
    if (column.field === "vehicle_true_cost") {
      return (
        <div className="d-flex d-flex align-items-center" style={{ marginLeft: 26 }}>
          <InputNumber
            inputId={"trueId"}
            id={"trueId"}
            disabled={true}
            value={(rowData.vehicle_true_cost)}
            mode="currency"
            currency="USD"
            locale="en-US"
            minFractionDigits={2}
            maxFractionDigits={10}
            inputStyle={{ textAlign: "right", fontWeight: "bold", color: 'black', fontSize: 12 }}
            style={{ height: 40, width: 150, textAlign: "right", fontWeight: "bold", color: 'black' }}
          />
        </div>)
    }
    if (column.field === "vehicle_lifetime_cap") {
      return (
        <div className="d-flex d-flex align-items-center" style={{ marginLeft: 26 }}>
          <InputNumber
            inputId={"trueId"}
            id={"trueId"}
            disabled={true}
            value={(rowData.vehicle_lifetime_cap)}
            mode="currency"
            currency="USD"
            locale="en-US"
            minFractionDigits={2}
            maxFractionDigits={10}
            inputStyle={{ textAlign: "right", fontWeight: "bold", color: 'black', fontSize: 12 }}
            style={{ height: 40, width: 150, textAlign: "right", fontWeight: "bold", color: 'black' }}
          />
        </div>)
    }
    if (column.field === "m_status") {
      return (
        <div className="d-flex flex-row gap-3">
          <div>
            {rowData?.vehicle_hackups ? (
              <Button
                className="w-15"
                {...gridToolTipOptins("Vehicle Hacked up")}
                data-testid="hack_up_car"
                icon={<Img name="hack_up_car" />}
              ></Button>
            ) : rowData?.has_medallion ? (
              <Button
                className="w-15"
                {...gridToolTipOptins("Vehicle Available")}
                data-testid="add_hack_up_car"
                icon={<Img name="add_hack_up_car" />}
                onClick={() => moveToHackUp(rowData)}
              ></Button>
            ) : (
              <Button
                className="w-15"
                data-testid="hack_up_cross"
                {...gridToolTipOptins("Vehicle Unavailable")}
                icon={<Img name="hack_up_cross" />}
              ></Button>
            )}
          </div>
          <div>
            {rowData?.vehicle_hackups ? (
              rowData?.is_driver_associated ? (
                <Button
                  data-testid="driver_active"
                  {...gridToolTipOptins("Driver Active")}
                  icon={() => <Img name={"driver_active"} />}
                ></Button>
              ) : (
                <Button
                  data-testid="ic_driver_add"
                  {...gridToolTipOptins("Driver Available")}
                  icon={() => <Img name="ic_driver_add" />}
                ></Button>
              )
            ) : (
              <Button
                data-testid="driver_cancel"
                {...gridToolTipOptins("No Driver Associate")}
                icon={() => <Img name={"driver_cancel"} />}
              ></Button>
            )}
          </div>
          {rowData?.has_medallion ? (
            <Button
              data-testid="medallian_success"
              {...gridToolTipOptins("Medallion Allocated")}
              icon={() => <Img name={"medallian_success"} />}
            ></Button>
          ) : (
            <Button
              data-testid="medallian_fail"
              {...gridToolTipOptins("Medallion Not Allocated")}
              icon={() => <Img name={"medallian_fail"} />}
            ></Button>
          )}
          {rowData?.has_documents ? (
            <Button
              data-testid="ic_pdf_active"
              {...gridToolTipOptins("Document Available")}
              onClick={() =>
                navigate(`/manage-vehicle/doc-viewer/${rowData.vin}`)
              }
              icon={() => <Img name={"ic_pdf_active"} />}
            ></Button>
          ) : (
            <Button
              data-testid="pdf_inactive"
              {...gridToolTipOptins("Document Not Available")}
              onClick={() =>
                navigate(`/manage-vehicle/doc-viewer/${rowData.vin}`)
              }
              icon={() => <Img name={"pdf_inactive"} />}
            ></Button>
          )}
          <BAuditTrailManageModal
            data={`?vehicle_id=${rowData?.vehicle_id}`}
            title="Vehicle Audit Trail History"
          />
          {/* {
            rowData?.audit_trail?
            <BAuditTrailManageModal data={`?vehicle_id=${rowData?.vehicle_id}`}/> :
            <Link data-testid="audit_trail_fail" className="manage-table-action-svg d-flex align-items-center" 
            to={`/coming-soon`}><Img name="audit_trail_fail" /></Link>
            } */}
        </div>
      );
    } else if (column.field === "options") {
      const menuKey = rowData?.vehicle_id;
      if (!menuRefs.current[menuKey]) {
        menuRefs.current[menuKey] = React.createRef();
      }

      const menuItems = [
        {
          label: "Mark Delivery",
          command: () => deliveryVehicle(rowData),
          template: menuTemplate,
          disabled:
            !(rowData?.vehicle_status === "Pending Delivery"),
          dataTestId: "mark-delivery",
        },
        {
          label: "Assign / Update Medallion",
          command: () => assignMedallionToVehicle(rowData),
          template: menuTemplate,
          disabled:
            !((rowData?.vehicle_status === "Delivered") && !rowData?.has_medallion),
          dataTestId: "assign-medallion",
        },

        {
          label: "View Inspection",
          command: () => viewInspection(rowData),
          template: menuTemplate,
          disabled:
            rowData?.vehicle_status !== "Hacked up" &&
            rowData?.vehicle_status !== "Active",
          dataTestId: "view-inspection",
        },
        // {
        //   label: "New Vehicle Repairs",
        //   command: () => vehicleRepair(rowData),
        //   template: menuTemplate,
        //   dataTestId: "new-vehicle-repairs",
        // },
        {
          label: "De-Hack Vehicle",
          command: () => deHackVehicle(rowData),
          // disabled: !rowData?.vehicle_hackups,
          disabled: rowData?.vehicle_status !== "Hacked up",
          template: menuTemplate,
          dataTestId: "de-hack-vehicle",
        },
        {
          label: "Re-Hack Vehicle",
          command: () => reHackVehicle(rowData),
          disabled: !rowData?.can_vehicle_rehack,
          template: menuTemplate,
          dataTestId: "re-hack-vehicle",
        },
        {
          label: "Terminate Vehicle",
          command: () => terminateVehicle(rowData),
          disabled: rowData?.vehicle_hackups || rowData?.is_driver_associated,
          template: menuTemplate,
          dataTestId: "terminate-vehicle",
        },
        {
          label: "Remove Owner",
          command: () => removeVehicleOwner(rowData),
          disabled:
            rowData?.entity_name === "" ||
            rowData?.vehicle_status !== "Available",
          //disabled: true,
          template: menuTemplate,
          dataTestId: "remove-owner",
        },
        {
          label: "Change Ownership",
          command: () => changeOwnership(rowData),
          // disabled: rowData?.vehicle_hackups || rowData?.is_driver_associated,
          template: menuTemplate,
          dataTestId: "change-ownership",
        },
      ];


      const deliveryVehicle = (rowData) => {
        console.log("rowData : ", rowData)
        if (!(rowData?.vehicle_status === "Pending Delivery")) return;
        handleSelectMedallion(rowData, "vehicle");
        setOpen(true);
        setFlow(DELIVERY_VEHICLE);
        setConfirmationTitle("Confirmation on Mark Delivery");
        setConfirmationMessage(
          `This will create a new Mark Vehicle delivery case for VIN ${rowData.vin}.`
        );
      };


      const assignMedallionToVehicle = (rowData) => {
        console.log("rowData : ", rowData)
        if (!(rowData?.vehicle_status === "Delivered")) return;
        handleSelectMedallion(rowData, "vehicle");
        setOpen(true);
        setFlow(ASSIGN_MEDALLION_TO_VEHICLE);
        setConfirmationTitle("Confirmation on Assign / Update Medallion");
        setConfirmationMessage(
          `This will create a new Assign or Update Medallion case for VIN ${rowData.vin}.`
        );
      };


      const viewInspection = (rowData) => {
        navigate(`view-inspection/${rowData.vin}`);
      };
      const deHackVehicle = (rowData) => {
        if (!rowData?.vehicle_hackups) return;
        handleSelectMedallion(rowData);
        setOpen(true);
        setFlow("caseDehack");
        setConfirmationTitle("Warning on De-Hack Vehicle");
        setConfirmationMessage(
          `This action will De-Hack the medallion and vehicle that are associated. Are you sure to proceed for De-Hack?`
        );
      };
      const reHackVehicle = (rowData) => {
        handleSelectvehicle(rowData);
        setOpen(true);
        setFlow(VEHICLE_REHACK_TYPE);
        setConfirmationTitle("Confirmation on Vehicle Re-Hack");
        setConfirmationMessage(
          `This will create a new Vehicle Re-Hack case for VIN ${rowData?.vin}. Are you sure to proceed?`
        );
      };
      const terminateVehicle = (rowData) => {
        if (rowData?.vehicle_hackups || rowData?.is_driver_associated) return;
        handleSelectMedallion(rowData);
        setOpen(true);
        setFlow("terminateVehicle");
        setConfirmationTitle("Warning on Terminate Vehicle");
        setConfirmationMessage(
          `This action will Terminate all that has been associated. Are you sure to proceed for Terminate?`
        );
      };
      // const vehicleRepair = (rowData) => {
      //   handleSelectvehicle(rowData);
      //   setOpen(true);
      //   setFlow(VEHICLEREPAIR);
      //   setConfirmationTitle("Remove Vehicle Owner Confirmation");
      //   setConfirmationMessage(
      //     `Are you sure you want to remove the vehicle Owner with VIN No 4T3LWRFV5VW102437?`
      //   );
      // };
      const removeVehicleOwner = (rowData) => {
        setOwnershipModalData(rowData);
        setOpen(true);
        setFlow("Remove Owner");
        setConfirmationTitle("Remove Vehicle Owner Confirmation");
        setConfirmationMessage(
          `Are you sure you want to remove the Vehicle Owner with VIN No ${rowData?.vin}?`
        );
      };
      const changeOwnership = (rowData) => {
        setOwnershipModalData(rowData);
        setOpen(true);
        setFlow("Change Vehicle Ownership");
        setConfirmationTitle("Change Ownership Confirmation");
        setConfirmationMessage(
          `Are you sure you want to Change ownership for the vehicle with VIN ${rowData.vin}7?`
        );
      };

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "31px",
            alignItems: "center",
          }}
        >
          <Menu model={menuItems} popup ref={menuRefs.current[menuKey]} />
          <button
            className="three-dot-mennu btn border-0"
            data-testid="three-dot-menu"
            onClick={(e) => menuRefs.current[menuKey].current.toggle(e)}
          >
            <Img name="three_dots_vertival" />
          </button>
        </div>
      );
    }
    return <p data-testid={column.dataTestId}>{rowData[column.field]}</p>;
  };

  const breadcrumbItems = [
    {
      template: () => (
        <Link to="/" className="font-semibold text-grey">
          Home
        </Link>
      ),
    },
    {
      template: () => (
        <Link to="/manage-vehicle" className="font-semibold text-grey">
          Vehicle
        </Link>
      ),
    },
    {
      template: () => (
        <Link to={`/manage-vehicle`} className="font-semibold text-black">
          Manage Vehicle
        </Link>
      ),
    },
  ];

  // const handleDeactivate = (vehicles) => {
  //   setCurrentVehicleToDeactivate(vehicles)
  //   setFlow("DELETE")
  //   setConfirmationTitle('Confirmation on Delete vehicle');
  //   setConfirmationMessage(`Are you sure to delete the selected vehicle?`);
  //   setOpen(true)
  // };

  // const proccedDelete = async () => {
  //   console.log("vehicles", currentVehicleToDeactivateselectedProducts)

  //   const vehicleNumbers = currentVehicleToDeactivateselectedProducts.map(item => item.vim);

  //   try {
  //     // const response = await deactivateMedallions(vehicleNumbers).unwrap();
  //     selectedProducts([])
  //   } catch (err) {
  //   }

  // }
  const visibleCount = Object.values(visibleColumns).filter(Boolean).length;
  const [
    lazyDehack,
    { isSuccess: deHackDataIsSuccess, isFetching: isDehackFetching },
  ] = useLazyVehicleDehackUpQuery();
  const [
    lazyTerminateVehicle,
    { isSuccess: terminateVehIsSuccess, isFetching: isTerminateFetching },
  ] = useLazyTerminateVehicleQuery();
  useEffect(() => {
    if (deHackDataIsSuccess || isDehackFetching) {
      // refreshFunc();
      setSuccessModalOpen(true);
      setSuccessMessage({
        title: "Vehicle De-Hack Successful",
        message: `De-Hack process is successful for VIN: ${selectedMedallionDetail?.vin}`,
      });
    }
  }, [deHackDataIsSuccess, isDehackFetching]);
  useEffect(() => {
    if (terminateVehIsSuccess || isTerminateFetching) {
      // refreshFunc();
      setSuccessModalOpen(true);
      setSuccessMessage({
        title: "Terminate Vehicle Successful",
        message: `Terminate Vehicle is successful for VIN:  ${selectedMedallionDetail?.vin}`,
      });
    }
  }, [terminateVehIsSuccess, isTerminateFetching]);
  const refreshFunc = () => {
    triggerSearch({ page: page, limit: rows });
  };

  // const moveCaseTrigger = (caseType) => {
  //   // handleSelectMedallion(rowData);
  //   if (caseType == CREATE_VEHICLE_OWNER) {
  //     setConfirmationTitle("Confirmation on Create New Vehicle Owner");
  //     setConfirmationMessage(
  //       `This will create a new case for New Vehicle Owner. Are you sure to proceed?`
  //     );
  //     setOpen(true);
  //   }
  //   setFlow(caseType);
  // };

  const handleOwnershipChangeSuccess = () => {
    setOwnershipModalOpen(false);
    setSuccessMessage({
      title: "Ownership Change Successful",
      message: `Vehicle ownership has been successfully updated for VIN No ${ownershipModalData?.vin}.`,
    });
    setSuccessModalOpen(true);
  };

  const handleRemoveOwnerSuccess = () => {
    setRemoveOwnerModalOpen(false);
    setSuccessMessage({
      title: "Vehicle Owner Removed Successfully",
      message: `Vehicle ownership has been successfully updated for VIN No ${ownershipModalData?.vin}.`,
    });
    setSuccessModalOpen(true);
  };

  return (
    <div className="common-layout w-100 h-100 d-flex flex-column gap-4 manage-medallian">
      <div>
        <BBreadCrumb breadcrumbItems={breadcrumbItems} separator="/" />
        <div className="header">
          <div className="left-content">
            <h3 className="regular-semibold-text">Manage Vehicles</h3>
            {/* <p className="list-count">Showing {rows} of {vehicleData?.total_items} Lists... </p> */}
            <GridShowingCount rows={rows} total={vehicleData?.total_items} />
          </div>
          <div className="right-content">
            {/* <Button data-testid="trash-btn" icon={() => <Img name={"trash"} />}></Button>
            <Divider layout="vertical" /> */}

            <Menu model={menuItems} popup ref={menu} />
            <Button
              data-testid="column-filter-btn"
              text
              onClick={(e) => menu.current.toggle(e)}
              className="d-flex justify-content-center w-auto align-items-center position-relative"
              icon={() => <Img name={"ic_column_filter"} />}
            >
              {visibleCount > 0 && (
                <Badge
                  className="badge-icon"
                  value={visibleCount}
                  severity="warning"
                ></Badge>
              )}
            </Button>

            <Divider layout="vertical" />
            <Button
              data-testid="refresh-btn"
              onClick={() => refreshFunc(page, rows)}
              icon={() => <Img name={"refresh"} />}
            ></Button>
          </div>
        </div>
        <div className="d-flex justify-content-end align-items-center gap-3">
          {/* <Button
            className="sec-btn"
            label="Assign Medallion"
            severity="secondary"
            data-testid="assign-medallion-btn"
            // onClick={onCancel}
            //text
            outlined
          /> */}
          {/* <Button
            label="Create New Vehicle Owner"
            className="bg-warning border-0 w-auto text-dark fw-semibold w-30"
            data-testid="create-vehicle-owner-btn"
            onClick={() => moveCaseTrigger(CREATE_VEHICLE_OWNER)}
          /> */}
          {/* <Divider layout="vertical" /> */}
          <div className="d-flex align-items-center gap-2">
            <span className="fw-bold">Export as:</span>
            <ExportBtn
              {...{
                sortFieldMapping,
                sortField,
                sortOrder,
                triggerExport,
                filterApplyList,
                fileName: `vehicle_`,
              }}
            ></ExportBtn>
            {/* <Button data-testid="export-btn" text onClick={exportFile} className='regular-text gap-2 d-flex' icon={() => <Img name="ic_export" />} >Export as .XLS</Button> */}
          </div>
        </div>
      </div>
      <DataTableComponent
        columns={filteredColumns}
        data={vehicles}
        selectedData={selectedProducts}
        onSelectionChange={(e) => setSelectedProducts(e.value)}
        renderColumn={customRender}
        onPageChange={onPageChange}
        totalRecords={vehicleData?.total_items}
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
        filterSearchBy={filterSearchBy}
      />

      <BConfirmModal
        isOpen={isOpen}
        title={confirmationTitle}
        message={confirmationMessage}
        onCancel={() => {
          setOpen(false);
        }}
        onConfirm={() => {
          setOpen(false);

          if (flow === DELIVERY_VEHICLE) {
            createNewCase(DELIVERY_VEHICLE);
          }
          if (flow === ASSIGN_MEDALLION_TO_VEHICLE) {
            createNewCase(ASSIGN_MEDALLION_TO_VEHICLE);
          }
          if (flow === "HACK_UP") {
            createNewCase(SENDHACKUP);
          }
          if (flow === VEHICLEREPAIR) {
            createNewCase(VEHICLEREPAIR);
          }
          if (flow === VEHICLE_REHACK_TYPE) {
            createNewCase(VEHICLE_REHACK_TYPE);
          }
          if (flow === "terminateVehicle") {
            lazyTerminateVehicle(selectedMedallionDetail?.vin);
          }
          if (flow === CREATE_VEHICLE_OWNER) {
            createNewCase(CREATE_VEHICLE_OWNER);
          }
          if (flow === "Change Vehicle Ownership") {
            setOwnershipModalOpen(true);
          }
          if (flow === "Remove Owner") {
            setRemoveOwnerModalOpen(true);
          }
          // if (flow === 'de-hack') {
          //   setOpen(true);
          //   setFlow("caseDehack")
          //   setConfirmationTitle('Warning on De-Hack Vehicle');
          //   setConfirmationMessage(`This action will De-Hack the medallion and vehicle that are associated. Are you sure to proceed for De-Hack?`);
          // }
          if (flow === "caseDehack") {
            lazyDehack(selectedMedallionDetail?.vin);
          }
        }}
        {...(flow === "DELETE" && { iconName: "red-delete" })}
        {...(flow === "caseDehack" && { iconName: "ic_warning" })}
        {...(flow === "terminateVehicle" && { iconName: "ic_close_red" })}
      ></BConfirmModal>
      <BToast ref={toast} position="top-right" />
      <VehicleOwnershipChangeModal
        isOpen={ownershipModalOpen}
        title={"Change Ownership"}
        onCancel={() => {
          setOwnershipModalOpen(false);
          setOwnershipModalData([]);
          refreshFunc();
        }}
        onConfirm={() => {
          setOwnershipModalOpen(false);
        }}
        vehicleData={ownershipModalData}
        onSuccess={handleOwnershipChangeSuccess}
      ></VehicleOwnershipChangeModal>
      <RemoveOwnerModal
        isOpen={removeOwnerModalOpen}
        title={"Remove Vehicle Owner Confirmation"}
        onCancel={() => {
          setRemoveOwnerModalOpen(false);
          setOwnershipModalData([]);
          refreshFunc();
        }}
        onConfirm={() => {
          setRemoveOwnerModalOpen(false);
        }}
        vehicleData={ownershipModalData}
        onSuccess={handleRemoveOwnerSuccess}
      ></RemoveOwnerModal>
      <BSuccessMessage
        isOpen={isSuccessModalOpen}
        message={successMessage?.message}
        title={successMessage?.title}
        onCancel={() => {
          setSuccessModalOpen(false);
          setOwnershipModalData([]);
          refreshFunc();
          setTimeout(() => {
            navigate("/manage-vehicle", { replace: true });
          });
        }}
        onConfirm={() => {
          setSuccessModalOpen(false);
          refreshFunc();
          navigate("/manage-vehicle", { replace: true });
        }}
      />
    </div>
  );
};

export default ManageVehicle;
