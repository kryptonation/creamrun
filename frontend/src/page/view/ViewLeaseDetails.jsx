import { useLocation } from "react-router-dom";
import BBreadCrumb from "../../components/BBreadCrumb";
import { useGetMedallionDetailsQuery } from "../../redux/api/medallionApi";
import Img from "../../components/Img";
import BCard from "../../components/BCard";
import { Link } from "react-router-dom";
import {
  dateMonthYear,
  monthDateYearHrsMinSepartedByUnderscore,
  yearMonthDate,
} from "../../utils/dateConverter";
import { Divider } from "primereact/divider";
import React, { useEffect, useState } from "react";
import {
  capitalizeWords,
  formatAddress,
  getFullName,
  maskSSN,
  removeUnderScore,
} from "../../utils/utils";
import { Button } from "primereact/button";
import BModal from "../../components/BModal";
import PDFViewer from "../../components/PDFViewer";
import BAttachedFile from "../../components/BAttachedFile";
import DataTableComponent from "../../components/DataTableComponent";
import BCaseCard from "../../components/BCaseCard";
import { useGetLeaseDetailsQuery } from "../../redux/api/leaseApi";
import DocumentGridViewOnly from "../../components/DocumentGridViewOnly";
import BUpload from "../../components/BUpload";
import PdfViewModal from "../../components/PdfViewModal";

