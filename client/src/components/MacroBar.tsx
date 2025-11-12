import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface MacroBarProps {
  icon: LucideIcon;
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
  iconColor?: string;
}

export function MacroBar({
  icon: Icon,
  label,
  current,
  target,
  unit,
  color,
  iconColor
}: MacroBarProps) {
  const { t } = useTranslation();
  const progress = Math.min((current / target) * 100, 100);
  const remaining = Math.max(target - current, 0);

  return (
    <div 
      className="flex items-center gap-3 h-12 rounded-lg bg-card p-3"
      data-testid={`macro-bar-${label.toLowerCase()}`}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 ${iconColor || 'text-foreground'}`}>
        <Icon className="w-5 h-5" strokeWidth={2} />
      </div>

      {/* Label */}
      <div className="flex-shrink-0 w-16">
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>

      {/* Progress bar */}
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ 
            background: `linear-gradient(90deg, ${color}, ${color})`
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Values */}
      <div className="flex-shrink-0 text-right min-w-[100px]">
        <span className="font-mono text-sm font-semibold text-foreground">
          {current.toFixed(1)}
        </span>
        <span className="text-xs text-muted-foreground mx-1">/</span>
        <span className="font-mono text-sm text-muted-foreground">
          {target.toFixed(1)}
        </span>
        <span className="text-xs text-muted-foreground ml-1">{unit}</span>
      </div>
      
      {/* Remaining (hidden on small screens) */}
      <div className="hidden sm:block flex-shrink-0 text-right min-w-[60px]">
        <span className="text-xs text-muted-foreground">
          {t('dashboard:remaining')} {remaining.toFixed(1)}
        </span>
      </div>
    </div>
  );
}
