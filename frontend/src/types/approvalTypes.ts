/**
 * Approval Workflow Types - Comprehensive type definitions for plan approval processes
 * Supports multi-step approvals, role-based routing, comments, and audit trails
 */

export type ApprovalStatus = 'draft' | 'pending' | 'in_review' | 'approved' | 'rejected' | 'cancelled';
export type ApprovalAction = 'submit' | 'approve' | 'reject' | 'request_changes' | 'delegate' | 'cancel';
export type ApprovalPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationType = 'email' | 'in_app' | 'sms';

export interface ApprovalWorkflow {
  id: string;
  name: string;
  description: string;
  planId: string;
  planName: string;
  planType: string;
  
  // Status and Progress
  status: ApprovalStatus;
  currentStage: number;
  totalStages: number;
  priority: ApprovalPriority;
  
  // Timing
  submittedAt: string;
  dueDate?: string;
  completedAt?: string;
  
  // Participants
  submittedBy: string;
  submitterName: string;
  submitterEmail: string;
  
  // Workflow Configuration
  stages: ApprovalStage[];
  comments: ApprovalComment[];
  history: ApprovalHistoryEntry[];
  
  // Metadata
  tags: string[];
  category: string;
  businessJustification?: string;
  impactAssessment?: string;
  
  // System
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface ApprovalStage {
  id: string;
  name: string;
  description: string;
  order: number;
  
  // Status
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  
  // Configuration
  requiredApprovals: number;
  parallelApprovals: boolean;
  skipIfPreviousApproved: boolean;
  autoApproveAfterDays?: number;
  
  // Participants
  approvers: ApprovalParticipant[];
  reviewers: ApprovalParticipant[];
  observers: ApprovalParticipant[];
  
  // Timing
  startedAt?: string;
  completedAt?: string;
  dueDate?: string;
  
  // Decision
  decisions: ApprovalDecision[];
  
  // Metadata
  instructions?: string;
  documents?: ApprovalDocument[];
}

export interface ApprovalParticipant {
  userId: string;
  userEmail: string;
  userName: string;
  userRole: string;
  
  // Status
  status: 'pending' | 'notified' | 'viewed' | 'responded';
  
  // Response
  decision?: 'approve' | 'reject' | 'abstain' | 'delegate';
  comments?: string;
  respondedAt?: string;
  
  // Delegation
  delegatedTo?: string;
  delegatedAt?: string;
  delegationReason?: string;
  
  // Notifications
  lastNotifiedAt?: string;
  notificationsSent: number;
  preferredNotificationType: NotificationType;
}

export interface ApprovalDecision {
  id: string;
  participantId: string;
  participantName: string;
  
  // Decision Details
  decision: 'approve' | 'reject' | 'request_changes' | 'delegate';
  comments: string;
  reasoning?: string;
  conditions?: string[];
  
  // Timing
  decidedAt: string;
  
  // Metadata
  ipAddress?: string;
  deviceInfo?: string;
}

export interface ApprovalComment {
  id: string;
  parentId?: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  
  // Content
  content: string;
  type: 'general' | 'question' | 'suggestion' | 'concern' | 'system';
  
  // Targeting
  stageId?: string;
  mentionedUsers?: string[];
  isPrivate: boolean;
  
  // Attachments
  attachments: ApprovalDocument[];
  
  // Status
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  
  // Metadata
  createdAt: string;
  updatedAt?: string;
  
  // Reactions
  reactions: ApprovalReaction[];
}

export interface ApprovalReaction {
  type: 'like' | 'agree' | 'disagree' | 'heart' | 'laugh' | 'concern';
  userId: string;
  userName: string;
  createdAt: string;
}

export interface ApprovalHistoryEntry {
  id: string;
  action: ApprovalAction;
  actionBy: string;
  actionByName: string;
  
  // Details
  fromStatus?: ApprovalStatus;
  toStatus: ApprovalStatus;
  stageId?: string;
  stageName?: string;
  
