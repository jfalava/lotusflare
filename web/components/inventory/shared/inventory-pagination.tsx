import React from "react";
import { Button } from "@/components/ui/button";
import { PAGE_SIZE } from "@/components/inventory/shared/inventory-constants";

interface InventoryPaginationProps {
  currentPage: number;
  totalItems: number;
  onPageChange: (newPage: number) => void;
  pageSize?: number;
}

export const InventoryPagination: React.FC<InventoryPaginationProps> = ({
  currentPage,
  totalItems,
  onPageChange,
  pageSize = PAGE_SIZE,
}) => {
  if (totalItems <= pageSize) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const handlePageChangeInternal = (newPage: number) => {
    onPageChange(newPage);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="flex justify-center items-center gap-2 mt-4 mb-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handlePageChangeInternal(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
      >
        Previous
      </Button>
      <span className="text-sm font-medium text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          handlePageChangeInternal(Math.min(totalPages, currentPage + 1))
        }
        disabled={currentPage === totalPages}
      >
        Next
      </Button>
    </div>
  );
};
