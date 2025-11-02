import BBreadCrumb from "../../../components/BBreadCrumb";
import { Link, useParams } from "react-router-dom";
import BCaseCard from "../../../components/BCaseCard";
import { useIndividualEzpassQuery } from "../../../redux/api/ezpassApi";

const ViewEzpassDetail = () => {
  const params = useParams();
  const breadcrumbItems = [
    {
      label: "Home",
      template: () => (
        <Link to="/" className="font-semibold text-grey">
          Home
        </Link>
      ),
    },
    {
      label: "Miscellaneous",
      template: () => (
        <Link to="/miscellaneous" className="font-semibold text-grey">
          Miscellaneous
        </Link>
      ),
    },
    {
      label: "Manage vehicle",
      template: () => (
        <Link to={`/miscellaneous/manage-ezpass`} className="font-semibold text-grey">
          Manage Ezpass
        </Link>
      ),
    },
    {
      label: "id",
      template: () => (
        <Link
          to={`/miscellaneous/manage-ezpass/${params["id"]}`}
          className="font-semibold text-black"
        >
          {params["id"]}
        </Link>
      ),
    },
  ];

  const { data } = useIndividualEzpassQuery(params["id"]);

  return (
    <div className="common-layout w-100 h-100 d-flex flex-column gap-4">
      <div>
        <BBreadCrumb breadcrumbItems={breadcrumbItems} separator="/" />
        <p className="topic-txt">Individual Ezpass</p>
      </div>
      <form className="common-form d-flex flex-column">
        <div className="form-section">
          <div className="form-body d-flex common-gap row flex-wrap">
            <p>
              <u className="regular-semibold-text">Toll Transaction Details</u>
            </p>
            <BCaseCard
              label="Activity"
              className="col-2"
              value={data?.activity || "N/A"}
            />
            <BCaseCard
              label="Transaction Date"
              className="col-2"
              value={data?.transaction_date || "N/A"}
            />
            <BCaseCard
              label="Amount"
              className="col-2"
              value={
                data?.amount !== null ? `$${data?.amount?.toFixed(2)}` : "N/A"
              }
            />
            <BCaseCard
              label="Prepaid"
              className="col-2"
              value={
                data?.prepaid === "Y"
                  ? "Yes"
                  : data?.prepaid === "N"
                  ? "No"
                  : "N/A"
              }
            />
            <BCaseCard
              label="Status"
              className="col-2"
              value={data?.status || "N/A"}
            />
            <BCaseCard
              label="Agency"
              className="col-2"
              value={data?.agency || "N/A"}
            />

            <p>
              <u className="regular-semibold-text">Vehicle Information</u>
            </p>
            <BCaseCard
              label="Plate No"
              className="col-2"
              value={data?.plate_no || "N/A"}
            />
            <BCaseCard
              label="Vehicle Type Code"
              className="col-2"
              value={data?.vehicle_type_code || "N/A"}
            />
            <BCaseCard
              label="Vehicle ID"
              className="col-2"
              value={data?.vehicle_id || "N/A"}
            />
            <BCaseCard
              label="Medallion No"
              className="col-2"
              value={data?.medallion_no || "N/A"}
            />
            <BCaseCard
              label="Driver ID"
              className="col-2"
              value={data?.driver_id || "N/A"}
            />

            <p>
              <u className="regular-semibold-text">Entry & Exit Details</u>
            </p>
            <BCaseCard
              label="Entry Plaza"
              className="col-2"
              value={data?.entry_plaza || "N/A"}
            />
            <BCaseCard
              label="Exit Plaza"
              className="col-2"
              value={data?.exit_plaza || "N/A"}
            />
            <BCaseCard
              label="Entry Lane"
              className="col-2"
              value={data?.entry_lane || "N/A"}
            />
            <BCaseCard
              label="Exit Lane"
              className="col-2"
              value={data?.exit_lane || "N/A"}
            />
            <BCaseCard
              label="Entry Time"
              className="col-2"
              value={data?.entry_time || "N/A"}
            />
            <BCaseCard
              label="Exit Time"
              className="col-2"
              value={data?.exit_time || "N/A"}
            />

            <p>
              <u className="regular-semibold-text">Processing & Status</u>
            </p>
            <BCaseCard
              label="Posting Date"
              className="col-2"
              value={data?.posting_date || "N/A"}
            />
            <BCaseCard
              label="Is Active"
              className="col-2"
              value={data?.is_active ? "Yes" : "No"}
            />
            <BCaseCard
              label="Is Archived"
              className="col-2"
              value={data?.is_archived ? "Yes" : "No"}
            />
            <BCaseCard
              label="Created By"
              className="col-2"
              value={data?.created_by || "N/A"}
            />
            <BCaseCard
              label="Modified By"
              className="col-2"
              value={data?.modified_by || "N/A"}
            />
            <BCaseCard
              label="Created On"
              className="col-2"
              value={data?.created_on || "N/A"}
            />
            <BCaseCard
              label="Updated On"
              className="col-2"
              value={data?.updated_on || "N/A"}
            />
            <BCaseCard
              label="Associate Failed Reason"
              className="col-2"
              value={data?.associate_failed_reason || "N/A"}
            />
            <BCaseCard
              label="Post Failed Reason"
              className="col-2"
              value={data?.post_failed_reason || "N/A"}
            />

            <p>
              <u className="regular-semibold-text">Import Log Details</u>
            </p>
            <BCaseCard
              label="Log ID"
              className="col-2"
              value={data?.log_id || "N/A"}
            />
            <BCaseCard
              label="Log Status"
              className="col-2"
              value={data?.log?.status || "N/A"}
            />
            <BCaseCard
              label="Log Date"
              className="col-2"
              value={data?.log?.log_date?.split("T")[0] || "N/A"}
            />
            <BCaseCard
              label="Log Time"
              className="col-2"
              value={data?.log?.log_date?.split("T")[1] || "N/A"}
            />
            <BCaseCard
              label="Records Impacted"
              className="col-2"
              value={data?.log?.records_impacted ?? "N/A"}
            />
            <BCaseCard
              label="Unidentified Count"
              className="col-2"
              value={data?.log?.unidentified_count ?? "N/A"}
            />
            <BCaseCard
              label="Success Count"
              className="col-2"
              value={data?.log?.success_count ?? "N/A"}
            />
            <BCaseCard
              label="Log Archived"
              className="col-2"
              value={data?.log?.is_archived ? "Yes" : "No"}
            />
            <BCaseCard
              label="Log Active"
              className="col-2"
              value={data?.log?.is_active ? "Yes" : "No"}
            />
            <BCaseCard
              label="Log Created On"
              className="col-2"
              value={data?.log?.created_on || "N/A"}
            />
            <BCaseCard
              label="Log Updated On"
              className="col-2"
              value={data?.log?.updated_on || "N/A"}
            />
          </div>
        </div>
      </form>
    </div>
  );
};

export default ViewEzpassDetail;
