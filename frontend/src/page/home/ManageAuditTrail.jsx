import { Link } from 'react-router-dom';
import BBreadCrumb from '../../components/BBreadCrumb';
import Img from '../../components/Img';
import BCaseCard from '../../components/BCaseCard';
import { Timeline } from 'primereact/timeline';
import { Button } from 'primereact/button';
import { useFormik } from 'formik';
import BInputText from '../../components/BInputText';
import BModal from '../../components/BModal';
import BUpload from '../../components/BUpload';

const ManageAuditTrail = () => {
    const items = [
        { label: 'Demo', template: () => <Link to="/" className="font-semibold text-grey">Home</Link> },
        { label: 'Demo', template: () => <Link to="/miscellaneous" className="font-semibold text-grey">Miscellaneous</Link> },
        { label: 'Demo', template: () => <Link to={`/miscellaneous/manage-user-role`} className="font-semibold text-black">Manage User Roles</Link> },
    ];
    const events = [
        { status: 'Medallion successfully created.', date: '12/24/2024 | 10:30:00 AM', opposite: false },
        { status: 'Assigned to Vehicle 4T4LWRZV6VW122447.', date: '12/24/2024 | 10:30:00 AM', opposite: false },
        { status: 'Hack-Up Completed.', date: '12/24/2024 | 10:30:00 AM', opposite: false },
        { status: 'DOV lease created for Driver 117439', date: '12/24/2024 | 10:30:00 AM', opposite: false },
    ];
    const customizedMarker = () => {
        return (
            <Img name="in_active_tick" className="icon-green" />
        );
    };
    const customizedContent = (item) => {
        return (
            <>
                <p className='regular-semibold-text'>{item.date}</p>
                <p className='fw-small'>{item.status}</p>
            </>
        );
    };
    const formik = useFormik({
        initialValues: {
        },
        validateOnChange: true,
    });
    const getFile = () => {
        let upload = {}
        // if (currentStepId === MO_UPDATE_PAYEE_DOCUMENT_VERIFY) {
        // upload = {
        //     data: currentStepData?.medallion_owner_payee_proofs,
        //     object_type: currentStepData.object_type,
        //     object_id: currentStepData?.medallion_id,
        //     document_id: 0,
        //     document_type: [{ name: 'Medallion Payee Proof', code: currentStepData.document_type }],
        // }
        // }
        return upload
    }
    return (
        <div className='common-layout w-100 h-100 d-flex flex-column gap-4'>
            <div>
                <BBreadCrumb breadcrumbItems={items} separator={"/"} />
                <p className="topic-txt">1P43</p>
            </div>
            <div className='d-flex align-items-center'>
                <Img name="lease" />
                <p className="topic-txt">Manage Audit Trail</p>
            </div>
            <div className="d-flex align-items-center gap-5">
                <BCaseCard label="Audit ID" value="Audit ID" />
                <BCaseCard label="Audit ID" value="Audit ID" />
                <BCaseCard label="Audit ID" value="Audit ID" />
                <BCaseCard label="Audit ID" value="Audit ID" />
                <BCaseCard label="Audit ID" value="Audit ID" />
            </div>
            <div>
                <p className="topic-txt">Description</p>
                <p className="regular-text">Additional document provided by Medallion owner</p>
            </div>
                <form
                    action=""
                    className="common-form d-flex flex-column gap-5"
                    onSubmit={formik.handleSubmit}
                >
                    <div className="form-section">
                        <div className="form-body">
                           <p className='regular-semibold-text mb-4 '>Remarks</p>
                            <BInputText variable={{
                                id: "remarks",
                                label: "Enter your remarks",
                            }} formik={formik}></BInputText>
                           <p className='regular-semibold-text mt-3 '>Remarks</p>
                           <BModal>
                                    <BModal.ToggleButton>
                                        <Button
                                            text
                                            label="Upload Documents"
                                            data-testId="upload-documents"
                                            className=" gap-2"
                                            type="button"
                                            icon={() => <Img name="upload" />}
                                        />
                                    </BModal.ToggleButton>
                                    <BModal.Content >
                                        <BUpload {...getFile()}></BUpload>
                                    </BModal.Content>
                                </BModal>
                    <div className="w-100 position-sticky bottom-0 py-3 ">
                        <Button
                            // disabled={!hasAccess}
                            label="Submit Details"
                            type="submit"
                            severity="warning"
                            className="border-radius-0 primary-btn "
                        />
                    </div>
                        </div>
                    </div>
                    {/* <BSuccessMessage
                isOpen={isOpen}
                message={`Vehicle Repair Details is successful Submitted for VIN No 4T3LWRFV5VW102437`}
                title="Vehicle Repairs Successful"
                onCancel={(e) => {
                    setOpen(false); navigate('/manage-medallion', { replace: true });
                }}
                onConfirm={(e) => {
                    setOpen(false); navigate('/manage-medallion', { replace: true });
                }}
            /> */}
                </form>
                <p className="topic-txt">Audit Trail History</p>
                <Timeline value={events}
                    className='custom-timeline'
                    //  content={(item) => item.status} 
                    marker={customizedMarker}
                    content={customizedContent}
                />
        </div>
    )
}

export default ManageAuditTrail