// Adapted from Kokonut UI's spotlight-cards (https://kokonutui.com/docs/cards/spotlight-cards):
// magnetic 3D tilt + cursor spotlight + focus-dim siblings, reskinned to the
// Dotfumes brand tokens (serif headings, single gold accent, light-section
// surface) instead of the original multi-color SaaS feature-grid styling.
import type { LucideIcon } from 'lucide-react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { useRef, useState } from 'react';
import { cn } from '../../lib/utils';

const TILT_MAX = 9;
const TILT_SPRING = { stiffness: 300, damping: 28 } as const;
const GLOW_SPRING = { stiffness: 180, damping: 22 } as const;

export interface SpotlightItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

const ACCENT = '#c5a059';

interface CardProps {
  item: SpotlightItem;
  dimmed: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}

function Card({ item, dimmed, onHoverStart, onHoverEnd }: CardProps) {
  const Icon = item.icon;
  const cardRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const normX = useMotionValue(0.5);
  const normY = useMotionValue(0.5);

  const rawRotateX = useTransform(normY, [0, 1], reduceMotion ? [0, 0] : [TILT_MAX, -TILT_MAX]);
  const rawRotateY = useTransform(normX, [0, 1], reduceMotion ? [0, 0] : [-TILT_MAX, TILT_MAX]);

  const rotateX = useSpring(rawRotateX, TILT_SPRING);
  const rotateY = useSpring(rawRotateY, TILT_SPRING);
  const glowOpacity = useSpring(0, GLOW_SPRING);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduceMotion) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    normX.set((e.clientX - rect.left) / rect.width);
    normY.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseEnter = () => {
    glowOpacity.set(1);
    onHoverStart();
  };

  const handleMouseLeave = () => {
    normX.set(0.5);
    normY.set(0.5);
    glowOpacity.set(0);
    onHoverEnd();
  };

  return (
    <motion.div
      animate={{ scale: dimmed ? 0.96 : 1, opacity: dimmed ? 0.55 : 1 }}
      className={cn(
        'group relative flex flex-col gap-5 overflow-hidden border p-8',
        'border-on-light-subtle bg-brand-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]',
        'transition-[border-color] duration-300 hover:border-on-light-muted',
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      ref={cardRef}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(ellipse at 20% 20%, ${ACCENT}14, transparent 65%)` }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: glowOpacity,
          background: `radial-gradient(ellipse at 20% 20%, ${ACCENT}2e, transparent 65%)`,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-[55%] -translate-x-full -skew-x-12 bg-gradient-to-r from-transparent via-black/[0.03] to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[280%]"
      />

      <div
        className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full"
        style={{ background: `${ACCENT}18`, boxShadow: `inset 0 0 0 1px ${ACCENT}40` }}
      >
        <Icon size={18} strokeWidth={1.75} style={{ color: ACCENT }} />
      </div>

      <div className="relative z-10 flex flex-col gap-2">
        <h3 className="font-serif text-xl italic text-brand-black tracking-tight">{item.title}</h3>
        <p className="text-small leading-relaxed text-on-light-secondary">{item.description}</p>
      </div>

      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-px w-0 transition-all duration-500 group-hover:w-full"
        style={{ background: `linear-gradient(to right, ${ACCENT}, transparent)` }}
      />
    </motion.div>
  );
}

export interface SpotlightCardsProps {
  items: SpotlightItem[];
  className?: string;
}

export default function SpotlightCards({ items, className }: SpotlightCardsProps) {
  const [hoveredTitle, setHoveredTitle] = useState<string | null>(null);

  return (
    <div className={cn('relative grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {items.map((item) => (
        <Card
          dimmed={hoveredTitle !== null && hoveredTitle !== item.title}
          item={item}
          key={item.title}
          onHoverEnd={() => setHoveredTitle(null)}
          onHoverStart={() => setHoveredTitle(item.title)}
        />
      ))}
    </div>
  );
}
