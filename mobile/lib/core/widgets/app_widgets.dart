import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import '../theme/app_shadows.dart';
import '../theme/app_spacing.dart';
import '../theme/app_typography.dart';

class AppScaffold extends StatelessWidget {
  const AppScaffold({super.key, required this.body, this.title, this.actions});
  final Widget body;
  final String? title;
  final List<Widget>? actions;
  @override
  Widget build(BuildContext context) => Scaffold(appBar: title == null ? null : AppBar(title: Text(title!), actions: actions), body: body);
}

class AppCard extends StatelessWidget {
  const AppCard({super.key, required this.child, this.padding = AppSpacing.lg});
  final Widget child;
  final double padding;
  @override
  Widget build(BuildContext context) => Container(padding: EdgeInsets.all(padding), decoration: const BoxDecoration(color: AppColors.surfaceElevated, borderRadius: AppRadius.card, boxShadow: AppShadows.card), child: child);
}

class AppSectionHeader extends StatelessWidget {
  const AppSectionHeader({super.key, required this.title, this.action});
  final String title;
  final Widget? action;
  @override
  Widget build(BuildContext context) => Row(children: [Expanded(child: Text(title, style: AppTypography.sectionTitle)), if (action != null) action!]);
}

class AppPrimaryButton extends StatelessWidget {
  const AppPrimaryButton({super.key, required this.label, this.onPressed, this.loading = false, this.icon});
  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  final Widget? icon;
  @override
  Widget build(BuildContext context) => SizedBox(width: double.infinity, child: FilledButton.icon(onPressed: loading ? null : onPressed, icon: loading ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : (icon ?? const SizedBox.shrink()), label: Text(label)));
}

class AppOutlineButton extends StatelessWidget {
  const AppOutlineButton({super.key, required this.label, this.onPressed, this.icon});
  final String label;
  final VoidCallback? onPressed;
  final Widget? icon;
  @override
  Widget build(BuildContext context) => OutlinedButton.icon(onPressed: onPressed, icon: icon ?? const SizedBox.shrink(), label: Text(label));
}

class AppTextField extends StatelessWidget {
  const AppTextField({super.key, this.controller, this.label, this.hint, this.errorText, this.obscureText = false, this.prefixIcon, this.readOnly = false, this.onChanged});
  final TextEditingController? controller;
  final String? label;
  final String? hint;
  final String? errorText;
  final bool obscureText;
  final IconData? prefixIcon;
  final bool readOnly;
  final ValueChanged<String>? onChanged;
  @override
  Widget build(BuildContext context) => TextField(controller: controller, obscureText: obscureText, readOnly: readOnly, onChanged: onChanged, decoration: InputDecoration(labelText: label, hintText: hint, errorText: errorText, prefixIcon: prefixIcon == null ? null : Icon(prefixIcon)));
}

class AppSearchField extends StatelessWidget {
  const AppSearchField({super.key, this.controller, this.onSubmitted, this.hint = 'Search products, stores…'});
  final TextEditingController? controller;
  final ValueChanged<String>? onSubmitted;
  final String hint;
  @override
  Widget build(BuildContext context) => TextField(controller: controller, onSubmitted: onSubmitted, decoration: InputDecoration(hintText: hint, prefixIcon: const Icon(Icons.search), suffixIcon: IconButton(onPressed: () {}, icon: const Icon(Icons.tune))));
}

class AppNetworkImage extends StatelessWidget {
  const AppNetworkImage({super.key, required this.url, this.fit = BoxFit.contain, this.borderRadius = AppRadius.md});
  final String? url;
  final BoxFit fit;
  final Radius borderRadius;
  @override
  Widget build(BuildContext context) => ClipRRect(borderRadius: BorderRadius.all(borderRadius), child: url == null || url!.isEmpty ? _placeholder() : Image.network(url!, fit: fit, width: double.infinity, height: double.infinity, errorBuilder: (_, __, ___) => _placeholder(), loadingBuilder: (_, child, progress) => progress == null ? child : _placeholder()));
  Widget _placeholder() => Container(color: AppColors.surface, alignment: Alignment.center, child: const Icon(Icons.image_outlined, color: AppColors.inkMuted));
}

class AppPrice extends StatelessWidget {
  const AppPrice({super.key, required this.value, this.oldValue});
  final num value;
  final num? oldValue;
  @override
  Widget build(BuildContext context) => Wrap(spacing: AppSpacing.sm, crossAxisAlignment: WrapCrossAlignment.center, children: [Text('₱${value.toStringAsFixed(2)}', style: AppTypography.price), if (oldValue != null) Text('₱${oldValue!.toStringAsFixed(2)}', style: AppTypography.priceOld.copyWith(color: AppColors.inkMuted))]);
}

class AppStatusBadge extends StatelessWidget {
  const AppStatusBadge({super.key, required this.status});
  final String status;
  @override
  Widget build(BuildContext context) { final key = status.toLowerCase(); return Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5), decoration: BoxDecoration(color: AppColors.statusBackground(status), borderRadius: const BorderRadius.all(AppRadius.pill)), child: Text(status, style: AppTypography.badge.copyWith(color: AppColors.status[key] ?? AppColors.warning))); }
}

