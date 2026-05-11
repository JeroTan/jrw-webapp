import type { GeneralError } from "./error";

export type OkResult<T> = {
  content: T;
  error: null;
};

export type ErrorResult<E = unknown> = {
  content: null;
  error: GeneralError<E>;
};

export type AppResult<T, E = unknown> = OkResult<T> | ErrorResult<E>;

export class Result {
  static okay<T>(content: T): OkResult<T> {
    return { content, error: null };
  }

  static error<E>(error: GeneralError<E>): ErrorResult<E> {
    return { content: null, error };
  }

  static isOkay<T, E>(result: AppResult<T, E>): result is OkResult<T> {
    return result.error === null;
  }

  static isError<T, E>(result: AppResult<T, E>): result is ErrorResult<E> {
    return result.error !== null;
  }
}
