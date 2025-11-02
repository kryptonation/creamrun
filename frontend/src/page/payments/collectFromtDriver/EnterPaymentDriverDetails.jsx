import React from 'react'
import schema from "./enterpaymentDriverDetail.json";
import BDynamicForm from '../../../components/BDynamicForm';

const EnterPaymentDriverDetails = () => {
  return (
    <BDynamicForm schema={schema}/>
  )
}

export default EnterPaymentDriverDetails