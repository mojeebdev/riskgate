import { RiskGateDemo } from "@/components/riskgate-demo";

const steps = [
  {
    number: "01",
    title: "Write the boundary",
    body: "Define assets, size, exposure, leverage and slippage in a policy the agent cannot negotiate with.",
  },
  {
    number: "02",
    title: "Inspect live evidence",
    body: "RiskGate asks Binance Agent OS for the market context needed to judge the proposed action.",
  },
  {
    number: "03",
    title: "Return one decision",
    body: "Allow, require approval, or block—with every rule and market input attached as a receipt.",
  },
];

export default function Home() {
  return (
    <main>
      <header className="site-header page-shell">
        <a className="wordmark" href="#top" aria-label="RiskGate home">
          Risk<span>Gate</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#how">How it works</a>
          <a href="#gate">Policy engine</a>
          <a href="#audit">Audit trail</a>
        </nav>
        <a className="button button-small button-outline" href="#gate">
          Test the gate <span aria-hidden="true">↘</span>
        </a>
      </header>

      <section className="hero page-shell" id="top">
        <div className="orbit orbit-left" aria-hidden="true" />
        <p className="eyebrow"><span /> Safety infrastructure for agentic finance</p>
        <h1>
          Before your agent acts,
          <br />
          make it pass <em>the gate.</em>
        </h1>
        <p className="hero-copy">
          RiskGate puts deterministic policy checks between an AI trading agent
          and Binance execution—so speed never outruns permission.
        </p>
        <div className="hero-actions">
          <a className="button button-earth" href="#gate">Run a risk check <span>↘</span></a>
          <a className="text-link" href="#how">See how it works <span>↓</span></a>
        </div>
        <div className="trust-row" aria-label="Product capabilities">
          <span><i className="status-dot" /> Binance Agent OS MCP</span>
          <span>Read-only by default</span>
          <span>Deterministic decisions</span>
        </div>
      </section>

      <section className="dark-stage" id="gate">
        <div className="page-shell stage-grid">
          <div className="stage-copy">
            <p className="eyebrow eyebrow-light"><span /> The policy firewall</p>
            <h2>A trading agent should know what it <em>can’t</em> do.</h2>
            <p>
              Strategies can be probabilistic. Permissions should not be. RiskGate
              turns your boundaries into checks that run before an order can exist.
            </p>
            <ul className="quiet-list">
              <li><span>01</span> No custody</li>
              <li><span>02</span> No hidden execution</li>
              <li><span>03</span> No policy bypass</li>
            </ul>
          </div>
          <RiskGateDemo />
        </div>
      </section>

      <section className="proof-strip">
        <div className="page-shell proof-grid">
          <p>One narrow job, done before every action.</p>
          <div><strong>Live context</strong><span>via Agent OS MCP</span></div>
          <div><strong>5 policy checks</strong><span>evaluated in code</span></div>
          <div><strong>0 automatic trades</strong><span>in this safety-first MVP</span></div>
        </div>
      </section>

      <section className="how-section page-shell" id="how">
        <div className="section-heading">
          <p className="eyebrow"><span /> Policy → evidence → decision</p>
          <h2>Three moves. One clear boundary.</h2>
        </div>
        <div className="steps-grid">
          {steps.map((step) => (
            <article className="step" key={step.number}>
              <span className="step-number">{step.number}</span>
              <div className="step-mark" aria-hidden="true" />
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="audit-section" id="audit">
        <div className="page-shell audit-grid">
          <div className="audit-window" aria-label="Example RiskGate audit receipt">
            <div className="window-bar">
              <span>RG / 7F21</span>
              <span className="receipt-status">Blocked</span>
            </div>
            <div className="receipt-line"><span>Action</span><b>BUY BTCUSDT · Market</b></div>
            <div className="receipt-line"><span>Evidence</span><b>Agent OS order book</b></div>
            <div className="receipt-line"><span>Failed rules</span><b>Size · Exposure · Slippage</b></div>
            <div className="receipt-line"><span>Execution</span><b>Not created</b></div>
            <div className="receipt-hash">sha256: 48af…9d12</div>
          </div>
          <div className="audit-copy">
            <p className="eyebrow eyebrow-light"><span /> Explainable by construction</p>
            <h2>Every decision leaves a receipt.</h2>
            <p>
              Not a vague safety score. A timestamped record of the proposal, the
              policy version, the market evidence and the rule-by-rule outcome.
            </p>
            <a className="button button-paper" href="#gate">Inspect a decision <span>↑</span></a>
          </div>
        </div>
      </section>

      <section className="manifesto page-shell">
        <p className="eyebrow"><span /> Designed for controlled autonomy</p>
        <blockquote>
          “The best agent isn’t the one that acts fastest. It’s the one that
          knows when <em>not</em> to.”
        </blockquote>
        <div className="manifesto-note">RiskGate principle № 01</div>
      </section>

      <section className="final-cta page-shell">
        <div className="cta-orbit" aria-hidden="true" />
        <p className="eyebrow eyebrow-light"><span /> Start with the boundary</p>
        <h2>Give your agent<br />a safer way forward.</h2>
        <p>Test a proposed action against a real policy. Nothing is executed.</p>
        <a className="button button-paper" href="#gate">Open RiskGate <span>↗</span></a>
      </section>

      <footer className="page-shell">
        <a className="wordmark footer-mark" href="#top">Risk<span>Gate</span></a>
        <p>Safety kernel for AI trading agents.</p>
        <div className="footer-links">
          <a href="https://github.com/mojeebdev/riskgate" target="_blank" rel="noreferrer">GitHub ↗</a>
          <a href="#gate">Demo</a>
          <span>Built for Binance Agent OS</span>
        </div>
      </footer>
    </main>
  );
}
