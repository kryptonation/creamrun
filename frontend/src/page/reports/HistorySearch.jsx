import { useRef } from "react";
import Img from "../../components/Img";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { OverlayPanel } from "primereact/overlaypanel";
import { Checkbox } from "primereact/checkbox";

const HistorySearch = ({
  dates,
  setDates,
  checked,
  setChecked,
  handleFilterApply,
  clearAllFilter,
}) => {
  const menuRight = useRef(null);

  const closePanel = () => {
    menuRight.current.hide();
  };

  return (
    <div className="d-flex align-items-center bg-light search-history-input py-0 px-1 rounded-2 mt-1">
      <Img name="search"></Img>
      <input
        type="search"
        placeholder="Search"
        data-testid="history-search"
        className="regular-text ps-1 flex-grow-1 border-0 bg-transparent"
      />
      <OverlayPanel ref={menuRight} className="p-0">
        <div className="search-filter-con p-2" data-testid="search-filter-con">
          <div className="d-flex align-items-center justify-content-between border-bottom">
            <p className="regular-semibold-text">Filter</p>
            <Button
              type="button"
              onClick={() => {
                closePanel();
                clearAllFilter();
              }}
              text
              className="fav-btn regular-text fw-normal p-0"
              data-testid="clear-all-btn"
              label="Clear all"
            />
          </div>
          <div className="d-flex align-items-center gap-1 my-2 regular-text">
            <Checkbox
              inputId="fav-check-box"
              name="fav-check-box"
              value="yes"
              onChange={(e) => setChecked(e.checked)}
              checked={checked}
            />
            <label htmlFor="fav-check-box" className="ml-2">
              My Favourite Queries{" "}
            </label>
          </div>
          <div className="mb-2 bottom border-bottom">
            <p className="regular-text">Select Date</p>
            <Calendar
              value={dates}
              icon={() => (
                <span data-testid={`cal-icon regular-text`}>
                  <Img name="calendar" />
                </span>
              )}
              className=" border-0  regular-text"
              pt={{
                input: {
                  className: " border-0 regular-text shadow-none outline-none",
                },
              }}
              showIcon
              onChange={(e) => setDates(e.value)}
              selectionMode="range"
              readOnlyInput
              hideOnRangeSelection
            />
          </div>
          <Button
            label="Apply Filter"
            onClick={handleFilterApply}
            className="my-4"
          ></Button>
        </div>
      </OverlayPanel>
      <Button
        icon={() => <Img name="ic_filter" />}
        className="mr-2 "
        onClick={(event) => menuRight.current.toggle(event)}
        aria-controls="popup_menu_right"
        aria-haspopup
      />
    </div>
  );
};

export default HistorySearch;
