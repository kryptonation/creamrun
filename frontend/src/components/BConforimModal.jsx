import { Button } from "primereact/button";
import Img from "./Img";
import { useEffect } from "react";

const BConforimModal = ({setIsOpen,cancelAction,reject,accept,action,isSuccess}) => {
  useEffect(()=>{
    if(isSuccess){
      setIsOpen(false);
      accept();
    }
  },[isSuccess])

  return (
    <div className="d-flex flex-column gap-4 align-items-center p-5 bg-light confirm-modal">
      <div className="w-100 d-flex align-items-center justify-content-between mb-2 header">
        <div className="header-text">
          <Img name="success"></Img>Confirmation on New Medallion
        </div>
        <Button
          text
          className="close-icon"
          icon={() => <Img name="modalCancel"></Img>}
          onClick={() => {
            setIsOpen(false);
            cancelAction();
          }}
        ></Button>
      </div>
      <p className="mb-0 text-center modal-body">
        This will create a new case for a medallion. Are you sure to proceed?
      </p>
      <div className="d-flex align-items-center gap-2 mt-4 modal-footer">
        <Button
          text
          label="Cancel"
          outlined
          onClick={() => {
            setIsOpen(false)
            reject();
            cancelAction()
          }}
        ></Button>
        <Button
          label="Proceed"
          className="primary-btn"
          onClick={() => {
            action()
            setIsOpen(false)
            accept();
          }}
        ></Button>
      </div>
    </div>
  );
};

export default BConforimModal;
