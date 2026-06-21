export type UserResponse = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  backgroundUrl: string | null;
  isActive: boolean;
  isVerified: boolean;
  verifiedAt: string | null;
  bannedUntil: string | null;
  lastSignInAt: string | null;
  appMetadata: Record<string, unknown>;
  userMetadata: Record<string, unknown>;
  roles: string[];
  acceptedTerms?: boolean;
  acceptedTermsAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProgramResponse = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  courses: CourseResponse[];
  createdAt: string;
  updatedAt: string;
};

export type CourseResponse = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  level: string | null;
  thumbnailUrl: string | null;
  category: string | null;
  appleProductId: string | null;
  androidProductId: string | null;
  programId: string;
  programCode: string | null;
  orderIndex: number;
  tags: string[];
  syllabusSections: SyllabusSectionResponse[];
  courseRuns: CourseRunResponse[];
  createdAt: string;
  updatedAt: string;
};

export type CourseRunResponse = {
  id: string;
  courseId: string;
  code: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string | null;
  metadata: Record<string, unknown>;
  enrollmentStartDate: string | null;
  enrollmentEndDate: string | null;
  capacity: number | null;
  courseSessions: SessionResponse[];
  sessions?: SessionResponse[];
  createdAt: string;
  updatedAt: string;
};

export type SyllabusSectionResponse = {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  description: string | null;
  orderIndex: number;
  items: SyllabusItemResponse[];
  createdAt: string;
  updatedAt: string;
};

