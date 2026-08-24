const { ValidationError } = require("../shared/errors/AppError");

const TARGETS = ["body", "query", "params"];

const validate = (schemas) => (req, res, next) => {
  const issues = [];

  for (const target of TARGETS) {
    const schema = schemas[target];
    if (!schema) continue;

    const result = schema.safeParse(req[target]);

    if (!result.success) {
      for (const issue of result.error.issues) {
        issues.push({
          target,
          field: issue.path.join(".") || target,
          code: issue.code,
          message: issue.message,
        });
      }
      continue;
    }

    if (target === "query") {
      req.validatedQuery = result.data;
    } else {
      req[target] = result.data;
    }
  }

  if (issues.length > 0) {
    const summary =
      issues.length === 1
        ? issues[0].message
        : `${issues[0].message} (y ${issues.length - 1} error${issues.length > 2 ? "es" : ""} más)`;

    return next(new ValidationError(issues, summary));
  }

  next();
};

module.exports = validate;
