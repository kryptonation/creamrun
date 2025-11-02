import { NavLink } from "react-router-dom"

const ComingSoon = () => {
  return (
    <div className="cooming-soon-con w-100 h-100  d-flex align-items-center justify-content-center">
      <div className=" d-flex align-items-center justify-content-center
     flex-column mb-5 pb-5">
        <p className="d-flex align-items-center gap-2 ">
          <span className="text-yellow text-big">Coming</span><span className="text-big">Soon</span></p>
        <p className="d-flex align-items-center gap-2">To make things right we need some time to build</p>
        <NavLink to="/" className="py-2 text-black fw-bold mt-3">Back To Home</NavLink>
      </div>
    </div>
  )
}

export default ComingSoon