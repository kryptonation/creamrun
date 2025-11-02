import { useLocation } from "react-router-dom";
import BBreadCrumb from "../../components/BBreadCrumb";
import { useGetMedallionDetailsQuery } from "../../redux/api/medallionApi";
import Img from "../../components/Img";
import BCard from "../../components/BCard";
import { Link } from "react-router-dom";
import {
  dateMonthYear,
  monthDateYearHrsMinSepartedByUnderscore,
  timeFormatWithRange,
  timeHourandMinutes,
  yearMonthDate,
} from "../../utils/dateConverter";
import { Divider } from "primereact/divider";
import React, { useEffect, useState } from "react";
import { formatAddress, getFullName, maskSSN } from "../../utils/utils";
import { Button } from "primereact/button";
import BModal from "../../components/BModal";
import BAttachedFile from "../../components/BAttachedFile";
import { useGetLedgerEntryDetailViewQuery } from "../../redux/api/ledgerApi";
import { Timeline } from "primereact/timeline";
const ViewLedgerDetails = () => {
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
        <Link to="/manage-ledger-entry" className="font-semibold text-grey">
          Manage Ledger Entry
        </Link>
      ),
    },
    {
      template: () => (
        <Link to={`/manage-ledger-entry`} className="font-semibold text-black">
          {data?.ledger_id}
        </Link>
      ),
    },
  ];
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const medallionId = searchParams.get("medallionId");
  const vehicleId = searchParams.get("vehicleId");
  const driverId = searchParams.get("driverId");
  console.log("useLocation", location.state);
  const { data } = useGetLedgerEntryDetailViewQuery(location?.state);

  const params = medallionId
    ? { medallion_number: medallionId }
    : vehicleId
    ? { vehicle_number: vehicleId }
    : driverId
    ? { driver_number: driverId }
    : null;
  console.log("params", params);

  // const { data } = useGetMedallionDetailsQuery(params);
  const isMedallionAvailable = () => {
    return data?.medallion ? data?.medallion : null;
  };

  console.log("data", data);
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

  const [ledgerDetails, setLedgerDetails] = useState({
    "Ledger ID": "",
    "Driver ID": "",
    "Driver Name": "",
    "Ledger Date and Time": "",
    "Dr/Cr": "",
    "Transaction Type": "",
    "Transaction Date and Time": "",
    "Medallion Number": "",
    "VIN Number": "",
  });
  const [ledgerMoreDetails, setLedgerMoreDetails] = useState({
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
    console.log("Ledger details", data);
    if (data) {
      setLedgerDetails({
        "Ledger ID": data?.ledger_id || "-",
        "Driver ID": data?.driver?.driver_id,
        "Driver Name": getFullName(
          data?.driver?.first_name,
          data?.driver?.middle_name,
          data?.driver?.last_name
        ),
        "Ledger Date and Time": monthDateYearHrsMinSepartedByUnderscore(
          data?.created_on
        ),
        // yearMonthDate(data?.created_on) +
        //   "  " +
        //   timeHourandMinutes(data?.created_on) || "-",
        Amount: "$" + data?.amount,
        "Dr/Cr": data?.debit == false ? "Pay To Big Apple" : "Pay To Driver",
        "Transaction Type": data?.source_type,
        "Transaction Date and Time":
          monthDateYearHrsMinSepartedByUnderscore(
            data?.transaction_date + "T" + data?.transaction_time
          ) || "-",
        // "Medallion Number": data?.medallion?.medallion_number || "-",
        // "VIN Number": data?.vehicle?.vin || "-",
      });
      setLedgerMoreDetails({
        "Ledger ID": data?.ledger_id || "-",
        "Driver ID": data?.driver?.driver_id,
        "Driver Name": getFullName(
          data?.driver?.first_name,
          data?.driver?.middle_name,
          data?.driver?.last_name
        ),
        "Ledger Date and Time": monthDateYearHrsMinSepartedByUnderscore(
          data?.created_on
        ),
        Amount: "$" + data?.amount,
        "Dr/Cr": data?.debit == false ? "Pay To Big Apple" : "Pay To Driver",
        "Transaction Type": data?.source_type,
        "Transaction Date and Time":
          monthDateYearHrsMinSepartedByUnderscore(
            data?.transaction_date + "T" + data?.transaction_time
          ) || "-",
        // data?.transaction_date + " " + data?.transaction_time || "-",
        // "Medallion Number": data?.medallion?.medallion_number || "-",
        // "VIN Number": data?.vehicle?.vin || "-",
        Description: data?.description || "-",
      });

      if (isMedallionAvailable) {
        setMedallionDetails({
          "Renewal Date": dateMonthYear(data?.medallion.medallion_renewal_date),
          ...(data?.medallion?.owner_type === "C"
            ? { EIN: maskSSN(data?.medallion?.ein) }
            : { SSN: maskSSN(data?.medallion?.ssn) }),
          //SSN: maskSSN(data?.medallion?.ssn),
          "Procurement Type": data?.medallion.procurement_type,
          "Hack Indicator": data?.medallion.vehicle ? "Yes" : "No",
          "Contract Start Date": dateMonthYear(
            data?.medallion.validity_start_date
          ),
          "Contract End Date": dateMonthYear(data?.medallion.validity_end_date),
        });

        setMedallionMoreDetails({
          "Renewal Date": dateMonthYear(data?.medallion.medallion_renewal_date),
          ...(data?.medallion?.owner_type === "C"
            ? { EIN: maskSSN(data?.medallion?.ein) }
            : { SSN: maskSSN(data?.medallion?.ssn) }),
          //SSN: maskSSN(data?.medallion.ssn),
          "Procurement Type": data?.medallion.procurement_type,
          "Hack Indicator": data?.medallion.vehicle ? "Yes" : "No",
          "Contract Start Date": dateMonthYear(
            data?.medallion.validity_start_date
          ),
          "Contract End Date": dateMonthYear(data?.medallion.validity_end_date),
          "Vehicle Type": getActiveVehicle()?.vehicle_type,
          "Medallion Lease Signed": data?.medallion.lease_expiry_date
            ? "Yes"
            : "No",
          "Attached Vehicle": getActiveVehicle()?.vin,
          "Owner Type": data?.medallion.medallion_type,
          Storage: data?.medallion.in_storage ? "Yes" : "No",
          "Lease Due on": yearMonthDate(data?.medallion.lease_due_on),
          "Owner Address 1": data?.medallion?.owner_address?.address_line_1,
          "Owner Address 2": data?.medallion?.owner_address?.address_line_2,
          City: data?.medallion?.owner_address?.city,
          State: data?.medallion?.owner_address?.state,
          Zip: data?.medallion?.owner_address?.zip,
        });
      }

      const driver = getActiveDriver();
      if (driver)
        setLicenseDetails({
          "TLC License No": driver?.tlc_license?.tlc_license_number,
          "DMV License No": driver?.dmv_license?.dmv_license_number,
          "DMV License Expiry Date": dateMonthYear(
            driver?.dmv_license?.dmv_license_expiry_date
          ),
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
          "License Plate Number": vehicle?.plate_number,
          "Vehicle Registration Date": dateMonthYear(
            vehicle?.registration_date
          ),
          Model: vehicle?.model,
          Year: vehicle?.year,
          Fuel: vehicle?.fuel,
          Cylinders: vehicle?.cylinders,
          Color: vehicle?.color,
          "Vehicle Type": vehicle?.vehicle_type,
          "Vehicle Management Entity": vehicle?.entity_name,
          "Registration State": vehicle?.registration_state,
        });
        setVehicleMoreDetails({
          "License Plate Number": vehicle?.plate_number,
          "Vehicle Registration Date": dateMonthYear(
            vehicle?.registration_date
          ),
          Model: vehicle?.model,
          Year: vehicle?.year,
          Fuel: vehicle?.fuel,
          Cylinders: vehicle?.cylinders,
          Color: vehicle?.color,
          "Vehicle Type": vehicle?.vehicle_type,
          "Vehicle Management Entity": vehicle?.entity_name,
          "Registration State": vehicle?.registration_state,
          "Vehicle Hacked": vehicle?.vehicle_hackups ? "Yes" : "No",
          "Vehicle Hacked Date": dateMonthYear(vehicle?.registration_date),
          "Partition Installed": vehicle?.partition_installed,
          "Partition Selected": vehicle?.partition_selected,
          "Driver Assigned": vehicle?.is_driver_associated ? "Yes" : "No",
          "Driver Name": getFullName(
            driver?.first_name,
            driver?.middle_name,
            driver?.last_name
          ),
        });
      }
    }
  }, [data]);

  // if (isLoading) return <p>Loading...</p>;

  const getActiveDriver = () => {
    return data?.driver ? data.driver : null;
  };

  const getActiveVehicle = () => {
    return data?.vehicle ? data?.vehicle : null;
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

  const LedgerView = () => {
    return (
      <div className="medallion-info">
        <h1 className="section-title">Ledger Details</h1>
        <div className="medallion-basic">
          <Img className="icon" name="ledger_icon" />
          <div>
            <h1 className="medallion-owner-name">{data?.ledger_id}</h1>
          </div>
        </div>
        <Divider className="custom-hr" />
        <table className="medallion-table">
          <tbody>
            {Object.entries(ledgerDetails).map(([key, value]) => (
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
              <div>{ledgerDetailView()}</div>
            </BModal.SideContent>
          </BModal>
        </div>
      </div>
    );
  };
  const ledgerDetailView = () => {
    console.log(data);

    return (
      <div className="medallion-info">
        <h1 className="section-title">Ledger Details</h1>
        <div className="medallion-basic">
          <Img className="icon" name="ledger_icon" />
          <div>
            <h1 className="medallion-owner-name">{data?.ledger_id}</h1>
            {/* <p className="driver-ssn  regular-text">
              Owner Name : {data?.medallion?.medallion_owner}
            </p> */}
          </div>
        </div>
        <Divider className="custom-hr" />
        <table className="medallion-table">
          <tbody>
            {Object.entries(ledgerMoreDetails).map(([key, value]) => (
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

  const medallionView = () => {
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
    console.log("DriverView", driver);
    if (!driver) return;
    return (
      <div className="medallion-info">
        <h1 className="section-title">Driver Details</h1>
        <div className="medallion-basic">
          <Img className="icon" name="img_driver" />
          <div className="regular-text">
            <h1 className="medallion-owner-name ">
              {getFullName(
                driver?.first_name,
                driver?.middle_name,
                driver?.last_name
              )}
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
            <p>{driver?.phone_number_1 || driver?.phone_number_2 || ""}</p>
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
    console.log("Vehicle Dtaial", vehicle);
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
            <p className="regular-text">VIN: {vehicle?.vin}</p>
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
    { key: "leaseId", id: driverId, view: LedgerView },
    { key: "driverId", id: driverId, view: DriverView },
    { key: "medallionId", id: medallionId, view: medallionView },
    { key: "vehicleId", id: vehicleId, view: VehicleView },
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

  const ledgerEntryColumns = [
    {
      field: "id",
      header: "Ledger ID",
      headerAlign: "left",
      bodyAlign: "left",
    },
    {
      field: "driver_id",
      header: "Driver ID",
      headerAlign: "left",
      bodyAlign: "left",
    },
    {
      field: "driver_name",
      header: "Driver Name",
      headerAlign: "left",
      bodyAlign: "left",
    },
    {
      field: "created_on",
      header: "Ledger Date",
    },
    {
      field: "ledger_time",
      header: "Ledger Time",
    },
    {
      field: "transaction_date",
      header: "Transaction Date",
    },
    {
      field: "transaction_time",
      header: "Transaction Time",
    },
    {
      field: "medallion_number",
      header: "Medallion Number",

      headerAlign: "left",
    },
    {
      field: "vin",
      header: "VIN No",
    },
    {
      field: "amount",
      header: "Amount",
    },
    {
      field: "transaction_type",
      header: "Dr/Cr",
    },
    {
      field: "source_type",
      header: "Transaction Type",
    },
    {
      field: "description",
      header: "Description",
    },
  ];

  const customRender = (column, rowData) => {
    if (column.field === "driver_id") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <button
              className="regular-text btn p-0 border-0"
              data-testid="grid-driver-id"
            >
              {rowData?.driver?.driver_id}
            </button>
          </div>
        </div>
      );
    } else if (column.field === "id") {
      return (
        <div className="d-flex align-items-center justify-content-between flex-row">
          <button
            className="regular-text btn p-0 border-0"
            data-testid="grid-ledger-id"
          >
            {rowData?.ledger_id}
          </button>
        </div>
      );
    } else if (column.field === "driver_name") {
      return (
        <div className="d-flex align-items-center justify-content-between flex-row">
          <button
            className="regular-text btn p-0 border-0"
            data-testid="grid-ledger-id"
          >
            {getFullName(
              rowData?.driver?.first_name,
              rowData?.driver?.middle_name,
              rowData?.driver?.last_name
            )}
          </button>
        </div>
      );
    } else if (column.field === "medallion_number") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-medallion-number">
              {rowData?.medallion?.medallion_number || "-"}
              <p className="fst-italic" data-testid="grid-medallion-owner">
                {" "}
                {rowData?.medallion?.medallion_owner || ""}
              </p>
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "vin") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-vin-no">
              {rowData?.vehicle?.vin || "-"}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "amount") {
      return (
        <div className="text-center">
          <h1 className="regular-text" data-testid="grid-amount">
            {"$" + rowData?.amount}
          </h1>
        </div>
      );
    } else if (column.field === "transaction_type") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-transaction-type">
              {rowData?.debit == false ? "Pay To Big Apple" : "Pay To Driver"}
              {/* {rowData?.transaction_type} */}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "source_type") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-source-type">
              {rowData?.source_type}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "description") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-description">
              {rowData?.description}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "created_on") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-ledger-date">
              {yearMonthDate(rowData?.created_on) || "-"}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "transaction_date") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-ledger-date">
              {rowData?.transaction_date || "-"}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "transaction_time") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-ledger-date">
              {rowData?.transaction_time || "-"}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "ledger_time") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-ledger-date">
              {timeHourandMinutes(rowData?.created_on) || "-"}
            </h1>
          </div>
        </div>
      );
    }

    return [column.field];
  };
  const customizedMarker = () => {
    return <Img name="in_active_tick" className="icon-green" />;
  };

  const customizedContent = (item) => {
    return (
      <>
        <p className="regular-semibold-text">
          {item.case_type} | {item.description}{" "}
        </p>
        <p className="fw-small text-wrap">
          {yearMonthDate(item.created_on)} |{" "}
          {timeFormatWithRange(item.created_on)} | {item.user.first_name}{" "}
          {item.user.last_name}{" "}
        </p>
      </>
    );
  };
  // const { data: events } = useGetManageAuditTrailQuery(data);
  const mockAuditTrailData = {
    results: [
      {
        case_type: "Ledger Y577AG created for Medallion",
        description: "HX4617XQAMDKNU928",
        created_on: "2025-08-12T09:00:00Z",
        user: {
          first_name: "Robert",
          last_name: "Anderson",
        },
      },
      {
        case_type: "Driver linked",
        description: "Daniel Wiley (ID: 6067692)",
        created_on: "2025-08-12T09:00:00Z",
        user: {
          first_name: "Robert",
          last_name: "Anderson",
        },
      },
      {
        case_type: "Transaction recorded",
        description: "$100, Pay To Big Apple, Type: CURB, Description: EZpass",
        created_on: "2025-08-12T09:00:00Z",
        user: {
          first_name: "Robert",
          last_name: "Anderson",
        },
      },
      {
        case_type: "Transaction date & time saved",
        description: "",
        created_on: "2025-08-11T12:10:00Z",
        user: {
          first_name: "Robert",
          last_name: "Anderson",
        },
      },
    ],
  };

  return (
    <div className="common-layout w-100 h-100 d-flex flex-column gap-4 pb-4">
      <BBreadCrumb breadcrumbItems={breadcrumbItems} separator="/" />

      {data && (
        <>
          <div>
            <div className="d-flex align-items-center">
              <h1 className="text-big-semi-bold mb-1">{data?.ledger_id}</h1>
            </div>
            <div className="medallion-details">
              <BCard
                label="TLC License No"
                value={licenseDetails?.["TLC License No"]}
              />
              <div className="separator"></div>
              <BCard
                label="DMV License No"
                value={licenseDetails?.["DMV License No"]}
              />
            </div>
            <Divider className="custom-hr-topic" />
            <div className="medallion-content">{renderView()}</div>
          </div>

          {/* file show */}
          <p className="section-title p-0">Documents</p>
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
          )}
          <div>
            <p className="section-title p-0 mb-3">Audit Trial History</p>
            <Timeline
              value={data?.history}
              className="custom-timeline"
              data-testid="audit-trail-timeline"
              marker={customizedMarker}
              content={customizedContent}
            />
          </div>

          {/* <p className="section-title p-0">Ledger Entries</p>
          <DataTableComponent
            columns={ledgerEntryColumns}
            data={ledgerEntryList}
            renderColumn={customRender}
            emptyMessage={"No records found"}
            totalRecords="1"
            dataKey="id"
          /> */}

          {/* <BModal>
            <BModal.ToggleButton>
              <div>
                <div className="document-show">
                  <h1 className="heading">Documents</h1>
                  <div className="document-flex">
                    {getDocuments()?.map((file, index) => (
                      <div key={index} className="file-container">
                        <div className="image-container">
                          <Img
                            className="image-size"
                            name={getDocumentIcon(file.document_format)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </BModal.ToggleButton>
            <BModal.SideContent position={"right"}>
              <div>
                {getDocuments()?.map((file, index) => (
                  <PDFViewer key={index} url={file.presigned_url} />
                ))}
              </div>
            </BModal.SideContent>
          </BModal> */}

          {/* <div className="pb-4"></div> */}
        </>
      )}
    </div>
  );
};

export default ViewLedgerDetails;
