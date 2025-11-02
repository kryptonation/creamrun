import { Button } from "primereact/button";
import Img from "./Img";
import { ConfirmDialog } from "primereact/confirmdialog";

const BConfirmModal = ({ isOpen, title, message, onCancel, onConfirm, isHtml = false, iconName = "success", customContent }) => {
    return (
        <ConfirmDialog
            visible={isOpen}
            data-testid="message-modal"
            content={() => (
                <div className="d-flex flex-column gap-4 align-items-center p-5 bg-light confirm-modal">
                    <div className="w-100 d-flex align-items-center justify-content-between mb-2 header">
                        <div className="header-text">
                            <Img name={iconName}></Img>{title}
                        </div>
                        <Button
                            text
                            className="close-icon ms-5"
                            data-testid="close-icon-btn"
                            icon={() => <Img name="modalCancel"></Img>}
                            onClick={() => {
                                onCancel()
                            }}
                        ></Button>
                    </div>
                    {/* {isHtml ? <div dangerouslySetInnerHTML={{ __html: message }} /> :
                        <p className="mb-0 text-center modal-body">
                            {message}
                        </p>
                    } */}
                    {customContent ? (
                        <div className="custom-content" data-testid="custom-content">{customContent}</div>
                    ) : isHtml ? (
                        <div className="text-center" data-testid="message-content" dangerouslySetInnerHTML={{ __html: message }} />

                        // <div dangerouslySetInnerHTML={{ __html: message }} />
                    ) : (
                        <p className="mb-0 text-center modal-body" data-testid="message-content">
                            {message}
                        </p>
                    )}
                    <div className="d-flex align-items-center gap-2 mt-4 modal-footer">
                        <Button
                            text
                            label="Cancel"
                            data-testid="cancel-btn"
                            outlined
                            onClick={() => {
                                onCancel()
                            }}
                        ></Button>
                        <Button
                            label="Proceed"
                            data-testid="proceed-btn"
                            className="primary-btn"
                            onClick={() => {
                                onConfirm()
                            }}
                        ></Button>
                    </div>
                </div>
            )}
        />

    );
};

export default BConfirmModal;
