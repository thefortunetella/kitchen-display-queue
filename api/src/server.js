const { createApp } = require('./app');
const { port } = require('./config');

createApp().listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
