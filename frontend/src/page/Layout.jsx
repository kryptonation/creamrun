import { Outlet, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { Suspense, useEffect, useRef, useState } from "react";
import Loader from "../components/Loader";
import ErrorBoundary from "../components/ErrorBoundary";
import "../styles/_layout.scss";
import Img from "../components/Img";
import { Divider } from "primereact/divider";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import CustomCalendar from "../components/CustomCalendar";
import { useLazyGetWorkBasketQuery } from "../redux/api/workbasketApi";
import {
  DMV_LICENSE_TYPE,
  DRIVER_PAYEE_TYPE,
  DRIVER_TLC_LICENSE_TYPE,
  DRIVER_UPDATE_ADDRESS,
  NEW_DRIVER,
  NEW_LEASE_TYPE,
  NEW_VEHICLE_TYPE,
  SENDHACKUP,
} from "../utils/constants";
import { yearMonthDate } from "../utils/dateConverter";
import { Paginator } from "primereact/paginator";
import { Ripple } from "primereact/ripple";

const Layout = () => {
  const [dateRange, setDateRange] = useState([new Date(), null]);
  const [isTodoVisible, setIsTodoVisible] = useState(false);
  const overlayRef = useRef(null);
  const [firstPagination, setFirstPagination] = useState(0);
  const [rowsPagination, setRowsPagination] = useState(5);

  const typeIcon = (data) => {
    if (["New Medallion"].includes(data)) {
      return "medallion";
    }
    if (["Driver Lease"].includes(data)) {
      return "driver";
    }
    if (["New Vehicle Registration"].includes(data)) {
      return "car";
    }
    return "medallion";
  };
  const navigate = useNavigate();
  const caseType = (data) => {
    console.log("🚀 ~ caseType ~ data:", data);
    const caseNo = data?.case_no?.match(/^[A-Za-z]+/)[0];
    console.log(caseNo, caseNo === "NEWMED");

    // if (caseNo === "NEWMED") {
    //   return `/new-medallion/${data?.case_no}`
    // }
    // if ([NEW_DRIVER].includes(caseNo)) {
    //   return `/new-driver/${data?.case_no}`;
    // }
    if ([NEW_VEHICLE_TYPE].includes(caseNo)) {
      return `/manage-vehicle-owner/case/${caseNo}/${data?.case_no}`;
    }
    if ([SENDHACKUP].includes(caseNo)) {
      return `/manage-vehicle/case/${caseNo}/${data?.case_no}`;
    }
    if (
      [
        DRIVER_UPDATE_ADDRESS,
        DRIVER_PAYEE_TYPE,
        DMV_LICENSE_TYPE,
        DRIVER_TLC_LICENSE_TYPE,
      ].includes(caseNo)
    ) {
      return `/manage-driver/case/${caseNo}/${data?.case_no}`;
    }

    if ([NEW_LEASE_TYPE].includes(caseNo)) {
      return `/new-lease/${data?.case_no}`;
    }
    // manage-medallion=RETMED_CASE_TYPE,STOMED_CASE_TYPE,RENMED_CASE_TYPE,PAYEE_CASE_TYPE,UPDADRMED_CASE_TYPE,ALLOCATE_MEDALLION
    return `case/${caseNo}/${data?.case_no}`;
  };
  const caseIdTemplate = (data) => {
    return (
      <button
        type="button"
        onClick={() => {
          console.log("data");
          setIsTodoVisible(false);
          navigate(caseType(data));
        }}
        className="btn  p-0 d-flex align-items-center case-id-con gap-2 regular-text"
      >
        <Img name={typeIcon(data.case_type)}></Img>
        {data.case_no}
      </button>
    );
  };
  const [triggerSearchQuery, { data }] = useLazyGetWorkBasketQuery();

  const dateTemplate = (rowData, field) => {
    if (rowData[field] === "-") {
      return rowData[field];
    }
    if (!rowData[field] || rowData[field] !== "-") {
      return <p>{yearMonthDate(rowData[field])}</p>;
    }
  };
  const template1 = {
    layout:
      "FirstPageLink  PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport",
    PageLinks: (options) => {
      if (
        (options.view.startPage === options.page &&
          options.view.startPage !== 0) ||
        (options.view.endPage === options.page &&
          options.page + 1 !== options.totalPages)
      ) {
        return (
          <span
            className={"border-0 text-black px-2"}
            style={{ userSelect: "none" }}
          >
            ...
          </span>
        );
      }

      return (
        <button
          type="button"
          className={options.className}
          onClick={options.onClick}
        >
          {options.page + 1}
          <Ripple />
        </button>
      );
    },
  };

  const onPageChangePagination = (data) => {
    setFirstPagination(Number(data.first) + 1);
    setRowsPagination(data.rows);
    onPageChange(data);
  };
  // const [rows, setRows] = useState(5);
  // const [page, setPage] = useState(1);

  const triggerSearch = ({ page, limit, from_date, to_date }) => {
    const queryParams = new URLSearchParams({
      page,
      from_date: yearMonthDate(from_date),
      to_date: to_date ? yearMonthDate(to_date) : yearMonthDate(from_date),
      per_page: limit,
    });

    triggerSearchQuery(`?${queryParams.toString()}`);
  };
  const onPageChange = (data) => {
    // setPage(Number(data.page) + 1)
    // setRows(data.rows);
    triggerSearch({
      from_date: dateRange?.[0],
      to_date: dateRange?.[1],
      page: Number(data.page) + 1,
      limit: data.rows,
    });
  };

  useEffect(() => {
    // setPage(1)
    // setRows(5);
    setFirstPagination(1);
    setRowsPagination(5);
    triggerSearch({
      from_date: dateRange?.[0],
      to_date: dateRange?.[1],
      page: 1,
      limit: 5,
    });
  }, []);
  useEffect(() => {
    triggerSearch({
      from_date: dateRange?.[0],
      to_date: dateRange?.[1],
      page: 1,
      limit: 5,
    });
  }, [dateRange]);
  return (
    <main className="d-flex flex-column vh-100">
      <Loader />
      <Header />
      <section className="d-flex align-items-center flex-grow-1 overflow-auto">
        <Sidebar></Sidebar>
        <div
          className="flex-grow-1 overflow-auto h-100 d-flex align-items-center justify-content-center"
          style={{ width: "calc(100% - 200px)" }}
        >
          <Suspense
            fallback={
              <div className="w-100 min-vh-100 d-flex align-items-center justify-content-center">
                Loading...
              </div>
            }
          >
            <ErrorBoundary>
              <Outlet />
              <div className="todo-sec h-100">
                <div className="todo-con ">
                  <button
                    type="button"
                    data-testid="todo-btn"
                    onClick={() => setIsTodoVisible(!isTodoVisible)}
                    className="todo-toggle-btn btn rounded-0 w-100 h-100 d-flex align-items-center justify-content-between  flex-column"
                  >
                    <p className="pb-3 m-0 topic-txt text-yellow">
                      {data?.total_cases}
                    </p>
                    <div className="d-flex align-items-center flex-column ">
                      <p className="pb-3 m-0 todo-text text-uppercase">
                        todo---------------------
                      </p>
                      <Divider></Divider>
                      <Img name="ic_down_arrow" />
                    </div>
                  </button>
                  <div
                    ref={overlayRef}
                    data-testid="todo-con"
                    className={`todo-backet d-flex shadow align-items-start flex-column ${
                      isTodoVisible ? "active" : ""
                    }`}
                  >
                    <div className=" todo-backet-header  d-flex align-items-center justify-content-between">
                      <div>
                        <p className="sec-topic">Good Day</p>
                        <div
                          data-testid="custom-calendar"
                          className="regular-text"
                        >
                          Find your tasks list for
                          <CustomCalendar
                            dateRange={dateRange}
                            setDateRange={setDateRange}
                          />
                        </div>
                      </div>
                      {data?.total_pages > 0 && (
                        <Paginator
                          data-testid="todo-paginator"
                          root={{ pageButton: "bg-transparent" }}
                          className="bg-transparent"
                          template={template1}
                          first={firstPagination}
                          rows={rowsPagination}
                          totalRecords={data?.total_cases}
                          onPageChange={onPageChangePagination}
                          rowsPerPageOptions={[5, 10, 20]}
                        />
                      )}
                    </div>
                    <DataTable
                      value={data?.cases}
                      data-testid="todo-datatable-con"
                      pt={{
                        root: "bg-transparent overflow-visible h-50 scroll-bar regular-text",
                        header: "fixed-top sticky-top top-0 bg-secondary",
                        wrapper: "position-relative scroll-bar h-100",
                      }}
                    >
                      <Column
                        field="case_id"
                        pt={{
                          bodyCell: () => ({
                            "data-testid": `todo-case-id-cell`,
                          }),
                        }}
                        data-testid="todo-case-id"
                        header="Case ID"
                        body={caseIdTemplate}
                      ></Column>
                      <Column
                        field="case_type"
                        pt={{
                          bodyCell: () => ({
                            "data-testid": `todo-case-type-cell`,
                          }),
                        }}
                        data-testid="todo-case-type"
                        header="Case Type"
                      ></Column>
                      <Column
                        field="case_step"
                        pt={{
                          bodyCell: () => ({
                            "data-testid": `todo-case-step-cell`,
                          }),
                        }}
                        data-testid="todo-case-step"
                        header="Status"
                      ></Column>
                      <Column
                        field="created_by"
                        pt={{
                          bodyCell: () => ({
                            "data-testid": `todo-create-by-cell`,
                          }),
                        }}
                        data-testid="todo-create-by"
                        header="Created By"
                        className="text-nowrap"
                      ></Column>
                      <Column
                        field="last_updated_by"
                        pt={{
                          bodyCell: () => ({
                            "data-testid": `todo-last-update-cell`,
                          }),
                        }}
                        data-testid="todo-last-update"
                        header="Updated By"
                        className="text-nowrap"
                      ></Column>
                      <Column
                        field="created_on"
                        pt={{
                          bodyCell: () => ({
                            "data-testid": `todo-created-on-cell`,
                          }),
                        }}
                        data-testid="todo-created-on"
                        header="Created On"
                        className="text-nowrap"
                        body={(data) => dateTemplate(data, "created_on")}
                      ></Column>
                      <Column
                        field="target_date"
                        pt={{
                          bodyCell: () => ({
                            "data-testid": `todo-target-date-cell`,
                          }),
                        }}
                        data-testid="todo-target-date"
                        header="Target"
                        className="text-nowrap"
                        body={(data) => dateTemplate(data, "target_date")}
                      ></Column>
                      <Column
                        field="updated_date"
                        pt={{
                          bodyCell: () => ({
                            "data-testid": `todo-update-date-cell`,
                          }),
                        }}
                        data-testid="todo-update-date"
                        header="Last Updated On"
                        className="text-nowrap"
                        body={(data) => dateTemplate(data, "updated_date")}
                      ></Column>
                    </DataTable>
                  </div>
                </div>
              </div>
            </ErrorBoundary>
          </Suspense>
        </div>
      </section>
    </main>
  );
};

export default Layout;
