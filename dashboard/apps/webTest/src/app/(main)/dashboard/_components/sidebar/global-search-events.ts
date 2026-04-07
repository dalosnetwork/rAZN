"use client";

export type GlobalSearchScope = "all" | "actions";

export type OpenGlobalSearchDetail = {
  scope?: GlobalSearchScope;
  query?: string;
};

const OPEN_GLOBAL_SEARCH_EVENT = "dashboard:global-search:open";

export function openGlobalSearch(detail: OpenGlobalSearchDetail = {}) {
  window.dispatchEvent(
    new CustomEvent<OpenGlobalSearchDetail>(OPEN_GLOBAL_SEARCH_EVENT, {
      detail,
    }),
  );
}

export function subscribeToGlobalSearch(
  listener: (detail: OpenGlobalSearchDetail) => void,
) {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<OpenGlobalSearchDetail>;
    listener(customEvent.detail ?? {});
  };

  window.addEventListener(OPEN_GLOBAL_SEARCH_EVENT, handler);
  return () => window.removeEventListener(OPEN_GLOBAL_SEARCH_EVENT, handler);
}
