import React, { useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { FileUpload } from 'primereact/fileupload';
import Img from "./Img";

const BUploadFile = ({ ismultiple = false, onHide }) => {
    const fileUploadRef = useRef(null);
    // const [totalSize] = useState(0);

    const handleChooseClick = () => {
        if (fileUploadRef.current) {
            // const fileInput = fileUploadRef.current.getInput();
            fileUploadRef.current.choose();
        }
    };

    const emptyTemplate = () => (
        <div className="flex align-items-center flex-column">
            <span onClick={handleChooseClick} style={{ color: 'blue', cursor: 'pointer' }}>
                Click to upload
            </span>
            <span style={{ marginTop: '10px' }}>or drag and drop</span>
        </div>
    );

    const onUpload = (event) => {
        console.log("File(s) uploaded", event.files);
    };

    // const headerTemplate = (options) => {
    //     return (
    //         <div
    //             className="flex align-items-center"
    //             style={{ backgroundColor: 'transparent', cursor: 'pointer' }}
    //             onClick={handleChooseClick} // Opens file selection dialog when the image is clicked
    //         >
    //             <Img name="uploadFile" />
    //         </div>
    //     );
    // };

    const headerTemplate = (options) => {
        const { className, chooseButton } = options;
        // const value = totalSize / 10000;
        // const formatedValue = fileUploadRef && fileUploadRef.current ? fileUploadRef.current.formatSize(totalSize) : '0 B';

        return (
            <div className={className} style={{ backgroundColor: 'transparent', display: 'flex', alignItems: 'center' }}>
                {chooseButton}
                <Img name="uploadFile" />
            </div>
        );
    };
    const chooseOptions = { icon: 'pi pi-fw pi-images', iconOnly: true, className: 'custom-choose-btn p-button-rounded p-button-outlined' };
    const uploadOptions = { icon: 'pi pi-fw pi-cloud-upload', iconOnly: true, className: 'custom-upload-btn p-button-success p-button-rounded p-button-outlined' };
    const cancelOptions = { icon: 'pi pi-fw pi-times', iconOnly: true, className: 'custom-cancel-btn p-button-danger p-button-rounded p-button-outlined' };


    return (
        <div className="card flex justify-content-center">
            <Dialog
                visible={true}
                modal
                onHide={onHide}
                style={{ width: '50vw' }}
                breakpoints={{ '960px': '75vw', '641px': '100vw' }}
            >
                <div className="flex flex-column b-upload-container">
                    <span className="b-upload-title">Attach Document</span>
                    <span className="b-upload-sub-title">Supported formats: .pdf</span>
                    <div className="b-upload-content">
                        <div className="b-upload-left-container">
                            <FileUpload
                                ref={fileUploadRef}
                                name="demo[]"
                                url="./upload"
                                multiple={ismultiple}
                                accept="image/*"
                                maxFileSize={1000000}
                                onUpload={onUpload}
                                mode="advanced"
                                auto
                                emptyTemplate={emptyTemplate}
                                headerTemplate={headerTemplate}
                                chooseOptions={chooseOptions} uploadOptions={uploadOptions}
                                cancelOptions={cancelOptions} />
                        </div>
                        <div className="b-upload-right-container"></div>
                    </div>
                </div>
            </Dialog>
        </div>
    );
};

export default BUploadFile;

