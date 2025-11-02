import { BreadCrumb } from "primereact/breadcrumb";
import { Button } from "primereact/button";
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Img from "../../components/Img";
import { Menu } from "primereact/menu";
import { useCreateCaseMutation } from "../../redux/api/medallionApi";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedMedallion } from "../../redux/slice/selectedMedallionDetail";
import {
  ADDITIONAL_DRIVER_TYPE,
  DRIVER_TLC_LICENSE_TYPE,
  DRIVER_UPDATE_ADDRESS,
  NEW_LEASE_TYPE,
  RENEW_LEASE_TYPE,
} from "../../utils/constants";
import BConfirmModal from "../../components/BConfirmModal";
import { useRemoveAdditionalDriverMutation } from "../../redux/api/driverApi";
import BExpandableTable from "../../components/BExpandableTable";
import { Badge } from "primereact/badge";
import { Checkbox } from "primereact/checkbox";
import { Divider } from "primereact/divider";
import { Dialog } from "primereact/dialog";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import {
  leaseApi,
  useLazyExportLeaseQuery,
  useLazyGetLeaseQuery,
  useGetViewLeaseScheduleQuery,
} from "../../redux/api/leaseApi";
import { menuTemplate } from "../../utils/gridUtils";
import { generateFieldObject } from "../../utils/generateFieldObject";
import { dateMonthYear, yearMonthDate } from "../../utils/dateConverter";
import ExportBtn from "../../components/ExportBtn";
import GridShowingCount from "../../components/GridShowingCount";
import {
  filterSelectGenerate,
  filterSelectGenerateLeaseTable,
  maskSSN,
  removeHypenBetweenWords,
  removeUnderScorefilterGenerate,
} from "../../utils/utils";
import RemoveAdditionalDriverModal from "./RemoveAdditionalDriverModal";
import PdfViewModal from "../../components/PdfViewModal";
import BAuditTrailManageModal from "../../components/BAuditTrailManageModal";

