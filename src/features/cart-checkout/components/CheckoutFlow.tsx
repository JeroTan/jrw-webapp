import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui";
import { mergeClassNames } from "@/components/utils";
import type { CartState } from "@/domain/checkout/cart";
import type { ReactNode } from "react";
import { getCartSummary } from "../store";
import { useCheckoutValidationAction } from "./useCheckoutValidationAction";

export type CheckoutStepId = "cart" | "details" | "payment" | "receipt";

type CheckoutFlowShellProps = {
  children: ReactNode;
  currentStep: CheckoutStepId;
  state: CartState;
  summaryAction?: CheckoutSummaryAction;
  title: string;
  titleId: string;
};

type CheckoutSummaryAction = {
  disabled?: boolean;
  href?: string;
  label: string;
  loading?: boolean;
  loadingLabel?: string;
  onClick?: () => void;
  statusMessage?: string | null;
};

const checkoutSteps: { id: CheckoutStepId; label: string; number: string }[] = [
  { id: "cart", label: "Cart", number: "01" },
  { id: "details", label: "Details", number: "02" },
  { id: "payment", label: "Payment", number: "03" },
  { id: "receipt", label: "Receipt", number: "04" },
];

const checkoutCta: Record<CheckoutStepId, { href?: string; label: string }> = {
  cart: { href: "/checkout", label: "Checkout" },
  details: { label: "Continue to Payment" },
  payment: { label: "Payment ready" },
  receipt: { label: "View Receipt" },
};

const checkoutBackTargets: Partial<
  Record<CheckoutStepId, { href: string; label: string }>
> = {
  cart: { href: "/cart", label: "Back to Cart" },
  details: { href: "/checkout", label: "Back to Details" },
};

function stepIndex(step: CheckoutStepId): number {
  return checkoutSteps.findIndex((item) => item.id === step);
}

function backTargetForStep(currentStep: CheckoutStepId) {
  if (currentStep === "receipt") {
    return null;
  }

  const previousStep = checkoutSteps[stepIndex(currentStep) - 1]?.id;

  return previousStep ? (checkoutBackTargets[previousStep] ?? null) : null;
}

function stepBackHref(step: CheckoutStepId, currentStep: CheckoutStepId) {
  if (currentStep === "receipt") {
    return null;
  }

  if (stepIndex(step) >= stepIndex(currentStep)) {
    return null;
  }

  return checkoutBackTargets[step]?.href ?? null;
}

