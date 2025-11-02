import { useEffect, useRef, useState } from "react";
import BDynamicForm from "../../../components/BDynamicForm";
import schema from "./correspondence_details.json";
import { useNavigate } from "react-router-dom";
import {
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../../redux/api/medallionApi";
import BConfirmModal from "../../../components/BConfirmModal";
import { getCurrentStep } from "../../../utils/caseUtils";
import { timeHourandMinutes, yearMonthDate } from "../../../utils/dateConverter";

const Createcorrespondence = ({
  caseId,
  caseData,
  currentStepId,
  hasAccess,
}) => {
  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();
  const [processFlow, { isSuccess: isProccessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [isOpen, setOpen] = useState(false);
  const navigate = useNavigate();
  const formRef = useRef();

  useEffect(() => {
    if (
      hasAccess &&
      isProccessDataSuccess &&
      caseData &&
      caseData.case_info.case_status !== "Closed" &&
      getCurrentStep(caseData.steps).step_id === currentStepId
    ) {
      moveCase({ params: caseId });
    }
  }, [isProccessDataSuccess]);

  const handleSubmit = (value) => {
    let data={...value,date_sent: value.date};
    delete data["date"];
    processFlow({
      params: caseId,
      data: {
        step_id: currentStepId,
        data: {
          ...data,
          date_sent: yearMonthDate(data.date_sent),
          time_sent: timeHourandMinutes(data.time_sent),
        },
      },
    });
  };

  useEffect(() => {
    if (hasAccess && isMoveDataSuccess) {
      setOpen(true);
    }
  }, [isMoveDataSuccess]);
  return (
    <div>
      <BDynamicForm schema={schema} handleSubmit={handleSubmit} ref={formRef} />
      <BConfirmModal
        isOpen={isOpen}
        title={"Create Correspondence Successful"}
        message={"Creation of Correspondence is successful."}
        onCancel={() => {
          setOpen(false);
          navigate("/miscellaneous/manage-correspondence");
        }}
        onConfirm={() => {
          setOpen(false);
          navigate("/miscellaneous/manage-correspondence");
        }}
      />
    </div>
  );
};

export default Createcorrespondence;
