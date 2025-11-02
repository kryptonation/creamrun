import { BreadCrumb } from "primereact/breadcrumb";
import { Button } from "primereact/button";
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Img from "../../components/Img";
import { Divider } from "primereact/divider";
import DataTableComponent from "../../components/DataTableComponent";
import { Menu } from "primereact/menu";
import { useCreateCaseMutation } from "../../redux/api/medallionApi";
import { useDispatch } from "react-redux";
import { setSelectedMedallion } from "../../redux/slice/selectedMedallionDetail";
import {
  DMV_LICENSE_TYPE,
  DRIVER_PAYEE_TYPE,
  DRIVER_TLC_LICENSE_TYPE,
  DRIVER_UPDATE_ADDRESS,
  TERMINATEDRIVERLEASE,
  UPDATEDRIVERLEASE,
} from "../../utils/constants";
import BConfirmModal from "../../components/BConfirmModal";
import {
  useDriverLockStatusMutation,
  useLazyExportDriversQuery,
  useLazyGetDriverQuery,
  useSearchDriverMutation,
} from "../../redux/api/driverApi";
import { Checkbox } from "primereact/checkbox";
import { Badge } from "primereact/badge";
import { dateMonthYear, yearMonthDate } from "../../utils/dateConverter";
import { filterSelectGenerate } from "../../utils/utils";
import BAuditTrailManageModal from "../../components/BAuditTrailManageModal";
import { handleExport, menuTemplate } from "../../utils/gridUtils";
import ExportBtn from "../../components/ExportBtn";
import { gridToolTipOptins } from "../../utils/tooltipUtils";
import GridShowingCount from "../../components/GridShowingCount";

