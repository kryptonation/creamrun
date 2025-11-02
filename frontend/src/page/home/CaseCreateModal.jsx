import { useNavigate, useParams } from "react-router-dom";
import BConfirmModal from "../../components/BConfirmModal";
import { CREATE_DRIVER_PAYMENT, LEDGER_ENTRY_TYPE } from "../../utils/constants";
import { getCreateCaseMessage } from "../../utils/caseUtils";
import { useCreateCaseMutation } from "../../redux/api/medallionApi";
import { useEffect } from "react";

const CaseCreateModal = () => {
  const { caseType } = useParams();
  const navigate = useNavigate();
  const [createCase, { data, isSuccess }] = useCreateCaseMutation();

  const handleCaseCreation = async(caseType) => {
    await createCase(caseType).unwrap().then((data) => {
      if (caseType === CREATE_DRIVER_PAYMENT) {
        navigate(`/create-driver-payments/case/${caseType}/${data?.case_no}`);
      }
      if (caseType === LEDGER_ENTRY_TYPE) {
        console.log("🚀 ~ useEffect ~ LEDGER_ENTRY_TYPE:", LEDGER_ENTRY_TYPE)
        navigate(`/ledger-entry/case/${caseType}/${data?.case_no}`);
      }
    })
  };
  // useEffect(() => {
  //   if (isSuccess) {
  //     if (caseType === CREATE_DRIVER_PAYMENT) {
  //       navigate(`/create-driver-payments/case/${caseType}/${data?.case_no}`);
  //     }
  //     if (caseType === CREATE_DRIVER_PAYMENT) {
  //       console.log("🚀 ~ useEffect ~ CREATE_DRIVER_PAYMENT:", CREATE_DRIVER_PAYMENT)
  //       navigate(`/ledger-entry/case/${caseType}/${data?.case_no}`);
  //     }
  //   }
  // }, [data, isSuccess]);
  return (
    <BConfirmModal
      isOpen={true}
      title={getCreateCaseMessage(caseType)?.title}
      message={getCreateCaseMessage(caseType)?.message}
      isHtml={true}
      onCancel={() => {
        navigate(-1);
      }}
      onConfirm={() => {
        console.log("🚀 ~ CaseCreateModal ~ caseType:", caseType)
        if (caseType === CREATE_DRIVER_PAYMENT) {
          handleCaseCreation(CREATE_DRIVER_PAYMENT);
        }
        if(caseType === LEDGER_ENTRY_TYPE) {
          handleCaseCreation(LEDGER_ENTRY_TYPE);
        }
      }}
    ></BConfirmModal>
  );
};

export default CaseCreateModal;
