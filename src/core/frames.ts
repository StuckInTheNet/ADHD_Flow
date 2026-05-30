// Frames push the generator into corners it wouldn't naturally go.
// Each frame is a strategy for re-asking the same engineering problem
// from a different vantage point. Pick a subset per run — don't grind all.

export type Frame = {
  id: string;
  label: string;
  // The system prompt fragment injected into the divergent branch.
  // Written as an instruction: "you are X, generate ideas as X would."
  prompt: string;
  // Engineering domain tag — used by the orchestrator to bias frame
  // selection when the problem looks code-shaped.
  tags: ("code" | "design" | "general" | "wild")[];
};

export class FrameRegistry {
  private frames: Map<string, Frame> = new Map();

  constructor() {
    // Register default frames
    this.registerFrame({
      id: "hardware-eyes",
      label: "Hardware engineer",
      prompt:
        "You think in latency, memory layout, and physical constraints. Re-ask this problem as if it were a hardware/firmware problem. What does the bus topology, the cache, the timing budget tell you?",
      tags: ["code", "wild"],
    });
    this.registerFrame({
      id: "regulator",
      label: "Regulator / auditor",
      prompt:
        "You audit systems for compliance and failure modes. What ideas surface when you ask: what must be provable, traceable, or refusable here?",
      tags: ["design", "general"],
    });
    this.registerFrame({
      id: "ten-year-old",
      label: "10-year-old",
      prompt:
        "You are a curious 10-year-old who has never seen software before. Describe naive but unencumbered approaches. Ignore convention.",
      tags: ["general", "wild"],
    });
    this.registerFrame({
      id: "adversary",
      label: "Competitor trying to break it",
      prompt:
        "You are a hostile competitor or attacker. Generate approaches that exploit, fail, or sabotage the obvious solution. Then invert into ideas.",
      tags: ["code", "design"],
    });
    this.registerFrame({
      id: "biology",
      label: "Cross-domain: biology",
      prompt:
        "Transplant a mechanism from biology — immune systems, neural plasticity, cell signaling, evolution, gut flora — and force-fit it onto this engineering problem.",
      tags: ["code", "wild"],
    });
    this.registerFrame({
      id: "logistics",
      label: "Cross-domain: logistics / supply chain",
      prompt:
        "Steal mechanisms from logistics: queues, batching, just-in-time, hub-and-spoke, returns, last-mile. Apply them literally to this problem.",
      tags: ["code", "design"],
    });
    this.registerFrame({
      id: "game-design",
      label: "Cross-domain: game design",
      prompt:
        "Approach this as a game designer. What are the loops, rewards, friction, save-states, speedrun tricks? Treat the user/system as a player.",
      tags: ["design", "general"],
    });
    this.registerFrame({
      id: "markets",
      label: "Cross-domain: markets",
      prompt:
        "Treat the problem as a market. Who are the buyers, sellers, market-makers? What does an auction, a futures contract, a clearing house look like here?",
      tags: ["design", "wild"],
    });
    this.registerFrame({
      id: "inversion",
      label: "Inversion",
      prompt:
        "Ask the OPPOSITE question. If the goal is X, brainstorm 'how would we guarantee NOT-X' — then negate each answer back into an idea.",
      tags: ["code", "design", "general"],
    });
    this.registerFrame({
      id: "extreme-zero",
      label: "Extreme: $0 budget, 1 hour",
      prompt:
        "You have no money, no team, one hour. What's the crudest version that still does the load-bearing thing? Hacks, hardcoded values, manual loops welcome.",
      tags: ["code", "general"],
    });
    this.registerFrame({
      id: "extreme-infinite",
      label: "Extreme: infinite budget, 10 years",
      prompt:
        "You have infinite compute, infinite engineers, a decade. What does the maximalist version look like? What would only be possible at that scale?",
      tags: ["design", "wild"],
    });
    this.registerFrame({
      id: "remove-assumption",
      label: "Remove the load-bearing assumption",
      prompt:
        "Name the thing everyone treats as fixed in this problem (the framework, the database, the request/response model, the file system, the network). Imagine it's gone. Generate ideas that only exist in that world.",
      tags: ["code", "design", "wild"],
    });
    this.registerFrame({
      id: "speedrunner",
      label: "Speedrunner",
      prompt:
        "You're a speedrunner. Find glitches, skips, out-of-bounds tricks, frame-perfect shortcuts. What's the abusive-but-legal path through this problem?",
      tags: ["code", "wild"],
    });
    this.registerFrame({
      id: "ant-colony",
      label: "Ant colony / swarm",
      prompt:
        "No central planner. Many dumb agents, local rules, pheromone trails. How does the problem solve itself emergently?",
      tags: ["code", "wild"],
    });
    this.registerFrame({
      id: "ops-3am",
      label: "On-call at 3am",
      prompt:
        "You're the on-call engineer woken at 3am when this thing breaks. What design would let you not get paged? What's the runbook-shaped solution?",
      tags: ["code", "design"],
    });
    this.registerFrame({
      id: "historian",
      label: "Historian",
      prompt:
        "You are a historian of technology. How has this problem been solved in the past? What can we learn from old or forgotten technologies? What are the historical precedents for this problem?",
      tags: ["design", "general"],
    });
    this.registerFrame({
      id: "artist",
      label: "Artist / Poet",
      prompt:
        "You are an artist or a poet. How would you approach this problem from a purely aesthetic or expressive point of view? What would be the most beautiful or elegant solution, regardless of practicality?",
      tags: ["design", "wild"],
    });
    this.registerFrame({
      id: "child-psychologist",
      label: "Child Psychologist",
      prompt:
        "You are a child psychologist. How would you explain this problem to a child? How would you design a solution that is so simple and intuitive that a child could understand and use it?",
      tags: ["design", "general"],
    });
    this.registerFrame({
      id: "data-scientist",
      label: "Data Scientist",
      prompt:
        "You are a data scientist. What data could we collect to better understand this problem? How could we use data and statistical analysis to find a solution? What does the data tell us that we might be missing?",
      tags: ["code", "design"],
    });
  }