function CheckoutStepper({ currentStep }: { currentStep: CheckoutStepId }) {
  const currentIndex = stepIndex(currentStep);

  return (
    <ol className="m-0 grid list-none border-b border-brand-border p-0 md:grid-cols-4">
      {checkoutSteps.map((step, index) => {
        const isReached = index <= currentIndex;
        const isCurrent = step.id === currentStep;
        const href = stepBackHref(step.id, currentStep);
        const stepClassName = mergeClassNames(
          "inline-flex min-h-control-sm items-center border px-grid-xs font-system text-xs font-bold uppercase leading-none",
          isReached
            ? "border-brand-accent bg-brand-accent text-brand-surface"
            : "border-brand-border-strong bg-brand-surface text-brand-content",
          href &&
            "no-underline hover:outline-2 hover:outline-offset-2 hover:outline-brand-accent focus:outline-2 focus:outline-offset-2 focus:outline-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        );
        const stepLabel = `${step.number} ${step.label}`;

        return (
          <li
            className="border-b border-brand-border p-grid-sm md:border-r md:border-b-0 last:border-b-0 md:last:border-r-0"
            key={step.id}
          >
            {href ? (
              <a
                aria-label={`Go back to ${step.label} step`}
                className={stepClassName}
                href={href}
              >
                {stepLabel}
              </a>
            ) : (
              <span
                aria-current={isCurrent ? "step" : undefined}
                className={stepClassName}
              >
                {stepLabel}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function CheckoutFlowSummary({
  currentStep,
  state,
  summaryAction,
}: {
  currentStep: CheckoutStepId;
  state: CartState;
  summaryAction?: CheckoutSummaryAction;
}) {
  const summary = getCartSummary(state);
  const cta = checkoutCta[currentStep];
  const isBlocked = state.items.length === 0 || summary.hasBlockingIssues;
  const checkoutValidation = useCheckoutValidationAction({
    navigateOnSuccess: true,
    state,
  });
  const canNavigate = Boolean(cta.href) && !isBlocked;

  return (
    <aside className="grid content-start gap-grid-sm border-t border-brand-border-strong bg-brand-surface p-grid-sm lg:border-t-0 lg:border-l">
      <div className="grid gap-1">
        <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
          Cart summary
        </p>
        <div className="flex items-end justify-between gap-grid-sm">
          <span className="font-system text-sm font-bold uppercase text-brand-muted">
            Subtotal
          </span>
          <strong className="brand-title-big text-brand-accent">
            {summary.subtotalLabel}
          </strong>
        </div>
        <p className="m-0 text-sm text-brand-muted">
          {summary.totalQuantity} item quantity across {summary.lineItemCount}{" "}
          line items.
        </p>
      </div>

      {summary.hasBlockingIssues ? (
        <p className="m-0 border border-brand-danger bg-brand-surface p-grid-xs text-sm font-bold text-brand-danger">
          Resolve unavailable or unverified items before checkout.
        </p>
      ) : null}

      <div>
        {currentStep === "cart" ? (
          <Button
            disabled={state.items.length === 0}
            fullWidth
            loading={checkoutValidation.isPending}
            loadingLabel="Checking cart"
            onClick={checkoutValidation.validate}
            textSize="xs"
            variant="primary"
          >
            {checkoutValidation.validation.status === "changed"
              ? "Review changes"
              : summary.hasBlockingIssues
                ? "Check cart"
                : "Checkout"}
          </Button>
        ) : canNavigate && cta.href ? (
          <ButtonLink fullWidth href={cta.href} textSize="xs" variant="primary">
            {cta.label}
          </ButtonLink>
        ) : summaryAction?.href ? (
          <ButtonLink
            fullWidth
            href={summaryAction.href}
            textSize="xs"
            variant="primary"
          >
            {summaryAction.label}
          </ButtonLink>
        ) : summaryAction ? (
          <Button
            disabled={summaryAction.disabled}
            fullWidth
            loading={summaryAction.loading}
            loadingLabel={summaryAction.loadingLabel}
            onClick={summaryAction.onClick}
            textSize="xs"
            variant="primary"
          >
            {summaryAction.label}
          </Button>
        ) : (
          <Button disabled fullWidth textSize="xs" variant="primary">
            {cta.label}
          </Button>
        )}
      </div>

      {summaryAction?.statusMessage ? (
        <p className="m-0 text-sm font-bold text-brand-muted" role="status">
          {summaryAction.statusMessage}
        </p>
      ) : null}

      {checkoutValidation.validation.message ? (
        <p className="m-0 text-sm font-bold text-brand-muted" role="status">
          {checkoutValidation.validation.message}
        </p>
      ) : null}
    </aside>
  );
}

export function CheckoutFlowShell({
  children,
  currentStep,
  state,
  summaryAction,
  title,
  titleId,
}: CheckoutFlowShellProps) {
  const backTarget = backTargetForStep(currentStep);

  return (
    <section
      aria-labelledby={titleId}
      className="grid min-h-[620px] border border-brand-border-strong bg-brand-surface lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]"
    >
      <h1 className="sr-only" id={titleId}>
        {title}
      </h1>
      <div className="grid min-w-0 content-start">
        <CheckoutStepper currentStep={currentStep} />
        <div className="grid gap-grid-sm p-grid-sm md:p-grid-md">
          {backTarget ? (
            <div>
              <ButtonLink
                href={backTarget.href}
                paddingX="xs"
                size="sm"
                textSize="xs"
                variant="ghost"
              >
                <span className="inline-flex items-center gap-grid-xs">
                  <ArrowLeft
                    aria-hidden="true"
                    className="size-4 shrink-0"
                    strokeWidth={2}
                  />
                  {backTarget.label}
                </span>
              </ButtonLink>
            </div>
          ) : null}
          {children}
        </div>
      </div>
      <CheckoutFlowSummary
        currentStep={currentStep}
        state={state}
        summaryAction={summaryAction}
      />
    </section>
  );
}
