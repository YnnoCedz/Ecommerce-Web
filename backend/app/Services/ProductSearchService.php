<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class ProductSearchService
{
    public function search(array $filters): array
    {
        $query = $this->normalize((string) ($filters['q'] ?? ''));
        $tokens = $this->tokenize($query);
        $expandedTokens = $this->expandTokens($tokens);
        $perPage = min(
            max((int) ($filters['per_page'] ?? config('search.default_per_page', 24)), 1),
            (int) config('search.max_per_page', 48)
        );
        $page = max((int) ($filters['page'] ?? 1), 1);

        $builder = $this->visibleProductsQuery();
        $this->applyFilters($builder, $filters);

        if ($query !== '') {
            $this->applyCandidateTerms($builder, $query, $expandedTokens);
            $this->prioritizeStrongCandidates($builder, $query);
        } else {
            $this->applyDiscoveryOrder($builder, (string) ($filters['sort'] ?? 'newest'));
        }

        $candidates = $builder
            ->limit((int) config('search.candidate_limit', 500))
            ->get();

        if (isset($filters['min_rating'])) {
            $minimumRating = (float) $filters['min_rating'];
            $candidates = $candidates
                ->filter(fn (Product $product) => (float) $product->rating >= $minimumRating)
                ->values();
        }

        $ranked = $query === ''
            ? $this->sortDiscovery($candidates, (string) ($filters['sort'] ?? 'newest'))
            : $this->rank($candidates, $query, $tokens, $expandedTokens, (string) ($filters['sort'] ?? 'relevance'));

        $total = $ranked->count();
        $items = $ranked->slice(($page - 1) * $perPage, $perPage)->values();
        $paginator = new LengthAwarePaginator($items, $total, $perPage, $page, [
            'path' => request()->url(),
            'query' => request()->query(),
        ]);

        return [
            'paginator' => $paginator,
            'normalized_query' => $query,
            'suggested_query' => $query === '' ? null : $this->suggestCorrection($query, $tokens, $candidates),
        ];
    }

    public function suggestions(string $rawQuery, int $limit = 6): Collection
    {
        $query = $this->normalize($rawQuery);
        if (mb_strlen($query) < 2) {
            return collect();
        }

        $result = $this->search([
            'q' => $query,
            'page' => 1,
            'per_page' => min(max($limit, 1), 10),
            'sort' => 'relevance',
        ]);

        return collect($result['paginator']->items());
    }

    public function normalize(string $query): string
    {
        $query = Str::lower(trim($query));
        $query = preg_replace('/[^\pL\pN\-+]+/u', ' ', $query) ?? '';

        return trim(preg_replace('/\s+/u', ' ', $query) ?? '');
    }

    private function visibleProductsQuery(): Builder
    {
        return Product::query()
            ->with([
                'seller.user',
                'category.parent',
                'images' => fn ($images) => $images->orderBy('sort_order')->orderBy('id'),
            ])
            ->withAvg(['reviews as rating' => fn ($reviews) => $reviews->where('status', 'approved')], 'rating')
            ->withCount(['reviews as rating_count' => fn ($reviews) => $reviews->where('status', 'approved')])
            ->withSum('orderItems as sold_count', 'quantity')
            ->where('products.status', 'active')
            ->whereNull('products.deleted_at')
            ->whereHas('seller', function (Builder $seller): void {
                $seller->where('status', 'approved')
                    ->whereNull('deleted_at')
                    ->whereHas('user', fn (Builder $user) => $user->where('status', 'active'));
            });
    }

    private function applyFilters(Builder $query, array $filters): void
    {
        if (! empty($filters['category'])) {
            $category = (string) $filters['category'];
            $query->whereHas('category', function (Builder $categoryQuery) use ($category): void {
                $categoryQuery->where('slug', $category)
                    ->orWhereHas('parent', fn (Builder $parent) => $parent->where('slug', $category));
            });
        }

        if (! empty($filters['seller'])) {
            $query->whereHas('seller', fn (Builder $seller) => $seller->where('slug', (string) $filters['seller']));
        }

        if (isset($filters['min_price'])) {
            $query->whereRaw('CAST(COALESCE(sale_price, price) AS DECIMAL(12, 2)) >= ?', [(float) $filters['min_price']]);
        }

        if (isset($filters['max_price'])) {
            $query->whereRaw('CAST(COALESCE(sale_price, price) AS DECIMAL(12, 2)) <= ?', [(float) $filters['max_price']]);
        }

        if (! empty($filters['free_shipping'])) {
            $query->where('free_shipping', true);
        }

    }

    private function applyCandidateTerms(Builder $query, string $phrase, array $expandedTokens): void
    {
        $terms = collect([$phrase, ...$expandedTokens])
            ->filter(fn (string $term) => mb_strlen($term) >= (int) config('search.minimum_token_length', 2))
            ->unique()
            ->take(30)
            ->values();

        $query->where(function (Builder $candidateQuery) use ($terms): void {
            foreach ($terms as $term) {
                $like = '%' . $this->escapeLike($term) . '%';
                $candidateQuery
                    ->orWhere('products.name', 'like', $like)
                    ->orWhere('products.description', 'like', $like)
                    ->orWhere('products.sku', 'like', $like)
                    ->orWhere('products.tags', 'like', $like)
                    ->orWhereHas('category', function (Builder $category) use ($like): void {
                        $category->where('name', 'like', $like)
                            ->orWhereHas('parent', fn (Builder $parent) => $parent->where('name', 'like', $like));
                    })
                    ->orWhereHas('seller', fn (Builder $seller) => $seller
                        ->where('trade_name', 'like', $like)
                        ->orWhere('business_name', 'like', $like));

                if (mb_strlen($term) >= 4) {
                    $prefix = '%' . $this->escapeLike(mb_substr($term, 0, 3)) . '%';
                    $candidateQuery->orWhere('products.name', 'like', $prefix);
                }
            }
        });
    }

    private function prioritizeStrongCandidates(Builder $query, string $phrase): void
    {
        $escapedPhrase = $this->escapeLike($phrase);
        $query->orderByRaw(
            'CASE WHEN LOWER(products.name) = ? THEN 0 WHEN LOWER(products.name) LIKE ? THEN 1 WHEN LOWER(products.name) LIKE ? THEN 2 ELSE 3 END',
            [$phrase, $escapedPhrase . '%', '%' . $escapedPhrase . '%']
        )->orderByDesc('products.published_at')->orderByDesc('products.id');
    }

    private function applyDiscoveryOrder(Builder $query, string $sort): void
    {
        match ($sort) {
            'price_low_high', 'price-asc' => $query->orderByRaw('CAST(COALESCE(sale_price, price) AS DECIMAL(12, 2)) ASC'),
            'price_high_low', 'price-desc' => $query->orderByRaw('CAST(COALESCE(sale_price, price) AS DECIMAL(12, 2)) DESC'),
            default => $query->orderByDesc('products.published_at')->orderByDesc('products.id'),
        };
    }

    private function rank(Collection $products, string $query, array $tokens, array $expandedTokens, string $sort): Collection
    {
        $ranked = $products
            ->map(function (Product $product) use ($query, $tokens, $expandedTokens): Product {
                $product->setAttribute('search_score', $this->score($product, $query, $tokens, $expandedTokens));

                return $product;
            })
            ->filter(fn (Product $product) => (float) $product->search_score > 0);

        return match ($sort) {
            'price_low_high', 'price-asc' => $ranked->sortBy(fn (Product $product) => (float) ($product->sale_price ?? $product->price))->values(),
            'price_high_low', 'price-desc' => $ranked->sortByDesc(fn (Product $product) => (float) ($product->sale_price ?? $product->price))->values(),
            'newest' => $ranked->sortByDesc(fn (Product $product) => $product->published_at?->getTimestamp() ?? 0)->values(),
            'rating' => $ranked->sortByDesc(fn (Product $product) => [(float) $product->rating, (float) $product->search_score])->values(),
            'popular', 'sales' => $ranked->sortByDesc(fn (Product $product) => [(int) $product->sold_count, (float) $product->search_score])->values(),
            default => $ranked->sortByDesc(fn (Product $product) => [
                (float) $product->search_score,
                $product->track_inventory && $product->stock_quantity > 0 ? 1 : 0,
                (float) $product->rating,
                (int) $product->rating_count,
            ])->values(),
        };
    }

    private function sortDiscovery(Collection $products, string $sort): Collection
    {
        return match ($sort) {
            'price_low_high', 'price-asc' => $products->sortBy(fn (Product $product) => (float) ($product->sale_price ?? $product->price))->values(),
            'price_high_low', 'price-desc' => $products->sortByDesc(fn (Product $product) => (float) ($product->sale_price ?? $product->price))->values(),
            'rating' => $products->sortByDesc(fn (Product $product) => (float) $product->rating)->values(),
            'popular', 'sales' => $products->sortByDesc(fn (Product $product) => (int) $product->sold_count)->values(),
            default => $products->sortByDesc(fn (Product $product) => $product->published_at?->getTimestamp() ?? 0)->values(),
        };
    }

    private function score(Product $product, string $query, array $tokens, array $expandedTokens): float
    {
        $name = $this->normalize($product->name);
        $description = $this->normalize((string) $product->description);
        $sku = $this->normalize((string) $product->sku);
        $category = $this->normalize((string) $product->category?->name);
        $parentCategory = $this->normalize((string) $product->category?->parent?->name);
        $seller = $this->normalize((string) ($product->seller?->trade_name ?: $product->seller?->business_name));
        $tags = $this->normalize(implode(' ', is_array($product->tags) ? $product->tags : []));
        $nameTokens = $this->tokenize($name);
        $score = 0.0;

        if ($name === $query) $score += 1000;
        elseif (str_starts_with($name, $query)) $score += 650;
        elseif (str_contains($name, $query)) $score += 500;

        if ($sku === $query) $score += 700;
        elseif ($query !== '' && str_contains($sku, $query)) $score += 250;

        $matchedOriginal = 0;
        foreach ($tokens as $token) {
            if (in_array($token, $nameTokens, true)) {
                $score += 110;
                $matchedOriginal++;
            } elseif ($this->containsPartialToken($nameTokens, $token)) {
                $score += 65;
                $matchedOriginal++;
            } elseif ($this->bestSimilarity($token, $nameTokens) >= (float) config('search.fuzzy_threshold', 0.72)) {
                $score += 45;
                $matchedOriginal++;
            }

            if ($this->containsTerm($category, $token)) $score += 75;
            if ($this->containsTerm($parentCategory, $token)) $score += 65;
            if ($this->containsTerm($tags, $token)) $score += 70;
            if ($this->containsTerm($seller, $token)) $score += 55;
            if ($this->containsTerm($description, $token)) $score += 18;
        }

        if ($tokens !== [] && $matchedOriginal === count($tokens)) $score += 260;

        foreach (array_diff($expandedTokens, $tokens) as $synonym) {
            if ($this->containsTerm($name, $synonym)) $score += 70;
            if ($this->containsTerm($category, $synonym) || $this->containsTerm($parentCategory, $synonym)) $score += 55;
            if ($this->containsTerm($tags, $synonym)) $score += 45;
            if ($this->containsTerm($description, $synonym)) $score += 10;
        }

        return $score;
    }

    private function tokenize(string $query): array
    {
        $minimum = (int) config('search.minimum_token_length', 2);

        return collect(explode(' ', $query))
            ->map(fn (string $token) => trim($token))
            ->filter(fn (string $token) => mb_strlen($token) >= $minimum)
            ->unique()
            ->values()
            ->all();
    }

    private function expandTokens(array $tokens): array
    {
        $expanded = collect($tokens);
        $queryPhrase = implode(' ', $tokens);

        foreach ((array) config('search.synonyms', []) as $group) {
            $normalizedGroup = collect($group)->map(fn (string $term) => $this->normalize($term));
            $matchesGroup = $normalizedGroup->contains(fn (string $term) => in_array($term, $tokens, true) || str_contains($queryPhrase, $term))
                || collect($tokens)->contains(fn (string $token) => $this->bestSimilarity($token, $normalizedGroup->all()) >= 0.80);

            if ($matchesGroup) {
                $expanded = $expanded->merge($normalizedGroup);
            }
        }

        return $expanded->flatMap(fn (string $term) => [$term, ...$this->tokenize($term)])
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function containsPartialToken(array $haystackTokens, string $needle): bool
    {
        if (mb_strlen($needle) < (int) config('search.partial_token_length', 4)) {
            return false;
        }

        return collect($haystackTokens)->contains(fn (string $token) => str_starts_with($token, $needle) || str_starts_with($needle, $token));
    }

    private function containsTerm(string $haystack, string $needle): bool
    {
        return $needle !== '' && str_contains($haystack, $needle);
    }

    private function bestSimilarity(string $needle, array $candidates): float
    {
        if (mb_strlen($needle) < 4) return 0;

        return collect($candidates)->map(function (string $candidate) use ($needle): float {
            $length = max(strlen($needle), strlen($candidate));
            return $length === 0 ? 0 : 1 - (levenshtein($needle, $candidate) / $length);
        })->max() ?? 0;
    }

    private function suggestCorrection(string $query, array $tokens, Collection $candidates): ?string
    {
        if ($tokens === [] || $candidates->isEmpty()) return null;

        $dictionary = $candidates->flatMap(function (Product $product): array {
            return $this->tokenize($this->normalize(implode(' ', array_filter([
                $product->name,
                $product->category?->name,
                $product->category?->parent?->name,
            ]))));
        })->unique()->values();

        $changed = false;
        $corrected = collect($tokens)->map(function (string $token) use ($dictionary, &$changed): string {
            $best = $dictionary
                ->mapWithKeys(fn (string $candidate) => [$candidate => $this->bestSimilarity($token, [$candidate])])
                ->sortDesc();
            $candidate = $best->keys()->first();
            $similarity = (float) ($best->first() ?? 0);

            if ($candidate && $candidate !== $token && $similarity >= 0.80) {
                $changed = true;
                return $candidate;
            }

            return $token;
        })->implode(' ');

        return $changed && $corrected !== $query ? $corrected : null;
    }

    private function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    }
}
