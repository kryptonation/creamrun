import React, { useState } from "react";
import { Dropdown } from "primereact/dropdown";
import { FloatLabel } from "primereact/floatlabel";
import { Dialog } from "primereact/dialog";
import Img from "./Img";

const BSelectWithSearchandAdd = ({
  variable,
  formik,
  isRequire,
  isDisable = false,
  handleSearch,
  showAddDealer = false, // New prop to control if Add Dealer button should be shown
  DealerModal, // Pass the DealerModal component as a prop
  onDealerAdded, // Callback function when a dealer is added
}) => {
  const [visibleAddDealer, setVisibleAddDealer] = useState(false);

  const className = `b-input-fields ${variable.size}`;

  const onSearch = async (event) => {
    if (handleSearch) {
      handleSearch(event.filter);
    }
  };

  const handleAddDealerClick = () => {
    setVisibleAddDealer(true);
  };

  const handleDealerModalClose = (newDealer) => {
    console.log("Dealer modal is closing. Data received:", newDealer);
    setVisibleAddDealer(false);
    // If a new dealer was added, call the callback function
    if (newDealer && onDealerAdded) {
      onDealerAdded(newDealer);
    }
  };

  // Define the overriding CSS rules as a string
  const customDropdownStyles = `
    .p-dropdown-item .add-dealer-option {
      /* Alignment */
         justify-content: end;
      width: 100%;
      text-align: right !important;

      /* Styling */
      color: var(--primary-color);
      /* Make it feel like a button */
      cursor: pointer;
      padding: 0.75rem 1.25rem;
      margin: 0 -1.25rem -0.75rem;
    }

    .p-dropdown-item:has(.add-dealer-option):hover {
      background-color: transparent !important;
    }

    .p-dropdown-item .add-dealer-option:hover {
      background-color: #f8f9fa;
    }
  `;

  // Custom item template for dropdown options
  const itemTemplate = (option) => {
    // Special template for "Add Dealer" option
    if (option.isAddDealer) {
      return (
        <div
          className="flex align-items-center justify-content-end p-2 cursor-pointer text-primary"
        >
          {/* <style>{customDropdownStyles}</style> */}
          <span style={{ justifyContent: "end" }}>+ Add Dealer</span>
        </div>
      );
    }

    // Regular option template
    return (
      <div className="flex align-items-center p-2">
        <span>{option.name}</span>
      </div>
    );
  };

  // Prepare options with "Add Dealer" option if enabled
  const optionsWithAddDealer = showAddDealer
    ? [
      {
        name: "Add Dealer",
        id: "add_dealer",
        isAddDealer: true,
      },
      ...variable.options,
    ]
    : variable.options;

  // Handle selection - intercept "Add Dealer" selection
  const handleChange = (e) => {
    if (e.value && e.value.isAddDealer) {
      // Don't set the value, just open the modal
      handleAddDealerClick();
      return;
    }

    // Normal selection handling
    formik.handleChange(e);
  };

  return (
    <div className={className}>
      <div
        className={`w-100 position-relative ${formik.touched[variable.id] && formik.errors[variable.id]
          ? "text-danger-con"
          : ""
          }`}
      >
        <FloatLabel>
          <Dropdown
            inputId={variable.id}
            name={variable.id}
            options={optionsWithAddDealer}
            disabled={isDisable}
            filter
            optionLabel="name"
            placeholder={`Select a ${variable.label}`}
            onChange={handleChange}
            onBlur={formik.handleBlur}
            value={formik.values[variable.id]}
            showClear={variable.clear ?? false}
            onFilter={onSearch}
            itemTemplate={itemTemplate}
            className="rounded-0 border-0 ps-0 bg-transparent text-field w-100 addDeleaer"
            // dropdownIcon="pi pi-search"
            dropdownIcon={<Img name="search" />}
            collapseIcon={<Img name="search" />}
          />
          <label htmlFor={variable.id}>
            {variable.label}
            {(variable.isRequire || isRequire) && (
              <span className="require-star">*</span>
            )}
          </label>
        </FloatLabel>

        {formik.touched[variable.id] && formik.errors[variable.id] && (
          <div className="error-msg">{formik.errors[variable.id]}</div>
        )}
      </div>

      {/* Add Dealer Dialog */}
      {showAddDealer && (
        <Dialog
          header="Add Dealer"
          visible={visibleAddDealer}
          style={{
            width: "50vw",
            minHeight: "max-content",
          }}
          onHide={() => {
            if (!visibleAddDealer) return;
            setVisibleAddDealer(false);
          }}
        >
          {DealerModal && (
            <DealerModal
              // visible={(newVisibility) => setVisibleAddDealer(newVisibility)}
              onClose={handleDealerModalClose}
            />
          )}
        </Dialog>
      )}
    </div>
  );
};

export default BSelectWithSearchandAdd;
