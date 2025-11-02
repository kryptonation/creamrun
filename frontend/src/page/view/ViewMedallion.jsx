import { useLocation } from "react-router-dom";
import BBreadCrumb from "../../components/BBreadCrumb";
import { useGetMedallionDetailsQuery } from "../../redux/api/medallionApi";
import Img from "../../components/Img";
import BCard from "../../components/BCard";
import { Link } from "react-router-dom";
import { dateMonthYear, yearMonthDate } from "../../utils/dateConverter";
import { Divider } from "primereact/divider";
import React, { useEffect, useState } from "react";
import { formatAddress, getFullName, maskSSN } from "../../utils/utils";
import { Button } from "primereact/button";
import BModal from "../../components/BModal";
import PDFViewer from "../../components/PDFViewer";
import BAttachedFile from "../../components/BAttachedFile";
import DocumentGridViewOnly from "../../components/DocumentGridViewOnly";
import BUpload from "../../components/BUpload";

const ViewMedallion = () => {
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

  const { data } = useGetMedallionDetailsQuery(params);

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
      setMedallionDetails({
        "Renewal Date": dateMonthYear(data?.medallion.details.renewal_date),
        SSN: maskSSN(data?.medallion.details.ssn),
        "Procurement Type": data?.medallion.details.procurement_type,
        "Hack Indicator": data?.medallion.details.vehicle ? "Yes" : "No",
        "Contract Start Date": dateMonthYear(
          data?.medallion.details.contract_start_data
        ),
        "Contract End Date": dateMonthYear(
          data?.medallion.details.contract_end_date
        ),
      });

      setMedallionMoreDetails({
        "Renewal Date": dateMonthYear(data?.medallion.details.renewal_date),
        SSN: maskSSN(data?.medallion.details.ssn),
        "Procurement Type": data?.medallion.details.procurement_type,
        "Hack Indicator": data?.medallion.details.vehicle ? "Yes" : "No",
        "Contract Start Date": dateMonthYear(
          data?.medallion.details.contract_start_data
        ),
        "Contract End Date": dateMonthYear(
          data?.medallion.details.contract_end_date
        ),
        "Vehicle Type": getActiveVehicle()?.details?.vehicle_type,
        "Medallion Lease Signed": data?.medallion.details.lease_expiry_date
          ? "Yes"
          : "No",
        "Attached Vehicle": getActiveVehicle()?.details?.vin,
        "Owner Type": data?.medallion.details.medallion_type,
        Storage: data?.medallion.details.in_storage ? "Yes" : "No",
        "Lease Due on": yearMonthDate(data?.medallion.details.lease_due_on),
        "Owner Address 1":
          data?.medallion.details?.owner_address?.address_line_1,
        "Owner Address 2":
          data?.medallion.details?.owner_address?.address_line_2,
        City: data?.medallion.details?.owner_address?.city,
        State: data?.medallion.details?.owner_address?.state,
        Zip: data?.medallion.details?.owner_address?.zip,
      });

      const driver = getActiveDriver();
      if (driver)
        setLicenseDetails({
          "DMV License Expiry Date": dateMonthYear(
            driver?.details?.dmv_license_details?.dmv_license_expiry_date
          ),
          "TLC License Expiry Date": dateMonthYear(
            driver?.details?.tlc_license_details?.tlc_license_expiry_date
          ),
          "Bank Name": driver?.payee_details?.bank_name,
          "Bank Account Number": driver?.payee_details?.bank_account_number,
        });

      const vehicle = getActiveVehicle();
      if (vehicle) {
        setVehicleDetails({
          "License Plate Number":
            vehicle.details?.registration_details?.plate_number,
          "Vehicle Registration Date": dateMonthYear(
            vehicle?.details?.registration_details?.registration_date
          ),
          Model: vehicle.details?.model,
          Year: vehicle.details?.year,
          Fuel: vehicle.details?.fuel,
          Cylinders: vehicle.details?.cylinders,
          Color: vehicle.details?.color,
          "Vehicle Type": vehicle.details?.vehicle_type,
          "Vehicle Management Entity": vehicle.details?.entity_name,
          "Registration State":
            vehicle.details?.registration_details?.registration_state,
        });
        setVehicleMoreDetails({
          "License Plate Number":
            vehicle.details?.registration_details?.plate_number,
          "Vehicle Registration Date": dateMonthYear(
            vehicle?.details?.registration_details?.registration_date
          ),
          Model: vehicle.details?.model,
          Year: vehicle.details?.year,
          Fuel: vehicle.details?.fuel,
          Cylinders: vehicle.details?.cylinders,
          Color: vehicle.details?.color,
          "Vehicle Type": vehicle.details?.vehicle_type,
          "Vehicle Management Entity": vehicle.details?.entity_name,
          "Registration State":
            vehicle.details?.registration_details?.registration_state,
          "Vehicle Hacked": vehicle?.details?.vehicle_hackups ? "Yes" : "No",
          "Vehicle Hacked Date": dateMonthYear(
            vehicle?.details?.registration_details?.registration_date
          ),
          "Partition Installed": vehicle.details?.partition_installed,
          "Partition Selected": vehicle.details?.partition_selected,
          "Driver Assigned": vehicle.details?.is_driver_associated
            ? "Yes"
            : "No",
          "Driver Name": getFullName(
            driver?.details?.first_name,
            "",
            driver?.details?.last_name
          ),
        });
      }
    }
  }, [data]);

  // if (isLoading) return <p>Loading...</p>;

  const getActiveDriver = () => {
    return data?.driver?.details ? data.driver : null;
  };

  const getActiveVehicle = () => {
    return data?.vehicle?.details ? data.vehicle : null;
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
              {data?.medallion.details.medallion_number}
            </h1>
            <p className="driver-ssn  regular-text">
              Owner Name : {data?.medallion.details.medallion_owner}
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

  const medallionView = () => {
    return (
      <div className="medallion-info">
        <h1 className="section-title">Medallion Details</h1>
        <div className="medallion-basic">
          <Img className="icon" name="view_medallion" />
          <div>
            <h1 className="medallion-owner-name">
              {data?.medallion.details.medallion_number}
            </h1>
            <p className="driver-ssn regular-text">
              Owner Name : {data?.medallion.details.medallion_owner}
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
              {getFullName(
                driver?.details?.driver_details?.first_name,
                "",
                driver?.details?.driver_details?.last_name
              )}
            </h1>
            <p className="regular-text">
              SSN : {maskSSN(driver?.details?.driver_details?.driver_ssn)}
            </p>
          </div>
        </div>
        <div className="driver-container regular-text">
          <div className="driver-info">
            <div className="driver-location regular-text">
              <Img className="icon" name="ic_location" />
              <div>
                <p>
                  {
                    formatAddress(driver?.details?.primary_address_details)
                      .address
                  }
                </p>
                <p>
                  {
                    formatAddress(driver?.details?.primary_address_details)
                      .coordinates
                  }
                </p>
              </div>
            </div>
          </div>
          <div className="driver-contact ">
            <Img className="icon" name="img_tel_phone" />
            <p>{driver?.details?.driver_details?.phone_number_1 || ""}</p>
          </div>
          <div className="driver-contact">
            <Img className="icon" name="ic_cake" />
            <p>{dateMonthYear(driver?.details?.driver_details?.dob || "")}</p>
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
            <h1 className="medallion-owner-name">{vehicle.details?.make}</h1>
            <p className="driver-ssn regular-text">
              VIN: {vehicle.details?.vin}
            </p>
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
    { key: "medallionId", id: medallionId, view: medallionView },
    { key: "vehicleId", id: vehicleId, view: VehicleView },
    { key: "driverId", id: driverId, view: DriverView },
  ];

  const prioritized = components.find((component) => component.id);

  const remainingComponents = components.filter(
    (component) => component.key !== prioritized?.key
  );

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
    return data?.medallion?.documents;
  };

  const getFile = () => {
    // let upload = {};
    let document_data = {
      document_id: "",
      document_name: "",
      document_note: "",
      document_path: "",
      document_type: "",
      document_date: "",
      document_object_type: "medallion",
      document_object_id: data?.medallion?.details?.medallion_id,
      document_size: "",
      document_uploaded_date: "",
      presigned_url: "",
    };

    let upload = {
      data: document_data,
      object_type: "medallion",
      object_id: data?.medallion?.details?.medallion_id,
      document_id: 0,
      document_type: [
        {
          name: "Others",
          code: "others",
        },
      ],
    };
    return upload;
  };

  const renderMedallionStatus = (status) => {
    const normalized = (status || "").trim().toUpperCase();

    const statusMap = {
      A: { label: "Available", className: "active" },
      V: { label: "Assigned to Vehicle", className: "assigned" },
      Y: { label: "Active", className: "active" },
    };

    const current = statusMap[normalized] || {
      label: "Inactive",
      className: "inactive",
    };

    return (
      <div className="d-flex align-items-center">
        <div className={`status-indicator ${current.className} me-1`}></div>
        <div>{current.label}</div>
      </div>
    );
  };

  return (
    <div className="common-layout w-100 h-100 d-flex flex-column gap-4 pb-4">
      <BBreadCrumb breadcrumbItems={breadcrumbItems} separator="/" />

      {data && (
        <>
          <div>
            <div className="d-flex align-items-center">
              <h1 className="text-big-semi-bold mb-1">
                {data?.medallion.details?.medallion_number}
              </h1>
              {renderMedallionStatus(data?.medallion.details?.medallion_status)}
            </div>
            <div className="medallion-details">
              <BCard
                label="Type"
                value={data?.medallion.details.medallion_type}
              />
              <div className="separator"></div>
              <BCard
                label="Created On"
                value={dateMonthYear(data?.medallion?.details?.created_on)}
              />
              <div className="separator"></div>
              <BCard
                label="Expires On"
                value={dateMonthYear(
                  data?.medallion?.details?.contract_end_date
                )}
              />
            </div>
            <Divider className="custom-hr-topic" />
            <div className="medallion-content">{renderView()}</div>
          </div>

          {/* file show */}
          <div>
            <div className="d-flex align-items-center mt-3">
              <p className="section-title p-0">Documents</p>
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
            {data?.medallion?.documents.length > 0 ? (
              <DocumentGridViewOnly
                data={data?.medallion?.documents}
              ></DocumentGridViewOnly>
            ) : (
              <p>Document is not Available</p>
            )}
          </div>
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

export default ViewMedallion;
