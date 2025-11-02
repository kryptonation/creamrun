import React, { useEffect, useRef, useState } from "react";
import DataTableComponent from "../../components/DataTableComponent";
import BBreadCrumb from "../../components/BBreadCrumb";
import Img from "../../components/Img";
import { Menu } from "primereact/menu";
import "../manage/_manage_medallian.scss";
import BConfirmModal from "../../components/BConfirmModal";
import { Link, useNavigate } from "react-router-dom";
import {
  CREATE_CORPORATION,
  CREATE_INDIVIDUAL_OWNER_TYPE,
  NEWMED_CASE_TYPE,
  PAYEE_CASE_TYPE,
  RENMED_CASE_TYPE,
  RETMED_CASE_TYPE,
  STOMED_CASE_TYPE,
  TERMED_CASE_TYPE,
  UPDADRMED_CASE_TYPE,
  UPDATE_CORPORATION_DETAILS,
  UPDATE_INDIVIDUAL_OWNER_DETAILS,
  UPDATE_MEDALLION_TYPE,
} from "../../utils/constants";
import {
  useCreateCaseMutation,
  useLazyExportMedallionsOwnerQuery,
  useLazyExportMedallionsQuery,
  useLazyOwnerListQuery,
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
  capitalizeWords,
  filterSelectGenerate,
  removeUnderScorefilterGenerate,
} from "../../utils/utils";
import { menuTemplate } from "../../utils/gridUtils";
import ExportBtn from "../../components/ExportBtn";
import { gridToolTipOptins } from "../../utils/tooltipUtils";
import GridShowingCount from "../../components/GridShowingCount";
import BModal from "../../components/BModal";
import MedallionListModal from "../newMedallion/MedallionListModal";
import { getLastFourDigits } from "../../utils/splitFileName";

