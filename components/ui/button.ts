import styles from './button.module.css'

export type ButtonVariant =
  | 'primary'
  | 'dark'
  | 'outlineDark'
  | 'outlinePrimary'
  | 'accent'
  | 'outlineLight'
  | 'white'
  | 'ghost'
  | 'muted'
  | 'danger'
  | 'outlineDanger'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'

/** Class names for a button-styled <button> or <Link>. */
export function buttonClass(variant: ButtonVariant, size: ButtonSize = 'md', options: { block?: boolean; className?: string } = {}) {
  return [styles.button, styles[variant], styles[size], options.block && styles.block, options.className]
    .filter(Boolean)
    .join(' ')
}
