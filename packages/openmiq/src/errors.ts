import { MiQError, type MiQErrorOptions } from "@makeitaquote/utils/errors";

export { MiQError, ValidationError } from "@makeitaquote/utils/errors";

export interface OpenMiQApiErrorOptions extends MiQErrorOptions {
  status?: number;
  body?: unknown;
  endpoint: string;
}

/** The OpenMiQ-API refused or failed a request. */
export class OpenMiQApiError extends MiQError {
  readonly status: number | undefined;
  readonly body: unknown;
  readonly endpoint: string;

  constructor(message: string, options: OpenMiQApiErrorOptions) {
    super(message, options);
    this.name = "OpenMiQApiError";
    this.status = options.status;
    this.body = options.body;
    this.endpoint = options.endpoint;
  }
}
