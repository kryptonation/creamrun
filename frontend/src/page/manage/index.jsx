import React, { useEffect, useRef, useState } from "react";
import DataTableComponent from "../../components/DataTableComponent";
import BBreadCrumb from "../../components/BBreadCrumb";
import Img from "../../components/Img";
import { Menu } from "primereact/menu";
import "../manage/_manage_medallian.scss";
import BConfirmModal from "../../components/BConfirmModal";
import { Link, useNavigate } from "react-router-dom";
import {
  ALLOCATE_MEDALLION,
  PAYEE_CASE_TYPE,
  RENMED_CASE_TYPE,
  RETMED_CASE_TYPE,
  STOMED_CASE_TYPE,
  TERMED_CASE_TYPE,
  UPDADRMED_CASE_TYPE,
  UPDATE_MEDALLION_TYPE,
} from "../../utils/constants";
import {
  useCreateCaseMutation,
  useLazyExportMedallionsQuery,
  useLazyGetMedallionsQuery,
  useRemoveMedallionMutation,
} from "../../redux/api/medallionApi";
import { dateMonthYear, yearMonthDate } from "../../utils/dateConverter";
import { setSelectedMedallion } from "../../redux/slice/selectedMedallionDetail";
import { useDispatch } from "react-redux";
import BToast from "../../components/BToast";
import { Divider } from "primereact/divider";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Badge } from "primereact/badge";
import {
  isLeaseActive,
  isMedallionActive,
  isMedallionStorageActiverOrArchived,
} from "../../utils/MedallionUtils";
import BAuditTrailManageModal from "../../components/BAuditTrailManageModal";
import {
  filterSelectGenerate,
  removeUnderScore,
  removeUnderScorefilterGenerate,
} from "../../utils/utils";
import { menuTemplate } from "../../utils/gridUtils";
import ExportBtn from "../../components/ExportBtn";
import { gridToolTipOptins } from "../../utils/tooltipUtils";
import GridShowingCount from "../../components/GridShowingCount";

