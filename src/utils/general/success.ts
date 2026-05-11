export const SUCCESS_CODE = [
  "SUCCESS",
  "REDIRECTED",
  "CREATED",
  "ACCEPTED",
  "COMPLETED",
  "PROCESSED",
  "OK",
  "PAYMENT_SUCCESS",
  "VALIDATION_SUCCESS",
  "AUTHENTICATION_SUCCESS",
  "AUTHORIZATION_SUCCESS",
  "OPERATION_SUCCESS",
  "REQUEST_SUCCESS",
  "RESPONSE_SUCCESS",
] as const;

export type SuccessCodeType = (typeof SUCCESS_CODE)[number];

export const DEFAULT_SUCCESS_MESSAGE: Record<SuccessCodeType, string> = {
  SUCCESS: "The operation completed successfully.",
  REDIRECTED: "The request was redirected successfully.",
  CREATED: "The resource was created successfully.",
  ACCEPTED: "The request was accepted.",
  COMPLETED: "The operation is complete.",
  PROCESSED: "The request was processed successfully.",
  OK: "OK",
  PAYMENT_SUCCESS: "The payment completed successfully.",
  VALIDATION_SUCCESS: "Validation passed.",
  AUTHENTICATION_SUCCESS: "Authentication succeeded.",
  AUTHORIZATION_SUCCESS: "Authorization succeeded.",
  OPERATION_SUCCESS: "The operation completed successfully.",
  REQUEST_SUCCESS: "The request completed successfully.",
  RESPONSE_SUCCESS: "The response was generated successfully.",
};
