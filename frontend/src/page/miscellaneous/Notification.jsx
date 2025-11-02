import React, { useEffect, useRef, useState } from "react";
import { useFormik } from "formik";
import BInputFields from '../../components/BInputFileds';
import { dmvLicenseExpiry, driverLeaseExpiry, medallionRenewal, notificationLeaseExpriy, tlcLicenseExpiry, vehicleRegistration } from "../../utils/variables";
import BBreadCrumb from '../../components/BBreadCrumb';
import { Button } from 'primereact/button';
import { useCreateNotificationConfigMutation } from "../../redux/api/notificationApi"
import BSelectWithSearch from '../../components/BSelectWithSearch';
import { useLazyOwnerListQuery } from '../../redux/api/medallionApi';
import { useSearchDriverMutation } from '../../redux/api/driverApi';
import { useGetUsersMutation } from "../../redux/api/authAPI";
import BToast from "../../components/BToast";
import { Link } from "react-router-dom";

const Notification = () => {
    const [notificationLeaseExpriyVar, setNotificationLeaseExpriy] = useState(notificationLeaseExpriy)
    const [medallionRenewalVar, setMedallionRenewalVar] = useState(medallionRenewal)
    const [driverLeaseExpiryVar, setDriverLeaseExpiryVar] = useState(driverLeaseExpiry)
    const [tlcLicenseExpiryVar, setTlcLicenseExpiryVar] = useState(tlcLicenseExpiry)
    const [dmvLicenseExpiryVar, setDmvLicenseExpiryVar] = useState(dmvLicenseExpiry)
    const [vehicleRegistrationVar, setVehicleRegistrationVar] = useState(vehicleRegistration)
    const toast = useRef(null);


    const [createNotificationConfig, { isSuccess }] = useCreateNotificationConfigMutation();

    const [triggerSearchQuery, { data }] = useLazyOwnerListQuery({ skip: true })
    const [triggerSearchDriverQuery, { data: driverSearchDetail }] = useSearchDriverMutation();
    const [getUserSearch, { data: batUser }] = useGetUsersMutation();

    const [searhForItem, setSearchForItem] = useState(null);

    const generateChannels = (text, email, inApp) => {
        const channels = [];
        if (inApp) channels.push("in_app");
        if (email) channels.push("email");
        if (text) channels.push("sms");
        return channels.join(",");
    }
    const idToFormikFieldMap = {
        medallionOwner: "user",
        medallionRenewalMedallionOwner: "medallionRenewalUser",
        driverLeaseMedallionOwner: "driverLeaseUser",
        tlcMedallionOwner: "tlcUser",
        dmvMedallionOwner: "dmvUser",
        vehicleMedallionOwner: "vehicleUser",
    };
    const getRecipientName = (user, key) => {
        const formikField = idToFormikFieldMap[key];
        if (formikField && formik?.values?.[formikField] === "Yes") {
            return user.first_name ?? ""
        } else if (key === "medallionOwner" || key === "medallionRenewalMedallionOwner") {
            return user.owner_name ?? ""
        } else if (key === "driverLeaseMedallionOwner" ||
            key === "tlcMedallionOwner" ||
            key === "dmvMedallionOwner" ||
            key === "vehicleMedallionOwner") {
            return user?.driver_details?.first_name ?? ""
        }
        return ""
    }

    const getRecipientEmail = (user, key) => {
        const formikField = idToFormikFieldMap[key];
        if (formikField && formik?.values?.[formikField] === "Yes") {
            return user.email_address
        } else if (key === "medallionOwner" || key === "medallionRenewalMedallionOwner") {
            return user.email_address
        } else if (key === "driverLeaseMedallionOwner" ||
            key === "tlcMedallionOwner" ||
            key === "dmvMedallionOwner" ||
            key === "vehicleMedallionOwner") {
            return user?.driver_details?.email_address
        }
        return ""
    }

    const getRecipientPhone = (user, key) => {
        const formikField = idToFormikFieldMap[key];
        if (formikField && formik?.values?.[formikField] === "Yes") {
            return user?.contact_number
        } else if (key === "medallionOwner" || key === "medallionRenewalMedallionOwner") {
            return user?.contact_number
        } else if (key === "driverLeaseMedallionOwner" ||
            key === "tlcMedallionOwner" ||
            key === "dmvMedallionOwner" ||
            key === "vehicleMedallionOwner") {
            return user?.driver_details?.phone_number_1
        }
        return ""
    }

    const getRecipientId = (user, key) => {
        const formikField = idToFormikFieldMap[key];
        if (formikField && formik?.values?.[formikField] === "Yes") {
            return user?.id
        } else if (key === "medallionOwner" || key === "medallionRenewalMedallionOwner") {
            return user.medallion_owner_id
        } else if (key === "driverLeaseMedallionOwner" ||
            key === "tlcMedallionOwner" ||
            key === "dmvMedallionOwner" ||
            key === "vehicleMedallionOwner") {
            return user?.driver_details?.driver_id
        }
        return ""
    }

    const searchData = (item, value) => {
        setSearchForItem(item);

        const idToFormikFieldMap = {
            medallionOwner: "user",
            medallionRenewalMedallionOwner: "medallionRenewalUser",
            driverLeaseMedallionOwner: "driverLeaseUser",
            tlcMedallionOwner: "tlcUser",
            dmvMedallionOwner: "dmvUser",
            vehicleMedallionOwner: "vehicleUser",
        };

        const formikField = idToFormikFieldMap[item.id];
        if (formikField && formik?.values?.[formikField] === "Yes") {
            const queryParams = new URLSearchParams();
            queryParams.append('search', value);
            getUserSearch(queryParams)
        } else {
            if (item.id === "medallionOwner" || item.id === "medallionRenewalMedallionOwner") {
                const queryParams = new URLSearchParams({
                    page: 1,
                    per_page: 5,
                });
                queryParams.append('medallion_owner_name', value);
                triggerSearchQuery(`?${queryParams?.toString()}`)
            } else if (item.id === "driverLeaseMedallionOwner" || item.id === "tlcMedallionOwner" || item.id === "dmvMedallionOwner" || item.id === "vehicleMedallionOwner") {
                const queryParams = new URLSearchParams({
                    page: 1,
                    per_page: 5,
                });
                queryParams.append('first_name', value);
                queryParams.append('last_name', value);
                triggerSearchDriverQuery(`?${queryParams.toString()}`)
            }
        }

    }

    const generateConfig = (entityType, eventType, daysInAdvanceKey, textMessageKey, emailKey, notificationsKey, medallionOwnerKey) => {
        const formikValues = formik?.values;

        const daysInAdvance = formikValues[daysInAdvanceKey]?.code;
        const user = formikValues[medallionOwnerKey];

        console.log("user : ", user)

        const recipientName = user ? getRecipientName(user, medallionOwnerKey) : "";
        const recipientEmail = user ? getRecipientEmail(user, medallionOwnerKey) : "";
        const recipientPhone = user ? getRecipientPhone(user, medallionOwnerKey) : "";
        const recipientId = user ? getRecipientId(user, medallionOwnerKey) : "";

        const channels = generateChannels(formikValues[textMessageKey], formikValues[emailKey], formikValues[notificationsKey]);

        if (daysInAdvance && channels) {
            return {
                name: "",
                entity_type: entityType,
                event_type: eventType,
                days_in_advance: daysInAdvance,
                channels: channels,
                recipient_name: recipientName,
                recipient_email: recipientEmail,
                recipient_phone: recipientPhone,
                recipient_id: recipientId
            };
        }
        return null;
    };


    const formik = useFormik({
        initialValues: {
            textMessage: false,
            email: false,
            notifications: false,

            medallionRenewalTextMessage: false,
            medallionRenewalEmail: false,
            medallionRenewalNotifications: false,

            driverLeaseTextMessage: false,
            driverLeaseEmail: false,
            driverLeaseNotifications: false,

            tlcTextMessage: false,
            tlcEmail: false,
            tlcNotifications: false,


            dmvTextMessage: false,
            dmvEmail: false,
            dmvNotifications: false,

            vehicleTextMessage: false,
            vehicleEmail: false,
            vehicleNotifications: false,

        },
        onSubmit: () => {
            const request = {
                configs: [
                    generateConfig("medallion", "lease_expiry", "daysInAdvance", "textMessage", "email", "notifications", "medallionOwner"),
                    generateConfig("medallion", "lease_expiry", "medallionRenewalDaysInAdvance", "medallionRenewalTextMessage", "medallionRenewalEmail", "medallionRenewalNotifications", "medallionRenewalMedallionOwner"),
                    generateConfig("driver", "lease_expiry", "driverLeaseDaysInAdvance", "driverLeaseTextMessage", "driverLeaseEmail", "driverLeaseNotifications", "driverLeaseMedallionOwner"),
                    generateConfig("driver", "tlc_license_expiry", "tlcDaysInAdvance", "tlcTextMessage", "tlcEmail", "tlcNotifications", "tlcMedallionOwner"),
                    generateConfig("driver", "dmv_license_expiry", "dmvDaysInAdvance", "dmvTextMessage", "dmvEmail", "dmvNotifications", "dmvMedallionOwner"),
                    generateConfig("vehicle", "inspection_due", "vehicleDaysInAdvance", "vehicleTextMessage", "vehicleEmail", "vehicleNotifications", "vehicleMedallionOwner")
                ].filter(config => config !== null)
            };

            // console.log("request : ", request)
            notificationConfig(request);


        },
    });

    const notificationConfig = async (configs) => {
        try {
            await createNotificationConfig(configs).unwrap();
        } catch (error) {
            console.log("error", error)
        }
    };
    const getLabelName = (item) => {
        const idToFormikFieldMap = {
            medallionOwner: "user",
            medallionRenewalMedallionOwner: "medallionRenewalUser",
            driverLeaseMedallionOwner: "driverLeaseUser",
            tlcMedallionOwner: "tlcUser",
            dmvMedallionOwner: "dmvUser",
            vehicleMedallionOwner: "vehicleUser",
        };

        const formikField = idToFormikFieldMap[item.id];
        if (formikField && formik?.values?.[formikField] === "Yes") {
            return "User";
        }

        return item.label;
    };

    const getOwnerNames = (data) => {
        return data.medallion_owner_page_records.map(owner =>
        ({
            name: owner.owner_name ? owner.owner_name : owner.entity_name,
            value: owner
        }
        )
        );
    };

    const updateMedallionOwnerOptions = (formFields, newOptions) => {
        return formFields.map(section =>
            section.map(field =>
                field.id === "medallionOwner" ||
                    field.id === "medallionRenewalMedallionOwner" ||
                    field.id === "driverLeaseMedallionOwner" ||
                    field.id === "tlcMedallionOwner" ||
                    field.id === "tlcMedallionOwner" ||
                    field.id === "dmvMedallionOwner" ||
                    field.id === "vehicleMedallionOwner"
                    ? { ...field, options: newOptions }
                    : field
            )
        );
    };

    const getBatUserNames = (data) => {
        return data.map(user =>
        ({
            name: user.first_name,
            value: user
        }
        )
        );
    };

    useEffect(() => {
        if (data) {
            if (searhForItem.id === "medallionOwner") {
                const ownerNamesArray = getOwnerNames(data);
                setNotificationLeaseExpriy(prevState => updateMedallionOwnerOptions(prevState, ownerNamesArray));
            } else if (searhForItem.id === "medallionRenewalMedallionOwner") {
                const ownerNamesArray = getOwnerNames(data);
                setMedallionRenewalVar(prevState => updateMedallionOwnerOptions(prevState, ownerNamesArray));
            }
        }
    }, [data])


    useEffect(() => {
        if (batUser) {
            const userNamesArray = getBatUserNames(batUser);
            if (searhForItem.id === "medallionOwner") {
                setNotificationLeaseExpriy(prevState => updateMedallionOwnerOptions(prevState, userNamesArray));
            } else if (searhForItem.id === "medallionRenewalMedallionOwner") {
                setMedallionRenewalVar(prevState => updateMedallionOwnerOptions(prevState, userNamesArray));
            } else if (searhForItem.id === "driverLeaseMedallionOwner") {
                setDriverLeaseExpiryVar(prevState => updateMedallionOwnerOptions(prevState, userNamesArray));
            } else if (searhForItem.id === "tlcMedallionOwner") {
                setTlcLicenseExpiryVar(prevState => updateMedallionOwnerOptions(prevState, userNamesArray));
            } else if (searhForItem.id === "vehicleMedallionOwner") {
                setVehicleRegistrationVar(prevState => updateMedallionOwnerOptions(prevState, userNamesArray));
            } else if (searhForItem.id === "dmvMedallionOwner") {
                setDmvLicenseExpiryVar(prevState => updateMedallionOwnerOptions(prevState, userNamesArray));
            }
        }
    }, [batUser])


    useEffect(() => {
        if (isSuccess) {
            toast.current.showToast('Success', "Notification has been successfully configured", 'success', false, 10000);
        }
    }, [isSuccess])



    const transformDriverDataToOptions = (data) => {
        return data.items.map(driver => ({
            name: `${driver.driver_details.first_name} ${driver.driver_details.middle_name} ${driver.driver_details.last_name}`.trim(),
            value: driver
        }));
    };


    useEffect(() => {
        if (driverSearchDetail) {
            const driverNames = transformDriverDataToOptions(driverSearchDetail);
            if (searhForItem.id === "driverLeaseMedallionOwner") {
                setDriverLeaseExpiryVar(prevState => updateMedallionOwnerOptions(prevState, driverNames));
            } else if (searhForItem.id === "tlcMedallionOwner") {
                setTlcLicenseExpiryVar(prevState => updateMedallionOwnerOptions(prevState, driverNames));
            } else if (searhForItem.id === "vehicleMedallionOwner") {
                setVehicleRegistrationVar(prevState => updateMedallionOwnerOptions(prevState, driverNames));
            } else if (searhForItem.id === "dmvMedallionOwner") {
                setDmvLicenseExpiryVar(prevState => updateMedallionOwnerOptions(prevState, driverNames));
            }
        }
    }, [driverSearchDetail])

    const render = (variable, title) => {
        return (
            <>
                <div className="common-padding">
                    <div className="title">
                        {title}
                    </div>
                    {variable.map((child, index) => (
                        <div
                            key={index}
                            className="d-flex align-items-center flex-wrap"
                        >
                            {child.map((item, idx) => {
                                const updatedLabel = getLabelName(item)

                                if (item.id === "medallionOwner" || item.id === "medallionRenewalMedallionOwner" || item.id === "driverLeaseMedallionOwner"
                                    || item.id === "tlcMedallionOwner" || item.id === "dmvMedallionOwner" || item.id === "vehicleMedallionOwner") {

                                    return (
                                        <div key={idx} className="">
                                            <BSelectWithSearch
                                                variable={{ ...item, label: updatedLabel }}
                                                formik={formik}
                                                handleSearch={(query) => {
                                                    searchData(item, query)
                                                }}
                                            />
                                        </div>
                                    );
                                } else {
                                    return (
                                        <div key={idx} className="">
                                            <BInputFields
                                                variable={{ ...item, label: updatedLabel }}
                                                formik={formik}
                                            />
                                        </div>
                                    );
                                }

                            })}
                        </div>
                    ))}
                </div>
            </>
        );
    };

    // const breadcrumbItems = [
    //     { label: "Home" },
    //     { label: "Notification" },
    // ];

    const breadcrumbItems = [
        {
            template: () => (
                <Link to="/" className="font-semibold text-grey">
                    Home
                </Link>
            ),
        },
        {
            template: () => (
                <Link to="/miscellaneous" className="font-semibold text-grey">
                    Miscellaneous
                </Link>
            ),
        },
        {
            template: () => (
                <Link to="/miscellaneous/notification" className="font-semibold text-black">
                    Notification
                </Link>
            ),
        }
    ];

    return (
        <div className="common-layout w-100 h-100 d-flex flex-column p-3" style={{ background: 'white' }}>
            <BBreadCrumb breadcrumbItems={breadcrumbItems} separator="/" />
            <p className='regular-semibold-text pb-3'>Configure Notifications</p>
            <form
                className="common-form d-flex flex-column"
                onSubmit={formik.handleSubmit}
            >
                <div className="form-section">
                    {/* <div className="form-body"> */}

                    {render(notificationLeaseExpriyVar, "Medallion Lease Expiry")}
                    {render(medallionRenewalVar, "Medallion Renewal")}
                    {render(driverLeaseExpiryVar, "Driver Lease Expiry")}
                    {render(tlcLicenseExpiryVar, "TLC License Expiry")}
                    {render(dmvLicenseExpiryVar, "DMV License Expiry")}
                    {render(vehicleRegistrationVar, "Vehicle Registration")}
                    {/* </div> */}

                </div>
                <Button
                    label="Save Changes"
                    severity="warning"
                    type="submit"
                    className="border-radius-0 primary-btn mb-5 mt-5"
                />
            </form>
            <BToast ref={toast} position='top-right' />
        </div>
    )
}

export default Notification