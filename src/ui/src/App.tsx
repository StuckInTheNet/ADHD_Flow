import { useState, useEffect } from 'react'; // Import useEffect
import { run } from '../../../src/core/engine'; // Adjust path as needed
import { renderMarkdown, renderJson, renderYaml, renderGraphviz } from '../../../src/core/render'; // Adjust path as needed
import { renderHtml } from '../../../src/core/html-renderer'; // Adjust path as needed
import { Graphviz } from 'graphviz-react'; // New import
import type { RunResult, Idea, DeepenedIdea } from '../../../src/core/types'; // Import RunResult type
import { createGitHubIssue } from '../../../src/core/integrations/github'; // New import
import { createLinearIssue } from '../../../src/core/integrations/linear'; // New import
import { createNotionPage } from '../../../src/core/integrations/notion'; // New import
import { createGoogleDoc } from '../../../src/core/integrations/google-docs'; // New import
import './App.css';

function App() {
  const [problem, setProblem] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [outputFormat, setOutputFormat] = useState<'markdown' | 'json' | 'yaml' | 'dot' | 'html'>('markdown');
  const [scoringSystemPrompt, setScoringSystemPrompt] = useState('');
  const [redTeamSystemPrompt, setRedTeamSystemPrompt] = useState('');
  const [githubOwner, setGithubOwner] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [linearTeamId, setLinearTeamId] = useState(''); // New
  const [linearToken, setLinearToken] = useState(''); // New
  const [notionDatabaseId, setNotionDatabaseId] = useState(''); // New
  const [notionToken, setNotionToken] = useState(''); // New
  const [googleDocsAccessToken, setGoogleDocsAccessToken] = useState(''); // New
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

  const handleCreateGitHubIssue = async (idea: Idea | DeepenedIdea) => {
    if (!githubOwner || !githubRepo || !githubToken) {
      alert('Please provide GitHub Owner, Repository, and Personal Access Token.');
      return;
    }
    try {
      setLoading(true);
      const issueUrl = await createGitHubIssue(idea, githubOwner, githubRepo, githubToken);
      alert(`GitHub Issue created: ${issueUrl}`);
    } catch (error) {
      alert(`Failed to create GitHub issue: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLinearIssue = async (idea: Idea | DeepenedIdea) => {
    if (!linearTeamId || !linearToken) {
      alert('Please provide Linear Team ID and Personal Access Token.');
      return;
    }
    try {
      setLoading(true);
      const issueUrl = await createLinearIssue(idea, linearTeamId, linearToken);
      alert(`Linear Issue created: ${issueUrl}`);
    } catch (error) {
      alert(`Failed to create Linear issue: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNotionPage = async (idea: Idea | DeepenedIdea) => {
    if (!notionDatabaseId || !notionToken) {
      alert('Please provide Notion Database ID and Integration Token.');
      return;
    }
    try {
      setLoading(true);
      const pageUrl = await createNotionPage(idea, notionDatabaseId, notionToken);
      alert(`Notion Page created: ${pageUrl}`);
    } catch (error) {
      alert(`Failed to create Notion page: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoogleDoc = async (idea: Idea | DeepenedIdea) => {
    if (!googleDocsAccessToken) {
      alert('Please provide Google Docs Access Token.');
      return;
    }
    try {
      setLoading(true);
      const docUrl = await createGoogleDoc(idea, googleDocsAccessToken);
      alert(`Google Doc created: ${docUrl}`);
    } catch (error) {
      alert(`Failed to create Google Doc: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
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
        <input
          type="text"
          placeholder="GitHub Owner (e.g., StuckInTheNet)"
          value={githubOwner}
          onChange={(e) => setGithubOwner(e.target.value)}
          disabled={loading}
        />
        <input
          type="text"
          placeholder="GitHub Repository (e.g., ADHD_Flow)"
          value={githubRepo}
          onChange={(e) => setGithubRepo(e.target.value)}
          disabled={loading}
        />
        <input
          type="password"
          placeholder="GitHub Personal Access Token"
          value={githubToken}
          onChange={(e) => setGithubToken(e.target.value)}
          disabled={loading}
        />
        <input
          type="text"
          placeholder="Linear Team ID (e.g., team_id_abc)"
          value={linearTeamId}
          onChange={(e) => setLinearTeamId(e.target.value)}
          disabled={loading}
        />
        <input
          type="password"
          placeholder="Linear Personal Access Token"
          value={linearToken}
          onChange={(e) => setLinearToken(e.target.value)}
          disabled={loading}
        />
        <input
          type="text"
          placeholder="Notion Database ID"
          value={notionDatabaseId}
          onChange={(e) => setNotionDatabaseId(e.target.value)}
          disabled={loading}
        />
        <input
          type="password"
          placeholder="Notion Integration Token"
          value={notionToken}
          onChange={(e) => setNotionToken(e.target.value)}
          disabled={loading}
        />
        <input
          type="password"
          placeholder="Google Docs Access Token"
          value={googleDocsAccessToken}
          onChange={(e) => setGoogleDocsAccessToken(e.target.value)}
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
                <button onClick={() => handleCreateGitHubIssue(item.shortlist[0])} disabled={loading}>
                  Create GitHub Issue
                </button>
                <button onClick={() => handleCreateLinearIssue(item.shortlist[0])} disabled={loading}>
                  Create Linear Issue
                </button>
                <button onClick={() => handleCreateNotionPage(item.shortlist[0])} disabled={loading}>
                  Create Notion Page
                </button>
                <button onClick={() => handleCreateGoogleDoc(item.shortlist[0])} disabled={loading}>
                  Create Google Doc
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;