import { db } from "./firebase";
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
  writeBatch
} from "firebase/firestore";
import { EventData, QuestionData, ParticipantData, ResponseData, ParticipantIdentifierConfig } from "./types";

const IS_MOCK = !db || process.env.NEXT_PUBLIC_FIREBASE_API_KEY === "mock-api-key";

// --- MOCK DATABASE SETUP (LOCAL STORAGE + CROSS-TAB EMITTER) ---

// Listener registries for Mock mode
type ListenerCallback = (data: any) => void;
const mockListeners: { [key: string]: Set<ListenerCallback> } = {};

function notifyMockListeners(key: string, data: any) {
  if (mockListeners[key]) {
    mockListeners[key].forEach((cb) => cb(data));
  }
}

// Cross-tab synchronization via storage event
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (!IS_MOCK || !e.key) return;

    if (e.key.startsWith("hive_event_")) {
      const eventCode = e.key.replace("hive_event_", "");
      const val = e.newValue ? JSON.parse(e.newValue) : null;
      notifyMockListeners(`event_${eventCode}`, val);
    } else if (e.key.startsWith("hive_questions_")) {
      const eventCode = e.key.replace("hive_questions_", "");
      const val = e.newValue ? JSON.parse(e.newValue) : [];
      notifyMockListeners(`questions_${eventCode}`, val);
    } else if (e.key.startsWith("hive_participants_")) {
      const eventCode = e.key.replace("hive_participants_", "");
      const val = e.newValue ? JSON.parse(e.newValue) : [];
      notifyMockListeners(`participants_${eventCode}`, val);
    } else if (e.key.startsWith("hive_responses_")) {
      const eventCode = e.key.replace("hive_responses_", "");
      const val = e.newValue ? JSON.parse(e.newValue) : [];
      notifyMockListeners(`responses_${eventCode}`, val);
      
      // Update revealed responses listener too
      const revealed = val.filter((r: any) => r.moderationStatus === "approved" && r.isRevealed);
      revealed.sort((a: any, b: any) => new Date(a.revealedAt || 0).getTime() - new Date(b.revealedAt || 0).getTime());
      notifyMockListeners(`revealed_responses_${eventCode}`, revealed);
    }
  });
}

function getMockData<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultValue;
}

function saveMockData(key: string, data: any) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

// --- ACTUAL DATABASE INTERFACE ---

// Generates a random 5-digit event code
export function generateEventCode(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

// Generates a secure admin key (8 characters alphanumeric)
export function generateAdminKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Avoid confusing chars like I, O, 0, 1
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Check if an event exists by event code
export async function checkEventExists(eventCode: string): Promise<boolean> {
  if (IS_MOCK) {
    const event = getMockData<EventData | null>(`hive_event_${eventCode}`, null);
    return event !== null;
  }
  try {
    const eventDoc = await getDoc(doc(db, "events", eventCode));
    return eventDoc.exists();
  } catch (error) {
    console.error("Error checking event existence:", error);
    return false;
  }
}

// Create new event in Firestore
export async function createEvent(
  eventCode: string,
  adminKey: string,
  identifierConfig: ParticipantIdentifierConfig
): Promise<boolean> {
  if (IS_MOCK) {
    const newEvent: EventData = {
      eventCode,
      adminKey,
      createdAt: new Date().toISOString(),
      status: "active",
      participantIdentifierConfig: identifierConfig,
      activeQuestionId: null,
      activeQuestionStatus: "waiting"
    };
    saveMockData(`hive_event_${eventCode}`, newEvent);
    saveMockData(`hive_questions_${eventCode}`, []);
    saveMockData(`hive_participants_${eventCode}`, []);
    saveMockData(`hive_responses_${eventCode}`, []);
    
    // Also save lookup key for admin
    saveMockData(`hive_admin_lookup_${adminKey}`, eventCode);
    return true;
  }
  try {
    const eventRef = doc(db, "events", eventCode);
    const newEvent: EventData = {
      eventCode,
      adminKey,
      createdAt: serverTimestamp(),
      status: "active",
      participantIdentifierConfig: identifierConfig,
      activeQuestionId: null,
      activeQuestionStatus: "waiting"
    };
    await setDoc(eventRef, newEvent);
    return true;
  } catch (error) {
    console.error("Error creating event:", error);
    return false;
  }
}

// Find event code by admin key
export async function findEventByAdminKey(adminKey: string): Promise<string | null> {
  if (IS_MOCK) {
    return getMockData<string | null>(`hive_admin_lookup_${adminKey}`, null);
  }
  try {
    const q = query(collection(db, "events"), where("adminKey", "==", adminKey));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].id;
    }
    return null;
  } catch (error) {
    console.error("Error finding event by admin key:", error);
    return null;
  }
}

