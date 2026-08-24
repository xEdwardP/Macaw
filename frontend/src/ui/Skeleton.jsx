import { cn } from "./cn";

export default function Skeleton({ className }) {
  return <div className={cn("bg-surface-sunken rounded animate-pulse", className)} />;
}

export function SkeletonText({ lines = 2, className }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn("h-3", index === lines - 1 ? "w-1/2" : "w-full")}
        />
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 5, className }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-surface rounded-xl p-5 border border-line-subtle">
          <div className="flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-1/3 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-surface rounded-xl p-5 border border-line-subtle">
          <Skeleton className="h-3 w-20 mb-3" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}
