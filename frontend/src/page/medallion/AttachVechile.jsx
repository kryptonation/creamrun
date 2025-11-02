import { Button } from "primereact/button";
import Img from "../../components/Img";
import { useFormik } from "formik";
import { vehicleSearch as variable } from "../../utils/variables";
import BInputFields from "../../components/BInputFileds";
import { useEffect, useState } from "react";
import BConfirmModal from "../../components/BConfirmModal";
import BExpandableTable from "../../components/BExpandableTable";
import { useLazyGetVehiclesQuery } from "../../redux/api/vehicleApi";
import {
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../redux/api/medallionApi";
import BCard from "../../components/BCard";
import BSuccessMessage from "../../components/BSuccessMessage";
import { useNavigate } from "react-router-dom";

const AttachVechile = ({
  caseId,
  currentStepId,
  reload,
  currentStep,
  hasAccess,
}) => {
  const navigate = useNavigate();
  const [selectedDrivers, setSelectedDrivers] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [isOpen, setOpen] = useState(false);
  const [isSuccessOpen, setSuccessOpen] = useState(false);

  const [triggerGetVehicles, { data: vehicleData }] = useLazyGetVehiclesQuery();
  const [processFlow, { isSuccess: isProcessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [moveCase, { isSuccess: isMoveDataSuccess }] =
    useMoveCaseDetailMutation();
  const [rows, setRows] = useState(5);
  console.log("currentstep", currentStep);
  const [vehicleTypeOptions, setVehicleTypeOptions] = useState([]);
  const getDynamicVariable = () => {
    return variable.map((item) => {
      if (item.id === "vehicleType") {
        return {
          ...item,
          options: vehicleTypeOptions,
        };
      }
      return item;
    });
  };
  useEffect(() => {
    if (currentStep) {
      if (currentStep?.medallion_info?.medallion_type === "Wav") {
        setVehicleTypeOptions([
          { name: "WAV Gas", code: "Wav Gas" },
          { name: "WAV  Hybrid", code: "Wav Hybrid" },
        ]);
      } else if (currentStep?.medallion_info?.medallion_type === "Regular") {
        setVehicleTypeOptions([
          { name: "Non - WAV Hybrid", code: "Non-WAV Hybrid" },
          { name: "Non - WAV Gas", code: "Non-WAV Gas" },
        ]);
      }
    }
  }, [currentStep]);
  const triggerSearch = async ({ page = 1, limit = 5 }) => {
    const queryParams = new URLSearchParams({ page, per_page: limit });
    queryParams.append("has_medallion", "false");
    queryParams.append("vehicle_status", "Delivered");
    if (currentStep?.medallion_info?.medallion_type) {
      let medallionType = currentStep.medallion_info.medallion_type;

      if (medallionType === "Wav") {
        queryParams.set("vehicle_type", "Wav Gas,Wav Hybrid");
      } else if (medallionType === "Regular") {
        // queryParams.set("vehicle_type", "Regular,Regular-Hybrid");
        queryParams.set("vehicle_type", "Non-WAV Hybrid,Non-WAV Gas");
      }
    }

    if (
      formik?.values?.vimNumber ||
      formik?.values?.vehicleType ||
      formik?.values?.brand
    ) {
      if (formik?.values?.vimNumber) {
        queryParams.append("vin", formik.values.vimNumber);
      }

      if (formik?.values?.vehicleType) {
        queryParams.delete("vehicle_type");
        queryParams.append("vehicle_type", formik.values.vehicleType?.code);
      }

      if (formik?.values?.brand) {
        queryParams.append("make", formik.values.brand);
      }

      await triggerGetVehicles(`?${queryParams?.toString()}`)
        .unwrap()
        .then((vehicleData) => {
          // if (
          //   vehicleData &&
          //   vehicleData.items &&
          //   vehicleData.items.length > 0
          // ) {
          //   const filtered = vehicleData.items.filter(
          //     (v) =>
          //       !v.has_medallion &&
          //       v.vehicle_type?.toLowerCase() ===
          //         currentStep?.medallion_info?.medallion_type?.toLowerCase()
          //   );
          //   setDrivers(filtered);
          // } else {
          //   setDrivers([]);
          // }
          if (
            vehicleData &&
            vehicleData?.items &&
            vehicleData?.items.length > 0
          ) {
            setDrivers(vehicleData?.items);
          } else {
            setDrivers([]);
            setSelectedDrivers(null);
          }
        });
    } else {
      await triggerGetVehicles(`?${queryParams?.toString()}`)
        .unwrap()
        .then((vehicleData) => {
          // if (
          //   vehicleData &&
          //   vehicleData.items &&
          //   vehicleData.items.length > 0
          // ) {
          //   const filtered = vehicleData.items.filter(
          //     (v) =>
          //       !v.has_medallion &&
          //       v.vehicle_type?.toLowerCase() ===
          //         currentStep?.medallion_info?.medallion_type?.toLowerCase()
          //   );
          //   setDrivers(filtered);
          // }
          if (
            vehicleData &&
            vehicleData?.items &&
            vehicleData?.items.length > 0
          ) {
            setDrivers(vehicleData?.items);
          } else {
            setDrivers([]);
            setSelectedDrivers(null);
          }
        });
    }
  };
  const onPageChange = (data) => {
    setRows(data.rows);

    triggerSearch({
      page: Number(data.page) + 1,
      limit: data.rows,
    });
  };
  const formik = useFormik({
    initialValues: {
      [variable[0].id]: "",
      [variable[1].id]: "",
      [variable[2].id]: "",
    },
    onSubmit: () => {
      //TODO Serach API
    },
  });

  const formReset = () => {
    formik.resetForm();
    // triggerSearch({ page: 1, limit: 5 });
    const queryParams = new URLSearchParams({
      page: 1,
      per_page: 5,
      has_medallion: "false",
      vehicle_status: "Delivered",
    });
    if (currentStep?.medallion_info?.medallion_type) {
      let medallionType = currentStep.medallion_info.medallion_type;
      if (medallionType === "Wav") {
        queryParams.set("vehicle_type", "Wav Gas,Wav Hybrid");
      } else if (medallionType === "Regular") {
        // queryParams.set("vehicle_type", "Regular,Regular-Hybrid");
        queryParams.set("vehicle_type", "Non-WAV Hybrid,Non-WAV Gas");
      }
    }

    triggerGetVehicles(`?${queryParams.toString()}`)
      .unwrap()
      .then((vehicleData) => {
        if (vehicleData?.items?.length > 0) {
          setDrivers(vehicleData.items);
        } else {
          setDrivers([]);
          setSelectedDrivers(null);
        }
      });
  };

  const columns = [
    {
      field: "vin",
      header: "VIN No",
      sortable: false,
      headerAlign: "left",
      bodyAlign: "left",
    },
    {
      field: "license_plate_no",
      header: "License Plate No",
      headerAlign: "left",
    },
    { field: "make", header: "Brand", sortable: false },
    { field: "vehicle_type", header: "Vehicle Type" },
    { field: "model", header: "Engine Type" },
    { field: "registration_state", header: "Registration State" },
  ];

  const rowExpansionTemplate = (data) => {
    const licenseDetails = {
      "License Plate Number": data.license_plate_no,
      "Vehicle Registration Date": data.registration_date,
      Model: data.model,
    };

    const licenseDetails1 = {
      Year: data.year,
      Fuel: data.fuel,
      Cylinders: data.cylinder,
    };

    const licenseDetails2 = {
      Color: data.color,
      "Vehicle Type": data.vehicle_type,
      "Vehicle Management Entity": data.vehicle_management_entity,
    };

    return (
      <div className="p-3 bg-light">
        <div className="d-flex align-items-center pb-4">
          <Img name="vehicle" />
          <div className="ms-3">
            <h1 className="fw-semibold fs-4 text-dark mb-0">{data.make}</h1>
            <p className="fw-normal fs-6 text-muted">VIN: {data.vin}</p>
          </div>
        </div>

        <div className="d-flex justify-content-between">
          <div className="flex-fill me-3">
            <table className="table table-borderless">
              <tbody>
                {Object.entries(licenseDetails).map(([key, value]) => (
                  <tr key={key}>
                    <td className="text-secondary small pe-3 bg-light">
                      {key}
                    </td>
                    <td className="fw-semibold text-dark small bg-light">
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="vr mx-3"></div>

          <div className="flex-fill mx-3">
            <table className="table table-borderless">
              <tbody>
                {Object.entries(licenseDetails1).map(([key, value]) => (
                  <tr key={key}>
                    <td className="text-secondary small pe-3 bg-light">
                      {key}
                    </td>
                    <td className="fw-semibold text-dark small bg-light">
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="vr mx-3"></div>

          <div className="flex-fill ms-3">
            <table className="table table-borderless">
              <tbody>
                {Object.entries(licenseDetails2).map(([key, value]) => (
                  <tr key={key}>
                    <td className="text-secondary small pe-3 bg-light">
                      {key}
                    </td>
                    <td className="fw-semibold text-dark small bg-light">
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const emptyView = () => {
    return (
      <div
        className="justify-items-center"
        style={{ justifyItems: "center", padding: "40px" }}
      >
        <div
          className="d-flex justify-content-center flex-column mx-auto"
          style={{ width: "max-content" }}
        >
          <p className=" d-flex align-items-center justify-content-center p-4 mb-4 gap-2">
            <Img name="no-result"></Img>No Results Found
          </p>
        </div>
        <div>
          <Img name="line_long" />
        </div>
        <Button
          label="Register Vehicle"
          severity="warning"
          className="border-radius-0 primary-btn"
          // onClick={() => navigate("/new-vehicle")}
          onClick={() => navigate("/manage-vehicle-owner")}
          icon={() => <Img name="add"></Img>}
          style={{ marginTop: "20px" }}
        />
      </div>
    );
  };
  const customRender = (column, rowData) => {
    // console.log("Row Data", rowData);
    if (column.field === "first_name") {
      return (
        <div>
          <div className="d-flex flex-row align-items-center">
            <Img name="return_driver"></Img>
            <p style={{ marginLeft: 10 }}>{rowData?.first_name}</p>
          </div>
        </div>
      );
    } else if (column.field === "license_plate_no") {
      return (
        <div>
          <div className="d-flex flex-row align-items-center">
            {/* <Img name="return_driver"></Img> */}
            <p style={{ marginLeft: 10 }}>
              {rowData?.registration_details?.plate_number || "-"}
            </p>
          </div>
        </div>
      );
    } else if (column.field === "registration_state") {
      return (
        <div>
          <div className="d-flex flex-row align-items-center">
            {/* <Img name="return_driver"></Img> */}
            <p style={{ marginLeft: 10 }}>
              {rowData?.registration_details?.registration_state || "-"}
            </p>
          </div>
        </div>
      );
    }

    return rowData[column.field];
  };

  const allocateVehicle = () => {
    setOpen(true);
  };

  const proceedAllocateVehicle = () => {
    const data = {
      step_id: currentStepId,
      data: {
        medallion_number: currentStep?.medallion_info?.medallion_number,
        vehicle_vin: selectedDrivers && selectedDrivers.vin,
      },
    };
    console.log("Attach Vehicle payload", data);
    if (hasAccess) processFlow({ params: caseId, data: data });
  };
  // useEffect(() => {
  //     if (vehicleData && vehicleData.items && vehicleData.items.length > 0 && !vehicleData.items[0].has_medallion) {
  //         setDrivers([vehicleData.items[0]])
  //     }
  // }, [vehicleData,isSuccess])

  useEffect(() => {
    if (hasAccess && isProcessDataSuccess) {
      moveCase({ params: caseId });
    }
  }, [isProcessDataSuccess]);

  useEffect(() => {
    if (isMoveDataSuccess) {
      reload();
      setSuccessOpen(true);
    }
  }, [isMoveDataSuccess]);
  useEffect(() => {
    const fetchInitialVehicles = async () => {
      // await triggerGetVehicles("")
      //   .unwrap()
      //   .then((vehicleData) => {
      //     if (
      //       vehicleData &&
      //       vehicleData.items &&
      //       vehicleData.items.length > 0
      //     ) {
      //       const filtered = vehicleData.items.filter(
      //         (v) =>
      //           !v.has_medallion &&
      //           v.vehicle_type?.toLowerCase() ===
      //             currentStep?.medallion_info?.medallion_type?.toLowerCase()
      //       );
      //       console.log("Filtered vehicle", filtered);
      //       setDrivers(filtered);
      //     } else {
      //       setDrivers([]);
      //     }
      //   });
    };
    triggerSearch({ page: 1, limit: 5 });
    // fetchInitialVehicles();
  }, [currentStep, triggerGetVehicles]);

  // const onPageChange = (data) => {
  //   setRows(data.rows);
  //   triggerSearchDriverData({ page: Number(data.page) + 1, limit: data.rows });
  // };

  return (
    <div>
      <form
        className="common-form d-flex flex-column gap-5"
        onSubmit={formik.handleSubmit}
      >
        <div className="form-section">
          <div
            className="d-flex align-items-center
                   justify-content-between form-sec-header"
          >
            <div className="topic">
              <Img name="car"></Img>Vehicle
            </div>
          </div>
          <div className="form-body d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center flex-wrap form-grid-1 w-75">
              {getDynamicVariable().map((item, idx) => (
                <div key={idx}>
                  <BInputFields variable={item} formik={formik} />
                </div>
              ))}
            </div>
            <Button
              disabled={!hasAccess}
              label="Search"
              data-testid="search-btn"
              severity="warning"
              type="button"
              onClick={() => triggerSearch({ page: 1, limit: 5 })}
              className="border-radius-0 primary-btn"
            />
            <Button
              disabled={!hasAccess}
              text
              type="reset"
              data-testid="reset-btn"
              icon={() => {
                return (
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12.0094 0C18.6375 0 24.0188 5.4 24.0094 12.0281C23.9906 18.6375 18.6 24 12 24C5.37189 24 -0.00936277 18.6 1.2231e-05 11.9719C0.00938723 5.37187 5.40001 0 12.0094 0ZM11.9813 22.7812C17.9344 22.7906 22.7813 17.9531 22.7813 12.0094C22.7813 6.075 17.9625 1.2375 12.0469 1.21875C6.08439 1.2 1.22814 6.02812 1.21876 11.9719C1.20939 17.925 6.03751 22.7719 11.9813 22.7812Z"
                      fill="black"
                    />
                    <path
                      d="M12.0001 11.0999C13.1064 9.99365 14.1751 8.91553 15.2439 7.84678C15.347 7.74365 15.4408 7.64053 15.5439 7.55615C15.8158 7.3499 16.1064 7.34053 16.3501 7.58428C16.5939 7.82803 16.5751 8.11865 16.3783 8.39053C16.2845 8.5124 16.1626 8.61553 16.0595 8.72803C15.0001 9.7874 13.9408 10.8468 12.8251 11.953C13.1626 12.2812 13.4908 12.5905 13.8001 12.8999C14.6064 13.6968 15.422 14.503 16.2283 15.3093C16.5564 15.6374 16.6033 16.003 16.3689 16.2562C16.1251 16.5187 15.722 16.4812 15.3845 16.153C14.2689 15.0374 13.1626 13.9218 12.0095 12.7687C11.8689 12.8999 11.7376 13.0124 11.6251 13.1249C10.6408 14.1093 9.65638 15.0937 8.68138 16.0687C8.28763 16.4624 7.89388 16.5374 7.63138 16.2562C7.36888 15.9843 7.44388 15.6093 7.85638 15.2062C7.96888 15.0937 8.08138 14.9905 8.1845 14.878C9.15013 13.8937 10.1064 12.9187 11.147 11.8593C10.8751 11.6062 10.5658 11.3343 10.2658 11.0437C9.44075 10.228 8.62513 9.4124 7.8095 8.59678C7.4345 8.22178 7.36888 7.84678 7.63138 7.5749C7.90325 7.29365 8.2595 7.3499 8.64388 7.73428C9.75013 8.8499 10.8564 9.95615 12.0001 11.0999Z"
                      fill="black"
                    />
                  </svg>
                );
              }}
              // onClick={() => {  }}
              onClick={() => {
                formik.resetForm();
                formReset();
              }}
            />
          </div>
        </div>
      </form>

      {
        <BExpandableTable
          columns={columns}
          data={drivers}
          selectionMode="radiobutton"
          selectedData={selectedDrivers}
          onSelectionChange={(e) => setSelectedDrivers(e.value)}
          renderColumn={customRender}
          dataKey="vehicle_id"
          expandedRows={[]}
          rowExpansionTemplate={rowExpansionTemplate}
          emptyMessage={emptyView()}
          totalRecords={vehicleData?.total_items}
          onPageChange={onPageChange}
        />
      }
      <div className="w-100 position-sticky bottom-0 py-3 bg-white d-flex gap-3">
        {selectedDrivers && drivers && (
          <Button
            label="Allocate Vehicle"
            severity="warning"
            type="button"
            disabled={!hasAccess}
            onClick={() => {
              allocateVehicle();
            }}
            className="border-radius-0 primary-btn m-3"
          />
        )}
      </div>

      <div>
        <BConfirmModal
          isOpen={isOpen}
          title={"Allocating Medallion Confirmation"}
          message={""}
          onCancel={() => {
            setOpen(false);
            // setDrivers([]);
          }}
          onConfirm={() => {
            setOpen(false);
            proceedAllocateVehicle();
          }}
          customContent={
            <div>
              <div className="d-flex">
                <BCard
                  label="Medallion No"
                  value={currentStep?.medallion_info?.medallion_number}
                />
                <BCard
                  label="Owner"
                  value={currentStep?.medallion_info?.medallion_owner_name}
                />
              </div>
              <div>
                <BCard
                  label="Medallion Type"
                  value={currentStep?.medallion_info?.medallion_type}
                />
              </div>
              <Img name="line_long"></Img>
              <div>
                <div className="d-flex">
                  <BCard
                    label="Brand"
                    value={selectedDrivers && selectedDrivers?.make}
                  />
                  <BCard
                    label="VIN"
                    value={selectedDrivers && selectedDrivers?.vin}
                  />
                </div>
                <div className="d-flex">
                  <BCard
                    label="Model"
                    value={selectedDrivers && selectedDrivers?.model}
                  />
                  <BCard
                    label="Vehicle Type"
                    value={selectedDrivers && selectedDrivers?.vehicle_type}
                  />
                </div>
              </div>
            </div>
          }
        />
      </div>
      <BSuccessMessage
        isOpen={isSuccessOpen}
        message={`Medallion ${currentStep?.medallion_info?.medallion_number} is Allocated to Vehicle`}
        title="Medallion Allocation to Vehicle is Successful"
        onCancel={() => {
          console.log("Cancel");
          setOpen(false);
          navigate("/manage-medallion", { replace: true });
        }}
        onConfirm={() => {
          console.log("onConfirm");
          setOpen(false);
          navigate("/manage-medallion", { replace: true });
        }}
      ></BSuccessMessage>
    </div>
  );
};

export default AttachVechile;
