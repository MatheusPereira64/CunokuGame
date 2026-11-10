import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { useLatest } from "./useLatest";
import { useI18n } from "@/contexts/i18n-context";

/** Mantém a tela de `.cunoku-shake` (index.css) no mesmo instante do impacto. */
const IMPACT_SECONDS = 0.35;
const SECONDS = 2.8;
const SPARKS = Array.from({ length: 14 }, (_, i) => (i / 14) * Math.PI * 2);

/** Fração da animação inteira em que um instante cai, para os `times` do Framer Motion. */
const at = (seconds: number) => seconds / SECONDS;

/** Anúncio de tela cheia do fim de jogo. Não captura toques: a partida segue por baixo. */
export function CunokuCallOverlay({ playerName, onComplete }: { playerName: string; onComplete: () => void }) {
  const { t } = useI18n();
  const reducedMotion = useReducedMotion();
  const [impacted, setImpacted] = useState(false);

  const onCompleteRef = useLatest(onComplete);
  useEffect(() => {
    const timer = setTimeout(() => onCompleteRef.current(), SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [onCompleteRef]);

  useEffect(() => {
    const timer = setTimeout(() => setImpacted(true), IMPACT_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, []);

  const fade = {
    initial: { opacity: 0 },
    animate: { opacity: [0, 1, 1, 0] },
    transition: { duration: SECONDS, times: [0, at(0.2), at(2.4), 1] },
  };

  return (
    <div className="fixed inset-0 z-[10000] pointer-events-none overflow-hidden flex items-center justify-center" role="status">
      <motion.div
        className="absolute inset-0"
        style={{ background: "radial-gradient(circle, rgba(127,29,29,0.92) 0%, rgba(10,5,5,0.94) 70%)" }}
        {...fade}
      />

      <motion.div
        className="absolute select-none font-display font-black text-white"
        style={{ fontSize: "min(70vw, 120vh)", lineHeight: 1 }}
        initial={{ opacity: 0, scale: 1.2 }}
        animate={{ opacity: [0, 0.1, 0.1, 0], scale: [1.2, 1, 1, 1.05] }}
        transition={{ duration: SECONDS, times: [0, at(IMPACT_SECONDS), at(2.4), 1] }}
        aria-hidden="true"
      >
        終
      </motion.div>

      {impacted && !reducedMotion && (
        <>
          <motion.div
            className="absolute inset-0 bg-white"
            initial={{ opacity: 0.85 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
          />
          {[0.7, 1.05].map((duration) => (
            <motion.div
              key={duration}
              className="absolute rounded-full border-[6px] border-amber-300"
              style={{ width: "20vh", height: "20vh" }}
              initial={{ opacity: 0.9, scale: 0.4 }}
              animate={{ opacity: 0, scale: 9 }}
              transition={{ duration, ease: "easeOut" }}
            />
          ))}
          {SPARKS.map((angle) => (
            <motion.div
              key={angle}
              className="absolute h-2 w-2 rounded-full bg-amber-300"
              initial={{ opacity: 1, x: 0, y: 0, scale: 1.6 }}
              animate={{ opacity: 0, x: Math.cos(angle) * 55 + "vw", y: Math.sin(angle) * 55 + "vh", scale: 0.3 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
          ))}
        </>
      )}

      <div className="relative flex w-full flex-col items-center">
        <div className="relative flex w-full justify-center">
          <motion.div
            className="absolute left-0 right-0 top-1/2 border-y-4 border-amber-300 bg-red-700 shadow-2xl"
            style={{ height: "min(21vw, 42vh)", y: "-50%" }}
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: 1, opacity: [1, 1, 0] }}
            transition={{
              scaleX: { delay: reducedMotion ? 0 : IMPACT_SECONDS, duration: 0.25, ease: "easeOut" },
              opacity: { duration: SECONDS, times: [0, at(2.4), 1] },
            }}
          />
          <motion.div
            className="relative font-display font-black leading-none tracking-wider text-white"
            style={{ fontSize: "min(15vw, 30vh)", textShadow: "0 0 32px rgba(252,211,77,0.9), 0 6px 0 #450a0a" }}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 5 }}
            animate={reducedMotion ? { opacity: [0, 1, 1, 0] } : { opacity: [0, 1, 1, 0], scale: [5, 1, 1, 1.08] }}
            transition={{
              duration: SECONDS,
              times: [0, at(IMPACT_SECONDS), at(2.4), 1],
              ease: ["easeIn", "linear", "easeIn"],
            }}
          >
            CUNOKU!
          </motion.div>
        </div>
        <motion.div
          className="relative mt-[min(5vw,10vh)] max-w-[90vw] rounded-full bg-black/70 px-5 py-2 text-center text-sm font-bold text-amber-100 sm:text-lg"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: [0, 1, 1, 0], y: [12, 0, 0, 0] }}
          transition={{ duration: SECONDS, times: [0, at(0.7), at(2.4), 1] }}
        >
          {t("game.cunokuDeclaredDesc").replace("{player}", playerName)}
        </motion.div>
      </div>
    </div>
  );
}
