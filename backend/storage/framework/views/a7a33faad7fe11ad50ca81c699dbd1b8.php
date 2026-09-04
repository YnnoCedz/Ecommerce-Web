<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 12mm 10mm 13mm; }
        body { margin: 0; color: #1c1b18; font-family: "DejaVu Sans", sans-serif; font-size: 8px; }
        .brand { color: #10233f; font-size: 18px; font-weight: bold; letter-spacing: 1px; }
        h1 { color: #10233f; font-size: 15px; margin: 2px 0 8px; }
        .meta { width: 100%; margin-bottom: 8px; }
        .meta td { padding: 1px 8px 1px 0; vertical-align: top; }
        .meta .label { color: #667085; font-weight: bold; width: 78px; }
        .summary { margin: 6px 0 10px; width: 100%; border-collapse: collapse; }
        .summary td { border: 1px solid #d9dde5; padding: 5px 6px; width: 25%; }
        .summary .label { color: #667085; font-size: 7px; text-transform: uppercase; }
        .summary .value { color: #10233f; font-size: 11px; font-weight: bold; margin-top: 2px; }
        table.details { border-collapse: collapse; table-layout: fixed; width: 100%; }
        table.details thead { display: table-header-group; }
        table.details tr { page-break-inside: avoid; }
        table.details th { background: #10233f; color: white; font-size: 7px; padding: 5px 3px; text-align: left; }
        table.details td { border-bottom: 1px solid #e6e8ec; padding: 4px 3px; vertical-align: top; overflow-wrap: anywhere; }
        .right { text-align: right; }
        .product { width: 26%; }
        .date { width: 9%; }
        .order { width: 12%; }
        .sku { width: 11%; }
        .qty { width: 4%; }
        .money { width: 10%; }
        .status { width: 8%; }
        .variant { color: #667085; font-size: 7px; margin-top: 2px; }
        .totals { border-top: 2px solid #10233f; margin-top: 9px; padding-top: 6px; page-break-inside: avoid; }
        .totals strong { color: #10233f; }
        .footer { bottom: -8mm; color: #667085; font-size: 7px; left: 0; position: fixed; right: 0; text-align: left; }
        .empty { border: 1px solid #d9dde5; color: #667085; padding: 18px; text-align: center; }
    </style>
</head>
<body>
    <div class="brand">MAKETO</div>
    <h1>Seller Sales Report</h1>
    <table class="meta">
        <tr>
            <td class="label">Store</td><td><?php echo e($report['seller']['store_name']); ?></td>
            <td class="label">Reporting Period</td><td><?php echo e($report['period']['label']); ?></td>
        </tr>
        <tr>
            <td class="label">Seller ID</td><td><?php echo e($report['seller']['identifier']); ?></td>
            <td class="label">Generated</td><td><?php echo e($report['generated_at']->format('F j, Y g:i A T')); ?></td>
        </tr>
        <tr>
            <td class="label">Currency</td><td>PHP</td>
            <td class="label">Definition</td><td>Completed or delivered paid sales; refunds deducted; shipping shown separately.</td>
        </tr>
    </table>

    <table class="summary">
        <tr>
            <?php $__currentLoopData = [
                ['Orders', $report['summary']['total_orders']],
                ['Units Sold', $report['summary']['total_units_sold']],
                ['Gross Product Sales', 'PHP '.number_format($report['summary']['gross_product_sales'], 2)],
                ['Discounts', 'PHP '.number_format($report['summary']['discounts'], 2)],
            ]; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as [$label, $value]): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <td><div class="label"><?php echo e($label); ?></div><div class="value"><?php echo e($value); ?></div></td>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        </tr>
        <tr>
            <?php $__currentLoopData = [
                ['Refunds', 'PHP '.number_format($report['summary']['refunds'], 2)],
                ['Shipping Collected', 'PHP '.number_format($report['summary']['shipping_collected'], 2)],
                ['Net Product Sales', 'PHP '.number_format($report['summary']['net_product_sales'], 2)],
                ['Average Order Value', 'PHP '.number_format($report['summary']['average_order_value'], 2)],
            ]; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as [$label, $value]): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <td><div class="label"><?php echo e($label); ?></div><div class="value"><?php echo e($value); ?></div></td>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        </tr>
    </table>

    <?php if($report['rows']->isEmpty()): ?>
        <div class="empty">No completed sales transactions for this reporting period.</div>
    <?php else: ?>
        <table class="details">
            <thead>
                <tr>
                    <th class="date">Date</th><th class="order">Order #</th><th class="product">Product / Variant</th>
                    <th class="sku">SKU</th><th class="qty right">Qty</th><th class="money right">Unit Price</th>
                    <th class="money right">Discount</th><th class="money right">Refund</th>
                    <th class="money right">Net Sales</th><th class="status">Status</th>
                </tr>
            </thead>
            <tbody>
                <?php $__currentLoopData = $report['rows']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $row): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                    <tr>
                        <td><?php echo e($row['order_date']->format('M j, Y')); ?></td>
                        <td><?php echo e($row['order_number']); ?></td>
                        <td><strong><?php echo e($row['product']); ?></strong><?php if($row['variant']): ?><div class="variant"><?php echo e($row['variant']); ?></div><?php endif; ?></td>
                        <td><?php echo e($row['sku']); ?></td><td class="right"><?php echo e(number_format($row['quantity'])); ?></td>
                        <td class="right"><?php echo e(number_format($row['unit_price'], 2)); ?></td>
                        <td class="right"><?php echo e(number_format($row['discount'], 2)); ?></td>
                        <td class="right"><?php echo e(number_format($row['refund'], 2)); ?></td>
                        <td class="right"><?php echo e(number_format($row['net_amount'], 2)); ?></td>
                        <td><?php echo e(ucfirst(str_replace('-', ' ', $row['order_status']))); ?></td>
                    </tr>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            </tbody>
        </table>
    <?php endif; ?>

    <div class="totals">
        <strong>Report Totals:</strong>
        <?php echo e(number_format($report['summary']['total_orders'])); ?> orders |
        <?php echo e(number_format($report['summary']['total_units_sold'])); ?> units |
        Gross PHP <?php echo e(number_format($report['summary']['gross_product_sales'], 2)); ?> |
        Discounts PHP <?php echo e(number_format($report['summary']['discounts'], 2)); ?> |
        Refunds PHP <?php echo e(number_format($report['summary']['refunds'], 2)); ?> |
        Net PHP <?php echo e(number_format($report['summary']['net_product_sales'], 2)); ?>

    </div>
    <div class="footer">Maketo Seller Sales Report | Generated <?php echo e($report['generated_at']->format('Y-m-d H:i T')); ?></div>
    <script type="text/php">
        if (isset($pdf)) {
            $font = $fontMetrics->get_font("DejaVu Sans", "normal");
            $pdf->page_text(715, 570, "Page {PAGE_NUM} of {PAGE_COUNT}", $font, 7, [0.4, 0.44, 0.52]);
        }
    </script>
</body>
</html>
<?php /**PATH C:\Users\Ynno\Ecommerce-WEB\backend\resources\views/reports/seller-sales.blade.php ENDPATH**/ ?>