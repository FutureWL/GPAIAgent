'use client';

import * as React from 'react';
import { icons as _icons, LucideProps, createLucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Re-export icons map so callers can use IconName without importing from two places
export { icons } from '@/lib/icons';
export type { IconName } from '@/lib/icons';

export interface IconProps extends Omit<LucideProps, 'ref'> {
  /**
   * Icon name — must be a key in the lucide-react icons registry.
   * Tip: use `icons.X` from `@/lib/icons` for autocomplete and type safety.
   *
   * @example
   * <Icon name={icons.TrendingUp} className="w-5 h-5" />
   * <Icon name="TrendingUp" className="w-5 h-5" />
   */
  name: string;
}

/**
 * Unified icon component for GPAIAgent.
 *
 * All icons flow through this component so:
 * - We can swap the underlying icon library in one place
 * - Default styles (stroke, className handling) are consistent
 * - Tree-shaking is via the `icons` registry lookup, not per-file imports
 *
 * For shadcn/ui internal icons (Check, ChevronRight, Circle) — those stay
 * imported directly inside their respective component files to avoid
 * coupling through this wrapper.
 */
export const Icon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ name, className, ...props }, ref) => {
    const LucideIcon = _icons[name as keyof typeof _icons];
    if (!LucideIcon) {
      console.warn(`[Icon] Unknown icon name: "${name}"`);
      return null;
    }
    return (
      <LucideIcon
        ref={ref}
        className={cn('shrink-0', className)}
        {...props}
      />
    );
  }
);
Icon.displayName = 'Icon';

/**
 * Convenience wrapper for icons that should always be inline (no default size).
 * Use this for shadcn/ui internal icons that manage their own dimensions.
 */
export const InlineIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ name, className, ...props }, ref) => {
    const LucideIcon = _icons[name as keyof typeof _icons];
    if (!LucideIcon) {
      console.warn(`[InlineIcon] Unknown icon name: "${name}"`);
      return null;
    }
    return (
      <LucideIcon
        ref={ref}
        className={cn('inline', className)}
        {...props}
      />
    );
  }
);
InlineIcon.displayName = 'InlineIcon';
