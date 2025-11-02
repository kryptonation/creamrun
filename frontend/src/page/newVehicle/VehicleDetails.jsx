import { Button } from "primereact/button";
import Img from "../../components/Img";
import { useFormik } from "formik";
import {
  vehicleDetail1 as variable1,
  vehicleDetail2
} from "../../utils/variables";
import {
  useGetStepInfoQuery,
  useMoveCaseDetailMutation,
  useProcessCaseDeatilMutation,
} from "../../redux/api/medallionApi";
import { useEffect, useState } from "react";
import { getCurrentStep } from "../../utils/caseUtils";
import BInputFields from "../../components/BInputFileds";
import {
  useLazyGetDealerApiQuery,
  useLazyGetVinDetailQuery,
} from "../../redux/api/vehicleApi";
import { FloatLabel } from "primereact/floatlabel";
import { InputText } from "primereact/inputtext";
import BInputNumber from "../../components/BInputNumber";
import DealerModal from "./DealerModal";
import BCaseCard from "../../components/BCaseCard";
import BSelectWithSearchandAdd from "../../components/BSelectWithSearchandAdd";
import { yearMonthDate } from "../../utils/dateConverter";
import { InputNumber } from "primereact/inputnumber";
import PdfViewModal from "../../components/PdfViewModal";
import { removeUnderScore } from "../../utils/utils";

