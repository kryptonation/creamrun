import { useLocation } from "react-router-dom";
import BBreadCrumb from "../../components/BBreadCrumb";
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
import DataTableComponent from "../../components/DataTableComponent";
import { useGetVehicleOwnerDetailsQuery } from "../../redux/api/vehicleOwnerAPI";
import BUpload from "../../components/BUpload";
import DocumentGridViewOnly from "../../components/DocumentGridViewOnly";

const ViewVehicleOwnerDetails = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  console.log("uselocation", location.state);
  const [vehicleOwnerList, setVehicleOwnerList] = useState([]);
  const [rows, setRows] = useState(5);
  const [page, setPage] = useState(1);

  const { data } = useGetVehicleOwnerDetailsQuery({
    id: location?.state?.id,
    page: page,
    per_page: rows,
  });

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
        <Link to="/manage-vehicle-owner" className="font-semibold text-grey">
          Manage Vehicle Owner
        </Link>
      ),
    },
    {
      template: () => (
        <Link className="font-semibold text-black">
          {location?.state?.entity_name}
        </Link>
      ),
    },
  ];
  const onPageChange = (event) => {
    console.log("On page change", event);
    const newPage = Number(event.page) + 1;
    const newRows = event.rows;

    setPage(newPage);
    setRows(newRows);
  };

  useEffect(() => {
    if (data) {
      const filteredData = data?.vehicles?.items.filter(
        (item) => item.vin !== null
      );
      setVehicleOwnerList(filteredData);
      console.log("data", data);
    }
  }, [data]);

  const getDocuments = () => {
    return data?.documents;
  };

  const columns = [
    {
      field: "vin",
      header: "VIN No",
      headerAlign: "left",
      bodyAlign: "left",
    },
    {
      field: "make",
      header: "Make",
      headerAlign: "left",
      bodyAlign: "left",
    },
    {
      field: "model",
      header: "Model",
      headerAlign: "left",
      bodyAlign: "left",
    },
    {
      field: "year",
      header: "Year",
      headerAlign: "left",
      bodyAlign: "left",
    },
    {
      field: "vehicle_type",
      header: "Vehicle Type",
      headerAlign: "left",
      bodyAlign: "left",
    },
    {
      field: "entity_name",
      header: "Entity Name",
      headerAlign: "left",
      bodyAlign: "left",
    },
  ];

  const customRender = (column, rowData) => {
    if (column.field === "vin") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {rowData?.vin}
            </h1>
          </div>
        </div>
      );
    }
    if (column.field === "make") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {rowData?.make}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "model") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-ein-number">
              {rowData?.model}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "year") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-status">
              {rowData?.year}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "vehicle_type") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-status">
              {rowData?.type}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "entity_name") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-status">
              {location?.state?.entity_name}
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
      document_object_type: "vehicle_owner",
      document_object_id: data?.id,
      document_size: "",
      document_uploaded_date: "",
      presigned_url: "",
    };

    let upload = {
      data: document_data,
      object_type: "vehicle_owner",
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

  return (
    <div className="common-layout w-100 h-100 d-flex flex-column gap-4 pb-4">
      <BBreadCrumb breadcrumbItems={breadcrumbItems} separator="/" />
      <>
        <div className="px-3">
          {/* Title */}
          <h5 className="fw-bold mb-3">Owner Details</h5>

          {/* Owner ID & Entity */}
          <div className="mb-2">
            <div className="d-flex align-items-center">
              <h4 className="mb-0 fw-semibold">{data?.owner_id}</h4>
              {data?.status === "Active" ? (
                <>
                  <div className="status-indicator active me-1"></div>
                  <div>Active</div>
                </>
              ) : (
                <>
                  <div className="status-indicator inactive me-1"></div>
                  <div>Inactive</div>
                </>
              )}
            </div>
            <small className="text-muted">
              Entity Name : {data?.entity_name}
            </small>
          </div>

          <hr className="my-3" />

          {/* EIN */}
          <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
            <span className="regular-text">EIN</span>
            <span className="fw-semibold">{data?.ein}</span>
          </div>

          {/* Address */}
          {data?.entity_address?.address_line_1 && (
            <div className="d-flex gap-2">
              <Img className="icon" name="ic_location" />
              <div>
                {data?.entity_address?.address_line_1 && (
                  <p className="mb-1">{data?.entity_address?.address_line_1}</p>
                )}
                {data?.entity_address?.address_line_2 && (
                  <p className="mb-1">{data?.entity_address?.address_line_2}</p>
                )}
                <p className="mb-1">
                  {data?.entity_address?.city}, {data?.entity_address?.state} –{" "}
                  {data?.entity_address?.zip}
                </p>
              </div>
            </div>
          )}
        </div>
        {/* {data?.documents.length > 0 && (
          <div className="section-title px-3">
            <p className="section-title ">Documents</p>
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
          </div>
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
        <p className="fw-semibold text-dark fs-5">Vehicle List</p>
        {/* <DataTableComponent
          columns={columns}
          data={vehicleOwnerList}
          renderColumn={customRender}
          onPageChange={onPageChange}
          emptyMessage={"No records found"}
          totalRecords={data?.vehicles?.total_count}
          dataKey="id"
        /> */}
        {vehicleOwnerList.length > 0 ? (
          <div className="d-flex flex-column gap-3">
            <table className="table border-bottom- align-middle">
              <thead className="border-bottom">
                <tr>
                  <th className="py-3 px-4 text-nowrap">VIN</th>
                  <th className="py-3 px-4 text-nowrap">Make</th>
                  <th className="py-3 px-4 text-nowrap">Model</th>
                  <th className="py-3 px-4 text-nowrap">Year</th>
                  <th className="py-3 px-4 text-nowrap">Vehicle Type</th>
                  <th className="py-3 px-4 text-nowrap">Entity Name</th>
                </tr>
              </thead>
              <tbody>
                {vehicleOwnerList.map((item, index) => (
                  <tr key={index} className="border-bottom">
                    <td className="py-3 px-4 text-nowrap">{item?.vin}</td>
                    <td className="py-3 px-4 text-nowrap">{item?.make}</td>
                    <td className="py-3 px-4 text-nowrap">
                      {item?.model || "-"}
                    </td>
                    <td className="py-3 px-4 text-nowrap">{item?.year}</td>
                    <td className="py-3 px-4 text-nowrap">{item?.type}</td>
                    <td className="py-3 px-4 text-nowrap">
                      {data?.entity_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-secondary">
            Vehicle List is not available
          </p>
        )}
      </>
    </div>
  );
};

export default ViewVehicleOwnerDetails;
