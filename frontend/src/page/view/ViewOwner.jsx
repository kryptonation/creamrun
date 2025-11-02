import { useLocation } from "react-router-dom";
import BBreadCrumb from "../../components/BBreadCrumb";
import {
  useGetMedallionDetailsQuery,
  useGetMedallionOwnerDetailsQuery,
} from "../../redux/api/medallionApi";
import Img from "../../components/Img";
import BCard from "../../components/BCard";
import { Link } from "react-router-dom";
import {
  dateMonthYear,
  timeFormatWithRange,
  yearMonthDate,
} from "../../utils/dateConverter";
import { Divider } from "primereact/divider";
import React, { useEffect, useState } from "react";
import {
  capitalizeWords,
  formatAddress,
  getFullName,
  maskSSN,
} from "../../utils/utils";
import { Button } from "primereact/button";
import BModal from "../../components/BModal";
import PDFViewer from "../../components/PDFViewer";
import BAttachedFile from "../../components/BAttachedFile";
import DataTableComponent from "../../components/DataTableComponent";
import { Timeline } from "primereact/timeline";
import DocumentGridViewOnly from "../../components/DocumentGridViewOnly";
import BUpload from "../../components/BUpload";
import { useDispatch, useSelector } from "react-redux";
import { setIsUpload } from "../../redux/slice/uploadSlice";

