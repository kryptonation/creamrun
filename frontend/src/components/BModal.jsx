import React, {
  cloneElement,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { ConfirmDialog } from "primereact/confirmdialog";
import { Toast } from "primereact/toast";
import { Button } from "primereact/button";
import Img from "./Img";
import { Dialog } from "primereact/dialog";

const ModalContext = createContext();
const BModal = ({ children, setTrigger, isOpen: trigger }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toast = useRef(null);

  const accept = () => {
    // toast.current.show({
    //   severity: "info",
    //   summary: "Confirmed",
    //   detail: "You have accepted",
    //   life: 3000,
    // });
  };

  const reject = () => {
    // toast.current.show({
    //   severity: "warn",
    //   summary: "Rejected",
    //   detail: "You have rejected",
    //   life: 3000,
    // });
  };

  useEffect(() => {
    if (trigger) {
      setIsOpen(trigger);
    }
  }, [trigger]);

  useEffect(() => {
    if (!isOpen && setTrigger) {
      setTrigger(false);
    }
  }, [isOpen, setTrigger]);

  return (
    <ModalContext.Provider
      value={{ accept, reject, isOpen, setIsOpen }}
    >
      <Toast ref={toast} />
      {children}
    </ModalContext.Provider>
  );
};

const ToggleButton = ({ children }) => {
  const { setIsOpen } = useContext(ModalContext);
  return cloneElement(children, { onClick: () => { setIsOpen(true); }, });
};

const Content = ({ children }) => {
  const { accept, reject, isOpen, setIsOpen } = useContext(ModalContext);
  return (
    <ConfirmDialog
      visible={isOpen}
      content={({ hide }) => (
        <div className="bg-light">
          {cloneElement(children, { reject, hide, accept, setIsOpen, isOpen })}
        </div>
      )}
    />
  );
};

const SideContent = ({ children }) => {
    const { isOpen, setIsOpen } = useContext(ModalContext);
    return (
        <Dialog draggable={false} visible={isOpen} maximizable 
        position="right"
        modal={false}
        className="m-0 vh-100 min-vh-100 w-50 bg-light side-modal"
        pt={{
          content: { className: 'scroll-bar' },
      }}
        onHide={() => {if (!isOpen) return; setIsOpen(false); }}>
            <>
             {cloneElement(children, { setIsOpen, isOpen })}
             <Button className="cancel-btn" data-testId="side-content-cancel-btn" onClick={() => {
             setIsOpen(false);
           }} icon={()=><Img name="modalCancel"></Img>}></Button>
           </>
    </Dialog>
    );
};

BModal.ToggleButton = ToggleButton;
BModal.Content = Content;
BModal.SideContent = SideContent;

export default BModal;
