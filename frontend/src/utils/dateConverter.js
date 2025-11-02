import moment from "moment";

export const yearMonthDate = (date) => {
  // console.log(date);

  if (!date) {
    return;
  }
  // const fullDate = new Date(date).getDate()
  // const month = new Date(date).getMonth() + 1;
  // const year = new Date(date).getFullYear()
  // return `${year}-${month}-${fullDate}`
  const momentDate = moment(date);

  const formattedDate = momentDate.format("YYYY-MM-DD");
  return formattedDate;
};

export const TimeFormat = (date) => {
  console.log(date);

  if (!date) {
    return;
  }

  const momentDate = moment(date);

  const formattedDate = momentDate.format("HH:mm:ss");
  return formattedDate;
};

export const dateMonthYear = (date) => {
  if (!date) {
    return;
  }
  // const fullDate = new Date(date).getDate()
  // const month = new Date(date).getMonth() + 1;
  // const year = new Date(date).getFullYear()

  const momentDate = moment(new Date(date));

  const formattedDate = momentDate.format("MM/DD/YYYY");
  return formattedDate;

  // return `${month}/${fullDate}/${year}`
};

export const TimeToDateFormat = (date) => {
  if (!date) {
    return;
  }

  const dateTime = moment(date, "HH:mm:ss");
  return dateTime;
};

export const calculateEndDate = (startDate, totalWeeks) => {
  if (startDate && totalWeeks > 0) {
    const newEndDate = moment(startDate).add(totalWeeks, "weeks");
    return newEndDate;
  }
  return null;
};

export const isEndDateAfterStartDate = (
  startDate,
  endDate,
  allowSameDate = false
) => {
  if (!startDate || !endDate) return false;

  return allowSameDate
    ? moment(endDate).isSameOrAfter(moment(startDate))
    : moment(endDate).isAfter(moment(startDate));
};

export const timeFormatWithRange = (date) => {
  if (!date) {
    return;
  }
  const momentDate = moment(date);
  const formattedDate = momentDate.format("hh:mm A");
  return formattedDate;
};

export const timeHourandMinutes = (date) => {
  if (!date) {
    return;
  }
  const momentDate = moment(date);
  const formattedDate = momentDate.format("HH:mm");
  return formattedDate;
};

export const getYear = (date) => {
  if (!date) {
    return;
  }
  const momentDate = moment(date).year();
  return momentDate;
};

export const monthDateYearHrsMin = (date) => {
  if (!date) {
    return;
  }
  const momentDate = moment(date);
  const formattedDate = momentDate.format("MMM D, YYYY · h:mm A");
  return formattedDate;
};
export const monthDateYearHrsMinSepartedByUnderscore = (date) => {
  if (!date) {
    return;
  }
  const momentDate = moment(date);
  const formattedDate = momentDate.format("MMM D, YYYY - h:mm A");
  return formattedDate;
};
