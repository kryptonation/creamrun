import React from 'react'
import BCaseCard from '../../components/BCaseCard'
import { useParams } from 'react-router-dom';
import { useGetCaseDetailQuery } from '../../redux/api/medallionApi';

const CaseTop = () => {
  const params = useParams();
  const { data: getCaseData } = useGetCaseDetailQuery(params["case-id"], {
    skip: !params["case-id"],
  },);
  return (
    <div className="d-flex align-items-center gap-5 mb-2">
      <BCaseCard label="Case Number" value={getCaseData?.case_info?.case_no} dataTestId="case-number"></BCaseCard>
      <BCaseCard label="Case Status" value={getCaseData?.case_info?.case_status} dataTestId="case-status"></BCaseCard>
      <BCaseCard label="Created By" value={getCaseData?.case_info?.created_by} dataTestId="created-by"></BCaseCard>
      <BCaseCard label="Created On" value={getCaseData?.case_info?.case_created_on} dataTestId="created-on"></BCaseCard>
      <BCaseCard label="Action Due On" value={getCaseData?.case_info?.action_due_on} dataTestId="action-due-on"></BCaseCard>
      <BCaseCard label="To be completed in" value={getCaseData?.case_info?.to_be_completed_in} dataTestId="ssn"></BCaseCard>
    </div>
  )
}

export default CaseTop