import { useCallback, useState } from "react";
import { useFlutterInAppWebView } from "./useFlutterInAppWebView";

export function useFlutterErrorHandler() {
  const { flutterWebView, isFlutterInAppWebView } = useFlutterInAppWebView();
  const [error, setError] = useState<string | null>(null);

  const reportError = useCallback(
    (message: string) => {
      if (isFlutterInAppWebView && flutterWebView) {
        void flutterWebView
          .callHandler("failedWithError", {
            errorMessage: message,
          })
          .catch((err) =>
            console.error("Failed to notify Flutter about error", err)
          );
        setError(null);
      } else {
        setError(message);
      }
    },
    [flutterWebView, isFlutterInAppWebView]
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    error,
    reportError,
    clearError,
    isFlutterInAppWebView,
    flutterWebView,
  };
}

