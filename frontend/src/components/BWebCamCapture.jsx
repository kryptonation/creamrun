import { Button } from "primereact/button";
import { useCallback, useEffect, useRef, useState } from "react";

const BWebCamCapture = ({ closeWebCam }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [capturedImages, setCapturedImages] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    startWebcam();

    // Clean up on unmount
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  const startWebcam = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      setError(
        "Error accessing webcam. Please make sure you have a webcam connected and have granted permission."
      );
      console.error("Error accessing webcam:", err);
    }
  };

  const captureImage = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageDataUrl = canvas.toDataURL("image/png");
        setCapturedImages(imageDataUrl);
      }
    }
  }, []);

  // Fixed: Convert data URL to proper File object
  const dataURItoFile = (dataURI, fileName) => {
    // Split the data URI
    const arr = dataURI.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    // Create a proper File object (not just Blob)
    return new File([u8arr], fileName, { type: mime });
  };

  const submitHandler = () => {
    if (capturedImages) {
      // Convert the data URL to a proper File object
      const file = dataURItoFile(capturedImages, "webcam-capture.png");
      closeWebCam(file);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="d-flex align-items-center justify-content-center gap-4 w-100 mb-2">
        <video ref={videoRef} className="w-50" playsInline autoPlay />
        <div className="w-50">
          {!capturedImages ? (
            <div className="d-flex align-items-center justify-content-center flex-column gap-2">
              <p className="topic-txt">No photos captured yet. </p>
              <p>Click Take Photo to capture an image.</p>
            </div>
          ) : (
            <img
              src={capturedImages || "/placeholder.svg"}
              alt={`Captured`}
              className="w-100"
            />
          )}
        </div>
      </div>
      <Button
        onClick={captureImage}
        label="Take Photo"
        data-testId="capture-btn"
        disabled={!!error}
      ></Button>
      <Button
        onClick={submitHandler}
        outlined
        label="Submit"
        data-testId="submit-btn"
        className="text-black gap-2 outline-btn fs-16-semibold"
        type="button"
        disabled={!capturedImages}
      ></Button>
      <canvas ref={canvasRef} className="d-none" />
    </div>
  );
};

export default BWebCamCapture;
