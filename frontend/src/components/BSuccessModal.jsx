import React from 'react'
import Img from './Img'
import { Button } from 'primereact/button';

const BSuccessModal = ({setIsOpen,header,body}) => {
  return (
    <div className='d-flex align-items-center justify-content-center flex-column success-modal flex-column py-3 pb-5 px-5'>
        <div className="w-100 d-flex align-items-center justify-content-end header">
        <Button
          text
          className="close-icon"
          data-testId="success-close-icon"
          icon={() => <Img name="modalCancel"></Img>}
          onClick={() => {
            setIsOpen(false)
          }}
        ></Button>
        </div>
        <div className='d-flex align-items-center flex-column gap-3'>
        <Img name="completeSuccess" className="success-icon"></Img>
        <p className='topic-txt'>{header}</p>
        <p className='regular-text'>{body}</p>
        </div>
    </div>
  )
}

export default BSuccessModal