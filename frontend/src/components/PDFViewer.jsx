// import { useState } from "react";
// import { Document, Page } from "react-pdf";
// import { Paginator } from "primereact/paginator";
// import "react-pdf/dist/esm/Page/AnnotationLayer.css";
// import "react-pdf/dist/esm/Page/TextLayer.css";

// const PDFViewer = ({ url }) => {
//   const [numPages, setNumPages] = useState();

//   const [first, setFirst] = useState(0);

//   const onPageChange = (event) => {
//     setFirst(event.first);
//   };
//   function onDocumentLoadSuccess({ numPages }) {
//     setNumPages(numPages);
//   }

//   return (
//     <div className="position-relative pdf-viewer " data-testid="pdf-viewer">
//       {numPages && (
//         <Paginator
//           data-testid="paginator-pdf"
//           first={first}
//           rows={1}
//           className="position-absolute shadow "
//           totalRecords={numPages}
//           onPageChange={onPageChange}
//           template="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
//         />
//       )}
//       <Document
//         file={url}
//         onLoadSuccess={onDocumentLoadSuccess}
//         className="z-n1"
//       >
//         <Page
//           pageNumber={first + 1}
//           className="d-flex align-items-center justify-content-center"
//         />
//       </Document>
//     </div>
//   );
// };

// export default PDFViewer;
import { useState } from "react";
import { Document, Page } from "react-pdf";
import { Paginator } from "primereact/paginator";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

const PDFViewer = ({ url }) => {
  const [numPages, setNumPages] = useState();
  const [first, setFirst] = useState(0);

  const onPageChange = (event) => {
    setFirst(event.first);
  };

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  return (
    <div
      className="position-relative pdf-viewer"
      data-testid="pdf-viewer"
      style={{ width: "100%", height: "100%", overflow: "auto" }}
    >
      {numPages && (
        <Paginator
          data-testid="paginator-pdf"
          first={first}
          rows={1}
          className="position-absolute shadow"
          totalRecords={numPages}
          onPageChange={onPageChange}
          template="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        />
      )}

      <Document
        file={url}
        onLoadSuccess={onDocumentLoadSuccess}
        className="z-n1"
      >
        <Page
          pageNumber={first + 1}
          width={600} // ✅ Set page width explicitly (adjust as per container)
          className="d-flex align-items-center justify-content-center"
          // width={window.innerWidth * 0.8}
        />
      </Document>
    </div>
  );
};

export default PDFViewer;
