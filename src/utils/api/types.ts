import z from "zod";

export const zodFilterData = z.object({
  field: z.string(),
  values: z.array(z.string()),
});

export type FilterData = z.infer<typeof zodFilterData>;

export const zodSortData = z.object({
  field: z.string(),
  direction: z.enum(["asc", "desc"]),
});

export type SortData = z.infer<typeof zodSortData>;

export const zodQueryProps = z.object({
  q: z.string().nullable(),
  filter: z.array(zodFilterData),
  sort: z.array(zodSortData),
});
export type QueryProps = z.infer<typeof zodQueryProps>;

export const zodPageProps = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
});

export type PageProps = z.infer<typeof zodPageProps>;

/**
 * Sample Query Params
 * ?q=dragon&status=active&type=fire,ghost&sort=-level,name,-created_at
 */

export const zodPageAndQueryProps = z.intersection(zodQueryProps, zodPageProps);
export type PageAndQueryProps = z.infer<typeof zodPageAndQueryProps>;
