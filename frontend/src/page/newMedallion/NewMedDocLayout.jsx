import { BreadCrumb } from "primereact/breadcrumb";
import { Link, useParams } from "react-router-dom";
import DocViewer from "../docViewer";
import { useGetMedallionDocumentQuery } from "../../redux/api/medallionApi";
import DocumentGridViewOnly from "../../components/DocumentGridViewOnly";

const NewMedDocLayout = () => {
  const params = useParams();
  const { data, isSuccess } = useGetMedallionDocumentQuery(params.id, {
    skip: !params.id,
  });
  const items = [
    {
      label: "Demo1",
      template: () => (
        <Link to="/" className="font-semibold text-grey">
          Home
        </Link>
      ),
    },
    {
      label: "Demo2",
      template: () => (
        <Link to="/new-medallion" className="font-semibold text-grey">
          Medallion
        </Link>
      ),
    },
    {
      label: "Demo3",
      template: () => (
        <Link
          to={`/new-medallion/${params["case-id"]}`}
          className="font-semibold text-grey"
        >
          New Medallion{" "}
        </Link>
      ),
    },
    {
      label: "Demo4",
      template: () => (
        <Link to="" className="font-semibold text-black">
          {data?.medallion_details?.medallion_owner_name}
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
      <DocumentGridViewOnly
        data={data?.documents}
        isSuccess={isSuccess}
      ></DocumentGridViewOnly>
    </div>
  );
};

export default NewMedDocLayout;
