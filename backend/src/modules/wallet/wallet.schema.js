const { z } = require("zod");
const { email, id, money, optionalId } = require("../../shared/validation/common");

const TRANSACTION_TYPES = [
  "recharge",
  "frozen",
  "released",
  "commission",
  "subsidy",
  "withdrawal",
  "refund",
];

const transactionsSchema = {
  query: z.object({
    limit: z.coerce.number().int().positive().max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
    type: z.enum(TRANSACTION_TYPES).optional(),
  }),
};

const rechargeSchema = {
  body: z.object({
    userId: id,
    amount: money,
  }),
};

const subsidySchema = {
  body: z.object({
    studentId: id,
    amount: money,
    reason: z.string().trim().max(200).optional(),
    institutionId: optionalId,
  }),
};

const createWithdrawalSchema = {
  body: z.object({
    amount: money,
    paypalEmail: email,
  }),
};

const rejectWithdrawalSchema = {
  params: z.object({ id }),
  body: z.object({
    notes: z.string().trim().max(300).optional(),
  }),
};

const createOrderSchema = {
  body: z.object({ amount: money }),
};

const captureOrderSchema = {
  body: z.object({ orderId: z.string().trim().min(1) }),
};

module.exports = {
  transactionsSchema,
  rechargeSchema,
  subsidySchema,
  createWithdrawalSchema,
  rejectWithdrawalSchema,
  createOrderSchema,
  captureOrderSchema,
  TRANSACTION_TYPES,
};
