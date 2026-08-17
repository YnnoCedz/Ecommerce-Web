<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        return response()->json(['message' => 'Registration endpoint scaffolded.'], 201);
    }

    public function login(Request $request)
    {
        return response()->json(['message' => 'Login endpoint scaffolded.']);
    }

    public function logout(Request $request)
    {
        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request)
    {
        return response()->json(['message' => 'Authenticated user placeholder.']);
    }
}

