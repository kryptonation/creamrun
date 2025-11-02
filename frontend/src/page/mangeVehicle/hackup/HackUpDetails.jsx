import { useGetStepInfoDetailMutation, useMoveCaseDetailMutation, useProcessCaseDeatilMutation } from "../../../redux/api/medallionApi";
import { useEffect, useState } from "react";
import Img from "../../../components/Img";
import { useFormik } from "formik";
import BInputFields from "../../../components/BInputFileds";
import { getOptionsByIdFromVariable, vechileHackup2 } from "../../../utils/variables";
import { Button } from "primereact/button";
import { yearMonthDate } from "../../../utils/dateConverter";
import { Divider } from "primereact/divider";
import { useLazyGetUsersDataQuery } from "../../../redux/api/authAPI";
import { getFullName } from "../../../utils/utils";
import { getCurrentStep } from "../../../utils/caseUtils";

const HackUpDetails = ({ caseId, currentStepId, reload, currentStep, caseData, hasAccess }) => {
    const [processFlow, { isSuccess: isProccessDataSuccess }] = useProcessCaseDeatilMutation();
    const [moveCase, { isSuccess: isMoveDataSuccess }] =
        useMoveCaseDetailMutation(); const [isMoveClicked, setMoveClicked] = useState(false)
    const [getStepInfoDetail, { data: stepInfoData, isSuccess, error }] = useGetStepInfoDetailMutation();

    const [getUserSearch, { data: batUser }] =
        useLazyGetUsersDataQuery(
            ""
        );

    const [expanded, setExpanded] = useState(null);
    const [vechileHackupVariable, setVechileHackupVariable] = useState(vechileHackup2);

    // Initialize Formik values
    const initialValues = {};
    vechileHackup2.forEach((item) => {
        if (item.inputType === "CHECK") initialValues[item.id] = false;
        else if (item.inputType === "CALENDAR") initialValues[item.id] = null;
        else initialValues[item.id] = "";
    });


    const processAPI = () => {
        const payload = mapFormToApiPayload(currentStep?.vehicle?.vin || currentStep?.vehicle_details?.vehicle?.vin, formik.values);

        processFlow({
            params: caseId,
            data: { step_id: currentStepId, data: payload },
        });
    }
    const formik = useFormik({
        initialValues,
        validate: (values) => {
            const errors = {};
            featureNames.forEach((feature) => {
                const isSelectedVal = values[`isSelected_${feature}`];
                const droppedOffVal = values[`droppedOff_${feature}`];
                const completedVal = values[`completed_${feature}`];

                const isActive = (val) =>
                    val === true || (Array.isArray(val) && val.includes("Yes"));

                if (isSelectedVal) {
                    if (isSelectedVal.code === "isRequired" && !values[`location_${feature}`]) {
                        errors[`location_${feature}`] = "Location is required";
                    }
                }

                if (isActive(droppedOffVal)) {
                    if (!values[`droppedBy_${feature}`]) {
                        errors[`droppedBy_${feature}`] = "Dropped By is required";
                    }
                    if (!values[`droppedOn_${feature}`]) {
                        errors[`droppedOn_${feature}`] = "Dropped On is required";
                    }


                }

                if (isActive(completedVal)) {
                    if (!values[`completedBy_${feature}`]) {
                        errors[`completedBy_${feature}`] = "Completed By is required";
                    }
                    if (!values[`completedOn_${feature}`]) {
                        errors[`completedOn_${feature}`] = "Completed On is required";
                    }
                }


                const droppedOn = values[`droppedOn_${feature}`];
                const completedOn = values[`completedOn_${feature}`];

                if (droppedOn && completedOn) {
                    const droppedDate = new Date(droppedOn);
                    const completedDate = new Date(completedOn);

                    if (completedDate < droppedDate) {
                        errors[`completedOn_${feature}`] =
                            "Completed On must be later than Dropped On";
                    }
                }
            });
            return errors;
        },
        onSubmit: () => {
            processAPI()
        },
    });

    // Map form values to API payload
    const mapFormToApiPayload = (vin, formikValues) => {
        const featureKeyMap = {
            Paint: "paint",
            Meter: "meter",
            Camera: "camera",
            Rooftop: "rooftop",
            Partition: "partition",
            DMV: "dmv_registration",
            TLC: "tlc_inspection",
            Dealership: "dealership",
            BATGarage: "bat_garage",
        };

        const tasks = {};

        Object.entries(featureKeyMap).forEach(([feature, key]) => {
            const completed = formikValues[`completed_${feature}`];
            const droppedOff = formikValues[`droppedOff_${feature}`];

            tasks[key] = {
                drop_location: formikValues[`location_${feature}`]?.name || formikValues[`location_${feature}`] || null,
                drop_by: formikValues[`droppedBy_${feature}`]?.name || formikValues[`droppedBy_${feature}`] || null,
                completed_by: formikValues[`completedBy_${feature}`]?.name || formikValues[`completedBy_${feature}`] || null,
                drop_date: formikValues[`droppedOn_${feature}`]
                    ? yearMonthDate(formikValues[`droppedOn_${feature}`])
                    : null,
                completed_date: formikValues[`completedOn_${feature}`]
                    ? yearMonthDate(formikValues[`completedOn_${feature}`])
                    : null,
                status: Array.isArray(completed) && completed.includes("Yes")
                    ? "Completed"
                    : Array.isArray(droppedOff) && droppedOff.includes("Yes")
                        ? "In Progress"
                        : "Pending",
                note: formikValues[`notes_${feature}`] || null,
                is_task_done: !!formikValues[`completed_${feature}`],
            };
        });

        return { vin, tasks };
    };


    useEffect(() => {
        if (isMoveDataSuccess) {
            reload();
        }
    }, [isMoveDataSuccess]);


    const getUserOption = (name) => {
        console.log("name : ", name)
        if (batUser && Array.isArray(batUser.items) && batUser.items.length > 0) {
            const matchedUser = batUser.items.find(
                (u) => name === getFullName(u?.first_name, "", u?.last_name)
            );

            if (matchedUser) {
                return {
                    name: getFullName(matchedUser.first_name, "", matchedUser.last_name),
                    code: matchedUser.id,
                };
            }
        }

        return null;
    };
    useEffect(() => {
        if (batUser && batUser?.items.length > 0) {
            setVechileHackupVariable((prev) => {
                const updatedVariables = prev.map((item) => {
                    if (item.id.startsWith("droppedBy") || item.id.startsWith("completedBy")) {
                        return {
                            ...item,
                            options: batUser?.items.map((u) => ({
                                name: getFullName(u?.first_name, "", u?.last_name),
                                code: u.id,
                            })),
                        };
                    }
                    return item;
                });
                return updatedVariables;
            });
        }

        if (!currentStep?.hackup_details) return;


        const hackup = currentStep.hackup_details;

        const featureKeyMap = {
            Paint: "paint",
            Meter: "meter",
            Camera: "camera",
            Rooftop: "rooftop",
            Partition: "partition",
            DMV: "dmv_registration",
            TLC: "tlc_inspection",
            Dealership: "dealership",
            BATGarage: "bat_garage",
        };

        const newValues = {};

        Object.entries(featureKeyMap).forEach(([feature, key]) => {
            const task = hackup[key] || {};

            console.log("task : ", task)

            const options = getOptionsByIdFromVariable(
                vechileHackup2,
                `location_${feature}`
            );
            const option = options?.filter(
                (item) => item?.code === task.drop_location
            );

            console.log("option : ", option)
            newValues[`location_${feature}`] = option.length ? option[0] : "";
            newValues[`droppedOn_${feature}`] = task.drop_date ? new Date(task.drop_date) : null;
            newValues[`droppedBy_${feature}`] = getUserOption(task.drop_by) || "";
            newValues[`completedBy_${feature}`] = getUserOption(task.completed_by) || "";
            newValues[`completedOn_${feature}`] = task.completed_date ? new Date(task.completed_date) : null;
            newValues[`notes_${feature}`] = task.note || "";
            newValues[`status_${feature}`] = task.status;
            if (task.status === "Completed") {
                newValues[`isSelected_${feature}`] = { name: "Required", code: "isRequired" };
                newValues[`droppedOff_${feature}`] = ['Yes'];
                newValues[`completed_${feature}`] = ['Yes'];
            } else if (task.status === "In Progress") {
                newValues[`isSelected_${feature}`] = { name: "Required", code: "isRequired" };
                newValues[`droppedOff_${feature}`] = ['Yes'];
                newValues[`completed_${feature}`] = [];
            } else {
                // newValues[`isSelected_${feature}`] = [];
                newValues[`droppedOff_${feature}`] = [];
                newValues[`completed_${feature}`] = [];
            }



            // newValues[`isSelected_${feature}`] = task.status === "Completed";
            // newValues[`droppedOff_${feature}`] = task.status === "In Progress";
        });

        formik.setValues((prev) => ({ ...prev, ...newValues }));
    }, [currentStep, batUser]);

    useEffect(() => {
        if (isProccessDataSuccess) {
            if (currentStepId && caseId) {
                getStepInfoDetail({ caseNo: caseId, step_no: currentStepId });
            }
            if (isMoveClicked) {
                moveCase({ params: caseId })
            }
        }

    }, [isProccessDataSuccess]);


    useEffect(() => {
        getUserSearch(`?roles=runner`);
    }, []);


    useEffect(() => {
        const updatedVariables = vechileHackupVariable.map((item) => {

            const isActive = (val) =>
                val === true || (Array.isArray(val) && val.includes("Yes"));

            if (item.id.startsWith("location_")) {
                const feature = item.id.split("_")[1];
                const reqired = formik.values[`isSelected_${feature}`]

                if (reqired) {
                    if (reqired.code === "isRequired") {
                        return { ...item, isRequire: true };
                    } else {
                        return { ...item, isRequire: false };
                    }
                } else {
                    return { ...item, isRequire: false };
                }
            }

            if (item.id.startsWith("droppedBy_") || item.id.startsWith("droppedOn_")) {
                const feature = item.id.split("_")[1];
                const droppedOff = isActive(formik.values[`droppedOff_${feature}`]);
                return { ...item, isRequire: droppedOff };
            }

            if (item.id.startsWith("completedBy_") || item.id.startsWith("completedOn_")) {
                const feature = item.id.split("_")[1];
                const completed = isActive(formik.values[`completed_${feature}`]);
                return { ...item, isRequire: completed };
            }

            return item;
        });

        console.log("xxx batUser", batUser, updatedVariables)

        setVechileHackupVariable(updatedVariables);
    }, [formik.values]);


    const featureNames = [...new Set(vechileHackup2.map((v) => v.id.split("_")[1]))];

    // Helper to get status class
    const getStatusClass = (status) => {
        switch (status) {
            case "Completed": return "text-success";
            case "In Progress": return "text-warning";
            case "Pending": return "text-muted";
            default: return "text-secondary";
        }
    };

    const isAllRequiredFeatureDone = () => {
        let allDone = true; // Assume all are done until proven otherwise
        const featureKeyMap = {
            Paint: "paint",
            Meter: "meter",
            Camera: "camera",
            Rooftop: "rooftop",
            Partition: "partition",
            DMV: "dmv_registration",
            TLC: "tlc_inspection",
            Dealership: "dealership",
            BATGarage: "bat_garage",
        };
        Object.entries(featureKeyMap).forEach(([feature, key]) => {
            const isRequired = formik.values[`isSelected_${feature}`];

            const isActive = (val) =>
                val === true || (Array.isArray(val) && val.includes("Yes"));

            console.log("xxx isRequired", isRequired)
            console.log("xxx feature", key)

            if (isRequired && isRequired.code === "isRequired") {
                // determine status
                const completedVal = formik.values[`completed_${feature}`];

                if (isActive(completedVal)) {
                    allDone = true
                } else {
                    allDone = false
                }


            }
        });

        console.log("xxx allDone", allDone)
        return allDone;
    };

    return (
        <form className="common-form d-flex flex-column gap-5 mt-2" onSubmit={formik.handleSubmit}>
            <div className="form-section">
                <div className="d-flex align-items-center justify-content-between form-sec-header">
                    <div className="topic">
                        <Img name="car" /> Hack-Up
                    </div>
                </div>
                <div className="form-body">
                    {featureNames.map((feature, idx) => {
                        const featureItems = vechileHackupVariable.filter((v) => v.id.includes(`_${feature}`));
                        return (
                            <div key={idx} className="w-100">
                                {/* Header */}
                                <div>
                                    {feature === "Dealership" && <div style={{ height: 20, backgroundColor: "#FFFFFF", marginLeft: "-25px", marginRight: "-25px" }}>
                                    </div>}
                                    <div
                                        className="d-flex align-items-center justify-content-between w-100 px-3 py-3 grey-backgroud"
                                        style={{ cursor: "pointer" }}
                                        onClick={() => setExpanded(expanded === idx ? null : idx)}
                                    >
                                        <div className="d-flex align-items-center" onClick={(e) => e.stopPropagation()}>
                                            {/* <BInputFields
                                                variable={featureItems.find(v => v.inputType === "CHECK" && v.id.startsWith("isSelected"))}
                                                formik={formik}
                                            /> */}
                                            <BInputFields
                                                variable={featureItems.find(v => v.id.startsWith("isSelected"))}
                                                formik={formik}
                                            />
                                            <span className="ms-2 bold regular-semibold-text ">{feature}</span>
                                            <span className="ms-2" style={{ fontSize: 12, color: (formik?.values[`status_${feature}`] === "Pending" ? "#7A7A7A" : (formik?.values[`status_${feature}`] === "Completed" ? "#32B666" : "#FEBC2F")) }}>{formik?.values[`status_${feature}`] || ""}</span>
                                        </div>

                                        <div>
                                            {expanded === idx ? (
                                                <Img name="ic_hack_up_arrow_up" className="icon" />
                                            ) : (
                                                <Img name="ic_hack_up_arrow_down" className="icon" />
                                            )}
                                        </div>

                                    </div>

                                </div>

                                {/* Panel content */}
                                {expanded === idx && (
                                    <div className="grey-backgroud p-4 row g-3">
                                        <div className="col-md-3">
                                            <BInputFields
                                                variable={featureItems.find(v => v.id.startsWith("location_"))}
                                                formik={formik}
                                                disabled={true}
                                            />
                                        </div>
                                        <div className="col-md-9">
                                            <div className="row g-3">
                                                <div className="col-md-4">
                                                    <BInputFields
                                                        variable={featureItems.find(v => v.id.startsWith("droppedOff"))}
                                                        formik={formik}
                                                    />
                                                </div>
                                                <div className="col-md-4">
                                                    <BInputFields
                                                        variable={featureItems.find(v => v.id.startsWith("droppedBy"))}
                                                        formik={formik}
                                                    />
                                                </div>
                                                <div className="col-md-4">
                                                    <BInputFields
                                                        variable={featureItems.find(v => v.id.startsWith("droppedOn"))}
                                                        formik={formik}
                                                    />
                                                </div>

                                                <div className="col-md-4 mt-5">
                                                    <BInputFields
                                                        variable={featureItems.find(v => v.id.startsWith("completed") && !v.id.includes("On") && !v.id.includes("By"))}
                                                        formik={formik}
                                                    />
                                                </div>
                                                <div className="col-md-4 mt-5">
                                                    <BInputFields
                                                        variable={featureItems.find(v => v.id.startsWith("completedBy"))}
                                                        formik={formik}
                                                    />
                                                </div>
                                                <div className="col-md-4 mt-5">
                                                    <BInputFields
                                                        variable={featureItems.find(v => v.id.startsWith("completedOn"))}
                                                        formik={formik}
                                                    />
                                                </div>

                                                <div className="col-12">
                                                    <BInputFields
                                                        variable={featureItems.find(v => v.id.startsWith("notes_") || v.id.startsWith("note"))}
                                                        formik={formik}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <Divider type="dotted" className="mt-4 mb-3 border-t text-black" />

                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="w-100 position-sticky bottom-0 py-3 bg-white">
                <Button
                    disabled={!hasAccess}
                    label="Save Hack Details"
                    severity="warning"
                    type="submit"
                    className="border-radius-0 primary-btn"
                />

                <Button
                    disabled={
                        !hasAccess || !formik.isValid ||
                        !(
                            caseData &&
                            caseData.case_info.case_status !== "Closed" &&
                            getCurrentStep(caseData.steps).step_id === currentStepId
                        )
                        ||
                        !isAllRequiredFeatureDone()
                    }
                    label="Move to Next Step"
                    severity="warning"
                    type="button"
                    className="border-radius-0 trinary-btn ms-5"
                    onClick={() => {
                        // if (isProccessDataSuccess) {
                        //     moveCase({ params: caseId })
                        // } else {
                        setMoveClicked(true)
                        processAPI()
                        // }
                    }
                    }
                />
            </div>
        </form>
    );
};

export default HackUpDetails;
