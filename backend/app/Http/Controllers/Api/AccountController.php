<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

class AccountController extends Controller
{
    public function addresses()
    {
        return response()->json(['data' => []]);
    }

    public function storeAddress()
    {
        return response()->json(['message' => 'Address saved.'], 201);
    }
}

