import { cn } from "@/lib/utils";

export const MetricCard = ({
  label,
  value,
  valueClass = "",
}: {
  label: string;
  value: string | number;
  valueClass?: string;
}) => (
  <div className="p-3 bg-muted rounded-md">
    <div className="text-sm text-muted-foreground">{label}</div>
    <div className={cn("sm:text-2xl text-xl font-bold", valueClass)}>{value ?? "—"}</div>
  </div>
);
