"use client";

import { useCallback, useEffect, useState } from "react";

type Preview = {
  unsubmittedCount: number;
  mentionMembers: { name: string; department: string; discordId: string }[];
  pendingWithoutMention: { name: string; department: string }[];
  isTestOnlyWebhook?: boolean;
};

export function MvbeReminderPanel() {
  const [sendLoading, setSendLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sendMsg, setSendMsg] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  /** 空なら環境変数 DISCORD_MVBE_REMINDER_THREAD_ID（なければ Webhook の親チャンネル） */
  const [threadId, setThreadId] = useState("");

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setPreview(null);
    setPreviewError(null);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen, closeModal]);

  const openConfirmModal = async () => {
    setPreviewLoading(true);
    setPreviewError(null);
    setSendMsg(null);
    setPreview(null);
    setModalOpen(true);
    try {
      const res = await fetch("/api/admin/mvbe-reminder");
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        preview?: Preview;
      };
      if (!res.ok) {
        setPreviewError(data.error ?? "プレビューの取得に失敗しました。");
        return;
      }
      if (data.preview) setPreview(data.preview);
      else setPreviewError("プレビューデータがありません。");
    } catch {
      setPreviewError("通信エラーが発生しました。");
    } finally {
      setPreviewLoading(false);
    }
  };

  const confirmSend = async () => {
    setSendLoading(true);
    setSendMsg(null);
    try {
      const body =
        threadId.trim().length > 0 ? { threadId: threadId.trim() } : undefined;
      const res = await fetch("/api/admin/mvbe-reminder", {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        messagesSent?: number;
      };
      if (!res.ok) {
        setSendMsg(data.error ?? "送信に失敗しました。");
        return;
      }
      closeModal();
      setSendMsg(`送信しました（${data.messagesSent ?? 0} 件の投稿）。`);
    } catch {
      setSendMsg("通信エラーが発生しました。");
    } finally {
      setSendLoading(false);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      <div>
        <label htmlFor="mvbe-reminder-thread-id" className="text-xs font-medium text-slate-600">
          投稿先スレッド ID（任意）
        </label>
        <input
          id="mvbe-reminder-thread-id"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="空白＝環境変数の既定または Webhook のチャンネル"
          value={threadId}
          onChange={(e) => setThreadId(e.target.value)}
          className="mt-1 w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
        />
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
          Discord 開発者モードでスレッド名を右クリックし「スレッド ID をコピー」。Webhook
          と同じ親チャンネル上のスレッドである必要があります。
        </p>
      </div>
      <button
        type="button"
        onClick={() => void openConfirmModal()}
        disabled={sendLoading || previewLoading}
        className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
      >
        {previewLoading ? "確認準備中…" : sendLoading ? "送信中…" : "Discord に MVBe リマインドを送る"}
      </button>
      {sendMsg && (
        <p className="text-sm text-slate-700" role="status">
          {sendMsg}
        </p>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mvbe-reminder-modal-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2
              id="mvbe-reminder-modal-title"
              className="text-base font-bold text-slate-900"
            >
              Discord リマインド送信の確認
            </h2>

            {previewLoading && (
              <p className="mt-4 text-sm text-slate-600">読み込み中です…</p>
            )}

            {previewError && (
              <p className="mt-4 text-sm text-red-700">{previewError}</p>
            )}

            {preview && !previewLoading && (
              <div className="mt-4 space-y-4 text-sm text-slate-800">
                {!preview.isTestOnlyWebhook && (
                  <p>
                    現在の提出ウィンドウで MVBe 未提出のメンバーは{" "}
                    <strong className="tabular-nums">{preview.unsubmittedCount}</strong>{" "}
                    名です。
                  </p>
                )}
                <p className="leading-relaxed">
                  {preview.isTestOnlyWebhook ? (
                    <>
                      現在は<strong>テスト送信モード</strong>
                      です。メンション・未提出者一覧は使わず、設定されたテスト文のみ Webhook
                      に送信されます。よろしいですか？
                    </>
                  ) : (
                    <>
                      以下のメンバーを<strong>メンションに加えて</strong>
                      リマインドメッセージを送信します。よろしいですか？
                    </>
                  )}
                </p>
                {!preview.isTestOnlyWebhook && preview.mentionMembers.length > 0 ? (
                  <ul className="max-h-40 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 py-2 pl-5 pr-2 text-slate-800">
                    {preview.mentionMembers.map((m) => (
                      <li key={m.discordId} className="list-disc py-0.5">
                        {m.name}
                        <span className="text-slate-500">
                          {" "}
                         （{m.department}）
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : !preview.isTestOnlyWebhook ? (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-950">
                    メンション付きで送信できるメンバーは 0
                    名です（メンバー対応表・Bot 設定を確認してください）。それ以外の文案のみ送信されます。
                  </p>
                ) : null}
                {!preview.isTestOnlyWebhook && preview.pendingWithoutMention.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-600">
                      未提出だが Discord ID が取れず、メンションに含まれない見込みのメンバー:
                    </p>
                    <ul className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-amber-100 bg-amber-50/50 py-2 pl-5 pr-2 text-xs text-slate-800">
                      {preview.pendingWithoutMention.map((p) => (
                        <li key={`${p.name}-${p.department}`} className="list-disc py-0.5">
                          {p.name}
                          <span className="text-slate-500"> （{p.department}）</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={closeModal}
                disabled={sendLoading}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => void confirmSend()}
                disabled={
                  sendLoading || previewLoading || !!previewError || !preview
                }
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
              >
                {sendLoading ? "送信中…" : "送信する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
