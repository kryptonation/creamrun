import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Timeline } from "primereact/timeline";
import BInputText from "./BInputText";
import { useEffect, useRef, useState } from "react";
import { useFormik } from "formik";
import Img from "./Img";
import {
  useCreateAuditTrailMutation,
  useGetAuditTrailQuery,
} from "../redux/api/auditTrailAPI";
import {
  dateMonthYear,
  timeFormatWithRange,
  yearMonthDate,
} from "../utils/dateConverter";

const BAuditTrailModal = ({ caseId, stepId }) => {
  const [visible, setVisible] = useState(false);
  const { data: events } = useGetAuditTrailQuery(caseId);
  const [createAudit, { isSuccess: createIsSuccess }] =
    useCreateAuditTrailMutation();

  const customizedMarker = () => {
    return <Img name="in_active_tick" className="icon-green" />;
  };
  const customizedContent = (item) => {
    return (
      <>
        <p className="regular-semibold-text">
          {item.case_type} | {item.description}{" "}
        </p>
        <p className="fw-small text-wrap">
          {dateMonthYear(item.created_on)} |{" "}
          {timeFormatWithRange(item.created_on)} | {item.user.first_name}{" "}
          {item.user.last_name}{" "}
        </p>
      </>
    );
  };
  const formik = useFormik({
    initialValues: {},
    validateOnChange: true,
    onSubmit: (values) => {
      console.log("Audit trail values", values, caseId, stepId);
      createAudit({
        case_no: caseId,
        step_id: stepId,
        description: values?.description,
        driver_id: 0,
        medallion_id: 0,
        vehicle_id: 0,
      });
    },
  });
  const dialogRef = useRef(null);
  useEffect(() => {
    if (createIsSuccess) {
      onDialogShow();
      formik.resetForm();
      formik.setFieldValue("description", "");
    }
  }, [createIsSuccess]);

  const onDialogShow = () => {
    const divElement = document?.querySelector(".p-dialog-content");
    divElement.scrollTop = divElement.scrollHeight;
  };
  return (
    <div>
      <Button
        label="View Audit Log"
        icon={() => <Img name="audit_trail" />}
        data-testid="view-audit-btn"
        className="text-blue regular-text upload-common-btn manage-table-action-svg d-flex gap-2"
        text
        onClick={() => setVisible(true)}
      />
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
          <p className="topic-txt">Audit Trail History</p>
          <Timeline
            value={events?.results}
            data-testid="audit-trail-timeline"
            className="custom-timeline mx-auto"
            marker={customizedMarker}
            content={customizedContent}
          />
          <form
            action=""
            className="common-form d-flex flex-column gap-5"
            onSubmit={formik.handleSubmit}
          >
            <div className="form-section">
              <div className="form-body">
                <p className="regular-semibold-text mb-4 ">Description</p>
                <BInputText
                  variable={{
                    id: "description",
                    label: "Enter your description",
                  }}
                  formik={formik}
                ></BInputText>
                <div className="w-100 position-sticky bottom-0 pt-3 ">
                  <Button
                    disabled={!formik?.values?.description}
                    label="Submit Details"
                    data-testid="submit-audit-btn"
                    type="submit"
                    severity="warning"
                    className="border-radius-0 primary-btn "
                  />
                </div>
              </div>
            </div>
          </form>
        </div>
      </Dialog>
    </div>
  );
};

export default BAuditTrailModal;
