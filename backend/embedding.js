const { spawn } = require('child_process');

function generateEmbedding(text) {
  return new Promise((resolve, reject) => {
    const py = spawn('python3', ['generate_embedding.py', text]);

    let result = '';
    py.stdout.on('data', (data) => result += data.toString());

    py.stderr.on('data', (data) => console.error('Python Error:', data.toString()));

    py.on('close', (code) => {
      if (code === 0) {
        resolve(JSON.parse(result));
      } else {
        reject(new Error('Failed to generate embedding'));
      }
    });
  });
}

module.exports = { generateEmbedding };
