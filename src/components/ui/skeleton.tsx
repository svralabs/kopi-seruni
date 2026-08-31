import React from 'react';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-[#EBE7DF]/80 ${className || ''}`}
      {...props}
    />
  );
}
