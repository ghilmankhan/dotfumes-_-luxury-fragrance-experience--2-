import { FlaskConical, Leaf, Lock, MessageCircle, RotateCcw, ShieldCheck } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import SpotlightCards, { type SpotlightItem } from '../kokonutui/spotlight-cards';
import { ShimmerText } from '../kokonutui/shimmer-text';
import { duration, easing } from '../../styles/tokens/motion';

const TRUST_ITEMS: SpotlightItem[] = [
  {
    icon: FlaskConical,
    title: 'Slow Extraction',
    description: 'Measured batches protect character, texture, and material integrity.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified Payment Review',
    description: 'Every order is manually checked before it moves into delivery coordination.',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp & Email Concierge',
    description: 'Direct, human coordination for confirmation, delivery, and questions.',
  },
  {
    icon: Lock,
    title: 'Discreet Delivery',
    description: 'Private packaging and coordination, from confirmation through arrival.',
  },
  {
    icon: RotateCcw,
    title: 'Case-by-Case Support',
    description: 'Return and exchange requests are resolved directly with our team.',
  },
  {
    icon: Leaf,
    title: 'Responsible Materials',
    description: 'Traceable ingredients and refillable objects guide our production roadmap.',
  },
];

export const TrustSignals = () => {
  const reduceMotion = useReducedMotion();

  return (
    <section className="bg-brand-white py-32 px-8 md:py-48 md:px-16 lg:px-24">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: reduceMotion ? 0 : duration.base }}
          className="mb-16 flex items-center gap-6"
        >
          <span className="text-caption font-bold uppercase tracking-widest text-brand-gold md:text-small">
            The Assurance
          </span>
          <div aria-hidden="true" className="h-px w-24 bg-accent-gold-muted" />
        </motion.div>

        <motion.h2
          initial={reduceMotion ? false : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: reduceMotion ? 0 : duration.cinematic, ease: easing.cinematic }}
          className="mb-16 max-w-3xl font-serif text-5xl italic leading-none tracking-tight text-brand-black md:text-7xl"
        >
          Why <ShimmerText text="Dotfumes." /> <br />
          <span className="text-on-light-faint">A quieter way to buy luxury.</span>
        </motion.h2>

        <SpotlightCards items={TRUST_ITEMS} />
      </div>
    </section>
  );
};

export default TrustSignals;
