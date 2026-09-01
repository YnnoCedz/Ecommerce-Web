<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    protected $fillable = [
        'order_id',
        'seller_order_id',
        'seller_id',
        'product_id',
        'product_variant_id',
        'promotion_id',
        'discount_source_type',
        'promotion_name',
        'discount_type',
        'discount_value',
        'product_name',
        'product_slug',
        'variant_name',
        'sku',
        'product_image_storage_disk',
        'product_image_storage_path',
        'unit_price',
        'regular_unit_price',
        'promotion_discount',
        'voucher_discount',
        'quantity',
        'subtotal',
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
        'regular_unit_price' => 'decimal:2',
        'promotion_discount' => 'decimal:2',
        'voucher_discount' => 'decimal:2',
        'discount_value' => 'decimal:2',
        'quantity' => 'integer',
        'subtotal' => 'decimal:2',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function sellerOrder()
    {
        return $this->belongsTo(SellerOrder::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function review()
    {
        return $this->hasOne(Review::class);
    }

    public function returnRequestItems()
    {
        return $this->hasMany(ReturnRequestItem::class);
    }
}
