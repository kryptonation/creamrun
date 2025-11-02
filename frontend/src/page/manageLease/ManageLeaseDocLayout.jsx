import { BreadCrumb } from "primereact/breadcrumb";
import { Link, useParams } from "react-router-dom";
import DocViewer from "../docViewer";
import { useGetMedallionDocumentQuery } from "../../redux/api/medallionApi";
import { useGetLeaseDocumentQuery } from "../../redux/api/leaseApi";
import DocumentGridViewOnly from "../../components/DocumentGridViewOnly";
import BModal from "../../components/BModal";
import BUpload from "../../components/BUpload";
import { Button } from "primereact/button";
import Img from "../../components/Img";

const ManageLeaseDocLayout = () => {
  const params = useParams();
  const { data, isSuccess } = useGetLeaseDocumentQuery(params.id, {
    skip: !params.id,
  });
  console.log("data", data, params);
  const matchedDriver = data?.lease_details?.driver?.find(
    (driver) => driver.driver_id === params.driver_id
  );
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
        <Link to="/manage-lease" className="font-semibold text-grey">
          Lease
        </Link>
      ),
    },
    {
      template: () => (
        <Link to={`/manage-lease`} className="font-semibold text-grey">
          Manage Lease
        </Link>
      ),
    },
  ];

  const getFile = () => {
    let upload = {};

    const isAdditionalDriver = matchedDriver?.is_additional_driver;
    const objectType = isAdditionalDriver
      ? `ad-${matchedDriver?.driver_id}`
      : `co-leasee-0`;

    const docCode = isAdditionalDriver ? "additional-driver" : "others";
    const docName = isAdditionalDriver ? "Additional Driver" : "Others";

    const uploadDocOptions = [
      {
        name: docName,
        code: docCode,
      },
    ];

    const document_data = {
      document_id: "",
      document_name: "",
      document_note: "",
      document_path: "",
      document_type: docCode,
      document_date: "",
      document_object_type: objectType,
      document_object_id: data?.lease_details?.lease_id_pk,
      document_size: "",
      document_uploaded_date: "",
      presigned_url: "",
    };

    upload = {
      data: document_data,
      object_type: objectType,
      object_id: data?.lease_details?.lease_id_pk,
      document_id: 0,
      document_name: "",
      document_type: uploadDocOptions,
    };

    return upload;
  };

  return (
    <div className="common-layout w-100 h-100 ">
      <div className="d-flex justify-content-between flex-column">
        <BreadCrumb
          model={items}
          separatorIcon="/"
          className="bg-transparent p-0 regular-text"
          pt={{ menu: "p-0" }}
        />
        <p className="topic-txt">{data?.lease_details?.lease_id}</p>
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
      {/* <DocViewer data={data} isSuccess={isSuccess}></DocViewer> */}
      <DocumentGridViewOnly data={matchedDriver?.documents} />
    </div>
  );
};

export default ManageLeaseDocLayout;
