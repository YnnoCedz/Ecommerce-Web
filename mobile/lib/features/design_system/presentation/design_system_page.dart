import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/widgets/app_widgets.dart';

class DesignSystemPage extends StatelessWidget {
  const DesignSystemPage({super.key});
  @override
  Widget build(BuildContext context) => AppScaffold(title: 'Maketo design system', body: SingleChildScrollView(padding: const EdgeInsets.all(AppSpacing.lg), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Reusable marketplace primitives', style: AppTypography.pageTitle),
        const SizedBox(height: AppSpacing.xl),
        const AppSectionHeader(title: 'Buttons'),
        const SizedBox(height: AppSpacing.md),
        AppPrimaryButton(label: 'Add to cart', icon: const Icon(Icons.shopping_bag_outlined), onPressed: () => AppSnackbar.show(context, 'Product added to cart.')),
        const SizedBox(height: AppSpacing.sm),
        AppOutlineButton(label: 'View store', icon: const Icon(Icons.storefront_outlined), onPressed: () {}),
        const SizedBox(height: AppSpacing.xxl),
        const AppSectionHeader(title: 'Search and inputs'),
        const SizedBox(height: AppSpacing.md),
        const AppSearchField(),
        const SizedBox(height: AppSpacing.md),
        const AppTextField(label: 'Email address', hint: 'you@example.com', prefixIcon: Icons.email_outlined),
        const SizedBox(height: AppSpacing.xxl),
        const AppSectionHeader(title: 'Product card'),
        const SizedBox(height: AppSpacing.md),
        AppProductCard(name: 'Handcrafted leather tote bag', price: 2400, oldPrice: 2800, rating: 4.9, onWishlist: () => AppSnackbar.show(context, 'Product saved.')),
        const SizedBox(height: AppSpacing.xxl),
        const AppSectionHeader(title: 'Statuses and states'),
        const SizedBox(height: AppSpacing.md),
        const Wrap(spacing: AppSpacing.sm, runSpacing: AppSpacing.sm, children: [AppStatusBadge(status: 'Processing'), AppStatusBadge(status: 'Shipped'), AppStatusBadge(status: 'Delivered'), AppStatusBadge(status: 'Cancelled')]),
        const SizedBox(height: AppSpacing.lg),
        AppCard(child: Column(children: [const AppEmptyState(title: 'Your cart is empty', description: 'Add something you love and it will appear here.'), AppQuantitySelector(value: 1, onChanged: ignoreQuantity)])),
      ]));
  static void ignoreQuantity(int _) {}
}
