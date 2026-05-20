import * as React from "react";

import { Input, type InputProps } from "./Input";

export type SearchInputProps = Omit<InputProps, "type">;

export function SearchInput({
  autoComplete = "off",
  inputClassName,
  placeholder = "Search",
  ...props
}: SearchInputProps) {
  return (
    <Input
      {...props}
      autoComplete={autoComplete}
      inputClassName={inputClassName}
      placeholder={placeholder}
      type="search"
    />
  );
}
