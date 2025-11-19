// components/ui/empty-state.tsx
import React from "react";

export interface EmptyStateProps {
  title?: string;
  message: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  message,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 ${className}`}
    >
      {icon && (
        <div className="mb-4 text-6xl text-muted-foreground">{icon}</div>
      )}
      {title && <h2 className="text-xl font-semibold mb-2">{title}</h2>}
      <p className="text-muted-foreground mb-6">{message}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
