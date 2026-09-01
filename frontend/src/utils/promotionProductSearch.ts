export const PRODUCT_SEARCH_DEBOUNCE_MS = 2000;
export const MIN_PRODUCT_SEARCH_LENGTH = 2;
export const PRODUCT_SEARCH_CACHE_MS = 60_000;

type TimerApi = {
  setTimeout: (callback: () => void, delay: number) => number;
  clearTimeout: (timer: number) => void;
};

export function createDebouncedProductSearch(
  timers: TimerApi = window,
  delay = PRODUCT_SEARCH_DEBOUNCE_MS,
) {
  let timer: number | null = null;

  const cancel = () => {
    if (timer === null) return;
    timers.clearTimeout(timer);
    timer = null;
  };

  return {
    schedule(callback: () => void) {
      cancel();
      timer = timers.setTimeout(() => {
        timer = null;
        callback();
      }, delay);
    },
    flush(callback: () => void) {
      cancel();
      callback();
    },
    cancel,
    isPending: () => timer !== null,
  };
}

export const isLatestProductSearch = (
  requestId: number,
  latestRequestId: number,
) => requestId === latestRequestId;

export const isEligibleProductSearch = (query: string) =>
  query.trim().length >= MIN_PRODUCT_SEARCH_LENGTH;
