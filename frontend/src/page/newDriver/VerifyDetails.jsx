import { useEffect, useState } from "react";
import Img from "../../components/Img";
import { dateMonthYear } from "../../utils/dateConverter";
import { Button } from "primereact/button";
import {
  medallionApi,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../redux/api/medallionApi";
import BAttachedFile from "../../components/BAttachedFile";
import { useNavigate } from "react-router-dom";
import { formatAddress, getFullName } from "../../utils/utils";
import BSuccessMessage from "../../components/BSuccessMessage";
import { useDispatch } from "react-redux";
import { statesOptions } from "../../utils/variables";
import DocumentGridViewOnly from "../../components/DocumentGridViewOnly";

const VerifyDetails = ({
  caseId,
  caseData,
  currentStepId,
  currentStep,
  hasAccess,
}) => {
  const navigate = useNavigate();
  const [isOpen, setOpen] = useState(false);
  const [licenseDetails, setLicenseDetails] = useState({
    "DMV License Number": "",
    "DMV License Expiry Date": "",
    "TLC License Number": "",
    "TLC License Expiry Date": "",
  });

  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();
  const [processFlow, { isSuccess: isProccessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const dispatch = useDispatch();

  const handleProcessFlow = () => {
    processFlow({
      params: caseId,
      data: {
        step_id: currentStepId,
        data: {
          driver_details: {
            driver_id:
              currentStep?.driver_details?.personal_details?.driver_lookup_id,
          },
        },
      },
    });
  };

  useEffect(() => {
    if (isProccessDataSuccess) {
      dispatch(medallionApi.util.invalidateTags(["caseStep"]));
    }
    if (
      isProccessDataSuccess &&
      caseData &&
      caseData?.case_info?.case_status !== "Closed"
    ) {
      moveCase({ params: caseId });
    }
  }, [isProccessDataSuccess]);
  const [driverState, setDriverState] = useState("");
  useEffect(() => {
    console.log("Verify details currentstep", currentStep);
    if (currentStep) {
      const stateCode =
        currentStep?.driver_details?.driver_primary_address_details?.state;
      const selectedState = statesOptions.find(
        (state) => state.code === stateCode
      );
      console.log(selectedState);
      setDriverState(selectedState?.name);
      setLicenseDetails({
        "DMV License Number":
          currentStep?.driver_details?.dmv_license_info?.dmv_license_number ||
          "",
        "DMV License Expiry Date":
          dateMonthYear(
            currentStep?.driver_details?.dmv_license_info
              ?.dmv_license_expiry_date
          ) || "",
        "TLC License Number":
          currentStep?.driver_details?.tlc_license_info?.tlc_license_number ||
          "",
        "TLC License Expiry Date":
          dateMonthYear(
            currentStep?.driver_details?.tlc_license_info
              ?.tlc_license_expiry_date
          ) || "",
      });
    }
  }, [currentStep]);

  useEffect(() => {
    if (isMoveDataSuccess) {
      setOpen(true);
    }
  }, [isMoveDataSuccess]);

  return (
    <div>
      {/* <div className="d-flex align-items-center">
        <Img name="document" />
        <p className="sec-topic align-items-center px-2">
          Verify Details and Approve
        </p>
      </div> */}

      {/* Driver Name */}
      <div className="regular-text my-3 mx-4">
        <p className="text-grey">Driver Name</p>
        {getFullName(
          currentStep?.driver_details?.personal_details?.first_name,
          currentStep?.driver_details?.personal_details?.middle_name,
          currentStep?.driver_details?.personal_details?.last_name
        )}
      </div>

      <div className="d-flex justify-content-between flex-wrap gap-3 mb-4">
        {/* Driver Details */}
        <div>
          <p className="sec-topic mb-3">Driver Details</p>
          <div className="d-flex gap-4">
            <span className="common-svg-topic">
              <Img name="img_driver" />
            </span>
            <div className="d-flex flex-column gap-3">
              <div className="d-flex flex-column flex-md-row gap-3">
                <div>
                  <p className="topic-txt">
                    {getFullName(
                      currentStep?.driver_details?.personal_details?.first_name,
                      currentStep?.driver_details?.personal_details
                        ?.middle_name,
                      currentStep?.driver_details?.personal_details?.last_name
                    )}
                  </p>
                  <p className="regular-text">
                    SSN :{" "}
                    {currentStep?.driver_details?.personal_details
                      ?.driver_ssn || ""}
                  </p>
                </div>
              </div>
              {/* <div className="d-flex flex-row gap-3">
                <span className="manage-table-action-svg">
                  <Img name="ic_location" />
                </span>
                <div>
                  <p>
                    {formatAddress(
                      currentStep?.driver_details
                        ?.driver_primary_address_details
                    )?.address || ""}
                  </p>
                  <p>
                    {formatAddress(
                      currentStep?.driver_details
                        ?.driver_primary_address_details
                    )?.coordinates || ""}
                  </p>
                </div>
              </div> */}
              <div className="d-flex gap-2 regular-text">
                {/* <FaMapMarkerAlt className="text-secondary mt-1" /> */}
                <Img className="icon" name="ic_location" />
                <div>
                  {currentStep?.driver_details?.driver_primary_address_details
                    ?.address_line_1 && (
                    <p className="mb-1">
                      {
                        currentStep?.driver_details
                          ?.driver_primary_address_details?.address_line_1
                      }
                    </p>
                  )}
                  {currentStep?.driver_details?.driver_primary_address_details
                    ?.address_line_2 && (
                    <p className="mb-1">
                      {
                        currentStep?.driver_details
                          ?.driver_primary_address_details?.address_line_2
                      }
                    </p>
                  )}
                  <p className="mb-1">
                    {
                      currentStep?.driver_details
                        ?.driver_primary_address_details?.city
                    }
                    ,{""}
                    {driverState}–{" "}
                    {
                      currentStep?.driver_details
                        ?.driver_primary_address_details?.zip
                    }
                  </p>
                </div>
              </div>
              <div className="d-flex flex-row gap-3">
                <span className="manage-table-action-svg">
                  <Img name="img_tel_phone" />
                </span>
                <p>
                  {currentStep?.driver_details?.personal_details
                    ?.phone_number_1 || ""}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Img name="img_vertical_line" style={{ marginLeft: 10 }} />

        {/* License Details */}
        <div>
          <p className="sec-topic mb-3">License Details</p>
          <table className="w-100 regular-text">
            <tbody className="regular-text">
              {Object.entries(licenseDetails).map(([key, value]) => (
                <tr key={key}>
                  <td className="text-grey py-1">{key}</td>
                  <td className="regular-semibold-text">
                    <p className="ms-3">{value}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Img name="img_vertical_line" style={{ marginLeft: 10 }} />

        {/* Documents */}
        {/* <div>
          <p className="sec-topic mb-3">Attached Documents</p>
          <div className="d-flex flex-column gap-3">
            {currentStep?.driver_documents?.map((file, index) => (
              <BAttachedFile
                key={index}
                file={{
                  name: file?.document_name || "",
                  path: file?.presigned_url || "",
                }}
              />
            ))}
          </div>
        </div> */}
      </div>
      <div>
        <p className="sec-topic mb-3">Attached Documents</p>
        <div className="pb-3">
          <DocumentGridViewOnly
            data={currentStep?.driver_documents}
          ></DocumentGridViewOnly>
        </div>
      </div>

      {/* Approve Button */}
      <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        <Button
          disabled={!hasAccess}
          label="Approve Driver"
          data-testId="btn_approve_driver"
          severity="warning"
          onClick={handleProcessFlow}
          className="border-radius-0 primary-btn mt-5"
        />
      </div>

      {/* Success Popup */}
      <BSuccessMessage
        isOpen={isOpen}
        message={`Driver ${getFullName(
          currentStep?.driver_details?.personal_details?.first_name,
          currentStep?.driver_details?.personal_details?.middle_name,
          currentStep?.driver_details?.personal_details?.last_name
        )} is registered successfully`}
        title="Verified and Approved Successfully"
        onCancel={() => {
          setOpen(false);
          navigate("/manage-driver", { replace: true });
        }}
        onConfirm={() => {
          setOpen(false);
          navigate("/manage-driver", { replace: true });
        }}
      />
    </div>
  );
};

export default VerifyDetails;
