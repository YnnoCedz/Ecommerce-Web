<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SellerSalesPdfExporter;
use App\Services\SellerSalesReportService;
use App\Services\SellerSalesXlsxExporter;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;

class SellerSalesReportController extends Controller
{
    public function __invoke(
        Request $request,
        SellerSalesReportService $reports,
        SellerSalesXlsxExporter $xlsx,
        SellerSalesPdfExporter $pdf,
    ): BinaryFileResponse|Response {
        $data = $request->validate([
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
            'format' => ['required', Rule::in(['xlsx', 'pdf'])],
        ]);
        $timezone = config('app.timezone');
        $from = Carbon::createFromFormat('Y-m-d', $data['from'], $timezone)->startOfDay();
        $to = Carbon::createFromFormat('Y-m-d', $data['to'], $timezone)->endOfDay();

        if ($from->diffInDays($to) + 1 > SellerSalesReportService::MAX_RANGE_DAYS) {
            throw ValidationException::withMessages([
                'to' => ['Sales reports are limited to 366 days.'],
            ]);
        }

        $seller = $request->user()->seller;
        $report = $reports->build($seller, $from, $to);
        $slug = Str::slug($report['seller']['slug'] ?: $report['seller']['store_name']) ?: 'seller';
        $filename = "maketo-sales-report-{$slug}-{$data['from']}-to-{$data['to']}.{$data['format']}";

        if ($data['format'] === 'pdf') {
            return response($pdf->render($report), 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="'.$filename.'"',
                'Cache-Control' => 'private, no-store, max-age=0',
            ]);
        }

        $directory = storage_path('app/private/reports');
        File::ensureDirectoryExists($directory);
        $path = tempnam($directory, 'sales-report-');
        $xlsx->save($report, $path);

        return response()->download($path, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'private, no-store, max-age=0',
        ])->deleteFileAfterSend(true);
    }
}
