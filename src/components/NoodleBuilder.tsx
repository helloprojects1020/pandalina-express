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
