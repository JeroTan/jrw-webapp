import * as React from "react";
import type { HTMLAttributes, ReactNode } from "react";

import { mergeClassNames } from "../utils";

export type ResourceCardStat = {
  label: ReactNode;
  value: ReactNode;
};

export type ResourceCardProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  action?: ReactNode;
  meta?: ReactNode;
  stats?: ResourceCardStat[];
  status?: ReactNode;
  title: ReactNode;
};

export function ResourceCard({
  action,
  className,
  meta,
  stats = [],
  status,
  title,
  ...props
}: ResourceCardProps) {
  return (
    <article
      {...props}
      className={mergeClassNames("jrw-resource-card", className)}
      role="listitem"
    >
      <header className="jrw-resource-card__header">
        <div className="jrw-resource-card__identity">
          <h2 className="jrw-resource-card__title">{title}</h2>
          {meta ? <p className="jrw-resource-card__meta">{meta}</p> : null}
        </div>
        {status ? (
          <div className="jrw-resource-card__status">{status}</div>
        ) : null}
      </header>

      {stats.length > 0 ? (
        <dl className="jrw-resource-card__stats">
          {stats.map((stat, index) => (
            <div className="jrw-resource-card__stat" key={index}>
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {action ? (
        <div className="jrw-resource-card__action">{action}</div>
      ) : null}
    </article>
  );
}
