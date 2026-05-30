import { useState, useEffect } from 'react'; // Import useEffect
import { run } from '../../../src/core/engine'; // Adjust path as needed
import { renderMarkdown, renderJson, renderYaml, renderGraphviz } from '../../../src/core/render'; // Adjust path as needed
import { renderHtml } from '../../../src/core/html-renderer'; // Adjust path as needed
import { Graphviz } from 'graphviz-react'; // New import
import type { RunResult } from '../../../src/core/types'; // Import RunResult type
import './App.css';

function App() {
  const [problem, setProblem] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [outputFormat, setOutputFormat] = useState<'markdown' | 'json' | 'yaml' | 'dot' | 'html'>('markdown');
  const [scoringSystemPrompt, setScoringSystemPrompt] = useState('');
  const [redTeamSystemPrompt, setRedTeamSystemPrompt] = useState('');
  const [history, setHistory] = useState<RunResult[]>([]); // New state for history

  // Load history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('adhd_flow_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('adhd_flow_history', JSON.stringify(history));
  }, [history]);

  const handleRunAdhdFlow = async () => {
    setLoading(true);
    setOutput('Generating ideas...');
    try {
      const result = await run({
        problem,
        scoringSystemPrompt: scoringSystemPrompt || undefined,
        redTeamSystemPrompt: redTeamSystemPrompt || undefined,
      });
      setHistory((prevHistory) => [result, ...prevHistory]); // Add new result to history

      if (outputFormat === 'json') {
        setOutput(renderJson(result));
      } else if (outputFormat === 'yaml') {
        setOutput(renderYaml(result));
      } else if (outputFormat === 'dot') {
        setOutput(renderGraphviz(result));
      } else if (outputFormat === 'html') {
        setOutput(renderHtml(result));
      } else {
        setOutput(renderMarkdown(result));
      }
    } catch (error) {
      setOutput(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    setOutput('');
  };

  return (
    <div className="App">
      <h1>ADHD_Flow: Ideation Engine</h1>
      <div className="input-section">
        <textarea
          placeholder="Enter your problem description here..."
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          rows={10}
          cols={80}
          disabled={loading}
        />
        <textarea
          placeholder="Custom Scoring System Prompt (optional)"
          value={scoringSystemPrompt}
          onChange={(e) => setScoringSystemPrompt(e.target.value)}
          rows={3}
          cols={80}
          disabled={loading}
        />
        <textarea
          placeholder="Custom Red Team System Prompt (optional)"
          value={redTeamSystemPrompt}
          onChange={(e) => setRedTeamSystemPrompt(e.target.value)}
          rows={3}
          cols={80}
          disabled={loading}
        />
        <div className="controls">
          <select
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value as 'markdown' | 'json' | 'yaml' | 'dot' | 'html')}
            disabled={loading}
          >
            <option value="markdown">Markdown</option>
            <option value="json">JSON</option>
            <option value="yaml">YAML</option>
            <option value="dot">DOT (Graphviz)</option>
            <option value="html">HTML</option>
          </select>
          <button onClick={handleRunAdhdFlow} disabled={loading}>
            {loading ? 'Generating...' : 'Run ADHD_Flow'}
          </button>
          <button onClick={handleClearHistory} disabled={loading}>
            Clear History
          </button>
        </div>
      </div>
      <div className="output-section">
        <h2>Results:</h2>
        {outputFormat === 'html' ? (
          <div dangerouslySetInnerHTML={{ __html: output }} />
        ) : outputFormat === 'dot' ? (
          <Graphviz dot={output} options={{ width: 800, height: 600, zoom: true }} />
        ) : (
          <pre>{output}</pre>
        )}
      </div>

      <div className="history-section">
        <h2>History</h2>
        {history.length === 0 ? (
          <p>No history yet.</p>
        ) : (
          <ul>
            {history.map((item, index) => (
              <li key={index}>
                <a href="#" onClick={() => setOutput(renderMarkdown(item))}>
                  {item.problem}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;