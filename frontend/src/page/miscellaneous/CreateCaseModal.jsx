import { useEffect, useState } from "react";
import BConfirmModal from "../../components/BConfirmModal";
import { Button } from "primereact/button";
import { useNavigate } from "react-router-dom";
import { useCreateCaseMutation } from "../../redux/api/medallionApi";
import { CREATE_CORRESPONDENCE_TYPE } from "../../utils/constants";

const CreateCaseModal = ({ link }) => {
  const navigate = useNavigate();
  const [isOpen, setOpen] = useState(false);

  const [createCase, { data, isSuccess }] = useCreateCaseMutation();

  const createNewCase = (caseType) => {
    createCase(caseType);
  };

  useEffect(() => {
    if (isSuccess) {
      const path = `/case/${link.caseType}/${data.case_no}`;
      navigate(path);
    }
  }, [isSuccess]);

  return (
    <>
      <Button
        label={link?.lable}
        dataTestId={link?.dataTestId}
        className="text-blue fw-small p-0 fw-normal w-max-content"
        text
        onClick={() => setOpen(true)}
      />
      <BConfirmModal
        isOpen={isOpen}
        //   key={idx}
        title={link?.title}
        message={link?.message}
        onCancel={() => {
          setOpen(false);
        }}
        onConfirm={() => {
          setOpen(false);
          if (link.caseType === CREATE_CORRESPONDENCE_TYPE) {
            createNewCase(CREATE_CORRESPONDENCE_TYPE);
          }
        }}
      ></BConfirmModal>
    </>
  );
};

export default CreateCaseModal;
