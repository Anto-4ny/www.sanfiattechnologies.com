// Example: Send feedback
async function sendFeedback(fileURL, feedback) {
  await fetch('https://your-backend-endpoint/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileURL: fileURL,
      feedback: feedback
    })
  });
}
