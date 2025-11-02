import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from 'primereact/button';
import { useGetStepInfoQuery, useMoveCaseDetailMutation, useProcessCaseDeatilMutation } from "../../../redux/api/medallionApi";
import { useEffect, useState } from "react";
import { getCurrentStep } from "../../../utils/caseUtils";

const SelectLease = ({ caseId, currentStepId, reload, currentStep, caseData, hasAccess }) => {
    const [selectedProduct, setSelectedProduct] = useState(null);
    const { data: stepInfoData } = useGetStepInfoQuery({ caseNo: caseId, step_no: currentStepId });
    console.log(stepInfoData, caseData, currentStep);

    const [processFlow, { isSuccess: isProcessDataSuccess }] = useProcessCaseDeatilMutation();

    const [moveCase, { isSuccess: isMoveDataSuccess }] = useMoveCaseDetailMutation();

    useEffect(() => {
        if (isMoveDataSuccess) {
            reload();
        }
    }, [isMoveDataSuccess])

    useEffect(() => {
        if (hasAccess && isProcessDataSuccess && getCurrentStep(caseData.steps).step_id == currentStepId && getCurrentStep(caseData.steps).is_current_step) {
            moveCase({ params: caseId })
        }
    }, [isProcessDataSuccess])

    const terminateLeaseFun = () => {
        processFlow({
            params: caseId, data: {
                step_id: currentStepId,
                // data: {
                // driver_id:currentStep?.driver_info?.driver_id,
                // driver_lease_ids:selectedProduct?.driver_lease_id
                // }
                "data": {
                    "lease_id": selectedProduct?.driver_lease_id.toString()
                }
            }
        })
    }
    return (
        <>
            <DataTable value={currentStep?.lease_info}
                selection={selectedProduct} onSelectionChange={(e) => setSelectedProduct(e.value)}
                selectionMode={'checkbox'} dataKey="driver_lease_id" className="primary-table">
                <Column selectionMode="single" headerStyle={{ width: '3rem' }}></Column>
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
                    label="Select Lease"
                    type="type"
                    onClick={terminateLeaseFun}
                    severity="warning"
                    className="border-radius-0 primary-btn "
                />
            </div>
        </>

    )
}

export default SelectLease