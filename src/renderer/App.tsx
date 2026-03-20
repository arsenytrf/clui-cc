import React, { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Paperclip, GitCommit, HeadCircuit, MagnifyingGlass, Rocket, ThumbsUp, ListChecks, Lightbulb,
  FastForward, Robot, Notepad, Brain, Warning, Sparkle, SealCheck, GraduationCap, Broom,
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
      'Let\'s brainstorm. Look at what we\'re building, think about where it could go, and ask me questions. ' +
      'What\'s the vision I haven\'t told you yet? What problems am I probably running into? What would make this 10x better? ' +
      'Don\'t just list ideas — have a conversation with me. Ask me what I think, challenge my assumptions, ' +
      'and build on my answers. Let\'s think bigger together.'
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
      'I need a browser agent prompt I can copy-paste into Claude Computer Use.\n\n' +
      'PHASE 1 — DISCOVER:\n' +
      'Read the codebase. Identify every task that requires manual browser action — SEO submissions, DNS config, analytics setup, form backends, directory listings, content uploads, API key creation, social profiles. Check every config file, env reference, and third-party integration.\n\n' +
      'PHASE 2 — RESEARCH:\n' +
      'For each task you found, WebSearch the exact current procedure (UIs change frequently). Find the starting URL, the current step-by-step flow, and whether there are bulk/API shortcuts.\n\n' +
      'PHASE 3 — BUILD THE PROMPT:\n' +
      'Write the prompt using this exact structure (Anthropic\'s recommended format for Computer Use):\n\n' +
      '```xml\n' +
      '<task>\n' +
      'One sentence: what you\'re doing and where.\n' +
      '</task>\n\n' +
      '<context>\n' +
      'Business info, credentials, URLs — only what the agent needs.\n' +
      '</context>\n\n' +
      '<steps>\n' +
      'Numbered sequential steps. Each step must:\n' +
      '- State what to ACCOMPLISH (not what pixel to click)\n' +
      '- Include exact text to type in form fields\n' +
      '- Use keyboard shortcuts for dropdowns/date pickers (Tab, Enter, arrows — more reliable than mouse)\n' +
      '- End critical steps with "Take a screenshot to verify this worked"\n' +
      '- Include error handling: "If you see X instead, do Y"\n' +
      '- One task flow at a time — complete one thing before starting the next\n' +
      '</steps>\n\n' +
      '<done>\n' +
      'What the screen should look like when complete.\n' +
      '</done>\n' +
      '```\n\n' +
      'RULES:\n' +
      '- Keep each prompt under 500 words (longer = agent loses focus and skips steps)\n' +
      '- If there are multiple unrelated tasks, output separate prompts for each\n' +
      '- Include the actual data to enter (exact titles, URLs, descriptions) — don\'t leave blanks\n' +
      '- Verification checkpoints after every critical action\n\n' +
      'Output each prompt in a code block I can copy directly.'
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

  const handleThinkForMe = useCallback(() => {
    sendMessage(
      'Think for me. Follow this exact loop:\n\n' +
      'STEP 1 — OBSERVE:\n' +
      'Read package.json, the main source files, and any config. Identify: what is this project? Who uses it? What industry/niche is it in? What tech stack?\n\n' +
      'STEP 2 — RESEARCH (be precise with queries):\n' +
      'Based on what you found in Step 1, craft SPECIFIC search queries. Do NOT search generic terms.\n' +
      '- Bad: "common website problems" / "user experience issues"\n' +
      '- Good: "[exact product type] complaints reddit 2025" / "[exact industry] customers what they wish [product type] had"\n\n' +
      'Search for:\n' +
      'a) Real user pain points: "[project niche] frustrations reddit" / "[industry] customers what they want site:reddit.com"\n' +
      'b) Feature ideas: "[closest competitor name] vs [alternative] features" / "best [product type] features 2026"\n' +
      'c) Stack issues: "[exact framework + version] known issues" / "[exact library name] breaking changes 2026"\n\n' +
      'STEP 3 — REASON:\n' +
      'Connect what real users are saying to what this project is missing. What would make a user say "finally, someone gets it"?\n\n' +
      'STEP 4 — ACT:\n' +
      'Give me a prioritized list. For each item: what to do, why it matters (with evidence from your research), and effort level.\n' +
      'If you can fix something right now, just do it.\n\n' +
      'Don\'t ask me questions. Show your search queries and what you found.'
    )
  }, [sendMessage])

  const handleAnyMoreIdeas = useCallback(() => {
    sendMessage(
      'What else you got? Look at everything we\'ve done so far and tell me what else you\'d do if you had free rein. ' +
      'Don\'t repeat anything we already covered — only new ideas. Push it further.'
    )
  }, [sendMessage])

  const handleProveIt = useCallback(() => {
    sendMessage(
      'Prove it. For every major decision you made — design choices, architecture, copy, layout, features — show me where you got the idea:\n\n' +
      '1. WebSearch for award-winning sites, top-rated competitors, or industry leaders that do what you did (or what you should have done)\n' +
      '2. WebFetch the best ones and show me specifically what they do and how our approach compares\n' +
      '3. For each decision: what was your reasoning, what\'s the evidence it works, and is there a better approach you missed?\n' +
      '4. If you find something better than what you built, say so and show me what to change\n\n' +
      'No hand-waving. Links, examples, and evidence for everything.'
    )
  }, [sendMessage])

  const handleTeachMe = useCallback(() => {
    sendMessage(
      'I want to understand the WHY behind what you just did — not a code walkthrough, but the actual knowledge:\n\n' +
      '- What concept or principle drove this decision?\n' +
      '- What are the tradeoffs? What did we gain and what did we give up?\n' +
      '- When would this approach be wrong? What would you do differently in that case?\n' +
      '- Is there a mental model or framework I should know that makes this click?\n\n' +
      'Explain it like I\'m smart but don\'t know this specific domain. Make me understand it well enough to make the call myself next time.'
    )
  }, [sendMessage])

  const handleCleanHouse = useCallback(() => {
    sendMessage(
      'Do a full project cleanup. Here\'s how:\n\n' +
      '1. Read the entire project structure — every file, every folder\n' +
      '2. Check what\'s actually imported and used vs what\'s just sitting there:\n' +
      '   - Old files from a previous framework (HTML files in a Next.js project, old CSS in a Tailwind project, etc.)\n' +
      '   - Components/pages that nothing imports or links to\n' +
      '   - Images/assets in public/ that no code references\n' +
      '   - Config files for tools we\'re not using\n' +
      '   - node_modules dependencies in package.json that aren\'t imported anywhere\n' +
      '   - Duplicate files (same component in two places)\n' +
      '   - Empty files, placeholder files, temp files\n' +
      '3. For each file you want to delete: verify it\'s truly unused by grepping for its name across the entire codebase\n' +
      '4. Do NOT delete anything that might be important — .env files, configs, documentation, git files\n' +
      '5. Delete the confirmed junk, run the build to make sure nothing broke\n\n' +
      'Show me what you found and what you deleted.'
    )
  }, [sendMessage])

  const handleSanityCheck = useCallback(() => {
    sendMessage(
      'Stop and double-check yourself before continuing:\n\n' +
      '- Are you in the right project/repo? Read the package.json and confirm.\n' +
      '- Are you editing the right files? Verify the paths match what we\'re working on.\n' +
      '- Are your changes going to break anything that was already working?\n' +
      '- Is your approach actually correct, or are you guessing?\n' +
      '- Did you miss anything from what I asked?\n\n' +
      'Take a step back, verify everything, and tell me if you need to course-correct.'
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
                {/* r-1: Continue (front) */}
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
                {/* r-4: Think For Me */}
                <button
                  className="stack-btn-r stack-btn-r-4 glass-surface"
                  title="Think For Me"
                  onClick={handleThinkForMe}
                  disabled={isRunning}
                >
                  <Brain size={17} />
                </button>
                {/* r-5: Sanity Check */}
                <button
                  className="stack-btn-r stack-btn-r-5 glass-surface"
                  title="Sanity Check"
                  onClick={handleSanityCheck}
                  disabled={isRunning}
                >
                  <Warning size={17} />
                </button>
                {/* r-6: Clean House */}
                <button
                  className="stack-btn-r stack-btn-r-6 glass-surface"
                  title="Clean House"
                  onClick={handleCleanHouse}
                  disabled={isRunning}
                >
                  <Broom size={17} />
                </button>
                {/* r-7: Any More Ideas */}
                <button
                  className="stack-btn-r stack-btn-r-7 glass-surface"
                  title="Any More Ideas?"
                  onClick={handleAnyMoreIdeas}
                  disabled={isRunning}
                >
                  <Sparkle size={17} />
                </button>
                {/* r-8: Prove It */}
                <button
                  className="stack-btn-r stack-btn-r-8 glass-surface"
                  title="Prove It"
                  onClick={handleProveIt}
                  disabled={isRunning}
                >
                  <SealCheck size={17} />
                </button>
                {/* r-9: Teach Me */}
                <button
                  className="stack-btn-r stack-btn-r-9 glass-surface"
                  title="Teach Me"
                  onClick={handleTeachMe}
                  disabled={isRunning}
                >
                  <GraduationCap size={17} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PopoverLayerProvider>
  )
}
