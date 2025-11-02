import { useFormik } from "formik";
import { medallionLeaseCancel as variable } from "../../../utils/variables";
import BInputFields from "../../../components/BInputFileds";
import {  useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import BSuccessMessage from "../../../components/BSuccessMessage";
import { useState } from "react";

const LeasePayment = () => {
    const [isOpen, setOpen] = useState(false)
    const navigate = useNavigate();
    const formik = useFormik({
        initialValues: {
            renewalDate: "",
        },
        validateOnChange: false,
    });

    return (
        <>
            <form
                className="common-form d-flex flex-column"
                onSubmit={formik.handleSubmit}
            >
                <div className="form-section">
                    <div className="form-body" style={{ backgroundColor: '#EEEEEE', padding: 10, paddingBottom: 50 }}>

                        <div className="d-flex align-items-center flex-wrap form-grid-1">

                            {variable.map((item,idx) => (
                                <div key={idx} style={{
                                    marginLeft: '20px', marginRight: '20px', marginTop: '20px', marginBottom: '20px', ...(item.size === 'xl' && { width: '100%' })
                                }}>
                                    <BInputFields variable={item} formik={formik} />
                                </div>
                            ))}
                        </div>

                    </div>

                </div>

            </form>
            <div style={{ paddingBottom: 30 }}>
                <Button
                    label="Submit Payee Details"
                    severity="warning"
                    className="border-radius-0 primary-btn mt-5"
                    onClick={() => setOpen(true)}
                />
            </div>
            <BSuccessMessage isOpen={isOpen} message="Medallion 5X24 is ready for storage" title="Medallion Storage Process Updated" onCancel={() => {
                 setOpen(false); navigate('/manage-medallion', { replace: true });
            }} onConfirm={() => {
                 setOpen(false); navigate('/manage-medallion', { replace: true });
            }}></BSuccessMessage>
        </>
    )
}

export default LeasePayment;