const Manage = ({ title }) => {
  const [isOpen, setOpen] = useState(false);
  const navigate = useNavigate();
  const [triggerGetMedallion, { data: medallianData }] =
    useLazyGetMedallionsQuery();

  const [
    triggerSearchGetMedallion,
    { data: medallianSearchData, isSuccess: isMedallionSearchSuccess },
  ] = useLazyGetMedallionsQuery();

  const [selectedProducts, setSelectedProducts] = useState(null);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [confirmationTitle, setConfirmationTitle] = useState("");
  const [currentCaseType, setCurrentCaseType] = useState("");
  const [medallions, setMedallions] = useState([]);
  const [
    currentMedallionToDeactivateselectedProducts,
    setCurrentMedallionToDeactivate,
  ] = useState(null);
  const [deactivateMedallions, { isSuccess: deactivateMedallionsSuccess }] =
    useRemoveMedallionMutation();
  const toast = useRef(null);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(5);
  const [filterApplyList, setFilterApplyList] = useState(new Map());
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState(1);
  const [searchFilterData, setSearchFilterData] = useState({});

  const [filterSearchBy, setFilterSearchBy] = useState("");
  const [triggerExport] = useLazyExportMedallionsQuery();
  const filterVar = {
    medallion_number: {
      value: "",
      matchMode: "customFilter",
      label: "Medallion Number",
      data: [],
      formatType: "Search",
    },
    medallion_status: {
      value: "",
      matchMode: "customFilter",
      label: "Medallion Status",
      data: removeUnderScorefilterGenerate(
        medallianData?.medallion_status_list
      ),
      formatType: "select",
    },
    medallion_type: {
      value: "",
      matchMode: "customFilter",
      label: "Medallion Type",
      data: filterSelectGenerate(medallianData?.medallion_type_list),
      formatType: "select",
    },
    created_on: {
      value: "",
      matchMode: "customFilter",
      label: "Created On",
      // data: filterSelectGenerate(medallianData?.medallion_type_list),
      formatType: "date",
    },
    renewal_date: {
      value: "",
      matchMode: "customFilter",
      label: "Renewal Date",
      // data: filterSelectGenerate(medallianData?.medallion_type_list),
      formatType: "date",
    },
    validity_end_date: {
      value: "",
      matchMode: "customFilter",
      label: "End Date",
      formatType: "date",
    },

    medallion_owner: {
      value: "",
      matchMode: "customFilter",
      label: "Medallion Owner",
      data: [],
      formatType: "Search",
    },

    lease_expiry_date: {
      value: "",
      matchMode: "customFilter",
      label: "Lease Expiry Date",
      formatType: "date",
    },
  };
  const [filterData, setFilterData] = useState(filterVar);
  useEffect(() => {
    if (medallianData) {
      console.log("isMedallionSearchSuccess");
      setFilterData((prev) => {
        return {
          ...prev,
          medallion_status: {
            ...prev["medallion_status"],
            data: removeUnderScorefilterGenerate(
              medallianData?.medallion_status_list
            ),
          },
          medallion_type: {
            ...prev["medallion_type"],
            data: filterSelectGenerate(medallianData?.medallion_type_list),
          },
        };
      });
    }
  }, [medallianData]);

  const [flow, setFlow] = useState("");
  const columns = [
    {
      field: "medallion_number",
      header: "Medallion Number",
      dataTestId: "medallionNumberHeader",
      sortable: true,
      headerAlign: "left",
      bodyAlign: "left",
      filter: true,
    },
    {
      field: "medallion_status",
      header: "Status",
      dataTestId: "statusHeader",
      headerAlign: "left",
      sortable: true,
      filter: true,
    },
    {
      field: "medallion_type",
      header: "Medallion Type",
      dataTestId: "medallionTypeHeader",
      sortable: true,
      filter: true,
    },
    {
      field: "created_on",
      header: "Created On",
      dataTestId: "createOnHeader",
      sortable: true,
      filter: true,
    },
    {
      field: "renewal_date",
      header: "Renewal Date",
      dataTestId: "renewalDateHeader",
      sortable: true,
      filter: true,
    },
    {
      field: "validity_end_date",
      header: "End Date",
      dataTestId: "endDateHeader",
      sortable: true,
      filter: true,
    },
    {
      field: "medallion_owner",
      header: "Medallion Owner",
      dataTestId: "medallionOwnerHeader",
      sortable: true,
      filter: true,
    },
    {
      field: "lease_expiry_date",
      header: "Lease Expiry",
      dataTestId: "leaseExpiryHeader",
      sortable: true,
      filter: true,
    },
    { field: "m_status", header: "Actions", dataTestId: "actionsHeader" },
    { field: "options", header: "", dataTestId: "optionsHeader" },
  ];
  const menu = useRef(null);
  const [visibleColumns, setVisibleColumns] = useState({
    medallion_number: true,
    medallion_status: true,
    medallion_type: true,
    created_on: true,
    renewal_date: true,
    validity_end_date: false,
    lease_expiry_date: false,
    m_status: true,
    medallion_owner: false,
    options: true,
  });

  const searchData = (type, value) => {
    const queryParams = new URLSearchParams({
      page: 1,
      per_page: 5,
    });

    if (type.field === "medallion_number") {
      queryParams.append("medallion_number", value);
    }

    if (type.field === "medallion_owner") {
      queryParams.append("medallion_owner", value);
    }
    setFilterSearchBy(type.field);
    triggerSearchGetMedallion(`?${queryParams?.toString()}`);
  };
  const items = columns.map((col) => ({
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

  const handleSelectMedallion = (medallion) => {
    // dispatch(setSelectedMedallion(medallion));
    dispatch(
      setSelectedMedallion({
        object_lookup: medallion.medallion_number,
        object_name: "medallion",
        ...medallion,
      })
    );
  };

  const moveToLeaseCancelFlow = (rowData) => {
    if (isLeaseActive(rowData)) {
      handleSelectMedallion(rowData);
      setFlow("CANCEL_LEASE");
      setConfirmationTitle("Confirmation on Medallion Lease Termination");
      setConfirmationMessage(
        `This will create a new termination case for medallion <strong>${rowData.medallion_number}</strong>.<br>Are you sure to proceed?`
      );
      setOpen(true);
    }
  };
  const moveToStorageFlow = (rowData) => {
    handleSelectMedallion(rowData);
    if (!rowData.in_storage) {
      setFlow("STORAGE");
      setConfirmationTitle("Confirmation on Medallion Storage");
      setConfirmationMessage(
        `This will create a new storage case for medallion <strong>${rowData.medallion_number}</strong>.<br>Are you sure to proceed?`
      );
    } else {
      setFlow("RETRIVE");
      setConfirmationTitle("Confirmation on Medallion Retrieve from Storage");
      setConfirmationMessage(
        `This will create a new retrieve case for medallion <strong>${rowData.medallion_number}</strong>.<br>Are you sure to proceed?`
      );
    }
    setOpen(true);
  };

  const menuRefs = useRef({});
  const [createCase, { data, isSuccess }] = useCreateCaseMutation();

  const createNewCase = (caseType) => {
    setCurrentCaseType(caseType);
    createCase(caseType);
  };

  const sortFieldMapping = {
    medallion_number: "medallion_number",
    medallion_status: "medallion_status",
    medallion_type: "medallion_type",
    // validity_end_date: "renewal_date",
    renewal_date: "renewal_date",
    lease_expiry_date: "lease_expiry",
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
    triggerGetMedallion(`?${queryParams.toString()}`);
  };

  useEffect(() => {
    triggerSearch({ page: 1, limit: 5 });
  }, []);

  const onPageChange = (data) => {
    // setFirst(Number(data.first)+1);
    setPage(Number(data.page) + 1);
    setRows(data.rows);
    triggerSearch({ page: Number(data.page) + 1, limit: data.rows });
  };

  // useEffect(() => {
  //   if (medallianData) {
  //     if (!isFilterSearch) {
  //       setMedallions(medallianData.items);
  //     } else {
  //       const data = medallianData.items.map((medallian) => ({
  //         name:
  //           filterSearchBy === "medallion_number"
  //             ? medallian.medallion_number
  //             : medallian.medallion_owner,
  //         id: medallian.medallion_id,
  //       }));

  //       setSearchFilterData(data);
  //     }
  //   }
  // }, [medallianData, isFilterSearch]);

  const handleSearchItemChange = (newItems) => {
    setSearchFilterData((prev) => ({
      ...prev,
      [filterSearchBy]: newItems, // dynamic key from filterSearchBy
    }));
  };

  useEffect(() => {
    if (medallianData) {
      setMedallions(medallianData.items);
    }
  }, [medallianData]);

  useEffect(() => {
    if (medallianSearchData) {
      const data = medallianSearchData.items.map((medallian) => ({
        name:
          filterSearchBy === "medallion_number"
            ? medallian.medallion_number
            : medallian.medallion_owner,
        id: medallian.medallion_id,
      }));
      handleSearchItemChange(data);
    }
  }, [medallianSearchData]);

  useEffect(() => {
    if (isSuccess) {
      const path = `/case/${currentCaseType}/${data.case_no}`;
      navigate(path);
    }
  }, [isSuccess]);

  useEffect(() => {
    if (deactivateMedallionsSuccess) {
      setSelectedProducts([]);
      setCurrentMedallionToDeactivate([]);
      toast.current.showToast(
        "Success",
        "Medallion successfully removed from system.",
        "success",
        false,
        10000
      );
    }
  }, [deactivateMedallionsSuccess]);

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
      medallion_number: "medallion_number",
      medallion_status: "medallion_status",
      medallion_type: "medallion_type",
      validity_end_date: ["validity_end_date_from", "validity_end_date_to"],
      renewal_date: ["renewal_date_from", "renewal_date_to"],
      created_on: ["medallion_created_from", "medallion_created_to"],
      medallion_owner: "medallion_owner",
      lease_expiry_date: ["lease_expiry_from", "lease_expiry_to"],
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

      if (Array.isArray(fieldKey)) {
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

  const allocateMedallion = (medallion) => {
    handleSelectMedallion(medallion);
    createNewCase(ALLOCATE_MEDALLION);
  };

  const customRender = (column, rowData) => {
    if (column.field === "medallion_number") {
      let statusColor = "";
      let codeColor = "";
      if (!isMedallionActive(rowData)) {
        statusColor = "#ED1C24";
        codeColor = "#ED1C24";
      } else {
        statusColor = "#1DC13B";
        codeColor = "#1056EF";
      }
      const onViewMedallion = (rowData) => {
        const path = `/manage-medallion/view?medallionId=${rowData.medallion_number}`;
        navigate(path);
      };
      return (
        <div>
          <div className="d-flex flex-row align-items-center justify-content-between">
            <button
              style={{ color: codeColor }}
              className="regular-semibold-text btn p-0 border-0"
              data-testid="grid-medallion-num"
              onClick={() => onViewMedallion(rowData)}
            >
              {rowData.medallion_number}
            </button>
            <div
              style={{
                width: "10px",
                height: "10px",
                backgroundColor: statusColor,
                borderRadius: "50%",
              }}
            ></div>
          </div>
          <p className="fst-italic" data-testid="grid-medallion-owner">
            {rowData.medallion_owner}
          </p>
        </div>
      );
    } else if (column.field === "medallion_status") {
      return (
        <p data-testid="grid-medallion-status">
          {removeUnderScore(rowData?.medallion_status)}
        </p>
      );
    } else if (column.field === "medallion_owner") {
      return (
        <p data-testid="grid-medallion-owner">
          {removeUnderScore(rowData?.medallion_owner)}
        </p>
      );
    } else if (column.field === "medallion_type") {
      return <p data-testid="grid-medallion-type">{rowData?.medallion_type}</p>;
    } else if (column.field === "validity_end_date") {
      return (
        <p data-testid="grid-medallion-validity-end-date">
          {dateMonthYear(rowData.validity_end_date)}
        </p>
      );
    } else if (column.field === "renewal_date") {
      return (
        <p data-testid="grid-medallion-renewal-date">
          {dateMonthYear(rowData?.renewal_date)}
        </p>
      );
    } else if (column.field === "created_on") {
      return (
        <p data-testid="grid-medallion-created-on-date">
          {dateMonthYear(rowData.created_on)}
        </p>
      );
    } else if (column.field === "lease_expiry_date") {
      return (
        <p data-testid="grid-lease-expiry-date">
          {dateMonthYear(rowData.lease_expiry_date)}
        </p>
      );
    } else if (column.field === "options") {
      const menuKey = rowData.medallion_number;
      if (!menuRefs.current[menuKey]) {
        menuRefs.current[menuKey] = React.createRef();
      }

      const menuItems = [
        // {
        //   label: "View Medallion",
        //   command: () => onViewMedallion(rowData),
        //   dataTestId: "view-medallion",
        //   template: menuTemplate,
        // },
        {
          label: "Update Medallion",
          command: () => updateMedallion(rowData),
          dataTestId: "update-medallion",
          template: menuTemplate,
        },
        // {
        //   label: "Update MO Address",
        //   command: () => onUpdateMOAddress(rowData),
        //   dataTestId: "update-mo-address",
        //   template: menuTemplate,
        // },
        // {
        //   label: "Update Payee",
        //   command: () => onUpdatePayee(rowData),
        //   dataTestId: "update-payee",
        //   template: menuTemplate,
        // },
        {
          label: "Renew Medallion",
          command: () => onRenewMedallion(rowData),
          dataTestId: "renew-medallion",
          template: menuTemplate,
        },
      ];

      const onViewMedallion = (rowData) => {
        const path = `/manage-medallion/view?medallionId=${rowData.medallion_number}`;
        navigate(path);
      };
      const updateMedallion = (rowData) => {
        handleSelectMedallion(rowData);
        setFlow("UPDATE_MEDALLION");
        setConfirmationTitle("Confirmation on Medallion Update");
        setConfirmationMessage(
          `This will create a medallion updating case for medallion <strong>${rowData.medallion_number}</strong>.<br>Are you sure to proceed?`
        );
        setOpen(true);
      };
      const onUpdateMOAddress = (rowData) => {
        handleSelectMedallion(rowData);
        setFlow("UPDATE_ADDRESS");
        setConfirmationTitle("Confirmation on Medallion Owner Address Update");
        setConfirmationMessage(
          `This will create a new address updating case for medallion <strong>${rowData.medallion_number}</strong>.<br>Are you sure to proceed?`
        );
        setOpen(true);
      };
      const onUpdatePayee = (rowData) => {
        handleSelectMedallion(rowData);
        setFlow(PAYEE_CASE_TYPE);
        setConfirmationTitle("Confirmation on Payee");
        setConfirmationMessage(
          `This will create a new renewal case for the medallion <strong>${rowData.medallion_number}</strong>.<br>Are you sure to proceed?`
        );
        setOpen(true);
      };
      const onRenewMedallion = (rowData) => {
        handleSelectMedallion(rowData);
        setFlow("RENEWAL");
        setConfirmationTitle("Confirmation on Medallion Renewal");
        setConfirmationMessage(
          `This will create a new renewal case for the medallion <strong>${rowData.medallion_number}</strong>.<br>Are you sure to proceed?`
        );
        setOpen(true);
      };

      return (
        <div className="d-flex align-items-center">
          <Button
            className="manage-table-action-svg"
            {...gridToolTipOptins("Delete")}
            data-testid="trash-icon"
            icon={() => <Img name="trash" />}
            onClick={() => handleDeactivate([rowData])}
          ></Button>
          <>
            <Menu
              model={menuItems}
              className="regular-text"
              popup
              ref={menuRefs.current[menuKey]}
            />
            <Button
              className="three-dot-mennu manage-table-action-svg"
              data-testid="three-dot-menu"
              onClick={(e) => menuRefs.current[menuKey].current.toggle(e)}
              icon={() => <Img name="three_dots_vertival" />}
            ></Button>
          </>
        </div>
      );
    } else if (column.field === "m_status") {
      return (
        <div className="d-flex flex-row gap-2">
          {!rowData?.in_storage ? (
            <Button
              className="manage-table-action-svg"
              {...gridToolTipOptins(
                rowData?.vehicle ? "Vehicle Allocated" : "Allocation Available"
              )}
              onClick={() =>
                rowData?.vehicle ? null : allocateMedallion(rowData)
              }
              icon={() =>
                rowData?.vehicle ? (
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
          ) : (
            <Button
              className="manage-table-action-svg"
              {...gridToolTipOptins("Allocation Not Allowed")}
              icon={() => (
                <span data-testid="car_fail">
                  <Img name="car_fail" />
                </span>
              )}
            ></Button>
          )}
          <Button
            className="manage-table-action-svg"
            // {...gridToolTipOptins(
            //   rowData?.driver_lease ? "Active Lease" : "No Active Lease"
            // )}
            {...gridToolTipOptins(
              isLeaseActive(rowData) ? "Active Lease" : "No Active Lease"
            )}
            icon={() =>
              // rowData?.driver_lease
              isLeaseActive(rowData) ? (
                <span data-testid="lease_active">
                  <Img name="lease_active" />
                </span>
              ) : (
                <span data-testid="lease_inactive">
                  <Img name="lease_inactive" />
                </span>
              )
            }
            // onClick={() =>
            //   isLeaseActive(rowData) ? moveToLeaseCancelFlow(rowData) : null
            // }
          ></Button>
          {isMedallionStorageActiverOrArchived(rowData) ? (
            rowData.in_storage ? (
              <Button
                onClick={() => moveToStorageFlow(rowData)}
                {...gridToolTipOptins("Medallion in Storage")}
                icon={() => (
                  <span data-testid="storage_after">
                    <Img name="storage_after" />
                  </span>
                )}
              ></Button>
            ) : (
              <Button
                onClick={() => moveToStorageFlow(rowData)}
                {...gridToolTipOptins("Available Storage")}
                icon={() => (
                  <span data-testid="storage_before">
                    <Img name="storage_before" />
                  </span>
                )}
              ></Button>
            )
          ) : (
            <Button
              {...gridToolTipOptins("Storage Not Allowed")}
              icon={() => (
                <span data-testid="storage_before">
                  <Img name="storage_error" />
                </span>
              )}
            ></Button>
          )}
          {rowData.does_medallion_have_documents ? (
            <Link
              className="manage-table-action-svg d-flex align-items-center"
              to={`doc-viewer/${rowData.medallion_number}`}
              {...gridToolTipOptins("Document Available")}
            >
              <span data-testid="ic_pdf_active">
                <Img name="ic_pdf_active" />
              </span>
            </Link>
          ) : (
            <Button
              {...gridToolTipOptins("Document Not Available")}
              icon={() => (
                <span data-testid="pdf_inactive">
                  <Img name="pdf_inactive" />
                </span>
              )}
            ></Button>
          )}
          <BAuditTrailManageModal
            data={`?medallion_id=${rowData?.medallion_id}`}
            title="Medallion Audit Trail History"
          />
        </div>
      );
    }
    return rowData[column.field];
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
        <Link to="/manage-medallion" className="font-semibold text-grey">
          Medallion
        </Link>
      ),
    },
    {
      template: () => (
        <Link to={`/manage-medallion`} className="font-semibold text-black">
          Manage Medallion
        </Link>
      ),
    },
  ];
  const handleDeactivate = (medallions) => {
    setCurrentMedallionToDeactivate(medallions);
    setFlow("DELETE");
    setConfirmationTitle("Confirmation on Delete Medallion");
    setConfirmationMessage(`Are you sure to delete the selected Medallion?`);
    setOpen(true);
  };

  const proccedDelete = async () => {
    const medallionNumbers = currentMedallionToDeactivateselectedProducts.map(
      (item) => item.medallion_number
    );
    try {
      await deactivateMedallions(medallionNumbers).unwrap();
      selectedProducts([]);
    } catch (err) {
      console.log(err);
    }
  };
  const visibleCount = Object.values(visibleColumns).filter(Boolean).length;

  useEffect(() => {
    setPage(1);
    setRows(5);
    triggerSearch({ page: 1, limit: 5 });
  }, [filterApplyList]);

  const refreshFunc = () => {
    triggerSearch({ page: page, limit: rows });
  };

  return (
    <div className="common-layout w-100 h-100 d-flex flex-column manage-medallian">
      <BBreadCrumb breadcrumbItems={breadcrumbItems} separator="/" />
      <div className="header">
        <div className="left-content">
          <h3 className="topic-txt">{title}</h3>
          {/* <p className="regular-text text-grey">
            Showing {rows<medallianData?.total_items?rows:medallianData?.total_items} of {medallianData?.total_items} Lists...{" "}
          </p> */}
          <GridShowingCount
            rows={medallions?.length || 0}
            total={medallianData?.total_items}
          />
        </div>
        <div className="right-content">
          <Menu model={items} popup ref={menu} />
          <Button
            data-testid="column-filter-btn"
            text
            onClick={(e) => menu.current.toggle(e)}
            className="d-flex justify-content-center manage-table-action-svg w-auto align-items-center position-relative"
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
            data-test="delete-medallion"
            className="manage-table-action-svg"
            onClick={() => handleDeactivate(selectedProducts)}
            icon={() => (
              <Img
                name={
                  !selectedProducts || selectedProducts.length <= 0
                    ? "trash_disable"
                    : "trash"
                }
              />
            )}
          ></Button>
          <Divider layout="vertical" />
          <Button
            data-testid="refresh_btn"
            className="manage-table-action-svg"
            icon={() => <Img name={"refresh"} />}
            onClick={refreshFunc}
          ></Button>
        </div>
      </div>
      <div className="d-flex justify-content-end align-items-center">
        <span className="fw-bold">Export as:</span>
        <ExportBtn
          {...{
            sortFieldMapping,
            sortField,
            sortOrder,
            triggerExport,
            filterApplyList,
            fileName: `medallion_`,
          }}
        ></ExportBtn>
      </div>
      <DataTableComponent
        columns={filteredColumns}
        data={medallions}
        selectionMode="checkbox"
        selectedData={selectedProducts}
        filterData={filterData}
        onSelectionChange={(e) => setSelectedProducts(e.value)}
        renderColumn={customRender}
        onPageChange={onPageChange}
        totalRecords={medallianData?.total_items}
        dataKey="medallion_id"
        filterSearchData={searchFilterData}
        clearAllFilter={clearAllFilter}
        clearFilter={clearFilter}
        pSortField={sortField}
        pSortOrder={sortOrder}
        filterApply={filterApply}
        onSortApply={onSortApply}
        searchData={searchData}
        filterSearchBy={filterSearchBy}
        lazy={true}
      />

      <BConfirmModal
        isOpen={isOpen}
        title={confirmationTitle}
        message={confirmationMessage}
        isHtml={true}
        onCancel={() => {
          setOpen(false);
        }}
        onConfirm={() => {
          setOpen(false);
          if (flow === "DELETE") {
            proccedDelete();
          } else if (flow === "RENEWAL") {
            createNewCase(RENMED_CASE_TYPE);
          } else if (flow === "STORAGE") {
            createNewCase(STOMED_CASE_TYPE);
          } else if (flow === "CANCEL_LEASE") {
            createNewCase(TERMED_CASE_TYPE);
          } else if (flow === "UPDATE_ADDRESS") {
            createNewCase(UPDADRMED_CASE_TYPE);
          } else if (flow === "UPDATE_MEDALLION") {
            createNewCase(UPDATE_MEDALLION_TYPE);
          } else if (flow === PAYEE_CASE_TYPE) {
            createNewCase(PAYEE_CASE_TYPE);
          } else {
            createNewCase(RETMED_CASE_TYPE);
          }
        }}
        {...(flow === "DELETE" && { iconName: "red-delete" })}
      ></BConfirmModal>
      <BToast ref={toast} position="top-right" />
    </div>
  );
};

export default Manage;
