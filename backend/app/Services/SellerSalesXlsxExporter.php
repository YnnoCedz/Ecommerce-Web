<?php

namespace App\Services;

use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Shared\Date;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class SellerSalesXlsxExporter
{
    private const CURRENCY_FORMAT = '"PHP "#,##0.00;[Red]-"PHP "#,##0.00';

    public function save(array $report, string $path): void
    {
        $workbook = new Spreadsheet;
        $workbook->getProperties()
            ->setCreator('Marketo')
            ->setTitle('Seller Sales Report')
            ->setSubject($report['period']['label']);

        $summary = $workbook->getActiveSheet();
        $summary->setTitle('Summary');
        $this->buildSummary($summary, $report);

        $details = $workbook->createSheet();
        $details->setTitle('Sales Details');
        $this->buildDetails($details, $report);

        $workbook->setActiveSheetIndex(0);
        (new Xlsx($workbook))->save($path);
        $workbook->disconnectWorksheets();
    }

    private function buildSummary($sheet, array $report): void
    {
        $sheet->mergeCells('A1:F1')->setCellValue('A1', 'MAKETO');
        $sheet->mergeCells('A2:F2')->setCellValue('A2', 'SELLER SALES REPORT');
        $metadata = [
            ['Store', $report['seller']['store_name']],
            ['Seller identifier', $report['seller']['identifier']],
            ['Reporting period', $report['period']['label']],
            ['Generated', $report['generated_at']->format('F j, Y g:i A T')],
            ['Currency', 'PHP'],
            ['Report type', 'Sales Report'],
        ];
        foreach ($metadata as $offset => [$label, $value]) {
            $row = 4 + $offset;
            $sheet->setCellValue("A{$row}", $label);
            $sheet->setCellValueExplicit("B{$row}", (string) $value, DataType::TYPE_STRING);
            $sheet->mergeCells("B{$row}:F{$row}");
        }

        $sheet->mergeCells('A11:F11')->setCellValue('A11', 'SALES SUMMARY');
        $metrics = [
            ['Total Orders', $report['summary']['total_orders'], false],
            ['Total Units Sold', $report['summary']['total_units_sold'], false],
            ['Gross Product Sales', $report['summary']['gross_product_sales'], true],
            ['Discounts', $report['summary']['discounts'], true],
            ['Refunds', $report['summary']['refunds'], true],
            ['Shipping Collected', $report['summary']['shipping_collected'], true],
            ['Net Product Sales', $report['summary']['net_product_sales'], true],
            ['Average Order Value', $report['summary']['average_order_value'], true],
        ];
        foreach ($metrics as $offset => [$label, $value, $currency]) {
            $row = 12 + $offset;
            $sheet->setCellValue("A{$row}", $label);
            $sheet->setCellValue("B{$row}", $value);
            $sheet->mergeCells("B{$row}:C{$row}");
            $sheet->getStyle("B{$row}:C{$row}")->getNumberFormat()->setFormatCode($currency ? self::CURRENCY_FORMAT : '#,##0');
        }

        $sheet->getStyle('A1:F1')->getFont()->setBold(true)->setSize(18)->getColor()->setARGB('FFFFFFFF');
        $sheet->getStyle('A1:F1')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF10233F');
        $sheet->getStyle('A2:F2')->getFont()->setBold(true)->setSize(14)->getColor()->setARGB('FF10233F');
        $sheet->getStyle('A11:F11')->getFont()->setBold(true)->getColor()->setARGB('FFFFFFFF');
        $sheet->getStyle('A11:F11')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF10233F');
        $sheet->getStyle('A4:A9')->getFont()->setBold(true)->getColor()->setARGB('FF667085');
        $sheet->getStyle('A12:A19')->getFont()->setBold(true);
        $sheet->getColumnDimension('A')->setWidth(28);
        foreach (range('B', 'F') as $column) {
            $sheet->getColumnDimension($column)->setWidth(18);
        }
        $sheet->freezePane('A12');
        $sheet->setShowGridlines(false);
    }

    private function buildDetails($sheet, array $report): void
    {
        $headers = ['#', 'Order Date', 'Order Number', 'Seller Order', 'Status', 'Payment Status', 'Payment Method', 'Product', 'Variant', 'SKU', 'Qty', 'Unit Price', 'Discount', 'Refund', 'Line Total', 'Shipping', 'Net Product Sales'];
        foreach ($headers as $index => $header) {
            $sheet->setCellValue([$index + 1, 1], $header);
        }

        foreach ($report['rows']->values() as $index => $row) {
            $excelRow = $index + 2;
            $values = [
                $index + 1,
                Date::dateTimeToExcel($row['order_date']),
                $row['order_number'],
                $row['seller_order_reference'],
                $row['order_status'],
                $row['payment_status'],
                $row['payment_method'] ?? '',
                $row['product'],
                $row['variant'] ?? '',
                $row['sku'],
                $row['quantity'],
                $row['unit_price'],
                $row['discount'],
                $row['refund'],
                $row['line_total'],
                $row['shipping'],
                $row['net_amount'],
            ];
            foreach ($values as $column => $value) {
                $cell = [$column + 1, $excelRow];
                if (in_array($column, [2, 3, 4, 5, 6, 7, 8, 9], true)) {
                    $sheet->setCellValueExplicit($cell, (string) $value, DataType::TYPE_STRING);
                } else {
                    $sheet->setCellValue($cell, $value);
                }
            }
        }

        $lastDataRow = max(1, $report['rows']->count() + 1);
        $totalRow = $lastDataRow + 1;
        $sheet->setCellValue("A{$totalRow}", 'TOTAL');
        $sheet->mergeCells("A{$totalRow}:J{$totalRow}");
        foreach (['K', 'M', 'N', 'O', 'P', 'Q'] as $column) {
            $sheet->setCellValue("{$column}{$totalRow}", $lastDataRow > 1 ? "=SUM({$column}2:{$column}{$lastDataRow})" : 0);
        }

        $sheet->getStyle('A1:Q1')->getFont()->setBold(true)->getColor()->setARGB('FFFFFFFF');
        $sheet->getStyle('A1:Q1')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF10233F');
        $sheet->getStyle("A{$totalRow}:Q{$totalRow}")->getFont()->setBold(true);
        $sheet->getStyle("A{$totalRow}:Q{$totalRow}")->getBorders()->getTop()->setBorderStyle(Border::BORDER_THIN);
        $sheet->getStyle("B2:B{$totalRow}")->getNumberFormat()->setFormatCode('mmm d, yyyy h:mm AM/PM');
        foreach (['L', 'M', 'N', 'O', 'P', 'Q'] as $column) {
            $sheet->getStyle("{$column}2:{$column}{$totalRow}")->getNumberFormat()->setFormatCode(self::CURRENCY_FORMAT);
        }
        $sheet->getStyle("K2:K{$totalRow}")->getNumberFormat()->setFormatCode('#,##0');
        $sheet->getStyle("A1:Q{$totalRow}")->getAlignment()->setVertical(Alignment::VERTICAL_TOP);
        $sheet->getStyle("H2:I{$lastDataRow}")->getAlignment()->setWrapText(true);
        $sheet->freezePane('A2');
        $sheet->setAutoFilter("A1:Q{$lastDataRow}");
        $widths = [6, 20, 22, 17, 14, 17, 17, 34, 23, 20, 8, 16, 16, 16, 16, 14, 19];
        foreach ($widths as $index => $width) {
            $sheet->getColumnDimensionByColumn($index + 1)->setWidth($width);
        }
        $sheet->setShowGridlines(false);
    }
}
