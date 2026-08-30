export type VariantOptionValue = {
  name: string;
  value: string;
};

export type VariantOptionGroup = {
  localId: string;
  name: string;
  options: string[];
};

export type VariantCombinationDraft = {
  localId: string;
  server_id?: number;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  options: string[];
  option_values: VariantOptionValue[];
  price_override: string;
  sale_price_override: string;
  stock_quantity: string;
  low_stock_threshold: string;
  active: boolean;
};

function normalizeIdentityPart(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function variantCombinationKey(optionValues: VariantOptionValue[]): string {
  return optionValues
    .map((option) => `${normalizeIdentityPart(option.name)}=${normalizeIdentityPart(option.value)}`)
    .sort()
    .join("|");
}

export function buildOptionCombinations(groups: VariantOptionGroup[]): VariantOptionValue[][] {
  const completeGroups = groups.filter((group) => group.name.trim() !== "" && group.options.length > 0);
  if (completeGroups.length !== groups.length || completeGroups.length === 0) return [];

  return completeGroups.reduce<VariantOptionValue[][]>(
    (combinations, group) => combinations.flatMap((combination) =>
      group.options.map((value) => [...combination, { name: group.name.trim(), value }]),
    ),
    [[]],
  );
}

export function synchronizeVariantCombinations(
  groups: VariantOptionGroup[],
  current: VariantCombinationDraft[],
  basePrice: string,
  defaultLowStockThreshold: string,
  createLocalId: () => string,
): VariantCombinationDraft[] {
  const existingByKey = new Map(current.map((variant) => [variantCombinationKey(variant.option_values), variant]));

  return buildOptionCombinations(groups).map((optionValues) => {
    const existing = existingByKey.get(variantCombinationKey(optionValues));
    if (existing) {
      return {
        ...existing,
        name: optionValues.map((option) => option.value).join(" / "),
        options: optionValues.map((option) => option.value),
        option_values: optionValues,
      };
    }

    return {
      localId: createLocalId(),
      name: optionValues.map((option) => option.value).join(" / "),
      sku: "",
      barcode: "",
      options: optionValues.map((option) => option.value),
      option_values: optionValues,
      price_override: basePrice,
      sale_price_override: "",
      stock_quantity: "0",
      low_stock_threshold: defaultLowStockThreshold || "0",
      active: true,
    };
  });
}
