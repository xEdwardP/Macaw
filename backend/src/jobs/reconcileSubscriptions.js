const logger = require("../config/logger");
const subscriptions = require("../modules/institutions/subscriptions.service");

const runReconcileSubscriptions = async () => {
  const result = await subscriptions.recountStudents();

  logger.info(result, "Contadores de suscripción reconciliados");

  return result;
};

module.exports = { runReconcileSubscriptions };
