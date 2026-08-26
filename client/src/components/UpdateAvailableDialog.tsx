import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/Button";
import { useI18n } from "@/contexts/i18n-context";
import { useUpdateCheck } from "@/hooks/use-update-check";
import { APP_VERSION } from "@/lib/appVersion";
import { Download, Sparkles } from "lucide-react";

export function UpdateAvailableDialog() {
  const { t } = useI18n();
  const { update, open, setOpen, dismiss, download } = useUpdateCheck();

  if (!update) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
        else setOpen(true);
      }}
    >
      <DialogContent className="sm:max-w-md border-indigo-200">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-900 font-display text-xl">
            <Sparkles className="w-5 h-5 text-amber-500" />
            {t("update.title")}
          </DialogTitle>
          <DialogDescription className="text-left space-y-2 pt-2">
            <p>
              {t("update.message")
                .replace("{version}", update.tag)
                .replace("{current}", APP_VERSION)}
            </p>
            {update.assetName && (
              <p className="text-xs text-gray-500 font-mono break-all">{update.assetName}</p>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2">
          <Button variant="outline" className="w-full sm:w-auto" onClick={dismiss}>
            {t("update.later")}
          </Button>
          <Button variant="primary" className="w-full sm:w-auto" onClick={download}>
            <Download className="w-4 h-4 mr-2" />
            {t("update.download")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
