<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

class MessagingController extends Controller
{
    public function index()
    {
        return response()->json(['data' => []]);
    }

    public function store()
    {
        return response()->json(['message' => 'Message sent.'], 201);
    }
}

