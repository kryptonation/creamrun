import { BreadCrumb } from "primereact/breadcrumb";
import { Link, useParams } from "react-router-dom";
import DocViewer from "../docViewer";
import { useGetMedallionOwnerDetailsQuery } from "../../redux/api/medallionApi";
import DocumentGridViewOnly from "../../components/DocumentGridViewOnly";

const ManageMedallionDocLayout = () => {
  const params = useParams();
  // const { data, isSuccess } = useGetMedallionDocumentQuery(params.id, { skip: !params.id });
  const { data, isSuccess } = useGetMedallionOwnerDetailsQuery(
    {
      id: params.id,
    },
    { skip: !params.id }
  );
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
        <Link to={`/manage-owner`} className="font-semibold text-grey">
          Medallion
        </Link>
      ),
    },
    {
      label: "Demo",
      template: () => (
        <Link to={`/manage-owner`} className="font-semibold text-black">
          Manage Owner
        </Link>
      ),
    },
  ];
  console.log("ManageMedallionOwnerDocLayout", data);
  return (
    <div className="common-layout w-100 h-100 ">
      <div className="d-flex justify-content-between flex-column">
        <BreadCrumb
          model={items}
          separatorIcon="/"
          className="bg-transparent p-0"
          pt={{ menu: "p-0" }}
        />
        <p className="topic-txt">{data?.entity_name}</p>
      </div>
      <DocumentGridViewOnly
        data={data?.documents}
        isSuccess={isSuccess}
      ></DocumentGridViewOnly>
    </div>
  );
};

export default ManageMedallionDocLayout;
