import * as React from "react";

import { cn } from "../lib/utils";

/** A data table (shadcn). Wrapped so a wide table scrolls sideways instead of the page. */
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="relative w-full overflow-x-auto rounded-lg border">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead className={cn("bg-muted/50 [&_tr]:border-b", className)} {...props} />;
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr className={cn("border-b transition-colors hover:bg-muted/50", className)} {...props} />;
}

/** A header cell; a column header unless given `scope="row"` (the cell that names its row). */
function TableHead({ className, scope = "col", ...props }: React.ComponentProps<"th">) {
  return (
    <th
      scope={scope}
      className={cn(
        "h-10 whitespace-nowrap px-3 text-left align-middle",
        scope === "col" ? "font-medium text-muted-foreground" : "font-medium",
        className,
      )}
      {...props}
    />
  );
}

/** The arrow beside a sortable column's label. Decorative: the header's `aria-sort` tells screen readers. */
function TableSortIndicator({
  direction = "none",
  className,
}: {
  direction?: "ascending" | "descending" | "none";
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      data-direction={direction}
      viewBox="0 0 16 16"
      className={cn("inline-block size-3.5 shrink-0", direction === "none" && "opacity-30", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction !== "descending" && <path d="M5 6.5 8 3.5l3 3" />}
      {direction !== "ascending" && <path d="m5 9.5 3 3 3-3" />}
    </svg>
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("px-3 py-2 align-middle", className)} {...props} />;
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return <caption className={cn("mt-3 text-sm text-muted-foreground", className)} {...props} />;
}

export { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow, TableSortIndicator };
