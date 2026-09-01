<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CartItem extends Model
{
    protected $fillable = [
        'cart_id',
        'seller_id',
        'product_id',
        'product_variant_id',
        'selected_discount_type',
        'selected_discount_id',
        'quantity',
        'unit_price',
        'line_total',
        'saved_for_later',
    ];

    public function cart()
    {
        return $this->belongsTo(Cart::class);
    }

    public function seller()
    {
        return $this->belongsTo(Seller::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }
}
