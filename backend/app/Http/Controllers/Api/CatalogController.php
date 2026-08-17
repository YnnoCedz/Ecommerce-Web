<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

class CatalogController extends Controller
{
    public function categories()
    {
        return response()->json(['data' => []]);
    }

    public function products()
    {
        return response()->json(['data' => []]);
    }

    public function product(string $slug)
    {
        return response()->json(['data' => ['slug' => $slug]]);
    }

    public function sellers()
    {
        return response()->json(['data' => []]);
    }

    public function seller(string $slug)
    {
        return response()->json(['data' => ['slug' => $slug]]);
    }
}