  registerFrame(frame: Frame) {
    if (this.frames.has(frame.id)) {
      console.warn(`Frame with ID "${frame.id}" already registered. Overwriting.`);
    }
    this.frames.set(frame.id, frame);
  }

  getFrame(id: string): Frame | undefined {
    return this.frames.get(id);
  }

  getAllFrames(): Frame[] {
    return Array.from(this.frames.values());
  }

  // Pick N frames for a run. Bias toward engineering tags when codeMode is on,
  // but always include at least one wildcard so divergence stays weird.
  selectFrames(n: number, codeMode = true): Frame[] {
    const allFrames = this.getAllFrames();
    const pool = codeMode
      ? allFrames.filter((f) => f.tags.includes("code") || f.tags.includes("design"))
      : [...allFrames];
    const wild = allFrames.filter((f) => f.tags.includes("wild"));

    const selectedFrames: Frame[] = [];

    // Ensure at least one wild frame is picked
    if (wild.length > 0) {
      const initialWildPick = wild[Math.floor(Math.random() * wild.length)];
      selectedFrames.push(initialWildPick);
    }

    // Fill the rest of the slots with unique frames
    const shuffledPool = [...pool].sort(() => Math.random() - 0.5);
    for (const frame of shuffledPool) {
      if (selectedFrames.length >= n) break;
      if (!selectedFrames.find((f) => f.id === frame.id)) {
        selectedFrames.push(frame);
      }
    }

    // If we still don't have N frames, and there are more wild frames, add them
    if (selectedFrames.length < n && wild.length > 0) {
      const remainingWild = wild.filter(wf => !selectedFrames.find(sf => sf.id === wf.id));
      const shuffledRemainingWild = [...remainingWild].sort(() => Math.random() - 0.5);
      for (const frame of shuffledRemainingWild) {
        if (selectedFrames.length >= n) break;
        selectedFrames.push(frame);
      }
    }

    // If we still don't have N frames, just fill with any unique frames
    if (selectedFrames.length < n) {
      const remainingFrames = allFrames.filter(af => !selectedFrames.find(sf => sf.id === af.id));
      const shuffledRemaining = [...remainingFrames].sort(() => Math.random() - 0.5);
      for (const frame of shuffledRemaining) {
        if (selectedFrames.length >= n) break;
        selectedFrames.push(frame);
      }
    }

    return selectedFrames.slice(0, n); // Ensure exactly N frames are returned
  }
}

export const frameRegistry = new FrameRegistry();
