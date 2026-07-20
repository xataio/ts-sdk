export class ApiError<TBody = unknown, TStatus extends number = number> extends Error {
  readonly status: TStatus;
  readonly body: TBody;
  /** Server-requested delay before retrying, in milliseconds (from the `Retry-After` header). */
  retryAfterMs?: number;
  /** Server-side request identifier (from the `x-request-id` header), for support tracing. */
  requestId?: string;

  constructor(status: TStatus, body: TBody, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export class NetworkError extends Error {
  readonly status: undefined;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'NetworkError';
  }
}
