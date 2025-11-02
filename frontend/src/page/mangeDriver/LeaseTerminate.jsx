import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from 'primereact/button';
import { useGetStepInfoQuery, useProcessCaseDeatilMutation } from "../../redux/api/medallionApi";
import { useEffect, useState } from "react";
import BSuccessMessage from "../../components/BSuccessMessage";
import { useNavigate } from "react-router-dom";

const LeaseTerminate = ({ caseId, currentStepId, currentStep, caseData,hasAccess }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isOpen, setOpen] = useState(false);
  const navigate=useNavigate();
  const { data: stepInfoData } = useGetStepInfoQuery({ caseNo: caseId, step_no: currentStepId });
  console.log(stepInfoData,caseData,currentStep );
  
  const [processFlow, { isSuccess: isProcessDataSuccess }] = useProcessCaseDeatilMutation();
  const terminateLeaseFun=()=>{
    processFlow({ params: caseId, data: {
      step_id:currentStepId,
      data: {
      driver_id:currentStep?.driver_info?.driver_id,
      driver_lease_ids:selectedProduct?.map(item=>item.driver_lease_id.toString())
      }
    } })
  }
  console.log(selectedProduct);
  
  useEffect(()=>{
     if(isProcessDataSuccess){
      setOpen(true);
     }
  },[isProcessDataSuccess])
  return (
    <>
      <DataTable value={currentStep?.lease_info}
       selection={selectedProduct} onSelectionChange={(e) => setSelectedProduct(e.value)}
        selectionMode={'checkbox'} dataKey="driver_lease_id" className="primary-table">
        <Column selectionMode="multiple" headerStyle={{ width: '3rem' }}></Column>
        <Column field="driver_lease_id" header="Lease ID"></Column>
        <Column field="medallion_number" header="Medallion No"></Column>
        <Column field="driver_name" header="Driver Name"></Column>
        <Column field="vin_number" header="VIN No"></Column>
        <Column field="vehicle_plate_number" header="Vehicle Plate No"></Column>
        <Column field="lease_date" header="Lease Date"></Column>
      </DataTable>
      <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        <Button
          disabled={!hasAccess}
          label="Terminate Lease"
          type="type"
          onClick={terminateLeaseFun}
          severity="warning"
          className="border-radius-0 primary-btn "
        />
      </div>
      <BSuccessMessage
        isOpen={isOpen}
        message={`Terminate Lease is successful for Lease ID ${selectedProduct?.map(item=>item.lease_id)}`}
        title="Terminate Lease Successful"
        onCancel={() => {
          setOpen(false); navigate('/manage-driver', { replace: true });
        }}
        onConfirm={() => {
          setOpen(false); navigate('/manage-driver', { replace: true });
        }}
      />
    </>

  )
}

export default LeaseTerminate