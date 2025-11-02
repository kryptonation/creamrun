import BBreadCrumb from "../../../components/BBreadCrumb";
import { Link, useParams } from "react-router-dom";
import BCaseCard from "../../../components/BCaseCard";
import { useGetpvbQuery } from "../../../redux/api/pvbApi";
import { Fragment } from "react";

const ViewPvbDetail = () => {
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
        <Link to={`/miscellaneous/manage-pvb`} className="font-semibold text-grey">
          Manage PVB
        </Link>
      ),
    },
    {
      label: "id",
      template: () => (
        <Link
          to={`/miscellaneous/manage-pvb/${params["id"]}`}
          className="font-semibold text-black"
        >
          {params["id"]}
        </Link>
      ),
    },
  ];

  const { data } = useGetpvbQuery(`/${params["id"]}`);
const fieldGroups = [
  {
    section: "Vehicle & Ticket Details",
    fields: [
      { key: "plate_number", label: "Plate Number" },
      { key: "state", label: "State" },
      { key: "vehicle_type", label: "Vehicle Type" },
      { key: "summons_number", label: "Summons Number" },
      { key: "issue_date", label: "Issue Date" },
      { key: "issue_time", label: "Issue Time" },
    ],
  },
  {
    section: "Payment & Association Info",
    fields: [
      { key: "amount_due", label: "Amount Due", isCurrency: true },
      { key: "amount_paid", label: "Amount Paid", isCurrency: true },
      { key: "status", label: "Status" },
      { key: "driver_id", label: "Driver ID" },
      { key: "medallion_id", label: "Medallion ID" },
      { key: "vehicle_id", label: "Vehicle ID" },
      { key: "associated_failed_reason", label: "Associate Failed Reason" },
      { key: "post_failed_reason", label: "Post Failed Reason" },
    ],
  },
];
  return (
    <div className="common-layout w-100 h-100 d-flex flex-column gap-4">
      <div>
        <BBreadCrumb breadcrumbItems={breadcrumbItems} separator="/" />
        <p className="topic-txt">Individual PVB</p>
      </div>
      <form className="common-form d-flex flex-column">
  <div className="form-section">
    <div className="form-body d-flex common-gap row flex-wrap">
      {data && fieldGroups.map((group, index) => (
        <Fragment key={index}>
          <p>
            <u className="regular-semibold-text">{group.section}</u>
          </p>
          {group.fields.map((field) => {
            const rawValue = data[field.key];
            const value =
              rawValue === null || rawValue === undefined || rawValue === ""
                ? "N/A"
                : field.isCurrency
                ? `$${parseFloat(rawValue).toFixed(2)}`
                : rawValue;
            return (
              <BCaseCard
                key={field.key}
                label={field.label}
                className="col-2"
                value={value}
              />
            );
          })}
        </Fragment>
      ))}
    </div>
  </div>
</form>
    </div>
  );
};

export default ViewPvbDetail;
