import { useCallback } from "react";
import { useSearchParams } from "react-router";

type UrlTabOptions = {
  parameter?: string;
  resetParameters?: readonly string[];
};

export function useUrlTab<T extends string>(
  validTabs: readonly T[],
  defaultTab: T,
  options: UrlTabOptions = {},
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const parameter = options.parameter ?? "tab";
  const requestedTab = searchParams.get(parameter);
  const activeTab = validTabs.some((tab) => tab === requestedTab)
    ? (requestedTab as T)
    : defaultTab;

  const setActiveTab = useCallback(
    (nextTab: T) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);

        if (nextTab === defaultTab) {
          next.delete(parameter);
        } else {
          next.set(parameter, nextTab);
        }

        options.resetParameters?.forEach((name) => next.delete(name));
        return next;
      });
    },
    [defaultTab, options.resetParameters, parameter, setSearchParams],
  );

  return { activeTab, setActiveTab };
}
