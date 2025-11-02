import React from 'react'

const DownloadBtn = ({ children, url, name, ext }) => {
  const handler = async () => {
    const mimeTypes = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      zip: 'application/zip',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // Excel modern
    };

    const getFileMimeType = (fileExtension) => {
      return mimeTypes[fileExtension.toLowerCase()] || 'application/octet-stream'; // Fallback to binary stream if not found
    };

    const getFileFormatFromUrl = (url) => {
      // const fileName = url.split('/').pop().split('?')[0];
      const fileExtension = url.split('.').pop();
      return ext || fileExtension || "pdf";
    };

    const fileFormat = getFileFormatFromUrl(name);
    const fileMimeType = getFileMimeType(fileFormat);


    const imageBlob = await fetch(url).
      then((rep) => rep.arrayBuffer()).then((buffer) => new Blob([buffer], { type: fileMimeType })).catch((err) => console.log(err));
    const link = document.createElement("a");

    link.href = URL.createObjectURL(imageBlob);
    link.download = `${name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  };
  return React.cloneElement(children, { onClick: handler });
};

export default DownloadBtn;