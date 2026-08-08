import express from 'express'

const app = express()

app.get('/ping', (req, res) => {
  res.send('Pong')
})

app.get('/health', (req, res) => {
  res.send('OK')
})

app.listen(process.env.PORT, () => {
  console.log(`Server is running on http://localhost:${process.env.PORT}`)
})