const ViewOwner = () => {
  // const breadcrumbItems = [
  //   { label: "Home" },
  //   { label: "Medallion" },
  //   { label: "Manage Medallion" },
  // ];
  const dispatch = useDispatch();
  const isUpload = useSelector((state) => state.upload.isUpload);
  const location = useLocation();
  // const searchParams = new URLSearchParams(location.search);
  console.log("uselocation", location.state);
  const [medallionList, setMedallionList] = useState([]);
  const [entityDetails, setEntityDetails] = useState({
    entity_type: "",
    entity_name: "",
    ssn: "",
    ein: "",
    owner_name: "",
    medallion_owner_id: "",
    contact_number: "",
    email_address: "",
    created_on: "",
    medallion_number: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zip: "",
  });
  const [rows, setRows] = useState(5);
  const [page, setPage] = useState(1);
  const { data, refetch } = useGetMedallionOwnerDetailsQuery({
    id: location?.state,
    page: page,
    per_page: rows,
  });

  const onPageChange = (event) => {
    console.log("On page change", event);
    const newPage = Number(event.page) + 1;
    const newRows = event.rows;

    setPage(newPage);
    setRows(newRows);
  };
  // useEffect(() => {
  //   if (isUpload) {
  //     refetch();
  //     dispatch(setIsUpload(false)); // reset flag
  //   }
  // }, [isUpload, refetch, dispatch]);
  useEffect(() => {
    if (data) {
      console.log("data", data);
      if (data?.entity_type === "individual") {
        setEntityDetails({
          entity_type: data?.entity_type,
          entity_name: data?.entity_name,
          ssn: data?.ssn,
          ein: null,
          owner_name: data?.owner_name,
          medallion_owner_id: data?.medallion_owner_id,
          contact_number: data?.contact_number,
          email_address: data?.email_address,
          created_on: dateMonthYear(data?.created_on),
          addressLine1: data?.address?.address_line_1,
          addressLine2: data?.address?.address_line_2,
          city: data?.address?.city,
          state: data?.address?.state,
          zip: data?.address?.zip,
        });
      } else {
        setEntityDetails({
          entity_type: data?.entity_type,
          entity_name: data?.entity_name,
          ssn: null,
          ein: data?.ein,
          owner_name: data?.owner_name,
          medallion_owner_id: data?.medallion_owner_id,
          contact_number: data?.contact_number,
          email_address: data?.email_address,
          created_on: dateMonthYear(data?.created_on),
          // medallion_number: data?.additional_info?.medallions[0].medallion_number,
          addressLine1: data?.address?.address_line_1,
          addressLine2: data?.address?.address_line_2,
          city: data?.address?.city,
          state: data?.address?.state,
          zip: data?.address?.zip,
        });
      }
      const filteredData = data?.medallions?.items.filter(
        (row) => row?.medallion_number !== null
      );
      console.log("Filtered data", filteredData);
      setMedallionList(filteredData);

      // setMedallionList(data?.medallions?.items);
    }
  }, [data]);

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
        <Link to="/manage-owner" className="font-semibold text-grey">
          Manage Owner
        </Link>
      ),
    },
    {
      template: () => (
        <Link className="font-semibold text-black">{data?.entity_name}</Link>
      ),
    },
  ];

  const columns = [
    {
      field: "medallion_number",
      header: "Medallion Number",
      headerAlign: "left",
      bodyAlign: "left",
    },
    {
      field: "medallion_status",
      header: "Status",
      headerAlign: "left",
      bodyAlign: "left",
    },
    {
      field: "medallion_type",
      header: "Medallion Type",
      headerAlign: "left",
      bodyAlign: "left",
    },

    {
      field: "end_date",
      header: "End Date",
      headerAlign: "left",
      bodyAlign: "left",
    },
    {
      field: "expiry_date",
      header: "Lease Expiry",
      headerAlign: "left",
      bodyAlign: "left",
    },
  ];

  const customRender = (column, rowData) => {
    if (column.field === "medallion_number") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-medallion-number">
              {rowData?.medallion_number}
            </h1>
          </div>
        </div>
      );
    }
    if (column.field === "medallion_type") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-medallion-type">
              {rowData?.medallion_type}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "medallion_status") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-medallion-status">
              {rowData?.medallion_status}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "end_date") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-end-date">
              {dateMonthYear(rowData?.end_date)}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "expiry_date") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-expiry-date">
              {dateMonthYear(rowData?.expiry_date) || "-"}
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
  const customizedMarker = () => {
    return <Img name="in_active_tick" className="icon-green" />;
  };

  const customizedContent = (item) => {
    return (
      <>
        <p className="regular-semibold-text">
          {item?.case_type} | {item?.description}{" "}
        </p>
        <p className="fw-small text-wrap">
          {dateMonthYear(item?.created_on)} |{" "}
          {timeFormatWithRange(item?.created_on)} | {item?.created_by}
        </p>
      </>
    );
  };

  const getFile = () => {
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
      document_object_type: "medallion_owner",
      document_object_id: data?.medallion_owner_id,
      document_size: "",
      document_uploaded_date: "",
      presigned_url: "",
    };

    let upload = {
      data: document_data,
      object_type: "medallion_owner",
      object_id: data?.medallion_owner_id,
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
        <div className="px-2">
          <div className="d-flex align-items-center">
            <h1 className="text-big-semi-bold mb-1">
              {entityDetails.entity_name}
            </h1>
            {/* <div className="status-indicator active me-1"></div>
            <div>Active</div> */}
          </div>
          <div className="medallion-details p-0">
            <BCard
              label="Owner Type"
              value={capitalizeWords(entityDetails.entity_type)}
            />
          </div>
          <hr className="my-3" />
          <h1 className="section-title">Medallion Owner Details</h1>
          <div className="medallion-info  w-25">
            <div className="medallion-basic">
              {entityDetails.entity_type === "individual" ? (
                <Img className="individual"></Img>
              ) : (
                <Img name="corporation_entity"></Img>
              )}

              <div>
                <h1 className="medallion-owner-name">
                  {entityDetails.entity_name}
                </h1>
                <p className="driver-ssn regular-text">
                  Owner Type : {capitalizeWords(entityDetails.entity_type)}
                </p>
              </div>
            </div>
            <Divider className="custom-hr" />
            {/* EIN */}
            {entityDetails.entity_type === "individual" ? (
              <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                <span className="regular-text">SSN</span>
                <span className="fw-semibold">{entityDetails.ssn}</span>
              </div>
            ) : (
              <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                <span className="regular-text">EIN</span>
                <span className="fw-semibold">{entityDetails.ein}</span>
              </div>
            )}

            {/* Address */}
            <div className="d-flex gap-2 regular-text">
              {/* <FaMapMarkerAlt className="text-secondary mt-1" /> */}
              <Img className="icon" name="ic_location" />
              <div>
                {entityDetails.addressLine1 && (
                  <p className="mb-1">{entityDetails.addressLine1}</p>
                )}
                {entityDetails.addressLine2 && (
                  <p className="mb-1">{entityDetails.addressLine2}</p>
                )}
                <p className="mb-1">
                  {entityDetails.city}, {entityDetails.state} –{" "}
                  {entityDetails.zip}
                </p>
              </div>
            </div>
          </div>

          <div className="section-title px-2 mt-3">
            <div className="d-flex align-items-center mt-3">
              <p>Documents</p>
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
                  {/* <BUpload
                    data={{ ...document_data }}
                    object_type="medallion_owner"
                    object_id={data?.medallion_owner_id}
                    document_id={0}
                    document_type={[
                      {
                        name: "Others",
                        code: "others",
                      },
                    ]}
                  ></BUpload> */}
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
              <p>No Documents Found</p>
            )}
          </div>

          <div className="mt-3">
            <p className="section-title p-0 mb-2">Medallion List</p>
            <DataTableComponent
              columns={columns}
              data={medallionList}
              renderColumn={customRender}
              onPageChange={onPageChange}
              emptyMessage={"No records found"}
              totalRecords={data?.medallions?.total_count}
              dataKey="id"
              // filterData={filterData}
              // filterSearchData={searchFilterData}
              // clearAllFilter={clearAllFilter}
              // clearFilter={clearFilter}
              // pSortField={sortField}
              // pSortOrder={sortOrder}
              // searchData={searchData}
              // filterApply={filterApply}
              // onSortApply={onSortApply}
              // filterSearchBy={filterSearchBy}
              // filterApplyList={filterApplyList}
              // fieldMapping={fieldMapping}
            />
          </div>
          <div>
            <p className="section-title p-0 mb-3">Audit Trail History</p>
            {data?.history.length > 0 ? (
              <Timeline
                value={data?.history}
                className="custom-timeline"
                data-testid="audit-trail-timeline"
                marker={customizedMarker}
                content={customizedContent}
              />
            ) : (
              <p className="text-center text-secondary">
                Audit Trial History is not available
              </p>
            )}
          </div>

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
      </>
    </div>
  );
};

export default ViewOwner;
