// components/inventory/inventory-search.tsx
"use client";

import React, { useRef } from "react";
import { InventorySearchBar } from "@/components/inventory/inventory-search-bar";

export interface InventorySearchProps {
  value: string;
  onValueChange: (v: string) => void;
  onSearchSubmit: (term: string) => void;
  onClear: () => void;
  isSearching: boolean;
}

export function InventorySearch({
  value,
  onValueChange,
  onSearchSubmit,
  onClear,
  isSearching,
}: InventorySearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onSearchSubmit(value);
    }
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearchSubmit(value);
  };

  const handleClearWithFocus = () => {
    onClear();
    inputRef.current?.focus();
  };

  return (
    <InventorySearchBar
      ref={inputRef}
      value={value}
      onChange={onValueChange}
      onClear={handleClearWithFocus}
      onKeyDown={handleKeyDown}
      onSubmit={handleFormSubmit}
      isLoading={isSearching}
    />
  );
}

InventorySearch.displayName = "InventorySearch";

export default InventorySearch;
