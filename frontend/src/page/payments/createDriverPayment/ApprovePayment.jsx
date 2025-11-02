import { useEffect, useState } from "react";
import DataTableComponent from "../../../components/DataTableComponent";
import { useNavigate } from "react-router-dom";
import { yearMonthDate } from "../../../utils/dateConverter";
import Img from "../../../components/Img";
import { generateFieldObject } from "../../../utils/generateFieldObject";
import { Button } from "primereact/button";
import { useMoveCaseDetailMutation } from "../../../redux/api/medallionApi";
import { useLazyViewDriverPaymentsQuery } from "../../../redux/api/paymentApi";
import BSuccessMessage from "../../../components/BSuccessMessage";
import PdfViewModal from "../../../components/PdfViewModal";
import HtmlViewModal from "../../../components/HtmlViewModal";
import SpreadsheetViewer from "../../../components/SpreadsheetViewer";

const ApprovePayment = ({  caseId , currentStepId }) => {
  const navigate = useNavigate();
  const [selectedProducts, setSelectedProducts] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [isOpen,setOpen] =useState(false);
  const [ triggerGetEzpass , { data: ezpassDetail }] = useLazyViewDriverPaymentsQuery();
  const [moveCase, { isSuccess: isMoveDataSuccess }] = useMoveCaseDetailMutation();

  const tripId = "trip_id";
  const postingDate = "posting_date";
  const fields = [
    { key: "receipt_id", label: "Receipt ID", formatType: "search" ,sortable:false,filter:false},
    { key: "medallion_number", label: "Medallion No", formatType: "Search" ,sortable:false,filter:false},
    { key: "shift", label: "Shift", formatType: "Search" ,sortable:false,filter:false},
    { key: "ach", label: "ACH", formatType: "Search" ,sortable:false,filter:false},
    { key: "dtr_revenue", label: "DTR Revenue", formatType: "date" ,sortable:false,filter:false},
    { key: "cash_paid", label: "Cash Paid", formatType: "Search" ,sortable:false,filter:false},
    { key: "dtr_paid", label: "DTR Paid", formatType: "Search" ,sortable:false,filter:false},
    { key: "payment", label: "Payment", formatType: "Search" ,sortable:false,filter:false},
    {
      key: "m_status",
      label: "",
      formatType: "select",
      filter: false,
      sortable: false,
    },
  ];

  const { columns } =
    generateFieldObject(fields);

  const triggerSearch = ({ page, limit}) => {
      const queryParams = new URLSearchParams({
          page,
          per_page: limit,
          // sort_by: "trip_ids"
      });
      triggerGetEzpass(`${caseId}/${currentStepId}?${queryParams?.toString()}`)
  };

  useEffect(() => {
    triggerSearch({ page: 1, limit: 5 });
  }, []);

  useEffect(() => {
    if (ezpassDetail) {
        setVehicles(ezpassDetail);
    }
  }, [ezpassDetail]);

  const onPageChange = (data) => {
    triggerSearch({ page: Number(data.page) + 1, limit: data.rows });
  };

  const customRender = (column, rowData) => {
    if (column.field === "m_status") {
      return (
        <div className="d-flex align-items-center gap-4">
          <Button
            onClick={() => navigate("/view-trips/1")}
            className="manage-table-location-svg"
            icon={<Img name="pencil_edit" alt="location" />}
          ></Button>
          <PdfViewModal
            triggerButton={
                <Img name='ic_export_pdf'></Img>
            }
            title="Driver Transaction Receipt"
            downloadUrl={rowData?.receipt_urls?.pdf}
            downloadName={"dtr.pdf"}
            extension={"pdf"}
            previewUrl={rowData?.receipt_urls?.pdf}
          />
          <SpreadsheetViewer
            triggerButton={
              <Img name='ic_export_excel'></Img>
            }
            title="Driver Transaction Receipt"
            downloadUrl={rowData?.receipt_urls?.excel}
            downloadName={"dtr.xlsx"}
            extension={"xlsx"}
            previewUrl={rowData?.receipt_urls?.excel}
          />
           <HtmlViewModal
            triggerButton={
                <Img name='html'></Img>
            }
            title="Driver Transaction Receipt"
            downloadUrl={rowData?.receipt_urls?.pdf}
            downloadName={"dtr.pdf"}
            extension={"pdf"}
            previewUrl={rowData?.receipt_urls?.html}
          />
          
        </div>
      );
    }
    if (column.field === tripId) {
      return <p>{rowData?.[column?.field]}</p>;
    }
    if(column.field === "receipt_id") {
      return <>
       <div className="text-blue">
              {rowData?.[column?.field]}
            </div>
    </>
    }
    if (column.field === postingDate) {
      return <p>{yearMonthDate(rowData?.[column?.field])}</p>;
    }
    return rowData[column.field] || "-";
  };

  const handleSubmit = () => {
    moveCase({ params: caseId });
  };

  useEffect(() => {
    if (isMoveDataSuccess) {
      setOpen(true);
    }
  }, [isMoveDataSuccess]);
  return (
    <>
      <DataTableComponent
        columns={columns}
        data={vehicles}
        selectionMode=""
        selectedData={selectedProducts}
        onSelectionChange={(e) => setSelectedProducts(e.value)}
        renderColumn={customRender}
        onPageChange={onPageChange}
        totalRecords={0}
        dataKey="trip_id"
      />
      <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        <Button
          label="Create DTRs"
          type="submit"
          onClick={() => {
            handleSubmit();
          }}
          data-testid="medallion-detail-btn"
          severity="warning"
          className="border-radius-0 primary-btn "
        />
      </div>
      <BSuccessMessage
                isOpen={isOpen}
                message={`DTR Created Successfully.`}
                title="DTR Creation Successful"
                onCancel={() => {
                    setOpen(false); navigate('/manage-driver-payments', { replace: true });
                }}
                onConfirm={() => {
                    setOpen(false); navigate('/manage-driver-payments', { replace: true });
                }}
            />
    </>
  );
}

export default ApprovePayment