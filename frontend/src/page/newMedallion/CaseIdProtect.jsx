import { Navigate, Outlet, useParams } from "react-router-dom"

const CaseIdProtect = () => {
    const params=useParams();
    if(params.case_id){
        return <Navigate to={"/new-medallion"} />
    }
  return (
    <Outlet></Outlet>
  )
}

export default CaseIdProtect