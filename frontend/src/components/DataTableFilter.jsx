import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Checkbox } from "primereact/checkbox";
import { FloatLabel } from "primereact/floatlabel";
import { InputText } from "primereact/inputtext";
import { RadioButton } from "primereact/radiobutton";
import { useEffect, useState } from "react";
import Img from "./Img";

const DataTableFilter = ({
  data,
  id,
  label,
  formatType,
  filterData,
  onValueChange,
  onFilterChange,
  clearAllFilter = () => {},
  clearFilter = () => {},
}) => {
  console.log("🚀 ~ DataTableFilter ~ data:", data);

  const [value, setValue] = useState(null);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");

  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedValue, setSelectedValue] = useState("");

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleCalendarFocus = () => {
    setIsCalendarOpen(true);
  };

  const handleCalendarBlur = () => {
    setIsCalendarOpen(false);
  };

  const handleRadioChange = (value) => {
    setSelectedValue(value);
  };

  const handleInputChange = (e) => {
    const query = e.target.value;
    setValue(query);
    onValueChange(query);
  };

  const handleCheckboxChange = (item) => {
    setSelectedItems((prevSelected) =>
      prevSelected.includes(item)
        ? prevSelected.filter((selected) => selected !== item)
        : [...prevSelected, item]
    );
  };
  const handleFromAmountChange = (e) => {
    setFromAmount(e.target.value);
    // const amountData = { from: e.target.value, to: toAmount };
    // onValueChange && onValueChange(amountData);
  };

  const handleToAmountChange = (e) => {
    setToAmount(e.target.value);
    // const amountData = { from: fromAmount, to: e.target.value };
    // onValueChange && onValueChange(amountData);
  };

  const renderContent = () => {
    if (formatType === "date") {
      return (
        <>
          <InputText
            style={{ width: 0, height: 0, border: "none" }}
            value={value}
            onChange={handleInputChange}
            className="p-inputtext-sm"
            placeholder={`Search ${label}`}
          />
          <div className="row g-3">
            <div className="col-6 py-3">
              <FloatLabel>
                <Calendar
                  autoFocus={false} // Ensure autoFocus is not set
                  value={fromDate}
                  data-testid="fromDate"
                  onChange={(e) => setFromDate(e.value)}
                  className="rounded-0 border-0 ps-2 pe-2 bg-transparent calendar-field w-100"
                  showIcon
                  showButtonBar
                  readOnlyInput
                  onFocus={handleCalendarFocus}
                  onBlur={handleCalendarBlur}
                  visible={isCalendarOpen}
                  icon={() => (
                    <span data-testid={`from-cal-icon`}>
                      <Img name="calendar" />
                    </span>
                  )}
                />
                <label htmlFor={"fromDate"}>From Date</label>
              </FloatLabel>
            </div>
            <div className="col-6 py-3">
              <FloatLabel>
                <Calendar
                  autoFocus={false} // Ensure autoFocus is not set
                  value={toDate}
                  data-testid="toDate"
                  onChange={(e) => setToDate(e.value)}
                  className="rounded-0 border-0 ps-2 pe-2 bg-transparent calendar-field w-100"
                  showIcon
                  showButtonBar
                  readOnlyInput
                  onFocus={handleCalendarFocus}
                  onBlur={handleCalendarBlur}
                  visible={isCalendarOpen}
                  icon={() => (
                    <span data-testid={`to-cal-icon`}>
                      <Img name="calendar" />
                    </span>
                  )}
                />
                <label htmlFor={"toDate"}>To Date</label>
              </FloatLabel>
            </div>
          </div>
          <Button
            type="button"
            data-testid="applyFilter"
            label="Apply Filter"
            icon="pi pi-check"
            className="d-flex mx-auto mt-4"
            onClick={(e) =>
              onFilterChange({ fromDate: fromDate, toDate: toDate }, e)
            }
            severity="success"
            disabled={!fromDate || !toDate}
          />
        </>
      );
    } else if (formatType === "time") {
      return (
        <>
          <InputText
            style={{ width: 0, height: 0, border: "none" }}
            value={value}
            onChange={handleInputChange}
            className="p-inputtext-sm"
            placeholder={`Search ${label}`}
          />
          <div className="row g-3">
            <div className="col-6 py-3">
              <FloatLabel>
                <Calendar
                  autoFocus={false} // Ensure autoFocus is not set
                  value={fromDate}
                  data-testid="fromTime"
                  onChange={(e) => setFromDate(e.value)}
                  className="rounded-0 border-0 ps-2 pe-2 bg-transparent calendar-field w-100"
                  showIcon
                  showTime
                  timeOnly
                  readOnlyInput
                  onFocus={handleCalendarFocus}
                  onBlur={handleCalendarBlur}
                  visible={isCalendarOpen}
                  icon={() => <i className="pi pi-calendar"></i>}
                />
                <label htmlFor={"fromTime"}>From Time</label>
              </FloatLabel>
            </div>
            <div className="col-6 py-3">
              <FloatLabel>
                <Calendar
                  autoFocus={false} // Ensure autoFocus is not set
                  value={toDate}
                  data-testid="toTime"
                  onChange={(e) => setToDate(e.value)}
                  className="rounded-0 border-0 ps-2 pe-2 bg-transparent calendar-field w-100"
                  showIcon
                  showTime
                  timeOnly
                  readOnlyInput
                  onFocus={handleCalendarFocus}
                  onBlur={handleCalendarBlur}
                  visible={isCalendarOpen}
                  icon={() => <i className="pi pi-calendar"></i>}
                />
                <label htmlFor={"toTime"}>To Time</label>
              </FloatLabel>
            </div>
          </div>
          <Button
            type="button"
            data-testid="applyFilter"
            label="Apply Filter"
            icon="pi pi-check"
            className="d-flex mx-auto mt-4"
            onClick={(e) =>
              onFilterChange({ fromTime: fromDate, toTime: toDate }, e)
            }
            severity="success"
            disabled={!fromDate || !toDate}
          />
        </>
      );
    } else if (formatType === "year") {
      return (
        <>
          <InputText
            style={{ width: 0, height: 0, border: "none" }}
            value={value}
            onChange={handleInputChange}
            className="p-inputtext-sm"
            placeholder={`Search ${label}`}
          />
          <div className="row g-3">
            <div className="col-6 py-3">
              <FloatLabel>
                <Calendar
                  autoFocus={false} // Ensure autoFocus is not set
                  value={fromDate}
                  data-testid="fromDate"
                  onChange={(e) => setFromDate(e.value)}
                  className="rounded-0 border-0 ps-2 pe-2 bg-transparent calendar-field w-100"
                  showIcon
                  showButtonBar
                  readOnlyInput
                  view="year"
                  dateFormat="yy"
                  onFocus={handleCalendarFocus}
                  onBlur={handleCalendarBlur}
                  visible={isCalendarOpen}
                  icon={() => <i className="pi pi-calendar"></i>}
                />
                <label htmlFor={"fromDate"}>From Year</label>
              </FloatLabel>
            </div>
            <div className="col-6 py-3">
              <FloatLabel>
                <Calendar
                  autoFocus={false} // Ensure autoFocus is not set
                  value={toDate}
                  data-testid="toDate"
                  onChange={(e) => setToDate(e.value)}
                  className="rounded-0 border-0 ps-2 pe-2 bg-transparent calendar-field w-100"
                  showIcon
                  showButtonBar
                  readOnlyInput
                  onFocus={handleCalendarFocus}
                  view="year"
                  dateFormat="yy"
                  onBlur={handleCalendarBlur}
                  visible={isCalendarOpen}
                  icon={() => <i className="pi pi-calendar"></i>}
                />
                <label htmlFor={"toDate"}>To Year</label>
              </FloatLabel>
            </div>
          </div>
          <Button
            type="button"
            data-testid="applyFilter"
            label="Apply Filter"
            icon="pi pi-check"
            className="d-flex mx-auto mt-4"
            onClick={(e) =>
              onFilterChange({ fromDate: fromDate, toDate: toDate }, e)
            }
            severity="success"
            disabled={!fromDate || !toDate}
          />
        </>
      );
    } else if (formatType === "select") {
      return (
        <>
          <div style={{ maxHeight: "200px", overflowY: "auto" }}>
            {data.map((option, index) => {
              return (
                <div
                  className="d-flex align-items-center gap-2 py-2"
                  data-testid={option.value.replace(" ", "")}
                  key={option.value}
                >
                  <RadioButton
                    inputId={`${option.value}`}
                    data-testid={`${option.value}`}
                    name={index}
                    value={option.value}
                    onChange={() => handleRadioChange(option.value)}
                    checked={selectedValue === option.value}
                  />
                  <label
                    htmlFor={`${option.value}`}
                    className="ml-2 radio-label"
                  >
                    {option.label}
                  </label>
                </div>
              );
            })}
          </div>
          <Button
            type="button"
            label="Apply Filter"
            icon="pi pi-check"
            className="d-flex mx-auto mt-4"
            onClick={(e) => onFilterChange(selectedValue, e)}
            disabled={selectedValue === ""}
            severity="success"
          />
        </>
      );
    } else if (formatType === "amount") {
      return (
        <>
          <div style={{ display: "flex", gap: "12px", marginBottom: "18px" }}>
            <div style={{ flex: 1 }}>
              <FloatLabel>
                <InputText
                  id="amountFrom"
                  type="number"
                  value={fromAmount}
                  onChange={handleFromAmountChange}
                  min={0}
                  placeholder="From"
                  style={{ width: "100%" }}
                />
                <label htmlFor="amountFrom">Amount From</label>
              </FloatLabel>
            </div>
            <div style={{ flex: 1 }}>
              <FloatLabel>
                <InputText
                  id="amountTo"
                  type="number"
                  value={toAmount}
                  onChange={handleToAmountChange}
                  min={0}
                  placeholder="To"
                  style={{ width: "100%" }}
                />
                <label htmlFor="amountTo">Amount To</label>
              </FloatLabel>
            </div>
          </div>
          <Button
            type="button"
            data-testid="applyFilter"
            label="Apply Filter"
            icon="pi pi-check"
            className="d-flex mx-auto mt-4"
            onClick={(e) =>
              onFilterChange({ amountFrom: fromAmount, amountTo: toAmount }, e)
            }
            severity="success"
            disabled={
              !fromAmount || !toAmount || fromAmount === "" || toAmount === ""
            }
          />
        </>
      );
    } else {
      return (
        <>
          <InputText
            value={value}
            data-testid="searchInput"
            onChange={handleInputChange}
            className="p-inputtext-sm"
            placeholder={`Search ${label}`}
          />
          <ul
            className="p-list"
            style={{ maxHeight: "200px", overflowY: "auto" }}
          >
            {data?.map((item, index) => (
              <li
                key={index}
                className="d-flex align-items-center gap-2 py-2"
                data-testid={item?.name?.toString()?.replace(" ", "")}
              >
                <Checkbox
                  inputId={`checkbox-${index}`}
                  data-testid={`checkbox-${index}`}
                  checked={selectedItems.includes(item)}
                  onChange={() => handleCheckboxChange(item)}
                />
                <label htmlFor={`checkbox-${index}`}>{item.name}</label>
              </li>
            ))}
          </ul>
          {/* <ul
            className="p-list"
            style={{ maxHeight: "200px", overflowY: "auto" }}
          >
            {data
              ?.filter(
                (item) =>
                  !value ||
                  item.name.toLowerCase().includes(value.toLowerCase())
              )
              .map((item, index) => (
                <li
                  key={index}
                  className="d-flex align-items-center gap-2 py-2"
                  data-testid={item?.name?.toString()?.replace(" ", "")}
                >
                  <Checkbox
                    inputId={`checkbox-${index}`}
                    data-testid={`checkbox-${index}`}
                    checked={selectedItems.includes(item)}
                    onChange={() => handleCheckboxChange(item)}
                  />
                  <label htmlFor={`checkbox-${index}`}>{item.name}</label>
                </li>
              ))}
          </ul> */}
          <Button
            type="button"
            label="Apply Filter"
            data-testid="applyFilter"
            icon="pi pi-check"
            className="d-flex mx-auto mt-4 regular-text"
            onClick={(e) => onFilterChange(selectedItems, e)}
            severity="success"
            disabled={selectedItems?.length === 0}
          />
        </>
      );
    }
  };

  useEffect(() => {
    if (filterData) {
      console.log("filterData", filterData);
      if (formatType === "select") {
        setSelectedValue(filterData[id].filterDemoData);
      }
      if (formatType === "date") {
        setToDate(filterData[id].filterDemoData?.toDate);
        setFromDate(filterData[id].filterDemoData?.fromDate);
      }
      if (formatType === "time") {
        setToDate(filterData[id].filterDemoData?.toTime);
        setFromDate(filterData[id].filterDemoData?.fromTime);
      }
      if (formatType === "year") {
        setToDate(filterData[id].filterDemoData?.toDate);
        setFromDate(filterData[id].filterDemoData?.fromDate);
      }
      if (formatType === "Search") {
        setSelectedItems(
          filterData[id].filterDemoData ? filterData[id].filterDemoData : []
        );
      }
      if (formatType === "amount") {
        setFromAmount(filterData[id].filterDemoData?.amountFrom || "");
        setToAmount(filterData[id].filterDemoData?.amountTo || "");
      }
    }
  }, [filterData]);
  const handleClear = (e) => {
    setValue("");
    setSelectedItems([]);
    setSelectedValue("");
    setFromDate(null);
    setToDate(null);
    setFromAmount("");
    setToAmount("");
    clearFilter(e);
  };
  const handleClearAll = (e) => {
    setValue("");
    setSelectedItems([]);
    setSelectedValue("");
    setFromDate(null);
    setToDate(null);
    setFromAmount("");
    setToAmount("");
    clearAllFilter(e);
  };

  return (
    <div className="grid-filter-con">
      <div
        className="d-flex regular-text justify-content-between align-items-center mb-2"
        data-testid="grid_filter_container"
      >
        <h5 className="mb-0 regular-semibold-text ">Filters</h5>
        <Button
          text
          label="Clear All"
          data-testid="clearAllFilter"
          className="gap-2 ms-auto regular-text"
          type="button"
          // onClick={(e) => clearAllFilter(e)}
          onClick={handleClearAll}
        />
      </div>
      <hr className="my-2" />
      <div className="d-flex justify-content-between align-items-center mb-3">
        <span className="text-muted regular-text">{label}</span>
        <Button
          text
          label="Clear"
          data-testid="clear"
          className="gap-2 ms-auto regular-text"
          type="button"
          // onClick={(e) => clearFilter(e)}
          onClick={handleClear}
        />
      </div>
      <div className="regular-text">{renderContent()}</div>
    </div>
  );
};

export default DataTableFilter;
