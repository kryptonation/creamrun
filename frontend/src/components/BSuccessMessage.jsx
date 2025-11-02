import { Button } from "primereact/button";
import Img from "./Img";
import { ConfirmDialog } from "primereact/confirmdialog";

const BSuccessMessage = ({ isOpen, title, message, onCancel, isHtml = false,topicIcon="completeSuccess" }) => {
    return (
        <ConfirmDialog
            visible={isOpen}
            content={() => (
                <div className="d-flex flex-column gap-4 align-items-center p-5 bg-light confirm-modal"
                data-testId="confirm-dialog" style={{ minWidth: 500 }}>
                    <div className="w-100 d-flex" style={{ justifyContent: 'flex-end' }}>
                        <Button
                            text
                            className="close-icon"
                            data-testId="close-icon"
                            icon={() => <Img name="modalCancel"></Img>}
                            onClick={() => {
                                onCancel()
                            }}
                        ></Button>
                    </div>
                    <div className="header-text" style={{ display: 'grid' }}>
                       <div className="header-svg" data-testId={topicIcon?topicIcon:"completeSuccess"}>
                        <Img name={topicIcon?topicIcon:"completeSuccess"}></Img>
                       </div>
                    </div>
                    <span style={{ fontSize: 16, fontWeight: '600' }} data-testId="modal-title">{title}</span>
                    {isHtml ?
                        <div className="text-center" data-testId="modal-message" dangerouslySetInnerHTML={{ __html: message }} />
                        :
                        <p className="mb-0 text-center modal-body" data-testId="modal-message" style={{ fontSize: 12, fontWeight: '600' }}>
                            {message}
                        </p>
                    }
                </div>
            )}
        />

    );
};

export default BSuccessMessage;