const ManageDriver = () => {
  const menuRefs = useRef({});
  const navigate = useNavigate();
  const [isOpen, setOpen] = useState(false);
  const [flow, setFlow] = useState("");
  const dispatch = useDispatch();
  const bt = useRef(null);
  const [triggerExport] = useLazyExportDriversQuery();
  const [
    triggerSearchQuery,
    { data: driverDetail, isSuccess: isDriverSuccess },
  ] = useLazyGetDriverQuery();

  const items = [
    {
      template: () => (
        <Link to="/" className="font-semibold text-grey">
          Home
        </Link>
      ),
    },
    {
      template: () => (
        <Link to="/manage-driver" className="font-semibold text-grey">
          Driver
        </Link>
      ),
    },
    {
      template: () => (
        <Link to={`/manage-driver`} className="font-semibold text-black">
          Manage Driver
        </Link>
      ),
    },
  ];

  const [selectedProducts, setSelectedProducts] = useState(null);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [confirmationTitle, setConfirmationTitle] = useState("");
  const [currentCaseType, setCurrentCaseType] = useState("");
  const [selectLockDriver, setSelectLockDriver] = useState("");

  const columns = [
    {
      field: "Lock",
      header: "",
      headerAlign: "left",
      bodyAlign: "left",
      filter: false,
      sortable: false,
    },
    {
      field: "driver_id",
      header: "Driver ID",
      headerAlign: "left",
      bodyAlign: "left",
      filter: true,
      sortable: true,
    },
    {
      field: "driver_status",
      header: "Status",
      sortable: true,
      filter: true,
      headerAlign: "left",
    },
    // {
    //   field: "driver_type",
    //   header: "Driver Type",
    //   sortable: true,
    //   filter: true,
    //   headerAlign: "left",
    // },
    {
      field: "lease_info",
      header: "Lease Type",
      sortable: true,
      filter: true,
    },
    {
      field: "tlc_license_number",
      header: "TLC License No",
      sortable: true,
      filter: true,
    },
    {
      field: "tlc_license_expriy",
      header: "TLC License Expriy",
      sortable: true,
      filter: true,
    },
    {
      field: "dmv_license_number",
      header: "DMV License No",
      sortable: true,
      filter: true,
    },
    {
      field: "dmv_license_expriy",
      header: "DMV License Expriy",
      sortable: true,
      filter: true,
    },
    { field: "m_status", header: "Actions", sortable: false, filter: false },
    { field: "options", header: "" },
  ];

  const filterVar = {
    driver_id: {
      value: "",
      matchMode: "customFilter",
      label: "Driver ID",
      data: [],
      formatType: "Search",
    },
    driver_status: {
      value: "",
      matchMode: "customFilter",
      label: "Select Driver Status",
      data: filterSelectGenerate(driverDetail?.driver_status_list),
      formatType: "select",
    },
    // driver_type: {
    //   value: "",
    //   matchMode: "customFilter",
    //   label: "Select Driver Type",
    //   data: filterSelectGenerate(driverDetail?.driver_type_list),
    //   formatType: "select",
    // },
    lease_info: {
      value: "",
      matchMode: "customFilter",
      label: "Select Lease Type",
      data: filterSelectGenerate(driverDetail?.lease_type_list),
      formatType: "select",
    },
    tlc_license_number: {
      value: "",
      matchMode: "customFilter",
      label: "TLC License Number",
      data: [],
      formatType: "Search",
    },
    dmv_license_number: {
      value: "",
      matchMode: "customFilter",
      label: "DMV License Number",
      data: [],
      formatType: "Search",
    },
    dmv_license_expriy: {
      value: "",
      matchMode: "customFilter",
      label: "DMV License Expriy",
      formatType: "date",
    },
    tlc_license_expriy: {
      value: "",
      matchMode: "customFilter",
      label: "TLC License Expriy",
      formatType: "date",
    },
    m_status: {
      value: "",
      matchMode: "customFilter",
      label: "Driver Status",
      data: [],
      formatType: "select",
    },
  };

  const [filterData, setFilterData] = useState(filterVar);

  useEffect(() => {
    if (isDriverSuccess) {
      setFilterData((prev) => {
        return {
          ...prev,
          driver_status: {
            ...prev["driver_status"],
            data: filterSelectGenerate(driverDetail?.driver_status_list),
          },
          // driver_type: {
          //   ...prev["driver_type"],
          //   data: filterSelectGenerate(driverDetail?.driver_type_list),
          // },
          lease_info: {
            ...prev["lease_info"],
            data: filterSelectGenerate(driverDetail?.lease_type_list),
          },
        };
      });
    }
  }, [isDriverSuccess]);

  const menu = useRef(null);
  const [visibleColumns, setVisibleColumns] = useState({
    driver_id: true,
    driver_status: true,
    lease_info: true,
    tlc_license_number: true,
    tlc_license_expriy: false,
    dmv_license_number: true,
    dmv_license_expriy: false,
    m_status: true,
    options: true,
  });

  const exportFile = () => {
    handleExport({
      sortFieldMapping,
      sortField,
      sortOrder,
      triggerExport,
      filterApplyList,
      fileName: `driver_`,
    });
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

  const handleSelectMedallion = (data, objectName = "driver") => {
    dispatch(
      setSelectedMedallion({
        object_lookup: data?.driver_details?.driver_lookup_id,
        object_name: objectName,
        ...data,
      })
    );
  };

  const [createCase, { data, isSuccess }] = useCreateCaseMutation();

  const createNewCase = (caseType) => {
    setCurrentCaseType(caseType);
    createCase(caseType);
  };

  useEffect(() => {
    if (isSuccess) {
      const path = `/manage-driver/case/${currentCaseType}/${data.case_no}`;
      navigate(path);
    }
  }, [isSuccess]);

  const lockDriver = (data) => {
    setConfirmationTitle("Confirmation to Lock Driver");
    setConfirmationMessage(
      `Are you sure you want to lock this driver ${data}?`
    );
    setOpen(true);
    setFlow("lockDriver");
    setSelectLockDriver(data);
  };
  const unLockDriver = (data) => {
    setConfirmationTitle("Confirmation to Un-Lock Driver");
    setConfirmationMessage(
      `Are you sure you want to un-lock this driver ${data}?`
    );
    setOpen(true);
    setFlow("lockDriver");
    setSelectLockDriver(data);
  };

  const isDriverStatus = (data) => {
    // if (medallion.medallion_status === 'A') {
    // return !data.driver_status;
    if (data?.driver_details?.driver_status === "Inactive") {
      return false;
    } else if (
      data?.driver_details?.driver_status === "Active" ||
      data?.driver_details?.driver_status === "Registered"
    ) {
      return true;
    }
    // }
    // return false;
  };

  const customRender = (column, rowData) => {
    if (column.field === "driver_id") {
      let statusColor = "";
      let codeColor = "";
      if (!isDriverStatus(rowData)) {
        statusColor = "#ED1C24";
        codeColor = "#ED1C24";
      } else {
        statusColor = "#1DC13B";
        codeColor = "#1056EF";
      }
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1
              style={{ color: codeColor, cursor: "pointer" }}
              className="regular-semibold-text"
              data-testid="grid-driver-id"
              onClick={() => {
                navigate(
                  `/manage-driver/view/${rowData?.driver_details?.driver_lookup_id}`,
                  {
                    state: rowData?.driver_details?.driver_lookup_id,
                  }
                );
              }}
            >
              {rowData?.driver_details?.driver_lookup_id}
            </h1>
            <div
              className="mx-2"
              style={{
                width: "10px",
                height: "10px",
                backgroundColor: statusColor,
                borderRadius: "50%",
              }}
            ></div>
          </div>
          <p className="fst-italic" data-testid="grid-driver-first-name">
            {rowData?.driver_details?.full_name}
          </p>
        </div>
      );
    } else if (column.field === "Lock") {
      let isDriverLocked = rowData?.driver_details?.is_drive_locked;
      return isDriverLocked ? (
        <Button
          data-testid="lock"
          icon={() => <Img name="lock" className={"lock-img"} />}
          onClick={() =>
            unLockDriver(rowData?.driver_details?.driver_lookup_id)
          }
        ></Button>
      ) : (
        <Button
          data-testid="unlock"
          icon={() => <Img name="unlock" className={"lock-img"} />}
          onClick={() => lockDriver(rowData?.driver_details?.driver_lookup_id)}
        ></Button>
      );
    } else if (column.field === "driver_status") {
      return (
        <p data-testid="grid-driver-status">
          {rowData?.driver_details?.driver_status}
        </p>
      );
    } else if (column.field === "lease_info") {
      return (
        <p data-testid="grid-lease-type">{rowData?.lease_info?.lease_type}</p>
      );
    } else if (column.field === "tlc_license_number") {
      return (
        // <p data-testid="grid-tlc-num">
        //   {rowData?.tlc_license_details?.tlc_license_number}
        // </p>
        <div className="d-flex align-items-center justify-content-between flex-row">
          <h1
            style={{ color: "#1056EF", cursor: "pointer" }}
            className="regular-semibold-text"
            data-testid="grid-driver-id"
            onClick={() => {
              navigate(
                `/manage-driver/view/${rowData?.driver_details?.driver_lookup_id}`,
                {
                  state: rowData?.driver_details?.driver_lookup_id,
                }
              );
            }}
          >
            {rowData?.tlc_license_details?.tlc_license_number}
          </h1>
        </div>
      );
    } else if (column.field === "tlc_license_expriy") {
      return (
        <p data-testid="grid-tlc-expiry">
          {dateMonthYear(rowData?.tlc_license_details?.tlc_license_expiry_date)}
        </p>
      );
    } else if (column.field === "dmv_license_number") {
      return (
        <p data-testid="grid-dmv-num">
          {rowData?.dmv_license_details?.dmv_license_number}
        </p>
      );
    } else if (column.field === "dmv_license_expriy") {
      return (
        <p data-testid="grid-dmv-expiry">
          {dateMonthYear(rowData?.dmv_license_details?.dmv_license_expiry_date)}
        </p>
      );
    } else if (column.field === "options") {
      const menuKey = rowData?.driver_details?.driver_id;
      if (!menuRefs.current[menuKey]) {
        menuRefs.current[menuKey] = React.createRef();
      }

      const menuItems = [
        {
          label: "Update Address",
          command: () => onViewMedallion(rowData),
          dataTestId: "update-address",
          template: menuTemplate,
        },
        {
          label: "Update Payee",
          command: () => onPayTo(rowData),
          dataTestId: "update-payee",
          template: menuTemplate,
        },
        {
          label: "Update DMV License",
          command: () => dmvLicense(rowData),
          dataTestId: "update-dmv-license",
          template: menuTemplate,
        },
        {
          label: "Update TLC License",
          command: () => tlcLicense(rowData),
          dataTestId: "update-tlc-license",
          template: menuTemplate,
        },
        // {
        //   label: "Terminate Driver Lease",
        //   command: () => terminateDriverLease(rowData),
        //   dataTestId: "terminate-driver-lease",
        //   disabled: !rowData?.lease_info?.has_active_lease,
        //   template: menuTemplate,
        // },
        // {
        //   label: "Update Driver Lease",
        //   command: () => updateDriverLease(rowData),
        //   dataTestId: "update-driver-lease",
        //   template: menuTemplate,
        // },
      ];

      const onViewMedallion = (rowData) => {
        setFlow(DRIVER_UPDATE_ADDRESS);
        handleSelectMedallion(rowData);
        setConfirmationTitle("Confirmation on Driver Address Update");
        setConfirmationMessage(
          `This will create a new case to update the Driver address for ${rowData?.driver_details?.driver_lookup_id}. Are you sure to proceed?`
        );
        setOpen(true);
      };
      const onPayTo = (rowData) => {
        setFlow(DRIVER_PAYEE_TYPE);
        handleSelectMedallion(rowData);
        setConfirmationTitle("Confirmation on Payee Update");
        setConfirmationMessage(
          `This will create a new case to update the Payee for ${rowData?.driver_details?.driver_lookup_id}. Are you sure to proceed?`
        );
        setOpen(true);
      };
      const dmvLicense = (rowData) => {
        setFlow(DMV_LICENSE_TYPE);
        handleSelectMedallion(rowData);
        setConfirmationTitle("Confirmation on DMV License Update");
        setConfirmationMessage(
          `This will create a new case to update the DMV License for ${rowData?.driver_details?.driver_lookup_id}. Are you sure to proceed?`
        );
        setOpen(true);
      };
      const tlcLicense = (rowData) => {
        setFlow(DRIVER_TLC_LICENSE_TYPE);
        handleSelectMedallion(rowData);
        setConfirmationTitle("Confirmation on TLC License Update");
        setConfirmationMessage(
          `This will create a new case to update the TLC License for ${rowData?.driver_details?.driver_lookup_id}. Are you sure to proceed?`
        );
        setOpen(true);
      };
      // const terminateDriverLease = (rowData) => {
      //   setFlow("confirmterminatelease");
      //   handleSelectMedallion(rowData);
      //   setSelectLockDriver(rowData);
      //   setConfirmationTitle("Warning on Lease Termination");
      //   setConfirmationMessage(
      //     `You are about to terminate the lease. Do you want to proceed with termination`
      //   );
      //   setOpen(true);
      // };
      const updateDriverLease = (rowData) => {
        setFlow(UPDATEDRIVERLEASE);
        // dispatch(setSelectedMedallion({ }));
        handleSelectMedallion(rowData, "lease");
        setSelectLockDriver(rowData);
        setConfirmationTitle("Confirmation on Update Driver Lease");
        setConfirmationMessage(
          `This will create a new Update driver lease case for ${rowData?.driver_details?.driver_lookup_id} . Are you sure to proceed?`
        );
        setOpen(true);
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
          {/* <Button icon={()=><Img name="pencil_edit" />}></Button> */}
          {/* <Button icon={()=><Img name="trash" />}
           onClick={() => handleDeactivate([rowData])}
          ></Button> */}
          {/* <div> */}
          <Menu model={menuItems} popup ref={menuRefs.current[menuKey]} />
          <button
            className="three-dot-mennu btn border-0"
            data-testid="three-dot-menu"
            onClick={(e) => menuRefs.current[menuKey].current.toggle(e)}
          >
            <Img name="three_dots_vertival" />
          </button>
          {/* </div> */}
        </div>
      );
    } else if (column.field === "m_status") {
      return (
        <div className="d-flex flex-row gap-3">
          {rowData?.has_vehicle ? (
            <Button
              data-testid="car_success"
              {...gridToolTipOptins("Active Vehicle Lease")}
              icon={() => <Img name="car_success" />}
              // onClick={() =>
              //   navigate(
              //     `/manage-driver/doc-viewer/${rowData?.driver_details?.driver_lookup_id}`
              //   )
              // }
            ></Button>
          ) : (
            <Button
              {...gridToolTipOptins("No Active Lease")}
              data-testid="car_fail"
              icon={() => <Img name="car_fail" />}
            ></Button>
          )}
          {/* <div> */}
          {/* <div
              //  onClick={() => moveToLeaseCancelFlow(rowData)}
               onClick={()=>
               navigate(`/manage-driver/doc-viewer/${rowData?.driver_lookup_id}`)}
              >
                <Img name="document_success" />
              </div> */}
          {rowData?.has_documents ? (
            <Button
              data-testid="ic_pdf_active"
              {...gridToolTipOptins("Document Available")}
              icon={() => <Img name="ic_pdf_active" />}
              onClick={() =>
                navigate(
                  `/manage-driver/doc-viewer/${rowData?.driver_details?.driver_lookup_id}`
                )
              }
            ></Button>
          ) : (
            <Button
              {...gridToolTipOptins("Document Not Available")}
              data-testid="pdf_inactive"
              icon={() => <Img name="pdf_inactive" />}
            ></Button>
          )}
          <BAuditTrailManageModal
            data={`?driver_id=${rowData?.driver_details?.driver_id}`}
            title="Driver Audit Trail History"
          />
          {/* {
            rowData?.driver_details?.has_audit_trail ?
            <BAuditTrailManageModal data={`?driver_id=${ rowData?.driver_details?.driver_id}`}/> :
              <Link className="manage-table-action-svg d-flex align-items-center"
                to={`/coming-soon`}  data-testid="audit_trail_fail"><Img name="audit_trail_fail" /></Link>
          } */}
          {/* {
            rowData?.driver_details?.has_audit_trail ?
              <Button icon={() => <Img name="audit_trail_success" className={"lock-img"} />} ></Button>
              :
              <Button icon={() => <Img name="audit_trail_fail" className={"lock-img"} />} ></Button>
          } */}
          {/* </div> */}
        </div>
      );
    }
    return [column.field];
  };

  const [rows, setRows] = useState(5);
  const [page, setPage] = useState(1);
  const sortFieldMapping = {
    driver_id: "tlc_license_number",
    // driver_type: "driver_type",
    lease_info: "lease_type",
    tlc_license_number: "tlc_license_number",
    tlc_license_expriy: "tlc_license_expriy",
    dmv_license_number: "dmv_license_number",
    dmv_license_expriy: "dmv_license_expriy",
    m_status: "driver_status",
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

    triggerSearchQuery(`?${queryParams.toString()}`);
  };

  const onPageChange = (data) => {
    setPage(Number(data.page) + 1);
    setRows(data.rows);
    triggerSearch({ page: Number(data.page) + 1, limit: data.rows });
  };
  const filterApply = (option, data) => {
    if (data) {
      updateFilter(option, data, "add");
    }
  };

  const triggerSearchDriver = (queryParams) => {
    if (queryParams.toString()) {
      triggerSearchDriverQuery(`?${queryParams.toString()}`);
    }
  };
  const [filterSearchBy, setFilterSearchBy] = useState(false);

  const searchData = (type, value) => {
    const queryParams = new URLSearchParams();
    if (type.field === "driver_id") {
      queryParams.append("driver_lookup_id", value);
    } else if (type.field === "tlc_license_number") {
      queryParams.append("tlc_license_number", value);
    } else if (type.field === "dmv_license_number") {
      queryParams.append("dmv_license_number", value);
    }
    setFilterSearchBy(type.field);
    triggerSearchDriver(queryParams);
  };

  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState(1);
  const [searchFilterData, setSearchFilterData] = useState({});

  const [filterApplyList, setFilterApplyList] = useState(new Map());

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
    driver_lookup_id: "driver_id",
    // driver_type: "driver_type",
    lease_info: "lease_type",
    tlc_license_number: "tlc_license_number",
    dmv_license_number: "dmv_license_number",
    tlc_license_expriy: ["tlc_license_expiry_from", "tlc_license_expiry_to"],
    dmv_license_expriy: ["dmv_license_expiry_from", "dmv_license_expiry_to"],
    driver_status: "driver_status",
  };

  const updateFilter = (option, data = null, action = "add") => {
    const updatedFilterApplyList = new Map(filterApplyList);

    const fieldMapping = {
      driver_id: "driver_lookup_id",
      // driver_type: "driver_type",
      lease_info: "lease_type",
      tlc_license_number: "tlc_license_number",
      dmv_license_number: "dmv_license_number",
      tlc_license_expriy: ["tlc_license_expiry_from", "tlc_license_expiry_to"],
      dmv_license_expriy: ["dmv_license_expiry_from", "dmv_license_expiry_to"],
      driver_status: "driver_status",
    };

    const fieldKey = fieldMapping[option.field];

    if (filterData) {
      // if (action === "add") {
      //   // Update the filterData's value
      //   if (Array.isArray(fieldKey)) {
      //     // Handle the case for multiple fields, like 'fromDate' and 'toDate'
      //     setFilterData(prevState => ({
      //       ...prevState,
      //       [option.field]: { ...prevState[option.field], value: "ff",filterDemoData:data },
      //     }));
      //     updatedFilterApplyList.set(fieldKey[0], yearMonthDate(data.fromDate));
      //     updatedFilterApplyList.set(fieldKey[1], yearMonthDate(data.toDate));
      //   } else if (fieldKey) {
      //     if (Array.isArray(data)) {
      //       const value = data.map(item => item.name).join(",");
      //       setFilterData(prevState => ({
      //         ...prevState,
      //         [option.field]: { ...prevState[option.field], value: "ff" },
      //       }));
      //       updatedFilterApplyList.set(fieldKey, value);
      //     } else {
      //       const value = data.name || data;
      //       setFilterData(prevState => ({
      //         ...prevState,
      //         [option.field]: { ...prevState[option.field], value: "ff" },
      //       }));
      //       updatedFilterApplyList.set(fieldKey, value);
      //     }
      //   }
      // }

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
          updatedFilterApplyList.set(fieldKey[0], yearMonthDate(data.fromDate));
          updatedFilterApplyList.set(fieldKey[1], yearMonthDate(data.toDate));
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
    // triggerSearch({ page: 1, limit: 5, sField: field, sOrder: order });
    triggerSearch({ page: page, limit: rows, sField: field, sOrder: order });
  };

  const [triggerSearchDriverQuery, { data: driverSearchDetail }] =
    useSearchDriverMutation();

  useEffect(() => {
    setPage(1);
    setRows(5);
    triggerSearch({ page: 1, limit: 5 });
  }, [filterApplyList]);

  const handleSearchItemChange = (newItems) => {
    setSearchFilterData((prev) => ({
      ...prev,
      [filterSearchBy]: newItems,
    }));
  };

  useEffect(() => {
    if (driverSearchDetail) {
      if (filterSearchBy === "driver_id") {
        const data = driverSearchDetail.items.map((driver) => ({
          name: driver.driver_details.driver_lookup_id,
          id: driver.driver_details.driver_id,
        }));
        handleSearchItemChange(data);
      } else if (filterSearchBy === "tlc_license_number") {
        const data = driverSearchDetail.items.map((driver) => ({
          name: driver.tlc_license_details?.tlc_license_number,
          id: driver.driver_details.driver_id,
        }));
        handleSearchItemChange(data);
      } else if (filterSearchBy === "dmv_license_number") {
        const data = driverSearchDetail.items.map((driver) => ({
          name: driver.dmv_license_details?.dmv_license_number,
          id: driver.driver_details.driver_id,
        }));
        handleSearchItemChange(data);
      }
    }
  }, [driverSearchDetail]);

  const refreshFunc = () => {
    triggerSearch({ page: page, limit: rows });
  };
  const visibleCount = Object.values(visibleColumns).filter(Boolean).length;
  const [lockDriverStatus, { isSuccess: isLockDriverSuccess, isError }] =
    useDriverLockStatusMutation();
  const lockDriverFunc = () => {
    lockDriverStatus(selectLockDriver);
  };
  useEffect(() => {
    if (isLockDriverSuccess) {
      setFlow("");
      setOpen(false);
      setSelectLockDriver("");
      triggerSearch({ page: page, limit: rows });
    }
  }, [isLockDriverSuccess]);

  useEffect(() => {
    if (isError) {
      setFlow("");
      setOpen(false);
      setSelectLockDriver("");
    }
  }, [isError]);

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
            <p className="topic-txt">Manage Drivers</p>
            {/* <p className="regular-text text-grey">
              Showing {rows} of{" "}
              <span data-testid="total_item_count">
                {driverDetail?.total_items}
              </span>{" "}
              Lists...{" "}
            </p> */}
            <GridShowingCount
              rows={driverDetail?.items.length || 0}
              total={driverDetail?.total_items}
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
        <div className="d-flex justify-content-end align-items-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <span className="fw-bold">Export as:</span>
            <ExportBtn
              {...{
                sortFieldMapping,
                sortField,
                sortOrder,
                triggerExport,
                filterApplyList,
                fileName: `driver_`,
              }}
            ></ExportBtn>
          </div>

          {/* <Button data-testid="export-btn" text className='regular-text gap-2 d-flex' onClick={exportFile} icon={() => <Img name="ic_export" />} >Export as .XLS</Button> */}
        </div>
      </div>
      <DataTableComponent
        columns={filteredColumns}
        data={driverDetail?.items}
        filterData={filterData}
        filterApply={filterApply}
        onSortApply={onSortApply}
        selectedData={selectedProducts}
        onSelectionChange={(e) => setSelectedProducts(e.value)}
        renderColumn={customRender}
        onPageChange={onPageChange}
        emptyMessage={"No records found"}
        totalRecords={driverDetail?.total_items}
        searchData={searchData}
        dataKey="driver_details.driver_lookup_id"
        pSortField={sortField}
        pSortOrder={sortOrder}
        filterSearchData={searchFilterData}
        clearAllFilter={clearAllFilter}
        clearFilter={clearFilter}
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
          if (flow === DMV_LICENSE_TYPE) {
            createNewCase(DMV_LICENSE_TYPE);
          } else if (flow === DRIVER_TLC_LICENSE_TYPE) {
            createNewCase(DRIVER_TLC_LICENSE_TYPE);
          } else if (flow === DRIVER_PAYEE_TYPE) {
            createNewCase(DRIVER_PAYEE_TYPE);
          } else if (flow === DRIVER_UPDATE_ADDRESS) {
            createNewCase(DRIVER_UPDATE_ADDRESS);
          } else if (flow === "confirmterminatelease") {
            setConfirmationTitle("Confirmation on Lease Termination");
            setConfirmationMessage(
              `This will create a new Terminate lease case for ${selectLockDriver?.driver_details?.driver_lookup_id} . Are you sure to proceed?`
            );
            setFlow(TERMINATEDRIVERLEASE);
            setOpen(true);
          } else if (flow === TERMINATEDRIVERLEASE) {
            createNewCase(TERMINATEDRIVERLEASE);
          } else if (flow === UPDATEDRIVERLEASE) {
            createNewCase(UPDATEDRIVERLEASE);
          } else if (flow === "lockDriver") {
            lockDriverFunc();
          }
        }}
        {...(flow === "confirmterminatelease" && { iconName: "warning" })}
      ></BConfirmModal>
    </div>
  );
};

export default ManageDriver;
