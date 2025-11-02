import React from 'react'
import PDFViewRender from '../../newLease/PDFViewRender'

const ViewDriverSubmitReceipt = () => {
    const data = [{
        document_format: "PDF",
        presigned_url: "https://big-apple-data-bucket.s3.amazonaws.com//document_uploads/PVB/pvb_id/PVB/4de6872f-d985-4951-8e4b-31b2d360a019.pdf?AWSAccessKeyId=AKIA3KHNNUWN75RTF6P7&Signature=OT0M%2BSIjuPrm079BzJ5tUe5SlkI%3D&Expires=1744373164",
        "document_name": "4de6872f-d985-4951-8e4b-31b2d360a019.pdf",
    }, {
        document_format: "PDF",
        presigned_url: "https://big-apple-data-bucket.s3.amazonaws.com//document_uploads/PVB/pvb_id/PVB/4de6872f-d985-4951-8e4b-31b2d360a019.pdf?AWSAccessKeyId=AKIA3KHNNUWN75RTF6P7&Signature=OT0M%2BSIjuPrm079BzJ5tUe5SlkI%3D&Expires=1744373164",
        "document_name": "4de6872f-d985-4951-8e4b-31b2d360a019.pdf",
    },]
    return (
        <div className='d-flex gap-4'>
            {
                data?.map((item, idx) => {
                    console.log(" return ~ data:", item)
                    return <PDFViewRender key={idx} item={item} />
                })
            }
        </div>
    )
}

export default ViewDriverSubmitReceipt