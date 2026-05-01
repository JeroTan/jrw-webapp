import { LogicError } from "./error";
export class Result {
  static okay<T>(content: T) {
    return { content, error: null };
  }

  static error<E>(error: LogicError<E>) {
    return { content: null, error };
  }
}
