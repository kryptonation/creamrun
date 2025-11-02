import BCaseCard from "../../components/BCaseCard";
import Img from "../../components/Img";
import { Button } from "primereact/button";
import { useEffect, useState } from "react";
import ChooseDriverTable from "../newLease/ChooseDriverTable";
import {
  medallionApi,
  useGetStepDetailWithParamsQuery,
  useGetStepInfoQuery,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../redux/api/medallionApi";
import { getCurrentStep } from "../../utils/caseUtils";
import { useDispatch, useSelector } from "react-redux";
import { ADDCOLEASEFOR } from "../../utils/constants";
import ChooseAdditionalDriverTable from "./ChooseAdditionalDriverTable";

const AdditionalDriver = ({
  caseId,
  caseData,
  currentStepId,
  currentStepData,
  hasAccess,
  reload,
}) => {
  // const { data: stepInfoData } = useGetStepInfoQuery(
  //   { caseNo: caseId, step_no: currentStepId },
  //   { skip: !currentStepId || !caseId }
  // );
  // console.log("AdditionalDriver - currentStepData : ", currentStepData);

  const {
    data: stepInfoData,
    error,
    isLoading,
  } = useGetStepDetailWithParamsQuery(
    {
      caseId: caseId,
      step_no: currentStepId,
      objectName: "lease",
      objectLookup: currentStepData?.lease_case_details?.lease_id,
    },
    { refetchOnMountOrArgChange: true }
    // { skip: !currentStepId || !caseId }
  );

  const user = useSelector((state) => state.user.user);

  const [processFlow, { isSuccess: isProccessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();

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

    // processFlow({
    //   params: caseId,
    //   data: {
    //     step_id: currentStepId,
    //     data: {
    //       authorized_agent: user.first_name,
    //       select_driver: allSelectedDrivers,
    //     },
    //   },
    // });
    processFlow({
      params: caseId,
      data: {
        step_id: currentStepId,
        data: {
          // authorized_agent: user.first_name,
          lease_id: stepInfoData?.lease_case_details?.lease_id,
          selected_driver: {
            driver_id: allSelectedDrivers[0]?.driver_id,
            is_day_night_shift: allSelectedDrivers[0]?.is_day_night_shift,
          },
        },
      },
    });
  };

  useEffect(() => {
    // if (isProccessDataSuccess) {
    //   dispatch(medallionApi.util.invalidateTags(["caseStep"]));
    // }
    if (
      isProccessDataSuccess &&
      caseData &&
      caseData.case_info.case_status !== "Closed" &&
      getCurrentStep(caseData.steps).step_id === currentStepId
    ) {
      moveCase({ params: caseId });
    }
  }, [isProccessDataSuccess]);
  useEffect(() => {
    if (isMoveDataSuccess) {
      reload();
    }
  }, [isMoveDataSuccess]);

  // Effect to reset co-lease state when primary driver is unselected
  useEffect(() => {
    if (!primaryDriver) {
      setCoLeaseDrivers([]);
      setCoLease(false);
    }
  }, [primaryDriver]);

  // useEffect(() => {
  //   if (stepInfoData?.selected_driver_info) {
  //     const seq0List = stepInfoData?.selected_driver_info.filter(
  //       (d) => d.co_lease_seq === "0"
  //     );
  //     const seq1List = stepInfoData?.selected_driver_info.filter(
  //       (d) => d.co_lease_seq === "1"
  //     );
  //     if (seq0List.length > 0) {
  //       console.log("seq0List : ", seq0List);
  //       console.log("seq1List : ", seq1List);
  //       setPrimaryDriver(seq0List[0]);
  //       if (seq1List.length > 0) {
  //         setCoLeaseDrivers(seq1List);
  //         setCoLease(true);
  //       }
  //     }
  //   }
  // }, [stepInfoData]);

  useEffect(() => {
    // Get the ID of the selected driver
    const selectedId = stepInfoData?.selected_driver;

    // Get the list of all drivers
    const driverList = stepInfoData?.lease_case_details?.driver;

    console.log("selectedId : ", stepInfoData, selectedId, driverList);

    // Check if a driver is selected (selectedId is not empty)
    // and if the driverList exists
    if (selectedId && driverList && Array.isArray(driverList)) {
      // Find the full driver object from the list
      const foundDriver = driverList.find(
        (driver) => driver.driver_id === selectedId
      );

      // If we found the matching driver, update the state
      if (foundDriver) {
        // Add driver_lookup_id to the driver object
        const driverWithLookupId = {
          ...foundDriver,
          driver_lookup_id: selectedId,
        };
        setPrimaryDriver(driverWithLookupId);
        console.log("Driver found and selected:", driverWithLookupId);
      } else {
        // Handle case where ID exists but no match is found
        console.warn("Driver ID exists but no matching driver found");
        setPrimaryDriver(null);
      }
    } else {
      // If no driver is selected (selectedId is ""), reset the state
      setPrimaryDriver(null);
    }
  }, [stepInfoData]); // This hook runs every time stepInfoData changes

  // Check if we have any drivers selected
  const hasSelectedDrivers = primaryDriver || coLeaseDrivers.length > 0;

  return (
    <div className="w-100 h-100">
      <div className="d-flex align-items-center justify-content-between"></div>
      {/* Primary Driver Selection Table */}
      <div className="mb-4">
        {/* <h6 className="mb-3">Primary Driver Selection</h6> */}
        <ChooseAdditionalDriverTable
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

      <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        <Button
          label="Select Driver"
          disabled={
            !hasAccess ||
            !hasSelectedDrivers ||
            caseData.case_info.case_status === "Closed"
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

export default AdditionalDriver;

//old code with multiple driver selection
// import { Button } from "primereact/button";
// import { useEffect, useState } from "react";
// import {
//   medallionApi,
//   useGetStepInfoQuery,
//   useMoveCaseDetailMutation,
//   useProcessCaseDeatilMutation,
// } from "../../redux/api/medallionApi";
// import { getCurrentStep } from "../../utils/caseUtils";
// import { useDispatch } from "react-redux";
// import BSuccessMessage from "../../components/BSuccessMessage";
// import { useNavigate } from "react-router-dom";
// import ChooseDriverTable from "../newLease/ChooseDriverTable";

// const AdditionalDriver = ({ caseId, currentStepId, hasAccess, caseData }) => {
//   const [isOpen, setOpen] = useState(false);
//   const navigate = useNavigate();
//   const { data: stepInfoData } = useGetStepInfoQuery(
//     { caseNo: caseId, step_no: currentStepId },
//     { skip: !currentStepId || !caseId }
//   );
//   const [processFlow, { isSuccess: isProccessDataSuccess }] =
//     useProcessCaseDeatilMutation();
//   const [moveCase, { isSuccess: isMoveDataSuccess }] =
//     useMoveCaseDetailMutation();
//   const [selectedDrivers, setSelectedDrivers] = useState([]);
//   // const [selectedCODrivers, setSelectedCODrivers] = useState();
//   const dispatch = useDispatch();
//   // const leaseType = {
//   //     ["dov"]: 'DOV - Driver Owned Vehicle',
//   //     ["long-term"]: 'Long Term',
//   //     ["short-term"]: 'True weekly / Short Term',
//   //     ["medallion-only"]: 'Medallion-Only',
//   // };

//   const chooseDriver = () => {
//     const data = selectedDrivers?.reduce((acc, driver) => {
//       acc = [
//         ...acc,
//         {
//           driver_id: driver.driver_lookup_id,
//           is_day_night_shift: driver.is_day_night_shift ? true : false,
//           // "co_lease_seq": idx.toString()
//         },
//       ];
//       return acc;
//     }, []);
//     console.log(data);

//     processFlow({
//       params: caseId,
//       data: {
//         step_id: currentStepId,
//         data: {
//           selected_driver: data[0],
//         },
//       },
//     });
//   };

//   useEffect(() => {
//     if (isProccessDataSuccess) {
//       // refetch();
//       dispatch(medallionApi.util.invalidateTags(["caseStep"]));
//     }
//     if (
//       isProccessDataSuccess &&
//       caseData &&
//       caseData.case_info.case_status !== "Closed" &&
//       getCurrentStep(caseData.steps).step_id === currentStepId
//     ) {
//       moveCase({ params: caseId });
//     }
//   }, [isProccessDataSuccess]);

//   useEffect(() => {
//     if (isMoveDataSuccess) {
//       setOpen(true);
//     }
//   }, [isMoveDataSuccess]);

//   return (
//     <div className="w-100 h-100">
//       <ChooseDriverTable
//         {...{
//           caseId,
//           currentStepId,
//           selectedDrivers,
//           setSelectedDrivers,
//           leaseType: stepInfoData?.lease_case_details?.lease_type,
//           hasAccess,
//         }}
//       />
//       <div className="w-100 position-sticky bottom-0 py-3 bg-white">
//         <Button
//           label="Select Driver"
//           disabled={!hasAccess || !selectedDrivers?.length}
//           type="submit"
//           onClick={chooseDriver}
//           severity="warning"
//           className="border-radius-0 primary-btn "
//         />
//       </div>
//       <BSuccessMessage
//         isHtml={true}
//         isOpen={isOpen}
//         message={`Additional driver is added successful for lease ID: ${stepInfoData?.lease_case_details?.lease_id} .`}
//         title="Additional Driver Added Successful"
//         onCancel={() => {
//           setOpen(false);
//           navigate("/manage-lease", { replace: true });
//         }}
//         onConfirm={() => {
//           setOpen(false);
//           navigate("/manage-lease", { replace: true });
//         }}
//       ></BSuccessMessage>
//     </div>
//   );
// };

// export default AdditionalDriver;
