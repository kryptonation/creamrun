import BBreadCrumb from "../../../components/BBreadCrumb";
import { Link, NavLink } from "react-router-dom";
import { useState } from "react";
import LeasePayment from "./LeasePayment";
import LeaseDocumentVerify from "./LeaseDocumentVerify";

const MedallionLeaseCancel = () => {
    const [index, setIndex] = useState(1)

    // const breadcrumbItems = [
    //     { label: "Home" },
    //     { label: "Medallion" },
    //     { label: "Manage Medallion" },
    //     { label: "Mustafa" },
    // ];
    const breadcrumbItems = [
        {
          template: () => (
            <Link to="/" className="font-semibold text-grey">
              Home
            </Link>
          ),
        },
        {
          template: () => (
            <Link to="/manage-medallion" className="font-semibold text-grey">
              Medallion
            </Link>
          ),
        },
        {
          template: () => (
            <Link to={`/manage-medallion`} className="font-semibold text-black">
              Manage Medallion
            </Link>
          ),
        },
      ];
    const handleNavClick = (step) => {
        console.log(`NavLink for step ${step} clicked`);
        setIndex(step)
    };

    return (
        <div className="common-layout w-100 h-100 d-flex flex-column gap-4">
            <BBreadCrumb breadcrumbItems={breadcrumbItems} separator="/" />
            <div className="d-flex flex-column">
                <p className="topic-txt">Lease Termination</p>
            </div>
            <div className="d-flex align-items-center cus-gap-5">
                <NavLink end className={({ isActive }) => [isActive ? "active" : "", "step-menu d-flex align-items-center gap-2 text-grey"].join(" ")} onClick={() => handleNavClick(1)}>
                    <span className="d-flex align-items-center justify-content-center rounded-circle">1</span>Settle Lease Payments
                </NavLink>
                <NavLink className={({ isActive }) => [isActive ? "active" : "", "step-menu d-flex align-items-center gap-2 text-grey"].join(" ")} onClick={() => handleNavClick(2)}>
                    <span className="d-flex align-items-center justify-content-center rounded-circle">2</span>Upload Payment Proof
                </NavLink>
            </div>

            {index === 1 && <LeasePayment></LeasePayment>}
            {index === 2 && <LeaseDocumentVerify></LeaseDocumentVerify>}
        </div>
    )
}

export default MedallionLeaseCancel;
