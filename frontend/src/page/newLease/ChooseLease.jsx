import { useFormik } from "formik";
import { Button } from "primereact/button";
import { useEffect, useState } from "react";
import BInputText from "../../components/BInputText";
import DataTableComponent from "../../components/DataTableComponent";
import Img from "../../components/Img";
import { useLazyLeaseDataListQuery } from "../../redux/api/leaseApi";
import {
  useLazyGetCaseDetailQuery,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../redux/api/medallionApi";
import { getCurrentStep } from "../../utils/caseUtils";
import { chooseLease as variable } from "../../utils/variables";
import BSelect from "../../components/BSelect";

const ChooseLease = ({ caseId, currentStepId, hasAccess, caseData }) => {
  const [processFlow, { isSuccess: isProccessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [moveCase] = useMoveCaseDetailMutation();
  const [selectedDrivers, setSelectedDrivers] = useState([]);
  const [leaseDataList, setLeaseDataList] = useState([]);
  const [triggerGetLeaseData, { data: leaseListData }] =
    useLazyLeaseDataListQuery();
  const [rows, setRows] = useState(5);
  const [page, setPage] = useState(1);

  useEffect(() => {
    triggerSearchLeaseData({ page: 1, limit: 5 });
  }, []);

  useEffect(() => {
    if (leaseListData) {
      console.log("Lease List", leaseListData);
      setLeaseDataList(leaseListData?.items);
    }
  }, [leaseListData]);
  useEffect(() => {
    if (isProccessDataSuccess) {
      moveCase({ params: caseId });
    }
  }, [isProccessDataSuccess]);

  useEffect(() => {
    if (selectedDrivers) {
      console.log("selectedDrivers", selectedDrivers);
      console.log("selectedDrivers", !hasAccess);
    }
  }, [selectedDrivers]);

  const [triggerSearchQuery, { data }] = useLazyGetCaseDetailQuery({
    skip: true,
  });

  const formik = useFormik({
    initialValues: {
      [variable.field_01.id]: "",
      [variable.field_02.id]: "",
      [variable.field_03.id]: "",
      [variable.field_04.id]: "",
    },
    onSubmit: () => {
      triggerSearch();
    },
  });

  // const triggerSearch = () => {
  //   const queryParams = new URLSearchParams({
  //     medallion_number: formik.values[variable.field_01.id],
  //     vin: formik.values[variable.field_02.id],
  //     plate_number: formik.values[variable.field_03.id],
  //   });
  //   triggerGetLeaseData(`?${queryParams.toString()}`);
  //   //triggerSearchQuery(`${caseId}?${queryParams.toString()}`);
  // };
  // const triggerSearchLeaseData = ({ page, limit }) => {
  //   const queryParams = new URLSearchParams({
  //     page,
  //     per_page: limit,
  //   });
  //   queryParams.append("sort_order", "desc");
  //   console.log("Filter apply list", queryParams.toString());
  //   triggerGetLeaseData(`?${queryParams.toString()}`);
  // };
  // const onPageChange = (data) => {
  //   setRows(data.rows);
  //   triggerSearchLeaseData({ page: Number(data.page) + 1, limit: data.rows });
  // };
  const triggerSearchLeaseData = ({
    page = 1,
    limit = 5,
    searchParams = {},
  }) => {
    const queryParams = new URLSearchParams({
      page,
      per_page: limit,
      ...searchParams,
    });
    queryParams.append("sort_order", "desc");
    triggerGetLeaseData(`?${queryParams.toString()}`);
  };

  const triggerSearch = () => {
    const searchParams = {
      medallion_number: formik.values[variable.field_01.id],
      vin: formik.values[variable.field_02.id],
      plate_number: formik.values[variable.field_03.id],
      shift_availability: formik.values[variable.field_04.id]?.code,
    };
    triggerSearchLeaseData({
      page: 1, // Reset to first page on search
      limit: rows,
      searchParams,
    });
  };

  const onPageChange = (data) => {
    setRows(data.rows);
    const searchParams = {
      medallion_number: formik.values[variable.field_01.id],
      vin: formik.values[variable.field_02.id],
      plate_number: formik.values[variable.field_03.id],
      shift_availability: formik.values[variable.field_04.id]?.code,
    };
    triggerSearchLeaseData({
      page: Number(data.page) + 1,
      limit: data.rows,
      searchParams,
    });
  };

  const formReset = () => {
    formik.resetForm();
    //setSelectedDrivers(null);
    //const queryParams = new URLSearchParams({});
    triggerSearchLeaseData({ page: 1, limit: 5 });
    //triggerSearchQuery(`${caseId}?${queryParams.toString()}`);
  };

  const columns = [
    {
      field: "medallion_number",
      header: "Medallion",
      sortable: false,
      headerAlign: "left",
      bodyAlign: "left",
    },
    { field: "vin", header: "VIN", headerAlign: "left" },
    { field: "availability", header: "Availability" },
    { field: "plate_number", header: "Plate No", sortable: false },
    { field: "vehicle_type", header: "Vehicle Type" },
    // { field: "is_hacked_up", header: "Status" },
    { field: "make", header: "Make" },
    { field: "model", header: "Model" },
    { field: "year", header: "Year" },
  ];

  const customRender = (column, rowData) => {
    if (column.field === "medallion_number") {
      return <p>{rowData?.medallion_number}</p>;
    }
    if (column.field === "vin") {
      return <p>{rowData?.vin}</p>;
    }
    if (column.field === "vehicle_type") {
      return <p>{rowData?.vehicle_type.replace("Wav", "WAV")}</p>;
    }

    if (column.field === "availability") {
      const dayShift = rowData?.available_day_shift;
      const nightShift = rowData?.available_night_shift;

      if (dayShift && nightShift) {
        return "Full";
      } else if (dayShift) {
        return "Day Shift";
      } else if (nightShift) {
        return "Night Shift";
      } else {
        return "-";
      }
    }
    if (column.field === "is_hacked_up") {
      return (
        <>
          {rowData?.is_hacked_up ? "Hacked Up" : "Available"}
          {/* <Button icon={() => (<Img name="hack_up_car"></Img>)} className="p-0"></Button> :
                            <Button icon={() => (<Img name="add_hack_up_car"></Img>)}
                                className="p-0 hack_up_car_red"></Button> */}
        </>
      );
    } else if (column.field === "ein") {
      return <p>{rowData?.ein}</p>;
    } else if (column.field === "contact") {
      return (
        <div className="d-flex align-items-center flex-column">
          <p>{rowData.contact_number}</p>
          <p>{rowData.contact_email}</p>
        </div>
      );
    } else if (column.field === "m_status") {
      return (
        <div className="d-flex align-items-center gap-2">
          <p className="regular-semibold-text">{rowData?.vehicles?.length}</p>
          {rowData?.is_hacked_up ? (
            <Button
              icon={() => <Img name="car_success"></Img>}
              className="p-0"
            ></Button>
          ) : (
            <Button
              icon={() => <Img name="ic_car_add"></Img>}
              // onClick={() => newRegister(rowData)}
              className="p-0"
            ></Button>
          )}
        </div>
      );
    }

    return rowData[column.field];
  };

  const medData = getCurrentStep(data?.steps)?.step_data;

  return (
    <div className="w-100 h-100 position-relative">
      <div className="topic-txt d-flex align-items-center gap-2 pb-3">
        <Img name="car" className="icon-black"></Img>Choose Vehicle
      </div>
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
              <Img name="search"></Img> Search
            </div>
          </div>
          <div className="form-body d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center flex-wrap form-grid-1 w-75">
              <div className="w-100-3 ">
                <BInputText
                  variable={variable.field_01}
                  formik={formik}
                ></BInputText>
              </div>
              <div className="w-100-3">
                <BInputText
                  variable={variable.field_02}
                  formik={formik}
                ></BInputText>
              </div>
              <div className="w-100-3">
                <BInputText
                  variable={variable.field_03}
                  formik={formik}
                ></BInputText>
              </div>
              <div className="w-100-3">
                <BSelect variable={variable.field_04} formik={formik}></BSelect>
              </div>
            </div>
            <Button
              disabled={!hasAccess}
              label="Search"
              data-testid="search-btn"
              type="submit"
              severity="warning"
              className="border-radius-0 primary-btn"
            />
            <Button
              text
              type="button"
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
              onClick={() => {
                formik.resetForm();
                formReset();
              }}
            />
          </div>
        </div>
      </form>
      <DataTableComponent
        columns={columns}
        data={
          leaseDataList
          // medData?.medallion_number
          //   ? [
          //       {
          //         medallion_number: medData?.medallion_number,
          //         vin: medData?.vin,
          //         plate_number: medData?.plate_number,
          //         vehicle_type: medData?.vehicle_type,
          //         is_hacked_up: medData?.is_hacked_up,
          //       },
          //     ]
          //   : []
        }
        selectionMode="radiobutton"
        selectedData={selectedDrivers}
        onSelectionChange={(e) => setSelectedDrivers(e.value)}
        renderColumn={customRender}
        dataKey="id"
        // paginator={false}
        totalRecords={leaseListData?.total_count}
        onPageChange={onPageChange}
        emptyMessage={() => (
          <div
            className="d-flex justify-content-center flex-column mx-auto"
            style={{ width: "max-content" }}
          >
            <p className=" d-flex align-items-center justify-content-center p-4 mb-4 gap-2">
              <Img name="no-result"></Img>No Results Found
            </p>
          </div>
        )}
      />
      <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        <Button
          label="Submit Vehicle Selection"
          data-testid="submit-vehicle-selection"
          disabled={
            !hasAccess ||
            !selectedDrivers ||
            // selectedDrivers.length !== 1 ||
            !selectedDrivers?.id ||
            caseData?.case_info?.case_status === "Closed"
            // ||
            // !caseData?.case_info.case_status === "Closed"
          }
          onClick={() => {
            processFlow({
              params: caseId,
              data: {
                step_id: currentStepId,
                data: { vehicle_vin: selectedDrivers?.vin?.toString() },
              },
            });
          }}
          type="submit"
          severity="warning"
          className="border-radius-0 primary-btn w-max-content"
        />
      </div>
    </div>
  );
};

export default ChooseLease;
