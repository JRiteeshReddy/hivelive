  export interface ParticipantIdentifierConfig {
  label: string;
  placeholder: string;
  type: "text" | "number";
}

export interface EventData {
  eventCode: string;
  adminKey: string;
  createdAt: any; // Timestamp
  status: "active" | "completed";
  participantIdentifierConfig: ParticipantIdentifierConfig;
  activeQuestionId: string | null;
  activeQuestionStatus: "waiting" | "launched" | "paused" | "ended" | "hidden";
  activityStarted?: boolean;
}

export interface QuestionData {
  id: string;
  text: string;
  type: "open_response";
  order: number;
  createdAt: any; // Timestamp
  status: "draft" | "active" | "completed";
}

export interface ParticipantData {
  id: string;
  identifier: string;
  joinedAt: any; // Timestamp
  lastSeenAt: any; // Timestamp
  isOnline: boolean;
}

export interface ResponseData {
  id: string; // questionId_participantId
  questionId: string;
  participantId: string;
  participantIdentifier: string;
  answer: string;
  submittedAt: any; // Timestamp
  moderationStatus: "pending" | "approved" | "rejected";
  isStarred: boolean;
  tags: string[]; // "funny" | "creative" | "wild"
  isRevealed: boolean;
  isIdentityRevealed: boolean;
  revealedAt: any; // Timestamp
}
