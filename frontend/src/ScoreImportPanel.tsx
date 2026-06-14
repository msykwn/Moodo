import { useState } from "react"
import { importScores } from "./api"

interface Props {
  onImported: () => void
}

export function ScoreImportPanel({ onImported }: Props) {
  const [json, setJson] = useState("")
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const handleImport = async () => {
    setStatus("idle")
    setErrorMessage("")

    let parsed: unknown
    try {
      parsed = JSON.parse(json)
    } catch {
      setStatus("error")
      setErrorMessage("JSONの形式が正しくありません")
      return
    }

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Array.isArray((parsed as { tasks?: unknown }).tasks)
    ) {
      setStatus("error")
      setErrorMessage('{"tasks": [...]} の形式で貼り付けてください')
      return
    }

    try {
      await importScores(parsed as { tasks: { id: string; score: number }[] })
      setJson("")
      setStatus("success")
      onImported()
    } catch (e) {
      setStatus("error")
      setErrorMessage(e instanceof Error ? e.message : "インポートに失敗しました")
    }
  }

  return (
    <div className="score-import-panel">
      <h2 className="score-import-title">AIスコアのインポート</h2>
      <p className="score-import-guide">
        Claude.ai から受け取ったスコアJSONを貼り付けてください
      </p>
      <textarea
        className="score-import-textarea"
        value={json}
        onChange={(e) => setJson(e.target.value)}
        placeholder={'{"tasks": [{"id": "...", "score": 85}, ...]}'}
        rows={6}
      />
      <button
        className="score-import-btn"
        onClick={handleImport}
        disabled={json.trim() === ""}
      >
        スコアをインポート
      </button>
      {status === "success" && (
        <p className="score-import-feedback success">インポートしました</p>
      )}
      {status === "error" && (
        <p className="score-import-feedback error">{errorMessage}</p>
      )}
    </div>
  )
}