const VehicleDetails = ({
  caseId,
  caseData,
  currentStep,
  currentStepId,
  hasAccess,
  reload,
}) => {
  console.log(currentStep);
  const [value, setValue] = useState(variable1);
  const [processFlow, { isSuccess: isProccessDataSuccess }] =
    useProcessCaseDeatilMutation();
  const [moveCase] = useMoveCaseDetailMutation();
  const {
    data: stepInfoData,
    refetch,
    isSuccess,
  } = useGetStepInfoQuery(
    { caseNo: caseId, step_no: currentStepId },
    { skip: !currentStepId || !caseId }
  );
  const [triggerGetDealer, { data: dealerData, isFetching }] =
    useLazyGetDealerApiQuery();

  const formik = useFormik({
    initialValues: {
      [variable1?.[0].id]: "",
      [variable1?.[1].id]: "",
      [variable1?.[2].id]: "",
      [variable1?.[3].id]: "",
      [variable1?.[4].id]: "",
      [variable1?.[5].id]: "",
      [variable1?.[4].id]: "",
      [variable1?.[5].id]: "",
      [variable1?.[6].id]: "",
      // [variable1?.[7].id]: "",
      [variable1?.[7].id]: "",
      [variable1?.[8].id]: "",
      base_price: 0.00,
      sales_tax: 0.00,
      vehicle_total_price: 0,
      vehicle_hack_up_cost: 0,
      vehicle_true_cost: 0,
      vehicle_lifetime_cap: 0,
    },
    validateOnChange: true,
    validateOnBlur: true,
    validateOnMount: true,
    validate: (values) => {
      const errors = {};
      const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/; // Excludes I, O, Q
      if (!values[variable1[0].id]) {
        errors[variable1[0].id] = `${variable1[0].label} is required`;
      }
      if (values[variable1[0].id] && !vinRegex.test(values[variable1[0].id])) {
        errors[
          variable1[0].id
        ] = `${variable1[0].label} must be exactly 17 alphanumeric characters (letters and numbers, excluding I, O, Q)`;
      }
      if (!values[variable1[1].id]) {
        errors[variable1[1].id] = `${variable1[1].label} is required`;
      }
      if (!values[variable1[2].id]) {
        errors[variable1[2].id] = `${variable1[2].label} is required`;
      }
      if (!values[variable1[3].id]) {
        errors[variable1[3].id] = `${variable1[3].label} is required`;
      }
      if (!values[variable1[4].id]) {
        errors[variable1[4].id] = `${variable1[4].label} is required`;
      }
      if (!values[variable1[5].id]) {
        errors[variable1[5].id] = `${variable1[5].label} is required`;
      }
      if (
        !values[variable1[6].id] ||
        values[variable1[6].id].toString().trim() === ""
      ) {
        errors[variable1[6].id] = `${variable1[6].label} is required`;
      } else {
        const numberPattern = /^\d+$/;
        if (!numberPattern.test(values[variable1[6].id].toString().trim())) {
          errors[variable1[6].id] = `${variable1[6].label} must be a number`;
        }
      }

      // if (!values[variable1[7].id]) {
      //   errors[variable1[7].id] = `${variable1[7].label} is required`;
      // }
      if (!values[variable1[7].id]) {
        errors[variable1[7].id] = `${variable1[8].label} is required`;
      }
      // Check if field is empty
      if (!values[variable1[8].id]) {
        errors[variable1[8].id] = `${variable1[8].label} is required`;
      }

      const nonNeg = (v) => {
        if (v === "" || v === null || v === undefined) return false;
        const n = Number(String(v).replace(/[,\s]/g, ""));
        return Number.isFinite(n) && n >= 0;
      };

      if (!nonNeg(values.base_price)) errors.base_price = "Base Cost is required and must be ≥ 0";
      if (!nonNeg(values.sales_tax)) errors.sales_tax = "Sales Tax is required and must be ≥ 0";

      if (values.base_price === "" || values.base_price === null || values.base_price === undefined || values.base_price <= 0) {
        errors.base_price = "Base Cost is required";
      } else if (!nonNeg(values.base_price)) {
        errors.base_price = "Base Cost cannot be negative";
      }

      // if (values.sales_tax === "" || values.sales_tax === null || values.sales_tax === undefined || values.sales_tax <= 0) {
      //   errors.sales_tax = "Sales Tax is required";
      // } else
      if (!nonNeg(values.sales_tax)) {
        errors.sales_tax = "Sales Tax cannot be negative";
      }

      if (values.invoice_date === "" || values.invoice_date === null || values.invoice_date === undefined) {
        errors.invoice_date = "Invoice Date is required";
      }

      if (values.invoice_number === "" || values.invoice_number === null || values.invoice_number === undefined) {
        errors.invoice_number = "Invoice Number is required";
      }

      console.log("Errors", errors);
      return errors;
    },
    onSubmit: (values) => {


      values = { ...values, medallionType: values?.medallionType?.code };
      console.log(values);
      const data = {
        ...values,
        vehicle_type: values?.vehicle_type?.code,
        year: new Date(values?.year).getFullYear(),
        cylinders: values?.cylinders + "",
        // configuration_type: values?.configuration_type?.code,
        tsp: values?.tpep_provider?.code,
        dealer_id: Number(values?.dealer_name?.code),
        // dealer_id: 1,
        dealer_name: values?.dealer_name?.name,
        security_type: values?.configuration_type?.code,
        total_cost: values?.sales_total,
        invoice_date: yearMonthDate(values.invoice_date),
        color: ""
      };
      delete data["dealer_name"];
      delete data["configuration_type"];
      delete data["tpep_provider"];
      delete data["sales_total"];
      // delete data["vehicle_hack_up_cost"];
      // delete data["vehicle_lifetime_cap"];
      // delete data["vehicle_true_cost"];

      // delete data["total_cost"];

      console.log("Payload", data);
      console.log("hasAccess: ", hasAccess)
      if (hasAccess) {
        processFlow({
          params: caseId,
          data: {
            step_id: currentStepId,
            data,
          },
        });
      }
    },
  });


  useEffect(() => {
    formik.setFieldValue("vehicle_total_price", (formik.values.base_price + formik.values.sales_tax), true);
  }, [
    formik.values.base_price,
    formik.values.sales_tax,
  ]);



  useEffect(() => {

    if (
      isProccessDataSuccess &&
      caseData &&
      caseData.case_info.case_status !== "Closed" &&
      getCurrentStep(caseData.steps).step_id === currentStepId
    ) {
      moveCase({ params: caseId })
        .unwrap()
        .then(() => {
          reload();
        });
    }

  }, [isProccessDataSuccess]);

  useEffect(() => {
    if (currentStep) {
      const vehicle = currentStep?.vehicle;
      formik.setFieldValue(
        [variable1?.[0].id],
        vehicle?.[variable1?.[0].id] || "",
        false
      );

      const tspOptions = variable1?.[1]?.options?.find(
        (opt) => opt.name === vehicle?.tsp
      );

      formik.setFieldValue("tpep_provider", tspOptions || { name: "CURB", code: "CURB" }, false);

      const securityTypeOptions = variable1?.[2]?.options?.find(
        (opt) => opt.name === vehicle?.security_type
      );
      formik.setFieldValue(
        "configuration_type",
        securityTypeOptions || null,
        false
      );
      formik.setFieldValue(
        [variable1?.[3].id],
        vehicle?.[variable1?.[3].id] || "",
        false
      );
      formik.setFieldValue(
        [variable1?.[4].id],
        vehicle?.[variable1?.[4].id] || "",
        false
      );
      formik.setFieldValue(
        [variable1?.[5].id],
        vehicle?.[variable1?.[5].id]
          ? new Date(vehicle?.[variable1?.[5].id])
          : "",
        false
      );
      formik.setFieldValue([variable1?.[6].id], vehicle?.cylinders || "", false);
      // formik.setFieldValue(
      //   [variable1?.[7].id],
      //   vehicle?.[variable1?.[7].id] || "",
      //   true
      // );
      const fin = currentStep.vehicle_financials || currentStep.vehicle || {};
      const numOrNull = (v) => (v === null || v === undefined || v === "" ? null : Number(v));
      formik.setFieldValue("base_price", numOrNull(fin.base_price), false);
      formik.setFieldValue("sales_tax", numOrNull(fin.sales_tax), false);
      formik.setFieldValue("invoice_number", (fin.invoice_number), false);
      formik.setFieldValue("invoice_date", fin.invoice_date ? new Date(fin.invoice_date) : "", false);

      const vehicleTypeOptions = variable1?.[7]?.options?.find(
        (opt) => opt.code === vehicle?.vehicle_type?.replace("Wav", "WAV")
      );
      formik.setFieldValue(
        "vehicle_type",
        vehicleTypeOptions || null,
        false
      );

      if (dealerData && dealerData?.items) {
        // const options = dealerData.items
        //   .filter((item) => !!item.dealer_name)
        //   .map((item) => ({
        //     name: item.dealer_name,
        //     code: item.dealer_id,
        //   }));

        const selectedDealer = dealerData?.items?.find((item) => item.dealer_id === currentStep?.dealer?.dealer_id);
        if (selectedDealer) {
          const option = {
            name: selectedDealer.dealer_name,
            code: selectedDealer.dealer_id,
          }
          formik.setFieldValue(
            "dealer_name",
            option || null,
            false
          );
        }

      }
    }
  }, [currentStep, dealerData]);

  const [getVinNumber, { data, isSuccess: isGetVinDataSuccess }] =
    useLazyGetVinDetailQuery();

  useEffect(() => {
    if (isGetVinDataSuccess) {
      formik.setFieldValue(
        [variable1?.[3].id],
        data?.Make || "",
        true
      );
      formik.setFieldValue(
        [variable1?.[4].id],
        data?.Model || "",
        true
      );
      formik.setFieldValue(
        [variable1?.[5].id],
        data?.ModelYear ? new Date(data?.ModelYear) : "",
        true
      );
      formik.setFieldValue(
        "cylinders",
        data?.EngineCylinders || "",
        true
      );

    }
  }, [isGetVinDataSuccess]);

  const vinBlurFunc = (e) => {
    formik.handleBlur(e);
  };
  const vinkeyUpFunc = (e) => {
    let code = e.keyCode ? e.keyCode : e.which;
    if (code === 13) {
      e.preventDefault();
      getVinNumber(e?.target?.value);
    }
  };





  const [dealerNameOptions, setDealerNameOptions] = useState([]);
  useEffect(() => {
    // Call API when page loads
    triggerGetDealer();
  }, [triggerGetDealer]);

  useEffect(() => {
    const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/; // Excludes I, O, Q

    console.log("formik?.values?.vin : ", formik?.values?.vin)
    if (formik?.values?.vin && vinRegex.test(formik?.values?.vin)) {
      getVinNumber(formik?.values?.vin);
    }

  }, [formik?.values?.vin]);

  useEffect(() => {

    if (dealerData?.items) {
      const options = dealerData.items
        .filter((item) => !!item.dealer_name)
        .map((item) => ({
          name: item.dealer_name,
          code: item.dealer_id,
        }));
      setDealerNameOptions(options);
    }
  }, [dealerData]);



  const handleDealerAdded = (newDealer) => {
    console.log("New Dealer has been added:", newDealer);
    if (newDealer) {
      // You can now implement the logic to update the dropdown and set the value
      const newDealerOption = {
        name: newDealer.dealer_name,
        code: newDealer.dealer_id,
      };
      setDealerNameOptions((prevOptions) => [...prevOptions, newDealerOption]);
      formik.setFieldValue("dealer_name", newDealerOption?.name);

      // Specifically refetch the dealer list
      triggerGetDealer();
    }
  };

  const parts = currentStep?.invoice_document?.document_name?.split(".");
  const extension = parts?.pop();
  const filename = parts?.join(".");
  const img = extension === "pdf" ? "pdf" : "img";

  return (
    <form
      action=""
      className="common-form d-flex flex-column gap-5"
      onSubmit={formik.handleSubmit}
    >
      <div className="form-section">
        <div className="d-flex align-items-center justify-content-between form-sec-header">
          <div className="topic">
            <Img name="car"></Img> Vehicle Details
          </div>

        </div>
        <div className="form-body">
          <div className="mb-4 d-flex gap-5">
            <BCaseCard
              label="Entity Name"
              value={currentStep?.vehicle?.entity_name}
            />

            <div className="w-100 d-flex justify-content-end">
              <div className="d-flex align-items-center gap-1 ms-3">
                {currentStep?.invoice_document?.presigned_url &&
                  <PdfViewModal
                    triggerButton={
                      <Button
                        pt={{ root: { "data-testid": `eye-icon-ss4` } }}
                        icon={<Img name="black_ic_eye" />}
                        className="p-button-text p-0"
                        type="button"
                      />
                    }
                    title={removeUnderScore(currentStep?.invoice_document?.presigned_url?.document_type).replace(
                      /\b\w/g,
                      (char) => char.toUpperCase()
                    )}
                    downloadUrl={currentStep?.invoice_document?.presigned_url}
                    downloadName={filename}
                    extension={extension}
                    previewUrl={currentStep?.invoice_document?.presigned_url}
                  />
                }

                {/* Label with required asterisk positioned next to the icon */}
                <div className="ms-2">
                  <span className="regular-text fs-6">Invoice Document</span>
                </div>
              </div>

            </div>
          </div>


          <div
            className="d-flex align-items-center flex-wrap form-grid-1"
            style={{ rowGap: "4rem", gap: "4rem 1rem" }}
          >
            {value.map((item, idx) => {
              if (item.id === "vin") {
                return (
                  <div
                    key={idx}
                    style={{
                      ...(item.size === "xl" && { width: "100%" }),
                    }}
                  >
                    <div
                      key={idx}
                      className={`w-300 position-relative ${formik.touched[item.id] && formik.errors[item.id]
                        ? "text-danger-con"
                        : ""
                        }`}
                      style={{ marginBottom: "30px" }}
                    >
                      <FloatLabel>
                        <InputText
                          id={item.id}
                          // disabled={isDisable}
                          onChange={(e) => {
                            formik.handleChange(e)
                          }}
                          onBlur={vinBlurFunc}
                          value={formik.values[item.id]}
                          keyfilter={item.keyfilter}
                          className={`rounded-0 border-0 ps-0 bg-transparent text-field w-100`}
                        />
                        <label htmlFor={item.id}>
                          {item.label}{" "}
                          {item.isRequire && (
                            <span className="require-star">*</span>
                          )}
                        </label>
                      </FloatLabel>
                      {formik.touched[item.id] && formik.errors[item.id] ? (
                        <div className="error-msg">
                          {formik.errors[item.id]}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              }
              if (item.id === "dealer_name") {
                return (
                  // <BAutoComplete
                  //   key={idx}
                  //   variable={item}
                  //   formik={formik}
                  //   handleSearch={(query) => {
                  //     searchData(item, query);
                  //   }}
                  // ></BAutoComplete>
                  <div
                    key={idx}
                    style={{
                      ...(item.size === "xl" && { width: "100%" }),
                      marginBottom: "30px",
                      width: 300
                    }}
                  >
                    <BSelectWithSearchandAdd
                      key={idx}
                      variable={{
                        id: "dealer_name",
                        label: "Select Dealer",
                        options: dealerNameOptions,
                        isRequire: true,
                      }}
                      formik={formik}
                      showAddDealer={true} // Enable the Add Dealer functionality
                      DealerModal={DealerModal} // Pass your DealerModal component
                      onDealerAdded={handleDealerAdded} // Handle when a dealer is added
                    ></BSelectWithSearchandAdd>
                  </div>
                );
              }
              if (item.id === "cylinders") {
                return (
                  <div
                    key={idx}
                    style={{
                      ...(item.size === "xl" && { width: "100%" }),
                      marginBottom: "30px",
                    }}
                  >
                    <BInputNumber
                      key={idx}
                      variable={item}
                      formik={formik}
                    ></BInputNumber>
                  </div>
                );
              }
              return (
                <div
                  key={idx}
                  style={{
                    ...(item.size === "xl" && { width: "100%" }),
                    marginBottom: "30px",
                    gap: 10,
                    width: 300
                  }}
                >
                  <BInputFields variable={item} formik={formik} />
                </div>
              );
            })}


          </div>
        </div>
      </div>
      <div className="form-section">
        <div className="d-flex align-items-center justify-content-between form-sec-header">
          <div className="topic">
            <Img name="bank"></Img> Vehicle Financial Info
          </div>
        </div>
        <div className="form-body">
          <div
            className="form-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, auto)",
              justifyContent: "start",
              columnGap: "6rem",
              rowGap: "1rem",
            }}
          >
            {vehicleDetail2.map((item, idx) => {
              return (
                <div key={idx} style={{ marginBottom: "30px" }}>
                  {idx > 1 ? (<BInputNumber
                    variable={item}
                    formik={formik}
                    isCurrency={true}
                  />) : (
                    <BInputFields
                      variable={item}
                      formik={formik}
                      isCurrency={true}
                    />
                  )
                  }

                </div>
              );
            })}
            {/* <div key={"Total"} style={{ marginBottom: "30px" }}> */}
            {/* <BCaseCard
                label="Total Cost"
                value={`$${(
                  (formik?.values?.base_price || 0) + (formik?.values?.sales_tax || 0)
                ).toFixed(2)}`} /> */}

            {/* <BInputNumber
                variable={item}
                formik={formik}
                isCurrency={true}
              /> */}


            <div style={{ marginTop: -12 }}>
              <p className="text-grey mb-0 regular-text">{"Total"}</p>
              <InputNumber
                inputId={"trueId"}
                id={"trueId"}
                disabled={true}
                value={(formik?.values?.base_price || 0) + (formik?.values?.sales_tax || 0)}
                mode="currency"
                currency="USD"
                locale="en-US"
                minFractionDigits={2}
                maxFractionDigits={10}
                inputStyle={{ textAlign: "left", fontWeight: "bold" }}
                style={{ height: 40, width: 150, textAlign: "left" }}
              />
            </div>

            {/* </div> */}
          </div>
        </div>
      </div>

      <div className="w-100 position-sticky bottom-0 py-3 bg-white">
        <Button
          disabled={!hasAccess || !formik.isValid || !(caseData &&
            caseData.case_info.case_status !== "Closed")}
          data-testid="submit-vehicle-details"
          label="Submit Vehicle Details"
          type="submit"
          severity="warning"
          className="border-radius-0 primary-btn "
        />
      </div>
    </form>
  );
};

export default VehicleDetails;
