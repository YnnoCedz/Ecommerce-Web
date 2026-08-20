<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Marketplace search synonyms
    |--------------------------------------------------------------------------
    |
    | Keep groups focused: every term in a group is treated as a useful search
    | equivalent. Original query terms are always retained.
    |
    */
    'synonyms' => [
        ['earphone', 'earphones', 'earbud', 'earbuds', 'headphone', 'headphones'],
        ['cellphone', 'cell phone', 'mobile phone', 'phone', 'smartphone'],
        ['tv', 'television'],
        ['fridge', 'refrigerator'],
        ['laptop', 'notebook'],
        ['flash drive', 'usb drive', 'thumb drive'],
        ['rubber shoes', 'sneakers', 'running shoes'],
        ['mouse', 'mice'],
        ['charger', 'charging'],
        ['game', 'gaming'],
        ['iphone', 'apple phone'],
        ['lightning cable', 'iphone cable'],
        ['wireless', 'bluetooth', 'tws'],
    ],

    'candidate_limit' => 500,
    'default_per_page' => 24,
    'max_per_page' => 48,
    'minimum_token_length' => 2,
    'partial_token_length' => 4,
    'fuzzy_threshold' => 0.72,
];
