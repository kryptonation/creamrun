import { useLocation } from "react-router-dom";
import BBreadCrumb from "../../components/BBreadCrumb";
import { useGetMedallionDetailsQuery } from "../../redux/api/medallionApi";
import Img from "../../components/Img";
import BCard from "../../components/BCard";
import { Link } from "react-router-dom";
import {
  dateMonthYear,
  monthDateYearHrsMinSepartedByUnderscore,
  timeHourandMinutes,
  yearMonthDate,
} from "../../utils/dateConverter";
import { Divider } from "primereact/divider";
import React, { useEffect, useState } from "react";
import { formatAddress, getFullName, maskSSN } from "../../utils/utils";
import { Button } from "primereact/button";
import BModal from "../../components/BModal";
import PDFViewer from "../../components/PDFViewer";
import BAttachedFile from "../../components/BAttachedFile";
import DataTableComponent from "../../components/DataTableComponent";
import BCaseCard from "../../components/BCaseCard";
import BCalendar from "../../components/BCalendar";
import { useFormik } from "formik";
import {
  useGetDriverDetailsQuery,
  useGetDriverDetailTripsQuery,
  useLazyGetDriverDetailsPaginationQuery,
  useLazyGetDriverDetailTripsQuery,
} from "../../redux/api/driverApi";
import { useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useLazyLedgerEntryListQuery } from "../../redux/api/ledgerApi";
import { useLazyGetCurbQuery } from "../../redux/api/curbApi";
import BUpload from "../../components/BUpload";
import DocumentGrid from "../../components/DocumentGrid";
import DocumentGridViewOnly from "../../components/DocumentGridViewOnly";
const ViewDriverDetails = () => {
  const breadcrumbItems = [
    {
      template: () => (
        <Link to="/" className="font-semibold text-grey">
          Home
        </Link>
      ),
    },
    {
      template: () => (
        <Link to="/manage-driver" className="font-semibold text-grey">
          Manage Driver
        </Link>
      ),
    },
    {
      template: () => (
        <Link to={`/manage-driver`} className="font-semibold text-black">
          {getFullName(
            data?.driver_details?.first_name,
            "",
            data?.driver_details?.last_name
          )}
        </Link>
      ),
    },
  ];
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const medallionId = searchParams.get("medallionId");
  const vehicleId = searchParams.get("vehicleId");
  const driverId = searchParams.get("driverId");
  console.log("useLocation", location.state);
  const { data } = useGetDriverDetailsQuery(location?.state);
  // const [triggerGetLedgerEntry, { data: ledgerEntryListData }] =
  //   useLazyLedgerEntryListQuery();
  const [triggerGetEzpass, { data: ezpassDetail, isSuccess }] =
    useLazyGetCurbQuery();

  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pastHistoryRef = useRef(null);

  const [historyFirst, setHistoryFirst] = useState(0);
  const [historyRows, setHistoryRows] = useState(5);

  // Add these new state variables for mock infinite scroll
  // const [currentPage, setCurrentPage] = useState(0);
  // const [hasMoreData, setHasMoreData] = useState(true);
  // const [isLoadingMore, setIsLoadingMore] = useState(false);
  // const pastHistoryRef = useRef(null);

  // const PER_PAGE = 5; // Items per page from DummyJSON API

  // Add lazy query for pagination
  const [triggerGetDriverDetails, { data: paginatedData }] =
    useLazyGetDriverDetailsPaginationQuery();

  const [triggerGetTripSummary, { data: tripSummaryData }] =
    useLazyGetDriverDetailTripsQuery();

  // const loadMockHistoryData = async (page) => {
  //   if (isLoadingMore && page > 0) return;

  //   setIsLoadingMore(true);

  //   try {
  //     const skip = page * PER_PAGE;
  //     const response = await fetch(
  //       `https://dummyjson.com/products?limit=${PER_PAGE}&skip=${skip}&select=title,price`
  //     );
  //     const json = await response.json();

  //     if (json?.products?.length > 0) {
  //       // Transform API data to match your table structure
  //       const transformedData = json.products.map((product, index) => ({
  //         driver_id: `DRV-${String(product.id).padStart(4, "0")}`,
  //         case_no: `CASE-${String(product.id + 1000).padStart(4, "0")}`,
  //         driver_name: product.title,
  //         active_on: new Date(
  //           Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
  //         )
  //           .toISOString()
  //           .split("T")[0], // Random date within last year
  //         price: product.price || "N/A",
  //       }));

  //       if (page === 0) {
  //         setPastHistoryData(transformedData);
  //       } else {
  //         setPastHistoryData((prev) => [...prev, ...transformedData]);
  //       }

  //       setHasMoreData(skip + PER_PAGE < json.total);
  //       setCurrentPage(page);
  //     } else {
  //       setHasMoreData(false);
  //     }
  //   } catch (error) {
  //     console.error("Error loading mock data:", error);
  //     setHasMoreData(false);
  //   } finally {
  //     setIsLoadingMore(false);
  //   }
  // };
  useEffect(() => {
    // triggerLedgerEntryAPI({ page: 1, limit: 5 });
    triggerTripDataAPI({ page: 1, limit: 5 });
  }, []);
  const [rows, setRows] = useState(5);
  const [page, setPage] = useState(1);
  const [tripRows, setTripRows] = useState(5);
  const [tripPage, setTripPage] = useState(1);
  const onPageChange = (data) => {
    // console.log("OnPageChange", data);
    // setPage(data);
    setRows(data.rows);
    // triggerLedgerEntryAPI({ page: Number(data.page) + 1, limit: data.rows });
  };
  const onTripPageChange = (data) => {
    setTripRows(data.rows);
    triggerTripDataAPI({ page: Number(data.page) + 1, limit: data.rows });
  };
  // const triggerLedgerEntryAPI = ({ page, limit }) => {
  //   const queryParams = new URLSearchParams({
  //     driver_id: location?.state,
  //     page,
  //     per_page: limit,
  //   });
  //   triggerGetLedgerEntry(`?${queryParams.toString()}`);
  // };
  const triggerTripDataAPI = ({ page, limit }) => {
    const queryParams = new URLSearchParams({
      driver_id: location?.state,
      page,
      per_page: limit,
    });
    triggerGetEzpass(`?${queryParams.toString()}`);
  };

  // const exportToPDF = async () => {
  //   try {
  //     // Show loading state (optional)
  //     setIsLoadingMore(true);

  //     // Get the main content element
  //     const element =
  //       document.getElementById("driver-details-content") || document.body;

  //     // Create canvas from HTML
  //     const canvas = await html2canvas(element, {
  //       scale: 2, // Higher quality
  //       useCORS: true,
  //       allowTaint: true,
  //       backgroundColor: "#ffffff",
  //       height: element.scrollHeight,
  //       width: element.scrollWidth,
  //     });

  //     const imgData = canvas.toDataURL("image/png");

  //     // Calculate PDF dimensions
  //     const imgWidth = 210; // A4 width in mm
  //     const pageHeight = 295; // A4 height in mm
  //     const imgHeight = (canvas.height * imgWidth) / canvas.width;
  //     let heightLeft = imgHeight;

  //     // Create PDF
  //     const pdf = new jsPDF("p", "mm", "a4");
  //     let position = 0;

  //     // Add first page
  //     pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  //     heightLeft -= pageHeight;

  //     // Add additional pages if content is longer than one page
  //     while (heightLeft >= 0) {
  //       position = heightLeft - imgHeight;
  //       pdf.addPage();
  //       pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  //       heightLeft -= pageHeight;
  //     }

  //     // Generate filename with driver name and current date
  //     const driverName = getFullName(
  //       data?.driver_details?.first_name,
  //       "",
  //       data?.driver_details?.last_name
  //     ).replace(/\s+/g, "_");

  //     const currentDate = new Date().toISOString().split("T")[0];
  //     const filename = `Driver_Details_${driverName}_${currentDate}.pdf`;

  //     // Save the PDF
  //     pdf.save(filename);
  //   } catch (error) {
  //     console.error("Error generating PDF:", error);
  //     // You can add a toast notification here
  //     alert("Error generating PDF. Please try again.");
  //   } finally {
  //     setIsLoadingMore(false);
  //   }
  // };

  const exportToPDFAdvanced = async () => {
    try {
      setIsLoadingMore(true);

      // Create a temporary container for PDF content
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.width = "210mm"; // A4 width
      tempContainer.style.backgroundColor = "white";
      tempContainer.style.padding = "20px";
      tempContainer.style.fontFamily = "Arial, sans-serif";

      // Clone the content
      const originalContent = document.getElementById("driver-details-content");
      const clonedContent = originalContent.cloneNode(true);

      // Remove unnecessary elements from clone
      const buttonsToRemove =
        clonedContent.querySelectorAll("button, .no-print");
      buttonsToRemove.forEach((btn) => btn.remove());

      tempContainer.appendChild(clonedContent);
      document.body.appendChild(tempContainer);

      // Generate PDF from temporary container
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });

      // Remove temporary container
      document.body.removeChild(tempContainer);

      // Create PDF (same as before)
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const driverName = getFullName(
        data?.driver_details?.first_name,
        "",
        data?.driver_details?.last_name
      ).replace(/\s+/g, "_");

      const currentDate = new Date().toISOString().split("T");
      const filename = `Driver_Details_${driverName}_${currentDate}.pdf`;

      pdf.save(filename);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    } finally {
      setIsLoadingMore(false);
    }
  };
  const handleSimplePrint = () => {
    // Store original styles
    const originalTitle = document.title;
    const originalStyles = document.head.innerHTML;

    // Set document title
    document.title = `Driver Details - ${getFullName(
      data?.driver_details?.first_name,
      "",
      data?.driver_details?.last_name
    )}`;

    // Add print styles
    const printStyles = `
    <style id="print-styles">
      @media print {
        body * {
          visibility: hidden;
        }
        
        #driver-details-content, 
        #driver-details-content * {
          visibility: visible;
        }
        
        #driver-details-content {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
        
        .no-print {
          display: none !important;
        }
        
        .card {
          break-inside: avoid;
          margin-bottom: 15px;
        }
        
        .table {
          break-inside: avoid;
        }
        
        @page {
          margin: 0.5in;
          size: portrait;
        }
      }
    </style>
  `;

    // Add print styles to head
    document.head.insertAdjacentHTML("beforeend", printStyles);

    // Print
    window.print();

    // Clean up after printing
    setTimeout(() => {
      document.title = originalTitle;
      const printStylesElement = document.getElementById("print-styles");
      if (printStylesElement) {
        printStylesElement.remove();
      }
    }, 1000);
  };

  const params = medallionId
    ? { medallion_number: medallionId }
    : vehicleId
    ? { vehicle_number: vehicleId }
    : driverId
    ? { driver_number: driverId }
    : null;
  console.log("params", params);

  // const { data } = useGetMedallionDetailsQuery(params);

  console.log("data", data);
  const [medallionDetails, setMedallionDetails] = useState({
    "Renewal Date": "",
    SSN: "",
    EIN: "",
    "Procurement Type": "",
    "Hack Indicator": "",
    "Contract Start Date": "",
    "Contract End Date": "",
  });

  const [medallionMoreDetails, setMedallionMoreDetails] = useState({
    "Renewal Date": "",
    SSN: "",
    EIN: "",
    "Procurement Type": "",
    "Hack Indicator": "",
    "Contract Start Date": "",
    "Contract End Date": "",
  });

  const [licenseDetails, setLicenseDetails] = useState({
    "TLC License No": "",
    "DMV License No": "",
    "DMV License Expiry Date": "",
    "TLC License Expiry Date": "",
    "Bank Name": "",
    "Bank Account Number": "",
  });

  const [vehicleDetails, setVehicleDetails] = useState({
    "License Plate Number": "",
    "Vehicle Registration Date": "",
    Model: "",
    Year: "",
    Fuel: "",
    Cylinders: "",
    Color: "",
    "Vehicle Type": "",
    "Vehicle Management Entity": "",
    "Registration State": "",
  });

  const [vehicleMoreDetails, setVehicleMoreDetails] = useState({
    "License Plate Number": "",
    "Vehicle Registration Date": "",
    Model: "",
    Year: "",
    Fuel: "",
    Cylinders: "",
    Color: "",
    "Vehicle Type": "",
    "Vehicle Management Entity": "",
    "Registration State": "",
  });

  const getDefaultWeekRange = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday as start
    return {
      fromDate: startOfWeek,
      toDate: today,
    };
  };
  const formatDateEST = (date) => {
    // Convert to EST using Intl.DateTimeFormat
    const options = {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };

    const parts = new Intl.DateTimeFormat("en-CA", options).formatToParts(date);
    const year = parts.find((p) => p.type === "year").value;
    const month = parts.find((p) => p.type === "month").value;
    const day = parts.find((p) => p.type === "day").value;

    return `${year}-${month}-${day}`;
  };

  const defaultDates = getDefaultWeekRange();
  const formik = useFormik({
    initialValues: {
      fromDate: defaultDates.fromDate,
      toDate: defaultDates.toDate,
    },
    validate: (values) => {
      const errors = {};

      if (!values.fromDate) {
        errors.fromDate = "From date is required";
      }
      if (!values.toDate) {
        errors.toDate = "To date is required";
      } else if (values.fromDate && values.toDate < values.fromDate) {
        errors.toDate = "To date must be greater than or equal to From date";
      }

      return errors;
    },
  });

  useEffect(() => {
    if (!formik.errors.fromDate && !formik.errors.toDate) {
      const queryParams = new URLSearchParams({
        trip_start_date: yearMonthDate(formik.values.fromDate),
        trip_end_date: yearMonthDate(formik.values.toDate),
      }).toString();

      triggerGetTripSummary({ id: location?.state, queryParams });
    }
  }, [formik.values.fromDate, formik.values.toDate]);

  // New useEffect for paginated data
  useEffect(() => {
    if (paginatedData?.driver_history) {
      if (currentPage === 1) {
        setPastHistoryData(paginatedData.driver_history);
      } else {
        setPastHistoryData((prev) => [
          ...prev,
          ...paginatedData.driver_history,
        ]);
      }

      // Check if there's more data
      setHasMoreData(paginatedData.driver_history.length === 5); // Assuming per_page=5
      setIsLoadingMore(false);
    }
  }, [paginatedData, currentPage]);

  const handlePastHistoryScroll = () => {
    if (!pastHistoryRef.current || isLoadingMore || !hasMoreData) return;

    const { scrollTop, scrollHeight, clientHeight } = pastHistoryRef.current;

    // Trigger load more when user is near the bottom (50px threshold)
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);

      const queryParams = `?page=${nextPage}&per_page=5`;
      triggerGetDriverDetails({
        id: location?.state,
        queryParams,
      });
    }
  };

  // const handlePastHistoryScroll = () => {
  //   if (!pastHistoryRef.current || isLoadingMore || !hasMoreData) return;

  //   const { scrollTop, scrollHeight, clientHeight } = pastHistoryRef.current;

  //   // Trigger load more when user is near the bottom (50px threshold)
  //   if (scrollHeight - scrollTop <= clientHeight + 50) {
  //     const nextPage = currentPage + 1;
  //     loadMockHistoryData(nextPage);
  //   }
  // };
  // useEffect(() => {
  //   if (ledgerEntryListData) {
  //     console.log("Ledger Entry List", ledgerEntryListData.items);
  //     // setLedgerEntryList(ledgerEntryListData?.items);
  //     setLedgerEntryList([]);
  //   }
  // }, [ledgerEntryListData]);
  useEffect(() => {
    if (ezpassDetail) {
      console.log("Trip API data", ezpassDetail?.items);
      setTripsData(ezpassDetail?.items);
    }
  }, [ezpassDetail]);

  useEffect(() => {
    if (data) {
      //setTripsData(data?.trips?.items);
      //setLedgerEntryList(data?.ledgers[0]);
      setPastHistoryData(data?.driver_history);
      //loadMockHistoryData(0);
      const isMedallionAvailable = getMedallion();
      if (isMedallionAvailable) {
        setMedallionDetails({
          "Renewal Date": dateMonthYear(
            data?.leases[0]?.medallion.medallion_renewal_date
          ),
          ...(data?.leases[0]?.medallion?.entity_type === "corporation"
            ? { EIN: maskSSN(data?.leases[0]?.medallion?.ein) }
            : { SSN: maskSSN(data?.leases[0]?.medallion?.ssn) }),
          // SSN: maskSSN(data?.leases[0]?.medallion?.ssn),
          // EIN: maskSSN(data?.leases[0]?.medallion?.ein),
          "Procurement Type": data?.leases[0]?.medallion.procurement_type,
          "Hack Indicator": data?.leases[0]?.medallion.vehicle ? "Yes" : "No",
          "Contract Start Date": dateMonthYear(
            data?.leases[0]?.medallion?.validity_start_date
          ),
          "Contract End Date": dateMonthYear(
            data?.leases[0]?.medallion.validity_end_date
          ),
        });

        setMedallionMoreDetails({
          "Renewal Date": dateMonthYear(
            data?.leases[0]?.medallion?.medallion_renewal_date
          ),
          SSN: maskSSN(data?.leases[0]?.medallion?.ssn),
          "Procurement Type": data?.leases[0]?.medallion?.procurement_type,
          "Hack Indicator": data?.leases[0]?.medallion?.vehicle ? "Yes" : "No",
          "Contract Start Date": dateMonthYear(
            data?.leases[0]?.medallion?.validity_start_date
          ),
          "Contract End Date": dateMonthYear(
            data?.leases[0]?.medallion?.validity_end_date
          ),
          "Vehicle Type": getActiveVehicle()?.details?.vehicle_type,
          "Medallion Lease Signed": data?.leases[0]?.medallion
            ?.lease_expiry_date
            ? "Yes"
            : "No",
          "Attached Vehicle": getActiveVehicle()?.details?.vin,
          "Owner Type": data?.leases[0]?.medallion?.medallion_type,
          Storage: data?.leases[0]?.medallion?.in_storage ? "Yes" : "No",
          "Lease Due on": yearMonthDate(
            data?.leases[0]?.medallion?.lease_due_on
          ),
          "Owner Address 1":
            data?.leases[0]?.medallion?.owner_address?.address_line_1,
          "Owner Address 2":
            data?.leases[0]?.medallion?.owner_address?.address_line_2,
          City: data?.leases[0]?.medallion?.owner_address?.city,
          State: data?.leases[0]?.medallion?.owner_address?.state,
          Zip: data?.leases[0]?.medallion?.owner_address?.zip,
        });
      }

      const driver = getActiveDriver();
      if (driver)
        setLicenseDetails({
          "TLC License No": driver?.tlc_license_details?.tlc_license_number,
          "DMV License No": driver?.dmv_license_details?.dmv_license_number,
          "DMV License Expiry Date": dateMonthYear(
            driver?.dmv_license_details?.dmv_license_expiry_date
          ),
          "TLC License Expiry Date": dateMonthYear(
            driver?.tlc_license_details?.tlc_license_expiry_date
          ),
          "Bank Name": driver?.payee_details?.bank_name || "-",
          "Bank Account Number":
            driver?.payee_details?.bank_account_number || "-",
        });

      const vehicle = getActiveVehicle();
      if (vehicle) {
        setVehicleDetails({
          "License Plate Number": vehicle?.vehicle?.plate_number,
          "Vehicle Registration Date": dateMonthYear(
            vehicle?.vehicle?.registration_date
          ),
          Model: vehicle?.vehicle?.model,
          Year: vehicle?.vehicle?.year,
          Fuel: vehicle?.vehicle?.fuel,
          Cylinders: vehicle?.vehicle?.cylinders,
          Color: vehicle?.vehicle?.color,
          "Vehicle Type": vehicle?.vehicle?.vehicle_type,
          "Vehicle Management Entity": vehicle?.vehicle?.entity_name,
          "Registration State": vehicle?.vehicle?.registration_state,
        });
        setVehicleMoreDetails({
          "License Plate Number": vehicle?.vehicle?.plate_number,
          "Vehicle Registration Date": dateMonthYear(
            vehicle?.vehicle?.registration_date
          ),
          Model: vehicle?.vehicle?.model,
          Year: vehicle?.vehicle?.year,
          Fuel: vehicle?.vehicle?.fuel,
          Cylinders: vehicle?.vehicle?.cylinders,
          Color: vehicle?.vehicle?.color,
          "Vehicle Type": vehicle?.vehicle?.vehicle_type,
          "Vehicle Management Entity": vehicle?.vehicle?.entity_name,
          "Registration State": vehicle?.vehicle?.registration_state,
          "Vehicle Hacked": vehicle?.vehicle?.vehicle_hackups ? "Yes" : "No",
          "Vehicle Hacked Date": dateMonthYear(
            vehicle?.vehicle?.registration_date
          ),
          "Partition Installed": vehicle?.vehicle?.partition_installed,
          "Partition Selected": vehicle?.vehicle?.partition_selected,
          "Driver Assigned": vehicle?.vehicle?.is_driver_associated
            ? "Yes"
            : "No",
          "Driver Name": getFullName(
            driver?.driver_details?.first_name,
            "",
            driver?.driver_details?.last_name
          ),
        });
      }
    }
  }, [data]);

  // if (isLoading) return <p>Loading...</p>;

  const getActiveDriver = () => {
    return data?.driver_details ? data : null;
  };

  const getActiveVehicle = () => {
    return data?.leases ? data.leases[0] : null;
  };
  const getMedallion = () => {
    return data?.leases[0]?.medallion ? data.leases[0] : null;
  };

  const medallionDetialView = () => {
    console.log(data);

    return (
      <div className="medallion-info">
        <h1 className="section-title">Medallion Details</h1>
        <div className="medallion-basic">
          <Img className="icon" name="view_medallion" />
          <div>
            <h1 className="medallion-owner-name">
              {data?.leases[0]?.medallion?.medallion_number}
            </h1>
            <p className="driver-ssn  regular-text">
              Owner Name : {data?.leases[0]?.medallion?.owner_name}
            </p>
          </div>
        </div>
        <Divider className="custom-hr" />
        <table className="medallion-table">
          <tbody>
            {Object.entries(medallionMoreDetails).map(([key, value]) => (
              <tr key={key}>
                <td className="table-data-key  regular-text">{key}</td>
                <td className="table-data-value regular-text">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const medallionView = () => {
    const isMedallionAvailable = getMedallion();

    if (!isMedallionAvailable) {
      return;
    }
    return (
      <div className="medallion-info">
        <h1 className="section-title">Medallion Details</h1>
        <div className="medallion-basic">
          <Img className="icon" name="view_medallion" />
          <div>
            <h1 className="medallion-owner-name">
              {data?.leases[0]?.medallion?.medallion_number}
            </h1>
            <p className="driver-ssn regular-text">
              Owner Name : {data?.leases[0]?.medallion?.owner_name}
            </p>
          </div>
        </div>
        <Divider className="custom-hr" />
        <table className="medallion-table">
          <tbody>
            {Object.entries(medallionDetails).map(([key, value]) => (
              <tr key={key}>
                <td className="table-data-key regular-text">{key}</td>
                <td className="table-data-value regular-text">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="btn-container">
          <BModal>
            <BModal.ToggleButton>
              <div>
                <Button className="view-btn" data-testid="view-btn" text>
                  View more
                </Button>
              </div>
            </BModal.ToggleButton>
            <BModal.SideContent position={"right"}>
              <div>{medallionDetialView()}</div>
            </BModal.SideContent>
          </BModal>
        </div>
      </div>
    );
  };

  const DriverView = () => {
    const driver = getActiveDriver();
    console.log("DriverView", driver);
    if (!driver) return;
    return (
      <div className="medallion-info">
        <h1 className="section-title">Driver Details</h1>
        <div className="medallion-basic">
          <Img className="icon" name="img_driver" />
          <div className="regular-text">
            <h1 className="medallion-owner-name ">
              {getFullName(
                driver?.driver_details?.first_name,
                driver?.driver_details?.middle_name,
                driver?.driver_details?.last_name
              )}
            </h1>
            <p className="regular-text">
              SSN : {maskSSN(driver?.driver_details?.driver_ssn)}
            </p>
          </div>
        </div>
        <div className="driver-container regular-text">
          <div className="driver-info">
            <div className="driver-location regular-text">
              <Img className="icon" name="ic_location" />
              <div>
                <p>{formatAddress(driver?.primary_address_details).address}</p>
                <p>
                  {formatAddress(driver?.primary_address_details).coordinates}
                </p>
              </div>
            </div>
          </div>
          <div className="driver-contact ">
            <Img className="icon" name="img_tel_phone" />
            <p>
              {driver?.driver_details?.phone_number_1 ||
                driver?.driver_details?.phone_number_2 ||
                "-"}
            </p>
          </div>
          <div className="driver-contact">
            <Img className="icon" name="ic_cake" />
            <p>{dateMonthYear(driver?.driver_details?.dob || "")}</p>
          </div>
        </div>
        <Divider className="custom-hr" />

        <table className="medallion-table regular-text">
          <tbody>
            {Object.entries(licenseDetails).map(([key, value]) => (
              <tr key={key}>
                <td className="table-data-key regular-text">{key}</td>
                <td className="table-data-value regular-text">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* <div className="btn-container">
          <Button className="terminate-button" text>
            Terminate
          </Button>
        </div> */}
      </div>
    );
  };
  const VehicleDetialView = () => {
    const vehicle = getActiveVehicle();

    if (!vehicle) {
      return;
    }
    return (
      <div className="medallion-info">
        <h1 className="section-title">Vehicle</h1>
        <div className="medallion-basic">
          <Img className="icon" name="vehicle" />
          <div>
            <h1 className="medallion-owner-name">{vehicle?.details?.make}</h1>
            <p className="regular-text">VIN: {vehicle?.details?.vin}</p>
          </div>
        </div>
        <Divider className="custom-hr" />
        <table className="medallion-table">
          <tbody>
            {Object.entries(vehicleMoreDetails).map(([key, value]) => (
              <tr key={key}>
                <td className="table-data-key regular-text">{key}</td>
                <td className="table-data-value regular-text">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  const VehicleView = () => {
    const vehicle = getActiveVehicle();

    if (!vehicle) {
      return;
    }
    return (
      <div className="medallion-info">
        <h1 className="section-title">Vehicle</h1>
        <div className="medallion-basic">
          <Img className="icon" name="vehicle" />
          <div>
            <h1 className="medallion-owner-name">{vehicle?.vehicle?.make}</h1>
            <p className="driver-ssn regular-text">
              VIN: {vehicle?.vehicle?.vin}
            </p>
          </div>
        </div>
        <Divider className="custom-hr" />
        <table className="medallion-table">
          <tbody>
            {Object.entries(vehicleDetails).map(([key, value]) => (
              <tr key={key}>
                <td className="table-data-key regular-text">{key}</td>
                <td className="table-data-value regular-text">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="btn-container">
          <BModal>
            <BModal.ToggleButton>
              <div>
                <Button className="view-btn" text>
                  View Vehicle Details
                </Button>
              </div>
            </BModal.ToggleButton>
            <BModal.SideContent position={"right"}>
              <div>{VehicleDetialView()}</div>
            </BModal.SideContent>
          </BModal>
        </div>
      </div>
    );
  };

  const components = [
    { key: "driverId", id: driverId, view: DriverView },
    { key: "medallionId", id: medallionId, view: medallionView },
    { key: "vehicleId", id: vehicleId, view: VehicleView },
  ];

  //const prioritized = components.find((component) => component.id);
  const prioritized = components[0];
  const remainingComponents = components.filter(
    (component) => component.key !== prioritized?.key
  );
  console.log("Prioritized", prioritized, remainingComponents);

  const renderView = () => {
    return (
      <>
        {prioritized && (
          <>
            {prioritized.view()}
            <Img className="vertical-line" name="img_vertical_line" />
          </>
        )}
        {remainingComponents.map((component, index) => (
          <React.Fragment key={component.key}>
            {component.view()}
            {index < remainingComponents.length - 1 && (
              <Img className="vertical-line" name="img_vertical_line" />
            )}
          </React.Fragment>
        ))}
      </>
    );
  };

  const getDocumentIcon = (filename) => {
    const extension = filename.split(".").pop().toLowerCase() || filename;
    switch (extension) {
      case "pdf":
        return "img_pdf";
      case "png":
        return "img_png";
      default:
        return "";
    }
  };

  const getDocuments = () => {
    return data?.documents;
  };

  const ledgerEntryColumns = [
    {
      field: "id",
      header: "Transaction ID",
      headerAlign: "left",
      bodyAlign: "left",
    },
    {
      field: "created_on",
      header: "Ledger Date",
    },
    {
      field: "ledger_time",
      header: "Ledger Time",
    },
    {
      field: "transaction_date",
      header: "Transaction Date",
    },
    {
      field: "transaction_time",
      header: "Transaction Time",
    },
    {
      field: "driver_id",
      header: "Driver ID",
      headerAlign: "left",
      bodyAlign: "left",
    },
    {
      field: "medallion_number",
      header: "Medallion Number",
      headerAlign: "left",
    },
    {
      field: "vin",
      header: "VIN Number",
    },
    {
      field: "amount",
      header: "Amount",
    },
    {
      field: "transaction_type",
      header: "Dr/Cr",
    },
    {
      field: "source_type",
      header: "Transaction Type",
    },
  ];
  const [ledgerEntryList, setLedgerEntryList] = useState([]);
  const [tripsData, setTripsData] = useState([]);
  const [pastHistoryData, setPastHistoryData] = useState([]);
  const tripColumns = [
    {
      field: "trip_id",
      header: "Trip ID",
      headerAlign: "left",
      bodyAlign: "left",
    },
    {
      field: "driver_id",
      header: "Driver ID",
      headerAlign: "left",
      bodyAlign: "left",
    },
    {
      field: "vehicle_plate",
      header: "Vehicle Plate",
      headerAlign: "left",
    },
    {
      field: "medallion_number",
      header: "Medallion Number",
      headerAlign: "left",
    },
    {
      field: "tlc_license_no",
      header: "TLC License No",
    },
    {
      field: "total_amount",
      header: "Total Amount",
    },
    {
      field: "payment_mode",
      header: "Payment Mode",
    },
  ];

  const pastHistoryColumns = [
    {
      field: "case_number",
      header: "Case Number",
    },
    {
      field: "audit_trial_description",
      header: "Description",
    },
    {
      field: "audit_trial_date",
      header: "Date",
    },
    {
      field: "audit_trial_user",
      header: "User",
    },
  ];

  const customRender = (column, rowData) => {
    if (column.field === "id") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {rowData?.ledger_id}
            </h1>
          </div>
        </div>
      );
    }
    if (column.field === "created_on") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {yearMonthDate(rowData?.created_on)}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "ledger_time") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-transaction-number">
              {timeHourandMinutes(rowData?.created_on) || "-"}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "transaction_date") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-transaction-number">
              {rowData?.transaction_date || "-"}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "transaction_time") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-transaction-number">
              {rowData?.transaction_time || "-"}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "driver_id") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-ein-number">
              {data?.driver_details?.driver_lookup_id}
              <p className="fst-italic" data-testid="grid-driver-first-name">
                {getFullName(
                  data?.driver_details?.first_name,
                  data?.driver_details?.middle_name,
                  data?.driver_details?.last_name
                )}
              </p>
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "medallion_number") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-status">
              {rowData?.medallion_number || "-"}
              {rowData?.medallion_owner_name || ""}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "vin") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-status">
              {rowData?.vin || "-"}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "transaction_type") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-status">
              {rowData?.debit === true ? "Pay To Driver" : "Pay To Big Apple"}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "amount") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-status">
              {"$" + rowData?.amount}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "source_type") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-status">
              {rowData?.source_type || "-"}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "trip_id") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {rowData?.trip_id}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "vehicle_plate") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {rowData?.vehicle_plate}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "tlc_license_no") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-ein-number">
              {rowData?.tlc_license_no}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "total_amount") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-status">
              {rowData?.total_amount}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "payment_mode") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-status">
              {rowData?.payment_mode}
            </h1>
          </div>
        </div>
      );
    }

    //view past history
    else if (column.field === "case_number") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {rowData?.case_no ? (
                <Link
                  to={`/new-lease/${rowData?.case_no}`}
                  className="text-blue text-decoration-underline"
                >
                  {rowData?.case_no}
                </Link>
              ) : (
                "-"
              )}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "audit_trial_description") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {rowData?.description}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "audit_trial_date") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {monthDateYearHrsMinSepartedByUnderscore(rowData?.created_on) ||
                "-"}
            </h1>
          </div>
        </div>
      );
    } else if (column.field === "audit_trial_user") {
      return (
        <div>
          <div className="d-flex align-items-center justify-content-between flex-row">
            <h1 className="regular-text" data-testid="grid-entity-name-id">
              {rowData?.created_by}
            </h1>
          </div>
        </div>
      );
    }
    return [column.field];
  };

  const getFile = () => {
    // let upload = {};
    const uploadDocOptions = [
      {
        name: "Others",
        code: "others",
      },
    ];
    let document_data = {
      document_id: "",
      document_name: "",
      document_note: "",
      document_path: "",
      document_type: uploadDocOptions.map((doc) => doc.code).toString(),
      document_date: "",
      document_object_type: "driver",
      document_object_id: data?.driver_details?.driver_id,
      document_size: "",
      document_uploaded_date: "",
      presigned_url: "",
    };

    let upload = {
      data: document_data,
      object_type: "driver",
      object_id: data?.driver_details?.driver_id,
      document_id: 0,
      document_name: "",
      document_type: [
        {
          name: "Others",
          code: "others",
        },
      ],
    };
    return upload;
  };
  const onHistoryPageChange = (event) => {
    setHistoryFirst(event.first);
    setHistoryRows(event.rows);
  };
  const paginatedHistoryData = pastHistoryData?.slice(
    historyFirst,
    historyFirst + historyRows
  );
  return (
    <div
      className="common-layout w-100 h-100 d-flex flex-column gap-4 pb-4"
      id="driver-details-content"
    >
      <BBreadCrumb breadcrumbItems={breadcrumbItems} separator="/" />
      {/* <Button
        variant="outline-secondary"
        size="sm"
        className="btn btn-outline-secondary"
        onClick={exportToPDFAdvanced}
        disabled={isLoadingMore}
      >
        <i className="fa-solid fa-download"></i>
        {isLoadingMore ? "Generating PDF..." : "Export as PDF"}
      </Button> */}
      <div className="d-flex justify-content-end align-items-center gap-2">
        <span className="fw-bold">Export as:</span>
        <div className="d-flex align-items-center justify-content-between gap-1 px-2">
          <Button
            text
            data-testId="export-pdf-file"
            className="regular-text gap-2 d-flex p-0"
            onClick={exportToPDFAdvanced}
            icon={() => <Img name="ic_export_pdf" />}
          ></Button>
          <Button
            //variant="outline-primary"
            size="sm"
            //className="btn btn-outline-primary no-print"
            onClick={handleSimplePrint}
            icon={() => <Img name="print"></Img>}
          ></Button>
          {/* <Button
            text
            data-testId="export-excel-file"
            className="regular-text gap-2 d-flex p-0"
            onClick={() => exportFile("excel")}
            icon={() => <Img name="ic_export_excel" />}
          ></Button> */}
        </div>
      </div>

      {data && (
        <>
          <div>
            <div className="d-flex align-items-center">
              <h1 className="text-big-semi-bold mb-1">
                {" "}
                {getFullName(
                  data?.driver_details?.first_name,
                  data?.driver_details?.middle_name,
                  data?.driver_details?.last_name
                )}
              </h1>
            </div>
            <div className="medallion-details">
              <BCard
                label="TLC License No"
                value={licenseDetails?.["TLC License No"]}
              />
              <div className="separator"></div>
              <BCard
                label="DMV License No"
                value={licenseDetails?.["DMV License No"]}
              />
            </div>
            <Divider className="custom-hr-topic" />
            <div className="medallion-content">{renderView()}</div>
          </div>

          {/* file show */}
          <div className="d-flex align-items-center">
            <p className="section-title p-0">Documents</p>
            <BModal>
              <BModal.ToggleButton>
                <Button
                  text
                  label="Upload Document"
                  className="text-blue upload-common-btn gap-2 ms-auto"
                  type="button"
                  data-testid="btn-upload-documents"
                  icon={() => <Img name="upload_blue" />}
                />
              </BModal.ToggleButton>
              <BModal.Content>
                <BUpload {...getFile()}></BUpload>
              </BModal.Content>
            </BModal>
          </div>

          {data?.documents.length > 0 ? (
            <div>
              <DocumentGridViewOnly data={data?.documents} />
              {/* {getDocuments()?.map((file, index) => {
                console.log("🚀 ~ {getDocuments ~ file:", file);
                return (
                  <BAttachedFile
                    file={{
                      name: file?.document_name,
                      path: file?.presigned_url,
                    }}
                    key={index}
                  />
                );
              })} */}
            </div>
          ) : (
            <p className="text-center text-secondary">No Documents found</p>
          )}

          {/* past history */}
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3 fw-semibold text-dark">
              View Past History
            </div>
            {pastHistoryData.length > 0 ? (
              <DataTableComponent
                columns={pastHistoryColumns}
                data={paginatedHistoryData}
                renderColumn={customRender}
                // onPageChange={onPageChange}
                paginator={true}
                rows={historyRows}
                first={historyFirst}
                onPageChange={onHistoryPageChange}
                emptyMessage={"No records found"}
                totalRecords={data?.driver_history.length}
                dataKey="id"
              />
            ) : (
              //infinite scroll
              // <div
              //   ref={pastHistoryRef}
              //   onScroll={handlePastHistoryScroll}
              //   style={{
              //     height: "250px",
              //     overflowY: "auto",
              //     border: "1px solid #e0e0e0",
              //     borderRadius: "4px",
              //   }}
              // >
              //   <>
              //     <table style={{ width: "100%", borderCollapse: "collapse" }}>
              //       <thead
              //         style={{
              //           position: "sticky",
              //           top: 0,
              //           backgroundColor: "#f8f9fa",
              //           zIndex: 1,
              //         }}
              //       >
              //         <tr>
              //           <th
              //             style={{
              //               padding: "12px",
              //               borderBottom: "2px solid #dee2e6",
              //             }}
              //           >
              //             Driver ID
              //           </th>
              //           <th
              //             style={{
              //               padding: "12px",
              //               borderBottom: "2px solid #dee2e6",
              //             }}
              //           >
              //             Case Number
              //           </th>
              //           <th
              //             style={{
              //               padding: "12px",
              //               borderBottom: "2px solid #dee2e6",
              //             }}
              //           >
              //             Driver
              //           </th>
              //           <th
              //             style={{
              //               padding: "12px",
              //               borderBottom: "2px solid #dee2e6",
              //             }}
              //           >
              //             Active On
              //           </th>
              //         </tr>
              //       </thead>
              //       <tbody>
              //         {pastHistoryData.map((item, index) => (
              //           <tr
              //             key={`${item.driver_id}-${index}`}
              //             style={{ borderBottom: "1px solid #dee2e6" }}
              //           >
              //             <td style={{ padding: "12px" }}>
              //               {data?.driver_details?.driver_lookup_id}
              //               {/* <p
              //                 className="fst-italic"
              //                 data-testid="grid-driver-first-name"
              //               >
              //                 {getFullName(
              //                   data?.driver_details?.first_name,
              //                   data?.driver_details?.middle_name,
              //                   data?.driver_details?.last_name
              //                 )}
              //               </p> */}
              //             </td>
              //             <td style={{ padding: "12px" }}>
              //               {item.case_id || "-"}
              //             </td>
              //             <td style={{ padding: "12px" }}>
              //               {getFullName(
              //                 data?.driver_details?.first_name,
              //                 data?.driver_details?.middle_name,
              //                 data?.driver_details?.last_name
              //               )}
              //             </td>
              //             <td style={{ padding: "12px" }}>
              //               {monthDateYearHrsMinSepartedByUnderscore(
              //                 item.created_on
              //               ) || "-"}
              //             </td>
              //           </tr>
              //         ))}
              //       </tbody>
              //     </table>

              //     {/* Loading indicator */}
              //     {isLoadingMore && (
              //       <div
              //         style={{
              //           padding: "20px",
              //           textAlign: "center",
              //           borderTop: "1px solid #dee2e6",
              //         }}
              //       >
              //         <i
              //           className="pi pi-spin pi-spinner"
              //           style={{ fontSize: "1.5rem" }}
              //         ></i>
              //         <p style={{ margin: "8px 0 0 0" }}>Loading more...</p>
              //       </div>
              //     )}

              //     {/* No more data indicator */}
              //     {!hasMoreData && pastHistoryData.length > 0 && (
              //       <div
              //         style={{
              //           padding: "20px",
              //           textAlign: "center",
              //           borderTop: "1px solid #dee2e6",
              //           color: "#6c757d",
              //         }}
              //       >
              //         No more records to load
              //       </div>
              //     )}
              //   </>
              // </div>
              <div class="text-center text-secondary">
                Past history is not available
              </div>
            )}

            {/* {pastHistoryData.length > 0 ? (
              // <DataTableComponent
              //   columns={pastHistoryColumns}
              //   data={pastHistoryData}
              //   renderColumn={customRender}
              //   // onPageChange={onPageChange}
              //   emptyMessage={"No records found"}
              //   totalRecords={data?.driver_history.length}
              //   dataKey="id"
              // />
              <div className="d-flex flex-column gap-3">
                <table className="table border-bottom- align-middle">
                  <thead className="border-bottom">
                    <tr>
                      <th className="py-3 px-4 text-nowrap">Driver ID</th>
                      <th className="py-3 px-4 text-nowrap">Case Number</th>
                      <th className="py-3 px-4 text-nowrap">Driver</th>
                      <th className="py-3 px-4 text-nowrap">Active On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastHistoryData.map((item, index) => (
                      <tr key={index} className="border-bottom">
                        <td className="py-3 px-4 text-nowrap">
                          {data?.driver_details?.driver_lookup_id}
                          <p
                            className="fst-italic"
                            data-testid="grid-driver-first-name"
                          >
                            {getFullName(
                              data?.driver_details?.first_name,
                              data?.driver_details?.middle_name,
                              data?.driver_details?.last_name
                            )}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-nowrap">
                          {item.case_no || "-"}
                        </td>
                        <td className="py-3 px-4 text-nowrap">
                          {item.driver_name || "-"}
                        </td>
                        <td className="py-3 px-4 text-nowrap">
                          {item.active_on || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="d-flex flex-column gap-3">
                Past history is not available
              </p>
            )} */}
          </div>

          <p className="section-title p-0 mt-3">Ledger Entries</p>
          <DataTableComponent
            columns={ledgerEntryColumns}
            data={ledgerEntryList}
            renderColumn={customRender}
            emptyMessage={"No records found"}
            totalRecords={ledgerEntryList?.total}
            dataKey="id"
            onPageChange={onPageChange}
          />
          <div className="bg-light">
            <p className="section-title p-0 m-3">View Trips</p>
            <div className="p-3 bg-light">
              <h6 className="mb-1 fw-bold">Select Date Range</h6>
              <p className="text-muted small">Weekly Trips Run</p>

              <div className="d-flex flex-column flex-md-row gap-3 align-items-stretch bg-white mt-2">
                {/* Date Inputs */}
                <div className="d-flex flex-column flex-sm-row gap-3 flex-grow-1 align-items-center">
                  <div className="flex-grow-1 p-1">
                    <BCalendar
                      variable={{
                        id: "fromDate",
                        label: "From Date",
                        isRequire: true,
                        maxDate: new Date(),
                      }}
                      formik={formik}
                    ></BCalendar>
                  </div>
                  <div className="flex-grow-1 p-1">
                    <BCalendar
                      variable={{
                        id: "toDate",
                        label: "To Date",
                        isRequire: true,
                        maxDate: new Date(),
                      }}
                      formik={formik}
                    ></BCalendar>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="d-flex justify-content-between flex-wrap  border p-3 rounded flex-grow-1 text-center bg-light-subtle m-2">
                  <div className="px-3">
                    <h6 className="mb-1 fw-semibold">
                      {tripSummaryData?.trips?.items?.length}
                    </h6>
                    <small className="text-muted">Total Trips</small>
                  </div>
                  <div className="border-start px-3">
                    <h6 className="mb-1 fw-semibold">
                      {tripSummaryData?.trips?.total_revenue}
                    </h6>
                    <small className="text-muted">Total Amounts</small>
                  </div>
                  <div className="border-start px-3">
                    <h6 className="mb-1 fw-semibold">
                      {yearMonthDate(formik.values.toDate) || "0"}
                    </h6>
                    <small className="text-muted">Payment Till</small>
                  </div>
                </div>
              </div>
            </div>
            <div className="m-2">
              <DataTableComponent
                columns={tripColumns}
                data={tripsData}
                renderColumn={customRender}
                emptyMessage={"No records found"}
                totalRecords={ezpassDetail?.total_items}
                dataKey="id"
                onPageChange={onTripPageChange}
              />
            </div>
          </div>

          {/* <BModal>
            <BModal.ToggleButton>
              <div>
                <div className="document-show">
                  <h1 className="heading">Documents</h1>
                  <div className="document-flex">
                    {getDocuments()?.map((file, index) => (
                      <div key={index} className="file-container">
                        <div className="image-container">
                          <Img
                            className="image-size"
                            name={getDocumentIcon(file.document_format)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </BModal.ToggleButton>
            <BModal.SideContent position={"right"}>
              <div>
                {getDocuments()?.map((file, index) => (
                  <PDFViewer key={index} url={file.presigned_url} />
                ))}
              </div>
            </BModal.SideContent>
          </BModal> */}

          {/* <div className="pb-4"></div> */}
        </>
      )}
    </div>
  );
};

export default ViewDriverDetails;
