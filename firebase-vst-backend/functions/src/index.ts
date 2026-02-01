/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import * as functions from "firebase-functions/v2";
import * as params from "firebase-functions/params";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import type {Request, Response} from "express";

admin.initializeApp();

const db = admin.firestore();
const storage = admin.storage();
const roomCodeSalt = params.defineSecret("ROOM_CODE_SALT");
const DEFAULT_SALT = "inspire-test-salt-do-not-use-in-production";

const SESSION_TTL_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
// 30 minutes for guest rooms
const GUEST_ROOM_TTL_MS = 30 * 60 * 1000;
// 24 hours for authenticated users
const AUTH_ROOM_TTL_MS = 24 * 60 * 60 * 1000;

type SessionInfo = {
  roomId: string;
  userId?: string;
  isGuest: boolean;
};

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

/**
 * Send a JSON response with consistent headers.
 * @param {Response} response Express response object.
 * @param {number} status HTTP status code.
 * @param {Record<string, unknown>} payload JSON payload to send.
 * @return {void}
 */
function sendJson(
  response: Response,
  status: number,
  payload: Record<string, unknown>
): void {
  response.status(status)
    .set(jsonHeaders)
    .send(JSON.stringify(payload));
}

/**
 * Convert milliseconds to Firestore Timestamp.
 * @param {number} ms Epoch milliseconds.
 * @return {admin.firestore.Timestamp} Firestore timestamp instance.
 */
function toTimestamp(ms: number): admin.firestore.Timestamp {
  return admin.firestore.Timestamp.fromMillis(ms);
}

/**
 * Hash a value with a secret salt.
 * @param {string} value Raw value to hash.
 * @param {string} salt Secret salt for hashing.
 * @return {string} SHA-256 hash string.
 */
function hashWithSalt(value: string, salt: string): string {
  return crypto.createHash("sha256")
    .update(`${salt}:${value}`)
    .digest("hex");
}

/**
 * Resolve client IP address from headers.
 * @param {Request} request HTTPS request.
 * @return {string} Client IP string.
 */
function getClientIp(request: Request): string {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].split(",")[0].trim();
  }
  return request.ip || "unknown";
}

/**
 * Extract bearer token from the Authorization header.
 * @param {Request} request HTTPS request.
 * @return {string | null} Bearer token or null.
 */
function getBearerToken(request: Request): string | null {
  const auth = request.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) {
    return null;
  }
  return auth.slice("Bearer ".length).trim() || null;
}

/**
 * Generate 8-character alphanumeric string.
 * @return {string} 8-char alphanumeric code.
 */
function generateAlphanumericCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a human-friendly room code.
 * @return {string} 8-char alphanumeric room code.
 */
function generateRoomCode(): string {
  return generateAlphanumericCode();
}

/**
 * Validate a session token and update lastSeenAt.
 * @param {string} token Session token value.
 * @return {Promise<SessionInfo | null>} Session info or null.
 */
async function validateSession(
  token: string,
): Promise<SessionInfo | null> {
  const docRef = db.collection("sessions").doc(token);
  const snap = await docRef.get();
  if (!snap.exists) {
    return null;
  }
  const data = snap.data();
  if (!data || typeof data.roomId !== "string" || !data.expiresAt) {
    return null;
  }
  let expiresAt = new Date(data.expiresAt).getTime();
  if (data.expiresAt.toMillis) {
    expiresAt = data.expiresAt.toMillis();
  }
  if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
    return null;
  }
  await docRef.set(
    {lastSeenAt: admin.firestore.Timestamp.now()},
    {merge: true},
  );
  return {
    roomId: data.roomId,
    userId: data.userId,
    isGuest: !data.userId || data.userId === "guest",
  };
}

/**
 * Simple health-check endpoint.
 */
export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase Functions!");
});

/**
 * Create a collaboration room with an auto-generated code.
 * Authenticated users get 24-hour rooms, guests get 30-minute rooms.
 * Note: Rooms are currently stored in memory; persist to Firestore when ready.
 */