const ManageLease = () => {
  const menuRefs = useRef({});
  const navigate = useNavigate();
  const [isOpen, setOpen] = useState(false);
  const [isRemoveModalOpen, setRemoveModalOpen] = useState(false);
  const [flow, setFlow] = useState("");
  const dispatch = useDispatch();
  const [filterApplyList, setFilterApplyList] = useState(new Map());
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState(1);
  const [searchFilterData, setSearchFilterData] = useState({});
  const [filterSearchBy, setFilterSearchBy] = useState("");
  const [vehicles, setVehicles] = useState([]);
  const items = [
    {
      label: "Demo",
      template: () => (
        <Link to="/" className="font-semibold text-grey">
          {" "}
          Home{" "}
        </Link>
      ),
    },
    {
      label: "Demo",
      template: () => (
        <Link to="/manage-lease" className="font-semibold text-grey">
          {" "}
          Lease{" "}
        </Link>
      ),
    },
    {
      label: "Demo",
      template: () => (
        <Link to={`/manage-lease`} className="font-semibold text-black">
          Manage Lease
        </Link>
      ),
    },
  ];
  const [selectedProducts, setSelectedProducts] = useState(null);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [confirmationTitle, setConfirmationTitle] = useState("");
  const [currentCaseType, setCurrentCaseType] = useState("");
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedLeaseId, setSelectedLeaseId] = useState(null);
  // const [removeAddDriverAPI, { isSuccess: removeDriverIsSuccess }] =
  //   useRemoveAdditionalDriverMutation();
  const [
    triggerSearchQuery,
    { data: leaseDetail, isSuccess: leaseApiCallSucess },
  ] = useLazyGetLeaseQuery();
  const [triggerSearchFilterQuery, { data: leaseSearchFilterDetail }] =
    useLazyGetLeaseQuery();
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewDocInfo, setPreviewDocInfo] = useState({
    title: "",
    previewUrl: null,
    downloadUrl: null,
    downloadName: "",
    extension: "",
  });

  const { data: leaseSchedule } = useGetViewLeaseScheduleQuery(
    selectedLeaseId,
    {
      skip: !selectedLeaseId,
    }
  );
  console.log(
    "leaseDetail?.lease_types",
    removeUnderScorefilterGenerate(leaseDetail?.lease_types)
  );

  const leaseId = "lease_id";
  const medallionNumber = "medallion_no";
  const driverName = "driver_name";
  const vinNumber = "vin_no";
  const vehiclePlateNumber = "plate_no";
  const leaseDate = "lease_date";
  const leaseType = "lease_type";
  const leaseExpiry = "lease_expiry";
  const lastRenewedDate = "last_renewed_date";
  // const leaseSegment = "lease_segment";
  const shiftType = "shift_type";
  const actions = "m_status";
  const options = "options";
  const leaseStatus = "lease_status";
  const leaseAmount = "lease_amount";
  const tlcLicenseNumber = "tlc_number";
  const fields = [
    { key: leaseId, label: "Lease ID", formatType: "Search" },
    {
      key: leaseType,
      label: "Lease Type",
      formatType: "select",
    },
    {
      key: shiftType,
      label: "Shift",
      formatType: "",
      sortable: false,
      filter: false,
    },
    { key: leaseStatus, label: "Lease Status", formatType: "select" },
    { key: driverName, label: "Driver Name", formatType: "Search" },
    {
      key: tlcLicenseNumber,
      label: "TLC Number",
      formatType: "Search",
    },
    { key: medallionNumber, label: "Medallion No", formatType: "Search" },
    { key: vinNumber, label: "VIN No", formatType: "Search" },
    {
      key: vehiclePlateNumber,
      label: "Vehicle Plate No",
      formatType: "Search",
    },
    // { key: leaseDate, label: "Lease Date", formatType: "date" },
    // { key: leaseType, label: "Lease Type", formatType: "Search" },
    // { key: leaseExpiry, label: "Lease Expiry", formatType: "date" },
    // { key: lastRenewedDate, label: "Last Renewed", formatType: "date" },
    // {
    //   key: leaseSegment,
    //   label: "Segment",
    //   formatType: "",
    //   sortable: false,
    //   filter: false,
    // },
    // { key: leaseDate, label: "Lease Date", formatType: "date" },
    { key: leaseDate, label: "Lease Period", formatType: "date" },
    { key: leaseAmount, label: "Lease Amount", formatType: "Search" },
    {
      key: actions,
      label: "Actions",
      formatType: "",
      sortable: false,
      filter: false,
    },
    { key: options, label: "", formatType: "", sortable: false, filter: false },
  ];

  const { sortFieldMapping, columns, filterVar, visibleColumns } =
    generateFieldObject(fields);

  // Override lease_date sorting to use lease_end_date
  sortFieldMapping[leaseDate] = "lease_end_date";
  const [visibleColumnsState, setVisibleColumnsState] = useState({
    ...visibleColumns,
  });

  const [filterData, setFilterData] = useState(filterVar);
  console.log("🚀 ~ ManageLease ~ filterData:", filterData);

  const selectedMedallionDetail = useSelector(
    (state) => state.medallion.selectedMedallionDetail
  );
  useEffect(() => {
    if (leaseApiCallSucess) {
      setFilterData((prev) => {
        return {
          ...prev,
          lease_type: {
            ...prev["lease_type"],
            data: filterSelectGenerateLeaseTable(leaseDetail?.lease_types),
          },
          lease_status: {
            ...prev["lease_status"],
            data: filterSelectGenerate(leaseDetail?.lease_statuses),
          },
        };
      });
    }
  }, [leaseDetail?.lease_types, leaseApiCallSucess]);
  const handleSelectMedallion = (data) => {
    dispatch(
      setSelectedMedallion({
        object_lookup: data.lease_id,
        object_name: "lease",
        ...data,
      })
    );
  };
  const handleRemoveAdditionalDriver = (data) => {
    dispatch(
      setSelectedMedallion({
        object_lookup: data.driver_lease_id,
        object_name: "lease",
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
      const path = `/manage-lease/case/${currentCaseType}/${data.case_no}`;
      navigate(path);
    }
  }, [isSuccess]);

  const handleDeactivate = () => {
    // setCurrentMedallionToDeactivate(medallions)
    // setFlow("DELETE")
    // setConfirmationTitle('Confirmation on Delete Medallion');
    // setConfirmationMessage(`Are you sure to delete the selected Medallion?`);
    // setOpen(true)
  };

  const addAdditionalDriver = (rowData) => {
    setFlow(ADDITIONAL_DRIVER_TYPE);
    handleSelectMedallion(rowData);
    setConfirmationTitle("Confirmation on Additional Driver");
    setConfirmationMessage(
      `This will create a new case for Additional Driver.   Are you sure to proceed?`
    );
    setOpen(true);
  };

  const viewLeaseSchedule = (rowData) => {
    setSelectedLeaseId(rowData?.lease_id);
    setShowScheduleModal(true);
  };

  const customRender = (column, rowData, onCellClick) => {
    const leaseCaseDetailStatus = rowData?.case_detail;
    console.log("leaseCaseDetailStatus", leaseCaseDetailStatus);
    if (column.field === "lease_id") {
      return (
        <p
          className="text-blue regular-semibold-text"
          style={{ cursor: "pointer" }}
          onClick={() => {
            {
              leaseCaseDetailStatus?.case_status === "In Progress"
                ? navigate(`/new-lease/${leaseCaseDetailStatus.case_no}`)
                : navigate(`/manage-lease/view`, { state: rowData?.lease_id });
            }
          }}
        >
          {" "}
          {rowData?.lease_id}
        </p>
      );
    } else if (column.field === "medallion_no") {
      return <p>{rowData?.medallion_number}</p>;
    } else if (column.field === "lease_status") {
      return <p>{rowData?.lease_status || "-"}</p>;
    } else if (column.field === "driver_name") {
      // const driver = rowData?.driver?.filter((item) => item.is_driver_manager);
      const driver = rowData?.driver?.filter(
        (item) => !item.is_additional_driver
      );
      const addDriver = rowData?.driver?.filter(
        (item) => item.is_additional_driver
      );
      console.log("🚀 ~ customRender ~ addDriver:", driver, addDriver);
      return (
        <div className="step-menu">
          <p onClick={() => addDriver.length && onCellClick()}>
            {driver[0]?.driver_name}
            {addDriver.length ? (
              <span className="d-inline-flex align-items-center justify-content-center rounded-circle current-step ">
                +{addDriver.length}
              </span>
            ) : null}
          </p>
        </div>
      );
    } else if (column.field === "vin_no") {
      return <p>{rowData?.vehicle_vin_number}</p>;
    } else if (column.field === "plate_no") {
      return <p>{rowData?.vehicle_plate_number}</p>;
    } else if (column.field === "lease_date") {
      return (
        <p>
          {dateMonthYear(rowData?.lease_date)} -
          {dateMonthYear(rowData?.lease_end_date)}
        </p>
      );
    } else if (column.field === "lease_amount") {
      return (
        <p>{rowData?.lease_amount ? `$ ${rowData?.lease_amount}` : "-"}</p>
      );
    } else if (column.field === "lease_type") {
      return (
        <p>
          {rowData?.lease_amount
            ? removeHypenBetweenWords(rowData?.lease_type)
            : "-"}
        </p>
      );
    } else if (column.field === "lease_expiry") {
      return <p>{dateMonthYear(rowData?.lease_end_date)}</p>;
    } else if (column.field === "last_renewed_date") {
      return <p>{dateMonthYear(rowData?.last_renewed_date)}</p>;
    }
    // else if (column.field === "lease_segment") {
    //   // Only show segment info for leases with segment tracking
    //   if (rowData?.current_segment) {
    //     // For DOV leases, show "X/Y", for others just show "X"
    //     const segmentText = rowData?.total_segments
    //       ? `${rowData?.current_segment}/${rowData?.total_segments}`
    //       : `${rowData?.current_segment}`;
    //     return (
    //       <p
    //         className="text-blue regular-semibold-text"
    //         style={{ cursor: "pointer" }}
    //         onClick={() => {
    //           setSelectedLeaseId(rowData?.lease_id);
    //           setShowScheduleModal(true);
    //         }}
    //       >
    //         {segmentText}
    //       </p>
    //     );
    //   }
    //   return <p>-</p>;
    // }
    else if (column.field === "shift_type") {
      // Only show shift info for shift-lease types
      return <p>{rowData?.shift_type || "-"}</p>;
    } else if (column.field === "tlc_number") {
      // const driverManager = rowData?.driver?.find((d) => d.is_driver_manager);
      const driverManager = rowData?.driver?.find(
        (d) => !d.is_additional_driver
      );
      return (
        <p>{driverManager ? driverManager?.tlc_license_no || "-" : "-"}</p>
      );
    } else if (column.field === "options") {
      // const menuKey = rowData?.medallion_number;
      const menuKey = rowData?.lease_id_pk;
      if (!menuRefs.current[menuKey]) {
        menuRefs.current[menuKey] = React.createRef();
      }

      // const menuItems = [
      //   // {
      //   //   label: "Renew Lease",
      //   //   command: () => renewLease(rowData),
      //   //   dataTestId: "renew-lease",
      //   //   template: menuTemplate,
      //   // },
      // ];
      const menuItems = [
        {
          label: "View Lease Schedule",
          command: () => viewLeaseSchedule(rowData),
          dataTestId: "view-lease-schedule",
          template: menuTemplate,
        },
      ];
      if (
        rowData?.lease_type !== "shift-lease" &&
        rowData?.lease_status === "Active"
      ) {
        menuItems.push({
          label: "Add Additional Driver",
          command: () => addAdditionalDriver(rowData),
          dataTestId: "additional-driver",
          template: menuTemplate,
          disabled: leaseCaseDetailStatus?.case_status === "In Progress",
        });
      }

      const renewLease = (rowData) => {
        setFlow(RENEW_LEASE_TYPE);
        handleSelectMedallion(rowData);
        setConfirmationTitle("Confirmation on Renew Lease");
        setConfirmationMessage(
          `This will create a New Lease Renewal case for Lease ID: ${rowData?.lease_id}. Are you sure to proceed?`
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
          {/* <Button
            icon={() => <Img name="trash" />}
            onClick={() => handleDeactivate([rowData])}
          ></Button> */}
          <div>
            <Menu model={menuItems} popup ref={menuRefs.current[menuKey]} />
            <button
              className="three-dot-mennu btn border-0"
              data-testid="three-dot-menu"
              onClick={(e) => menuRefs.current[menuKey].current.toggle(e)}
            >
              <Img name="three_dots_vertival" />
            </button>
          </div>
        </div>
      );
    } else if (column.field === "m_status") {
      // const driver = rowData?.driver?.filter((item) => item.is_driver_manager);
      const driver = rowData?.driver?.filter(
        (item) => !item?.is_additional_driver
      );
      return (
        <div className="d-flex align-items-center gap-2">
          {rowData?.has_documents ? (
            <Button
              icon={() => <Img name="ic_pdf_active" />}
              data-testid="ic_pdf_active"
              onClick={() =>
                navigate(
                  `/manage-lease/doc-viewer/${rowData?.lease_id}/${driver[0]?.driver_id}`
                )
              }
            ></Button>
          ) : (
            <Button
              data-testid="pdf_inactive"
              icon={() => <Img name="pdf_inactive" />}
            ></Button>
          )}
          <BAuditTrailManageModal
            data={`?lease_id=${rowData?.lease_id_pk}`}
            title="Lease Audit Trail History"
          />
          {/* <Button
            data-testid="audit_trail_success"
            icon={() => <Img name="audit_trail_success" />}
            // onClick={() =>
            //   navigate(`/manage-lease/doc-viewer/${rowData?.lease_id}`)
            // }
          ></Button> */}
        </div>
      );
    }
    return [column.field];
  };

  const [rows, setRows] = useState(5);
  const [page, setPage] = useState(1);

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
    triggerSearchQuery(`?${queryParams?.toString()}`);
  };

  const onPageChange = (data) => {
    setPage(Number(data.page) + 1);
    setRows(data.rows);
    triggerSearch({ page: Number(data.page) + 1, limit: data.rows });
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
  const updateFilter = (option, data = null, action = "add") => {
    const updatedFilterApplyList = new Map(filterApplyList);
    const fieldMapping = {
      [leaseId]: leaseId,
      [medallionNumber]: "medallion_no",
      [tlcLicenseNumber]: "tlc_number",
      [driverName]: "driver_name",
      [vinNumber]: "vin_no",
      [vehiclePlateNumber]: "plate_no",
      [leaseType]: "lease_type",
      [leaseStatus]: "status",
      [leaseAmount]: "lease_amount",
      [leaseDate]: ["lease_start_date", "lease_end_date"],
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
        // console.log("🚀 ~ updateFilter ~ fieldKey:", fieldKey,data.name, data)
        // updatedFilterApplyList.set(fieldKey, data.map(item => item.name).join(","));
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
    // console.log(updatedFilterApplyList);
    setFilterApplyList(updatedFilterApplyList);
  };

  const filterApply = (option, data) => {
    console.log("🚀 ~ filterApply ~ option, data:", option, data);
    if (data) {
      updateFilter(option, data, "add");
    }
  };

  useEffect(() => {
    triggerSearch({ page: 1, limit: rows });
  }, []);

  const refreshFunc = () => {
    triggerSearch({ page: page, limit: rows });
  };

  const handleSearchItemChange = (newItems) => {
    setSearchFilterData((prev) => ({
      ...prev,
      [filterSearchBy]: newItems,
    }));
  };

  useEffect(() => {
    if (leaseDetail) {
      setVehicles(leaseDetail.items);
    }
  }, [leaseDetail]);

  useEffect(() => {
    console.log("xxxleaseSearchFilterDetail", leaseSearchFilterDetail);
    if (leaseSearchFilterDetail) {
      if (filterSearchBy === leaseId) {
        console.log(
          "🚀 ~ useEffect ~ filterSearchBy === leaseId:",
          filterSearchBy === leaseId
        );
        const data = leaseSearchFilterDetail?.items.map((item) => ({
          name: item[leaseId],
          id: item.lease_id,
        }));
        handleSearchItemChange(data);
      }
      if (filterSearchBy === vinNumber) {
        const data = leaseSearchFilterDetail?.items.map((item) => ({
          name: item["vehicle_vin_number"],
          id: item.lease_id,
        }));
        handleSearchItemChange(data);
      }
      if (filterSearchBy === medallionNumber) {
        const data = leaseSearchFilterDetail?.items.map((item) => ({
          name: item["medallion_number"],
          id: item.lease_id,
        }));
        handleSearchItemChange(data);
      }
      if (filterSearchBy === tlcLicenseNumber) {
        const data = leaseSearchFilterDetail?.items.map((item) => ({
          name: item["driver"][0]?.tlc_license_no,
          id: item.lease_id,
        }));
        handleSearchItemChange(data);
      }
      if (filterSearchBy === driverName) {
        const data = leaseSearchFilterDetail?.items.map((item) => ({
          name: item["driver"][0]?.driver_name,
          id: item.lease_id,
        }));
        handleSearchItemChange(data);
      }
      if (filterSearchBy === vehiclePlateNumber) {
        const data = leaseSearchFilterDetail?.items.map((item) => ({
          name: item["vehicle_plate_number"],
          id: item.lease_id,
        }));
        handleSearchItemChange(data);
      }
      if (filterSearchBy === leaseAmount) {
        const data = leaseSearchFilterDetail?.items.map((item) => ({
          name: item["lease_amount"],
          id: item.lease_id,
        }));
        handleSearchItemChange(data);
      }
    }
  }, [leaseSearchFilterDetail]);

  const removeAdditionalDriver = (rowData) => {
    console.log("Remove Additional driver", rowData);
    // setFlow("remove_additional_driver");
    handleRemoveAdditionalDriver(rowData);
    setConfirmationTitle("Confirmation on Removing Additional Driver");
    // setConfirmationMessage(
    //   `This will create a new case for Removing Additional Driver ${rowData?.driver_id}.Are you sure to proceed?`
    // );
    setRemoveModalOpen(true);
  };

  // const rowExpansionTemplate = (data) => {
  //   const addDriver = data?.driver?.filter((item) => !item.is_driver_manager);
  //   return addDriver.map((item, idx) => {
  //     return (
  //       <div className="p-3 bg-light " key={idx}>
  //         <div className="d-flex align-items-start pb-4 justify-content-between">
  //           <div className="d-flex align-items-center ">
  //             <Img name="driver" className="icon-black" />
  //             <div className="ms-3">
  //               <h1 className="topic-txt mb-0">
  //                 {item.driver_name || "Andrew Maguire"}
  //               </h1>
  //               <p className="text-small">{"Additional Driver"}</p>
  //             </div>
  //           </div>
  //           <Button
  //             label="Remove Additional Driver"
  //             onClick={() =>
  //               removeAdditionalDriver({
  //                 ...item,
  //                 driver_lease_id: data.driver_lease_id,
  //               })
  //             }
  //             className="bg-transparent text-red p-0 regular-text"
  //           ></Button>
  //         </div>
  //         <div className="row border-bottom">
  //           <div className="col-3 d-flex align-items-center pb-4">
  //             <div className=" text-small w-50">Driver ID</div>
  //             <div className=" text-small fw-bold w-50">{item?.driver_id}</div>
  //           </div>
  //           <div className="col-3 d-flex align-items-center pb-4">
  //             <div className=" text-small w-50">TLC License No</div>
  //             <div className=" text-small fw-bold w-50">
  //               {item?.tlc_license_no}
  //             </div>
  //           </div>
  //           <div className="col-4 d-flex align-items-center pb-4">
  //             <div className="text-small w-50">DMV License No</div>
  //             <div className="text-small fw-bold  w-50">
  //               {item?.dmv_license_no}
  //             </div>
  //           </div>
  //           <div className="col-3 d-flex align-items-center pb-4">
  //             <div className="text-small w-50">SSN</div>
  //             <div className="text-small fw-bold  w-50">
  //               {maskSSN(item?.ssn)}
  //             </div>
  //           </div>
  //           <div className="col-3 d-flex align-items-center pb-4">
  //             <div className="text-small w-50">Contact No</div>
  //             <div className="text-small fw-bold  w-50">
  //               {item?.phone_number || "-"}
  //             </div>
  //           </div>
  //         </div>
  //       </div>
  //     );
  //   });
  // };

  const isDriverStatus = (additionalDriverData) => {
    if (additionalDriverData?.driver_status === "Inactive") {
      return false;
    } else if (
      additionalDriverData?.driver_status === "Active" ||
      additionalDriverData?.driver_status === "Registered"
    ) {
      return true;
    }
  };

  const handlePreviewForm = (item) => {
    console.log("handlePreviewForm", item);
    // const additionalDriverForm = {
    //   presigned_url:
    //     "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", // Placeholder URL
    //   document_name: `${item.driver_name || "driver"}_proof.pdf`, // Placeholder name
    // };

    setPreviewDocInfo({
      title: `Form for ${item?.driver_name}`,
      downloadUrl: item?.documents[0]?.presigned_url,
      downloadName: item?.documents[0]?.document_name?.split(".")?.join("."),
      extension: item?.documents[0]?.document_name?.split(".")?.pop(),
      previewUrl: item?.documents[0]?.presigned_url,
    });
    setIsPreviewModalOpen(true);
  };
  const handleUploadDocument = (lease_id, item) => {
    console.log("handleUploadDocument", item);
    navigate(`/manage-lease/doc-viewer/${lease_id}/${item?.driver_id}`);
  };
  const regenerateCase = (item) => {
    console.log("regenerateCase", item);
    navigate(`/case/ADDRI/${item?.case_detail?.case_no}`);
  };

  const subMenuRefs = useRef([]);
  const rowExpansionTemplate = (data) => {
    // const additionalDrivers =
    //   data?.driver?.filter((item) => !item.is_driver_manager) || [];
    const additionalDrivers =
      data?.driver?.filter((item) => item?.is_additional_driver) || [];
    console.log("🚀 ~ rowExpansionTemplate ~ data:", data, additionalDrivers);

    // For each row, we can create a ref to control its 3-dot menu

    return (
      <div className="p-3">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="fw-bold mb-0">
            Additional Drivers ({additionalDrivers.length})
          </h6>
          <Button
            label="+ Add Additional Driver"
            text
            className="p-0 text-primary fw-semibold"
            onClick={() => addAdditionalDriver(data)}
          />
        </div>

        {/* Driver List */}
        {additionalDrivers.map((item, idx) => (
          <div
            key={idx}
            className="d-flex align-items-center justify-content-between p-3 mb-2 bg-light"
          >
            {/* Driver Info */}
            {/* <div className="d-flex align-items-center flex-grow-1">
              <Img name="driver" className="icon-black me-3" />
              <div className="flex-grow-1">
                <h6 className="mb-1 fw-semibold">{item?.driver_name || "-"}</h6>
                <small className="text-muted">
                  Joined On - {item?.joined_date ? item?.joined_date : "-"}
                </small>
              </div>

              <div className="d-flex align-items-center mx-4 text-small">
                <span className="text-muted me-3">TLC License No</span> <br />
                <strong>{item?.tlc_license_no || "-"}</strong>
              </div>
              <div className="d-flex align-items-center mx-4 text-small">
                <span className="text-muted me-3">DMV License No</span> <br />
                <strong>{item?.dmv_license_no || "-"}</strong>
              </div>

              <div className="d-flex align-items-center mx-4 text-small">
                <span className="text-muted me-3">Contact</span> <br />
                <strong>{item?.phone_number || "-"}</strong>
              </div>

              <div className="d-flex align-items-center mx-4 text-small">
                <span className="text-muted me-3">Status</span> <br />
                {item?.driver_status ? (
                  !isDriverStatus(item) ? (
                    <strong className="text-danger">
                      {item.driver_status}
                    </strong>
                  ) : (
                    <strong className="text-success">
                      {item.driver_status}
                    </strong>
                  )
                ) : (
                  <p>-</p>
                )}
              </div>
            </div> */}
            <div className="row align-items-center w-100">
              <div className="col-md-2 d-flex align-items-center">
                <Img name="driver" className="icon-black me-3" />
                <div>
                  <h6 className="mb-1 fw-semibold">
                    {item?.driver_name || "-"}
                  </h6>
                  <small className="text-muted">
                    Added On - {item?.joined_date ? item?.joined_date : "-"}
                  </small>
                </div>
              </div>

              <div className="d-flex align-items-center col-md-2 text-small">
                <span className="text-muted d-block me-3">TLC License No</span>
                <strong>{item?.tlc_license_no || "-"}</strong>
              </div>

              <div className="d-flex align-items-center col-md-2 text-small">
                <span className="text-muted d-block me-3">DMV License No</span>
                <strong>{item?.dmv_license_no || "-"}</strong>
              </div>

              <div className="d-flex align-items-center col-md-2 text-small">
                <span className="text-muted d-block me-3">Contact</span>
                <strong>{item?.phone_number || "-"}</strong>
              </div>

              <div className="d-flex align-items-center col-md-2 text-small">
                <span className="text-muted d-block me-3">Status</span>
                {item?.driver_status ? (
                  !isDriverStatus(item) ? (
                    <strong className="text-danger">
                      {item.driver_status}
                    </strong>
                  ) : (
                    <strong className="text-success">
                      {item.driver_status}
                    </strong>
                  )
                ) : (
                  <strong>-</strong>
                )}
              </div>
              <div className="d-flex align-items-center col-md-2 text-small"></div>
            </div>

            {/* 3-dot menu */}
            <div className="position-relative d-flex gap-2">
              {item?.documents ? (
                <Button
                  icon={() => <Img name="ic_pdf_active" />}
                  data-testid="ic_pdf_active"
                  onClick={() => handleUploadDocument(data?.lease_id, item)}
                ></Button>
              ) : (
                <Button
                  data-testid="pdf_inactive"
                  icon={() => <Img name="pdf_inactive" />}
                ></Button>
              )}
              <Menu
                model={[
                  {
                    label: "Remove Driver",
                    command: () =>
                      removeAdditionalDriver({
                        ...item,
                        driver_lease_id: item?.driver_lease_id,
                      }),
                  },
                  {
                    label: "Regenerate",
                    command: () => regenerateCase(item),
                    disabled: item?.case_detail?.case_status === "Closed",
                  },
                  {
                    label: "Preview Form",
                    command: () => handlePreviewForm(item),
                  },
                ]}
                popup
                ref={(el) => (subMenuRefs.current[idx] = el)}
              />
              <Button
                icon={() => <Img name="three_dots_vertival" />}
                className="p-button-text p-0"
                onClick={(e) => subMenuRefs.current[idx].toggle(e)}
              />
            </div>
          </div>
        ))}
      </div>
    );
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

  const menu = useRef(null);

  const menuItems = columns.map((col) => ({
    template: (
      <div className="p-field-checkbox d-flex align-items-center p-2">
        <Checkbox
          inputId={col.field}
          checked={visibleColumnsState[col.field]}
          onChange={() => handleColumnVisibilityChange(col.field)}
        />
        <label className="p-1" htmlFor={col.field}>
          {col.header ? col.header : col.field}
        </label>
      </div>
    ),
  }));

  const handleColumnVisibilityChange = (field) => {
    setVisibleColumnsState((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const filteredColumns = Object.values(visibleColumnsState).every(
    (isVisible) => !isVisible
  )
    ? columns
    : columns.filter((col) => visibleColumnsState[col.field]);

  const visibleCount =
    Object.values(visibleColumnsState).filter(Boolean).length;

  // useEffect(() => {
  //   if (removeDriverIsSuccess) {
  //     dispatch(leaseApi.util.invalidateTags(["lease"]));
  //   }
  // }, [removeDriverIsSuccess]);

  useEffect(() => {
    triggerSearch({ page: 1, limit: 5 });
  }, []);

  const searchData = (type, value) => {
    const queryParams = new URLSearchParams({
      page: 1,
      per_page: 5,
    });
    if (type.field === leaseId) {
      queryParams.append(leaseId, value);
    }
    if (type.field === vinNumber) {
      queryParams.append(vinNumber, value);
    }
    if (type.field === medallionNumber) {
      queryParams.append(medallionNumber, value);
    }
    if (type.field === tlcLicenseNumber) {
      queryParams.append(tlcLicenseNumber, value);
    }
    if (type.field === driverName) {
      queryParams.append(driverName, value);
    }
    if (type.field === vehiclePlateNumber) {
      queryParams.append(vehiclePlateNumber, value);
    }
    if (type.field === leaseAmount) {
      queryParams.append(leaseAmount, value);
    }
    setFilterSearchBy(type.field);
    triggerSearchFilterQuery(`?${queryParams?.toString()}`);
  };

  const clearFilter = (option) => {
    updateFilter(option, null, "remove");
  };

  useEffect(() => {
    setPage(1);
    setRows(5);
    triggerSearch({ page: 1, limit: 5 });
  }, [filterApplyList]);

  const [triggerExport] = useLazyExportLeaseQuery();

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
            <p className="topic-txt">Manage Leases</p>
            {/* <p className="regular-text text-grey">
              Showing {rows} of{" "}
              <span data-testid="total_item_count">
                {leaseDetail?.total_count}
              </span>{" "}
              Lists...{" "}
            </p> */}
            <GridShowingCount
              rows={leaseDetail?.items?.length || 0}
              total={leaseDetail?.total_count}
            />
          </div>
          <div className="d-flex gap-3">
            <Menu model={menuItems} popup ref={menu} />
            <div
              className="d-flex justify-content-center align-items-center position-relative"
              style={{ width: 40 }}
            >
              <Button
                icon={() => <Img name={"ic_column_filter"} />}
                onClick={(e) => menu.current.toggle(e)}
              ></Button>
              {visibleCount > 0 && (
                <Badge
                  className="badge-icon"
                  value={visibleCount}
                  severity="warning"
                ></Badge>
              )}
            </div>
            <Divider layout="vertical" />
            <Button
              data-testid="refresh_btn"
              icon={() => <Img name={"refresh"} />}
              onClick={refreshFunc}
            ></Button>
          </div>
        </div>
        <div className="d-flex justify-content-end ">
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
          {/* <Button data-testid="export-btn" text className='regular-text gap-2 d-flex' onClick={exportFile} icon={() => <Img name="ic_export" />} >Export as .XLS</Button> */}
        </div>
      </div>
      <BExpandableTable
        columns={filteredColumns}
        data={vehicles}
        rowExpansionTemplate={rowExpansionTemplate}
        selectedData={selectedProducts}
        onSelectionChange={(e) => setSelectedProducts(e.value)}
        renderColumn={customRender}
        onPageChange={onPageChange}
        totalRecords={leaseDetail?.total_count}
        filterData={filterData}
        filterSearchData={searchFilterData}
        clearAllFilter={clearAllFilter}
        clearFilter={clearFilter}
        pSortField={sortField}
        pSortOrder={sortOrder}
        searchData={searchData}
        filterApply={filterApply}
        onSortApply={onSortApply}
        // filterSearchBy={filterSearchBy}
        dataKey="lease_id"
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
          if (flow === NEW_LEASE_TYPE) {
            createNewCase(NEW_LEASE_TYPE);
          } else if (flow === DRIVER_TLC_LICENSE_TYPE) {
            createNewCase(DRIVER_TLC_LICENSE_TYPE);
          } else if (flow === ADDITIONAL_DRIVER_TYPE) {
            createNewCase(ADDITIONAL_DRIVER_TYPE);
          } else if (flow === DRIVER_UPDATE_ADDRESS) {
            createNewCase(DRIVER_UPDATE_ADDRESS);
          }
          // else if (flow === "remove_additional_driver") {
          //   removeAddDriverAPI(selectedMedallionDetail?.driver_lease_id);
          // }
          else if (flow === RENEW_LEASE_TYPE) {
            createNewCase(RENEW_LEASE_TYPE);
          }
        }}
      ></BConfirmModal>

      <Dialog
        visible={showScheduleModal}
        modal
        onHide={() => {
          setShowScheduleModal(false);
          setSelectedLeaseId(null);
        }}
        content={() => (
          <div className="d-flex flex-column align-items-center p-5 bg-light confirm-modal">
            <div className="w-100 d-flex align-items-center justify-content-between mb-2 header">
              <div className="header-text">
                Lease Schedule - {selectedLeaseId}
              </div>
              <Button
                text
                className="close-icon"
                icon={() => <Img name="modalCancel"></Img>}
                onClick={() => {
                  setShowScheduleModal(false);
                  setSelectedLeaseId(null);
                }}
              ></Button>
            </div>
            <DataTable
              className="custom-data-table"
              value={leaseSchedule}
              scrollable
              scrollHeight="400px"
              emptyMessage="No Lease Schedule"
            >
              <Column field="installment_no" header="#" />
              <Column field="period_start" header={"Period Start"} />
              <Column field="period_end" header={"Period End"} />
              <Column field="active_days" header={"Active Days"} />
              <Column field="amount_due" header={"Total Amount"} />
              <Column field="medallion_amount" header={"Medallion"} />
              <Column field="vehicle_amount" header={"Vehicle"} />
            </DataTable>
          </div>
        )}
      ></Dialog>
      <RemoveAdditionalDriverModal
        isOpen={isRemoveModalOpen}
        title={confirmationTitle}
        onCancel={() => {
          setRemoveModalOpen(false);
        }}
        onConfirm={() => {
          setRemoveModalOpen(false);
        }}
        driverLeaseId={selectedMedallionDetail?.driver_lease_id}
        additionalDriverData={selectedMedallionDetail}
        onSuccess={() => {
          setRemoveModalOpen(false);
          // refreshFunc();
          dispatch(leaseApi.util.invalidateTags(["lease"]));
        }}
      />
      <PdfViewModal
        trigger={isPreviewModalOpen}
        setTrigger={setIsPreviewModalOpen}
        title={previewDocInfo.title}
        downloadUrl={previewDocInfo.downloadUrl}
        downloadName={previewDocInfo.downloadName}
        extension={previewDocInfo.extension}
        previewUrl={previewDocInfo.previewUrl}
      />
    </div>
  );
};

export default ManageLease;
