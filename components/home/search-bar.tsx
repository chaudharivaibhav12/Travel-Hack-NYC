"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";

/**
 * DESIGN.md §7 (SearchBar) — full-width pill, leading magnifier in
 * muted-foreground, trailing clear only when a value exists, focus ring-2 with
 * the border going transparent.
 */
export function SearchBar({
  placeholder = "Where do you want to go?",
}: {
  placeholder?: string;
}) {
  const [value, setValue] = useState("");

  return (
    <div className="flex items-center gap-3 rounded-full border border-border bg-card px-5 py-3.5 shadow-page transition-[box-shadow,border-color] duration-[140ms] ease-out focus-within:border-transparent focus-within:ring-2 focus-within:ring-ring">
      <Search
        size={18}
        strokeWidth={1.5}
        className="shrink-0 text-muted-foreground"
        aria-hidden="true"
      />

      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 border-none bg-transparent text-[15px] leading-5 text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
      />

      {value.length > 0 ? (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Clear search"
          className="-mr-1 shrink-0 rounded-full p-1 text-muted-foreground transition-colors duration-[140ms] hover:bg-accent hover:text-accent-foreground"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      ) : null}
    </div>
  );
}
