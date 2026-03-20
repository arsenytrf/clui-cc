import React, { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Paperclip, GitCommit, HeadCircuit, MagnifyingGlass, Rocket, ThumbsUp, ListChecks, Lightbulb,
  Robot, Notepad, Brain, Sparkle, PaintBrush, GraduationCap, Broom, RocketLaunch,
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

  const handleLevelUpDesign = useCallback(() => {
    sendMessage(
      'Look at this site\'s front-end design and make it better. Don\'t ask me what to improve — you\'re the designer.\n\n' +
      '1. Open the site (run dev server or read the code). Look at every page with a designer\'s eye.\n' +
      '2. WebSearch for award-winning sites in this same niche on Awwwards, Behance, or Dribbble. WebFetch 3-5 of them. Study what makes them feel premium.\n' +
      '3. Compare our site to those. Be honest — where do we look generic, dated, or "AI-generated"?\n' +
      '4. Fix it. Specifically look at:\n' +
      '   - Typography: Is the font pairing bold enough? Are headlines big enough? Is there real contrast between display and body?\n' +
      '   - Color: Are we using custom colors or safe defaults? Do we have enough full-color sections?\n' +
      '   - Layout rhythm: Do sections feel varied or repetitive? Any card grids that should be something else?\n' +
      '   - Spacing: Is it generous enough? Do sections breathe?\n' +
      '   - Visual moments: Is there at least one "wow" section that stops you scrolling?\n' +
      '   - Animations: Are scroll reveals and transitions enhancing or generic?\n' +
      '   - Images: Are they high quality and specific to the business?\n\n' +
      'Make the changes directly. Show me before/after for the biggest improvements.'
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
      'Full codebase sweep. Work through each layer systematically:\n\n' +
      'LAYER 1 — DEAD FILES:\n' +
      'Read the entire project structure. For every source file, grep for its name/exports across the codebase.\n' +
      'Find and remove:\n' +
      '- Files from a previous framework (HTML in a Next.js project, old CSS in a Tailwind project, jQuery in a React project)\n' +
      '- Components, pages, or utilities that nothing imports\n' +
      '- Duplicate files (same component in two locations)\n' +
      '- Empty files, placeholder files, temp files, .bak files\n\n' +
      'LAYER 2 — DEAD CODE INSIDE FILES:\n' +
      'For every remaining file, check for:\n' +
      '- Unused imports (imported but never referenced in the file)\n' +
      '- Unused variables, functions, and types that are defined but never called\n' +
      '- Commented-out code blocks (if it\'s in git history, it doesn\'t need to be commented out)\n' +
      '- console.log / console.debug statements left from debugging\n' +
      '- TODO/FIXME comments that were already addressed\n' +
      '- Unreachable code after return/throw statements\n\n' +
      'LAYER 3 — DEAD DEPENDENCIES:\n' +
      '- Read package.json. For each dependency, grep the src/ directory for its import. If nothing imports it, remove it.\n' +
      '- Check for packages that could be replaced by native APIs (e.g., lodash for simple operations, moment.js when Intl.DateTimeFormat works)\n' +
      '- Check for duplicate packages that do the same thing\n\n' +
      'LAYER 4 — DEAD ASSETS:\n' +
      '- Check every file in public/ and assets/. Grep for each filename across the codebase.\n' +
      '- Remove images, fonts, and media files that no code references\n\n' +
      'SAFETY RULES:\n' +
      '- NEVER delete: .env files, .git, lock files, documentation (.md), config files that tools need\n' +
      '- Remove in small batches — run the build after each batch to catch breakage early\n' +
      '- If unsure whether something is used, grep for it first. If still unsure, leave it and flag it.\n\n' +
      'Show me a summary: what you found, what you deleted, and what you flagged as "probably unused but verify."'
    )
  }, [sendMessage])

  const handlePreLaunch = useCallback(() => {
    sendMessage(
      'I\'m about to point the domain to this site. Before I change nameservers, do a full pre-launch sweep:\n\n' +
      '1. Run the build — does it pass clean? Any errors or warnings?\n' +
      '2. Check every page route — do they all render? Any 404s?\n' +
      '3. Check every link — nav links, footer links, CTAs, social links. Do they all go somewhere real?\n' +
      '4. Check every form — does the submit action work? Is there a form backend configured (Formspree, mailto, etc.)?\n' +
      '5. Check every image — any broken URLs, placeholders left in, or missing alt tags?\n' +
      '6. Mobile check — does it look right at 375px? Any overflow, cut-off text, or unusable forms?\n' +
      '7. Meta tags — does every page have a title, description, and OG image? Check the actual content, not just that the tags exist.\n' +
      '8. Favicon — is it set? Does it show in the browser tab?\n' +
      '9. Contact info — is the phone number, email, and address correct and clickable (tel:, mailto:)?\n' +
      '10. Legal — is there a privacy policy and terms page, or at least a placeholder with instructions?\n' +
      '11. Analytics — is Google Analytics, GTM, or equivalent configured?\n' +
      '12. Performance — any massive unoptimized images or render-blocking scripts?\n\n' +
      'For each item: PASS, FAIL (with what\'s wrong and how to fix it), or NEEDS MY INPUT.\n' +
      'Fix everything you can. Tell me exactly what I need to do for the rest.'
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
                {/* r-1: Agent Blueprint (front) */}
                <button
                  className="stack-btn-r stack-btn-r-1 glass-surface"
                  title="Agent Blueprint"
                  onClick={handleAgentBlueprint}
                  disabled={isRunning}
                >
                  <Robot size={17} />
                </button>
                {/* r-2: What's Next */}
                <button
                  className="stack-btn-r stack-btn-r-2 glass-surface"
                  title="What's Next"
                  onClick={handleWhatsNext}
                  disabled={isRunning}
                >
                  <Notepad size={17} />
                </button>
                {/* r-3: Think For Me */}
                <button
                  className="stack-btn-r stack-btn-r-3 glass-surface"
                  title="Think For Me"
                  onClick={handleThinkForMe}
                  disabled={isRunning}
                >
                  <Brain size={17} />
                </button>
                {/* r-4: Clean House */}
                <button
                  className="stack-btn-r stack-btn-r-4 glass-surface"
                  title="Clean House"
                  onClick={handleCleanHouse}
                  disabled={isRunning}
                >
                  <Broom size={17} />
                </button>
                {/* r-5: Pre-Launch Check */}
                <button
                  className="stack-btn-r stack-btn-r-5 glass-surface"
                  title="Pre-Launch Check"
                  onClick={handlePreLaunch}
                  disabled={isRunning}
                >
                  <RocketLaunch size={17} />
                </button>
                {/* r-6: Any More Ideas */}
                <button
                  className="stack-btn-r stack-btn-r-6 glass-surface"
                  title="Any More Ideas?"
                  onClick={handleAnyMoreIdeas}
                  disabled={isRunning}
                >
                  <Sparkle size={17} />
                </button>
                {/* r-7: Level Up Design */}
                <button
                  className="stack-btn-r stack-btn-r-7 glass-surface"
                  title="Level Up Design"
                  onClick={handleLevelUpDesign}
                  disabled={isRunning}
                >
                  <PaintBrush size={17} />
                </button>
                {/* r-8: Teach Me */}
                <button
                  className="stack-btn-r stack-btn-r-8 glass-surface"
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
