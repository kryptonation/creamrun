import Img from "../../components/Img";
import { useFormik } from "formik";
import { chooseMedallionOwner as variable } from "../../utils/variables";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { useEffect, useState } from "react";
import { useGetStepInfoQuery, useLazyOwnerListQuery, useMoveCaseDetailMutation, useProcessCaseDeatilMutation } from "../../redux/api/medallionApi";
import BInputText from "../../components/BInputText";
import { useNavigate, useParams } from "react-router-dom";
import { Paginator } from "primereact/paginator";
import { getActiveComponent } from "../../redux/slice/componentSlice";
import { useSelector } from "react-redux";
import BModal from "../../components/BModal";
import MedallionListModal from "./MedallionListModal";
import { CHOOSE_INDIVIDUAL_OWNER, CREATE_INDIVIDUAL_OWNER } from "../../utils/constants";

const ChooseMedallion = () => {
  const [processFlow, { isSuccess: isProccessDataSuccess }] = useProcessCaseDeatilMutation();
  const [moveCase] = useMoveCaseDetailMutation();
  const params = useParams();
  const individualOwner=10000000;
  const corporateOwner=10000000;

  const navigate = useNavigate();
  const activeComponent = useSelector(getActiveComponent);
  const { data: stepInfoData, isSuccess: isStepInfoSuccess } = useGetStepInfoQuery({ caseNo: params["case-id"], step_no: activeComponent }, { skip: !params["case-id"] });
  console.log(stepInfoData, isStepInfoSuccess);

  const [selectedProducts, setSelectedProducts] = useState(null);

  const isMedallionClickable=(data)=>{
    if(data?.entity_type==="individual"){
      if(data?.additional_info?.medallions.length>=individualOwner){
       return false
      }
      return true
   }
   if(data?.entity_type==="corporation"){
      if(data?.additional_info?.medallions.length>=corporateOwner){
       return false
      }
      return true
   }
   return true
  }

  const processFlowFunc=(data)=>{
    // entity_type: "individual" "corporation"
    if(data?.entity_type==="individual"){
       if(data?.additional_info?.medallions.length>=individualOwner){
        return
       }
       return (processFlow({
        params: params["case-id"]
        , data: { step_id: CHOOSE_INDIVIDUAL_OWNER, data: { medallionOwnerId: data.medallion_owner_id?.toString() } }
      }))
    }
    if(data?.entity_type==="corporation"){
       if(data?.additional_info?.medallions.length>=corporateOwner){
        return
       }
       return (processFlow({
        params: params["case-id"]
        , data: { step_id: CHOOSE_INDIVIDUAL_OWNER, data: { medallionOwnerId: data.medallion_owner_id?.toString() } }
      }))
    }
    return (processFlow({
      params: params["case-id"]
      , data: { step_id: CHOOSE_INDIVIDUAL_OWNER, data: { medallionOwnerId: data.medallion_owner_id?.toString() } }
    }))
  }

  const deleteTemplete = (data) => {
    if (data.entity_type === "corporation"||data.entity_type === "individual") {
      return (
        <BModal>
        <BModal.ToggleButton>
        <button data-testid="owner-grid-modal-btn"  className="d-flex align-items-center gap-2 btn border-0 p-0">
         {data.added}
         <div type="button" data-testid={`medallion-grid-status-${data.contact_number}`} 
         className="btn border-0 p-0 d-flex align-items-center justify-content-center gap-2"
              >
                {data?.additional_info?.medallions.length}
                {data?.additional_info?.medallions.length ?
                  isMedallionClickable(data)?
                  <Img name="medallian_success"/>
                  :
                  <div className="medallion_grey">
                  <Img name="medallian_success"/>
                  </div>
                   :
                  <Img name="add_medallion"/>
                }
              </div>
              <div type="button" data-testid="medallion-grid-doc" className="btn p-0 border-0 d-flex align-items-center justify-content-center gap-2"
              >
              <Img name="pdf" className="pdf-black"/>
         </div>
        </button>
        </BModal.ToggleButton>
        <BModal.Content>
           <MedallionListModal data={data} processFlowFunc={processFlowFunc} isMedallionClickable={isMedallionClickable(data)}/>
        </BModal.Content>
        </BModal>
      )
    }
    return (
      <div className="d-flex align-items-center gap-2">
        {data.added}
        <button type="button" className="btn p-0 d-flex align-items-center justify-content-center gap-2"
          onClick={() => processFlowFunc(data)}>
          {data?.additional_info?.medallions.length}
          {data?.additional_info?.medallions.length ?
            isMedallionClickable(data)?
                  <Img name="medallian_success"/>
                  :
                  <div className="medallion_grey">
                  <Img name="medallian_success"/>
                  </div>
                   :
                  <Img name="add_medallion"/>
                }
        </button>
        {
          <button type="button" className="btn p-0 d-flex align-items-center justify-content-center gap-2"
            onClick={() => navigate(`/new-medallion/${params["case-id"]}/doc-viewer/${data.additional_info.medallions[0]?.medallion_number}`)}
          >
           <Img name="pdf" className="pdf-black"/>
          </button>
        }

      </div>
    )
  };


  const type = (data) => {
    const demo = {
      individual: "personal",
      corporation: "company",
    };
    return (
      demo[data.entity_type] && (
        <div className="doc-img" data-testid={`${demo[data.entity_type]}-icon`} >
          <Img name={demo[data.entity_type]}></Img>
        </div>
      )
    );
  };
  const contact = (data) => {
    return (
      <div>
        <p>{data.contact_number}</p>
        <p>{data.email_address}</p>
      </div>
    );
  };

  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(5);
  const [page, setPage] = useState(1);


  useEffect(() => {
    if (isProccessDataSuccess) {
      //TODO : Delay the call API till the backend fix.
      const timeout = setTimeout(() => {
        moveCase({ params: params["case-id"] });
      }, 1000);

      return () => clearTimeout(timeout);
    }
  }, [isProccessDataSuccess]);

  const [triggerSearchQuery, { data }] = useLazyOwnerListQuery({ skip: true })

  useEffect(() => { triggerSearch({ page, limit: rows }) }, [])

  const formik = useFormik({
    initialValues: {
      [variable.field_01.id]: "",
      [variable.field_02.id]: "",
      [variable.field_03.id]: "",
    },
    onSubmit: () => {
      console.log(page);

      triggerSearch({ page: Number(page), limit: rows });
    },
    onReset: () => {
      // setPage(1); // Reset page to 1
      // setRows(10); // Reset rows to 10 or your default value
    },
  });

  const triggerSearch = ({ page, limit }) => {
    const queryParams = new URLSearchParams({
      page,
      limit,
      medallion_owner_name: formik.values[variable.field_01.id],
      ssn_or_ein: formik.values[variable.field_02.id],
    });
    triggerSearchQuery(`?${queryParams.toString()}`)
  };

  const onPageChange = (event) => {
    setFirst(Number(event.first) + 1);
    setPage(Number(event.page) + 1)
    setRows(event.rows);
    triggerSearch({ page: Number(event.page) + 1, limit: event.rows })
  };

  const formReset = () => {
    formik.resetForm();
    const queryParams = new URLSearchParams({
      page: 1,
      limit: 5,
      medallion_owner_name: "",
      ssn_or_ein: "",
    });
    triggerSearchQuery(`?${queryParams.toString()}`)
  }

  const refreshData = () => {
    triggerSearch({ page: page, limit: rows });
  }

  const header = (
    <div className="d-flex flex-wrap align-items-center justify-content-end table-header-icon-con">
      {/* <Button
        text
        className="delete-btn"
        icon={() => {
          return <Img name="delete"></Img>;
        }}
      />
      <Divider layout="vertical" /> */}
      <Button
        text
        className="refresh-btn"
        data-testid="owner-grid-refresh-btn"
        icon={() => {
          return <Img name="refresh"></Img>;
        }}
        onClick={refreshData}
      />
    </div>
  );

  const moveCaseTrigger = (stepId) => {
    // processFlow({
    //     params: params["case-id"]
    //     , data: { }
    //   }).unwrap().then(()=>{
        
    //   })
   return moveCase({ params: params["case-id"], stepId });
  }

  return (
    <div>
      <form
        className="common-form d-flex flex-column gap-5"
        onSubmit={formik.handleSubmit}
      >
        <div className="form-section">
          <div
            className="d-flex align-items-center
                 justify-content-between form-sec-header"
          >
            <div className="topic">
              <Img name="search"></Img> Medallion Owner
            </div>
          </div>
          <div className="form-body d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center flex-wrap form-grid-1 w-75">
              <div className="w-100-3 ">
                <BInputText variable={variable.field_01} formik={formik}></BInputText>
              </div>
              <div className="w-100-3">
                <BInputText variable={variable.field_02} formik={formik}></BInputText>
              </div>
              <div className="w-100-3">
                <BInputText variable={variable.field_03} formik={formik}></BInputText>
              </div>
            </div>
            <Button
              label="Search"
              type="submit"
              severity="warning"
              data-testid="search-medallion-btn"
              className="border-radius-0 primary-btn"
            />
            <Button
              text
              type="button"
              data-testid="search-medallion-cancel-btn"
              icon={() => {
                return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.0094 0C18.6375 0 24.0188 5.4 24.0094 12.0281C23.9906 18.6375 18.6 24 12 24C5.37189 24 -0.00936277 18.6 1.2231e-05 11.9719C0.00938723 5.37187 5.40001 0 12.0094 0ZM11.9813 22.7812C17.9344 22.7906 22.7813 17.9531 22.7813 12.0094C22.7813 6.075 17.9625 1.2375 12.0469 1.21875C6.08439 1.2 1.22814 6.02812 1.21876 11.9719C1.20939 17.925 6.03751 22.7719 11.9813 22.7812Z" fill="black" />
                  <path d="M12.0001 11.0999C13.1064 9.99365 14.1751 8.91553 15.2439 7.84678C15.347 7.74365 15.4408 7.64053 15.5439 7.55615C15.8158 7.3499 16.1064 7.34053 16.3501 7.58428C16.5939 7.82803 16.5751 8.11865 16.3783 8.39053C16.2845 8.5124 16.1626 8.61553 16.0595 8.72803C15.0001 9.7874 13.9408 10.8468 12.8251 11.953C13.1626 12.2812 13.4908 12.5905 13.8001 12.8999C14.6064 13.6968 15.422 14.503 16.2283 15.3093C16.5564 15.6374 16.6033 16.003 16.3689 16.2562C16.1251 16.5187 15.722 16.4812 15.3845 16.153C14.2689 15.0374 13.1626 13.9218 12.0095 12.7687C11.8689 12.8999 11.7376 13.0124 11.6251 13.1249C10.6408 14.1093 9.65638 15.0937 8.68138 16.0687C8.28763 16.4624 7.89388 16.5374 7.63138 16.2562C7.36888 15.9843 7.44388 15.6093 7.85638 15.2062C7.96888 15.0937 8.08138 14.9905 8.1845 14.878C9.15013 13.8937 10.1064 12.9187 11.147 11.8593C10.8751 11.6062 10.5658 11.3343 10.2658 11.0437C9.44075 10.228 8.62513 9.4124 7.8095 8.59678C7.4345 8.22178 7.36888 7.84678 7.63138 7.5749C7.90325 7.29365 8.2595 7.3499 8.64388 7.73428C9.75013 8.8499 10.8564 9.95615 12.0001 11.0999Z" fill="black" />
                </svg>
              }}
              onClick={() => { formik.resetForm(); formReset() }}
            />
          </div>
        </div>
      </form>
      <DataTable
        value={data?.medallion_owner_page_records}
        className="primary-table"
        selectionMode={"checkbox"}
        header={header}
        selection={selectedProducts}
        showGridlines={true}
        onSelectionChange={(e) => setSelectedProducts(e.value)}
        dataKey="medallion_owner_id"
        tableStyle={{ minWidth: "50rem" }}
        emptyMessage={() => <div className="d-flex justify-content-center flex-column mx-auto" style={{ width: "max-content" }}>
          <p className=" d-flex align-items-center justify-content-center p-4 mb-4 gap-2"><Img name="no-result"></Img>No Results Found</p>
          {/* <p className="border-bottom d-flex align-items-center justify-content-center p-4 mb-4 gap-2"><Img name="no-result"></Img>No Results Found</p> */}
          {<div className="d-flex align-items-center justify-content-center gap-3">
        <Button label="Create Individual Owner" icon={()=><Img name="add"></Img>}
         className="text-nowrap w-max-content d-flex align-items-center gap-2"
         onClick={()=>moveCaseTrigger(CREATE_INDIVIDUAL_OWNER)}></Button>
        <Button text label="Create Entity" icon={()=><Img name="add"></Img>}
         className="border  border-warning d-flex align-items-center gap-2"
         onClick={()=>moveCaseTrigger(`create-entity`)}></Button>
      </div>}
        </div>}
      >
        {/* <Column
          selectionMode="multiple"
          headerStyle={{ width: "3rem" }}
        ></Column> */}
        <Column field="managementName" header="" body={type}></Column>
        <Column field="entity_name" header="Management Name"></Column>
        <Column field="identifier" header="SSN/EIN"></Column>
        <Column field="owner_name" header="Owner Name"></Column>
        <Column field="contact_number" header="Contact" body={contact}></Column>
        <Column field="status" header="Status" body={deleteTemplete}></Column>
      </DataTable>

      <Paginator first={first} rows={rows}
        totalRecords={data?.total_medallion_owner_records}
        rowsPerPageOptions={[5, 10, 20]} onPageChange={onPageChange} />
    </div>
  );
};

export default ChooseMedallion;
