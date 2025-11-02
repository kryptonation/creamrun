import { Link, useParams } from "react-router-dom";
import BBreadCrumb from "../../components/BBreadCrumb";
import BCaseCard from "../../components/BCaseCard";
import BMapRender from "../../components/BMapRender";
import { useEffect, useState } from "react";
import { useGetCurbQuery } from "../../redux/api/curbApi";

const IndividualTrip = () => {
  const { id } = useParams();
  const items = [
    {
      template: () => (
        <Link to="/" className="font-semibold text-grey">
          Home
        </Link>
      ),
    },
    {
      template: () => (
        <Link to="/view-trips" className="font-semibold text-grey">
          Trips
        </Link>
      ),
    },
    {
      template: () => (
        <Link to={`/view-trips`} className="font-semibold text-grey">
          View Trips
        </Link>
      ),
    },
    {
      template: () => (
        <Link to={`/view-trips/${id}`} className="font-semibold text-black">
          {id}
        </Link>
      ),
    },
  ];

  const { data } = useGetCurbQuery(`/${id}`);

  const [tripData, setTripData] = useState();
  useEffect(() => {
    if (data)
      setTripData([
        { label: "Trip ID", value: data.trip_id },
        { label: "Driver ID", value: data.driver_id },
        { label: "Driver Name", value: "Michel Rahman" },
        { label: "Vehicle plate", value: data.cab_number || "N/A" },
        { label: "Medallion No", value: "1P43" },
        { label: "Medallion Owner", value: "Jose Smith" },
        { label: "TLC License No", value: "05732414" },
        { label: "Lease Type", value: "DOV" },
        { label: "Date", value: data.start_datetime?.split("T")[0] || "N/A" },
        { label: "Shift", value: "Day" },
        {
          label: "Trip Begin",
          value: data.start_datetime?.split("T")[1]?.slice(0, 5) || "N/A",
        },
        {
          label: "Trip End",
          value: data.end_datetime?.split("T")[1]?.slice(0, 5) || "N/A",
        },
        {
          label: "Time",
          value: (() => {
            const start = new Date(data.start_datetime);
            const end = new Date(data.end_datetime);
            const diff = Math.floor((end - start) / 60000); // duration in minutes
            return isNaN(diff) ? "N/A" : `${diff}`;
          })(),
        },
        { label: "Card", value: data.payment_type === "$" ? "Cash" : "Card" },
        { label: "Total", value: data.total_amount?.toFixed(2) || "0.00" },
        { label: "Amount", value: data.trip_amount?.toFixed(2) || "0.00" },
        { label: "Extras", value: data.extras?.toFixed(2) || "0.00" },
        { label: "Tolls", value: data.tolls?.toFixed(2) || "0.00" },
        { label: "Tips", value: data.tips?.toFixed(2) || "0.00" },
        { label: "MTA Tax", value: data.tax?.toFixed(2) || "0.00" },
        { label: "IMP Tax", value: data.imp_tax?.toFixed(2) || "0.00" },
        { label: "CPS Tax", value: data.cps_tax?.toFixed(2) || "2.50" }, // fallback static value
        { label: "AAF Tax", value: data.aaf_tax?.toFixed(2) || "0.00" },
        {
          label: "Card Number",
          value: data.cc_number || "4155 60XX XXXX XXXX",
        },
      ]);
  }, [data]);

  return (
    <div className="common-layout w-100 h-100 d-flex flex-column gap-4">
      <div>
        <BBreadCrumb breadcrumbItems={items} separator={"/"} />
        <p className="topic-txt">View Trips</p>
      </div>
      <div className="w-100 d-flex justify-content-between">
        <div className="w-60 common-form-padding d-flex justify-content-between row-gap-4 row">
          {tripData?.map(({ label, value }, idx) => {
            return (
              <div key={idx} className="col-3">
                <BCaseCard label={label} value={value}></BCaseCard>
              </div>
            );
          })}
        </div>
        <div className="w-40 border">
          <BMapRender />
        </div>
      </div>
    </div>
  );
};

export default IndividualTrip;
