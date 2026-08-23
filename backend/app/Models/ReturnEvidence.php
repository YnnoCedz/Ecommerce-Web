<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReturnEvidence extends Model
{
    protected $table = 'return_evidence';
    protected $fillable = ['return_request_id', 'uploaded_by', 'storage_disk', 'storage_path', 'original_filename', 'mime_type', 'file_size'];
    protected $casts = ['file_size' => 'integer'];

    public function returnRequest() { return $this->belongsTo(ReturnRequest::class); }
    public function uploader() { return $this->belongsTo(User::class, 'uploaded_by'); }
}
