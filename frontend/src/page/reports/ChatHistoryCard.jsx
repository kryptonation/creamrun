import { Dialog } from "primereact/dialog";
import Img from "../../components/Img";
import { Button } from "primereact/button";
import { forwardRef, useState } from "react";
import { monthDateYearHrsMin } from "../../utils/dateConverter";
import ShareBtn from "./ShareChatModal";

const ChatHistoryCard = forwardRef(({ data, onClick },ref) => {
  const [visible, setVisible] = useState(false);
  const headerElement = (
    <div className="inline-flex align-items-center justify-content-center gap-2">
      <p className="topic-txt fw-normal ">Share Query</p>
      <p className="regular-text  fw-normal ">
        Vehicles due for inspection this month.
      </p>
    </div>
  );

  return (
    <div  ref={ref}  className="d-flex prompt-card">
      <div
        type="button"
        onClick={() => onClick(data)}
        className="d-flex flex-column"
      >
        <p className="user-prompt regular-text" data-testid="user-prompt">
          {data?.prompt}
        </p>
        <p className="text-grey fw-small prompt-user-name">
          <span data-testid="prompt-time">
            {monthDateYearHrsMin(data?.created_on)}
          </span>
        </p>
      </div>
      <Button
        type="button"
        className="fav-btn"
        data-testid="fav-btn"
        onClick={() => setVisible(true)}
        icon={() => <Img name="share" />}
      />
      <Dialog
        visible={visible}
        header={headerElement}
        style={{ width: "50vw" }}
        onHide={() => {
          if (!visible) return;
          setVisible(false);
        }}
      >
      <ShareBtn data={data}></ShareBtn>
      </Dialog>
    </div>
  );
});


export default ChatHistoryCard;
