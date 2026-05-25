import { SearchInput } from "@/components";

export default function SearchForm({ id }: { id: string }) {
  return (
    <form action="/products" className="min-w-0" method="get" role="search">
      <SearchInput
        hideLabel
        id={id}
        label="Search products"
        name="q"
        placeholder="Search products"
      />
    </form>
  );
}
