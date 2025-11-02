import { Button } from "primereact/button";
import Img from "../../components/Img";
import { useNavigate, useParams } from "react-router-dom";

const MedallionListModal = ({
  setIsOpen,
  data,
  processFlowFunc,
  isMedallionClickable,
}) => {
  const params = useParams();
  const navigate = useNavigate();
  return (
    <div className="d-flex flex-column gap-4 align-items-center p-5 bg-light medallion-list-modal">
      <div className="w-100 d-flex align-items-center justify-content-between mb-2 header">
        <div>
          <div className="topic-txt">
            {data.entity_name}
            <p className="text-grey fw-small">Medallion List</p>
          </div>
        </div>
        <Button
          text
          className="close-icon"
          icon={() => <Img name="modalCancel"></Img>}
          onClick={() => {
            setIsOpen(false);
          }}
        ></Button>
      </div>
      <div className="mb-0 text-center modal-body d-flex flex-column gap-4 w-100">
        {data.additional_info.medallions.map((item, idx) => {
          return (
            <div
              className="d-flex justify-content-between w-100 pb-3"
              key={idx}
            >
              <div className="d-flex align-items-center gap-2">
                <img src="/assets/images/fillsuccess.png"></img>
                <p
                  className="topic-txt"
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    navigate(
                      `/manage-medallion/view?medallionId=${item.medallion_number}`
                    )
                  }
                >
                  {item.medallion_number}
                </p>
              </div>
              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn p-0 d-flex align-items-center justify-content-center gap-2"
                >
                  <Img name="medallian_success" />
                </button>
                <button
                  type="button"
                  className="btn p-0 d-flex align-items-center justify-content-center gap-2"
                  onClick={() =>
                    navigate(
                      `/new-medallion/doc-viewer/${data.additional_info.medallions[0].medallion_number}`
                    )
                  }
                >
                  <Img name="pdf" className="pdf-black" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {/* {isMedallionClickable && (
        <div className="w-100 d-flex align-items-center justify-content-center border-top gap-2 pt-1 modal-footer">
          <Button
            text
            icon={() => <Img name="add" />}
            data-testid="add-medallion"
            label="Add Medallion"
            outlined
            disabled={!isMedallionClickable}
            // onClick={() => processFlowFunc(data)}
            onClick={() => navigate("/new-medallion")}
          ></Button>
        </div>
      )} */}
    </div>
  );
};

export default MedallionListModal;
