import { motion } from "framer-motion";
import { PlayingCard } from "./PlayingCard";
import { Card } from "@shared/schema";
import { cn } from "@/lib/utils";

interface CardFlipAnimationProps {
  card: Card;
  isRevealed: boolean;
  className?: string;
}

export function CardFlipAnimation({ card, isRevealed, className }: CardFlipAnimationProps) {
  return (
    <div className={cn("relative", className)} style={{ perspective: "1000px" }}>
      <motion.div
        animate={{
          rotateY: isRevealed ? 0 : 180
        }}
        transition={{
          duration: 0.6,
          ease: "easeInOut"
        }}
        style={{
          transformStyle: "preserve-3d",
          position: "relative",
          width: "100%",
          height: "100%"
        }}
      >
        {/* Back of card */}
        <motion.div
          animate={{
            opacity: isRevealed ? 0 : 1,
            rotateY: 180
          }}
          transition={{
            duration: 0.6,
            ease: "easeInOut"
          }}
          style={{
            backfaceVisibility: "hidden",
            position: "absolute",
            width: "100%",
            height: "100%"
          }}
        >
          <PlayingCard card={undefined} hidden={true} className={className} />
        </motion.div>
        
        {/* Front of card */}
        <motion.div
          animate={{
            opacity: isRevealed ? 1 : 0,
            rotateY: 0
          }}
          transition={{
            duration: 0.6,
            ease: "easeInOut"
          }}
          style={{
            backfaceVisibility: "hidden",
            position: "absolute",
            width: "100%",
            height: "100%"
          }}
        >
          <PlayingCard card={card} hidden={false} className={className} />
        </motion.div>
      </motion.div>
    </div>
  );
}

