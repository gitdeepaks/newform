"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { CopyIcon, DownloadIcon } from "lucide-react";

type QrCodeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareUrl: string | null;
  dataUrl: string | null;
  error: string | null;
  isLoading: boolean;
  onDownload: () => void;
  onCopy: () => Promise<void>;
};

export function QrCodeDialog({
  open,
  onOpenChange,
  shareUrl,
  dataUrl,
  error,
  isLoading,
  onDownload,
  onCopy,
}: QrCodeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share with QR code</DialogTitle>
          <DialogDescription>Download or scan this code to open the public form.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            Generating QR code...
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : dataUrl ? (
          <div className="flex flex-col gap-4">
            <div className="mx-auto rounded-xl border bg-white p-4 shadow-sm">
              <img src={dataUrl} alt="QR code for public form" className="h-56 w-56" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="qr-share-url">Public URL</Label>
              <div className="flex gap-2">
                <Input id="qr-share-url" value={shareUrl ?? ""} readOnly />
                <Button type="button" variant="outline" onClick={onCopy}>
                  <CopyIcon />
                  Copy
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" disabled={!dataUrl} onClick={onDownload}>
            <DownloadIcon />
            Download PNG
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
