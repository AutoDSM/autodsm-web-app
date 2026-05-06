"use client"

import * as React from "react"

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { cn } from "@/lib/utils"

/** One source: `url` plus `title` / `description` from your pipeline. */
export type CitationSourceInput = {
  url: string
  title?: React.ReactNode
  description?: React.ReactNode
}

export type ResolvedCitation = {
  url: string
  title: React.ReactNode | null
  description: React.ReactNode | null
  siteName: string
  faviconSrc: string
}

export function parseCitationUrl(urlStr: string): URL {
  const trimmed = urlStr.trim()
  try {
    return new URL(trimmed)
  } catch {
    return new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`)
  }
}

function titleCaseLabel(label: string): string {
  if (!label) return label
  const lower = label.toLowerCase()
  return lower.slice(0, 1).toUpperCase() + lower.slice(1)
}

export function rootDomainSiteName(url: URL): string {
  const host = url.hostname.replace(/^www\./i, "").toLowerCase()
  const segments = host.split(".").filter(Boolean)
  if (segments.length === 0) return ""
  const label =
    segments.length >= 2 ? segments[segments.length - 2]! : segments[0]!
  return titleCaseLabel(label)
}

function hasCitationField(v: unknown): boolean {
  return (
    v !== undefined && v !== null && !(typeof v === "string" && v.trim() === "")
  )
}

export function resolveCitationSource(input: CitationSourceInput): ResolvedCitation {
  const parsed = parseCitationUrl(input.url)
  const siteName = rootDomainSiteName(parsed)
  const faviconSrc = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsed.hostname)}&sz=64`
  return {
    url: parsed.href,
    title: hasCitationField(input.title) ? input.title! : null,
    description: hasCitationField(input.description) ? input.description! : null,
    siteName,
    faviconSrc,
  }
}

export function resolveCitationSources(
  inputs: CitationSourceInput[]
): ResolvedCitation[] {
  return inputs.map(resolveCitationSource)
}

type CitationRootContextValue = {
  citations: ResolvedCitation[]
  activeIndex: number
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>
}

const CitationRootContext = React.createContext<CitationRootContextValue | null>(
  null
)

const CitationItemContext = React.createContext<ResolvedCitation | null>(null)

function useCitationRoot(component: string): CitationRootContextValue {
  const ctx = React.useContext(CitationRootContext)
  if (!ctx) throw new Error(`${component} must be used within Citation`)
  return ctx
}

function useResolvedCitation(component: string): ResolvedCitation {
  const item = React.useContext(CitationItemContext)
  const root = useCitationRoot(component)
  const idx = Math.min(
    Math.max(0, root.activeIndex),
    Math.max(0, root.citations.length - 1)
  )
  const fromRoot = root.citations[idx]
  const resolved = item ?? fromRoot
  if (!resolved) throw new Error(`${component}: no citation for this scope`)
  return resolved
}

export type CitationProps = Omit<
  React.ComponentProps<typeof HoverCard>,
  "children"
> & {
  citations: CitationSourceInput[]
  children?: React.ReactNode
}

function Citation({ citations: citationInputs, children, ...hoverCardProps }: CitationProps) {
  const resolved = React.useMemo(
    () => resolveCitationSources(citationInputs),
    [citationInputs]
  )

  const [activeIndex, setActiveIndex] = React.useState(0)

  React.useEffect(() => {
    setActiveIndex((i) =>
      resolved.length === 0 ? 0 : Math.min(Math.max(0, i), resolved.length - 1)
    )
  }, [resolved.length])

  if (resolved.length === 0) return null

  return (
    <CitationRootContext.Provider value={{ citations: resolved, activeIndex, setActiveIndex }}>
      <HoverCard data-slot="citation" openDelay={50} closeDelay={50} {...hoverCardProps}>
        {children}
      </HoverCard>
    </CitationRootContext.Provider>
  )
}

export type CitationTriggerProps = Omit<
  React.ComponentProps<typeof HoverCardTrigger>,
  "children"
> & {
  label?: React.ReactNode
  showFavicon?: boolean
  showSiteName?: boolean
}

function CitationTrigger({
  className,
  label,
  showFavicon = true,
  showSiteName = true,
  ...props
}: CitationTriggerProps) {
  const root = useCitationRoot("CitationTrigger")
  const c = root.citations[0]!

  let text: React.ReactNode =
    label !== undefined && label !== null ? label : showSiteName ? c.siteName : null

  let hasText =
    text !== null &&
    text !== undefined &&
    !(typeof text === "string" && text.trim() === "")

  if (!showFavicon && !hasText) {
    text = "Source"
    hasText = true
  }

  const baseClassName = cn(
    "inline-flex h-5.5 max-w-full items-center rounded-full align-middle",
    "border border-[var(--border-subtle)] bg-[var(--bg-secondary)]",
    "text-[11px] leading-4 text-[var(--text-secondary)]",
    "transition-[background-color,border-color,color,box-shadow] duration-150 [transition-timing-function:var(--ease-standard)]",
    "hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)]",
    "focus-visible:outline-none focus-visible:[box-shadow:0_0_0_1px_var(--accent),0_0_0_4px_var(--accent-glow-soft)]",
    hasText && showFavicon && "gap-1 py-0.5 pr-2 pl-1",
    hasText && !showFavicon && "px-2 py-0.5",
    !hasText && showFavicon && "p-1"
  )

  const multipleSources = root.citations.length > 1

  const chipBody = (
    <>
      {showFavicon ? <CitationFavicon src={c.faviconSrc} /> : null}
      {hasText ? <CitationSiteName>{text}</CitationSiteName> : null}
      {multipleSources ? (
        <span className="text-[11px] leading-4 tabular-nums text-[var(--text-tertiary)]">
          +{root.citations.length - 1}
        </span>
      ) : null}
    </>
  )

  return (
    <HoverCardTrigger data-slot="citation-trigger" asChild {...props}>
      {multipleSources ? (
        <span className={cn(baseClassName, className)}>{chipBody}</span>
      ) : (
        <a
          href={c.url}
          target="_blank"
          rel="noreferrer"
          className={cn(baseClassName, className)}
        >
          {chipBody}
        </a>
      )}
    </HoverCardTrigger>
  )
}

export type CitationContentProps = React.ComponentProps<typeof HoverCardContent>

function CitationContent({
  className,
  align = "center",
  sideOffset = 6,
  ...props
}: CitationContentProps) {
  return (
    <HoverCardContent
      data-slot="citation-content"
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "w-72 overflow-hidden rounded-xl border border-[var(--border-subtle)] p-0",
        "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-md)]",
        className
      )}
      {...props}
    />
  )
}

