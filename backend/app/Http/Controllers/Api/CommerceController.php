<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

class CommerceController extends Controller
{
    public function cart()
    {
        return response()->json(['message' => 'Cart endpoint scaffolded.']);
    }

    public function checkout()
    {
        return response()->json(['message' => 'Checkout endpoint scaffolded.']);
    }

    public function orders()
    {
        return response()->json(['data' => []]);
    }

    public function order(string $orderNumber)
    {
        return response()->json(['data' => ['order_number' => $orderNumber]]);
    }

    public function reviews()
    {
        return response()->json(['data' => []]);
    }

    public function storeReview()
    {
        return response()->json(['message' => 'Review submitted.'], 201);
    }

    public function wishlists()
    {
        return response()->json(['data' => []]);
    }

    public function storeWishlist()
    {
        return response()->json(['message' => 'Wishlist updated.'], 201);
    }

    public function promotions()
    {
        return response()->json(['data' => []]);
    }
}