class AppEmptyState extends StatelessWidget {
  const AppEmptyState({super.key, required this.title, required this.description, this.action});
  final String title;
  final String description;
  final Widget? action;
  @override
  Widget build(BuildContext context) => Center(child: Padding(padding: const EdgeInsets.all(AppSpacing.xxxl), child: Column(mainAxisSize: MainAxisSize.min, children: [const Icon(Icons.inbox_outlined, size: 44, color: AppColors.inkMuted), const SizedBox(height: AppSpacing.lg), Text(title, style: AppTypography.sectionTitle, textAlign: TextAlign.center), const SizedBox(height: AppSpacing.sm), Text(description, style: AppTypography.body.copyWith(color: AppColors.inkMuted), textAlign: TextAlign.center), if (action != null) ...[const SizedBox(height: AppSpacing.lg), action!]]));
}

class AppErrorState extends StatelessWidget {
  const AppErrorState({super.key, this.onRetry});
  final VoidCallback? onRetry;
  @override
  Widget build(BuildContext context) => AppEmptyState(title: 'Something went wrong', description: "We couldn't load this page.", action: onRetry == null ? null : AppOutlineButton(label: 'Try again', onPressed: onRetry));
}

class AppQuantitySelector extends StatelessWidget {
  const AppQuantitySelector({super.key, required this.value, required this.onChanged});
  final int value;
  final ValueChanged<int> onChanged;
  @override
  Widget build(BuildContext context) => Row(mainAxisSize: MainAxisSize.min, children: [IconButton(tooltip: 'Decrease quantity', onPressed: value > 1 ? () => onChanged(value - 1) : null, icon: const Icon(Icons.remove)), Text('$value', style: AppTypography.label), IconButton(tooltip: 'Increase quantity', onPressed: () => onChanged(value + 1), icon: const Icon(Icons.add))]);
}

class AppProductCard extends StatelessWidget {
  const AppProductCard({super.key, required this.name, required this.price, this.imageUrl, this.oldPrice, this.rating, this.onTap, this.onWishlist});
  final String name;
  final num price;
  final String? imageUrl;
  final num? oldPrice;
  final double? rating;
  final VoidCallback? onTap;
  final VoidCallback? onWishlist;
  @override
  Widget build(BuildContext context) => InkWell(onTap: onTap, borderRadius: AppRadius.card, child: AppCard(padding: 0, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [SizedBox(height: 150, width: double.infinity, child: Stack(children: [AppNetworkImage(url: imageUrl), if (onWishlist != null) Positioned(top: 6, right: 6, child: IconButton.filledTonal(onPressed: onWishlist, icon: const Icon(Icons.favorite_border)))])), Padding(padding: const EdgeInsets.all(AppSpacing.md), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(name, maxLines: 2, overflow: TextOverflow.ellipsis, style: AppTypography.cardTitle), const SizedBox(height: AppSpacing.sm), AppPrice(value: price, oldValue: oldPrice), if (rating != null) ...[const SizedBox(height: AppSpacing.sm), Text('★ ${rating!.toStringAsFixed(1)}', style: AppTypography.bodySmall.copyWith(color: AppColors.amber))]]))])));
}

class AppStoreCard extends StatelessWidget {
  const AppStoreCard({super.key, required this.name, this.logoUrl, this.rating, this.onTap});
  final String name;
  final String? logoUrl;
  final double? rating;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) => AppCard(child: Row(children: [SizedBox(width: 52, height: 52, child: AppNetworkImage(url: logoUrl, fit: BoxFit.cover)), const SizedBox(width: AppSpacing.md), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(name, style: AppTypography.cardTitle), if (rating != null) Text('★ ${rating!.toStringAsFixed(1)}', style: AppTypography.bodySmall.copyWith(color: AppColors.amber))])), TextButton(onPressed: onTap, child: const Text('Visit store'))]));
}

class AppOrderCard extends StatelessWidget {
  const AppOrderCard({super.key, required this.seller, required this.orderId, required this.status, required this.total, this.onAction});
  final String seller;
  final String orderId;
  final String status;
  final num total;
  final VoidCallback? onAction;
  @override
  Widget build(BuildContext context) => AppCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Row(children: [Expanded(child: Text(seller, style: AppTypography.cardTitle)), AppStatusBadge(status: status)]), const SizedBox(height: AppSpacing.sm), Text(orderId, style: AppTypography.bodySmall.copyWith(color: AppColors.inkMuted)), const SizedBox(height: AppSpacing.md), Row(children: [Expanded(child: Text('Order total', style: AppTypography.bodySmall.copyWith(color: AppColors.inkMuted))), AppPrice(value: total)]), if (onAction != null) ...[const SizedBox(height: AppSpacing.md), AppOutlineButton(label: 'Track order', onPressed: onAction)] ]));
}

class AppLoadingSkeleton extends StatelessWidget {
  const AppLoadingSkeleton({super.key, this.height = 16, this.width = double.infinity, this.borderRadius = AppRadius.md});
  final double height;
  final double width;
  final Radius borderRadius;
  @override
  Widget build(BuildContext context) => Container(width: width, height: height, decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.all(borderRadius)));
}

class AppSnackbar {
  static void show(BuildContext context, String message, {bool error = false}) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message), backgroundColor: error ? AppColors.red : AppColors.navy));
}
