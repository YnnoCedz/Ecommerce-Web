<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'seller_id',
        'category_id',
        'name',
        'slug',
        'description',
        'tags',
        'sku',
        'barcode',
        'price',
        'sale_price',
        'cost_price',
        'status',
        'delivery_type',
        'track_inventory',
        'stock_quantity',
        'low_stock_threshold',
        'weight_grams',
        'length_cm',
        'width_cm',
        'height_cm',
        'free_shipping',
        'published_at',
    ];

    protected $casts = [
        'tags' => 'array',
        'price' => 'decimal:2',
        'sale_price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'track_inventory' => 'boolean',
        'free_shipping' => 'boolean',
        'published_at' => 'datetime',
    ];

    public function seller()
    {
        return $this->belongsTo(Seller::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function images()
    {
        return $this->hasMany(ProductImage::class);
    }

    public function variants()
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    public function promotions()
    {
        return $this->hasMany(Promotion::class);
    }

    public function activePromotion()
    {
        return $this->hasOne(Promotion::class)
            ->where('kind', 'deal')
            ->where('status', '!=', 'cancelled')
            ->whereNull('cancelled_at')
            ->where('starts_at', '<=', now())
            ->where('ends_at', '>', now())
            ->orderByDesc('starts_at');
    }
}
