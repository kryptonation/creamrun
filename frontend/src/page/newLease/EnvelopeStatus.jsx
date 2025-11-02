import { useEffect } from "react";
import { useGetEnvelopeStatusMutation } from "../../redux/api/esignApi";

const EnvelopeStatus = ({ rowData }) => {
    const [getEnvelopeStatus, { data, error, isLoading }] = useGetEnvelopeStatusMutation();


    const statusMap = {
        sent: "Mail Sent",
        "envelope-completed": "Completed",
        "envelope-sent": "Mail Sent"
    };

    useEffect(() => {
        if (rowData?.document_envelope_id) {
            getEnvelopeStatus(rowData.document_envelope_id);
        }
    }, [rowData, rowData?.document_envelope_id, getEnvelopeStatus]);

    function mapStatus(status) {
        return statusMap[status] || status;
    }


    return (
        <div className="d-flex align-items-center gap-3">
            {!rowData?.document_envelope_id ? (
                <span>-</span>
            ) : isLoading ? (
                <span>-</span>
            ) : error ? (
                <span className="text-danger">-</span>
            ) : (
                <span>{mapStatus(data?.status) || "-"}</span>
            )}
        </div>

    );
};

export default EnvelopeStatus;
