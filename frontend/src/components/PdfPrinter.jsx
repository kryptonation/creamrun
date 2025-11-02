import { Button } from "primereact/button";
import { useEffect, useRef, useState } from "react";
import Img from "./Img";

const PdfPrinter = ({ url }) => {
  const iframeRef = useRef(null);
  const [blobUrl, setBlobUrl] = useState("");

  const handlePrint = () => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    }
  };

  useEffect(() => {
    const loadFile = async () => {
      if (!url) return;

      try {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const blob = new Blob([buffer], { type: "application/pdf" }); // Only PDF for printing
        const objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } catch (err) {
        console.error("Failed to load file:", err);
      }
    };

    loadFile();

    // Clean up the blob URL on unmount
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [url]);

  return (
    <div>
      <Button
        onClick={handlePrint}
        className="manage-table-action-svg p-0"
        icon={() => <Img name="print" />}
      />
      {/* Make iframe visible for browser to render instead of triggering download */}
      {blobUrl && (
        <iframe
          ref={iframeRef}
          src={blobUrl}
          title="PDF Printer"
          style={{ display: "none" }} // Can be "block" if you want preview
        />
      )}
    </div>
  );
};

export default PdfPrinter;
