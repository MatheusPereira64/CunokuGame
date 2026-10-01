import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/contexts/i18n-context";
import { UpdateAvailableDialog } from "@/components/UpdateAvailableDialog";
import Home from "@/pages/Home";
import Game from "@/pages/Game";
import JoinInvite from "@/pages/JoinInvite";
import NotFound from "@/pages/not-found";
import { parseInviteCode } from "@shared/invite";
import { isNativeApp } from "@/lib/gameServer";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/join/:code">{(params) => <JoinInvite code={params.code ?? ""} />}</Route>
      <Route path="/game/:code" component={Game} />
      <Route component={NotFound} />
    </Switch>
  );
}

function DeepLinkListener() {
  useEffect(() => {
    if (!isNativeApp()) return;
    let remove: (() => void) | undefined;
    void import("@capacitor/app")
      .then(({ App }) => App.addListener("appUrlOpen", ({ url }) => {
        const code = parseInviteCode(url);
        if (code) window.location.assign(`/join/${code}`);
      }))
      .then((handle) => {
        remove = () => {
          void handle.remove();
        };
      })
      .catch(() => undefined);
    return () => remove?.();
  }, []);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <TooltipProvider>
          <Toaster />
          <UpdateAvailableDialog />
          <DeepLinkListener />
          <Router />
        </TooltipProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
