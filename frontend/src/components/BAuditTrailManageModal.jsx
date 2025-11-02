import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Timeline } from "primereact/timeline";
import { useRef, useState } from "react";
import Img from "./Img";
import { useGetManageAuditTrailQuery } from "../redux/api/auditTrailAPI";
import {
  dateMonthYear,
  timeFormatWithRange,
  yearMonthDate,
} from "../utils/dateConverter";
import { gridToolTipOptins } from "../utils/tooltipUtils";

const BAuditTrailManageModal = ({ data, title }) => {
  const [visible, setVisible] = useState(false);
  const { data: events } = useGetManageAuditTrailQuery(data);

  const customizedMarker = () => {
    return <Img name="in_active_tick" className="icon-green" />;
  };
  const customizedContent = (item) => {
    return (
      <>
        <p className="regular-semibold-text">
          {item?.case_type} | {item?.description}{" "}
        </p>
        {/* <p className="fw-small text-wrap">
          {dateMonthYear(item.created_on)} |{" "}
          {timeFormatWithRange(item.created_on)} | {item.user.first_name}{" "}
          {item.user.last_name}{" "}
        </p> */}
        <p className="fw-small text-wrap">
          {dateMonthYear(item?.created_on)} |{" "}
          {timeFormatWithRange(item?.created_on)} | {item?.created_by}{" "}
        </p>
      </>
    );
  };
  const dialogRef = useRef(null);
  const onDialogShow = () => {
    const divElement = document?.querySelector(".p-dialog-content");
    divElement.scrollTop = divElement.scrollHeight;
  };
  return (
    <div className="d-flex align-items-center">
      <Button
        text
        {...gridToolTipOptins("Audit Trail")}
        className="manage-table-action-svg p-0 d-flex align-items-center"
        data-testid="audit-trail"
        onClick={() => setVisible(true)}
      >
        <Img name="audit_trail" />
      </Button>
      <Dialog
        header="View Audit Log"
        ref={dialogRef}
        visible={visible}
        style={{ width: "50vw" }}
        onHide={() => {
          if (!visible) return;
          setVisible(false);
        }}
        onShow={onDialogShow}
      >
        <div className="scroll-bar">
          <p className="topic-txt">{title}</p>
          <Timeline
            value={events?.items}
            className="custom-timeline mx-auto"
            data-testid="audit-trail-timeline"
            marker={customizedMarker}
            content={customizedContent}
          />
        </div>
      </Dialog>
    </div>
  );
};

export default BAuditTrailManageModal;
