/* eslint-disable no-undef */
const ANIMATIONS = {
  'intro': () => `
    <div class="diagram">
      <div class="tree">
        <div class="tree-node root pulse-soft">📂 webshop/</div>
        <div class="tree-children">
          <div class="tree-node hl">📁 .github/<span class="tree-meta">instructions · agents · skills</span></div>
          <div class="tree-node">📁 client/<span class="tree-meta">React frontend</span></div>
          <div class="tree-node">📁 server/<span class="tree-meta">Node + SQLite</span></div>
        </div>
      </div>
    </div>`,

  'plan-mode': () => `
    <div class="diagram">
      <div class="row">
        <div class="node muted">📝 Idea</div>
        <span class="arrow pulse">→</span>
        <div class="node pulse-soft">📋 plan.md</div>
        <span class="arrow pulse">→</span>
        <div class="node good">✅ Approve</div>
        <span class="arrow pulse">→</span>
        <div class="node accent">⚡ Code</div>
      </div>
    </div>`,

  'custom-instructions': () => `
    <div class="diagram">
      <div class="row">
        <div class="col fade-cycle" style="gap:6px;">
          <div class="node muted">📄 copilot-instructions.md</div>
          <div class="node muted">📄 db.instructions.md</div>
          <div class="node muted">📄 frontend.instructions.md</div>
        </div>
        <span class="arrow pulse">→</span>
        <div class="node pulse-soft">🧠 Agent context</div>
      </div>
    </div>`,

  'custom-agents': () => `
    <div class="diagram">
      <div class="col">
        <div class="node pulse-soft">🤖 Reviewer Agent</div>
        <div class="row">
          <div class="node muted">🔧 read</div>
          <div class="node muted">🔧 grep</div>
          <div class="node muted">🔧 git</div>
          <div class="node muted">🔧 agent</div>
        </div>
      </div>
    </div>`,

  'subagents': () => `
    <div class="diagram">
      <div class="col">
        <div class="node pulse-soft">🤖 Reviewer (coordinator)</div>
        <div class="row">
          <div class="node accent">🔒 Security</div>
          <div class="node warm">🎨 Frontend</div>
          <div class="node good">⚙️ Backend</div>
        </div>
      </div>
    </div>`,

  'mcp': () => `
    <div class="diagram">
      <div class="row">
        <div class="node pulse-soft">🤖 Agent</div>
        <span class="arrow pulse">↔</span>
        <div class="node">🔌 MCP server</div>
        <span class="arrow pulse">↔</span>
        <div class="col fade-cycle" style="gap:6px;">
          <div class="node muted">GitHub</div>
          <div class="node muted">Teams</div>
          <div class="node muted">Database</div>
        </div>
      </div>
    </div>`,

  'skills': () => `
    <div class="diagram">
      <div class="col">
        <div class="node pulse-soft">📘 SKILL.md</div>
        <div class="steps step-cycle">
          <div class="step">1</div>
          <span class="arrow">→</span>
          <div class="step">2</div>
          <span class="arrow">→</span>
          <div class="step">3</div>
          <span class="arrow">→</span>
          <div class="step">4</div>
        </div>
        <div class="node muted">📁 references/</div>
      </div>
    </div>`,

  'agentic-workflows': () => `
    <div class="diagram">
      <div class="row">
        <div class="node warm">💬 /grumpy</div>
        <span class="arrow pulse">→</span>
        <div class="node pulse-soft">📝 workflow.md</div>
        <span class="arrow pulse">→</span>
        <div class="node good">⚙️ GitHub Action</div>
      </div>
    </div>`,

  'agentrc': () => `
    <div class="diagram">
      <div class="pyramid">
        <div class="level l1">L1 · Functional</div>
        <div class="level l2">L2 · Documented</div>
        <div class="level l3 glow">L3 · Standardized</div>
        <div class="level l4">L4 · Optimized</div>
        <div class="level l5">L5 · Autonomous</div>
      </div>
    </div>`,

  'plugins': () => `
    <div class="diagram">
      <div class="bundle pulse-soft">
        <div class="row">
          <div class="node accent">📘 Skill</div>
          <div class="node warm">🤖 Agent</div>
        </div>
        <div class="row">
          <div class="node good">🔌 MCP</div>
          <div class="node muted">/ slash</div>
        </div>
      </div>
    </div>`,

  'awesome-copilot': () => `
    <div class="diagram">
      <div class="col">
        <div class="node pulse-soft">⭐ awesome-copilot</div>
        <div class="grid">
          <div class="tile hl">Instructions</div>
          <div class="tile">Agents</div>
          <div class="tile">Skills</div>
          <div class="tile">Prompts</div>
          <div class="tile hl">Chat modes</div>
          <div class="tile">More…</div>
        </div>
      </div>
    </div>`,
};

window.ANIMATIONS = ANIMATIONS;
