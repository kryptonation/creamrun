import { NavLink } from 'react-router-dom'

const NotFound = () => {
    return (
        <div className="cooming-soon-con w-100 h-100  d-flex align-items-center justify-content-center">
            <div className=" d-flex align-items-center justify-content-center flex-column mb-5 pb-5">
                <p className="text-yellow text-big">Oops</p>
                <p className="d-flex align-items-center gap-2 ">
                   <span className="topic-txt ">404 </span><span className='topic-txt'> - </span><span className="topic-txt">Page not  Found</span>
                </p>
                <p className="d-flex align-items-center gap-2">The page you are looking for is not here</p>
                <NavLink to="/" className="py-2 text-black fw-bold mt-3">Back To Home</NavLink>
            </div>
        </div>
    )
}

export default NotFound