const ViewLeaseDetails = () => {
  // const breadcrumbItems = [
  //   { label: "Home" },
  //   { label: "Medallion" },
  //   { label: "Manage Medallion" },
  // ];

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
        <Link to="/manage-lease" className="font-semibold text-grey">
          Manage Leases
        </Link>
      ),
    },
    {
      template: () => (
        <Link to={`/manage`} className="font-semibold text-black">
          {location?.state}
        </Link>
      ),
    },
  ];
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const medallionId = searchParams.get("medallionId");
  const vehicleId = searchParams.get("vehicleId");
  const driverId = searchParams.get("driverId");

  const params = medallionId
    ? { medallion_number: medallionId }
    : vehicleId
    ? { vehicle_number: vehicleId }
    : driverId
    ? { driver_number: driverId }
    : null;
  console.log("params", params);

  // const { data } = useGetMedallionDetailsQuery(params);
  const { data } = useGetLeaseDetailsQuery(location?.state, {
    refetchOnMountOrArgChange: true,
  });
  const [pastHistoryData, setPastHistoryData] = useState([]);
  const [additionalDriversData, setAdditionalDriversData] = useState([]);
  const [removedDriversData, setRemovedDriversData] = useState([]);

  const [historyFirst, setHistoryFirst] = useState(0);
  const [historyRows, setHistoryRows] = useState(5);

  const [removedHistoryFirst, setRemovedHistoryFirst] = useState(0);
  const [removedHistoryRows, setRemovedHistoryRows] = useState(5);

  console.log("data", data);

  const [leaseDetails, setLeaseDetails] = useState({
    "Lease Start Date": "",
    "Lease End Date": "",
    "Auto Renewal": "",
    Shift: "",
    Repairs: "",
  });

  const [medallionDetails, setMedallionDetails] = useState({
    "Renewal Date": "",
    SSN: "",
    "Procurement Type": "",
    "Hack Indicator": "",
    "Contract Start Date": "",
    "Contract End Date": "",
  });

  const [medallionMoreDetails, setMedallionMoreDetails] = useState({
    "Renewal Date": "",
    SSN: "",
    "Procurement Type": "",
    "Hack Indicator": "",
    "Contract Start Date": "",
    "Contract End Date": "",
  });

  const [licenseDetails, setLicenseDetails] = useState({
    "TLC License No": "",
    "DMV License No": "",
    "DMV License Expiry Date": "",
    "TLC License Expiry Date": "",
    "Bank Name": "",
    "Bank Account Number": "",
  });

  const [vehicleDetails, setVehicleDetails] = useState({
    "License Plate Number": "",
    "Vehicle Registration Date": "",
    Model: "",
    Year: "",
    Fuel: "",
    Cylinders: "",
    Color: "",
    "Vehicle Type": "",
    "Vehicle Management Entity": "",
    "Registration State": "",
  });

  const [vehicleMoreDetails, setVehicleMoreDetails] = useState({
    "License Plate Number": "",
    "Vehicle Registration Date": "",
    Model: "",
    Year: "",
    Fuel: "",
    Cylinders: "",
    Color: "",
    "Vehicle Type": "",
    "Vehicle Management Entity": "",
    "Registration State": "",
  });

  useEffect(() => {
    if (data) {
      setPastHistoryData(data?.history);
      setAdditionalDriversData(data?.additional_drivers);
      setRemovedDriversData(data?.removed_drivers);
      setLeaseDetails({
        "Lease Start Date": data?.lease_start_date,
        "Lease End Date": data?.lease_end_date,
        "Auto Renewal": data?.is_auto_renewed == true ? "Yes" : "No",
        Shift:
          data?.is_day_shift === true
            ? "Day Shift"
            : data?.is_night_shift === true
            ? "Night Shift"
            : "Day Shift",
        Repairs: data?.repairs_responsibility || "-",
      });
      const isMedallionAvailable = getMedallion();
      if (isMedallionAvailable) {
        setMedallionDetails({
          "Renewal Date": dateMonthYear(data?.medallion.medallion_renewal_date),
          ...(data?.medallion?.owner_type === "C"
            ? { EIN: maskSSN(data?.medallion?.ein) }
            : { SSN: maskSSN(data?.medallion?.ssn) }),
          //SSN: maskSSN(data?.medallion.ssn) || "-",
          "Procurement Type": data?.medallion.procurement_type || "-",
          "Hack Indicator": data?.medallion.vehicle ? "Yes" : "No",
          "Contract Start Date": dateMonthYear(
            data?.medallion.validity_start_date
          ),
          "Contract End Date": dateMonthYear(
            data?.medallion.validity_start_date
          ),
        });

        setMedallionMoreDetails({
          "Renewal Date": dateMonthYear(data?.medallion.renewal_date) || "-",
          SSN: maskSSN(data?.medallion.ssn) || "-",
          "Procurement Type": data?.medallion?.procurement_type || "-",
          "Hack Indicator": data?.medallion.hack_indicator ? "Yes" : "No",
          "Contract Start Date": dateMonthYear(
            data?.medallion.validity_start_date
          ),
          "Contract End Date": dateMonthYear(data?.medallion.validity_end_date),
          "Vehicle Type": getActiveVehicle()?.vehicle_type || "-",
          "Medallion Lease Signed": data?.medallion.lease_expiry_date
            ? "Yes"
            : "No",
          "Attached Vehicle": getActiveVehicle()?.vin,
          "Owner Type":
            (data?.medallion.owner_type === "C"
              ? "Corporation"
              : "Individual") || "-",
          Storage: data?.medallion?.in_storage
            ? data?.medallion.in_storage
              ? "Yes"
              : "No"
            : "-",
          "Lease Due on": yearMonthDate(data?.medallion.lease_due_on) || "-",
          "Owner Address 1":
            data?.medallion?.owner_address?.address_line_1 || "-",
          "Owner Address 2":
            data?.medallion?.owner_address?.address_line_2 || "-",
          City: data?.medallion?.owner_address?.city || "-",
          State: data?.medallion?.owner_address?.state || "-",
          Zip: data?.medallion?.owner_address?.zip || "-",
        });
      }

      const driver = getActiveDriver();
      if (driver)
        setLicenseDetails({
          "TLC License No": driver?.tlc_license?.tlc_license_number || "-",
          "DMV License No": driver?.dmv_license?.dmv_license_number || "-",
          "DMV License Expiry Date":
            dateMonthYear(driver?.dmv_license?.dmv_license_expiry_date) || "-",
          "TLC License Expiry Date": dateMonthYear(
            driver?.tlc_license?.tlc_license_expiry_date
          ),
          "Bank Name": driver?.payee_details?.bank_name || "-",
          "Bank Account Number":
            driver?.payee_details?.bank_account_number || "-",
        });

      const vehicle = getActiveVehicle();
      if (vehicle) {
        setVehicleDetails({
          "License Plate Number": vehicle?.plate_number || "-",
          "Vehicle Registration Date":
            dateMonthYear(vehicle?.registration_date) || "-",
          Model: vehicle?.model || "-",
          Year: vehicle?.year || "-",
          Fuel: vehicle?.fuel || "-",
          Cylinders: vehicle?.cylinders || "-",
          Color: vehicle?.color || "-",
          "Vehicle Type": vehicle?.vehicle_type || "-",
          "Vehicle Management Entity": vehicle?.entity_name || "-",
          "Registration State": vehicle?.registration_state || "-",
        });
        setVehicleMoreDetails({
          "License Plate Number": vehicle?.plate_number || "-",
          "Vehicle Registration Date":
            dateMonthYear(vehicle?.registration_date) || "-",
          Model: vehicle?.model || "-",
          Year: vehicle?.year || "-",
          Fuel: vehicle?.fuel || "-",
          Cylinders: vehicle?.cylinders || "-",
          Color: vehicle?.color || "-",
          "Vehicle Type": vehicle?.vehicle_type || "-",
          "Vehicle Management Entity": vehicle?.entity_name || "-",
          "Registration State": vehicle?.registration_state || "-",
          "Vehicle Hacked": vehicle?.vehicle_hackups ? "Yes" : "No",
          "Vehicle Hacked Date":
            dateMonthYear(vehicle?.registration_date) || "-",
          "Partition Installed": vehicle?.partition_installed || "-",
          "Partition Selected": vehicle?.partition_selected || "-",
          "Driver Assigned": vehicle?.is_driver_associated ? "Yes" : "No",
          "Driver Name": getFullName(driver?.first_name, "", driver?.last_name),
        });
      }
    }
  }, [data]);

  // if (isLoading) return <p>Loading...</p>;

  const getActiveDriver = () => {
    return data?.drivers ? data?.drivers[0] : null;
  };

  const getActiveVehicle = () => {
    return data?.vehicle ? data.vehicle : null;
  };
  const getMedallion = () => {
    return data?.medallion ? data?.medallion : null;
  };
  const medallionDetialView = () => {
    console.log(data);

    return (
      <div className="medallion-info">
        <h1 className="section-title">Medallion Details</h1>
        <div className="medallion-basic">
          <Img className="icon" name="view_medallion" />
          <div>
            <h1 className="medallion-owner-name">
              {data?.medallion?.medallion_number}
            </h1>
            <p className="driver-ssn  regular-text">
              Owner Name : {data?.medallion?.owner_name}
            </p>
          </div>
        </div>
        <Divider className="custom-hr" />
        <table className="medallion-table">
          <tbody>
            {Object.entries(medallionMoreDetails).map(([key, value]) => (
              <tr key={key}>
                <td className="table-data-key  regular-text">{key}</td>
                <td className="table-data-value regular-text">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const leaseView = () => {
    return (
      <div className="medallion-info">
        <h1 className="section-title">Lease</h1>
        <div className="medallion-basic">
          <Img className="icon" name="view_medallion" />
          <div>
            <h1 className="medallion-owner-name">{data?.lease_id}</h1>
            <p className="driver-ssn regular-text">
              Lease Type: {data?.lease_type}
            </p>
          </div>
        </div>
        <Divider className="custom-hr" />
        <table className="medallion-table">
          <tbody>
            {Object.entries(leaseDetails).map(([key, value]) => (
              <tr key={key}>
                <td className="table-data-key regular-text">{key}</td>
                <td className="table-data-value regular-text">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* <div className="btn-container">
          <BModal>
            <BModal.ToggleButton>
              <div>
                <Button className="view-btn" data-testid="view-btn" text>
                  View more
                </Button>
              </div>
            </BModal.ToggleButton>
            <BModal.SideContent position={"right"}>
              <div>{medallionDetialView()}</div>
            </BModal.SideContent>
          </BModal>
        </div> */}
      </div>
    );
  };

  const medallionView = () => {
    const isMedallionAvailable = getMedallion();

    if (!isMedallionAvailable) {
      return;
    }
    return (
      <div className="medallion-info">
        <h1 className="section-title">Medallion Details</h1>
        <div className="medallion-basic">
          <Img className="icon" name="view_medallion" />
          <div>
            <h1 className="medallion-owner-name">
              {data?.medallion?.medallion_number}
            </h1>
            <p className="driver-ssn regular-text">
              Owner Name : {data?.medallion?.owner_name}
            </p>
          </div>
        </div>
        <Divider className="custom-hr" />
        <table className="medallion-table">
          <tbody>
            {Object.entries(medallionDetails).map(([key, value]) => (
              <tr key={key}>
                <td className="table-data-key regular-text">{key}</td>
                <td className="table-data-value regular-text">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="btn-container">
          <BModal>
            <BModal.ToggleButton>
              <div>
                <Button className="view-btn" data-testid="view-btn" text>
                  View more
                </Button>
              </div>
            </BModal.ToggleButton>
            <BModal.SideContent position={"right"}>
              <div>{medallionDetialView()}</div>
            </BModal.SideContent>
          </BModal>
        </div>
      </div>
    );
  };

  const DriverView = () => {
    const driver = getActiveDriver();
    if (!driver) return;
    return (
      <div className="medallion-info">
        <h1 className="section-title">Driver Details</h1>
        <div className="medallion-basic">
          <Img className="icon" name="img_driver" />
          <div className="regular-text">
            <h1 className="medallion-owner-name ">
              {getFullName(driver?.first_name, "", driver?.last_name)}
            </h1>
            <p className="regular-text">SSN : {maskSSN(driver?.ssn)}</p>
          </div>
        </div>
        <div className="driver-container regular-text">
          <div className="driver-info">
            <div className="driver-location regular-text">
              <Img className="icon" name="ic_location" />
              <div>
                <p>{formatAddress(driver?.primary_driver_address).address}</p>
                <p>
                  {formatAddress(driver?.primary_driver_address).coordinates}
                </p>
              </div>
            </div>
          </div>
          <div className="driver-contact ">
            <Img className="icon" name="img_tel_phone" />
            <p>{driver?.phone_number_1 || driver?.phone_number_2 || "-"}</p>
          </div>
          <div className="driver-contact">
            <Img className="icon" name="ic_cake" />
            <p>{dateMonthYear(driver?.dob || "")}</p>
          </div>
        </div>
        <Divider className="custom-hr" />

        <table className="medallion-table regular-text">
          <tbody>
            {Object.entries(licenseDetails).map(([key, value]) => (
              <tr key={key}>
                <td className="table-data-key regular-text">{key}</td>
                <td className="table-data-value regular-text">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* <div className="btn-container">
          <Button className="terminate-button" text>
            Terminate
          </Button>
        </div> */}
      </div>
    );
  };
  const VehicleDetialView = () => {
    const vehicle = getActiveVehicle();

    if (!vehicle) {
      return;
    }
    return (
      <div className="medallion-info">
        <h1 className="section-title">Vehicle</h1>
        <div className="medallion-basic">
          <Img className="icon" name="vehicle" />
          <div>
            <h1 className="medallion-owner-name">{vehicle.details?.make}</h1>
            <p className="regular-text">VIN: {vehicle.details?.vin}</p>
          </div>
        </div>
        <Divider className="custom-hr" />
        <table className="medallion-table">
          <tbody>
            {Object.entries(vehicleMoreDetails).map(([key, value]) => (
              <tr key={key}>
                <td className="table-data-key regular-text">{key}</td>
                <td className="table-data-value regular-text">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  const VehicleView = () => {
    const vehicle = getActiveVehicle();

    if (!vehicle) {
      return;
    }
    return (
      <div className="medallion-info">
        <h1 className="section-title">Vehicle</h1>
        <div className="medallion-basic">
          <Img className="icon" name="vehicle" />
          <div>
            <h1 className="medallion-owner-name">{vehicle?.make}</h1>
            <p className="driver-ssn regular-text">VIN: {vehicle?.vin}</p>
          </div>
        </div>
        <Divider className="custom-hr" />
        <table className="medallion-table">
          <tbody>
            {Object.entries(vehicleDetails).map(([key, value]) => (
              <tr key={key}>
                <td className="table-data-key regular-text">{key}</td>
                <td className="table-data-value regular-text">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="btn-container">
          <BModal>
            <BModal.ToggleButton>
              <div>
                <Button className="view-btn" text>
                  View Vehicle Details
                </Button>
              </div>
            </BModal.ToggleButton>
            <BModal.SideContent position={"right"}>
              <div>{VehicleDetialView()}</div>
            </BModal.SideContent>
          </BModal>
        </div>
      </div>
    );
  };

  const components = [
    { key: "leaseId", id: medallionId, view: leaseView },
    { key: "medallionId", id: medallionId, view: medallionView },
    { key: "vehicleId", id: vehicleId, view: VehicleView },
    { key: "driverId", id: driverId, view: DriverView },
  ];

  //const prioritized = components.find((component) => component.id);
  const prioritized = components[0];
  const remainingComponents = components.filter(
    (component) => component.key !== prioritized?.key
  );
  console.log("Prioritized", prioritized, remainingComponents);

  const renderView = () => {
    return (
      <>
        {prioritized && (
          <>
            {prioritized.view()}
            <Img className="vertical-line" name="img_vertical_line" />
          </>
        )}
        {remainingComponents.map((component, index) => (
          <React.Fragment key={component.key}>
            {component.view()}
            {index < remainingComponents.length - 1 && (
              <Img className="vertical-line" name="img_vertical_line" />
            )}
          </React.Fragment>
        ))}
      </>
    );
  };

  const getDocumentIcon = (filename) => {
    const extension = filename.split(".").pop().toLowerCase() || filename;
    switch (extension) {
      case "pdf":
        return "img_pdf";
      case "png":
        return "img_png";
      default:
        return "";
    }
  };

  const getDocuments = () => {
    return data?.documents;
  };
  const pastHistoryColumns = [
    // {
    //   field: "lease_id",
    //   header: "Lease ID",
    // },
    {
      field: "case_number",
      header: "Case Number",
    },
    {
      field: "audit_trial_description",
      header: "Description",
    },
    {
      field: "audit_trial_date",
      header: "Date",
    },
    {
      field: "audit_trial_user",
      header: "User",
    },
  ];
  const additionalDriversColumn = [
    {
      field: "name",
      header: "Name",
    },
    // {
    //   field: "driver_id",
    //   header: "Driver ID",
    // },
    {
      field: "tlc_license_number",
      header: "TLC License No",
    },
    {
      field: "dmv_license_number",
      header: "DMV License No",
    },
    {
      field: "ssn",
      header: "SSN",
    },
    {
      field: "contact_number",
      header: "Contact No",
    },
    {
      field: "joined_date",
      header: "Added On",
    },
    {
      field: "view_documents",
      header: "Documents",
    },
  ];
  const removedDriversColumn = [
    {
      field: "removed_driver_name",
      header: "Name",
    },
    // {
    //   field: "removed_driver_id",
    //   header: "Driver ID",
    // },
    {
      field: "removed_driver_tlc_license_number",
      header: "TLC License No",
    },
    {
      field: "removed_driver_dmv_license_number",
      header: "DMV License No",
    },
    // {
    //   field: "removed_driver_ssn",
    //   header: "SSN",
    // },
    {
      field: "removed_driver_contact_number",
      header: "Contact Number",
    },
    {
      field: "removed_driver_joined_date",
      header: "Added On",
    },
    {
      field: "removed_date",
      header: "Removed On",
    },
  ];
  const additionalDriversMockData = [
    {
      name: "Daniel Wiley",
      driver_id: "D-1001",
      tlc_license_number: "TLC-56789",
      dmv_license_no: "DMV-334455",
      ssn: "123-45-6789",
      contact_number: "+1 (212) 555-0198",
    },
  ];
  const customRender = (column, rowData) => {
    if (column.field === "lease_id") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {rowData?.lease_id}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "case_number") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {rowData?.case_no ? (
                ["ADDRI", "DRVLEA"].includes(rowData.case_type_prefix) ? (
                  <Link
                    to={
                      rowData.case_type_prefix === "ADDRI"
                        ? `/case/${rowData.case_type_prefix}/${rowData.case_no}`
                        : `/new-lease/${rowData.case_no}`
                    }
                    className="text-blue text-decoration-underline"
                  >
                    {rowData.case_no}
                  </Link>
                ) : (
                  rowData.case_no
                )
              ) : (
                "-"
              )}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "audit_trial_description") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {rowData?.description}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "audit_trial_date") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {monthDateYearHrsMinSepartedByUnderscore(rowData?.created_on) ||
                "-"}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "audit_trial_user") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {rowData?.created_by}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "driver") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {rowData?.driver_name}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "active_on") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {rowData?.active_on}
            </h1>
          </div>
        </div>
      );
    }
    //for additional driver table
    else if (column.field === "name") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {rowData?.full_name}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "driver_id") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {rowData?.driver_id}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "tlc_license_number") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {rowData?.tlc_license?.tlc_license_number || "-"}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "dmv_license_number") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {rowData?.dmv_license?.dmv_license_number || "-"}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "ssn") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {maskSSN(rowData?.ssn)}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "contact_number") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {rowData?.phone_number_1 || rowData?.phone_number_2 || "-"}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "joined_date") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {rowData?.joined_date ||
                yearMonthDate(rowData?.joined_date) ||
                "-"}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "view_documents") {
      const driverDocuments = rowData?.documents || [];
      const hasDocuments = driverDocuments.length > 0;

      const parts = driverDocuments[0]?.document_name?.split(".");
      const extension = parts?.pop();
      const filename = parts?.join(".");
      const img = extension === "pdf" ? "pdf" : "img";
      const path = driverDocuments[0]?.presigned_url;

      return (
        <div className="d-flex align-items-center justify-content-center">
          {/* {hasDocuments ? (
            <BModal>
              <BModal.ToggleButton>
                <Button
                  pt={{ root: { "data-testid": `eye-icon-btn` } }}
                  icon={<Img name="black_ic_eye" />}
                  type="button"
                />
              </BModal.ToggleButton>
              <BModal.SideContent position={"right"}>
                <div className="p-3">
                  <h3 className="mb-3">Documents for {rowData?.full_name}</h3>
                  <DocumentGridViewOnly data={driverDocuments} />
                </div>
              </BModal.SideContent>
            </BModal>
          ) : (
            <span className="text-secondary">No Documents</span>
          )} */}
          {hasDocuments ? (
            <PdfViewModal
              triggerButton={
                <div
                  className="d-flex align-items-center gap-2 doc-img"
                  data-testid="individual-upload-common-btn"
                >
                  <Button
                    pt={{ root: { "data-testid": `eye-icon-btn` } }}
                    icon={<Img name="eye" />}
                    type="button"
                  />
                </div>
              }
              // title={removeUnderScore(rowData?.document_type).replace(
              //   /\b\w/g,
              //   (char) => char.toUpperCase()
              // )}
              title={"Additional Driver Form"}
              downloadUrl={path}
              downloadName={filename}
              extension={extension}
              previewUrl={path}
            />
          ) : (
            // <span className="text-secondary">No Documents</span>
            <Button
              pt={{ root: { "data-testid": `eye-icon-btn` } }}
              icon={<Img name="disabled_eye" />}
              type="button"
            />
          )}
        </div>
      );
    }

    //removed driver table
    else if (column.field === "removed_driver_name") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {rowData?.full_name}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "removed_driver_id") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {rowData?.driver_id}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "removed_driver_tlc_license_number") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {rowData?.tlc_license?.tlc_license_number || "-"}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "removed_driver_dmv_license_number") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {rowData?.dmv_license?.dmv_license_number || "-"}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "removed_driver_ssn") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {maskSSN(rowData?.ssn)}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "removed_driver_contact_number") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {rowData?.phone_number_1 || rowData?.phone_number_2 || "-"}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "removed_driver_joined_date") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {rowData?.joined_date ||
                yearMonthDate(rowData?.joined_date) ||
                "-"}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "removed_date") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {rowData?.removed_date ||
                yearMonthDate(rowData?.removed_date) ||
                "-"}
            </h1>
          </div>
        </div>
      );
    }

    return [column.field];
  };

  const getFile = () => {
    // let upload = {};
    const uploadDocOptions = [
      {
        name: "Others",
        code: "others",
      },
    ];
    let document_data = {
      document_id: "",
      document_name: "",
      document_note: "",
      document_path: "",
      document_type: uploadDocOptions.map((doc) => doc.code).toString(),
      document_date: "",
      document_object_type: "lease",
      document_object_id: data?.id,
      document_size: "",
      document_uploaded_date: "",
      presigned_url: "",
    };

    let upload = {
      data: document_data,
      object_type: "lease",
      object_id: data?.id,
      document_id: 0,
      document_name: "",
      document_type: [
        {
          name: "Others",
          code: "others",
        },
      ],
    };
    return upload;
  };

  const onHistoryPageChange = (event) => {
    setHistoryFirst(event.first);
    setHistoryRows(event.rows);
  };
  const onRemovedHistoryPageChange = (event) => {
    setRemovedHistoryFirst(event.first);
    setRemovedHistoryRows(event.rows);
  };

  const paginatedHistoryData = pastHistoryData?.slice(
    historyFirst,
    historyFirst + historyRows
  );
  const paginatedRemovedHistoryData = removedDriversData?.slice(
    removedHistoryFirst,
    removedHistoryFirst + removedHistoryRows
  );

  return (
    <div className="common-layout w-100 h-100 d-flex flex-column gap-4 pb-4">
      <BBreadCrumb breadcrumbItems={breadcrumbItems} separator="/" />

      {data && (
        <>
          <div>
            <div className="d-flex align-items-center">
              <h1 className="text-big-semi-bold mb-1">{data?.lease_id}</h1>
              {/* <div className="status-indicator active me-1"></div> */}
              <div>{data?.lease_status}</div>
            </div>
            <div className="medallion-details">
              <BCard label="Lease Type" value={data?.lease_type} />
              <div className="separator"></div>
              <BCard label="Lease Date" value={data?.lease_start_date} />
            </div>
            <Divider className="custom-hr-topic" />
            <div className="medallion-content">{renderView()}</div>
          </div>

          {/* file show */}
          {/* <p className="section-title p-0">Documents</p>
          {data?.documents.length > 0 ? (
            <div className="d-flex align-items-center gap-2 pb-3">
              {getDocuments()?.map((file, index) => {
                console.log("🚀 ~ {getDocuments ~ file:", file);
                return (
                  <BAttachedFile
                    file={{
                      name: file?.document_name,
                      path: file?.presigned_url,
                    }}
                    key={index}
                  />
                );
              })}
            </div>
          ) : (
            <p className="regular-text">No Documents found</p>
          )} */}
          <div className="section-title px-2 mt-3">
            <div className="d-flex align-items-center mt-3">
              <p className="fw-semibold text-dark fs-5">Documents</p>
              <BModal>
                <BModal.ToggleButton>
                  <Button
                    text
                    label="Upload Document"
                    className="text-blue upload-common-btn gap-2 ms-auto"
                    type="button"
                    data-testid="btn-upload-documents"
                    icon={() => <Img name="upload_blue" />}
                  />
                </BModal.ToggleButton>
                <BModal.Content>
                  <BUpload {...getFile()}></BUpload>
                </BModal.Content>
              </BModal>
            </div>
            {data?.documents.length > 0 ? (
              <div className="pb-3">
                <DocumentGridViewOnly
                  data={data?.documents}
                ></DocumentGridViewOnly>
              </div>
            ) : (
              <p className="text-secondary">No Documents Found</p>
            )}
          </div>

          <div>
            <div className="d-flex justify-content-between align-items-center mb-3 fw-semibold text-dark fs-5">
              Additional Drivers
            </div>
            {additionalDriversData ? (
              <DataTableComponent
                columns={additionalDriversColumn}
                data={additionalDriversData}
                renderColumn={customRender}
                // onPageChange={onPageChange}
                emptyMessage={"No records found"}
                totalRecords={additionalDriversData?.length}
                dataKey="id"
              />
            ) : (
              <p className="d-flex flex-column gap-3">No Additional Drivers</p>
            )}
          </div>

          <div>
            <div className="d-flex justify-content-between align-items-center mb-3 fw-semibold text-dark fs-5">
              Removed Additional Drivers
            </div>
            {removedDriversData ? (
              <DataTableComponent
                columns={removedDriversColumn}
                data={paginatedRemovedHistoryData}
                renderColumn={customRender}
                // onPageChange={onPageChange}
                paginator={true}
                rows={removedHistoryRows}
                first={removedHistoryFirst}
                onPageChange={onRemovedHistoryPageChange}
                emptyMessage={"No records found"}
                totalRecords={removedDriversData?.length}
                dataKey="id"
                lazy={false}
              />
            ) : (
              <p className="d-flex flex-column gap-3">No Records Found</p>
            )}
          </div>

          {/* past history */}
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3 fw-semibold text-dark">
              View Past History
            </div>
            {pastHistoryData.length > 0 ? (
              <DataTableComponent
                columns={pastHistoryColumns}
                data={paginatedHistoryData}
                renderColumn={customRender}
                // onPageChange={onPageChange}
                paginator={true}
                rows={historyRows}
                first={historyFirst}
                onPageChange={onHistoryPageChange}
                emptyMessage={"No records found"}
                totalRecords={pastHistoryData?.length}
                dataKey="id"
                lazy={false}
              />
            ) : (
              <p className="text-center text-secondary">
                Past history is not available
              </p>
            )}
          </div>

          {/* past history */}
          {/* <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3 fw-semibold text-dark fs-5">
              View Past History
            </div>
            {pastHistoryData.length > 0 ? (
              <div
                className="border rounded bg-white position-relative"
                style={{ maxHeight: "300px", overflowY: "auto" }}
              >
                <div className="d-flex flex-column">
                  <table className="table align-middle mb-0">
                    <thead
                      className="border-bottom position-sticky bg-white"
                      style={{ top: "0", zIndex: 10 }}
                    >
                      <tr>
                        <th className="py-3 px-4 text-nowrap">#</th>
                        <th className="py-3 px-4 text-nowrap">Case Number</th>
                        <th className="py-3 px-4 text-nowrap">Description</th>
                        <th className="py-3 px-4 text-nowrap">Date</th>
                        <th className="py-3 px-4 text-nowrap">User</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastHistoryData.map((item, index) => (
                        <tr key={index} className="border-bottom">
                          <td className="py-3 px-4 text-nowrap">{index + 1}</td>
                          <td className="py-3 px-4 text-nowrap">
                            {item?.case_no && item?.case_type_prefix ? (
                              <Link
                                to={`/case/${item.case_type_prefix}/${item.case_no}`}
                                className="text-blue text-decoration-underline"
                              >
                                {item.case_no}
                              </Link>
                            ) : (
                              item?.case_no || "-"
                            )}
                          </td>
                          <td
                            className="py-3 px-4"
                            style={{
                              maxWidth: "300px",
                              whiteSpace: "normal",
                              wordWrap: "break-word",
                            }}
                          >
                            {item?.description || "-"}
                          </td>
                          <td className="py-3 px-4 text-nowrap">
                            {monthDateYearHrsMinSepartedByUnderscore(
                              item.created_on
                            ) || "-"}
                          </td>
                          <td className="py-3 px-4 text-nowrap">
                            {item?.created_by || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-center text-secondary">
                Past history is not available
              </p>
            )}
          </div> */}
        </>
      )}
    </div>
  );
};

export default ViewLeaseDetails;