// Listen to event updates
export function listenToEvent(eventCode: string, callback: (event: EventData | null) => void) {
  if (IS_MOCK) {
    const current = getMockData<EventData | null>(`hive_event_${eventCode}`, null);
    
    const key = `event_${eventCode}`;
    if (!mockListeners[key]) mockListeners[key] = new Set();
    mockListeners[key].add(callback);
    
    callback(current);
    
    return () => {
      mockListeners[key].delete(callback);
    };
  }
  
  const eventRef = doc(db, "events", eventCode);
  return onSnapshot(
    eventRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as EventData);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.error("listenToEvent error:", err);
    }
  );
}

// Join event as participant
export async function joinParticipant(
  eventCode: string,
  identifier: string
): Promise<string | null> {
  const participantId = Math.random().toString(36).substring(2, 15);
  
  if (IS_MOCK) {
    const participants = getMockData<ParticipantData[]>(`hive_participants_${eventCode}`, []);
    const newParticipant: ParticipantData = {
      id: participantId,
      identifier,
      joinedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      isOnline: true
    };
    const next = [newParticipant, ...participants];
    saveMockData(`hive_participants_${eventCode}`, next);
    notifyMockListeners(`participants_${eventCode}`, next);
    return participantId;
  }
  try {
    const participantRef = doc(db, "events", eventCode, "participants", participantId);
    const newParticipant: ParticipantData = {
      id: participantId,
      identifier,
      joinedAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
      isOnline: true
    };
    await setDoc(participantRef, newParticipant);
    return participantId;
  } catch (error) {
    console.error("Error joining participant:", error);
    return null;
  }
}

