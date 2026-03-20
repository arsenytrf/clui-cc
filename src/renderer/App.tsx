import React, { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Paperclip, GitCommit, HeadCircuit, MagnifyingGlass, Rocket, ThumbsUp, ListChecks, Lightbulb,
  FastForward, Robot, Notepad, RocketLaunch, Binoculars, PencilLine, Package, FileText,
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

  const handleAgentBlueprint = useCallback(() => {
    sendMessage(
      'I need a browser agent prompt I can copy-paste into Claude Computer Use. Here\'s how to build it:\n\n' +
      'STEP 1 — DISCOVER: Read the codebase and identify every task that requires manual browser action:\n' +
      '- SEO submissions (Google Search Console, Bing Webmaster, sitemap)\n' +
      '- Third-party service configuration (analytics, forms, DNS, email)\n' +
      '- Directory listings, social profiles, business registrations\n' +
      '- Content uploads, image sourcing, credential setup\n' +
      '- Anything in the code that references an external service\n\n' +
      'STEP 2 — RESEARCH: For each task, WebSearch the exact current procedure:\n' +
      '- What\'s the URL to start?\n' +
      '- What are the exact steps in 2025/2026?\n' +
      '- Has the UI changed recently? What does the current flow look like?\n' +
      '- Are there bulk/API options that would be faster?\n\n' +
      'STEP 3 — BUILD THE PROMPT: Write a single, self-contained browser agent prompt with:\n' +
      '- Task description (what we\'re accomplishing)\n' +
      '- Pre-conditions (what accounts/access are needed)\n' +
      '- Numbered steps with EXACT URLs, EXACT button text, EXACT form fields\n' +
      '- Verification after each major action ("you should see X")\n' +
      '- Error handling ("if you see Y instead, do Z")\n\n' +
      'Output the prompt in a code block I can copy directly. No commentary outside the block.'
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

  const handleShipIt = useCallback(() => {
    sendMessage(
      'Get this project live. Full launch sequence:\n\n' +
      'PHASE 1 — PRE-FLIGHT:\n' +
      '- Run the build. Fix every error. Zero warnings.\n' +
      '- Check every route renders. Check every form submits. Check every image loads.\n' +
      '- Check mobile at 375px. Check tablet at 768px. Fix anything broken.\n' +
      '- Verify favicon, OG images, meta descriptions on every page.\n\n' +
      'PHASE 2 — CLOUDFLARE SETUP:\n' +
      '- Determine Pages vs Workers (check for SSR/API routes/middleware)\n' +
      '- Set up or verify wrangler config with correct compatibility flags\n' +
      '- Configure R2 if needed for file storage\n' +
      '- List every env var and secret needed in the Cloudflare dashboard\n' +
      '- Fix any Node.js APIs incompatible with Workers runtime\n' +
      '- Give me the exact deploy commands\n\n' +
      'PHASE 3 — POST-DEPLOY:\n' +
      '- Generate a browser agent prompt for: DNS pointing, Google Search Console setup + sitemap submission, Google Analytics/GTM installation, Bing Webmaster submission\n' +
      '- Format the agent prompt in a code block I can copy into Claude Computer Use\n\n' +
      'Don\'t skip steps. Don\'t summarize. Execute each phase.'
    )
  }, [sendMessage])

  const handleCompetitorIntel = useCallback(() => {
    sendMessage(
      'Do real competitive research for this project:\n\n' +
      'STEP 1: Read the codebase to understand what this business does, what industry it\'s in, and where it\'s located.\n\n' +
      'STEP 2: WebSearch for the top 5 competitors in this niche + location. Then WebFetch their actual websites.\n\n' +
      'STEP 3: For each competitor, document:\n' +
      '- What they do better than us (design, copy, features, UX)\n' +
      '- What specific features they have that we don\'t\n' +
      '- How their SEO is set up (check their page titles, meta, structured data)\n' +
      '- What their pricing/CTA strategy looks like\n' +
      '- What review sites they\'re listed on and their ratings\n\n' +
      'STEP 4: Based on the research, give me a prioritized list of specific changes to make — not generic advice, but "add X feature like competitor Y does it" or "rewrite the hero like Z because their conversion copy is stronger."\n\n' +
      'Show your work — include URLs and screenshots of what you found.'
    )
  }, [sendMessage])

  const handleContentOverhaul = useCallback(() => {
    sendMessage(
      'Audit and rewrite every piece of content in this project:\n\n' +
      'STEP 1: Read every page. Flag every headline, paragraph, CTA, and image alt tag that sounds generic, AI-generated, or placeholder-like.\n\n' +
      'STEP 2: WebSearch for real customer reviews, Reddit threads, and forum posts from this industry. Collect the exact words real customers use to describe their problems, fears, and what they care about.\n\n' +
      'STEP 3: Rewrite every flagged piece of content using the real customer language you found. Rules:\n' +
      '- Headlines must pass the "so what?" test\n' +
      '- Stats over adjectives ("4.9★ from 127 reviews" not "highly rated")\n' +
      '- Lead with the customer\'s pain, not the company\'s pride\n' +
      '- CTAs must be specific ("Get Your Free Quote in 2 Hours" not "Contact Us")\n' +
      '- Localize everything — reference real neighborhoods, weather, landmarks\n\n' +
      'STEP 4: Check every image. Flag broken URLs, placeholder images, and images that don\'t match the industry. WebSearch for replacements on Unsplash/Pexels with specific queries. Verify URLs work.\n\n' +
      'Make all the changes directly in the code.'
    )
  }, [sendMessage])

  const handleStackAudit = useCallback(() => {
    sendMessage(
      'Audit every dependency and tool in this project:\n\n' +
      'STEP 1: Read package.json. For each dependency, WebSearch for:\n' +
      '- Current latest version vs what we have\n' +
      '- Any known security advisories or breaking changes\n' +
      '- Whether a better/lighter alternative exists now\n\n' +
      'STEP 2: Check the codebase for:\n' +
      '- Dependencies in package.json that aren\'t actually imported anywhere (remove them)\n' +
      '- Packages that are imported but could be replaced with native APIs\n' +
      '- Outdated patterns (old React patterns, deprecated APIs, etc.)\n\n' +
      'STEP 3: Run the build. Check for deprecation warnings, TypeScript issues, and unused code.\n\n' +
      'STEP 4: Update what\'s safe to update. For breaking changes, tell me what would break and whether it\'s worth it.\n\n' +
      'Show a before/after table: package, old version, new version, and why.'
    )
  }, [sendMessage])

  const handleHandoff = useCallback(() => {
    sendMessage(
      'Generate a complete client handoff document for this project. Read the entire codebase first, then produce:\n\n' +
      '## Project Overview\n' +
      '- What was built, tech stack, architecture summary\n\n' +
      '## How to Update Content\n' +
      '- Where text/copy lives in the code (exact file paths)\n' +
      '- Where images are stored and how to replace them\n' +
      '- How to add/remove services, team members, gallery items\n\n' +
      '## Environment & Deployment\n' +
      '- Where it\'s hosted and how to access the dashboard\n' +
      '- How to deploy changes (exact commands)\n' +
      '- All environment variables and what they do\n' +
      '- Domain/DNS configuration\n\n' +
      '## Accounts & Services\n' +
      '- Every third-party service the site depends on (analytics, forms, CDN, etc.)\n' +
      '- What credentials are needed for each\n\n' +
      '## Maintenance\n' +
      '- How to update dependencies\n' +
      '- What to check if something breaks\n' +
      '- Contact info for ongoing support\n\n' +
      'Write it as a clean markdown document the client can actually follow. Save it as HANDOFF.md in the project root.'
    )
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
                {/* r-2: Agent Blueprint */}
                <button
                  className="stack-btn-r stack-btn-r-2 glass-surface"
                  title="Agent Blueprint"
                  onClick={handleAgentBlueprint}
                  disabled={isRunning}
                >
                  <Robot size={17} />
                </button>
                {/* r-3: What's Next */}
                <button
                  className="stack-btn-r stack-btn-r-3 glass-surface"
                  title="What's Next"
                  onClick={handleWhatsNext}
                  disabled={isRunning}
                >
                  <Notepad size={17} />
                </button>
                {/* r-4: Ship It */}
                <button
                  className="stack-btn-r stack-btn-r-4 glass-surface"
                  title="Ship It"
                  onClick={handleShipIt}
                  disabled={isRunning}
                >
                  <RocketLaunch size={17} />
                </button>
                {/* r-5: Competitor Intel */}
                <button
                  className="stack-btn-r stack-btn-r-5 glass-surface"
                  title="Competitor Intel"
                  onClick={handleCompetitorIntel}
                  disabled={isRunning}
                >
                  <Binoculars size={17} />
                </button>
                {/* r-6: Content Overhaul */}
                <button
                  className="stack-btn-r stack-btn-r-6 glass-surface"
                  title="Content Overhaul"
                  onClick={handleContentOverhaul}
                  disabled={isRunning}
                >
                  <PencilLine size={17} />
                </button>
                {/* r-7: Stack Audit */}
                <button
                  className="stack-btn-r stack-btn-r-7 glass-surface"
                  title="Stack Audit"
                  onClick={handleStackAudit}
                  disabled={isRunning}
                >
                  <Package size={17} />
                </button>
                {/* r-8: Client Handoff (back) */}
                <button
                  className="stack-btn-r stack-btn-r-8 glass-surface"
                  title="Client Handoff"
                  onClick={handleHandoff}
                  disabled={isRunning}
                >
                  <FileText size={17} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PopoverLayerProvider>
  )
}