export const createRoom = functions.https.onRequest(
  {cors: true, secrets: [roomCodeSalt]},
  async (request, response) => {
    if (request.method === "OPTIONS") {
      response.status(204).end();
      return;
    }
    if (request.method !== "POST") {
      sendJson(response, 405, {error: "Method not allowed"});
      return;
    }

    // Check for Firebase Auth token
    let userId: string | null = null;
    let isGuest = true;
    const authHeader = request.headers.authorization;

    const hasAuth = authHeader && authHeader.startsWith("Bearer ");
    if (hasAuth) {
      const idToken = authHeader.slice("Bearer ".length).trim();
      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        userId = decodedToken.uid;
        isGuest = false;
      } catch (err) {
        functions.logger.warn("Invalid Firebase Auth token", err);
        // Continue as guest
      }
    }

    // Determine TTL based on authentication status
    const ttlMs = isGuest ? GUEST_ROOM_TTL_MS : AUTH_ROOM_TTL_MS;

    let name = isGuest ? "Guest Room" : "Collab Room";
    if (typeof request.body?.name === "string" &&
        request.body.name.trim()) {
      name = request.body.name.trim();
    }

    const now = Date.now();
    const code = generateRoomCode();
    const expiresAt = now + ttlMs;
    const roomId = generateAlphanumericCode();

    // Optional password hashing
    let passwordProtected = false;
    if (typeof request.body?.password === "string" &&
        request.body.password.trim()) {
      passwordProtected = true;
    }

    functions.logger.info("Room created", {
      roomId,
      isGuest,
      userId: userId || "guest",
      ttlMinutes: ttlMs / 60000,
      hasPassword: passwordProtected,
    });

    sendJson(response, 201, {
      roomId,
      name,
      code,
      expiresAt,
      isGuest,
      ttlMinutes: ttlMs / 60000,
      passwordProtected,
    });
  }
);


/**
 * Join a room by validating a code and issuing a session token.
 */
export const joinRoom = functions.https.onRequest(
  {cors: true, secrets: [roomCodeSalt]},
  async (request, response) => {
    if (request.method === "OPTIONS") {
      response.status(204).end();
      return;
    }
    if (request.method !== "POST") {
      sendJson(response, 405, {error: "Method not allowed"});
      return;
    }

    const {roomId, code} = request.body || {};
    if (typeof roomId !== "string" || typeof code !== "string") {
      sendJson(response, 400, {error: "Missing roomId or code"});
      return;
    }

    const saltValue = roomCodeSalt.value() || DEFAULT_SALT;
    if (!saltValue) {
      sendJson(response, 500, {
        error: "ROOM_CODE_SALT is not configured",
      });
      return;
    }

    const ip = getClientIp(request);
    const ipHash = hashWithSalt(ip, saltValue);
    const rateRef = db.collection("rateLimits").doc(ipHash);

    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(rateRef);
        const now = Date.now();
        let windowStartMs = 0;
        if (snap.exists && snap.data()?.windowStart?.toMillis) {
          windowStartMs = snap.data()?.windowStart.toMillis();
        }
        let joinCount = 0;
        if (snap.exists && typeof snap.data()?.joinCount === "number") {
          joinCount = snap.data()?.joinCount;
        }
        if (!snap.exists || now - windowStartMs > RATE_LIMIT_WINDOW_MS) {
          tx.set(
            rateRef,
            {joinCount: 1, windowStart: toTimestamp(now)},
            {merge: true},
          );
          return;
        }
        if (joinCount >= RATE_LIMIT_MAX) {
          throw new Error("RATE_LIMIT");
        }
        tx.set(rateRef, {joinCount: joinCount + 1}, {merge: true});
      });
    } catch (err) {
      if ((err as Error).message === "RATE_LIMIT") {
        sendJson(response, 429, {error: "Too many join attempts"});
        return;
      }
      functions.logger.error("Rate limit check failed", err);
      sendJson(response, 500, {error: "Rate limit check failed"});
      return;
    }

    const roomSnap = await db.collection("rooms")
      .doc(roomId)
      .get();
    if (!roomSnap.exists) {
      sendJson(response, 404, {error: "Room not found"});
      return;
    }
    const roomData = roomSnap.data();
    if (!roomData ||
        roomData.isActive !== true ||
        typeof roomData.codeHash !== "string") {
      sendJson(response, 403, {error: "Room inactive"});
      return;
    }

    const expectedHash = roomData.codeHash;
    const providedHash = hashWithSalt(code, saltValue);
    if (expectedHash !== providedHash) {
      sendJson(response, 401, {error: "Invalid code"});
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const now = Date.now();
    const expiresAt = now + SESSION_TTL_MS;
    await db.collection("sessions").doc(token).set({
      roomId,
      createdAt: toTimestamp(now),
      expiresAt: toTimestamp(expiresAt),
      lastSeenAt: toTimestamp(now),
      ipHash,
    });

    sendJson(response, 200, {token, expiresAt});
  }
);

