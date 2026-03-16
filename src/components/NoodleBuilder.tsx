import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { noodleBases, noodleToppings, noodleSauces } from '@/data/menu';
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
  const { t, isRTL } = useI18n();
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<NoodleConfig>({ base: null, toppings: [], sauce: null });
  const addItem = useCartStore((s) => s.addItem);

  const STEPS = [t.noodle.base, t.noodle.toppings, t.noodle.sauce];

  const reset = () => {
    setStep(0);
    setConfig({ base: null, toppings: [], sauce: null });
  };

  const handleClose = () => { reset(); onClose(); };

  const toggleTopping = (topping: OptionChoice) => {
    setConfig((prev) => ({
      ...prev,
      toppings: prev.toppings.find((tp) => tp.id === topping.id)
        ? prev.toppings.filter((tp) => tp.id !== topping.id)
        : [...prev.toppings, topping],
    }));
  };

  const basePrice = 38;
  const toppingsPrice = config.toppings.reduce((s, tp) => s + tp.priceModifier, 0);
  const total = basePrice + toppingsPrice;

  const canNext = step === 0 ? !!config.base : step === 1 ? true : !!config.sauce;

  const handleAdd = () => {
    const options = [
      { groupId: 'base', groupTitle: t.noodle.base, selectedChoices: config.base ? [config.base] : [] },
      { groupId: 'toppings', groupTitle: t.noodle.toppings, selectedChoices: config.toppings },
      { groupId: 'sauce', groupTitle: t.noodle.sauce, selectedChoices: config.sauce ? [config.sauce] : [] },
    ].filter((o) => o.selectedChoices.length > 0);

    addItem(
      {
        id: 'noodle-bowl',
        name: t.noodle.custom_name,
        slug: 'custom-noodle-bowl',
        categoryId: 'noodles',
        description: `${config.base?.name || ''} with ${config.sauce?.name || ''} sauce`,
        price: basePrice,
        image: noodlesImg,
        tags: ['noodles'],
        isAvailable: true,
        isCustomizable: true,
        options: [],
        isFeatured: false,
        sortOrder: 1,
      },
      1,
      options,
      ''
    );
    handleClose();
  };

  const BackIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="noodle-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            key="noodle-modal"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl max-h-[85vh] flex flex-col md:max-w-lg md:mx-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <div>
                <h2 className="font-display text-lg tracking-tight text-foreground">{t.noodle.title}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t.noodle.step_of.replace('{{current}}', String(step + 1)).replace('{{total}}', '3')} — {STEPS[step]}
                </p>
              </div>
              <button onClick={handleClose} className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center active:scale-95">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress */}
            <div className="flex gap-1 px-5 mb-4 flex-shrink-0">
              {STEPS.map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-secondary'}`} />
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 pb-4">
              {step === 0 && (
                <div className="grid grid-cols-1 gap-2">
                  {noodleBases.map((base) => (
                    <button
                      key={base.id}
                      onClick={() => setConfig((p) => ({ ...p, base }))}
                      className={`h-14 px-5 rounded-2xl text-start font-semibold text-sm flex items-center transition-all active:scale-[0.98] ${
                        config.base?.id === base.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                      }`}
                    >
                      {base.name}
                    </button>
                  ))}
                </div>
              )}

              {step === 1 && (
                <div className="flex flex-wrap gap-2">
                  {noodleToppings.map((topping) => (
                    <button
                      key={topping.id}
                      onClick={() => toggleTopping(topping)}
                      className={`h-10 px-4 rounded-full text-sm font-medium transition-all active:scale-95 ${
                        config.toppings.find((tp) => tp.id === topping.id)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground'
                      }`}
                    >
                      {topping.name}
                      {topping.priceModifier > 0 && ` +₪${topping.priceModifier}`}
                    </button>
                  ))}
                </div>
              )}

              {step === 2 && (
                <div className="grid grid-cols-2 gap-2">
                  {noodleSauces.map((sauce) => (
                    <button
                      key={sauce.id}
                      onClick={() => setConfig((p) => ({ ...p, sauce }))}
                      className={`h-14 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98] ${
                        config.sauce?.id === sauce.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                      }`}
                    >
                      {sauce.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-5 py-4 border-t border-border bg-card safe-bottom">
              <div className="flex items-center gap-3">
                {step > 0 && (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center active:scale-95"
                  >
                    <BackIcon className="w-5 h-5" />
                  </button>
                )}
                {step < 2 ? (
                  <button
                    onClick={() => canNext && setStep(step + 1)}
                    disabled={!canNext}
                    className="flex-1 h-12 rounded-full bg-accent text-accent-foreground font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-40"
                  >
                    {t.noodle.next} <NextIcon className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleAdd}
                    disabled={!canNext}
                    className="flex-1 h-12 rounded-full bg-primary text-primary-foreground font-bold text-sm active:scale-95 transition-transform disabled:opacity-40"
                  >
                    {t.noodle.add_to_cart} — ₪{total}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NoodleBuilder;
