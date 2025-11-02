import React, { useEffect } from 'react'
import BBreadCrumb from '../../../components/BBreadCrumb'
import { Link, useParams } from 'react-router-dom';
import BCaseCard from '../../../components/BCaseCard';
import BAttachedFile from '../../../components/BAttachedFile';
import { useLazyViewInspectionQuery } from '../../../redux/api/vehicleApi';

const ViewInspectionDetail = () => {
    const params = useParams();
    const breadcrumbItems = [
        { label: 'Home', template: () => <Link to="/" className="font-semibold text-grey">Home</Link> },
        { label: 'Vehicle', template: () => <Link to="/manage-vehicle" className="font-semibold text-grey">Vehicle</Link> },
        { label: 'Manage vehicle', template: () => <Link to={`/manage-vehicle`} className="font-semibold text-grey">Manage vehicle</Link> },
        { label: 'id', template: () => <Link to={`/manage-vehicle/view-inspection/${params["id"]}`} className="font-semibold text-black">{params["id"]}</Link> },
    ];
    const [triggerSearchQuery, { data }] = useLazyViewInspectionQuery();
    useEffect(() => {
        const queryParams = new URLSearchParams({
            inspection_id: params["individual-id"]
        });
        triggerSearchQuery(`?${queryParams.toString()}`)
    }, [])
    return (
        <div className='common-layout w-100 h-100 d-flex flex-column gap-4'>
            <div>
                <BBreadCrumb breadcrumbItems={breadcrumbItems} separator="/" />
                <p className="topic-txt">View Inspection</p>
            </div>
            <form
                className="common-form d-flex flex-column"
            >
                <div className="form-section">
                    <div className="form-body" >
                        <div className="form-body d-flex common-gap row">
                            <BCaseCard label={"Inspection Type"} className={"col-3"} value={data?.items?.[0]?.inspection_type} />
                            <BCaseCard label={"Mile Run"} className={"col-8"} value={data?.items?.[0]?.mile_run} />
                            <BCaseCard label={"Inspection Date"} className={"col-3"} value={data?.items?.[0]?.inspection_date} />
                            <BCaseCard label={"Inspection Time"} className={"col-8"} value={data?.items?.[0]?.inspection_time} />
                            <BCaseCard label={"Odometer Date"} className={"col-3"} value={data?.items?.[0]?.odometer_reading_date} />
                            <BCaseCard label={"Odometer Reading Time"} className={"col-3"} value={data?.items?.[0]?.odometer_reading} />
                            <BCaseCard label={"Odometer Reading"} className={"col-5"} value={data?.items?.[0]?.odometer_reading} />
                            <BCaseCard label={"Logged Date"} className={"col-3"} value={data?.items?.[0]?.logged_date} />
                            <BCaseCard label={"Logged Time"} className={"col-3"} value={data?.items?.[0]?.logged_time} />
                            <BCaseCard label={"Result"} className={"col-5"} value={data?.items?.[0]?.result} />
                            <BCaseCard label={"Inspection Fee"} className={"col-3"} value={data?.items?.[0]?.inspection_fee} />
                            <BCaseCard label={"Next Inspection Due"} className={"col-3"} value={data?.items?.[0]?.next_inspection_due_date} />
                        </div>
                    </div>
                </div>
            </form>
            <div>
                <p className="topic-txt">Documents</p>
                {data?.items?.[0]?.documents?.length ?null: <p className='regular-text'>No data found</p>}
                <div className='d-flex align-items-center gap-3 flex-wrap pb-5'>
                    {data?.items?.[0]?.documents?.map((file, index) => {
                        return <BAttachedFile key={index} file={{
                            name: file?.document_name,
                            path: file?.presigned_url
                        }}></BAttachedFile>
                    })}
                </div>
            </div>
        </div>
    )
}

export default ViewInspectionDetail