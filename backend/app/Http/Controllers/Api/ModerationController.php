<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

class ModerationController extends Controller
{
    public function reports()
    {
        return response()->json(['data' => []]);
    }

    public function storeReport()
    {
        return response()->json(['message' => 'Report submitted.'], 201);
    }

    public function notifications()
    {
        return response()->json(['data' => []]);
    }
}

