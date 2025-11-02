import { Button } from "primereact/button";
import Img from "./Img";
import { useDeleteDocumentMutation } from "../redux/api/medallionApi";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setIsUpload } from "../redux/slice/uploadSlice";
import PdfViewModal from "./PdfViewModal";
import { removeUnderScore } from "../utils/utils";

const BAttachedFile = ({ file, setIsOpen, hideDelete = false }) => {
  const [deleteFunc, { isSuccess }] = useDeleteDocumentMutation();
  useEffect(() => {
    if (isSuccess && setIsOpen) {
      setIsOpen(false);
    }
  }, [isSuccess, setIsOpen]);
  const extension = file?.name?.split(".").pop();
  const img = extension === "pdf" ? "pdf" : "img";
  const path = file?.presigned_url ?? file?.path;

  const dispatch = useDispatch();

  return (
    <div className="d-flex align-items-center justify-content-between gap-3 attach-sec w-max-content">
      {file.path ? (
        <>
          <PdfViewModal
            triggerButton={
              <button
                type="button"
                data-testid="attached-file-name"
                className="btn p-0 d-flex w-100 justify-content-between "
              >
                <div className="d-flex align-items-center gap-3 p-2">
                  <Img name={img} />
                  <div className="text-left ml-3 attached-file-name">
                    {file.name}
                    <p>{new Date().toLocaleDateString()}</p>
                  </div>
                </div>
                {file?.id && !hideDelete && (
                  <Button
                    type="button"
                    data-testId="doc-close-icon"
                    className="close-icon"
                    icon={() => (
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12.0094 0C18.6375 0 24.0188 5.4 24.0094 12.0281C23.9906 18.6375 18.6 24 12 24C5.37189 24 -0.00936277 18.6 1.2231e-05 11.9719C0.00938723 5.37187 5.40001 0 12.0094 0ZM11.9813 22.7812C17.9344 22.7906 22.7813 17.9531 22.7813 12.0094C22.7813 6.075 17.9625 1.2375 12.0469 1.21875C6.08439 1.2 1.22814 6.02812 1.21876 11.9719C1.20939 17.925 6.03751 22.7719 11.9813 22.7812Z"
                          fill="black"
                        />
                        <path
                          d="M12.0001 11.0999C13.1064 9.99365 14.1751 8.91553 15.2439 7.84678C15.347 7.74365 15.4408 7.64053 15.5439 7.55615C15.8158 7.3499 16.1064 7.34053 16.3501 7.58428C16.5939 7.82803 16.5751 8.11865 16.3783 8.39053C16.2845 8.5124 16.1626 8.61553 16.0595 8.72803C15.0001 9.7874 13.9408 10.8468 12.8251 11.953C13.1626 12.2812 13.4908 12.5905 13.8001 12.8999C14.6064 13.6968 15.422 14.503 16.2283 15.3093C16.5564 15.6374 16.6033 16.003 16.3689 16.2562C16.1251 16.5187 15.722 16.4812 15.3845 16.153C14.2689 15.0374 13.1626 13.9218 12.0095 12.7687C11.8689 12.8999 11.7376 13.0124 11.6251 13.1249C10.6408 14.1093 9.65638 15.0937 8.68138 16.0687C8.28763 16.4624 7.89388 16.5374 7.63138 16.2562C7.36888 15.9843 7.44388 15.6093 7.85638 15.2062C7.96888 15.0937 8.08138 14.9905 8.1845 14.878C9.15013 13.8937 10.1064 12.9187 11.147 11.8593C10.8751 11.6062 10.5658 11.3343 10.2658 11.0437C9.44075 10.228 8.62513 9.4124 7.8095 8.59678C7.4345 8.22178 7.36888 7.84678 7.63138 7.5749C7.90325 7.29365 8.2595 7.3499 8.64388 7.73428C9.75013 8.8499 10.8564 9.95615 12.0001 11.0999Z"
                          fill="black"
                        />
                      </svg>
                    )}
                    onClick={(e) => {
                      dispatch(setIsUpload(true));
                      deleteFunc(file?.id);
                      e.stopPropagation();
                    }}
                  />
                )}
              </button>
            }
            downloadUrl={path}
            downloadName={file.name}
            extension={extension}
            previewUrl={path}
            title={removeUnderScore(file?.document_type).replace(
              /\b\w/g,
              (char) => char.toUpperCase()
            )}
          />
        </>
      ) : (
        <div className="d-flex align-items-center gap-3 p-2">
          <Img name={img} />
          <div className="text-left ml-3 attached-file-name">
            {file.name}
            <p>{new Date().toLocaleDateString()}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BAttachedFile;
