const form = document.getElementById('add-story-form');
const cancelBtn = document.getElementById('cancel-btn');

cancelBtn.addEventListener('click', () => {
  window.location.href = 'index.html';
});

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const title = document.getElementById('title').value.trim();
  const author = document.getElementById('author').value.trim();
  const text = document.getElementById('text').value.trim();

  if (!title || !author || !text) return;

  const newStory = {
    id: 'custom_' + Date.now(),
    title,
    author,
    text,
    isCustom: true
  };

  const customStories = JSON.parse(localStorage.getItem('typeracer_custom_stories') || '[]');
  customStories.push(newStory);
  localStorage.setItem('typeracer_custom_stories', JSON.stringify(customStories));

  window.location.href = 'index.html';
});