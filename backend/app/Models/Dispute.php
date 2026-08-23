<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Dispute extends Model
{
    protected $fillable = [
        'return_request_id',
        'opened_by',
        'status',
        'reason',
        'buyer_statement',
        'seller_response',
        'resolution_type',
        'resolution_note',
        'resolution_notes',
        'resolved_by',
        'refund_amount',
        'opened_at',
        'resolved_at',
    ];

    protected $casts = [
        'refund_amount' => 'decimal:2',
        'opened_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    public function returnRequest() { return $this->belongsTo(ReturnRequest::class); }
    public function opener() { return $this->belongsTo(User::class, 'opened_by'); }
    public function resolver() { return $this->belongsTo(User::class, 'resolved_by'); }
}
