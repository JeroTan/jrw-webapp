import * as React from "react";
import type { HTMLAttributes, ReactNode } from "react";

import { mergeClassNames } from "../utils";

const cardClass =
  "grid min-h-[236px] rounded-none border border-brand-border-strong bg-brand-surface";
const headerClass =
  "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-grid-sm border-b border-brand-border-strong p-grid-sm max-md:grid-cols-1";
const headerWithMediaClass =
  "grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-grid-sm border-b border-brand-border-strong p-grid-sm max-md:grid-cols-[auto_minmax(0,1fr)]";
const identityClass = "grid min-w-0 gap-0.5";
const titleClass = "text-[1.35rem] [overflow-wrap:anywhere]";
const metaClass =
  "m-0 font-system text-xs text-brand-muted [overflow-wrap:anywhere]";
const statusClass = "justify-self-end max-md:justify-self-start";
const statusWithMediaClass =
  "justify-self-end max-md:col-start-2 max-md:justify-self-start";
const statsClass = "m-0 grid grid-cols-2";
const statClass =
  "grid min-h-[70px] gap-0.5 border-r border-b border-brand-border p-grid-sm even:border-r-0";
const statLabelClass =
  "font-system text-[0.6875rem] font-bold uppercase text-brand-muted";
const statValueClass =
  "m-0 font-heading text-[1.15rem] font-bold [overflow-wrap:anywhere]";
const actionClass = "flex items-center justify-end p-grid-sm";

export type ResourceCardStat = {
  label: ReactNode;
  value: ReactNode;
};

export type ResourceCardProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  action?: ReactNode;
  media?: ReactNode;
  meta?: ReactNode;
  stats?: ResourceCardStat[];
  status?: ReactNode;
  title: ReactNode;
};

export function ResourceCard({
  action,
  className,
  media,
  meta,
  stats = [],
  status,
  title,
  ...props
}: ResourceCardProps) {
  return (
    <article
      {...props}
      className={mergeClassNames(cardClass, className)}
      role="listitem"
    >
      <header className={media ? headerWithMediaClass : headerClass}>
        {media ? <div>{media}</div> : null}
        <div className={identityClass}>
          <h2 className={titleClass}>{title}</h2>
          {meta ? <p className={metaClass}>{meta}</p> : null}
        </div>
        {status ? (
          <div className={media ? statusWithMediaClass : statusClass}>
            {status}
          </div>
        ) : null}
      </header>

      {stats.length > 0 ? (
        <dl className={statsClass}>
          {stats.map((stat, index) => (
            <div className={statClass} key={index}>
              <dt className={statLabelClass}>{stat.label}</dt>
              <dd className={statValueClass}>{stat.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {action ? <div className={actionClass}>{action}</div> : null}
    </article>
  );
}