export type CitationItemProps = React.ComponentPropsWithoutRef<"a"> & {
  showTitle?: boolean
  showDescription?: boolean
  showSource?: boolean
}

function CitationItem({
  className,
  children,
  href,
  showTitle = true,
  showDescription = true,
  showSource = true,
  ...props
}: CitationItemProps) {
  const c = useResolvedCitation("CitationItem")
  const defaultContent = (
    <>
      {showTitle && c.title != null ? (
        <h4 className="line-clamp-2 text-[12px] leading-4 font-medium text-[var(--text-primary)]">
          {c.title}
        </h4>
      ) : null}
      {showDescription && c.description != null ? (
        <p className="mt-1 line-clamp-3 text-[12px] leading-4.5 text-[var(--text-secondary)]">
          {c.description}
        </p>
      ) : null}
      {showSource ? <CitationSource /> : null}
    </>
  )

  return (
    <a
      data-slot="citation-item"
      className={cn("flex w-full flex-col p-3 no-underline outline-none", className)}
      href={href ?? c.url}
      target="_blank"
      rel="noreferrer"
      {...props}
    >
      {children ?? defaultContent}
    </a>
  )
}

type CitationSourceProps = React.HTMLAttributes<HTMLDivElement>

function CitationSource({ className, children, ...props }: CitationSourceProps) {
  return (
    <div
      data-slot="citation-source"
      className={cn("mt-2 flex items-center gap-1.5", className)}
      {...props}
    >
      {children ?? (
        <>
          <CitationFavicon />
          <CitationSiteName />
        </>
      )}
    </div>
  )
}

type CitationFaviconProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "children"> & {
  src?: string
}

function CitationFavicon({ className, src, ...props }: CitationFaviconProps) {
  const c = useResolvedCitation("CitationFavicon")
  const resolvedSrc = src ?? c.faviconSrc
  if (resolvedSrc === "") return null

  return (
    <img
      src={resolvedSrc}
      alt=""
      data-slot="citation-favicon"
      className={cn("size-4 shrink-0 rounded-full bg-white/70", className)}
      {...props}
    />
  )
}

function CitationSiteName({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  const c = useResolvedCitation("CitationSiteName")
  const content = children ?? c.siteName
  if (content == null) return null

  return (
    <span
      data-slot="citation-site-name"
      className={cn("text-[11px] leading-4 text-[var(--text-tertiary)]", className)}
      {...props}
    >
      {content}
    </span>
  )
}

export { Citation, CitationContent, CitationItem, CitationTrigger }

