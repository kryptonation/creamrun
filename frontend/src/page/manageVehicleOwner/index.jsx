import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import {
  useLazyExportLedgerEntryQuery,
  useLazyLedgerEntryListQuery,
} from "../../redux/api/ledgerApi";
import ReAssignDriverModal from "../payments/manageLedgerEntry/ReAssignDriverModal";
import BSuccessMessage from "../../components/BSuccessMessage";
import DataTableComponent from "../../components/DataTableComponent";
import { Menu } from "primereact/menu";
import { Button } from "primereact/button";
import { Divider } from "primereact/divider";
import { filterSelectGenerate } from "../../utils/utils";
import { Checkbox } from "primereact/checkbox";
import { Badge } from "primereact/badge";
import { yearMonthDate } from "../../utils/dateConverter";
import ExportBtn from "../../components/ExportBtn";
import { gridToolTipOptins } from "../../utils/tooltipUtils";
import { useCreateCaseMutation } from "../../redux/api/medallionApi";
import Img from "../../components/Img";
import { BreadCrumb } from "primereact/breadcrumb";
import GridShowingCount from "../../components/GridShowingCount";
import {
  CREATE_VEHICLE_OWNER,
  EDIT_VEHICLE_OWNER,
  NEW_VEHICLE_TYPE,
} from "../../utils/constants";
import BConfirmModal from "../../components/BConfirmModal";
import React from "react";
import { menuTemplate } from "../../utils/gridUtils";
import {
  useLazyExportVehicleOwnerQuery,
  useLazyVehicleOwnerListQuery,
} from "../../redux/api/vehicleOwnerAPI";
import { setSelectedMedallion } from "../../redux/slice/selectedMedallionDetail";
import { getLastFourDigits } from "../../utils/splitFileName";
const ManageVehicleOwner = () => {
  const menuRefs = useRef({});
  const navigate = useNavigate();
  const [isOpen, setOpen] = useState(false);
  const [isSuccessfulMessageOpen, setSuccessfulMessageOpen] = useState(false);
  const [flow, setFlow] = useState("");
  const dispatch = useDispatch();
  const bt = useRef(null);
  const [rows, setRows] = useState(5);
  const [page, setPage] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState(null);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [confirmationTitle, setConfirmationTitle] = useState("");

  const [selectedDriverIds, setSelectedDriverIds] = useState("");
  const [selectedLedgerId, setSelectedLedgerId] = useState("");
  const menu = useRef(null);
  const [filterSearchBy, setFilterSearchBy] = useState(false);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState(1);
  const [searchFilterData, setSearchFilterData] = useState({});
  const [filterApplyList, setFilterApplyList] = useState(new Map());
  const toast = useRef(null);

  // const [triggerExport] = useLazyExportLedgerEntryQuery();
  const [ledgerEntryList, setLedgerEntryList] = useState([]);
  const [vehicleOwnerList, setVehicleOwnerList] = useState([]);

  const [triggerGetVehicleOwnerData, { data: vehicleOwnerListData }] =
    useLazyVehicleOwnerListQuery();
  const [triggerVehicleOwnerSearch, { data: vehicleOwnerSearchListData }] =
    useLazyVehicleOwnerListQuery();
  const [triggerExport] = useLazyExportVehicleOwnerQuery();

  const [createCase, { data, isSuccess }] = useCreateCaseMutation();
  const [currentCaseType, setCurrentCaseType] = useState("");

  const items = [
    {
      template: () => (
        <Link to="/" className="font-semibold text-grey">
          Vehicles
        </Link>
      ),
    },
    {
      template: () => (
        <Link to="/manage-vehicle-owner" className="font-semibold text-black">
          Manage Vehicle Owner
        </Link>
      ),
    },
  ];

  const columns = [
    {
      field: "owner_id",
      header: "Owner ID",
      headerAlign: "left",
      bodyAlign: "left",
      filter: true,
      sortable: true,
    },
    {
      field: "entity_name",
      header: "Entity Name",
      headerAlign: "left",
      bodyAlign: "left",
      filter: true,
      sortable: true,
    },
    {
      field: "ein",
      header: "EIN",
      headerAlign: "left",
      bodyAlign: "left",
      filter: true,
      sortable: true,
    },
    {
      field: "entity_status",
      header: "Status",
      headerAlign: "left",
      bodyAlign: "left",
      filter: true,
      sortable: true,
    },
    { field: "m_status", header: "Actions" },
  ];

  const filterVar = {
    owner_id: {
      value: "",
      matchMode: "customFilter",
      label: "Owner ID",
      data: [],
      formatType: "Search",
    },
    entity_name: {
      value: "",
      matchMode: "customFilter",
      label: "Entity Name",
      data: [],
      formatType: "Search",
    },
    ein: {
      value: "",
      matchMode: "customFilter",
      label: "EIN",
      data: [],
      formatType: "Search",
    },
    entity_status: {
      value: "",
      matchMode: "customFilter",
      label: "Select Status",
      data: filterSelectGenerate(["Active", "Inactive"]),
      formatType: "select",
    },
  };
  const [filterData, setFilterData] = useState(filterVar);
  const [visibleColumns, setVisibleColumns] = useState({
    entity_name: true,
    owner_id: true,
    ein: true,
    entity_status: true,
    m_status: true,
  });
  const visibleCount = Object.values(visibleColumns).filter(Boolean).length;
  useEffect(() => {
    if (isSuccess) {
      const path = `/manage-vehicle-owner/case/${currentCaseType}/${data.case_no}`;
      navigate(path);
    }
  }, [isSuccess]);
  useEffect(() => {
    if (vehicleOwnerListData) {
      console.log("Vehicle owners List", vehicleOwnerListData);
      setVehicleOwnerList(vehicleOwnerListData?.items);
    }
  }, [vehicleOwnerListData]);

  useEffect(() => {
    triggerSearch({ page: 1, limit: 5 });
  }, []);

  useEffect(() => {
    setPage(1);
    setRows(5);
    triggerSearch({ page: 1, limit: 5 });
  }, [filterApplyList]);

  useEffect(() => {
    console.log("useEffect", vehicleOwnerSearchListData, filterSearchBy);
    if (vehicleOwnerSearchListData) {
      if (filterSearchBy === "entity_name") {
        console.log(
          "entity name search",
          vehicleOwnerSearchListData,
          filterSearchBy
        );
        const data = vehicleOwnerSearchListData.items.map((vehicleOwner) => ({
          name: vehicleOwner.entity_name,
          id: vehicleOwner.entity_name,
        }));
        handleSearchItemChange(data);
      }
      if (filterSearchBy === "ein") {
        console.log("ein search", vehicleOwnerSearchListData, filterSearchBy);
        const data = vehicleOwnerSearchListData.items.map((vehicleOwner) => ({
          name: vehicleOwner.ein,
          id: vehicleOwner.ein,
        }));
        handleSearchItemChange(data);
      }
      if (filterSearchBy === "owner_id") {
        console.log("ein search", vehicleOwnerSearchListData, filterSearchBy);
        const data = vehicleOwnerSearchListData.items.map((vehicleOwner) => ({
          name: vehicleOwner.owner_id,
          id: vehicleOwner.owner_id,
        }));
        handleSearchItemChange(data);
      }
    }
  }, [vehicleOwnerSearchListData]);

  const handleSelectionChange = (e) => {
    setSelectedProducts(e.value);
    setSelectedDriverIds(
      e.value?.map((item) => item.driver_name).join(",") || ""
    );
    setSelectedLedgerId(e.value?.map((item) => item.id).join(",") || "");
    console.log("Selected row(s):", e.value, selectedDriverIds);
  };

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

  const createNewCase = (caseType) => {
    setCurrentCaseType(caseType);
    createCase(caseType);
  };

  //   const openReassignDriver = () => {
  //     setConfirmationTitle("Re-Assign Driver");
  //     // setConfirmationMessage(
  //     //   `Are you sure you want to lock this driver ${data}?`
  //     // );
  //     setOpen(true);
  //   };

  // const isDriverStatus = (data) => {
  //   // if (medallion.medallion_status === 'A') {
  //   return !data.driver_status;
  //   // }
  //   // return false;
  // };
  const customRender = (column, rowData) => {
    if (column.field === "entity_name") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {rowData?.entity_name}
            </h1>
          </div>
        </div>
      );
    }
    if (column.field === "owner_id") {
      return (
        <div>
          <div
            className="d-flex align-items-center justify-content-between flex-row"
            style={{ cursor: "pointer", color: "#1056EF" }}
            onClick={() => {
              navigate(`/manage-vehicle-owner/view/${rowData?.id}`, {
                state: rowData,
              });
            }}
          >
            <p
              className="regular-semibold-text"
              data-testid="grid-entity-name-id"
            >
              {rowData?.owner_id}
            </p>
          </div>
        </div>
      );
    } else if (column.field === "ein") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-ein-number">
              {rowData?.ein}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "entity_status") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-status">
              {rowData?.entity_status}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "m_status") {
      const menuKey = rowData?.id;
      if (!menuRefs.current[menuKey]) {
        menuRefs.current[menuKey] = React.createRef();
      }

      const menuItems = [
        {
          label: "Add New Vehicle",
          command: () => addNewVehicle(rowData),
          dataTestId: "add-new-vehicle",
          template: menuTemplate,
        },
        {
          label: "Edit Details",
          command: () => editVehicleOwner(rowData),
          dataTestId: "edit-details",
          template: menuTemplate,
        },
        {
          label: "Terminate Vehicle Owner",
          //   command: () => updateMedallion(rowData),
          disabled: true,
          dataTestId: "terminate-vehicle-owner",
          template: menuTemplate,
        },
      ];
      const addNewVehicle = (rowData) => {
        handleSelectMedallion(rowData, "Add New Vehicle");
        setOpen(true);
        setFlow(NEW_VEHICLE_TYPE);
        setConfirmationTitle("Confirmation on Adding New Vehicle");
        setConfirmationMessage(
          `This will create a new case for Adding New Vehicle to Holding LLC. Are you sure to proceed?`
        );
      };
      const editVehicleOwner = (rowData) => {
        handleSelectMedallion(rowData, "Edit Vehicle Owner");
        setOpen(true);
        setFlow(EDIT_VEHICLE_OWNER);
        setConfirmationTitle("Confirmation on Edit Vehicle Owner Details");
        setConfirmationMessage(
          `This will create a new case for Edit Vehicle Owner details for ${rowData?.owner_id}. Are you sure to proceed?`
        );
        // setOwnershipModalData(rowData);
      };
      return (
        <div className="d-flex align-items-center flex-row gap-2 manage-table-action-svg btn border-0 p-0 justify-content-center ">
          <p className="fw-semibold">{rowData?.vehicles.length}</p>
          <Button
            className="manage-table-action-svg"
            {...gridToolTipOptins(
              rowData?.vehicles ? "Vehicle Allocated" : "Allocation Available"
            )}
            // onClick={() =>
            //   rowData?.vehicle ? null : allocateMedallion(rowData)
            // }
            icon={() =>
              rowData?.vehicles.length > 0 ? (
                <span data-testid="car_success">
                  <Img name="car_success" />
                </span>
              ) : (
                <span data-testid="ic_car_add">
                  <Img name="ic_car_add" />
                </span>
              )
            }
          ></Button>
          <Menu model={menuItems} popup ref={menuRefs.current[menuKey]} />
          <Button
            className="three-dot-mennu manage-table-action-svg"
            data-testid="three-dot-menu"
            onClick={(e) => menuRefs.current[menuKey].current.toggle(e)}
            icon={() => <Img name="three_dots_vertival" />}
          ></Button>
        </div>
      );
    }
    return [column.field];
  };

  const sortFieldMapping = {
    entity_name: "entity_name",
    ein: "ein",
    entity_status: "entity_status",
    owner_id: "owner_id",
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
    console.log("Filter apply list", filterApplyList, queryParams.toString());
    triggerGetVehicleOwnerData(`?${queryParams.toString()}`);
  };

  const onPageChange = (data) => {
    // console.log("OnPageChange", data);
    // setPage(data);
    setRows(data.rows);
    setPage(Number(data.page) + 1);
    triggerSearch({ page: Number(data.page) + 1, limit: data.rows });
  };

  const filterApply = (option, data) => {
    if (data) {
      updateFilter(option, data, "add");
    }
  };

  const searchData = (type, value) => {
    const queryParams = new URLSearchParams({
      page: 1,
      per_page: 5,
    });
    if (type.field === "entity_name") {
      queryParams.append("entity_name", value);
    } else if (type.field === "ein") {
      queryParams.append("ein", value);
    } else if (type.field === "owner_id") {
      queryParams.append("owner_id", value);
    }
    setFilterSearchBy(type.field);
    console.log("search Data()", type, value);
    triggerVehicleOwnerSearch(`?${queryParams?.toString()}`);
  };

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

  const fieldMapping = {
    entity_name: "entity_name",
    ein: "ein",
    entity_status: "entity_status",
    owner_id: "owner_id",
  };

  const updateFilter = (option, data = null, action = "add") => {
    const updatedFilterApplyList = new Map(filterApplyList);

    const fieldMapping = {
      entity_name: "entity_name",
      ein: "ein",
      entity_status: "entity_status",
      owner_id: "owner_id",
    };

    const fieldKey = fieldMapping[option.field];

    if (filterData) {
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
          // updatedFilterApplyList.set(fieldKey, yearMonthDate(data.fromDate));
          updatedFilterApplyList.delete("created_on");
          updatedFilterApplyList.set(fieldKey[0], yearMonthDate(data.fromDate));
          updatedFilterApplyList.set(fieldKey[1], yearMonthDate(data.toDate));
        } else if (fieldKey) {
          if (Array.isArray(data)) {
            if (fieldKey === "ssn" || fieldKey === "ein") {
              updatedFilterApplyList.set(
                fieldKey,
                data.map((item) => getLastFourDigits(item.name)).join(",")
              );
            } else {
              updatedFilterApplyList.set(
                fieldKey,
                data.map((item) => item.name).join(",")
              );
            }


          } else {
            console.log("updateFilter()", fieldKey, data);
            updatedFilterApplyList.set(fieldKey, data.name || data);
          }
        }
      } else if (action === "remove") {
        // Handle removal of filter values
        setFilterData((prevState) => ({
          ...prevState,
          [option.field]: {
            ...prevState[option.field],
            value: "",
            filterDemoData: "",
          },
        }));
        if (Array.isArray(fieldKey)) {
          fieldKey.forEach((key) => {
            updatedFilterApplyList.delete(key);
          });
        } else if (fieldKey && updatedFilterApplyList.has(fieldKey)) {
          updatedFilterApplyList.delete(fieldKey);
        }
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
    console.log("OnSortApply()", field, order);
    triggerSearch({ page: page, limit: rows, sField: field, sOrder: order });
  };

  const handleSearchItemChange = (newItems) => {
    setSearchFilterData((prev) => ({
      ...prev,
      [filterSearchBy]: newItems,
    }));
  };

  const refreshFunc = () => {
    triggerSearch({ page: page, limit: rows });
  };

  const handleSuccessModalClose = () => {
    setSuccessfulMessageOpen(false);
    console.log(isOpen, isSuccessfulMessageOpen);
    refreshFunc();
  };

  const handleSelectMedallion = (vehicleData, caseType) => {
    // dispatch(setSelectedMedallion(medallion));
    console.log("handleSelectMedallion", vehicleData);
    if (caseType === "Add New Vehicle") {
      dispatch(
        setSelectedMedallion({
          object_name: "entityId",
          object_lookup: vehicleData.id,
          ...vehicleData,
        })
      );
    } else if (caseType === "Edit Vehicle Owner") {
      dispatch(
        setSelectedMedallion({
          object_name: "vehicle_owner",
          object_lookup: vehicleData.id,
          ...vehicleData,
        })
      );
    }
  };

  const handleSelectMe = (vehicleData) => {
    // dispatch(setSelectedMedallion(medallion));
    console.log("handleSelectMedallion", vehicleData);
    dispatch(
      setSelectedMedallion({
        object_name: "vehicle_owner",
        object_lookup: vehicleData.id,
        ...vehicleData,
      })
    );
  };

  const moveCaseTrigger = (caseType) => {
    // handleSelectMedallion(rowData);
    if (caseType == CREATE_VEHICLE_OWNER) {
      setConfirmationTitle("Confirmation on Create New Vehicle Owner");
      setConfirmationMessage(
        `This will create a new case for New Vehicle Owner. Are you sure to proceed?`
      );
      setOpen(true);
    }
    setFlow(caseType);
  };
  return (
    <div className="common-layout w-100 h-100 d-flex flex-column gap-4">
      <div>
        <BreadCrumb
          model={items}
          separatorIcon="/"
          className="bg-transparent p-0"
          pt={{ menu: "p-0" }}
        />
        <div className="d-flex align-items-center justify-content-between w-100">
          <div>
            <p className="topic-txt">Manage Vehicle Owner</p>
            <GridShowingCount
              rows={rows}
              total={vehicleOwnerListData?.total_count}
            />
          </div>
          <div className="d-flex gap-3">
            <Menu model={menuItems} popup ref={menu} />
            <Button
              data-testid="column-filter-btn"
              text
              onClick={(e) => menu.current.toggle(e)}
              className="d-flex justify-content-center w-auto align-items-center position-relative"
              ref={bt}
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
              data-testid="refresh_btn"
              icon={() => <Img name={"refresh"} />}
              onClick={() => refreshFunc(page, rows)}
            ></Button>
          </div>
        </div>
        <div className="d-flex justify-content-end align-items-center gap-3 ">
          <Button
            label="Create New Vehicle Owner"
            className="bg-warning border-0 w-auto text-dark fw-semibold w-30"
            data-testid="create-vehicle-owner-btn"
            onClick={() => moveCaseTrigger(CREATE_VEHICLE_OWNER)}
          />
          <Divider layout="vertical" />
          {vehicleOwnerList.length > 0 && (
            <div className="d-flex align-items-center gap-2">
              <span className="fw-bold">Export as:</span>
              <ExportBtn
                {...{
                  sortFieldMapping,
                  sortField,
                  sortOrder,
                  triggerExport,
                  filterApplyList,
                  fileName: `vehicleOwner_`,
                }}
              ></ExportBtn>
            </div>
          )}

          {/* <Button data-testid="export-btn" text className='regular-text gap-2 d-flex' onClick={exportFile} icon={() => <Img name="ic_export" />} >Export as .XLS</Button> */}
        </div>
      </div>
      <DataTableComponent
        columns={filteredColumns}
        data={vehicleOwnerList}
        selectedData={selectedProducts}
        renderColumn={customRender}
        onPageChange={onPageChange}
        emptyMessage={"No records found"}
        totalRecords={vehicleOwnerListData?.total_count}
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
        filterApplyList={filterApplyList}
        fieldMapping={fieldMapping}
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
          if (flow === CREATE_VEHICLE_OWNER) {
            createNewCase(CREATE_VEHICLE_OWNER);
          }
          if (flow == NEW_VEHICLE_TYPE) {
            createNewCase(NEW_VEHICLE_TYPE);
          }
          if (flow == EDIT_VEHICLE_OWNER) {
            createNewCase(EDIT_VEHICLE_OWNER);
          }
        }}
      ></BConfirmModal>
      <BSuccessMessage
        isOpen={isSuccessfulMessageOpen}
        message={"Driver has been successfully reassigned"}
        title="Reassign Driver Successful"
        onCancel={handleSuccessModalClose}
      // onConfirm={() => {
      //   setSuccessfulMessageOpen(false);
      //   console.log(isOpen, isSuccessfulMessageOpen);
      //   setTimeout(() => {
      //     navigate("/manage-ledger-entry", { replace: true });
      //   }, 150);
      // }}
      ></BSuccessMessage>
      {/* <BToast ref={toast} position="top-right" /> */}
    </div>
  );
};

export default ManageVehicleOwner;
