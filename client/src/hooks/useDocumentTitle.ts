import { useEffect } from "react";

const BASE_TITLE = "nuva Timer";

/**
 * Sets document.title while the component is mounted.
 * Restores previous title on unmount.
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} — ${BASE_TITLE}` : BASE_TITLE;
    return () => {
      document.title = prev;
    };
  }, [title]);
}
