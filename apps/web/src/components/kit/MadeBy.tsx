/** Mention d'éditeur, en pied des écrans : link.cg est un produit de NS Creative. */
export function MadeBy({ className = '' }: { className?: string }) {
  return (
    <p className={`text-center text-xs text-subtle ${className}`}>
      link.cg, un produit de{' '}
      <a href="https://nscreative.cg" target="_blank" rel="noopener" className="font-semibold text-muted underline-offset-2 hover:underline">
        NS Creative
      </a>
    </p>
  )
}
