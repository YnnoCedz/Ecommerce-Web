<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductVariant extends Model
{
    protected $fillable = [
        'product_id',
        'name',
        'sku',
        'barcode',
        'price_override',
        'sale_price_override',
        'stock_quantity',
        'low_stock_threshold',
        'active',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function options()
    {
        return $this->hasMany(VariantOption::class);
    }

    public function cartItems()
    {
        return $this->hasMany(CartItem::class);
    }
}
