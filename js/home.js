const storyGrid = document.getElementById('story-grid');

async function initialize() {
  if (window.location.protocol === 'file:') {
    alert(
      "⚠️ Security Restriction ⚠️\n\n" +
      "Browsers block 'fetch' requests to local files for security.\n" +
      "To load stories from external files, you must run a local web server (e.g., 'python3 -m http.server')."
    );
  }

  try {
    const response = await fetch('data/STORIES.json');
    if (!response.ok) throw new Error('Failed to load STORIES.json');
    const data = await response.json();
    let stories = data.stories;

    // Load custom stories from localStorage
    const customStories = JSON.parse(localStorage.getItem('typeracer_custom_stories') || '[]');
    stories = [...stories, ...customStories];

    // Fetch text previews to count words
    await Promise.all(stories.map(async (story) => {
      try {
        if (story.file) {
          const res = await fetch(story.file);
          if (res.ok) {
            story.text = await res.text();
          }
        }
      } catch (e) {
        story.text = "";
      }
    }));

    storyGrid.innerHTML = '';
    stories.forEach(story => {
      const wordCount = story.text ? story.text.trim().split(/\s+/).length : '?';
      const card = document.createElement('div');
      card.className = 'story-card';
      card.innerHTML = `
        <h3>${story.title}</h3>
        <div class="card-meta">${story.author} &mdash; ${wordCount} words</div>
      `;
      card.addEventListener('click', () => {
        window.location.href = `game.html?id=${story.id}`;
      });
      storyGrid.appendChild(card);
    });

  } catch (error) {
    console.error('Error loading stories:', error);
    storyGrid.innerHTML = '<p style="color:var(--incorrect)">Failed to load stories.</p>';
  }
}

initialize();