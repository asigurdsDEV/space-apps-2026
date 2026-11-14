import { useState } from 'react'

/** The share text plus a Copy button. If the clipboard is blocked, the text stays visible to copy by hand. */
export function ShareCard({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className="mv-card mv-share">
      <h3>Share your result</h3>
      <pre>{text}</pre>
      <button type="button" onClick={copy}>
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  )
}
