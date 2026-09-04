<?php

return [
    'document_max_kilobytes' => (int) env('COURIER_DOCUMENT_MAX_KB', 8192),
    'delivery_proof_max_kilobytes' => (int) env('DELIVERY_PROOF_MAX_KB', 8192),
    'delivery_proof_disk' => env('DELIVERY_PROOF_DISK', 'r2'),
];