export type SyllabusItemResponse = {
  id: string;
  syllabusSectionId: string;
  syllabusSectionTitle: string;
  type: string;
  title: string;
  description: string | null;
  orderIndex: number;
  isHidden: boolean;
  isOptional: boolean;
  contentData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type SessionResponse = {
  id: string;
  courseRunId: string;
  courseRunCode: string;
  title: string;
  description: string | null;
  sessionNumber: number;
  orderIndex: number;
  scheduledAt: string | null;
  durationMinutes: number | null;
  meetingRoomId: string | null;
  status: string;
  recordingUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EnrollmentResponse = {
  id: string;
  userId: string;
  userDisplayName: string | null;
  userEmail: string | null;
  userAvatarUrl: string | null;
  courseRunId: string;
  courseRunCode: string | null;
  status: string;
  role: string | null;
  enrolmentMethod: string | null;
  lastAccessedAt: string | null;
  enrolledAt: string | null;
  completedAt: string | null;
  progressPercent?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type EnrollmentImportResponse = {
  totalRows: number;
  successCount: number;
  skippedCount: number;
  failedCount: number;
  failures: Array<{
    rowNumber: number;
    email: string | null;
    orderNo: string | null;
    amount: number | null;
    reason: string;
  }>;
};

export type EventResponse = {
  id: string;
  title: string;
  description: string | null;
  content?: string;
  metadata?: Record<string, unknown>;
  thumbnailUrl: string | null;
  liveLink: string | null;
  startTime: string;
  endTime: string;
  status: string;
  roomCode: string | null;
  sessionType: string | null;
  isOngoing: boolean;
  isOfficial: boolean;
  author: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  engagementStats: {
    likes: number;
    interested: number;
    comments?: number;
  };
  currentUser: {
    isLiked: boolean;
    isInterested: boolean;
  } | null;
  createdAt: string;
};

export type AuditLogResponse = {
  id: string;
  actorUserId: string | null;
  actorType: string | null;
  actorDisplay: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  requestId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type AssetResponse = {
  url: string;
  publicId: string;
};

export type ProgramUpsertRequest = {
  code: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  isPublished?: boolean;
  publishedAt?: string | null;
};

export type CourseUpsertRequest = {
  code: string;
  title: string;
  description?: string | null;
  level?: string | null;
  thumbnailUrl?: string | null;
  category?: string | null;
  appleProductId?: string | null;
  androidProductId?: string | null;
  programId: string;
  orderIndex: number;
  tags?: string[];
};

export type CourseRunUpsertRequest = {
  courseId: string;
  code: string;
  status: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  metadata?: Record<string, unknown>;
  enrollmentStartDate?: string | null;
  enrollmentEndDate?: string | null;
  capacity?: number | null;
};

export type SyllabusSectionUpsertRequest = {
  courseId: string;
  title: string;
  description?: string | null;
  orderIndex: number;
};

export type SyllabusItemUpsertRequest = {
  syllabusSectionId: string;
  type: string;
  title: string;
  description?: string | null;
  orderIndex: number;
  isHidden?: boolean;
  isOptional?: boolean;
  contentData?: Record<string, unknown>;
};

export type SessionUpsertRequest = {
  courseRunId: string;
  title: string;
  description?: string | null;
  sessionNumber: number;
  orderIndex: number;
  scheduledAt?: string | null;
  durationMinutes?: number | null;
  meetingRoomId?: string | null;
  status?: string;
};

export type ManualEnrollmentRequest = {
  userId: string;
  courseRunId: string;
};

export type EnrollmentUpdateRequest = {
  status?: 'ACTIVE' | 'SUSPENDED';
  role?: 'STUDENT' | 'LECTURE' | 'ADMIN' | 'NO_ROLE';
  enrolmentMethod?: string;
  lastAccessedAt?: string;
  completedAt?: string;
};

export type CreateEventRequest = {
  title: string;
  description?: string;
  content?: string;
  thumbnailUrl?: string;
  liveLink?: string;
  startTime: string;
  endTime: string;
  programId?: string;
  metadata?: Record<string, unknown>;
  publishImmediately?: boolean;
  isOfficial?: boolean;
};

export type UpdateEventRequest = CreateEventRequest;

export type AdminCreateUserRequest = {
  email: string;
  displayName: string;
  passwordHash: string;
  roles?: string[];
  verified?: boolean;
};

export type AdminUpdateUserStatusRequest = {
  isActive: boolean;
};

export type AdminBanUserRequest = {
  bannedUntil: string | null;
};

export type AdminUpdateUserRolesRequest = {
  roles: string[];
};

export type CommentResponse = {
  id: string;
  content: string;
  level: number;
  userId: string;
  userDisplayName: string;
  userAvatarUrl: string | null;
  likesCount: number;
  repliesCount: number;
  isLikedByCurrentUser: boolean | null;
  createdAt: string;
  updatedAt: string;
  replies?: CommentResponse[];
  canEdit?: boolean;
  canDelete?: boolean;
};

export type AdminPaymentOrderResponse = {
  orderId: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  paymentUrl: string | null;
  qrCode: string | null;
  courseRunId: string;
  courseRunCode: string;
  expiresAt: string;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  enrollmentActive: boolean | null;
  enrollmentFailureCode: string | null;
  enrollmentFailureMessage: string | null;
  enrollmentRetryCount: number;
};

export type PaymentOrderResponse = {
  orderId: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  paymentUrl: string | null;
  qrCode: string | null;
  courseRunId: string;
  courseRunCode: string;
  expiresAt: string;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  enrollmentActive: boolean | null;
  enrollmentFailureCode: string | null;
  enrollmentFailureMessage: string | null;
  enrollmentRetryCount: number;
};

export type UgcReportResponse = {
  id: string;
  reporterId: string;
  reporterDisplayName: string;
  reporterEmail: string;
  targetUserId: string;
  targetUserDisplayName: string;
  targetContentId: string;
  targetContentType: string;
  reason: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  updatedAt: string;
};

export type CourseIapMappingRequest = {
  appleProductId?: string | null;
  androidProductId?: string | null;
};

export type LiveSessionResponse = {
  id: string;
  roomCode: string;
  type: string;
  status: string;
  ownerId: string;
  eventId: string | null;
  programId: string | null;
  courseId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationResponse = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  type: string;
  conversationId: string | null;
  payload: string | null;
  createdAt: string;
};

export type CourseRunProgressSummaryResponse = {
  courseRunId: string;
  enrollmentId: string;
  totalSyllabusItems: number;
  completedSyllabusItems: number;
  syllabusProgressPercent: number | null;
  totalSessions: number;
  attendedSessions: number;
  sessionProgressPercent: number | null;
  lastUpdatedAt: string | null;
};

export type SyllabusProgressResponse = {
  syllabusItemId: string;
  syllabusItemTitle: string;
  status: string;
  progressPercent: number | null;
  lastAccessedAt: string | null;
  completedAt: string | null;
};

export type SessionAttendanceResponse = {
  sessionId: string;
  sessionTitle: string;
  sessionNumber: number;
  scheduledAt: string | null;
  status: string;
  attendedAt: string | null;
};

export type StreakSummaryResponse = {
  currentStreak: number;
  longestStreak: number;
  freezeCount: number;
  maxFreezeCount: number;
  nextFreezeInDays: number;
  lastActiveDate: string | null;
  recentLogs: StreakLogResponse[];
};

export type StreakLogResponse = {
  id: string;
  activityDate: string;
  status: string;
  sourceAction: string | null;
  recordedAt?: string;
};

export type RelationshipResponse = {
  id: string;
  status: string;
  requestedAt: string;
  respondedAt: string | null;
  requester: { userId: string; displayName: string; avatarUrl: string | null };
  addressee: { userId: string; displayName: string; avatarUrl: string | null };
};

export type ConversationResponse = {
  id: string;
  mode: string;
  courseRunId: string | null;
  groupName: string | null;
  createdBy: string | null;
  status: string;
  participants: Array<{
    userId: string;
    displayName: string;
    status: string;
  }>;
};

export type ChatMessageResponse = {
  id: string;
  conversationId: string;
  senderId: string;
  senderUsername: string | null;
  text: string | null;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean | null;
};

export type SyllabusItemFileAttachmentResponse = {
  provider: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  publicId: string;
  resourceType: string;
};

export type SyllabusItemFileUploadResponse = {
  syllabusItemId: string;
  attachment: SyllabusItemFileAttachmentResponse;
};

export type MeetingTokenResponse = {
  token: string;
  roomCode: string;
};

export type PresignedUploadResponse = {
  uploadUrl: string;
  downloadUrl: string;
  publicId: string;
};
