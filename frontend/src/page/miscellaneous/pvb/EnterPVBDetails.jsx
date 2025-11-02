import BConfirmModal from "../../../components/BConfirmModal";
import { useEffect, useState, useRef } from "react";
import { useMoveCaseDetailMutation, useProcessCaseDeatilMutation } from "../../../redux/api/medallionApi";
import { useNavigate } from 'react-router-dom'
import { getCurrentStep } from "../../../utils/caseUtils";
import BDynamicForm from "../../../components/BDynamicForm";
import schema from '../../miscellaneous/pvb/enter_pvb_details.json';
import { TimeFormat, timeHourandMinutes, yearMonthDate } from "../../../utils/dateConverter";

const EnterPVBDetails = ({ caseId, caseData,currentStep, currentStepId, hasAccess }) => {
    console.log("🚀 ~ EnterPVBDetails ~ currentStep:", currentStep)
    const [moveCase, { isSuccess: isMoveDataSuccess }] = useMoveCaseDetailMutation();
    const [processFlow, { isSuccess: isProccessDataSuccess }] = useProcessCaseDeatilMutation();
    const [isOpen, setOpen] = useState(false);
    const navigate=useNavigate();
    const formRef = useRef();

    // useEffect(async() => {
    //     if (hasAccess && isProccessDataSuccess && caseData && caseData.case_info.case_status !== "Closed" && getCurrentStep(caseData.steps).step_id === currentStepId) {
    //        await moveCase({ params: caseId }).unwrap().then(() => {
    //             setOpen(true);
    //         })
    //     }
    // }, [isProccessDataSuccess])

    useEffect(() => {
    const moveCaseIfNeeded = async () => {
        if (
            hasAccess &&
            isProccessDataSuccess &&
            caseData &&
            caseData.case_info.case_status !== "Closed" &&
            getCurrentStep(caseData.steps).step_id === currentStepId
        ) {
            try {
                await moveCase({ params: caseId }).unwrap();
                setOpen(true);
            } catch (error) {
                console.error("Failed to move case:", error);
            }
        }
    };

    moveCaseIfNeeded();
}, [isProccessDataSuccess, hasAccess, caseData, currentStepId, caseId, moveCase]);

    const handleSubmit = (value) => {
        processFlow({
            params: caseId, data: {
                step_id: currentStepId,
                data: { ...value, issue_date: yearMonthDate(value.issue_date),issue_time:TimeFormat(value.issue_time) }
            }
        })
    }

    const handleExternalUpdate = () => {
  if (formRef.current && currentStep?.pvb_details) {
    formRef.current.setFieldValue('plate_number', currentStep.pvb_details.plate_number);
    formRef.current.setFieldValue('state', currentStep.pvb_details.registration_state);
    formRef.current.setFieldValue('issue_date', currentStep.pvb_details.issue_date?new Date(currentStep.pvb_details.issue_date):"");
  }
};
    useEffect(()=>{
        handleExternalUpdate();
    },[])

    return (
        <div>
            <BDynamicForm schema={schema} handleSubmit={handleSubmit}  ref={formRef} />
            <div>
                <BConfirmModal isOpen={isOpen} title={"Create PVB Successful"} message={"Create PVB is Successful and Approved"}
                    onCancel={() => {
                        setOpen(false);
                        navigate("/pvb-trips");
                        // setDrivers([]);
                        // setSearchTrigged(true)
                    }}
                    onConfirm={() => {
                        navigate("/pvb-trips");
                        // setSearchTrigged(true)
                        setOpen(false);
                    }}
                />
            </div>
        </div>
    )
}

export default EnterPVBDetails