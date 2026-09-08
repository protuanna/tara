"use client";

import { useEffect, useState } from "react";
import { apiMutate } from "@/lib/use-api";

// Not one of the 8 design screens — a throwaway page for trying out Web
// Push end-to-end (service worker + subscribe + send) before deciding if
// it's worth a real place in the nav. Safe to delete once the experiment
// is done, or to fold into a real "Settings" screen if it sticks.

type Status = "unsupported" | "checking" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function PushTestPage() {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string | null>(null);
  const [title, setTitle] = useState("Tara Shop");
  const [body, setBody] = useState("Đơn hàng mới vừa được tạo!");

  useEffect(() => {
    void refreshStatus();
  }, []);

  async function refreshStatus() {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    const reg = await navigator.serviceWorker.register("/sw.js");
    const sub = await reg.pushManager.getSubscription();
    setStatus(sub ? "on" : "off");
  }

  async function handleEnable() {
    setError(null);
    setBusy(true);
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Thiếu NEXT_PUBLIC_VAPID_PUBLIC_KEY trong .env.local");

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const json = sub.toJSON();
      const result = await apiMutate("/api/push/subscribe", "POST", {
        endpoint: json.endpoint,
        keys: json.keys,
      });
      if ("error" in result) throw new Error(result.error);

      setStatus("on");
      setLog("Đã đăng ký nhận thông báo trên thiết bị này.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không bật được thông báo");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setError(null);
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await apiMutate("/api/push/unsubscribe", "POST", { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setStatus("off");
      setLog("Đã tắt thông báo trên thiết bị này.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tắt được thông báo");
    } finally {
      setBusy(false);
    }
  }

  async function handleSendTest() {
    setError(null);
    setLog(null);
    setBusy(true);
    try {
      const result = await apiMutate<{ sent: number; removed: number; pushError: string | null }>(
        "/api/push/send",
        "POST",
        { title, body },
      );
      if ("error" in result) throw new Error(result.error);
      const { sent, removed, pushError } = result.data;
      setLog(
        `Đã lưu vào danh sách thông báo. Gửi push tới ${sent} thiết bị (loại bỏ ${removed} subscription hết hạn).` +
          (pushError ? ` Lỗi gửi push: ${pushError}` : ""),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gửi thất bại");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-lg font-bold">Thử thông báo đẩy</h1>

      <p className="text-sm text-muted">
        Trên iPhone: mở trang này trong Safari, bấm Share → &quot;Thêm vào MH chính&quot;, rồi mở
        app từ icon màn hình chính (không phải tab Safari) trước khi bật thông báo — iOS chỉ cho
        web push từ app đã cài, không cho trong tab trình duyệt thường.
      </p>

      <div className="rounded-2xl border border-line bg-white p-4 text-sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-semibold">Trạng thái</span>
          <StatusBadge status={status} />
        </div>

        {status === "unsupported" && (
          <p className="text-muted">
            Trình duyệt/chế độ này không hỗ trợ Push API (cần Safari 16.4+ ở chế độ standalone
            trên iOS, hoặc Chrome/Edge/Firefox trên desktop).
          </p>
        )}
        {status === "denied" && (
          <p className="text-muted">
            Đã từ chối quyền thông báo — bật lại trong Cài đặt hệ thống cho app này rồi tải lại
            trang.
          </p>
        )}

        {(status === "off" || status === "on") && (
          <button
            type="button"
            disabled={busy}
            onClick={status === "on" ? handleDisable : handleEnable}
            className="w-full rounded-2xl bg-primary py-3 text-sm font-extrabold text-white disabled:opacity-60"
          >
            {status === "on" ? "Tắt thông báo" : "Bật thông báo"}
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-line bg-white p-4 text-sm">
        <span className="mb-3 block font-semibold">Gửi thử</span>
        <div className="flex flex-col gap-2">
          <input
            className="rounded-lg border border-line px-3 py-2 text-base"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề"
          />
          <input
            className="rounded-lg border border-line px-3 py-2 text-base"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Nội dung"
          />
          <button
            type="button"
            disabled={busy || status !== "on"}
            onClick={handleSendTest}
            className="rounded-2xl bg-primary py-3 text-sm font-extrabold text-white disabled:opacity-60"
          >
            Gửi thông báo thử
          </button>
          {status !== "on" && (
            <p className="text-xs text-muted">Bật thông báo ở trên trước đã.</p>
          )}
        </div>
      </div>

      {log && <p className="text-sm text-paid">{log}</p>}
      {error && <p className="text-sm text-unpaid">{error}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { label: string; className: string }> = {
    checking: { label: "Đang kiểm tra…", className: "bg-cancel-bg text-cancel" },
    unsupported: { label: "Không hỗ trợ", className: "bg-cancel-bg text-cancel" },
    denied: { label: "Đã từ chối", className: "bg-unpaid/10 text-unpaid" },
    off: { label: "Đang tắt", className: "bg-pending-bg text-pending" },
    on: { label: "Đang bật", className: "bg-done-bg text-done" },
  };
  const { label, className } = map[status];
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${className}`}>{label}</span>
  );
}
