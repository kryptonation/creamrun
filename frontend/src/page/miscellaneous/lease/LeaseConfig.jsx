import React from "react";
import { InputNumber } from "primereact/inputnumber";
import BBreadCrumb from "../../../components/BBreadCrumb";
import { Link, useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import { Button } from "primereact/button";
import { useGetLeaseConfigQuery, useSubmitLeaseConfigMutation } from "../../../redux/api/leaseApi";
import BSuccessMessage from "../../../components/BSuccessMessage";

const LeaseConfig = () => {
    const [submitLeaseConfig, { isSuccess }] = useSubmitLeaseConfigMutation();
    const navigate = useNavigate();

    const { data } = useGetLeaseConfigQuery();

    const breadcrumbItems = [
        {
            template: () => <Link to="/" className="font-semibold text-grey">Home</Link>,
        },
        {
            template: () => <Link to="/miscellaneous" className="font-semibold text-grey">Miscellaneous</Link>,
        },
        {
            template: () => <Link to="/miscellaneous/lease-config" className="font-semibold text-black">Configure Lease</Link>,
        }
    ];

    const formik = useFormik({
        initialValues: {
            vehicleLeaseCap: 0,
            medLease: 0,
            vehLease: 0,
            longTerm: 0,
            longTermDay: 0,
            longTermNight: 0,
            trueWeeklyDay: 0,
            trueWeeklyNight: 0,
            medallionOnly: 0,
        },
        onSubmit: async (values) => {
            const payload = {
                vehicle_lease_cap: {
                    total_amount: values.vehicleLeaseCap || 0
                },
                dov_med_lease: {
                    total_amount: values.medLease || 0
                },
                dov_veh_lease: {
                    total_amount: values.vehLease || 0
                },
                long_term_lease: {
                    day_shift_amount: values.longTermDay || 0,
                    night_shift_amount: values.longTermNight || 0,
                    total_amount: (values.longTermDay || 0) + (values.longTermNight || 0)
                },
                short_term_lease: {
                    day_shift_amount: values.trueWeeklyDay || 0,
                    night_shift_amount: values.trueWeeklyNight || 0,
                    total_amount: (values.trueWeeklyDay || 0) + (values.trueWeeklyNight || 0)
                },
                medallion_only: {
                    total_amount: values.medallionOnly || 0
                }
            };

            try {
                const res = await submitLeaseConfig(payload).unwrap();
                console.log("Lease config submitted", res);
            } catch (err) {
                console.error("Submission failed", err);
            }
        }
    });

    React.useEffect(() => {
        if (data) {
            formik.setValues({
                vehicleLeaseCap: data.vehicle_lease_cap?.total_amount || 0,
                medLease: data.dov_med_lease?.total_amount || 0,
                vehLease: data.dov_veh_lease?.total_amount || 0,
                longTermDay: data.long_term_lease?.day_shift_amount || 0,
                longTermNight: data.long_term_lease?.night_shift_amount || 0,
                longTerm: data.long_term_lease?.total_amount || 0,
                trueWeeklyDay: data.short_term_lease?.day_shift_amount || 0,
                trueWeeklyNight: data.short_term_lease?.night_shift_amount || 0,
                medallionOnly: data.medallion_only?.total_amount || 0,
            });
        }
    }, [data]);

    React.useEffect(() => {
        const day = formik.values.longTermDay || 0;
        const night = formik.values.longTermNight || 0;
        formik.setFieldValue('longTerm', day + night);
    }, [formik.values.longTermDay, formik.values.longTermNight]);

    return (
        <div className="common-layout w-100 h-100 d-flex flex-column p-3">
            <BBreadCrumb breadcrumbItems={breadcrumbItems} separator="/" />
            <p className='regular-semibold-text pb-3'>Configure Lease</p>
            <div className="lease-form" style={{ background: 'white' }}>
                <form className="common-form d-flex flex-column" onSubmit={formik.handleSubmit}>
                    <div className="form-section" style={{ padding: 40, maxWidth: 700 }}>

                        <div className="top-row">
                            <label className="sub-label w-40" style={{}}>Vehicle Lease Cap</label>
                            <InputNumber
                                data-cy="vehicleLeaseCap"
                                className="p-inputnumber-edit"
                                value={formik.values.vehicleLeaseCap}
                                onValueChange={(e) => formik.setFieldValue('vehicleLeaseCap', e.value)}
                                onBlur={formik.handleBlur}
                                mode="currency"
                                currency="USD"
                                locale="en-US"
                            />
                        </div>

                        <div className="table-header">
                            <span>Category</span>
                            <span>Amount</span>
                        </div>

                        {/* Driver Owned Vehicle */}
                        <div className="section">
                            <h4>Driver Owned Vehicle</h4>
                            <div className="sub-label-row">
                                <span className="sub-label">Weekly Lease Rate</span>

                                <span>MED Lease</span>
                                <InputNumber
                                    data-cy="medLease"
                                    value={formik.values.medLease}
                                    onValueChange={(e) => formik.setFieldValue('medLease', e.value)}
                                    onBlur={formik.handleBlur}
                                    mode="currency"
                                    currency="USD"
                                    locale="en-US"
                                />

                            </div>

                            <div className="input-row">
                                <span className="sub-label"></span>

                                <span>VEH Lease</span>
                                <InputNumber
                                    data-cy="vehLease"
                                    value={formik.values.vehLease}
                                    onValueChange={(e) => formik.setFieldValue('vehLease', e.value)}
                                    onBlur={formik.handleBlur}
                                    mode="currency"
                                    currency="USD"
                                    locale="en-US"
                                />
                            </div>
                        </div>

                        <div className="divider"></div>

                        {/* Long-Term Lease */}
                        <div className="section">
                            <h4>Long-Term Lease</h4>
                            <div className="input-row">
                                <span></span>
                                <InputNumber
                                    data-cy="longTermTotal"
                                    value={formik.values.longTerm}
                                    onValueChange={(e) => formik.setFieldValue('longTerm', e.value)}
                                    onBlur={formik.handleBlur}
                                    mode="currency"
                                    currency="USD"
                                    locale="en-US"
                                    readOnly
                                />
                            </div>
                            <div className="input-row">
                                <span className="sub-label">Weekly Lease Rate</span>
                                <span>Day Shift</span>
                                <InputNumber
                                    data-cy="longTermDay"
                                    value={formik.values.longTermDay}
                                    onValueChange={(e) => formik.setFieldValue('longTermDay', e.value)}
                                    onBlur={formik.handleBlur}
                                    mode="currency"
                                    currency="USD"
                                    locale="en-US"
                                />
                            </div>
                            <div className="input-row">
                                <span className="sub-label"></span>
                                <span>Night Shift</span>
                                <InputNumber
                                    data-cy="longTermNight"
                                    value={formik.values.longTermNight}
                                    onValueChange={(e) => formik.setFieldValue('longTermNight', e.value)}
                                    onBlur={formik.handleBlur}
                                    mode="currency"
                                    currency="USD"
                                    locale="en-US"
                                />
                            </div>
                        </div>

                        <div className="divider"></div>

                        {/* True Weekly Lease */}
                        <div className="section">
                            <h4>True Weekly Lease</h4>
                            <div className="input-row">
                                <span>Weekly Lease Rate for 1 Week or Longer</span>
                                <div className="dual-inputs">
                                    <InputNumber
                                        data-cy="trueWeeklyDay"
                                        value={formik.values.trueWeeklyDay}
                                        onValueChange={(e) => formik.setFieldValue('trueWeeklyDay', e.value)}
                                        onBlur={formik.handleBlur}
                                        mode="currency"
                                        currency="USD"
                                        locale="en-US"
                                    />
                                    <InputNumber
                                        data-cy="trueWeeklyNight"
                                        value={formik.values.trueWeeklyNight}
                                        onValueChange={(e) => formik.setFieldValue('trueWeeklyNight', e.value)}
                                        onBlur={formik.handleBlur}
                                        mode="currency"
                                        currency="USD"
                                        locale="en-US"
                                    />
                                </div>
                            </div>
                            <div className="input-row">
                                <span></span>
                                <div className="dual-labels">
                                    <span>12 – Hour Day Shifts</span>
                                    <span>12 – Hour Night Shifts</span>
                                </div>
                            </div>
                        </div>

                        <div className="divider"></div>

                        {/* Medallion Only Lease */}
                        <div className="section">
                            <h4>Medallion – Only Lease</h4>
                            <div className="input-row">
                                <span>Weekly Lease Rate</span>
                                <InputNumber
                                    data-cy="medallionOnly"
                                    value={formik.values.medallionOnly}
                                    onValueChange={(e) => formik.setFieldValue('medallionOnly', e.value)}
                                    onBlur={formik.handleBlur}
                                    mode="currency"
                                    currency="USD"
                                    locale="en-US"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="w-100 position-sticky bottom-0 py-3 bg-white">
                        <Button
                            data-cy="submitLeaseConfigBtn"
                            label="Submit Lease Details"
                            type="submit"
                            severity="warning"
                            className="border-radius-0 primary-btn "
                        />
                    </div>
                </form>
            </div >
            <BSuccessMessage
                isOpen={isSuccess}
                message={"Lease Configuration Changes are Successfully Submitted."}
                title="Lease Configuration Success"
                onCancel={() => navigate("/manage-lease")}
                onConfirm={() => navigate("/manage-lease")}
            />
        </div >
    );
};

export default LeaseConfig;
