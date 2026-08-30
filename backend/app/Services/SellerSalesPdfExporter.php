<?php

namespace App\Services;

use Dompdf\Dompdf;
use Dompdf\Options;

class SellerSalesPdfExporter
{
    public function render(array $report): string
    {
        $options = new Options;
        $options->set('defaultFont', 'DejaVu Sans');
        $options->set('isRemoteEnabled', false);

        $pdf = new Dompdf($options);
        $pdf->loadHtml(view('reports.seller-sales', compact('report'))->render(), 'UTF-8');
        $pdf->setPaper('A4', 'landscape');
        $pdf->render();

        return $pdf->output();
    }
}
