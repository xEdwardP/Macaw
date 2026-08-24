const escape = (value) => {
  if (value === null || value === undefined) return "";

  const text =
    value instanceof Date ? value.toISOString() : String(value).trim();

  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const toCsv = (columns, rows) => {
  const header = columns.map((column) => escape(column.header)).join(",");

  const body = rows.map((row) =>
    columns.map((column) => escape(column.value(row))).join(","),
  );

  return `﻿${[header, ...body].join("\r\n")}\r\n`;
};

module.exports = { toCsv };
