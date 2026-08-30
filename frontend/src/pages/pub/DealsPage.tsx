import { useEffect, useState } from "react";
import { Price } from "../../Part03";
import { fetchActiveDeals, type CatalogProduct } from "../../api/catalog";

export default function DealsPage() {
  const [deals, setDeals] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchActiveDeals().then(response => setDeals(response.data)).finally(() => setLoading(false));
  }, []);

  return <main className="mx-auto max-w-screen-xl px-4 py-10 md:px-8 lg:px-12">
    <p className="text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)]">Limited time</p>
    <h1 className="font-[var(--font-display)] text-3xl">Today's Deals</h1>
    {loading ? <p className="mt-8 text-sm text-[var(--color-ink-muted)]">Loading deals...</p> : deals.length === 0 ? <p className="mt-8 text-sm text-[var(--color-ink-muted)]">No deals available right now.</p> : <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {deals.map(product => <a key={product.id} href={`/p/${product.slug}`} className="overflow-hidden rounded-sm border bg-white hover:shadow-md">
        <div className="relative aspect-square overflow-hidden"><img src={product.image} alt={product.name} className="h-full w-full object-cover" /><span className="absolute left-2 top-2 rounded-sm bg-[var(--color-red)] px-2 py-1 text-[10px] text-white">DEAL</span></div>
        <div className="p-3"><p className="line-clamp-2 text-sm font-[500]">{product.name}</p><div className="mt-2"><Price amount={product.price} original={product.original_price ?? undefined} size="sm" /></div><p className="mt-1 text-[10px] text-[var(--color-red)]">Ends {product.promotion ? new Date(product.promotion.ends_at).toLocaleString() : "soon"}</p></div>
      </a>)}
    </div>}
  </main>;
}
