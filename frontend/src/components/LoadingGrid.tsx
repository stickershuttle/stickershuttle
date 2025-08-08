import React from "react";

type LoadingGridProps = {
  count?: number;
};

export default function LoadingGrid({ count = 12 }: LoadingGridProps) {
  const items = Array.from({ length: count });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
      {items.map((_, idx) => (
        <div
          key={idx}
          className="rounded-lg overflow-hidden"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow:
              "rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="aspect-square w-full animate-pulse" style={{ backgroundColor: "#cae0ff" }} />
          <div className="p-3">
            <div className="h-3 w-3/4 bg-white/10 rounded mb-2 animate-pulse" />
            <div className="h-3 w-1/2 bg-white/10 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}


