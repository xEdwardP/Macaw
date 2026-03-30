const APP_TIMEZONE = "America/Tegucigalpa";

const getCurrentTime = () => {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: APP_TIMEZONE }),
  );
};

const toAppTimezone = (date) => {
  return new Date(
    new Date(date).toLocaleString("en-US", { timeZone: APP_TIMEZONE }),
  );
};

const getWeekday = (date) => {
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split("-").map(Number);
    const jsDay = new Date(year, month - 1, day).getDay();
    return jsDay === 0 ? 7 : jsDay;
  }
  const day = toAppTimezone(date).getDay();
  return day === 0 ? 7 : day;
};

const isSlotWithinBlock = (blockStart, blockEnd, slotStart, slotEnd) => {
  return slotStart >= blockStart && slotEnd <= blockEnd && slotStart < slotEnd;
};

const doSlotsOverlap = (startA, endA, startB, endB) => {
  return startA < endB && endA > startB;
};

const getTodayDateString = () => {
  return new Date().toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE });
};

module.exports = {
  APP_TIMEZONE,
  getCurrentTime,
  toAppTimezone,
  getWeekday,
  isSlotWithinBlock,
  doSlotsOverlap,
  getTodayDateString,
};
