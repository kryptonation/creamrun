import React, { useState } from 'react';
import BSuccessMessage from '../../components/BSuccessMessage';
import { useNavigate } from 'react-router-dom';

const EsignConfirmation = () => {
    const navigate = useNavigate();
    const [isOpen, setOpen] = useState(true);

    return (
        <div >
            <BSuccessMessage
                isHtml={true}
                isOpen={isOpen}
                message={`Lease completion process is successful for Medallion No <strong>5X23</strong> and <br>Vehicle Plate No <strong>Y214027C</strong>.`}
                title="Lease completion is successful"
                onCancel={() => {
                    console.log('Cancel');
                    setOpen(false);
                    navigate('/manage-lease', { replace: true });
                }}
            />
        </div>
    );
};

export default EsignConfirmation;
