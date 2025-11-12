import { motion } from "framer-motion";

interface WaterBottleProps {
  current: number;
  target: number;
  size?: "sm" | "md" | "lg";
}

export function WaterBottle({ current, target, size = "md" }: WaterBottleProps) {
  const progress = Math.min((current / target) * 100, 100);
  
  const dimensions = {
    sm: { width: 160, height: 320 },
    md: { width: 192, height: 384 },
    lg: { width: 240, height: 480 }
  };
  
  const { width, height } = dimensions[size];
  const waterHeight = (progress / 100) * (height - 40); // Leave room for cap

  return (
    <div className="flex flex-col items-center gap-4" data-testid="water-bottle">
      {/* Bottle SVG */}
      <div className="relative" style={{ width, height }}>
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="overflow-visible"
        >
          {/* Bottle outline */}
          <defs>
            <linearGradient id="bottleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--border))" stopOpacity="0.3" />
              <stop offset="100%" stopColor="hsl(var(--border))" stopOpacity="0.6" />
            </linearGradient>
            
            <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity="0.8" />
              <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity="0.95" />
            </linearGradient>
            
            <clipPath id="bottleClip">
              <path d={`
                M ${width * 0.35} 30
                L ${width * 0.35} 50
                Q ${width * 0.3} 60, ${width * 0.3} 80
                L ${width * 0.3} ${height - 40}
                Q ${width * 0.3} ${height - 20}, ${width * 0.35} ${height - 10}
                L ${width * 0.65} ${height - 10}
                Q ${width * 0.7} ${height - 20}, ${width * 0.7} ${height - 40}
                L ${width * 0.7} 80
                Q ${width * 0.7} 60, ${width * 0.65} 50
                L ${width * 0.65} 30
                Z
              `} />
            </clipPath>
          </defs>
          
          {/* Bottle cap */}
          <rect
            x={width * 0.4}
            y={10}
            width={width * 0.2}
            height={20}
            rx={4}
            fill="hsl(var(--muted))"
            stroke="hsl(var(--border))"
            strokeWidth={2}
          />
          
          {/* Bottle body outline */}
          <path
            d={`
              M ${width * 0.35} 30
              L ${width * 0.35} 50
              Q ${width * 0.3} 60, ${width * 0.3} 80
              L ${width * 0.3} ${height - 40}
              Q ${width * 0.3} ${height - 20}, ${width * 0.35} ${height - 10}
              L ${width * 0.65} ${height - 10}
              Q ${width * 0.7} ${height - 20}, ${width * 0.7} ${height - 40}
              L ${width * 0.7} 80
              Q ${width * 0.7} 60, ${width * 0.65} 50
              L ${width * 0.65} 30
              Z
            `}
            fill="url(#bottleGradient)"
            stroke="hsl(var(--border))"
            strokeWidth={3}
          />
          
          {/* Water fill with animation */}
          <g clipPath="url(#bottleClip)">
            <motion.rect
              x={width * 0.3}
              y={height - 10 - waterHeight}
              width={width * 0.4}
              height={waterHeight}
              fill="url(#waterGradient)"
              initial={{ y: height - 10, height: 0 }}
              animate={{ y: height - 10 - waterHeight, height: waterHeight }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
            
            {/* Wave effect on top of water */}
            {waterHeight > 0 && (
              <motion.path
                d={`
                  M ${width * 0.3} ${height - 10 - waterHeight}
                  Q ${width * 0.4} ${height - 10 - waterHeight - 8}, ${width * 0.5} ${height - 10 - waterHeight}
                  Q ${width * 0.6} ${height - 10 - waterHeight + 8}, ${width * 0.7} ${height - 10 - waterHeight}
                  L ${width * 0.7} ${height - 10 - waterHeight + 10}
                  L ${width * 0.3} ${height - 10 - waterHeight + 10}
                  Z
                `}
                fill="hsl(var(--chart-2))"
                opacity={0.6}
                animate={{
                  d: [
                    `M ${width * 0.3} ${height - 10 - waterHeight}
                     Q ${width * 0.4} ${height - 10 - waterHeight - 8}, ${width * 0.5} ${height - 10 - waterHeight}
                     Q ${width * 0.6} ${height - 10 - waterHeight + 8}, ${width * 0.7} ${height - 10 - waterHeight}
                     L ${width * 0.7} ${height - 10 - waterHeight + 10}
                     L ${width * 0.3} ${height - 10 - waterHeight + 10}
                     Z`,
                    `M ${width * 0.3} ${height - 10 - waterHeight}
                     Q ${width * 0.4} ${height - 10 - waterHeight + 8}, ${width * 0.5} ${height - 10 - waterHeight}
                     Q ${width * 0.6} ${height - 10 - waterHeight - 8}, ${width * 0.7} ${height - 10 - waterHeight}
                     L ${width * 0.7} ${height - 10 - waterHeight + 10}
                     L ${width * 0.3} ${height - 10 - waterHeight + 10}
                     Z`
                  ]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut"
                }}
              />
            )}
          </g>
        </svg>
        
        {/* Progress text overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="font-mono text-2xl font-bold text-foreground">
              {current.toFixed(0)}
            </div>
            <div className="text-sm text-muted-foreground">
              / {target.toFixed(0)} oz
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {progress.toFixed(0)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
