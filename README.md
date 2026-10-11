# Simeon's portfolio

A responsive portfolio with small interactive details and a Node.js contact-message endpoint. It has no third-party Node dependencies.

## Run it

Install [Node.js](https://nodejs.org/) 18 or newer, then run these commands from the project folder:

```sh
npm start
```

Open <http://localhost:3000>. To use another port, set the `PORT` environment variable before starting the server. Check the JavaScript syntax with `npm run check`.

## What's included

- Mobile navigation, scroll-in animations, and project-category filters.
- A contact form that sends messages to `POST /api/contact`.
- Server-side validation, a hidden spam-trap field, request-size limits, and a basic per-address rate limit.
- Contact messages saved as JSON Lines in `.data/messages.jsonl`. The `.data` folder is ignored by Git.

The contact endpoint stores submissions on the server; it does not send email. For a public deployment, configure persistent storage and an email delivery service if you want to receive messages away from the server.
