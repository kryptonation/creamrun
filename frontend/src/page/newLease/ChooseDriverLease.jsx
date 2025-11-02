import BCaseCard from "../../components/BCaseCard";
import Img from "../../components/Img";
import { Button } from "primereact/button";
import { useEffect, useState } from "react";
import ChooseDriverTable from "./ChooseDriverTable";
import {
  medallionApi,
  useGetStepInfoQuery,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../redux/api/medallionApi";
import { getCurrentStep } from "../../utils/caseUtils";
import { useDispatch, useSelector } from "react-redux";
import { ADDCOLEASEFOR } from "../../utils/constants";

const ChooseDriverLease = ({
  caseId,
  caseData,
  currentStepId,
  currentStepData,
  hasAccess,
}) => {
  const { data: stepInfoData } = useGetStepInfoQuery(
    { caseNo: caseId, step_no: currentStepId },
    { skip: !currentStepId || !caseId }
  );
  const user = useSelector((state) => state.user.user);

  const [processFlow, { isSuccess: isProccessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [moveCase] = useMoveCaseDetailMutation();

  // Separate state for primary driver (single selection)
  const [primaryDriver, setPrimaryDriver] = useState(null);
  // Separate state for co-lease drivers (multiple selection)
  const [coLeaseDrivers, setCoLeaseDrivers] = useState([]);

  const [coLease, setCoLease] = useState(false);
  const dispatch = useDispatch();

  const leaseType = {
    ["dov"]: "DOV - Driver Owned Vehicle",
    ["long-term"]: "Long Term",
    ["short-term"]: "True weekly / Short Term",
    ["medallion-only"]: "Medallion-Only",
    ["shift-lease"]: 'Shift Lease',
  };

  const chooseDriver = () => {
    //  const data = selectedDrivers?.reduce((acc, driver, idx) => {
    //       acc = [...acc, {
    //           "driver_id": driver.driver_lookup_id,
    //           "is_day_night_shift": driver.is_day_night_shift ? true : false,
    //           "co_lease_seq": idx.toString()
    //       }]
    //       return acc
    //   }, [])
    // Combine primary driver and co-lease drivers
    const allSelectedDrivers = [];

    if (primaryDriver) {
      allSelectedDrivers.push({
        driver_id: primaryDriver.driver_lookup_id,
        is_day_night_shift: primaryDriver.is_day_night_shift || false,
        co_lease_seq: "0", // Primary driver gets sequence 0
      });
    }

    // Add co-lease drivers with sequential numbering
    coLeaseDrivers.forEach((driver, idx) => {
      allSelectedDrivers.push({
        driver_id: driver.driver_lookup_id,
        is_day_night_shift: driver.is_day_night_shift || false,
        co_lease_seq: (idx + 1).toString(), // Co-lease drivers start from 1
      });
    });

    console.log("chooseDriver()", {
      primaryDriver,
      coLeaseDrivers,
      allSelectedDrivers,
    });

    processFlow({
      params: caseId,
      data: {
        step_id: currentStepId,
        data: {
          authorized_agent: user.first_name,
          select_driver: allSelectedDrivers,
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
      caseData.case_info.case_status !== "Closed" &&
      getCurrentStep(caseData.steps).step_id === currentStepId
    ) {
      moveCase({ params: caseId });
    }
  }, [isProccessDataSuccess]);

  // Effect to reset co-lease state when primary driver is unselected
  useEffect(() => {
    if (!primaryDriver) {
      setCoLeaseDrivers([]);
      setCoLease(false);
    }
  }, [primaryDriver]);

  useEffect(() => {
    if (stepInfoData?.selected_driver_info) {
      const seq0List = stepInfoData?.selected_driver_info.filter(
        (d) => d.co_lease_seq === "0"
      );
      const seq1List = stepInfoData?.selected_driver_info.filter(
        (d) => d.co_lease_seq === "1"
      );

      if (seq0List.length > 0) {
        console.log("seq0List : ", seq0List);
        console.log("seq1List : ", seq1List);
        // var updatedDrivers = seq0List.map(({ driver_id, ...rest }) => ({
        //   ...rest,
        //   driver_lookup_id: driver_id,
        // }));
        setPrimaryDriver(seq0List[0]);

        if (seq1List.length > 0) {
          // updatedDrivers = seq1List.map(({ driver_id, ...rest }) => ({
          //   ...rest,
          //   driver_lookup_id: driver_id,
          // }));
          setCoLeaseDrivers(seq1List);
          setCoLease(true);
        }
      }
    }
  }, [stepInfoData]);

  // Check if we have any drivers selected
  const hasSelectedDrivers = primaryDriver || coLeaseDrivers.length > 0;

  return (
    <div className="w-100 h-100">
      <div className="d-flex align-items-center justify-content-between">
        <div className="topic-txt d-flex align-items-center gap-2">
          <Img name="driver" className="icon-black"></Img>Choose Drivers
        </div>
      </div>
      <div className="d-flex align-items-center gap-5 py-4 ">
        <BCaseCard
          label="Medallion No"
          value={currentStepData?.lease_case_details?.medallion_number}
        />
        <BCaseCard
          label="Medallion Owner"
          value={currentStepData?.lease_case_details?.medallion_owner}
        />
        <BCaseCard
          label="Vehicle VIN No"
          value={currentStepData?.lease_case_details?.vehicle_vin}
        />
        <BCaseCard
          label="Vehicle"
          value={(currentStepData?.lease_case_details?.make || "") + " " +
            (currentStepData?.lease_case_details?.model || "") + " " +
            (currentStepData?.lease_case_details?.year || "-")}
        />
        <BCaseCard
          label="Vehicle Plate No"
          value={currentStepData?.lease_case_details?.plate_number}
        />
        <BCaseCard
          label="Vehicle Type"
          value={currentStepData?.lease_case_details?.vehicle_type.replace("Wav", "WAV")}
        />
        <BCaseCard label="Lease Type" value={
          stepInfoData?.lease_case_details?.lease_type === "shift-lease"
            ? `${leaseType[stepInfoData?.lease_case_details?.lease_type]} - ${stepInfoData?.lease_case_details?.vehicle_availability || ""}`
            : leaseType[stepInfoData?.lease_case_details?.lease_type]
        } />
      </div>

      {/* Primary Driver Selection Table */}
      <div className="mb-4">
        <h6 className="mb-3">Primary Driver Selection</h6>
        <ChooseDriverTable
          stepInfoData={stepInfoData}
          caseId={caseId}
          currentStepId={currentStepId}
          selectedDrivers={primaryDriver ? [primaryDriver] : []}
          setSelectedDrivers={(drivers) => setPrimaryDriver(drivers[0] || null)}
          leaseType={stepInfoData?.lease_case_details?.lease_type}
          hasAccess={hasAccess}
          selectionMode="single" // Single selection for primary driver
        />
      </div>

      {/* Co-Lease Section */}
      {/* {(() => {
        if (
          primaryDriver &&
          ADDCOLEASEFOR.includes(stepInfoData?.lease_case_details?.lease_type)
        ) {
          return !coLease ? (
            <Button
              text
              label="Add Co-Lease"
              className="text-blue d-flex gap-2 mx-auto"
              type="button"
              icon={() => <Img name="add" className="icon-blue" />}
              onClick={() => setCoLease(true)}
            />
          ) : (
            <div className="mt-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h6 className="mb-0">Co-Lease Driver Selection</h6>
                <Button
                  text
                  label="Remove Co-Lease"
                  className="text-red regular-text"
                  type="button"
                  onClick={() => {
                    setCoLease(false);
                    setCoLeaseDrivers([]); // Clear co-lease selections
                  }}
                />
              </div>
              <ChooseDriverTable
                stepInfoData={stepInfoData}
                caseId={caseId}
                currentStepId={currentStepId}
                selectedDrivers={coLeaseDrivers}
                setSelectedDrivers={setCoLeaseDrivers}
                previousSelectedDriver={primaryDriver}
                leaseType={stepInfoData?.lease_case_details?.lease_type}
                hasAccess={hasAccess}
                selectionMode="multiple" // Multiple selection for co-lease
              />
            </div>
          );
        }
      })()} */}

      <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        <Button
          label="Select Driver"
          disabled={
            !hasAccess ||
            !hasSelectedDrivers ||
            caseData?.case_info?.case_status === "Closed"
          }
          type="submit"
          onClick={chooseDriver}
          severity="warning"
          className="border-radius-0 primary-btn "
        />
      </div>
    </div>
  );
};

export default ChooseDriverLease;
