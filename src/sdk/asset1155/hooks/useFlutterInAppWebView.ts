import { useEffect, useState } from "react";
import type { FlutterInAppWebView } from "../global";

export function useFlutterInAppWebView() {
  const [flutterWebView, setFlutterWebView] =
    useState<FlutterInAppWebView | null>(() => {
      if (typeof window === "undefined") return null;
      return window.flutter_inappwebview ?? null;
    });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (flutterWebView !== null) return;

    const updateFromWindow = () => {
      setFlutterWebView(window.flutter_inappwebview ?? null);
    };

    updateFromWindow();

    const readyEvent = "flutterInAppWebViewPlatformReady";
    const readyListener = () => updateFromWindow();

    window.addEventListener(readyEvent, readyListener);

    const pollId = window.setInterval(() => {
      if (window.flutter_inappwebview) {
        updateFromWindow();
        window.clearInterval(pollId);
      }
    }, 300);

    return () => {
      window.removeEventListener(readyEvent, readyListener);
      window.clearInterval(pollId);
    };
    // flutterWebView는 "발견 후 고정" 의도라 deps에서 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    flutterWebView,
    isFlutterInAppWebView: Boolean(flutterWebView),
  };
}

