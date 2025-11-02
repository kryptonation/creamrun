import React, { useEffect } from "react";
import BBreadCrumb from "../../../components/BBreadCrumb";
import { Link, useParams, useLocation } from "react-router-dom";
import BCaseCard from "../../../components/BCaseCard";
import { yearMonthDate } from "../../../utils/dateConverter";
const ViewLedger = () => {
  const params = useParams();
  console.log(params);
  const location = useLocation();
  console.log(location.state);
  const items = [
    {
      template: () => (
        <Link to="/" className="font-semibold text-grey">
          Payments
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
        <Link to="/manage-ledger-entry" className="font-semibold text-black">
          {params.driverId}
        </Link>
      ),
    },
  ];

  return (
    <div className="common-layout w-100 h-100 d-flex flex-column gap-4">
      <div>
        <BBreadCrumb breadcrumbItems={items} separator="/" />
        <p className="topic-txt">View</p>
      </div>
      <form className="common-form d-flex flex-column">
        <div className="form-section">
          <div className="form-body">
            <div className="form-body d-flex common-gap row">
              <BCaseCard
                label={"Ledger ID"}
                className={"col-md-3"}
                value={location.state?.ledger_id}
              />
              <BCaseCard
                label={"Date"}
                className={"col-md-3"}
                value={yearMonthDate(location.state?.created_on)}
              />
              <BCaseCard
                label={"Driver ID"}
                className={"col-md-3"}
                value={location.state?.driver_id}
              />
              <BCaseCard
                label={"Medallion No"}
                className={"col-md-3"}
                value={location.state?.medallion_number}
              />
              <BCaseCard
                label={"VIN No"}
                className={"col-md-3"}
                value={location.state?.vin}
              />
              <BCaseCard
                label={"Amount"}
                className={"col-md-3"}
                value={"$" + String(location.state?.amount)}
              />
              <BCaseCard
                label={"Dr/Cr"}
                className={"col-md-3"}
                value={
                  location.state?.transaction_type === "DEBIT"
                    ? "Pay To Driver"
                    : "Pay To Big Apple"
                }
              />
              <BCaseCard
                label={"Transaction Type"}
                className={"col-md-3"}
                value={location.state?.source_type}
              />

              {/* <BCaseCard
                label={"Source Type"}
                className={"col-md-3"}
                value={location.state?.source_type}
              />
              <BCaseCard
                label={"Source ID"}
                className={"col-md-3"}
                value={location.state?.source_id}
              /> */}

              <BCaseCard
                label={"Description"}
                className={"col-12"}
                value={location.state?.description}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ViewLedger;
