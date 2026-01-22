export interface FlutterInAppWebView {
  callHandler(handlerName: string, ...args: unknown[]): Promise<unknown>;
}

declare global {
  interface Window {
    flutter_inappwebview?: FlutterInAppWebView;
  }
}

export {};

