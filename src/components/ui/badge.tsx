import { type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeStyles = cva(
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
  {
    variants: {
      tone: {
        default: 'border-slate-700 bg-slate-800/60 text-slate-300',
        live: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
        awaiting: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
        manual: 'border-violet-500/40 bg-violet-500/10 text-violet-300',
        unavailable: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
        info: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
        accent: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
      },
      size: {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-2.5 py-0.5 text-xs',
      },
    },
    defaultVariants: { tone: 'default', size: 'sm' },
  }
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeStyles> {}

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return <span className={cn(badgeStyles({ tone, size }), className)} {...props} />;
}
