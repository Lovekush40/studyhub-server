export const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data,
  });
};

export const sendCreated = (res, data, message = 'Created') => sendSuccess(res, data, message, 201);

export const sendError = (res, message = 'Error', statusCode = 400, details = null) => {
  const payload = { status: 'error', message };
  if (details) payload.details = details;
  return res.status(statusCode).json(payload);
};
