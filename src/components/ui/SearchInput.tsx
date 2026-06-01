import * as React from "react";

import { Input, type InputProps } from "./Input";
import { InputBox, type InputBoxProps } from "./InputBox";

export type SearchInputProps = Omit<InputBoxProps, "type">;

export function SearchInput({
  autoComplete = "off",
  inputClassName,
  placeholder = "Search",
  ...props
}: SearchInputProps) {
  return (
    <InputBox
      {...props}
      autoComplete={autoComplete}
      inputClassName={inputClassName}
      placeholder={placeholder}
      type="search"
    />
  );
}