const ManageOwner = () => {
  const [isOpen, setOpen] = useState(false);
  const navigate = useNavigate();
  const [triggerSearchQuery, { data: medallianOwnerData }] =
    useLazyOwnerListQuery();
  //   const [triggerSearchQuery, { data }] = useLazyOwnerListQuery({ skip: true })

  const [
    triggerSearchGetMedallionOwner,
    {
      data: medallianOwnerSearchData,
      isSuccess: isMedallionOwnerSearchSuccess,
    },
  ] = useLazyOwnerListQuery();

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
  const [triggerExport] = useLazyExportMedallionsOwnerQuery();
  const filterVar = {
    owner_name: {
      value: "",
      matchMode: "customFilter",
      label: "Management Name",
      data: [],
      formatType: "Search",
    },
    holding_company_name: {
      value: "",
      matchMode: "customFilter",
      label: "Holding Company",
      data: [],
      formatType: "Search",
    },
    ssn: {
      value: "",
      matchMode: "customFilter",
      label: "SSN",
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
    entity_type: {
      value: "",
      matchMode: "customFilter",
      label: "Owner Type",
      data: filterSelectGenerate(["individual", "corporation"]),
      formatType: "select",
    },
    contact_number: {
      value: "",
      matchMode: "customFilter",
      label: "Contact Number",
      data: [],
      formatType: "Search",
    },
    email_address: {
      value: "",
      matchMode: "customFilter",
      label: "Email Address",
      data: [],
      formatType: "Search",
    },
    is_holding_entity: {
      value: "",
      matchMode: "customFilter",
      label: "Is Holding Company",
      data: filterSelectGenerate(["Yes", "No"]),
      formatType: "select",
    },
  };
  const [filterData, setFilterData] = useState(filterVar);
  useEffect(() => {
    if (medallianOwnerData) {
      console.log("isMedallionOwnerSearchSuccess");
      setFilterData((prev) => {
        return {
          ...prev,
          medallion_status: {
            ...prev["medallion_status"],
            data: removeUnderScorefilterGenerate(
              medallianOwnerData?.medallion_status_list
            ),
          },
          medallion_type: {
            ...prev["medallion_type"],
            data: filterSelectGenerate(medallianOwnerData?.medallion_type_list),
          },
        };
      });
    }
  }, [medallianOwnerData]);

  const [flow, setFlow] = useState("");
  const columns = [
    {
      field: "owner_name",
      header: "Management Name",
      dataTestId: "medallionNumberHeader",
      sortable: true,
      headerAlign: "left",
      bodyAlign: "left",
      filter: true,
    },
    {
      field: "holding_company_name",
      header: "Holding Company",
      dataTestId: "holdingCompanyHeader",
      headerAlign: "left",
      sortable: true,
      filter: true,
    },
    {
      field: "ssn",
      header: "SSN",
      dataTestId: "statusHeader",
      headerAlign: "left",
      sortable: true,
      filter: true,
    },
    {
      field: "ein",
      header: "EIN",
      dataTestId: "statusHeader",
      headerAlign: "left",
      sortable: true,
      filter: true,
    },
    {
      field: "entity_type",
      header: "Owner Type",
      dataTestId: "medallionTypeHeader",
      sortable: true,
      filter: true,
    },
    {
      field: "contact_number",
      header: "Phone",
      dataTestId: "createOnHeader",
      sortable: true,
      filter: true,
    },
    {
      field: "email_address",
      header: "Email",
      dataTestId: "createOnHeader",
      sortable: true,
      filter: true,
    },
    {
      field: "is_holding_entity",
      header: "Is Holding Company",
      dataTestId: "isHoldingCompanyHeader",
      sortable: true,
      filter: true,
    },
    { field: "m_status", header: "Actions", dataTestId: "actionsHeader" },
    { field: "options", header: "", dataTestId: "optionsHeader" },
  ];
  const menu = useRef(null);
  const [visibleColumns, setVisibleColumns] = useState({
    owner_name: true,
    holding_company_name: true,
    ssn: true,
    ein: true,
    entity_type: true,
    contact_number: true,
    email_address: true,
    renewal_date: true,
    validity_end_date: false,
    lease_expiry_date: false,
    m_status: true,
    medallion_owner: false,
    options: true,
    is_holding_entity: false,
  });

  const searchData = (type, value) => {
    const queryParams = new URLSearchParams({
      page: 1,
      per_page: 5,
    });

    if (type.field === "owner_name") {
      queryParams.append("medallion_owner_name", value);
    }

    if (type.field === "holding_company_name") {
      queryParams.append("holding_entity", value);
    }

    if (type.field === "medallion_owner") {
      queryParams.append("medallion_owner", value);
    }

    if (type.field === "ein") {
      queryParams.append("ein", value);
    }

    if (type.field === "ssn") {
      queryParams.append("ssn", value);
    }
    if (type.field === "email_address") {
      queryParams.append("email", value);
    }
    if (type.field === "contact_number") {
      queryParams.append("contact_number", value);
    }

    setFilterSearchBy(type.field);
    triggerSearchGetMedallionOwner(`?${queryParams?.toString()}`);
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

    console.log("yyyy medallion", medallion);
    dispatch(
      setSelectedMedallion({
        object_lookup: medallion.medallion_owner_id,
        object_name: "medallion_owner",
        ...medallion,
      })
    );
  };

  //created a new function object_name changed from "medallion_owner" to "Medallion_Owner" to avoid impact on others
  const handleSelectOwner = (medallion) => {
    // dispatch(setSelectedMedallion(medallion));
    console.log("yyyy medallion", medallion);
    dispatch(
      setSelectedMedallion({
        object_lookup: medallion.medallion_owner_id,
        object_name: "Medallion_Owner",
        ...medallion,
      })
    );
  };

  const menuRefs = useRef({});
  const [createCase, { data, isSuccess }] = useCreateCaseMutation();

  const createNewCase = (caseType) => {
    setCurrentCaseType(caseType);
    createCase(caseType);
  };

  const sortFieldMapping = {
    owner_name: "medallion_owner_name",
    holding_company_name: "holding_entity",
    medallion_status: "medallion_status",
    medallion_type: "medallion_type",
    validity_end_date: "renewal_date",
    lease_expiry_date: "lease_expiry",
    contact_number: "contact_number",
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

  useEffect(() => {
    triggerSearch({ page: 1, limit: 5 });
  }, []);

  const onPageChange = (data) => {
    setPage(Number(data.page) + 1);
    setRows(data.rows);
    triggerSearch({ page: Number(data.page) + 1, limit: data.rows });
  };

  const handleSearchItemChange = (newItems) => {
    setSearchFilterData((prev) => ({
      ...prev,
      [filterSearchBy]: newItems, // dynamic key from filterSearchBy
    }));
  };

  useEffect(() => {
    if (medallianOwnerData) {
      console.log("Medallion owner data", medallianOwnerData?.items);
      setMedallions(medallianOwnerData?.items);
    }
  }, [medallianOwnerData]);

  useEffect(() => {
    if (medallianOwnerSearchData) {
      if (filterSearchBy === "owner_name") {
        const data = medallianOwnerSearchData.items.map((item) => ({
          name: item["owner_name"],
          id: item.id,
        }));
        handleSearchItemChange(data);
      }
      if (filterSearchBy === "holding_company_name") {
        const data = medallianOwnerSearchData.items.map((item) => ({
          name: item["parent_corporation_name"],
          id: item.id,
        }));
        handleSearchItemChange(data);
      }
      if (filterSearchBy === "ssn") {
        const data = medallianOwnerSearchData.items.map((item) => ({
          name: item["ssn"],
          id: item.id,
        }));
        handleSearchItemChange(data);
      }
      if (filterSearchBy === "ein") {
        const data = medallianOwnerSearchData.items.map((item) => ({
          name: item["ein"],
          id: item.id,
        }));
        handleSearchItemChange(data);
      }
      if (filterSearchBy === "entity_name") {
        const data = medallianOwnerSearchData.items.map((item) => ({
          name: item["entity_name"],
          id: item.id,
        }));
        handleSearchItemChange(data);
      }
      if (filterSearchBy === "contact_number") {
        const data = medallianOwnerSearchData.items.map((item) => ({
          name: item["contact_number"],
          id: item.id,
        }));
        handleSearchItemChange(data);
      }
      if (filterSearchBy === "email_address") {
        const data = medallianOwnerSearchData.items.map((item) => ({
          name: item["email_address"],
          id: item.id,
        }));
        handleSearchItemChange(data);
      }
    }
  }, [medallianOwnerSearchData]);

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
      owner_name: "medallion_owner_name",
      holding_company_name: "holding_entity",
      medallion_status: "medallion_status",
      medallion_type: "medallion_type",
      ssn: "ssn",
      ein: "ein",
      validity_end_date: ["renewal_date_from", "renewal_date_to"],
      contact: ["medallion_created_from", "medallion_created_to"],
      medallion_owner: "medallion_owner",
      lease_expiry_date: ["lease_expiry_from", "lease_expiry_to"],
      entity_type: "entity_type",
      email_address: "email",
      contact_number: "contact_number",
      is_holding_entity: "is_holding_entity",
    };

    const fieldKey = fieldMapping[option.field];

    console.log(fieldKey);
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
          if (fieldKey === "entity_type") {
            let value = data?.name || data;
            if (value?.toLowerCase() === "corporation") {
              value = "C";
            } else if (value?.toLowerCase() === "individual") {
              value = "I";
            }

            updatedFilterApplyList.set("owner_type", value);
          } else if (fieldKey === "is_holding_entity") {
            let value = data?.name || data;
            if (value?.toLowerCase() === "yes") {
              value = true;
            } else if (value?.toLowerCase() === "no") {
              value = false;
            }

            updatedFilterApplyList.set("is_holding_entity", value);
          } else {
            updatedFilterApplyList.set(fieldKey, data.name || data);
          }
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
  const individualOwner = 10000000;
  const corporateOwner = 10000000;
  const isMedallionClickable = (data) => {
    if (data?.entity_type === "individual") {
      if (data?.additional_info?.medallions.length >= individualOwner) {
        return false;
      }
      return true;
    }
    if (data?.entity_type === "corporation") {
      if (data?.additional_info?.medallions.length >= corporateOwner) {
        return false;
      }
      return true;
    }
    return true;
  };
  const processFlowFunc = (data) => {
    // entity_type: "individual" "corporation"
    // if(data?.entity_type==="individual"){
    //    if(data?.additional_info?.medallions.length>=individualOwner){
    //     return
    //    }
    //    return (processFlow({
    //     params: params["caseId"]
    //     , data: { step_id: CHOOSE_INDIVIDUAL_OWNER, data: { medallionOwnerId: data.medallion_owner_id?.toString() } }
    //   }))
    // }
    // if(data?.entity_type==="corporation"){
    //    if(data?.additional_info?.medallions.length>=corporateOwner){
    //     return
    //    }
    //    return (processFlow({
    //     params: params["caseId"]
    //     , data: { step_id: CHOOSE_INDIVIDUAL_OWNER, data: { medallionOwnerId: data.medallion_owner_id?.toString() } }
    //   }))
    // }
    // return (processFlow({
    //   params: params["caseId"]
    //   , data: { step_id: CHOOSE_INDIVIDUAL_OWNER, data: { medallionOwnerId: data.medallion_owner_id?.toString() } }
    // }))
  };
  const customRender = (column, rowData) => {
    if (column.field === "owner_name") {
      return (
        <div>
          <div
            className="d-flex flex-row align-items-center"
            style={{ color: "#1056EF", cursor: "pointer" }}
            data-testid="grid-driver-id"
            onClick={() => {
              navigate(`/manage-owner/view/${rowData?.medallion_owner_id}`, {
                state: rowData?.medallion_owner_id,
              });
            }}
          >
            {/* {rowData?.entity_type === "individual" ? (
              <Img className="individual"></Img>
            ) : (
              <Img name="corporation_entity"></Img>
            )} */}

            <p class="ms-2 regular-semibold-text">{rowData?.owner_name}</p>
          </div>
          {/* <p className="fst-italic" data-testid="grid-medallion-owner">
            {rowData.medallion_owner}
          </p> */}
        </div>
      );
    } else if (column.field === "holding_company_name") {
      return (
        <p data-testid="grid-holding-company-name">
          {rowData?.parent_corporation_name || "-"}
        </p>
      );
    } else if (column.field === "ssn") {
      return <p data-testid="grid-ssn">{rowData?.ssn}</p>;
    } else if (column.field === "ein") {
      return <p data-testid="grid-ein">{rowData?.ein}</p>;
    } else if (column.field === "is_holding_entity") {
      return (
        <p data-testid="grid-is-holding-company">
          {rowData?.entity_type === "corporation"
            ? rowData?.is_holding_entity
              ? "Yes"
              : "No"
            : "-"}
        </p>
      );
    } else if (column.field === "entity_type") {
      return (
        <p data-testid="grid-entity-type">
          {capitalizeWords(rowData?.entity_type)}
        </p>
      );
    } else if (column.field === "identifier") {
      return <p data-testid="grid-medallion-status">{rowData?.identifier}</p>;
    } else if (column.field === "validity_end_date") {
      return (
        <p data-testid="grid-medallion-validity-end-date">
          {dateMonthYear(rowData?.validity_end_date)}
        </p>
      );
    } else if (column.field === "contact_number") {
      return (
        <p data-testid="grid-contact-number-value">{rowData?.contact_number}</p>
      );
    } else if (column.field === "email_address") {
      return <p data-testid="grid-email-value">{rowData?.email_address}</p>;
    } else if (column.field === "lease_expiry_date") {
      return (
        <p data-testid="grid-lease-expiry-date">
          {dateMonthYear(rowData?.lease_expiry_date)}
        </p>
      );
    } else if (column.field === "options") {
      const menuKey = rowData.medallion_owner_id;
      if (!menuRefs.current[menuKey]) {
        menuRefs.current[menuKey] = React.createRef();
      }

      const menuItems = [
        {
          label: "New Medallion",
          command: () => newMedallion(rowData),
          dataTestId: "new-medallion",
          template: menuTemplate,
        },
        // {
        //   label: "Update Owner Address",
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
          label: "Update Owner Details",
          command: () => onUpdateOwnerDetails(rowData),
          dataTestId: "update-owner-details",
          template: menuTemplate,
        },
      ];

      const newMedallion = (rowData) => {
        handleSelectMedallion(rowData);
        setFlow(NEWMED_CASE_TYPE);
        setConfirmationTitle("Confirmation on New Medallion");
        setConfirmationMessage(
          `This will create a new case for a medallion. Are you sure to proceed?`
        );
        setOpen(true);
      };
      // const onUpdateMOAddress = (rowData) => {
      //   handleSelectMedallion(rowData);
      //   console.log("rowData", rowData);
      //   setFlow("UPDATE_ADDRESS");
      //   setConfirmationTitle("Confirmation on Owner Address Update");
      //   setConfirmationMessage(
      //     `This will create a new address updating case for owner <strong>${rowData?.entity_name}</strong>.<br>Are you sure to proceed?`
      //   );
      //   setOpen(true);
      // };
      // const onUpdatePayee = (rowData) => {
      //   handleSelectMedallion(rowData);
      //   setFlow(PAYEE_CASE_TYPE);
      //   setConfirmationTitle("Confirmation on Payee");
      //   setConfirmationMessage(
      //     `This will create a new renewal case for the medallion <strong>${rowData.owner_name}</strong>.<br>Are you sure to proceed?`
      //   );
      //   setOpen(true);
      // };
      const onUpdateOwnerDetails = (rowData) => {
        console.log("Row data", rowData);
        handleSelectOwner(rowData);
        if (rowData?.entity_type?.toLowerCase() === "individual") {
          setFlow(UPDATE_INDIVIDUAL_OWNER_DETAILS);
        } else if (rowData?.entity_type?.toLowerCase() === "corporation") {
          setFlow(UPDATE_CORPORATION_DETAILS);
        }

        setConfirmationTitle("Confirmation Owner Details Update");
        setConfirmationMessage(
          `This will create a new update case for the medallion owner <strong>${rowData.owner_name}</strong>.<br>Are you sure to proceed?`
        );
        setOpen(true);
      };

      return (
        <div className="d-flex align-items-center">
          {/* <Button
            className="manage-table-action-svg"
            {...gridToolTipOptins("Delete")}
            data-testid="trash-icon"
            icon={() => <Img name="trash" />}
            onClick={() => handleDeactivate([rowData])}
          ></Button> */}
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
          {
            <BModal>
              <BModal.ToggleButton>
                <div
                  data-testid="owner-grid-modal-btn"
                  className="d-flex align-items-center gap-1 btn border-0 p-0"
                >
                  {rowData.added}
                  <div
                    data-testid={`medallion-grid-status-${rowData.contact_number}`}
                    className="manage-table-action-svg btn border-0 p-0 d-flex align-items-center justify-content-center gap-2"
                  >
                    {rowData?.additional_info?.medallions.length}
                    {rowData?.additional_info?.medallions.length ? (
                      isMedallionClickable(rowData) ? (
                        <Img name="medallian_success" />
                      ) : (
                        <div className="medallion_grey">
                          <Img name="medallian_success" />
                        </div>
                      )
                    ) : (
                      <Button
                        className="manage-table-action-svg"
                        data-testid="unavailable_medallion"
                        icon={<Img name="add_medallion" />}
                        disabled={true}
                      ></Button>
                    )}
                  </div>
                  {/* <div
                    type="button"
                    data-testid="medallion-grid-doc"
                    className="btn p-0 border-0 d-flex align-items-center justify-content-center gap-2"
                  ></div> */}
                </div>
              </BModal.ToggleButton>
              <BModal.Content>
                <MedallionListModal
                  data={rowData}
                  processFlowFunc={processFlowFunc}
                  isMedallionClickable={isMedallionClickable(rowData)}
                />
              </BModal.Content>
            </BModal>
          }
          {rowData.is_documents ? (
            <Link
              className="manage-table-action-svg d-flex align-items-center"
              to={`doc-viewer/${rowData.medallion_owner_id}`}
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
          {/* <BAuditTrailManageModal
            data={`?medallion_id=${rowData?.medallion_id}`}
            title="Medallion Audit Trail History"
          /> */}
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
        <Link to={`/manage-owner`} className="font-semibold text-black">
          Manage Owner
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
      (item) => item.owner_name
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

  // const [createCase, { data, error, isSuccess, isError }] = useCreateCaseMutation();
  // const [moveCase] = useMoveCaseDetailMutation();
  const moveCaseTrigger = (caseType) => {
    // handleSelectMedallion(rowData);
    if (caseType == CREATE_INDIVIDUAL_OWNER_TYPE) {
      setConfirmationTitle("Confirmation on Create Individual Owner");
      setConfirmationMessage(
        `This will create a new case for a Individual Owner. Are you sure to proceed?`
      );
      setOpen(true);
    } else if (caseType == CREATE_CORPORATION) {
      setConfirmationTitle("Confirmation on Create Corporation");
      setConfirmationMessage(
        `This will create a new case for a Corporation. Are you sure to proceed?`
      );
      setOpen(true);
    }
    setFlow(caseType);

    // createNewCase(caseType)
    // processFlow({
    //     params: params["case-id"]
    //     , data: { }
    //   }).unwrap().then(()=>{
    //   })
    //  return moveCase({ params: params["case-id"], stepId });
  };

  return (
    <div className="common-layout w-100 h-100 d-flex flex-column manage-medallian">
      <BBreadCrumb breadcrumbItems={breadcrumbItems} separator="/" />
      <div className="header">
        <div className="left-content">
          <h3 className="topic-txt">Manage Owner</h3>
          {/* <p className="regular-text text-grey">
            Showing {rows<medallianOwnerData?.total_items?rows:medallianOwnerData?.total_items} of {medallianOwnerData?.total_items} Lists...{" "}
          </p> */}
          <GridShowingCount
            rows={medallions?.length || 0}
            total={medallianOwnerData?.total_items}
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
          {/* <Divider layout="vertical" />
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
          ></Button> */}
          <Divider layout="vertical" />
          <Button
            data-testid="refresh_btn"
            className="manage-table-action-svg"
            icon={() => <Img name={"refresh"} />}
            onClick={refreshFunc}
          ></Button>
        </div>
      </div>
      <div className="d-flex gap-3 justify-content-end ">
        <Button
          label="Create Individual"
          //  icon={()=><Img name="add"></Img>}
          className="text-nowrap w-max-content d-flex align-items-center gap-2"
          onClick={() => moveCaseTrigger(CREATE_INDIVIDUAL_OWNER_TYPE)}
        ></Button>
        <Button
          label="Create Corporation"
          //  icon={()=><Img name="add"></Img>}
          className="text-nowrap w-max-content d-flex align-items-center gap-2"
          onClick={() => moveCaseTrigger(CREATE_CORPORATION)}
        ></Button>
        <div className="d-flex justify-content-end align-items-center ">
          <span className="fw-bold">Export as:</span>
          <ExportBtn
            {...{
              sortFieldMapping,
              sortField,
              sortOrder,
              triggerExport,
              filterApplyList,
              fileName: `medallion_owner_`,
            }}
          ></ExportBtn>
        </div>
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
        totalRecords={medallianOwnerData?.total_items}
        dataKey="medallion_owner_id"
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
          } else if (flow === CREATE_INDIVIDUAL_OWNER_TYPE) {
            createNewCase(CREATE_INDIVIDUAL_OWNER_TYPE);
          } else if (flow === CREATE_CORPORATION) {
            createNewCase(CREATE_CORPORATION);
          } else if (flow === UPDATE_CORPORATION_DETAILS) {
            createNewCase(UPDATE_CORPORATION_DETAILS);
          } else if (flow === UPDATE_INDIVIDUAL_OWNER_DETAILS) {
            createNewCase(UPDATE_INDIVIDUAL_OWNER_DETAILS);
          } else if (flow === NEWMED_CASE_TYPE) {
            createNewCase(NEWMED_CASE_TYPE);
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

export default ManageOwner;
