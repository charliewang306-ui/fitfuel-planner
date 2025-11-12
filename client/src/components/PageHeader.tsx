import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  onBack?: () => void;
}

/**
 * Reusable page header with back button
 * Usage: <PageHeader title="AI智能教练" onBack={() => setLocation('/')} />
 */
export function PageHeader({ title, onBack }: PageHeaderProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  return (
    <div className="flex items-center gap-3 mb-4">
      <Button
        variant="outline"
        size="sm"
        onClick={handleBack}
        className="h-9 px-3"
        data-testid="button-page-back"
        aria-label="返回"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        返回
      </Button>
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
    </div>
  );
}
