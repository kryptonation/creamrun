import { useEffect, useState } from 'react';
import Img from '../../components/Img';
import PdfViewMenu from './PdfViewMenu';
import DownloadBtn from '../../components/DownloadBtn';
import PDFViewer from '../../components/PDFViewer';
import { Button } from 'primereact/button';

const DocViewer = ({ data, isSuccess }) => {
  const [file, setFile] = useState({});
  const extension = file?.document_name?.split('.').pop();
  const path = file?.presigned_url;

  useEffect(() => {
    if (isSuccess) {
      setFile(data?.documents[0]);
    }
  }, [isSuccess]);

  console.log(data?.documents);


  return (
    <div className='w-100'>
      {data?.documents?.length ?
        <>
          <div className="d-flex align-items-center justify-content-end">
            <DownloadBtn url={path} ext={extension} name={file?.document_name}>
              <a href={path} rel="noreferrer" title={file?.document_name} target="_blank" className="download-link ms-1 d-flex align-items-center ">
                <Button text icon={() => <Img name="download"></Img>}></Button></a>
            </DownloadBtn>
          </div>
          <div className='w-100 d-flex align-items-start'>
            <div className='w-25 d-flex flex-column gap-2'>
              {
                data?.documents.map((item, idx) => {
                  return (
                    <PdfViewMenu key={idx} file={item} setFile={setFile} />
                  )
                })
              }
            </div>
            <div className='w-75 position-sticky top-0'>
              {
                extension === "pdf" ? <PDFViewer url={path}></PDFViewer> :
                  <div className="d-flex w-100 align-items-center justify-content-center ">
                    <img src={path} alt="" className="border border-4  border-black " />
                  </div>
              }
            </div>
          </div>
        </>
        : <p className='topic-txt'>No document found</p>}
    </div>
  )
}

export default DocViewer