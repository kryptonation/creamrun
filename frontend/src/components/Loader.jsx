import React from 'react';
import { useSelector } from 'react-redux';
import { Dialog } from 'primereact/dialog';

const Loader = () => {
  const loading = useSelector((state) => state.loader.loading); // Get loading state from Redux
  return loading ? <Dialog visible={loading} style={{ width: '50vw' }} className='bg-transparent border-0 d-flex align-items-center justify-ceontent-center'
  content={() => (
    <div data-testid="bat-loader" className="loader  d-flex align-items-center justify-ceontent-center flex-column gap-2">
             <svg viewBox="0 0 294 295" fill="none"  className={`loader-svg img-loader`}>
             <path d="M146.941 293.51C78.9406 293.54 20.2406 247.23 4.13061 179.74C-5.05939 141.3 1.24061 104.73 21.4806 70.7003C26.3606 62.4903 35.0106 60.1703 42.3706 64.7103C49.4406 69.0603 51.4306 77.8303 46.6906 85.7203C33.3906 107.85 27.3606 131.87 30.0906 157.4C34.5506 199.26 55.5306 231.07 92.8106 250.69C160.481 286.31 242.851 248.43 260.951 174.04C276.081 111.83 237.461 47.9503 175.311 33.0203C166.181 30.8303 156.601 30.3603 147.191 29.4803C134.751 28.3203 128.131 16.3503 134.781 6.54033C137.941 1.88033 142.521 0.020334 148.061 0.010334C213.851 -0.179666 273.521 47.2903 289.251 111.49C308.361 189.45 261.711 267.09 186.291 287.88C173.571 291.39 160.201 292.53 147.141 294.77C147.081 294.34 147.011 293.92 146.941 293.51Z" fill="white"/>
             </svg>
            <p className='text-white topic-txt'>Loading</p> 
   </div>
    )}>
      
  </Dialog>:null
//   return loading ?  <BModal isOpen={true}>
//   <BModal.Content>
//   <div className="loader">
//             <svg viewBox="0 0 294 295" fill="none"  className={`loader-svg img-loader`}>
//             <path d="M146.941 293.51C78.9406 293.54 20.2406 247.23 4.13061 179.74C-5.05939 141.3 1.24061 104.73 21.4806 70.7003C26.3606 62.4903 35.0106 60.1703 42.3706 64.7103C49.4406 69.0603 51.4306 77.8303 46.6906 85.7203C33.3906 107.85 27.3606 131.87 30.0906 157.4C34.5506 199.26 55.5306 231.07 92.8106 250.69C160.481 286.31 242.851 248.43 260.951 174.04C276.081 111.83 237.461 47.9503 175.311 33.0203C166.181 30.8303 156.601 30.3603 147.191 29.4803C134.751 28.3203 128.131 16.3503 134.781 6.54033C137.941 1.88033 142.521 0.020334 148.061 0.010334C213.851 -0.179666 273.521 47.2903 289.251 111.49C308.361 189.45 261.711 267.09 186.291 287.88C173.571 291.39 160.201 292.53 147.141 294.77C147.081 294.34 147.011 293.92 146.941 293.51Z" fill="white"/>
//             </svg>
//             Loading...
//   </div>
//   </BModal.Content>
// </BModal> : null;
};

export default Loader;