/**
 * List files for a valid session.
 */
export const listFiles = functions.https.onRequest(
  {cors: true},
  async (request, response) => {
    if (request.method === "OPTIONS") {
      response.status(204).end();
      return;
    }

    const token = getBearerToken(request);
    if (!token) {
      sendJson(response, 401, {error: "Missing session token"});
      return;
    }

    const session = await validateSession(token);
    if (!session) {
      sendJson(response, 401, {error: "Invalid or expired session"});
      return;
    }

    const filesRef = db.collection("rooms")
      .doc(session.roomId)
      .collection("files");
    const sinceRaw = request.query?.since;
    let filesSnap: admin.firestore.QuerySnapshot;
    if (typeof sinceRaw === "string" && sinceRaw.trim().length > 0) {
      const sinceMs = Number.parseInt(sinceRaw, 10);
      let sinceTs: admin.firestore.Timestamp | null = null;
      if (!Number.isNaN(sinceMs)) {
        sinceTs = toTimestamp(sinceMs);
      }
      if (sinceTs) {
        filesSnap = await filesRef.where("updatedAt", ">=", sinceTs).get();
      } else {
        filesSnap = await filesRef.get();
      }
    } else {
      filesSnap = await filesRef.get();
    }
    const items = filesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    sendJson(response, 200, {
      items,
      serverTime: Date.now(),
    });
  }
);

/**
 * Create a signed download URL for a file.
 */
export const getDownloadUrl = functions.https.onRequest(
  {cors: true},
  async (request, response) => {
    if (request.method === "OPTIONS") {
      response.status(204).end();
      return;
    }
    if (request.method !== "POST") {
      sendJson(response, 405, {error: "Method not allowed"});
      return;
    }

    const token = getBearerToken(request);
    if (!token) {
      sendJson(response, 401, {error: "Missing session token"});
      return;
    }

    const {fileId} = request.body || {};
    if (typeof fileId !== "string") {
      sendJson(response, 400, {error: "Missing fileId"});
      return;
    }

    const session = await validateSession(token);
    if (!session) {
      sendJson(response, 401, {error: "Invalid or expired session"});
      return;
    }

    const fileSnap = await db.collection("rooms")
      .doc(session.roomId)
      .collection("files")
      .doc(fileId)
      .get();
    if (!fileSnap.exists) {
      sendJson(response, 404, {error: "File not found"});
      return;
    }
    const fileData = fileSnap.data();
    if (!fileData || typeof fileData.storagePath !== "string") {
      sendJson(response, 500, {error: "Invalid file metadata"});
      return;
    }

    const [url] = await storage.bucket()
      .file(fileData.storagePath)
      .getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + 15 * 60 * 1000,
      });

    sendJson(response, 200, {url});
  }
);

