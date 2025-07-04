import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './TestWindow.css';
const BACKEND = import.meta.env.VITE_BACKEND_URL;

const TestWindow = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { skill, level, employeeInfo, employeeRoles, employeeId } = location.state || {};
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [skillMap, setSkillMap] = useState({});
  const [selectedAnswers, setSelectedAnswers] = useState({});

  console.log("TestWindow location.state:", location.state);
  console.log("TestWindow employeeInfo:", employeeInfo);
  console.log("TestWindow employeeRoles:", employeeRoles);

  // Fetch skill code map from backend
  useEffect(() => {
    fetch('/excel_data/skill_code_map.csv')
      .then(res => res.text())
      .then(csv => {
        const lines = csv.trim().split('\n');
        const map = {};
        for (let i = 1; i < lines.length; i++) {
          const [code, name] = lines[i].split(',');
          map[name.trim()] = code.trim();
        }
        setSkillMap(map);
      });
  }, []);

  useEffect(() => {
    if (skill && level && Object.keys(skillMap).length > 0) {
      const skill_id = skillMap[skill] || skill;
      fetch(`${BACKEND}/api/mcq/questions?skill_id=${encodeURIComponent(skill_id)}&level=${level}`)
        .then(res => res.json())
        .then(data => {
          console.log("Requested skill_id:", skill_id, "difficulty:", level);
          console.log("Found", data.questions.length, "matching questions");
          setQuestions(data.questions || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else if (!skill || !level) {
      setLoading(false);
    }
  }, [skill, level, skillMap]);

  const handleOptionChange = (qIdx, option) => {
    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: option }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Use employeeId from navigation state, fallback to employeeInfo
    const empId = employeeId || employeeInfo?.id || employeeInfo?.employee_id || employeeInfo?.emp_id;
    const employeeName = employeeInfo?.name || employeeInfo?.employee_name;
    const employeePosition = (employeeInfo?.roles && employeeInfo.roles[0]) || (Array.isArray(employeeRoles) && employeeRoles[0]) || employeeInfo?.position || employeeInfo?.role;

    const submissions = questions.map((q, i) => {
      const selectedIdx = q.options.findIndex(opt => opt === selectedAnswers[i]);
      const selected_letter = selectedIdx !== -1 ? String.fromCharCode(65 + selectedIdx) : '';
      return {
        question_id: q._id || q.question_id,
        question_text: q.question_text,
        options: q.options,
        selected_letter,
        skill: q.skill_id || skill,
        level: level,
        employee_id: empId,
        employee_name: employeeName,
        employee_position: employeePosition
      };
    });

    fetch(`${BACKEND}/api/mcq/submit-answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissions })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert('Answers submitted!');
          navigate('/dashboard', {
            state: {
              employeeInfo,
              employeeRoles,
              employeeId,
              submittedTest: { skill, level }
            }
          });
        } else {
          alert('Submission failed');
        }
      })
      .catch(() => {
        alert('Submission failed');
      });
  };

  if (loading) return <div style={{textAlign: 'center', marginTop: 40}}>Loading...</div>;
  if (!questions.length) return <div style={{textAlign: 'center', marginTop: 40}}>No questions found for this skill/level.</div>;

  return (
    <div className="testwindow-root">
      <h2 className="testwindow-title">Test: {skill} (Level {level})</h2>
      <form onSubmit={handleSubmit}>
        <ol className="testwindow-questions">
          {questions.map((q, i) => (
            <li key={i} className="testwindow-question-card">
              <div className="testwindow-question-text">
                {q.question_text}
              </div>
              <ul className="testwindow-options">
                {q.options.map((opt, j) => (
                  <li key={j} className="testwindow-option-item">
                    <label className="testwindow-option-label">
                      <input
                        type="radio"
                        className="testwindow-radio"
                        name={`q${i}`}
                        value={opt}
                        checked={selectedAnswers[i] === opt}
                        onChange={() => handleOptionChange(i, opt)}
                        required
                      />
                      {opt}
                    </label>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
        <div className="testwindow-submit-row">
          <button type="submit" className="testwindow-submit-btn">
            Submit
          </button>
        </div>
      </form>
    </div>
  );
};

export default TestWindow;