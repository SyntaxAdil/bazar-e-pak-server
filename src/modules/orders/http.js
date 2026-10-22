import asyncHandler from "../../utils/async-handler.js";

export const send = (res, data, { status = 200, message = "OK", pagination } = {}) => {
  const body = { success: true, message, data };
  if (pagination) body.pagination = pagination;
  return res.status(status).json(body);
};

// paginated services return { data, pagination }
export const sendPage = (res, r, message = "OK") => send(res, r.data, { message, pagination: r.pagination });

export const h = (fn) => asyncHandler(fn);
