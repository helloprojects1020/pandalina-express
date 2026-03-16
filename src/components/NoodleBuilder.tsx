import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useMenu } from '@/hooks/useMenu';
import type { OptionChoice, NoodleConfig } from '@/types/menu';
import { useCartStore } from '@/store/cartStore';
import { useI18n } from '@/i18n/context';
import { localizedName } from '@/lib/localize';
import noodlesImg from '@/assets/noodles.jpg';

interface NoodleBuilderProps {
  open: boolean;
  onClose: () => void;
}

const NoodleBuilder = ({ open, onClose }: NoodleBuilderProps) => {
  const { t, isRTL, locale } = useI18n();
  const { noodleBases, noodleToppings, noodleSauces, menuItems } = useMenu();
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<NoodleConfig>({ base: null, toppings: [], sauce: null });
  const addItem = useCartStore((s) => s.addItem);

  const STEPS = [t.noodle.base, t.noodle.toppings, t.noodle.sauce];

  const reset = () => {
    setStep(0);
    setConfig({ base: null, toppings: [], sauce: null });
  };

  const handleClose = () => { reset(); onClose(); };

  const basePrice = 38;
  const extrasTotal =
    (config.base?.priceModifier ?? 0) +
    config.toppings.reduce((s, tp) => s + tp.priceModifier, 0) +
    (config.sauce?.priceModifier ?? 0);
  const total = basePrice + extrasTotal;

  const canNext =
    (step === 0 && config.base !== null) ||
    (step === 1 && config.toppings.length > 0) ||
    (step === 2 && config.sauce !== null);

  const handleAddToCart = () => {
    const noodleItem = menuItems.find(m => m.slug === 'build-your-noodle-bowl');
    if (!noodleItem) return;

    const selectedOptions = [
      ...(config.base
        ? [{ groupId: 'base', groupTitle: t.noodle.base, selectedChoices: [config.base] }]
        : []),
      ...(config.toppings.length
        ? [{ groupId: 'toppings', groupTitle: t.noodle.toppings, selectedChoices: config.toppings }]
        : []),
      ...(config.sauce
        ? [{ groupId: 'sauce', groupTitle: t.noodle.sauce, selectedChoices: [config.sauce] }]
        : []),
    ];

    addItem({ ...noodleItem, price: total }, 1, selectedOptions, '');
    handleClose();
  };

  const toggleTopping = (tp: OptionChoice) => {
    setConfig((c) => ({
      ...c,
      toppings: c.toppings.some((t) => t.id === tp.id)
        ? c.toppings.filter((t) => t.id !== tp.id)
        : [...c.toppings, tp],
    }));
  };

  const NextIcon = isRTL ? ChevronLeft : ChevronRight;
  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;

  const renderStep = () => {
    const choices = step === 0 ? noodleBases : step === 1 ? noodleToppings : noodleSauces;

    return (
      <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto px-1 pb-2">
        {choices.map((choice) => {
          const isSelected =
            step === 0
              ? config.base?.id === choice.id
              : step === 1
              ? config.toppings.some((t) => t.id === choice.id)
              : config.sauce?.id === choice.id;

          return (
            <button
              key={choice.id}
              onClick={() => {
                if (step === 0) setConfig((c) => ({ ...c, base: choice }));
                else if (step === 1) toggleTopping(choice);
                else setConfig((c) => ({ ...c, sauce: choice }));
              }}
              className={`rounded-xl p-3 text-start transition-all border-2 ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent bg-secondary/60 hover:bg-secondary'
              }`}
            >
              <p className="font-semibold text-sm text-foreground">{localizedName(choice, locale)}</p>
              {choice.priceModifier > 0 && (
                <p className="text-xs text-primary mt-0.5">+₪{choice.priceModifier}</p>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
        >
          <div className="absolute inset-0 bg-accent/60" onClick={handleClose} />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="relative w-full md:max-w-md bg-card rounded-t-3xl md:rounded-3xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="relative h-32 bg-accent overflow-hidden">
              <img src={noodlesImg} alt="" className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 flex items-end p-4">
                <div>
                  <h2 className="font-display text-lg text-primary-foreground">{t.noodle.title}</h2>
                  <p className="text-xs text-primary-foreground/60">{t.noodle.description}</p>
                </div>
              </div>
              <button onClick={handleClose} className="absolute top-3 end-3 h-8 w-8 rounded-full bg-accent/80 flex items-center justify-center">
                <X className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>

            {/* Steps indicator */}
            <div className="flex gap-2 px-4 py-3 border-b border-border">
              {STEPS.map((label, i) => (
                <div key={i} className="flex-1">
                  <div className={`h-1 rounded-full mb-1 ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
                  <p className={`text-[10px] font-semibold ${i === step ? 'text-primary' : 'text-muted-foreground'}`}>
                    {label}
                  </p>
                </div>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="font-bold text-foreground mb-3">{STEPS[step]}</h3>
              {renderStep()}
            </div>

            {/* Footer */}
            <div className="border-t border-border p-4 flex items-center justify-between gap-3">
              {step > 0 ? (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="h-11 px-5 rounded-full bg-secondary text-secondary-foreground font-semibold text-sm flex items-center gap-1"
                >
                  <PrevIcon className="w-4 h-4" />
                  {t.noodle.next}
                </button>
              ) : (
                <div />
              )}

              <div className="text-end">
                <p className="text-xs text-muted-foreground">{t.noodle.step_of}</p>
                <p className="font-display text-lg text-primary">₪{total}</p>
              </div>

              {step < 2 ? (
                <button
                  onClick={() => canNext && setStep((s) => s + 1)}
                  disabled={!canNext}
                  className="h-11 px-5 rounded-full bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-1 disabled:opacity-40"
                >
                  {t.noodle.next}
                  <NextIcon className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleAddToCart}
                  disabled={!canNext}
                  className="h-11 px-5 rounded-full bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40"
                >
                  {t.noodle.add_to_cart}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NoodleBuilder;