  // Context
  reason?: string;
  comments?: string;
  metadata?: Record<string, any>;
  
  // Timing
  timestamp: string;
  
  // System Info
  ipAddress?: string;
  userAgent?: string;
}

export interface ApprovalDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  
  // Metadata
  uploadedBy: string;
  uploadedAt: string;
  description?: string;
  
  // Access
  isPublic: boolean;
  allowedRoles: string[];
}

export interface ApprovalTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  
  // Configuration
  stages: ApprovalStageTemplate[];
  
  // Rules
  applicableToPlans: string[];
  requiredFields: string[];
  
  // Metadata
  createdBy: string;
  createdAt: string;
  isActive: boolean;
  usageCount: number;
}

export interface ApprovalStageTemplate {
  name: string;
  description: string;
  order: number;
  requiredApprovals: number;
  parallelApprovals: boolean;
  approverRoles: string[];
  reviewerRoles: string[];
  autoApproveAfterDays?: number;
  instructions?: string;
}

// API Request/Response Types
export interface CreateApprovalWorkflowRequest {
  planId: string;
  templateId?: string;
  priority: ApprovalPriority;
  dueDate?: string;
  businessJustification?: string;
  impactAssessment?: string;
  customStages?: ApprovalStageTemplate[];
  tags?: string[];
}

export interface UpdateApprovalWorkflowRequest {
  priority?: ApprovalPriority;
  dueDate?: string;
  businessJustification?: string;
  impactAssessment?: string;
  tags?: string[];
}

export interface SubmitApprovalDecisionRequest {
  stageId: string;
  decision: 'approve' | 'reject' | 'request_changes';
  comments: string;
  reasoning?: string;
  conditions?: string[];
  attachments?: File[];
}

export interface AddApprovalCommentRequest {
  content: string;
  type: 'general' | 'question' | 'suggestion' | 'concern';
  stageId?: string;
  parentId?: string;
  mentionedUsers?: string[];
  isPrivate?: boolean;
  attachments?: File[];
}

export interface ApprovalWorkflowListResponse {
  workflows: ApprovalWorkflow[];
  total: number;
  page: number;
  pageSize: number;
  filters?: ApprovalFilters;
}

export interface ApprovalFilters {
  status?: ApprovalStatus[];
  priority?: ApprovalPriority[];
  planType?: string[];
  submittedBy?: string[];
  assignedToMe?: boolean;
  dueWithinDays?: number;
  tags?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface ApprovalNotification {
  id: string;
  type: 'approval_requested' | 'decision_made' | 'comment_added' | 'workflow_completed' | 'deadline_reminder';
  workflowId: string;
  workflowName: string;
  
  // Recipients
  recipientId: string;
  recipientEmail: string;
  
  // Content
  title: string;
  message: string;
  actionRequired: boolean;
  actionUrl?: string;
  
  // Status
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  sentAt?: string;
  readAt?: string;
  
  // Metadata
  createdAt: string;
  priority: ApprovalPriority;
}

// UI State Types
export interface ApprovalWorkflowState {
  currentWorkflow: ApprovalWorkflow | null;
  workflows: ApprovalWorkflow[];
  loading: boolean;
  error: string | null;
  filters: ApprovalFilters;
  selectedWorkflows: string[];
  
  // UI States
  showComments: boolean;
  showHistory: boolean;
  activeStage: number;
  expandedComments: Set<string>;
}

// Statistics and Analytics
export interface ApprovalStatistics {
  totalWorkflows: number;
  pendingApprovals: number;
  myPendingApprovals: number;
  approvedToday: number;
  averageApprovalTime: number;
  
  // By Status
  statusBreakdown: Record<ApprovalStatus, number>;
  
  // By Priority
  priorityBreakdown: Record<ApprovalPriority, number>;
  
  // Performance Metrics
  onTimeApprovals: number;
  overdue: number;
  escalations: number;
  
  // Trends (last 30 days)
  approvalTrends: Array<{
    date: string;
    submitted: number;
    approved: number;
    rejected: number;
  }>;
}