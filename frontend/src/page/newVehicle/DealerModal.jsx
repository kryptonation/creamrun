import { Button } from "primereact/button";
import { dealerDetail as variable } from "../../utils/variables";
import { useFormik } from "formik";
import BInputText from "../../components/BInputText";
import { useCreateDealerMutation } from "../../redux/api/dealerApi";

const DealerModal = ({ onClose }) => {
  const [createDealer, { data, isSuccess }] = useCreateDealerMutation();
  const formik = useFormik({
    initialValues: {
      [variable?.[0].id]: "",
      // [variable?.[1].id]: "",
      // [variable?.[2].id]: "",
    },
    validateOnChange: true,
    validateOnMount: true,
    validate: (values) => {
      const errors = {};
      if (!values[variable[0].id]) {
        errors[variable[0].id] = `${variable[0].label} is required`;
      }
      // if (!values[variable[1].id]) {
      //   errors[variable[1].id] = `${variable[1].label} is required`;
      // }
      // if (!values[variable[2].id]) {
      //   errors[variable[2].id] = `${variable[2].label} is required`;
      // }

      return errors;
    },
    onSubmit: (values) => {
      createDealer(values)
        .unwrap()
        .then((newlyCreatedDealer) => {
          // THIS IS THE FIX:
          // Call 'onClose' with the data from the successful API call.
          onClose(newlyCreatedDealer);
        })
        .catch((error) => {
          console.error("Failed to create dealer:", error);
          // Also call onClose without data if there's an error
          onClose();
        });
    },
  });
  return (
    <div className="common-form">
      <form
        className="d-flex align-items-center flex-wrap p-3"
        style={{ rowGap: "4rem", gap: "4rem 1rem" }}
        onSubmit={formik.handleSubmit}
      >
        {variable.map((item, idx) => (
          <div key={idx}>
            <BInputText variable={item} formik={formik} />
          </div>
        ))}
        <div className="w-100 position-sticky bottom-0 bg-white">
          <Button
            disabled={!formik.isValid}
            data-testid="submit-dealer-details"
            label="Submit Vehicle Details"
            type="submit"
            severity="warning"
            className="border-radius-0 primary-btn "
          />
        </div>
      </form>
    </div>
  );
};

export default DealerModal;
