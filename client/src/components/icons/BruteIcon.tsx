/**
 * Rosto de brutamontes desenhado para o jogo. Usa só currentColor: a pele é a cor do destaque
 * em tom mais claro e cabelo e traços ficam no tom cheio, então trocar a cor recolore o rosto.
 */
export function BruteIcon({ className }: { className?: string; strokeWidth?: string | number }) {
  return (
    <svg viewBox="0 0 512 512" fill="currentColor" className={className} aria-hidden="true">
      {/* Pele: cabeça larga, orelhas e maxilar quadrado */}
      <path
        opacity={0.45}
        d="M128 190C168 160 344 160 384 190C398 230 400 270 398 300C420 292 438 310 434 340C430 370 412 388 390 388C376 440 340 486 256 486C172 486 136 440 122 388C100 388 82 370 78 340C74 310 92 292 114 300C112 270 114 230 128 190Z"
      />
      {/* Cabelo espetado com franja irregular */}
      <path d="M108 232 82 184l32 2-22-56 48 20-8-62 48 40 16-68 42 52 32-64 26 60 44-42 6 62 50-26-16 52 48-6-32 42 20 46-44-32-20 28-26-32-26 30-26-34-26 36-26-34-26 32-26-30-24 32-14-28z" />
      {/* Ruga da testa e sobrancelhas franzidas */}
      <path d="M220 248c24-8 48-8 72 0v10c-24-6-48-6-72 0z" />
      <path d="M132 264l94 28-4 24-96-26z" />
      <path d="M380 264l6 26-96 26-4-24z" />
      {/* Olhos fechados */}
      <path d="M150 322c22 14 48 14 72 6v12c-26 10-52 8-72-6z" />
      <path d="M362 322c-22 14-48 14-72 6v12c26 10 52 8 72-6z" />
      {/* Nariz largo */}
      <path d="M232 330l-10 56c16 16 52 16 68 0l-10-56h-12l6 50c-12 10-24 10-36 0l6-50z" />
      {/* Sorriso de canto */}
      <path d="M170 424c50 22 120 20 186-20l10 10c-58 56-150 60-202 22z" />
    </svg>
  );
}
