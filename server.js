"use strict";

const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const root = __dirname;
const dataDirectory = path.join(root, ".data");
const messageFile = path.join(dataDirectory, "messages.jsonl");
const port = Number(process.env.PORT || 3000);
const maxBodyBytes = 8 * 1024;
const rateLimitWindowMs = 15 * 60 * 1000;
const rateLimitMax = 5;
const submissionsByAddress = new Map();
const publicFiles = new Map([
    ["/", ["Simeon001.html", "text/html; charset=utf-8"]],
    ["/Simeon001.html", ["Simeon001.html", "text/html; charset=utf-8"]],
    ["/Simeon.css", ["Simeon.css", "text/css; charset=utf-8"]],
    ["/Simeon.js", ["Simeon.js", "text/javascript; charset=utf-8"]]
]);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a whole number between 1 and 65535.");
}

function sendJson(response, statusCode, payload) {
    response.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
    });
    response.end(JSON.stringify(payload));
}

function setSecurityHeaders(response) {
    response.setHeader("Content-Security-Policy", "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; img-src 'self' data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

function readJsonBody(request) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        let settled = false;

        request.on("data", (chunk) => {
            if (settled) return;
            size += chunk.length;
            if (size > maxBodyBytes) {
                settled = true;
                reject(Object.assign(new Error("Your message is too large."), { statusCode: 413 }));
                return;
            }
            chunks.push(chunk);
        });
        request.on("end", () => {
            if (settled) return;
            settled = true;
            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
            } catch {
                reject(Object.assign(new Error("Please send a valid JSON message."), { statusCode: 400 }));
            }
        });
        request.on("error", (error) => {
            if (!settled) reject(error);
        });
    });
}

function checkRateLimit(address) {
    const now = Date.now();
    const recent = (submissionsByAddress.get(address) || []).filter((time) => now - time < rateLimitWindowMs);
    if (recent.length >= rateLimitMax) {
        submissionsByAddress.set(address, recent);
        return false;
    }
    recent.push(now);
    submissionsByAddress.set(address, recent);
    return true;
}

async function handleContact(request, response) {
    const contentType = request.headers["content-type"] || "";
    if (!contentType.toLowerCase().startsWith("application/json")) {
        sendJson(response, 415, { error: "Please send the form as JSON." });
        return;
    }

    let body;
    try {
        body = await readJsonBody(request);
    } catch (error) {
        if (!response.writableEnded) {
            sendJson(response, error.statusCode || 400, { error: error.message });
        }
        return;
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
        sendJson(response, 400, { error: "Please check your message and try again." });
        return;
    }

    if (typeof body.website === "string" && body.website.trim()) {
        sendJson(response, 201, { message: "Thanks! Your note has been received." });
        return;
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (name.length < 1 || name.length > 80) {
        sendJson(response, 400, { error: "Please enter a name under 80 characters." });
        return;
    }
    if (email.length > 254 || !emailPattern.test(email)) {
        sendJson(response, 400, { error: "Please enter a valid email address." });
        return;
    }
    if (message.length < 1 || message.length > 2000) {
        sendJson(response, 400, { error: "Please enter a message under 2,000 characters." });
        return;
    }

    const address = request.socket.remoteAddress || "unknown";
    if (!checkRateLimit(address)) {
        response.setHeader("Retry-After", String(Math.ceil(rateLimitWindowMs / 1000)));
        sendJson(response, 429, { error: "Too many notes from this connection. Please try again in 15 minutes." });
        return;
    }

    const submission = {
        receivedAt: new Date().toISOString(),
        name,
        email,
        message
    };

    try {
        await fs.mkdir(dataDirectory, { recursive: true, mode: 0o700 });
        await fs.appendFile(messageFile, `${JSON.stringify(submission)}\n`, { encoding: "utf8", mode: 0o600 });
    } catch (error) {
        console.error("Unable to save contact message:", error);
        sendJson(response, 500, { error: "The server could not save your note. Please try again later." });
        return;
    }

    sendJson(response, 201, { message: "Your note is saved. Thanks for reaching out!" });
}

async function handleRequest(request, response) {
    setSecurityHeaders(response);
    const pathname = new URL(request.url, "http://localhost").pathname;

    if (pathname === "/api/contact") {
        if (request.method !== "POST") {
            response.setHeader("Allow", "POST");
            sendJson(response, 405, { error: "Use POST to send a note." });
            return;
        }
        await handleContact(request, response);
        return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
        response.setHeader("Allow", "GET, HEAD");
        sendJson(response, 405, { error: "That method is not available." });
        return;
    }

    const file = publicFiles.get(pathname);
    if (!file) {
        sendJson(response, 404, { error: "Page not found." });
        return;
    }

    try {
        const contents = await fs.readFile(path.join(root, file[0]));
        response.writeHead(200, {
            "Content-Type": file[1],
            "Cache-Control": "no-cache",
            "Content-Length": contents.length
        });
        response.end(request.method === "HEAD" ? undefined : contents);
    } catch (error) {
        console.error("Unable to serve portfolio file:", error);
        sendJson(response, 500, { error: "The portfolio file could not be loaded." });
    }
}

const server = http.createServer((request, response) => {
    handleRequest(request, response).catch((error) => {
        console.error("Unexpected server error:", error);
        if (!response.headersSent) sendJson(response, 500, { error: "An unexpected server error occurred." });
        else response.destroy();
    });
});

server.listen(port, () => {
    console.log(`Simeon's portfolio is running at http://localhost:${port}`);
});
