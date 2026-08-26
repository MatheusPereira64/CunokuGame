import { motion } from "framer-motion";
import { Smartphone } from "lucide-react";
import { useI18n } from "@/contexts/i18n-context";

/**
 * Overlay fullscreen pedindo para girar o aparelho para paisagem.
 * Usado na tela de jogo — a mesa é projetada para landscape.
 */
export function LandscapePrompt() {
  const { t } = useI18n();

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-neutral-950 text-white p-8 gap-6">
      <motion.div
        animate={{ rotate: [0, 90, 90, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", times: [0, 0.35, 0.65, 1] }}
        className="w-20 h-28 rounded-2xl border-2 border-yellow-400/80 bg-neutral-800 flex items-center justify-center shadow-xl shadow-yellow-500/10"
      >
        <Smartphone className="w-10 h-10 text-yellow-400" />
      </motion.div>
      <div className="text-center space-y-2 max-w-xs">
        <h2 className="text-xl font-display font-bold text-yellow-400">{t("game.rotateDevice")}</h2>
        <p className="text-white/70 text-sm leading-relaxed">{t("game.rotateDeviceDesc")}</p>
      </div>
    </div>
  );
}
