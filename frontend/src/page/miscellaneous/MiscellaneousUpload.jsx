import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import EzpassUpload from "./ezpass/EzpassUpload";
import { useState } from "react";

const MiscellaneousUpload = ({ link,dataTestId}) => {
  const [visible, setVisible] = useState(false);
  const headerElement = (
    <div className="w-100 d-flex align-items-center justify-content-between header">
      <div className="topic-txt">
        Attach Document
        <p className="text-grey fw-small fw-normal">
          Supported formats: .xlsx,.xls,csv
        </p>
      </div>
    </div>
  );

  const onHide = () => {
    setVisible(false);
  };
  return (
    <div>
      <Button
        label={link.lable}
        data-testid={dataTestId}
        className="text-blue fw-small p-0 fw-normal w-max-content"
        text
        onClick={() => setVisible(true)}
      />
      <Dialog
        pt={{ header: "border-0 pb-0" }}
        header={headerElement}
        visible={visible}
        data-testid={`${dataTestId}-modal`}
        style={{ width: "50vw" }}
        onHide={() => {
          if (!visible) return;
          setVisible(false);
        }}
      >
        <EzpassUpload onHide={onHide} action={link.action} name={link.name} />
      </Dialog>
    </div>
  );
};

export default MiscellaneousUpload;
