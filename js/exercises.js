/* FitQuest — Exercise Library */
let exFilter = 'all';
let exSearch = '';

(async () => {
  const ready = await initApp('exercises');
  if (!ready) return;
  renderExercises();
})();

function renderExercises() {
  let exercises = getExerciseLibrary();

  if (exFilter !== 'all') exercises = exercises.filter(e => e.category === exFilter);
  if (exSearch) exercises = exercises.filter(e =>
    e.name.toLowerCase().includes(exSearch.toLowerCase()) ||
    e.muscle.toLowerCase().includes(exSearch.toLowerCase())
  );

  const categories = ['all', 'strength', 'cardio', 'hiit', 'yoga'];

  document.getElementById('page-content').innerHTML = `
    <div class="food-search-box mb-2">
      <span class="search-icon">🔍</span>
      <input type="text" placeholder="Search exercises..." value="${exSearch}" oninput="exSearch=this.value;renderExercises()">
    </div>

    <div class="exercise-filters">
      ${categories.map(c => `
        <button class="challenge-tab ${exFilter === c ? 'active' : ''}" onclick="exFilter='${c}';renderExercises()">
          ${c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
        </button>
      `).join('')}
    </div>

    <div class="exercise-grid">
      ${exercises.map(e => {
        const diffColor = e.difficulty === 'beginner' ? 'green' : e.difficulty === 'intermediate' ? 'yellow' : 'pink';
        return `
          <div class="exercise-card">
            <div class="ex-header">
              <div class="ex-icon">${e.icon}</div>
              <div>
                <div class="ex-name">${e.name}</div>
                <div class="ex-muscle">${e.muscle}</div>
              </div>
            </div>
            <div class="ex-tags">
              <span class="tag">${e.category}</span>
              <span class="tag ${diffColor}">${e.difficulty}</span>
              <span class="tag">${e.equipment}</span>
            </div>
            <div class="ex-details">
              <div class="ed-item"><div class="ed-value">${e.met}</div><div class="ed-label">MET</div></div>
              <div class="ed-item"><div class="ed-value">${e.equipment}</div><div class="ed-label">Equipment</div></div>
              <div class="ed-item"><div class="ed-value">${e.difficulty}</div><div class="ed-label">Level</div></div>
            </div>
            <p style="font-size:0.8rem;color:var(--text-muted);margin-top:0.75rem;">${e.instructions}</p>
          </div>
        `;
      }).join('')}
    </div>

    ${exercises.length === 0 ? '<div class="empty-state"><div class="empty-icon">💪</div><h3>No exercises found</h3><p>Try a different search or filter.</p></div>' : ''}
  `;
}
