import { useEffect, useState, type FormEvent } from "react";
import { FormField } from "@hkpd/ui";
import {
  IndexedDbQueue,
  type LocalOperation,
  type SyncSubmission,
} from "@hkpd/offline/browser";
// Stable IDs ONLY for isolated synthetic UI storage. Live scope must come from a server session.
const editionId = "10000000-0000-4000-8000-000000000001";
const scope = { editionId, actorId: "10000000-0000-4000-8000-000000000002" };
const matchId = "10000000-0000-4000-8000-000000000003";
const ruleId = "10000000-0000-4000-8000-000000000004";
const assignmentId = "10000000-0000-4000-8000-000000000005";
const athleteA = "10000000-0000-4000-8000-000000000006";
const athleteB = "10000000-0000-4000-8000-000000000007";
export function OfflineWorkspace() {
  const [queue, setQueue] = useState<IndexedDbQueue | null>(null);
  const [records, setRecords] = useState<LocalOperation[]>([]);
  const [left, setLeft] = useState(""),
    [right, setRight] = useState("");
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    let opened: IndexedDbQueue | null = null;
    void IndexedDbQueue.open(window.indexedDB, "hkpd-offline-preview-v1")
      .then(async (q) => {
        opened = q;
        if (!active) {
          q.close();
          return;
        }
        const saved = await q.list(scope);
        if (active) {
          setQueue(q);
          setRecords(saved);
        }
      })
      .catch(() => {
        if (active)
          setError(
            "Không mở được nơi lưu trên trình duyệt. Chưa thể lưu bản nhập.",
          );
      });
    return () => {
      active = false;
      opened?.close();
    };
  }, []);
  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!queue) return;
    if (
      !/^\d+$/.test(left) ||
      !/^\d+$/.test(right) ||
      !Number.isSafeInteger(Number(left)) ||
      !Number.isSafeInteger(Number(right))
    ) {
      setError("Nhập hai tỷ số nguyên không âm; nhập rõ 0 nếu không ghi điểm.");
      return;
    }
    const submission: SyncSubmission = {
      operation_id: crypto.randomUUID(),
      base_version: 1,
      assignment_snapshot_id: assignmentId,
      submission: {
        match_id: matchId,
        base_official_version: 0,
        payload: {
          rule_snapshot_id: ruleId,
          file_ids: [],
          entries: [
            {
              participant: { kind: "athlete", athlete_id: athleteA },
              value: {
                kind: "score",
                scored: Number(left),
                conceded: Number(right),
              },
            },
            {
              participant: { kind: "athlete", athlete_id: athleteB },
              value: {
                kind: "score",
                scored: Number(right),
                conceded: Number(left),
              },
            },
          ],
        },
      },
    };
    setBusy(true);
    try {
      await queue.append(scope, submission);
      setNotice(
        "Đã lưu bản thử trên trình duyệt này. Chưa gửi và chưa xác nhận kết quả.",
      );
      setRecords(await queue.list(scope));
    } catch {
      setError(
        "Không lưu hoặc đọc lại được bản nhập. Giữ nguyên ô nhập để thử lại; hãy kiểm tra dung lượng trình duyệt.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card" aria-label="Bản nhập ngoại tuyến thử">
      <p className="eyebrow">DỮ LIỆU TỔNG HỢP · BẢN THỬ</p>
      <h2>Giữ bản nhập khi mất mạng</h2>
      <p>
        Mỗi lần lưu tạo một bản mới cho trận thử giữa VĐV tổng hợp A và B. Các
        bản trước vẫn được giữ khi tải lại trang hoặc đổi tab.
      </p>
      <p className="draft-note">
        Mở trang trước khi mất mạng. Chỉ dùng dữ liệu thử trên thiết bị của bạn.
        Bản thử này chưa kết nối tài khoản, gửi máy chủ hoặc xác nhận kết quả;
        không nhập dữ liệu thật. Xóa dữ liệu trang trong trình duyệt sẽ xóa các
        bản đã lưu.
      </p>
      <form onSubmit={(event) => void save(event)}>
        <FormField
          label="Tỷ số thử A"
          value={left}
          onChange={(e) => setLeft(e.target.value)}
          inputMode="numeric"
          required
        />
        <FormField
          label="Tỷ số thử B"
          value={right}
          onChange={(e) => setRight(e.target.value)}
          inputMode="numeric"
          required
        />
        <button type="submit" disabled={!queue || busy}>
          {busy ? "Đang lưu…" : "Lưu bản ngoại tuyến thử"}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <h3>Bản đã lưu: {records.length}</h3>
      <ul aria-label="Các bản ngoại tuyến đã lưu">
        {records.map((record) => {
          const value = record.submission.submission.payload.entries[0]?.value;
          return (
            <li key={record.submission.operation_id}>
              <strong>
                {value?.kind === "score"
                  ? `${value.scored}–${value.conceded}`
                  : "Bản nhập"}
              </strong>{" "}
              · Chưa gửi ·{" "}
              <small>Mã thao tác: {record.submission.operation_id}</small>
            </li>
          );
        })}
      </ul>
      {!records.length && (
        <p>Chưa có bản nhập. Bạn có thể lưu nhiều bản để đối chiếu.</p>
      )}
    </section>
  );
}
