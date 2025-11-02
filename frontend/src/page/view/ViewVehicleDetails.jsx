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
import { formatAddress, getFullName, maskSSN } from "../../utils/utils";
import { Button } from "primereact/button";
import BModal from "../../components/BModal";
import PDFViewer from "../../components/PDFViewer";
import BAttachedFile from "../../components/BAttachedFile";
import DataTableComponent from "../../components/DataTableComponent";
import BCaseCard from "../../components/BCaseCard";
import { useGetVehicleDetailsQuery } from "../../redux/api/vehicleApi";
import DocumentGridViewOnly from "../../components/DocumentGridViewOnly";
import BUpload from "../../components/BUpload";
import { useDispatch, useSelector } from "react-redux";

const ViewVehicleDetails = () => {
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
          Manage Vehicle
        </Link>
      ),
    },
    {
      template: () => (
        <Link to={`/manage-vehicle`} className="font-semibold text-black">
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
  console.log("params", params, location?.state);

  const { data, refetch } = useGetVehicleDetailsQuery(location?.state);

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

  useEffect(() => {
    if (data) {
      // setMedallionDetails({
      //   "Medallion Number": data.medallions.medallion_number,
      //   "Owner Name": data.medallions.agent_name,
      //   "Owner Type": data.medallions.owner_type,
      //   "Medallion Type": data.medallions.medallion_type,
      //   "Medallion Status": data.medallions.medallion_status,
      //   "FS6 Status": data.medallions.fs6_status,
      //   "FS6 Date": dateMonthYear(data.medallions.fs6_date),
      //   "Valid From": dateMonthYear(data.medallions.validity_start_date),
      //   "Valid To": dateMonthYear(data.medallions.validity_end_date),
      //   "Last Renewal Date": dateMonthYear(data.medallions.last_renewal_date),
      //   "Renewal Due Date": dateMonthYear(
      //     data.medallions.medallion_renewal_date
      //   ),
      //   "Is Active": data.medallions.is_active ? "Yes" : "No",
      //   "Is Archived": data.medallions.is_archived ? "Yes" : "No",
      // });

      setMedallionDetails({
        "Renewal Date": dateMonthYear(data?.medallions?.medallion_renewal_date),
        // SSN: maskSSN(data?.medallions?.medallion_renewal_date),
        // "Procurement Type": data?.medallions?.medallion_renewal_date,
        "Hack Indicator": data?.medallions?.hack_indicator,
        "Contract Start Date": dateMonthYear(
          data?.medallions?.validity_start_date
        ),
        "Contract End Date": dateMonthYear(data?.medallions?.validity_end_date),
      });

      setMedallionMoreDetails({
        "Renewal Date": dateMonthYear(data?.medallions?.medallion_renewal_date),
        // SSN: maskSSN(data?.medallion.ssn),
        // "Procurement Type": data?.medallion.procurement_type,
        "Hack Indicator": data?.medallion?.hack_indicator,
        "Contract Start Date": dateMonthYear(
          data?.medallions?.validity_start_date
        ),
        "Contract End Date": dateMonthYear(data?.medallions?.validity_end_date),
        "Vehicle Type": getActiveVehicle()?.vehicle_type,
        "Medallion Lease Signed": data?.medallions.lease_expiry_date
          ? "Yes"
          : "No",
        "Attached Vehicle": getActiveVehicle()?.vin,
        "Owner Type": data?.medallions.medallion_type,
        Storage: data?.medallions.in_storage ? "Yes" : "No",
        "Lease Due on": yearMonthDate(data?.medallions.lease_due_on),
        "Owner Address 1": data?.medallions?.owner_address?.address_line_1,
        "Owner Address 2": data?.medallions?.owner_address?.address_line_2,
        City: data?.medallions?.owner_address?.city,
        State: data?.medallions?.owner_address?.state,
        Zip: data?.medallions?.owner_address?.zip,
      });

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
          "Bank Name": driver?.bank_account_id,
          "Bank Account Number": driver?.bank_account_id,
        });

      const vehicle = getActiveVehicle();
      console.log();
      if (vehicle) {
        setVehicleDetails({
          "License Plate Number": vehicle?.registration_details?.plate_number,
          "Vehicle Registration Date": dateMonthYear(
            vehicle?.registration_details?.registration_date
          ),
          Model: vehicle?.model,
          Year: vehicle?.year,
          Fuel: vehicle?.fuel,
          Cylinders: vehicle?.cylinders,
          Color: vehicle?.color,
          "Vehicle Type": vehicle?.vehicle_type,
          "Vehicle Management Entity": vehicle?.entity_name,
          "Registration State":
            vehicle?.registration_details?.registration_state,
        });
        setVehicleMoreDetails({
          "License Plate Number": vehicle?.registration_details?.plate_number,
          "Vehicle Registration Date": dateMonthYear(
            vehicle?.registration_details?.registration_date
          ),
          Model: vehicle?.model,
          Year: vehicle?.year,
          Fuel: vehicle?.fuel,
          Cylinders: vehicle?.cylinders,
          Color: vehicle?.color,
          "Vehicle Type": vehicle?.vehicle_type,
          "Vehicle Management Entity": vehicle?.entity_name,
          "Registration State":
            vehicle?.registration_details?.registration_state,
          "Vehicle Hacked": vehicle?.vehicle_hackups ? "Yes" : "No",
          "Vehicle Hacked Date": dateMonthYear(
            vehicle?.registration_details?.registration_date
          ),
          "Partition Installed": vehicle?.partition_installed,
          "Partition Selected": vehicle?.partition_selected,
          "Driver Assigned": vehicle?.is_driver_associated ? "Yes" : "No",
          // "Driver Name": getFullName(
          //   driver??.first_name,
          //   "",
          //   driver?.details?.last_name
          // ),
        });
      }
    }
  }, [data]);

  // if (isLoading) return <p>Loading...</p>;

  const getActiveDriver = () => {
    return data?.drivers ? data.drivers[0] : null;
  };

  const getActiveVehicle = () => {
    return data;
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
              {data?.medallions.medallion_number}
            </h1>
            <p className="driver-ssn  regular-text">
              Owner Name : {data?.medallions.medallion_owner}
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
              {data?.medallions.medallion_number || "N/A"}
            </h1>
            <p className="driver-ssn regular-text">
              Owner Name : {data?.medallions.agent_name || "N/A"}
            </p>
          </div>
        </div>

        <Divider className="custom-hr" />

        <table className="medallion-table">
          <tbody>
            {Object.entries(medallionDetails).map(([key, value]) => (
              <tr key={key}>
                <td className="table-data-key regular-text">{key}</td>
                <td className="table-data-value regular-text">
                  {value || "N/A"}
                </td>
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

      // <div className="medallion-info">
      //   <h1 className="section-title">Medallion Details</h1>
      //   <div className="medallion-basic">
      //     <Img className="icon" name="view_medallion" />
      //     <div>
      //       <h1 className="medallion-owner-name">
      //         {data?.medallion.details.medallion_number}
      //       </h1>
      //       <p className="driver-ssn regular-text">
      //         Owner Name : {data?.medallion.details.medallion_owner}
      //       </p>
      //     </div>
      //   </div>
      //   <Divider className="custom-hr" />
      //   <table className="medallion-table">
      //     <tbody>
      //       {Object.entries(medallionDetails).map(([key, value]) => (
      //         <tr key={key}>
      //           <td className="table-data-key regular-text">{key}</td>
      //           <td className="table-data-value regular-text">{value}</td>
      //         </tr>
      //       ))}
      //     </tbody>
      //   </table>
      //   <div className="btn-container">
      //     <BModal>
      //       <BModal.ToggleButton>
      //         <div>
      //           <Button className="view-btn" data-testid="view-btn" text>
      //             View more
      //           </Button>
      //         </div>
      //       </BModal.ToggleButton>
      //       <BModal.SideContent position={"right"}>
      //         <div>{medallionDetialView()}</div>
      //       </BModal.SideContent>
      //     </BModal>
      //   </div>
      // </div>
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
            <p>{driver?.phone_number_1 || driver?.phone_number_2}</p>
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

    // if (!vehicle) {
    //   console.log("Vehicle", vehicle);
    //   return;
    // }
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
    { key: "vehicleId", id: vehicleId, view: VehicleView },
    { key: "medallionId", id: medallionId, view: medallionView },
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
    return [data?.documents];
  };

  const pastHistoryColumns = [
    {
      field: "vin",
      header: "VIN",
      // headerAlign: "left",
      // bodyAlign: "left",
    },
    {
      field: "case_number",
      header: "Case Number",
    },
    {
      field: "driver",
      header: "Driver",
      // headerAlign: "left",
      // bodyAlign: "left",
    },
    {
      field: "active_on",
      header: "Active On",
      // headerAlign: "left",
    },
  ];

  const customRender = (column, rowData) => {
    if (column.field === "vin") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-vin-id">
              {data?.vin}
            </h1>
          </div>
        </div>
      );
    }
    if (column.field === "case_number") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {rowData?.case_id}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "driver") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-ein-number">
              {rowData?.driver_name}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "active_on") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-status">
              {monthDateYearHrsMinSepartedByUnderscore(rowData?.created_on) ||
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
    let document_data = {
      document_id: "",
      document_name: "",
      document_note: "",
      document_path: "",
      document_type: "",
      document_date: "",
      document_object_type: "vehicle",
      document_object_id: data?.vehicle_id,
      document_size: "",
      document_uploaded_date: "",
      presigned_url: "",
    };

    let upload = {
      data: document_data,
      object_type: "vehicle",
      object_id: data?.vehicle_id,
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
  return (
    <div className="common-layout w-100 h-100 d-flex flex-column gap-4 pb-4">
      <BBreadCrumb breadcrumbItems={breadcrumbItems} separator="/" />

      {data && (
        <>
          <div>
            <div className="d-flex align-items-center">
              <h1 className="text-big-semi-bold mb-1">{data?.vin}</h1>
              <div className="status-indicator active me-1"></div>
              <div>{data?.vehicle_status}</div>
            </div>
            <div className="medallion-details">
              <BCard label="Model" value={data?.model} />
              <div className="separator"></div>
              <BCard label="Vehicle Type" value={data?.vehicle_type} />
              <div className="separator"></div>
              <BCard
                label="Vehicle Registration Date"
                value={data?.entity_name}
              />
            </div>
            <Divider className="custom-hr-topic" />
            <div className="medallion-content">{renderView()}</div>
          </div>

          {/* file show */}
          <div className="section-title p-0">
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
              // <div className="d-flex align-items-center gap-2 pb-3">
              //   {getDocuments()?.map((file, index) => {
              //     console.log(" ~ {getDocuments ~ file:", file);
              //     return (
              //       <BAttachedFile
              //         file={{
              //           name: file?.document_name,
              //           path: file?.presigned_url,
              //         }}
              //         key={index}
              //       />
              //     );
              //   })}
              // </div>
              <div className="pb-3">
                <DocumentGridViewOnly
                  data={data?.documents}
                ></DocumentGridViewOnly>
              </div>
            ) : (
              <p className="text-secondary">No Documents Found</p>
            )}
          </div>
          {/* past history */}
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3 fw-semibold text-dark fs-5">
              View Past History
            </div>

            {data?.vehicle_history.length > 0 ? (
              // <DataTableComponent
              //   columns={pastHistoryColumns}
              //   data={data?.vehicle_history}
              //   renderColumn={customRender}
              //   // onPageChange={onPageChange}
              //   emptyMessage={"No records found"}
              //   totalRecords={data?.vehicle_history.length}
              //   dataKey="id"
              // />
              <div className="d-flex flex-column gap-3">
                <table className="table border-bottom- align-middle">
                  <thead className="border-bottom">
                    <tr>
                      <th className="py-3 px-4 text-nowrap">VIN No</th>
                      <th className="py-3 px-4 text-nowrap">Case No</th>
                      <th className="py-3 px-4 text-nowrap">Driver</th>
                      <th className="py-3 px-4 text-nowrap">Active On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.vehicle_history.map((item, index) => (
                      <tr key={index} className="border-bottom">
                        <td className="py-3 px-4 text-nowrap">{data?.vin}</td>
                        <td className="py-3 px-4 text-nowrap">
                          {item?.case_id || "-"}
                        </td>
                        <td className="py-3 px-4 text-nowrap">
                          {item?.driverName || "-"}
                        </td>
                        <td className="py-3 px-4 text-nowrap">
                          {monthDateYearHrsMinSepartedByUnderscore(
                            item?.created_on
                          ) || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* {pastVehicleHistoryMockData.map((item, index) => (
                <div key={index} className="border-bottom pb-2">
                  <div className="row">
                    <div className="col-6 col-md-3">
                      <BCaseCard label="VIN" value={item.vin} />
                    </div>
                    <div className="col-6 col-md-3">
                      <BCaseCard label="Case No" value={item.caseNo} />
                    </div>
                    <div className="col-6 col-md-3 mt-2 mt-md-0">
                      <BCaseCard label="Driver" value={item.driverName} />
                    </div>
                    <div className="col-6 col-md-3 mt-2 mt-md-0">
                      <BCaseCard label="Active On" value={item.activeOn} />
                    </div>
                  </div>
                </div>
              ))} */}
              </div>
            ) : (
              <>Past History is not Available</>
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

export default ViewVehicleDetails;
