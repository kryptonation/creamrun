import React, { useEffect, useState } from 'react'
import { reHackUp as variable } from "../../utils/variables";
import { useFormik } from 'formik';
import { Button } from 'primereact/button';
import BSuccessMessage from '../../components/BSuccessMessage';
import { useNavigate } from 'react-router-dom';
import BInputText from '../../components/BInputText';
import { useLazyGetMedallionsQuery, useMoveCaseDetailMutation, useProcessCaseDeatilMutation } from '../../redux/api/medallionApi';
import { getCurrentStep } from '../../utils/caseUtils';
import BAutoComplete from '../../components/BAutoComplete';

const ReHackUp = ({ caseId, currentStepId, currentStep, hasAccess, caseData, reload }) => {
    const [isOpen, setOpen] = useState(false);
    const [value, setValue] = useState(variable);
    const navigate = useNavigate();
    const [processFlow, { isSuccess: isProccessDataSuccess }] = useProcessCaseDeatilMutation();
    const [moveCase, { isSuccess: isMoveDataSuccess }] = useMoveCaseDetailMutation();
    console.log(currentStep);

    const formik = useFormik({
        initialValues: {
            searchMedallion: "",
            typeYourReason: ""
        },
        validateOnChange: true,
        validate: (values) => {
            const errors = {};
            if (!values[variable.field_01.id]) {
              errors[variable.field_01.id] = `${variable.field_01.label} is required`;
            } 
      
            return errors;
          },
        onSubmit: (values) => {
            processFlow({
                params: `${caseId}`,
                data: {
                    step_id: currentStepId,
                    data: {
                        vin: currentStep?.vehicle_info?.vin,
                        medallion_number: values?.searchMedallion?.name,
                        resion_for_rehackup: values?.typeYourReason
                    }
                }
            })
        },
    });
    const [triggerGetMedallion, { data: medallianData,isFetching }] = useLazyGetMedallionsQuery();

    useEffect(() => {
        if (isProccessDataSuccess) {
            reload();
        }
        if (hasAccess && isProccessDataSuccess && caseData && caseData.case_info.case_status !== "Closed" && getCurrentStep(caseData.steps).step_id === currentStepId) {
            moveCase({ params: caseId })
        }
    }, [isProccessDataSuccess])

    useEffect(() => {
        if (isMoveDataSuccess) {
            setOpen(true)
        }
    }, [isMoveDataSuccess])

    useEffect(() => {
        if (medallianData||isFetching) {
            setValue(prev => {
                return { ...prev, field_01: { ...prev.field_01, options: medallianData?.items.map(item => {return({name:item?.medallion_number})}) } }
            });
        }
    }, [medallianData,isFetching])

    const searchData = (item, value) => {
        if (item.id === "searchMedallion") {
            const queryParams = new URLSearchParams();
            queryParams.append('medallion_number', value);
            queryParams.append('medallion_type', currentStep.vehicle_info?.vehicle_type);
            triggerGetMedallion(`?${queryParams?.toString()}`)
        }
    }
    useEffect(()=>{
        const queryParams = new URLSearchParams();
        queryParams.append('medallion_type', currentStep.vehicle_info?.vehicle_type);
        triggerGetMedallion(`?${queryParams?.toString()}`)
    },[])

    return (
        <div className='w-100'>
            <form
                action=""
                className="common-form d-flex flex-column gap-5"
                onSubmit={formik.handleSubmit}
            >
                <div className="form-section">
                    <div className="form-body">
                        <div className="d-flex align-items-center flex-wrap form-grid-1 w-80">
                            <div className='w-100-3'>
                                <p className='regular-semibold-text pb-3'>Choose Medallion</p>
                                {/* <Dropdown value={formik.values[value.field_01.id]} filter filterInputAutoFocus onChange={formik.handleChange} options={[]} 
                                onFilter={(e) => setOptions(e.filter)}
                                filterValue={options} selectOnFocus optionLabel="name" 
                placeholder="Select a City" className="w-full md:w-14rem" /> */}
                                <BAutoComplete
                                    variable={value.field_01}
                                    formik={formik}
                                    handleSearch={(query) => {
                                        searchData(value.field_01, query)
                                    }}
                                >
                                </BAutoComplete>
                                {/* <BSelectWithSearch
                                    variable={value.field_01}
                                    formik={formik}
                                    handleSearch={(query) => {
                                        searchData(value.field_01, query)
                                    }}
                                /> */}
                            </div>
                            <div className='w-100-3'>
                                <p className='regular-semibold-text pb-3'>Reason for Re-Hack</p>
                                <BInputText variable={value.field_02} formik={formik}></BInputText>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="w-100 position-sticky bottom-0 py-3 bg-white">
                    <Button
                        disabled={!hasAccess}
                        label="Re-Hack"
                        type="submit"
                        severity="warning"
                        className="border-radius-0 primary-btn "
                    />
                </div>
                <BSuccessMessage
                    isOpen={isOpen}
                    message={`Vehicle Re-Hack is Successful for VIN: ${currentStep?.vehicle_info?.vin}.`}
                    title="Vehicle Re-Hack Successful"
                    onCancel={() => {
                        setOpen(false); navigate('/manage-vehicle', { replace: true });
                    }}
                    onConfirm={() => {
                        setOpen(false); navigate('/manage-vehicle', { replace: true });
                    }}
                />
            </form>
        </div>
    )
}

export default ReHackUp