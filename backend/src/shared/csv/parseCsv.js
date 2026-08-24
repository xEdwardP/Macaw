const { BadRequestError } = require("../errors/AppError");
const ERROR_CODES = require("../errors/codes");

const MAX_ROWS = 5000;
const BYTE_ORDER_MARK = 0xfeff;

const withoutByteOrderMark = (text) =>
  text.charCodeAt(0) === BYTE_ORDER_MARK ? text.slice(1) : text;

const parseCsv = (input) => {
  const text = withoutByteOrderMark(String(input || ""));
  const records = [];

  let record = [];
  let field = "";
  let quoted = false;

  const endField = () => {
    record.push(field);
    field = "";
  };

  const endRecord = () => {
    endField();
    records.push(record);
    record = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (quoted) {
      if (char !== '"') {
        field += char;
      } else if (text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        quoted = false;
      }
      continue;
    }

    if (char === '"' && field === "") quoted = true;
    else if (char === ",") endField();
    else if (char === "\n") endRecord();
    else if (char !== "\r") field += char;
  }

  if (quoted)
    throw new BadRequestError(
      ERROR_CODES.IMPORT_MALFORMED,
      "El archivo tiene comillas sin cerrar",
    );

  if (field !== "" || record.length > 0) endRecord();

  return records.filter((cells) => cells.some((cell) => cell.trim() !== ""));
};

const toRecords = (input, requiredColumns = []) => {
  const rows = parseCsv(input);

  if (rows.length < 2)
    throw new BadRequestError(
      ERROR_CODES.IMPORT_EMPTY,
      "El archivo no contiene filas de datos",
    );

  if (rows.length - 1 > MAX_ROWS)
    throw new BadRequestError(
      ERROR_CODES.IMPORT_TOO_MANY_ROWS,
      `El archivo supera el máximo de ${MAX_ROWS} filas`,
      { maxRows: MAX_ROWS, rows: rows.length - 1 },
    );

  const header = rows[0].map((column) => column.trim());
  const missing = requiredColumns.filter((column) => !header.includes(column));

  if (missing.length > 0)
    throw new BadRequestError(
      ERROR_CODES.IMPORT_MISSING_COLUMNS,
      `Faltan columnas obligatorias: ${missing.join(", ")}`,
      { missing, header },
    );

  return rows.slice(1).map((cells, index) => ({
    row: index + 2,
    values: Object.fromEntries(
      header.map((column, position) => [column, (cells[position] || "").trim()]),
    ),
  }));
};

module.exports = { parseCsv, toRecords, MAX_ROWS };