// Keep participant presence active (heartbeat)
export async function updateParticipantPresence(
  eventCode: string,
  participantId: string,
  isOnline: boolean
): Promise<void> {
  if (IS_MOCK) {
    const participants = getMockData<ParticipantData[]>(`hive_participants_${eventCode}`, []);
    const index = participants.findIndex((p) => p.id === participantId);
    if (index !== -1) {
      participants[index].isOnline = isOnline;
      participants[index].lastSeenAt = new Date().toISOString();
      saveMockData(`hive_participants_${eventCode}`, participants);
      notifyMockListeners(`participants_${eventCode}`, participants);
    }
    return;
  }
  try {
    const participantRef = doc(db, "events", eventCode, "participants", participantId);
    await updateDoc(participantRef, {
      isOnline,
      lastSeenAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating participant presence:", error);
  }
}

// Listen to all participants of an event
export function listenToParticipants(
  eventCode: string,
  callback: (participants: ParticipantData[]) => void
) {
  if (IS_MOCK) {
    const participants = getMockData<ParticipantData[]>(`hive_participants_${eventCode}`, []);
    
    const key = `participants_${eventCode}`;
    if (!mockListeners[key]) mockListeners[key] = new Set();
    mockListeners[key].add(callback);
    
    callback(participants);
    
    return () => {
      mockListeners[key].delete(callback);
    };
  }
  
  const participantsRef = collection(db, "events", eventCode, "participants");
  const q = query(participantsRef, orderBy("joinedAt", "desc"));
  
  return onSnapshot(
    q,
    (snapshot) => {
      const participants: ParticipantData[] = [];
      snapshot.forEach((docSnap) => {
        participants.push(docSnap.data() as ParticipantData);
      });
      callback(participants);
    },
    (err) => {
      console.error("listenToParticipants error:", err);
    }
  );
}

// Add a question to an event
export async function addQuestion(eventCode: string, text: string, order: number): Promise<string | null> {
  const questionId = Math.random().toString(36).substring(2, 10);
  
  if (IS_MOCK) {
    const questions = getMockData<QuestionData[]>(`hive_questions_${eventCode}`, []);
    const newQuestion: QuestionData = {
      id: questionId,
      text,
      type: "open_response",
      order,
      createdAt: new Date().toISOString(),
      status: "draft"
    };
    const next = [...questions, newQuestion].sort((a, b) => a.order - b.order);
    saveMockData(`hive_questions_${eventCode}`, next);
    notifyMockListeners(`questions_${eventCode}`, next);
    return questionId;
  }
  try {
    const questionRef = doc(db, "events", eventCode, "questions", questionId);
    const newQuestion: QuestionData = {
      id: questionId,
      text,
      type: "open_response",
      order,
      createdAt: serverTimestamp(),
      status: "draft"
    };
    await setDoc(questionRef, newQuestion);
    return questionId;
  } catch (error) {
    console.error("Error adding question:", error);
    return null;
  }
}

// Listen to questions in an event
export function listenToQuestions(
  eventCode: string,
  callback: (questions: QuestionData[]) => void
) {
  if (IS_MOCK) {
    const questions = getMockData<QuestionData[]>(`hive_questions_${eventCode}`, []);
    
    const key = `questions_${eventCode}`;
    if (!mockListeners[key]) mockListeners[key] = new Set();
    mockListeners[key].add(callback);
    
    callback(questions);
    
    return () => {
      mockListeners[key].delete(callback);
    };
  }
  
  const questionsRef = collection(db, "events", eventCode, "questions");
  const q = query(questionsRef, orderBy("order", "asc"));
  
  return onSnapshot(
    q,
    (snapshot) => {
      const questions: QuestionData[] = [];
      snapshot.forEach((docSnap) => {
        questions.push(docSnap.data() as QuestionData);
      });
      callback(questions);
    },
    (err) => {
      console.error("listenToQuestions error:", err);
    }
  );
}

// Launch a question (make it active)
export async function launchQuestion(eventCode: string, questionId: string): Promise<boolean> {
  if (IS_MOCK) {
    const event = getMockData<EventData | null>(`hive_event_${eventCode}`, null);
    const questions = getMockData<QuestionData[]>(`hive_questions_${eventCode}`, []);
    
    if (event) {
      event.activeQuestionId = questionId;
      event.activeQuestionStatus = "launched";
      saveMockData(`hive_event_${eventCode}`, event);
      notifyMockListeners(`event_${eventCode}`, event);
    }
    
    const index = questions.findIndex((q) => q.id === questionId);
    if (index !== -1) {
      questions[index].status = "active";
      saveMockData(`hive_questions_${eventCode}`, questions);
      notifyMockListeners(`questions_${eventCode}`, questions);
    }
    
    return true;
  }
  try {
    const batch = writeBatch(db);
    const questionRef = doc(db, "events", eventCode, "questions", questionId);
    batch.update(questionRef, { status: "active" });
    
    const eventRef = doc(db, "events", eventCode);
    batch.update(eventRef, {
      activeQuestionId: questionId,
      activeQuestionStatus: "launched"
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error launching question:", error);
    return false;
  }
}

// Update active question status (pause, end, hide)
export async function updateActiveQuestionStatus(
  eventCode: string,
  status: "waiting" | "launched" | "paused" | "ended" | "hidden",
  questionId: string | null
): Promise<boolean> {
  if (IS_MOCK) {
    const event = getMockData<EventData | null>(`hive_event_${eventCode}`, null);
    if (event) {
      if (status === "hidden") {
        event.activeQuestionId = null;
        event.activeQuestionStatus = "waiting";
      } else {
        event.activeQuestionStatus = status;
      }
      saveMockData(`hive_event_${eventCode}`, event);
      notifyMockListeners(`event_${eventCode}`, event);
    }
    
    if (questionId && status === "ended") {
      const questions = getMockData<QuestionData[]>(`hive_questions_${eventCode}`, []);
      const idx = questions.findIndex((q) => q.id === questionId);
      if (idx !== -1) {
        questions[idx].status = "completed";
        saveMockData(`hive_questions_${eventCode}`, questions);
        notifyMockListeners(`questions_${eventCode}`, questions);
      }
    }
    return true;
  }
  try {
    const batch = writeBatch(db);
    const eventRef = doc(db, "events", eventCode);
    
    if (status === "hidden") {
      batch.update(eventRef, {
        activeQuestionId: null,
        activeQuestionStatus: "waiting"
      });
    } else {
      batch.update(eventRef, {
        activeQuestionStatus: status
      });
    }
    
    if (questionId) {
      const questionRef = doc(db, "events", eventCode, "questions", questionId);
      if (status === "ended") {
        batch.update(questionRef, { status: "completed" });
      }
    }
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error updating active question status:", error);
    return false;
  }
}

// Submit response to a question
export async function submitResponse(
  eventCode: string,
  questionId: string,
  participantId: string,
  participantIdentifier: string,
  answer: string
): Promise<boolean> {
  if (IS_MOCK) {
    const responses = getMockData<ResponseData[]>(`hive_responses_${eventCode}`, []);
    const newResponse: ResponseData = {
      id: `${questionId}_${participantId}`,
      questionId,
      participantId,
      participantIdentifier,
      answer,
      submittedAt: new Date().toISOString(),
      moderationStatus: "pending",
      isStarred: false,
      tags: [],
      isRevealed: false,
      isIdentityRevealed: false,
      revealedAt: null
    };
    // Unique check (replace if already exists)
    const filtered = responses.filter((r) => r.id !== newResponse.id);
    const next = [newResponse, ...filtered];
    saveMockData(`hive_responses_${eventCode}`, next);
    notifyMockListeners(`responses_${eventCode}`, next);
    return true;
  }
  try {
    const responseId = `${questionId}_${participantId}`;
    const responseRef = doc(db, "events", eventCode, "responses", responseId);
    
    const newResponse: ResponseData = {
      id: responseId,
      questionId,
      participantId,
      participantIdentifier,
      answer,
      submittedAt: serverTimestamp(),
      moderationStatus: "pending",
      isStarred: false,
      tags: [],
      isRevealed: false,
      isIdentityRevealed: false,
      revealedAt: null
    };
    
    await setDoc(responseRef, newResponse);
    return true;
  } catch (error) {
    console.error("Error submitting response:", error);
    return false;
  }
}

// Listen to all responses (for Moderator Dashboard)
export function listenToResponses(
  eventCode: string,
  callback: (responses: ResponseData[]) => void
) {
  if (IS_MOCK) {
    const responses = getMockData<ResponseData[]>(`hive_responses_${eventCode}`, []);
    
    const key = `responses_${eventCode}`;
    if (!mockListeners[key]) mockListeners[key] = new Set();
    mockListeners[key].add(callback);
    
    callback(responses);
    
    return () => {
      mockListeners[key].delete(callback);
    };
  }
  
  const responsesRef = collection(db, "events", eventCode, "responses");
  const q = query(responsesRef, orderBy("submittedAt", "desc"));
  
  return onSnapshot(
    q,
    (snapshot) => {
      const responses: ResponseData[] = [];
      snapshot.forEach((docSnap) => {
        responses.push(docSnap.data() as ResponseData);
      });
      callback(responses);
    },
    (err) => {
      console.error("listenToResponses error:", err);
    }
  );
}

// Moderate response (approve/reject)
export async function moderateResponse(
  eventCode: string,
  responseId: string,
  status: "pending" | "approved" | "rejected"
): Promise<void> {
  if (IS_MOCK) {
    const responses = getMockData<ResponseData[]>(`hive_responses_${eventCode}`, []);
    const idx = responses.findIndex((r) => r.id === responseId);
    if (idx !== -1) {
      responses[idx].moderationStatus = status;
      saveMockData(`hive_responses_${eventCode}`, responses);
      notifyMockListeners(`responses_${eventCode}`, responses);
      
      // Also update revealed response listener
      const revealed = responses.filter((r) => r.moderationStatus === "approved" && r.isRevealed);
      revealed.sort((a, b) => new Date(a.revealedAt || 0).getTime() - new Date(b.revealedAt || 0).getTime());
      notifyMockListeners(`revealed_responses_${eventCode}`, revealed);
    }
    return;
  }
  try {
    const responseRef = doc(db, "events", eventCode, "responses", responseId);
    await updateDoc(responseRef, { moderationStatus: status });
  } catch (error) {
    console.error("Error moderating response:", error);
  }
}

// Toggle response star status
export async function toggleResponseStar(
  eventCode: string,
  responseId: string,
  isStarred: boolean
): Promise<void> {
  if (IS_MOCK) {
    const responses = getMockData<ResponseData[]>(`hive_responses_${eventCode}`, []);
    const idx = responses.findIndex((r) => r.id === responseId);
    if (idx !== -1) {
      responses[idx].isStarred = isStarred;
      saveMockData(`hive_responses_${eventCode}`, responses);
      notifyMockListeners(`responses_${eventCode}`, responses);
    }
    return;
  }
  try {
    const responseRef = doc(db, "events", eventCode, "responses", responseId);
    await updateDoc(responseRef, { isStarred });
  } catch (error) {
    console.error("Error toggling response star:", error);
  }
}

// Add/Remove tag from a response (tags: "funny", "creative", "wild")
export async function toggleResponseTag(
  eventCode: string,
  responseId: string,
  tag: string,
  hasTag: boolean
): Promise<void> {
  if (IS_MOCK) {
    const responses = getMockData<ResponseData[]>(`hive_responses_${eventCode}`, []);
    const idx = responses.findIndex((r) => r.id === responseId);
    if (idx !== -1) {
      const currentTags = responses[idx].tags || [];
      let nextTags: string[];
      if (hasTag) {
        nextTags = currentTags.filter((t) => t !== tag);
      } else {
        nextTags = currentTags.includes(tag) ? currentTags : [...currentTags, tag];
      }
      responses[idx].tags = nextTags;
      saveMockData(`hive_responses_${eventCode}`, responses);
      notifyMockListeners(`responses_${eventCode}`, responses);
    }
    return;
  }
  try {
    const responseRef = doc(db, "events", eventCode, "responses", responseId);
    const docSnap = await getDoc(responseRef);
    if (docSnap.exists()) {
      const currentTags = (docSnap.data().tags as string[]) || [];
      let nextTags: string[];
      if (hasTag) {
        nextTags = currentTags.filter((t) => t !== tag);
      } else {
        nextTags = currentTags.includes(tag) ? currentTags : [...currentTags, tag];
      }
      await updateDoc(responseRef, { tags: nextTags });
    }
  } catch (error) {
    console.error("Error toggling response tag:", error);
  }
}

// Reveal/Hide approved response on Presentation Screen
export async function revealResponse(
  eventCode: string,
  responseId: string,
  isRevealed: boolean
): Promise<void> {
  if (IS_MOCK) {
    const responses = getMockData<ResponseData[]>(`hive_responses_${eventCode}`, []);
    const idx = responses.findIndex((r) => r.id === responseId);
    if (idx !== -1) {
      responses[idx].isRevealed = isRevealed;
      responses[idx].revealedAt = isRevealed ? new Date().toISOString() : null;
      saveMockData(`hive_responses_${eventCode}`, responses);
      notifyMockListeners(`responses_${eventCode}`, responses);
      
      const revealed = responses.filter((r) => r.moderationStatus === "approved" && r.isRevealed);
      revealed.sort((a, b) => new Date(a.revealedAt || 0).getTime() - new Date(b.revealedAt || 0).getTime());
      notifyMockListeners(`revealed_responses_${eventCode}`, revealed);
    }
    return;
  }
  try {
    const responseRef = doc(db, "events", eventCode, "responses", responseId);
    await updateDoc(responseRef, {
      isRevealed,
      revealedAt: isRevealed ? serverTimestamp() : null
    });
  } catch (error) {
    console.error("Error toggling response reveal:", error);
  }
}

// Reveal/Hide participant identity on Presentation Screen
export async function revealResponseIdentity(
  eventCode: string,
  responseId: string,
  isIdentityRevealed: boolean
): Promise<void> {
  if (IS_MOCK) {
    const responses = getMockData<ResponseData[]>(`hive_responses_${eventCode}`, []);
    const idx = responses.findIndex((r) => r.id === responseId);
    if (idx !== -1) {
      responses[idx].isIdentityRevealed = isIdentityRevealed;
      saveMockData(`hive_responses_${eventCode}`, responses);
      notifyMockListeners(`responses_${eventCode}`, responses);
      
      const revealed = responses.filter((r) => r.moderationStatus === "approved" && r.isRevealed);
      revealed.sort((a, b) => new Date(a.revealedAt || 0).getTime() - new Date(b.revealedAt || 0).getTime());
      notifyMockListeners(`revealed_responses_${eventCode}`, revealed);
    }
    return;
  }
  try {
    const responseRef = doc(db, "events", eventCode, "responses", responseId);
    await updateDoc(responseRef, { isIdentityRevealed });
  } catch (error) {
    console.error("Error toggling identity reveal:", error);
  }
}

// Listen to revealed responses (for Presentation Screen)
export function listenToRevealedResponses(
  eventCode: string,
  callback: (responses: ResponseData[]) => void
) {
  if (IS_MOCK) {
    const responses = getMockData<ResponseData[]>(`hive_responses_${eventCode}`, []);
    const revealed = responses.filter((r) => r.moderationStatus === "approved" && r.isRevealed);
    revealed.sort((a, b) => new Date(a.revealedAt || 0).getTime() - new Date(b.revealedAt || 0).getTime());
    
    const key = `revealed_responses_${eventCode}`;
    if (!mockListeners[key]) mockListeners[key] = new Set();
    mockListeners[key].add(callback);
    
    callback(revealed);
    
    return () => {
      mockListeners[key].delete(callback);
    };
  }
  
  const responsesRef = collection(db, "events", eventCode, "responses");
  const q = query(
    responsesRef,
    where("moderationStatus", "==", "approved"),
    where("isRevealed", "==", true)
  );
  
  return onSnapshot(
    q,
    (snapshot) => {
      const responses: ResponseData[] = [];
      snapshot.forEach((docSnap) => {
        responses.push(docSnap.data() as ResponseData);
      });
      responses.sort((a, b) => {
        const timeA = a.revealedAt?.toMillis ? a.revealedAt.toMillis() : 0;
        const timeB = b.revealedAt?.toMillis ? b.revealedAt.toMillis() : 0;
        return timeA - timeB;
      });
      callback(responses);
    },
    (err) => {
      console.error("listenToRevealedResponses error:", err);
    }
  );
}
