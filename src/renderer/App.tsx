import React, { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Paperclip, GitCommit, HeadCircuit, MagnifyingGlass, Rocket, ThumbsUp, ListChecks, Lightbulb,
  FastForward, Robot, MagnifyingGlassPlus, Lightning, Notepad, Target, CloudArrowUp, ChatText,
} from '@phosphor-icons/react'
import { TabStrip } from './components/TabStrip'
import { ConversationView } from './components/ConversationView'
import { InputBar } from './components/InputBar'
import { StatusBar } from './components/StatusBar'
import { MarketplacePanel } from './components/MarketplacePanel'
import { PopoverLayerProvider } from './components/PopoverLayer'
import { useClaudeEvents } from './hooks/useClaudeEvents'
import { useHealthReconciliation } from './hooks/useHealthReconciliation'
import { useSessionStore } from './stores/sessionStore'
import { useColors, useThemeStore, spacing } from './theme'

const TRANSITION = { duration: 0.26, ease: [0.4, 0, 0.1, 1] as const }

export default function App() {
  useClaudeEvents()
  useHealthReconciliation()

  const activeTabStatus = useSessionStore((s) => s.tabs.find((t) => t.id === s.activeTabId)?.status)
  const addAttachments = useSessionStore((s) => s.addAttachments)
  const colors = useColors()
  const setSystemTheme = useThemeStore((s) => s.setSystemTheme)
  const fullHeight = useThemeStore((s) => s.fullHeight)

  // ─── Theme initialization ───
  useEffect(() => {
    // Get initial OS theme — setSystemTheme respects themeMode (system/light/dark)
    window.clui.getTheme().then(({ isDark }) => {
      setSystemTheme(isDark)
    }).catch(() => {})

    // Listen for OS theme changes
    const unsub = window.clui.onThemeChange((isDark) => {
      setSystemTheme(isDark)
    })
    return unsub
  }, [setSystemTheme])

  useEffect(() => {
    useSessionStore.getState().initStaticInfo().then(async () => {
      // Try restoring saved tabs first
      const restored = await useSessionStore.getState().restoreTabs()
      if (restored) return

      // No saved tabs — create a fresh one
      const homeDir = useSessionStore.getState().staticInfo?.homePath || '~'
      const tab = useSessionStore.getState().tabs[0]
      if (tab) {
        useSessionStore.setState((s) => ({
          tabs: s.tabs.map((t, i) => (i === 0 ? { ...t, workingDirectory: homeDir, hasChosenDirectory: false } : t)),
        }))
        window.clui.createTab().then(({ tabId }) => {
          useSessionStore.setState((s) => ({
            tabs: s.tabs.map((t, i) => (i === 0 ? { ...t, id: tabId } : t)),
            activeTabId: tabId,
          }))
        }).catch(() => {})
      }
    })
  }, [])

  // OS-level click-through (RAF-throttled to avoid per-pixel IPC)
  useEffect(() => {
    if (!window.clui?.setIgnoreMouseEvents) return
    let lastIgnored: boolean | null = null

    const onMouseMove = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const isUI = !!(el && el.closest('[data-clui-ui]'))
      const shouldIgnore = !isUI
      if (shouldIgnore !== lastIgnored) {
        lastIgnored = shouldIgnore
        if (shouldIgnore) {
          window.clui.setIgnoreMouseEvents(true, { forward: true })
        } else {
          window.clui.setIgnoreMouseEvents(false)
        }
      }
    }

    const onMouseLeave = () => {
      if (lastIgnored !== true) {
        lastIgnored = true
        window.clui.setIgnoreMouseEvents(true, { forward: true })
      }
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseleave', onMouseLeave)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [])

  const isExpanded = useSessionStore((s) => s.isExpanded)
  const marketplaceOpen = useSessionStore((s) => s.marketplaceOpen)
  const isRunning = activeTabStatus === 'running' || activeTabStatus === 'connecting'

  // Layout dimensions — always full width; fullHeight toggle controls vertical space
  const contentWidth = 700
  const cardExpandedWidth = 700
  const cardCollapsedWidth = 670
  const cardCollapsedMargin = 15
  const bodyMaxHeight = fullHeight ? 520 : 400

  const sendMessage = useSessionStore((s) => s.sendMessage)

  const handleCommitPush = useCallback(() => {
    sendMessage('Commit all current changes with a descriptive commit message, then push to the remote repository.')
  }, [sendMessage])

  const handleProceed = useCallback(() => {
    sendMessage(
      'Yes, that looks great — go ahead and implement everything you suggested. Be thorough, creative, and don\'t hold back. ' +
      'If you spot additional ways to improve things along the way, take them. ' +
      'I trust your judgment — make it the best it can be.'
    )
  }, [sendMessage])

  const handleGreatJob = useCallback(() => {
    sendMessage(
      'That\'s exactly what I needed — great work! Keep this quality and approach going. ' +
      'If there\'s anything you\'d refine or improve further, go for it.'
    )
  }, [sendMessage])

  const handleRoadmap = useCallback(() => {
    sendMessage(
      'Give me a complete roadmap of everything I need to do or provide to make this project fully standalone and production-ready. ' +
      'List every step, every asset I need to gather, every configuration I need to set up, and every decision I need to make. ' +
      'Be specific — no vague steps. I want a clear numbered checklist I can work through one by one.'
    )
  }, [sendMessage])

  const handleBrainstorm = useCallback(() => {
    sendMessage(
      'Look at this project with fresh eyes. Search the web for what competitors and similar tools are doing, ' +
      'then suggest specific improvements, new features, and changes that would make this project stand out. ' +
      'Be specific — show me what others have that we don\'t, what we could do better, and any quick wins I\'m missing. ' +
      'Prioritize the suggestions by impact.'
    )
  }, [sendMessage])

  const handleProjectRecon = useCallback(() => {
    sendMessage(
      'Before we start working, do a full recon of this project:\n\n' +
      '1. Read the codebase — every directory, file, how it\'s structured, the tech stack, architecture, data flow, and the reasoning behind how it\'s built\n\n' +
      '2. Git status — show me what\'s uncommitted, what\'s committed but not pushed, what branch we\'re on, and any stale branches. If there\'s unpushed work, tell me what it is\n\n' +
      '3. Web context — search for the latest docs, changelogs, or known issues for the major dependencies in this project so we\'re working with current info, not outdated assumptions\n\n' +
      '4. Give me the breakdown:\n' +
      '   - Key files and what they do\n' +
      '   - Patterns and conventions used\n' +
      '   - Config, build system, deployment setup\n' +
      '   - What\'s solid vs what needs work\n' +
      '   - Any red flags, tech debt, or security concerns\n\n' +
      'Don\'t summarize — read the actual code. I want you to know this project as well as I do before we touch anything.'
    )
  }, [sendMessage])

  // ─── Right-side handlers ───

  const handleContinue = useCallback(() => {
    sendMessage('Continue where you left off. Pick up exactly from where you stopped and keep going.')
  }, [sendMessage])

  const handleAgentPrompt = useCallback(() => {
    sendMessage(
      'Analyze this project and identify everything that requires manual action outside the codebase — things like:\n' +
      '- SEO submissions (Google Search Console indexing, sitemap submission, Bing Webmaster)\n' +
      '- DNS and domain configuration\n' +
      '- Third-party service setup (analytics, form backends, CDN, email)\n' +
      '- Content that needs uploading (images, copy, legal pages)\n' +
      '- Accounts or API keys that need creating\n' +
      '- Social media or directory listings\n\n' +
      'Then write me a complete, structured, step-by-step browser agent prompt I can copy-paste into Claude Computer Use to automate as many of these tasks as possible. ' +
      'Format it as a numbered action list with exact URLs, exact clicks, and exact data to enter. ' +
      'The prompt should be self-contained — someone with no context should be able to follow it.'
    )
  }, [sendMessage])

  const handleSeoAudit = useCallback(() => {
    sendMessage(
      'Do a full SEO audit of this project:\n' +
      '1. Check every page for: title tag, meta description, Open Graph tags, canonical URL, heading hierarchy (single H1)\n' +
      '2. Verify JSON-LD structured data (LocalBusiness, BreadcrumbList) is present and valid\n' +
      '3. Check for sitemap.xml and robots.txt\n' +
      '4. Verify all images have alt tags and are properly sized\n' +
      '5. Check for broken internal links and missing pages\n' +
      '6. Flag any SEO issues and fix what you can in the code\n\n' +
      'Then write me a browser agent prompt for Claude Computer Use to:\n' +
      '- Submit the sitemap to Google Search Console\n' +
      '- Request indexing for each page URL\n' +
      '- Submit to Bing Webmaster Tools\n' +
      'Format as exact step-by-step actions with URLs and clicks.'
    )
  }, [sendMessage])

  const handlePerformance = useCallback(() => {
    sendMessage(
      'Audit this project for performance:\n' +
      '1. Check bundle size — identify the largest dependencies and any that could be lazy-loaded or replaced\n' +
      '2. Image optimization — are images properly sized, using modern formats (WebP/AVIF), lazy-loaded?\n' +
      '3. Font loading — are fonts preloaded, using display:swap, subset if possible?\n' +
      '4. JavaScript — any unused code shipped to the client? Components that should be server-only?\n' +
      '5. CSS — any unused Tailwind classes inflating the bundle?\n' +
      '6. Core Web Vitals concerns — LCP, CLS, INP risks in the current code\n\n' +
      'Fix everything you can directly. For things that need manual action, tell me exactly what to do.'
    )
  }, [sendMessage])

  const handleWhatsNext = useCallback(() => {
    sendMessage(
      'Look at this project and tell me:\n' +
      '1. What\'s unfinished — any incomplete features, placeholder content, TODO comments, or missing pages\n' +
      '2. What\'s broken — run the build, check for errors, test all links and forms\n' +
      '3. What needs my input — decisions only I can make (content, branding, credentials, business logic)\n' +
      '4. What you can do right now without me — list these so I can tell you to go ahead\n' +
      '5. What\'s blocking launch — the critical path items that must be done before this goes live\n\n' +
      'Prioritize by impact. Be specific, not vague.'
    )
  }, [sendMessage])

  const handleClientReady = useCallback(() => {
    sendMessage(
      'Is this project ready to hand to a client? Run through this checklist:\n' +
      '1. All navigation links work and point to real pages\n' +
      '2. All forms submit correctly (test the action/endpoint)\n' +
      '3. All images load (no broken URLs or placeholders left)\n' +
      '4. Fully responsive — looks good at 375px, 768px, 1024px, 1440px\n' +
      '5. Favicon and Open Graph images set\n' +
      '6. Analytics configured (Google Analytics, Google Tag Manager, or equivalent)\n' +
      '7. Domain/DNS ready — document what needs to be pointed where\n' +
      '8. SSL/HTTPS enforced\n' +
      '9. Legal pages present (Privacy Policy, Terms of Service) or placeholders with clear instructions\n' +
      '10. Contact info correct (phone, email, address)\n' +
      '11. Loading speed acceptable — no massive unoptimized images or blocking scripts\n' +
      '12. 404 page exists\n\n' +
      'For each item: PASS, FAIL (with fix), or NEEDS CLIENT INPUT. Fix everything you can.'
    )
  }, [sendMessage])

  const handleDeploy = useCallback(() => {
    sendMessage(
      'Deploy this Next.js project to Cloudflare:\n' +
      '1. Determine if this needs Cloudflare Pages or Workers — check for API routes, SSR, middleware, server actions\n' +
      '2. Set up or verify wrangler.toml / wrangler.jsonc with the right compatibility flags and Node.js compat\n' +
      '3. Configure R2 bucket if the project needs file storage or large static assets\n' +
      '4. List every environment variable and secret that needs to be set in the Cloudflare dashboard\n' +
      '5. Check for Node.js APIs that won\'t work in Workers runtime and fix them\n' +
      '6. Set up the build command and output directory correctly\n' +
      '7. Give me the exact commands: wrangler login, wrangler pages deploy, or wrangler deploy\n\n' +
      'If there are DNS steps needed, include those too.'
    )
  }, [sendMessage])

  const handleExplain = useCallback(() => {
    sendMessage('Explain what you just did — walk me through the changes, why you made them, and how they work together.')
  }, [sendMessage])

  const handleAttachFile = useCallback(async () => {
    const files = await window.clui.attachFiles()
    if (!files || files.length === 0) return
    addAttachments(files)
  }, [addAttachments])

  return (
    <PopoverLayerProvider>
      <div className="flex flex-col justify-end h-full" style={{ background: 'transparent' }}>

        {/* ─── 460px content column, centered. Circles overflow left. ─── */}
        <div style={{ width: contentWidth, position: 'relative', margin: '0 auto', transition: 'width 0.26s cubic-bezier(0.4, 0, 0.1, 1)' }}>

          <AnimatePresence initial={false}>
            {marketplaceOpen && (
              <div
                data-clui-ui
                style={{
                  width: 720,
                  maxWidth: 720,
                  marginLeft: '50%',
                  transform: 'translateX(-50%)',
                  marginBottom: 14,
                  position: 'relative',
                  zIndex: 30,
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.985 }}
                  transition={TRANSITION}
                >
                  <div
                    data-clui-ui
                    className="glass-surface overflow-hidden no-drag"
                    style={{
                      borderRadius: 24,
                      maxHeight: 470,
                    }}
                  >
                    <MarketplacePanel />
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/*
            ─── Tabs / message shell ───
            This always remains the chat shell. The marketplace is a separate
            panel rendered above it, never inside it.
          */}
          <motion.div
            data-clui-ui
            className="overflow-hidden flex flex-col drag-region"
            animate={{
              width: isExpanded ? cardExpandedWidth : cardCollapsedWidth,
              marginBottom: isExpanded ? 10 : -14,
              marginLeft: isExpanded ? 0 : cardCollapsedMargin,
              marginRight: isExpanded ? 0 : cardCollapsedMargin,
              background: isExpanded ? colors.containerBg : colors.containerBgCollapsed,
              borderColor: colors.containerBorder,
              boxShadow: isExpanded ? colors.cardShadow : colors.cardShadowCollapsed,
            }}
            transition={TRANSITION}
            style={{
              borderWidth: 1,
              borderStyle: 'solid',
              borderRadius: 20,
              position: 'relative',
              zIndex: isExpanded ? 20 : 10,
            }}
          >
            {/* Tab strip — always mounted */}
            <div className="no-drag">
              <TabStrip />
            </div>

            {/* Body — chat history only; the marketplace is a separate overlay above */}
            <motion.div
              initial={false}
              animate={{
                height: isExpanded ? 'auto' : 0,
                opacity: isExpanded ? 1 : 0,
              }}
              transition={TRANSITION}
              className="overflow-hidden no-drag"
            >
              <div style={{ maxHeight: bodyMaxHeight }}>
                <ConversationView />
                <StatusBar />
              </div>
            </motion.div>
          </motion.div>

          {/* ─── Input row — circles float outside left ─── */}
          {/* marginBottom: shadow buffer so the glass-surface drop shadow isn't clipped at the native window edge */}
          <div data-clui-ui className="relative" style={{ minHeight: 46, zIndex: 15, marginBottom: 10 }}>
            {/* Stacked circle buttons — expand on hover */}
            <div
              data-clui-ui
              className="circles-out"
            >
              <div className="btn-stack">
                {/* btn-1: Go Ahead (front — most used) */}
                <button
                  className="stack-btn stack-btn-1 glass-surface"
                  title="Go Ahead"
                  onClick={handleProceed}
                  disabled={isRunning}
                >
                  <Rocket size={17} />
                </button>
                {/* btn-2: Great Job */}
                <button
                  className="stack-btn stack-btn-2 glass-surface"
                  title="Great Job"
                  onClick={handleGreatJob}
                  disabled={isRunning}
                >
                  <ThumbsUp size={17} />
                </button>
                {/* btn-3: Commit & Push */}
                <button
                  className="stack-btn stack-btn-3 glass-surface"
                  title="Commit & Push"
                  onClick={handleCommitPush}
                  disabled={isRunning}
                >
                  <GitCommit size={17} />
                </button>
                {/* btn-4: Attach */}
                <button
                  className="stack-btn stack-btn-4 glass-surface"
                  title="Attach file"
                  onClick={handleAttachFile}
                  disabled={isRunning}
                >
                  <Paperclip size={17} />
                </button>
                {/* btn-5: Brainstorm */}
                <button
                  className="stack-btn stack-btn-5 glass-surface"
                  title="Brainstorm"
                  onClick={handleBrainstorm}
                  disabled={isRunning}
                >
                  <Lightbulb size={17} />
                </button>
                {/* btn-6: Roadmap */}
                <button
                  className="stack-btn stack-btn-6 glass-surface"
                  title="Roadmap"
                  onClick={handleRoadmap}
                  disabled={isRunning}
                >
                  <ListChecks size={17} />
                </button>
                {/* btn-7: Project Recon */}
                <button
                  className="stack-btn stack-btn-7 glass-surface"
                  title="Project Recon"
                  onClick={handleProjectRecon}
                  disabled={isRunning}
                >
                  <MagnifyingGlass size={17} />
                </button>
                {/* btn-8: Skills (back — rarely used) */}
                <button
                  className="stack-btn stack-btn-8 glass-surface"
                  title="Skills & Plugins"
                  onClick={() => useSessionStore.getState().toggleMarketplace()}
                  disabled={isRunning}
                >
                  <HeadCircuit size={17} />
                </button>
              </div>
            </div>

            {/* Input pill */}
            <div
              data-clui-ui
              className="glass-surface w-full"
              style={{ minHeight: 50, borderRadius: 25, padding: '0 6px 0 16px', background: colors.inputPillBg }}
            >
              <InputBar />
            </div>

            {/* Right-side stacked circle buttons */}
            <div
              data-clui-ui
              className="circles-out-right"
            >
              <div className="btn-stack-right">
                {/* r-1: Continue (front — most used) */}
                <button
                  className="stack-btn-r stack-btn-r-1 glass-surface"
                  title="Continue"
                  onClick={handleContinue}
                  disabled={isRunning}
                >
                  <FastForward size={17} />
                </button>
                {/* r-2: Agent Prompt */}
                <button
                  className="stack-btn-r stack-btn-r-2 glass-surface"
                  title="Agent Prompt"
                  onClick={handleAgentPrompt}
                  disabled={isRunning}
                >
                  <Robot size={17} />
                </button>
                {/* r-3: SEO Audit */}
                <button
                  className="stack-btn-r stack-btn-r-3 glass-surface"
                  title="SEO Audit"
                  onClick={handleSeoAudit}
                  disabled={isRunning}
                >
                  <MagnifyingGlassPlus size={17} />
                </button>
                {/* r-4: Performance */}
                <button
                  className="stack-btn-r stack-btn-r-4 glass-surface"
                  title="Performance"
                  onClick={handlePerformance}
                  disabled={isRunning}
                >
                  <Lightning size={17} />
                </button>
                {/* r-5: What's Next */}
                <button
                  className="stack-btn-r stack-btn-r-5 glass-surface"
                  title="What's Next"
                  onClick={handleWhatsNext}
                  disabled={isRunning}
                >
                  <Notepad size={17} />
                </button>
                {/* r-6: Client Ready */}
                <button
                  className="stack-btn-r stack-btn-r-6 glass-surface"
                  title="Client Ready"
                  onClick={handleClientReady}
                  disabled={isRunning}
                >
                  <Target size={17} />
                </button>
                {/* r-7: Deploy */}
                <button
                  className="stack-btn-r stack-btn-r-7 glass-surface"
                  title="Deploy to Cloudflare"
                  onClick={handleDeploy}
                  disabled={isRunning}
                >
                  <CloudArrowUp size={17} />
                </button>
                {/* r-8: Explain (back) */}
                <button
                  className="stack-btn-r stack-btn-r-8 glass-surface"
                  title="Explain"
                  onClick={handleExplain}
                  disabled={isRunning}
                >
                  <ChatText size={17} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PopoverLayerProvider>
  )
}
