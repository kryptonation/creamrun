import React, { useEffect, useState } from 'react'
import { Button } from 'primereact/button'
// import PDFViewRender from './PDFViewRender'
import BSuccessMessage from '../../../components/BSuccessMessage'
import { useGetStepInfoQuery, useMoveCaseDetailMutation } from '../../../redux/api/medallionApi'
import { useNavigate } from 'react-router-dom'
import PDFViewRender from '../../newLease/PDFViewRender'


const ViewGenDocLease = ({ caseId, hasAccess, currentStepId }) => {

  const { data: stepInfoData } = useGetStepInfoQuery({ caseNo: caseId, step_no: currentStepId }, { skip: !currentStepId || !caseId });


  const [isOpen, setOpen] = useState(false);
  const [moveCase, { isSuccess: isMoveDataSuccess }] = useMoveCaseDetailMutation();
  const navigate = useNavigate();
  const [coLease0, setCoLease0] = useState([]);
  const [coLease1, setCoLease1] = useState([]);

  console.log(coLease0)
  console.log(coLease1)

  useEffect(() => {
    if (isMoveDataSuccess) {
      // reload();
      setOpen(true)
    }
  }, [isMoveDataSuccess])

  useEffect(() => {
    if (stepInfoData) {
      const coLease0Docs = stepInfoData?.documents?.filter(
        (item) => item?.["object-type"] === "co-leasee-0"
      );
      const coLease1Docs = stepInfoData?.documents?.filter(
        (item) => item?.["object-type"] === "co-leasee-1"
      );

      setCoLease0(coLease0Docs || []);
      setCoLease1(coLease1Docs || []);
    }
  }, [stepInfoData]);

  return (
    <>

      <div className='d-flex flex-column cus-gap-5'>
        <p className="regular-semibold-text pb-3 ">Co-Lessee 1 Documents</p>
        <div className='d-flex align-items-center gap-4'>
          {
            coLease0?.map((item, idx) => {
              return <PDFViewRender key={idx} item={item} />
            })
          }
        </div>
        {coLease1?.length ? <><p className="regular-semibold-text pb-3 ">Co-Lessee 2 Documents</p>
          <div className='d-flex align-items-center gap-4'>
            {
              coLease1?.map((item, idx) => {
                return <PDFViewRender key={idx} item={item} />
              })
            }
          </div></> : null}
      </div>
      <div className="w-100 position-sticky bottom-0 py-3 mt-5 bg-white">
        <Button
          label="Complete Lease"
          disabled={!hasAccess}
          onClick={() => {
            moveCase({ params: caseId })
          }}
          type="submit"
          severity="warning"
          className="border-radius-0 primary-btn "
        />
      </div>
      <BSuccessMessage
        isOpen={isOpen}
        message={`Lease completion process is successful for Medallion No ${stepInfoData?.lease_case_details?.medallion_number} .`}
        title="Lease Completion Successful"
        onCancel={() => {
          setOpen(false); navigate('/manage-lease', { replace: true });
        }}
        onConfirm={() => {
          setOpen(false); navigate('/manage-lease', { replace: true });
        }}
      />
    </>
  )
}

export default ViewGenDocLease