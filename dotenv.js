const fs = require('fs')
try {
  const content = fs.readFileSync('.env', 'utf8')
  content.split('\n').forEach(line => {
    if (!line.trimLeft().startsWith('#')) {
      const [key, value] = line.split('=', 2).map(v => v.trim())
      if (!(key in process.env)) {
        process.env[key] = value
      }
    }
  })
} catch (e) {}
