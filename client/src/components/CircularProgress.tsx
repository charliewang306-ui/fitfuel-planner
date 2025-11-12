import { motion } from "framer-motion";

interface CircularProgressProps {
  current: number;
  target: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  unit?: string;
  color?: string;
}

export function CircularProgress({
  current,
  target,
  size = 192,
  strokeWidth = 12,
  label = "",
  unit = "",
  color = "hsl(var(--chart-1))"
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min((current / target) * 100, 100);
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2" data-testid="circular-progress">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          opacity={0.2}
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
        
        {/* Center text */}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          className="transform rotate-90 font-mono font-semibold"
          style={{ fontSize: size * 0.18, fill: "hsl(var(--foreground))" }}
        >
          {Math.round(current)}
        </text>
        <text
          x={size / 2}
          y={size / 2 + size * 0.12}
          textAnchor="middle"
          dominantBaseline="middle"
          className="transform rotate-90 text-muted-foreground"
          style={{ fontSize: size * 0.08 }}
        >
          / {Math.round(target)} {unit}
        </text>
      </svg>
      
      {label && (
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
      )}
    </div>
  );
}
