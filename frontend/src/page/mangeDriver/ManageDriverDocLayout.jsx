import { BreadCrumb } from "primereact/breadcrumb";
import { Link, useParams } from "react-router-dom";
import DocViewer from "../docViewer";
import { useGetDriverDocumentQuery } from "../../redux/api/driverApi";
import { useEffect } from "react";
import DocumentGridViewOnly from "../../components/DocumentGridViewOnly";

const ManageDriverDocLayout = () => {
  const params = useParams();
  const { data, isSuccess } = useGetDriverDocumentQuery(params.id, {
    skip: !params.id,
  });
  useEffect(() => {
    if (data) {
      console.log("ManageDriverDocLayout", data);
    }
  }, [data]);
  const items = [
    {
      label: "Demo",
      template: () => (
        <Link to="/" className="font-semibold text-grey">
          Home
        </Link>
      ),
    },
    {
      label: "Demo",
      template: () => (
        <Link to="/manage-driver" className="font-semibold text-grey">
          Driver
        </Link>
      ),
    },
    {
      label: "Demo",
      template: () => (
        <Link to={`/manage-driver`} className="font-semibold text-black">
          Manage Driver
        </Link>
      ),
    },
  ];
  return (
    <div className="common-layout w-100 h-100 ">
      <div className="d-flex justify-content-between flex-column">
        <BreadCrumb
          model={items}
          separatorIcon="/"
          className="bg-transparent p-0"
          pt={{ menu: "p-0" }}
        />
        <p className="topic-txt">
          {data?.medallion_details?.medallion_owner_name}
        </p>
        {/* <p className='regular-text text-grey'>Big City Taxi Holding</p> */}
      </div>
      {/* <DocViewer data={data} isSuccess={isSuccess}></DocViewer> */}
      <DocumentGridViewOnly data={data?.documents} />
    </div>
  );
};

export default ManageDriverDocLayout;
