import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapseCardProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function CollapseCard({ 
  title, 
  subtitle, 
  defaultOpen = false, 
  children,
  className 
}: CollapseCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className={cn("rounded-2xl shadow-sm border bg-white/80 backdrop-blur", className)}>
      <CardHeader 
        className="cursor-pointer flex flex-row items-center justify-between space-y-0 pb-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <button
          className="rounded-md p-2 hover-elevate transition-transform"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          data-testid={`button-toggle-${title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
      </CardHeader>
      
      {isOpen && (
        <CardContent className="pt-4">
          {children}
        </CardContent>
      )}
    </Card>
  );
}
