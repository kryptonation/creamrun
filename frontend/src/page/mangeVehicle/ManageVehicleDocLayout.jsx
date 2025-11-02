
import { BreadCrumb } from 'primereact/breadcrumb';
import { Link, useParams } from 'react-router-dom';
import DocViewer from '../docViewer';
import { useGetVehicleDocumentQuery } from '../../redux/api/vehicleApi';

const ManageVehicleDocLayout = () => {
    const params = useParams();
    const { data, isSuccess } = useGetVehicleDocumentQuery(params.id, { skip: !params.id });
    const items = [
        { label: 'Demo', template: () => <Link to="/" className="font-semibold text-grey">Home</Link> },
        { label: 'Demo', template: () => <Link to="/manage-vehicle" className="font-semibold text-grey">Vehicle</Link> },
        { label: 'Demo', template: () => <Link to={`/manage-vehicle`} className="font-semibold text-grey">Manage Vehicle</Link> },
      ];
    return (
      <div className='common-layout w-100 h-100 '>
        <div className='d-flex justify-content-between flex-column'>
          <BreadCrumb model={items} separatorIcon="/" className='bg-transparent p-0' pt={{ menu: "p-0" }} />
          <p className="topic-txt">{data?.medallion_details?.medallion_owner_name}</p>
          {/* <p className='regular-text text-grey'>Big City Taxi Holding</p> */}
        </div>
        <DocViewer data={data} isSuccess={isSuccess}></DocViewer>
      </div>
    )
}

export default ManageVehicleDocLayout