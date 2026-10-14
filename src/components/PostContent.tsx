import type { ReactNode } from 'react'

function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\(https?:\/\/[^)]+\))/g)
  return parts.filter(Boolean).map((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/)
    if (link) return <a key={index} href={link[2]} target="_blank" rel="noreferrer" className="font-bold text-[#566f2d] underline decoration-[#a9cf5b] underline-offset-4">{link[1]}</a>
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>
    return part
  })
}

export function PostContent({ content, compact = false }: { content: string; compact?: boolean }) {
  const lines = content.replace(/\r/g, '').split('\n')
  const blocks: ReactNode[] = []
  let list: string[] = []
  const flushList = () => { if (list.length) { blocks.push(<ul key={`list-${blocks.length}`} className="ml-6 list-disc space-y-2">{list.map((item, index) => <li key={index}>{inline(item)}</li>)}</ul>); list = [] } }
  lines.forEach((line, index) => {
    if (line.startsWith('- ')) { list.push(line.slice(2)); return }
    flushList()
    if (!line.trim()) return
    if (line.startsWith('### ')) blocks.push(<h3 key={index} className="pt-3 text-xl font-black tracking-[-.02em]">{inline(line.slice(4))}</h3>)
    else if (line.startsWith('## ')) blocks.push(<h2 key={index} className="pt-5 text-2xl font-black tracking-[-.03em]">{inline(line.slice(3))}</h2>)
    else if (line.startsWith('# ')) blocks.push(<h2 key={index} className="pt-5 text-3xl font-black tracking-[-.04em]">{inline(line.slice(2))}</h2>)
    else if (line.startsWith('> ')) blocks.push(<blockquote key={index} className="border-l-4 border-[#a9cf5b] bg-[#f5f8ef] px-5 py-3 font-semibold italic text-[#526047]">{inline(line.slice(2))}</blockquote>)
    else blocks.push(<p key={index}>{inline(line)}</p>)
  })
  flushList()
  return <div className={compact ? 'space-y-3 text-sm leading-7' : 'space-y-5 text-base font-medium leading-8 text-[#403b35]'}>{blocks}</div>
}