/**
 * Register a new user account.
 * Creates Firebase Auth user and stores profile in Firestore.
 */
export const registerUser = functions.https.onRequest(
  {cors: true},
  async (request, response) => {
    if (request.method === "OPTIONS") {
      response.status(204).end();
      return;
    }
    if (request.method !== "POST") {
      sendJson(response, 405, {error: "Method not allowed"});
      return;
    }

    const {email, password, displayName} = request.body || {};

    const isValidEmail = typeof email === "string" && email.includes("@");
    if (!isValidEmail) {
      sendJson(response, 400, {error: "Invalid email address"});
      return;
    }

    const isValidPassword = typeof password === "string" &&
      password.length >= 6;
    if (!isValidPassword) {
      sendJson(response, 400, {
        error: "Password must be at least 6 characters",
      });
      return;
    }

    try {
      // Create Firebase Auth user
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: displayName || email.split("@")[0],
        emailVerified: false,
      });

      // Store user profile in Firestore
      await db.collection("users").doc(userRecord.uid).set({
        email: userRecord.email,
        displayName: userRecord.displayName,
        createdAt: toTimestamp(Date.now()),
        emailVerified: false,
        roomsCreated: 0,
        lastActive: toTimestamp(Date.now()),
      });

      // Generate email verification link
      const verificationLink = await admin.auth()
        .generateEmailVerificationLink(email);

      functions.logger.info("User registered", {
        uid: userRecord.uid,
        email: userRecord.email,
      });

      sendJson(response, 201, {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        emailVerificationLink: verificationLink,
        message: "User created. Please verify email.",
      });
    } catch (error) {
      functions.logger.error("User registration failed", error);
      const err = error as {code?: string; message?: string};

      if (err.code === "auth/email-already-exists") {
        sendJson(response, 409, {error: "Email already registered"});
      } else if (err.code === "auth/invalid-email") {
        sendJson(response, 400, {error: "Invalid email format"});
      } else {
        sendJson(response, 500, {
          error: "Registration failed",
          details: err.message,
        });
      }
    }
  }
);

/**
 * Verify user email address.
 */
export const verifyEmail = functions.https.onRequest(
  {cors: true},
  async (request, response) => {
    if (request.method === "OPTIONS") {
      response.status(204).end();
      return;
    }
    if (request.method !== "POST") {
      sendJson(response, 405, {error: "Method not allowed"});
      return;
    }

    const token = getBearerToken(request);
    if (!token) {
      sendJson(response, 401, {error: "Missing auth token"});
      return;
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      // Update emailVerified in Firestore
      await db.collection("users").doc(userId).update({
        emailVerified: true,
        lastActive: toTimestamp(Date.now()),
      });

      // Update Firebase Auth
      await admin.auth().updateUser(userId, {
        emailVerified: true,
      });

      sendJson(response, 200, {
        message: "Email verified successfully",
        uid: userId,
      });
    } catch (error) {
      functions.logger.error("Email verification failed", error);
      sendJson(response, 401, {error: "Invalid or expired token"});
    }
  }
);

/**
 * Get user profile.
 */
export const getUserProfile = functions.https.onRequest(
  {cors: true},
  async (request, response) => {
    if (request.method === "OPTIONS") {
      response.status(204).end();
      return;
    }

    const token = getBearerToken(request);
    if (!token) {
      sendJson(response, 401, {error: "Missing auth token"});
      return;
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      const userDoc = await db.collection("users").doc(userId).get();

      if (!userDoc.exists) {
        sendJson(response, 404, {error: "User profile not found"});
        return;
      }

      const userData = userDoc.data();
      sendJson(response, 200, {
        uid: userId,
        ...userData,
      });
    } catch (error) {
      functions.logger.error("Get profile failed", error);
      sendJson(response, 401, {error: "Invalid or expired token"});
    }
  }
);

// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({maxInstances: 10});

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
