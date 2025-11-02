import React from 'react'
import Img from '../../components/Img'

const PdfViewMenu = ({ file, setFile }) => {
  const extension = file?.document_name?.split('.').pop();
  const name = file.document_name
  const img = extension === "pdf" ? "pdf" : "img";
  return (
    <button onClick={() => setFile(file)} type="button" className="btn p-0 d-flex w-100 justify-content-between border attach-file">
      <div className="d-flex align-items-center gap-3 p-2">
        <Img name={img}></Img>
        <span className="d-flex align-items-start flex-column text-left ml-3">
          <span className='text-start'>{name}</span>
          <small>{new Date().toLocaleDateString()}</small>
        </span>
      </div>
    </button>
  )
}

export default PdfViewMenu