import { useEffect } from "react";
import Img from "../../components/Img";
import { useCreateRecipientViewMutation, useEnvelopeStatusAndDeatilQuery } from "../../redux/api/esignApi"
import { Button } from "primereact/button";

const EnvelopeLink = ({ id, rowData }) => {
   // const { data, isSuccess } = useCreateRecipientViewMutation(id, { skip: !id });
   // const {data,isSuccess}=useEnvelopeStatusAndDeatilQuery("8e15e2e2-f06c-4a3a-afa6-266a0f679155");
   // console.log(data?.signers[0]?.signing_url, isSuccess);

   const [createRecipientView, { data, isLoading, error }] =
      useCreateRecipientViewMutation();

   const generateRecipientView = async (rowData) => {
      if (!rowData?.document_envelope_id) return;

      try {
         const payload = {
            envelope_id: rowData.document_envelope_id,
            user_name: rowData.driver_name,
            email: rowData.driver_email,
            client_user_id: rowData.driver_email,
            return_url: "http://127.0.0.1:3000/new-lease/DRVLEA000006"
         };

         createRecipientView(payload)
         // console.log("Recipient View URL:", response.url);
         // window.open(response.url, "_blank");
      } catch (err) {
         console.error("Error creating recipient view:", err);
      }
   };

   // useEffect(() => {
   //    generateRecipientView(rowData);
   // }, [rowData]);



   const activeIndaction = (rowData, isLease) => {
      console.log("data : ", rowData)
      console.log("data1 : ", isLease)

      if (rowData.document_envelope_id) {
         if (isLease && rowData.has_driver_signed) {
            return (
               <Img name="ic_step_success" className="text-white success-icon"></Img>
            );
         } else if (!isLease && rowData.has_front_desk_signed) {
            return (
               <Img name="ic_step_success" className="text-white success-icon"></Img>
            );
         }

         // else if (isLease) {
         //    return (
         //       data?.url ?
         //          <>
         //             <a href={data.url} target="_blank" rel="noreferrer">
         //                <Img name="ic_lease_sign" className="sm-icon-sign2"></Img>
         //             </a>
         //          </>
         //          :
         //          <>
         //             <Button
         //                label={
         //                   "Get E-Sign URL"
         //                }
         //                type="submit"
         //                onClick={() => {
         //                   generateRecipientView(rowData)
         //                }}
         //                severity="secondary"
         //                className="border-radius-0 primary-btn "
         //             />
         //          </>
         //    );
         // } else if (!isLease) {
         //    return (
         //       data?.url ?
         //          <>
         //             <a href={data.url} target="_blank" rel="noreferrer">
         //                <Img name="ic_batm_sign" className="sm-icon-sign"></Img>
         //             </a>
         //          </>
         //          :
         //          <>

         //          </>
         //    );
         // }
      }

      return "-";
   };



   // if(isSuccess){
   return (
      <div className="d-flex align-items-center gap-3">
         {/* <a href={data?.signers[0]?.signing_url} target="_blank" rel="noreferrer">BAT e-sign Link</a>
         <a href={data?.signers[1]?.signing_url} target="_blank" rel="noreferrer">Driver e-sign Link</a> */}
         <div>
            {activeIndaction(rowData, false)}
         </div>
         <div>
            {activeIndaction(rowData, true)}
         </div>
         {/* <a href={data?.signers[0]?.signing_url} target="_blank" rel="noreferrer"><Img name="black_ic_eye" /></a>
         <a href={data?.signers[1]?.signing_url} target="_blank" rel="noreferrer"><Img name="black_ic_eye" /></a> */}

      </div>
   )

   // }
   // return <a className="text-black">Link</a>
   // return <Img name="ic_failed" className="icon_"></Img>;
}

export default EnvelopeLink