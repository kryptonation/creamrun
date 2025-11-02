const BCaseCard = ({label,value,className,dataTestId}) => {
  return (
    <div className={className}>
      <p className="text-grey mb-0 regular-text">{label}</p>
      <p className="regular-semibold-text " data-testid={dataTestId|| `card-${label.toLowerCase().replace(/\s+/g, '-')}`}>{value||"-"}</p>
    </div>
  );
};

export default BCaseCard;
