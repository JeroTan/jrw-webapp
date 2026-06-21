import type { CheckoutPaymentResult } from "@/server/services/CheckoutService";
import type { AppResult } from "@/utils/general/result";

export class CheckoutPaymentAttemptCoordinator {
  private readonly attemptLocks = new Map<string, Promise<void>>();

  async run(
    attemptId: string,
    create: () => Promise<AppResult<CheckoutPaymentResult>>
  ): Promise<AppResult<CheckoutPaymentResult>> {
    const previous = this.attemptLocks.get(attemptId) ?? Promise.resolve();
    let releaseCurrent: () => void = () => undefined;
    const current = new Promise<void>((resolve) => {
      releaseCurrent = resolve;
    });
    const queued = previous.catch(() => undefined).then(() => current);

    this.attemptLocks.set(attemptId, queued);
    await previous.catch(() => undefined);

    try {
      return await create();
    } finally {
      releaseCurrent();

      if (this.attemptLocks.get(attemptId) === queued) {
        this.attemptLocks.delete(attemptId);
      }
    }
  }
}
