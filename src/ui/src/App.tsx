import { useState } from 'react';
import { run } from '../../../src/core/engine'; // Adjust path as needed
import { renderMarkdown } from '../../../src/core/render'; // Adjust path as needed
import './App.css';

function App() {
  const [problem, setProblem] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRunAdhdFlow = async () => {
    setLoading(true);
    setOutput('Generating ideas...');
    try {
      const result = await run({ problem });
      setOutput(renderMarkdown(result));
    } catch (error) {
      setOutput(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
        <button onClick={handleRunAdhdFlow} disabled={loading}>
          {loading ? 'Generating...' : 'Run ADHD_Flow'}
        </button>
      </div>
      <div className="output-section">
        <h2>Results:</h2>
        <pre>{output}</pre>
      </div>
    </div>
  );
}

export default App;
