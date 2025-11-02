const BCard = ({ label, value }) => {
    return (
        <div className="p-3" style={{ display: 'flex', width: 'warp' }}>
            <p className="text-grey regular-text">{label}</p>
            <p className="regular-semibold-text mx-2">{value || "-"}</p>
        </div>
    );
};

export default BCard;
