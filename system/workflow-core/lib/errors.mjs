export class WorkflowError extends Error {
  constructor(code, message, details = {}, retryable = false) {
    super(message);
    this.name = 'WorkflowError';
    this.code = code;
    this.details = details;
    this.retryable = retryable;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        retryable: this.retryable,
      },
    };
  }
}

export function fail(code, message, details = {}, retryable = false) {
  throw new WorkflowError(code, message, details, retryable);
}
