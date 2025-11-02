// IN_PROGRESS = "I"
// AVAILABLE = "A"
// ASSIGNED_TO_VEHICLE = "V"
// ACTIVE = "Y"
// ARCHIVED = "N"

export const medallionStatus = (medallion) => {
  if (medallion.medallion_status === "A") {
    return "AVAILABLE";
  } else if (medallion.medallion_status === "I") {
    return "IN PROGRESS";
  } else if (medallion.medallion_status === "Y") {
    return "ACTIVE";
  } else if (medallion.medallion_status === "V") {
    return "ASSIGNED TO VEHICLE";
  } else if (medallion.medallion_status === "N") {
    return "ARCHIVED";
  }
  return medallion.medallion_status;
};

export const isMedallionStorageActiverOrArchived = (medallion) => {
  if (
    medallion.medallion_status === "AVAILABLE" ||
    medallion.medallion_status === "ARCHIVED"
  ) {
    return true;
  }
  return false;
};

export const isMedallionActive = (medallion) => {
  if (medallion.medallion_status === "A") {
    return true;
  }
  return true;
};

export const isLeaseActive = (medallion) => {
  // return checkExpiry(medallion.hack_indicator);
  return medallion?.hack_indicator;
};

// REGISTRATION_IN_PROGRESS = "Registration In Progress"
// REGISTERED = "Registered"
// APPROVED = "Approved"
// ACTIVE = "Active"
// INACTIVE = "Inactive"
// AVAILABLE = "Available"
// HACKED = "Hacked"
// DEHACKED = "DeHacked"

export const isVechileActive = (medallion) => {
  if (medallion.vehicle_number === "") {
    return false;
  }
  return true;
};

const checkExpiry = (inputDate) => {
  const today = new Date();
  const selectedDate = new Date(inputDate);
  return selectedDate > today;
};
