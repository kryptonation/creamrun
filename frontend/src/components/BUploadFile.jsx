import React, { useRef, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { FileUpload } from 'primereact/fileupload';
import Img from "./Img";
import { InputText } from "primereact/inputtext";
import { FloatLabel } from "primereact/floatlabel";
import { Calendar } from "primereact/calendar";
import { Button } from 'primereact/button';
// import { Tag } from 'primereact/tag';

/* 
 * Props for BUploadFile component
 * @param {boolean} ismultiple - Enable multiple file uploads.
 * @param {boolean} visible - Visibility of the dialog.
 * @param {Function} onHide - Function to hide the dialog.
 * @param {boolean} showAttachTitle - Show attach document title.
 * @param {boolean} showCancelButton - Show the cancel button.
 * @param {Function} onCancelClick - Callback when cancel is clicked.
 * @param {Function} onAttachClick - Callback when attach is clicked.
 */
const BUploadFile = ({
    ismultiple = false,
    visible,
    onHide,
    onCancelClick,
    onAttachClick
}) => {
    const fileUploadRef = useRef(null);
    const [documentName, setDocumentName] = useState('');
    const [notes, setNotes] = useState('');
    const [documentDate, setDocumentDate] = useState('');

    const handleChooseClick = () => fileUploadRef.current?.getInput()?.click();

    const headerTemplate = (options) => {
        const { className, chooseButton } = options;
        return (
            <div className={className} style={{ backgroundColor: 'transparent', display: 'flex', alignItems: 'center' }}>
                {chooseButton}
                <Img name="uploadFile" />
            </div>
        );
    };

    const emptyTemplate = () => (
        <div className='b-empty-container'>
            <div className="align-items-center flex-column">
                <span className="b-upload-click-text" onClick={handleChooseClick} >
                    Click to upload
                </span>
                <span> or drag and drop</span>
            </div>
            <span className='b-upload-message-text'>Max file size 20MB</span>
        </div>
    );

    const onUpload = (event) => {
        console.log("File(s) uploaded", event.files);
    };

    // const onTemplateRemove = (file, callback) => {
    //     // setTotalSize(totalSize - file.size);
    //     callback();
    // };

    // const onTemplateClear = () => {
    //     // setTotalSize(0);
    // };


    const itemTemplate = (file, props) => {
        console.log("file, props:", file, props)
        return (
            <div className="b-item-row flex align-items-center flex-wrap">
                <div className="status-icon">
                    <Img name='ic_pdf' />
                </div>
            </div>
            // <div className="flex align-items-center flex-wrap">
            //     <div className="flex align-items-center" style={{ width: '40%' }}>
            //         <img alt={file.name} role="presentation" src={file.objectURL} width={100} />
            //         <span className="flex flex-column text-left ml-3">
            //             {file.name}
            //             <small>{new Date().toLocaleDateString()}</small>
            //         </span>
            //     </div>
            //     <Tag value={props.formatSize} severity="warning" className="px-3 py-2" />
            //     <Button type="button" icon="pi pi-times" className="p-button-outlined p-button-rounded p-button-danger ml-auto" onClick={() => onTemplateRemove(file, props.onRemove)} />
            // </div>

        );
    }


    const chooseOptions = { icon: 'pi pi-fw pi-images', iconOnly: true, className: 'custom-choose-btn p-button-rounded p-button-outlined' };
    return (
        <Dialog
            className='b-upload'
            visible={visible}
            modal
            onHide={onHide}
            style={{ width: '50vw' }}
            breakpoints={{ '960px': '75vw', '641px': '100vw' }}
        >
            <div className="b-upload-container">
                <div className='b-title-container'>
                    <span className="b-upload-title">Attach Document</span>
                    <span className="b-upload-sub-title">Supported formats: .pdf</span>
                    <div className='close' onClick={() => onHide()}>
                        <Img name="ic_close"></Img>
                    </div>
                </div>
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
                            itemTemplate={itemTemplate}
                            chooseOptions={chooseOptions} />
                    </div>
                    <div className="d-flex align-items-center flex-wrap b-upload-right-container">
                        <div className="item">
                            <FloatLabel>
                                <Calendar
                                    inputId="documentDate"
                                    name="documentDate"
                                    onChange={(e) => setDocumentDate(e.target.value)}
                                    value={documentDate}
                                    className={`rounded-0 border-0 ps-0 bg-transparent calendar-field w-100`}
                                    showIcon
                                    showButtonBar
                                    readOnlyInput
                                    icon={() => <Img name="calendar" />}
                                />
                                <label htmlFor="documentDate">
                                    Document Date
                                </label>
                            </FloatLabel>
                        </div>
                        <div className="item">
                            <FloatLabel>
                                <InputText id="documentName" value={documentName} onChange={(e) => setDocumentName(e.target.value)}
                                    className="rounded-0 border-0 ps-0 bg-transparent text-field w-100" />
                                <label htmlFor="documentName">Document Name</label>
                            </FloatLabel>
                        </div>

                        <div className="item">
                            <FloatLabel>
                                <InputText id="notes" value={notes} onChange={(e) => setNotes(e.target.value)}
                                    className="rounded-0 border-0 ps-0 bg-transparent text-field w-100" />
                                <label htmlFor="notes">Notes</label>
                            </FloatLabel>
                        </div>

                    </div>

                </div>
                <div className="item b-upload-footer">
                    <Button className="p-mt-3 b-button-cancel" data-testId="cancel-btn" label="Cancel" icon="pi" onClick={() => { onCancelClick(); }} />
                    <Button label="Attach File" icon="pi" data-testId="attach-file" className="p-mt-3 b-button-attach" onClick={() => { onAttachClick(); }} />
                </div>
            </div>
        </Dialog>
    );
};

export default BUploadFile;
