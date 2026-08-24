const APP_TIMEZONE = "America/Tegucigalpa";

export const getTodayDateString = () => {
  return new Date().toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE });
};

export const toAppTimezone = (date) => {
  return new Date(
    new Date(date).toLocaleString("en-US", { timeZone: APP_TIMEZONE }),
  );
};
