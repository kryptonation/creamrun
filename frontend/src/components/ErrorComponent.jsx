import { Button } from "primereact/button"
import { useNavigate } from "react-router-dom"

const ErrorComponent = ({error}) => {
    const navigate = useNavigate()

  return (
    <div className="cooming-soon-con h-100 w-100 flex-grow-1 d-flex flex-column align-items-center justify-content-center">
        <div className="w-50 flex-grow-1 d-flex flex-column align-items-center justify-content-center">
        <p className="fs-primary text-big">Error! Something went wrong</p>
        <p className="fs-secondary text-center" data-testId="error-bound-message">{error}</p>
        <Button
          type="button" 
          data-testId="reload-btn"
          className="primary-btn mt-4"
          onClick={()=>navigate(0)}
          label="Reload"
        ></Button>
        </div>
    </div>
  )
}

export default ErrorComponent