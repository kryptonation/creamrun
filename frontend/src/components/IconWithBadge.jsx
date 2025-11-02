import React from "react";
import Img from "./Img";

const IconWithBadge = ({
    iconClass,
    badgeIconClass,
}) => {
    return (
        <div className="icon-with-badge-container" style={{ width: 40 }}>
            <img src={iconClass} alt="" style={{ width: 40 }} />
            {/* <div
                className="badge"
            >
                <Img name={badgeIconClass}></Img>
            </div> */}
            <span className="badge position-absolute top-0 end-0" >
                <Img name={badgeIconClass}></Img>
            </span>

        </div>
        //    < <div className="icon-with-badge-container">
        //         <div className="icon-with-badge">
        //             <img src={iconClass} alt="" style={{ width: 40 }} />
        //             <div
        //                 className="badge"
        //             >
        //                 <Badge className="badge-icon" value={"1"} severity="warning"></Badge>

        //                 <Img name={badgeIconClass}></Img>
        //             </div>
        //         </div>
        //     </div>>
    );
};

export default IconWithBadge;
