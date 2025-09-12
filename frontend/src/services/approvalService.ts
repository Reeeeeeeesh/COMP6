/**
 * Approval Service - Comprehensive API service for approval workflow management
 * Handles workflows, decisions, comments, notifications, and analytics
 */

import { apiClient } from './apiClient';
import {
  ApprovalWorkflow,
  ApprovalTemplate,
  CreateApprovalWorkflowRequest,
  UpdateApprovalWorkflowRequest,
  SubmitApprovalDecisionRequest,
  AddApprovalCommentRequest,
  ApprovalWorkflowListResponse,
  ApprovalFilters,
  ApprovalNotification,
  ApprovalStatistics,
  ApprovalComment,
  ApprovalHistoryEntry,
  ApprovalStatus,
  ApprovalAction,
} from '../types/approvalTypes';

class ApprovalService {
  private baseUrl = '/api/approvals';
  private templatesUrl = '/api/approval-templates';
  private notificationsUrl = '/api/approval-notifications';

  // Workflow Management
  async getWorkflows(
    filters?: ApprovalFilters, 
    page = 1, 
    pageSize = 20
  ): Promise<ApprovalWorkflowListResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (filters) {
        if (filters.status?.length) params.append('status', filters.status.join(','));
        if (filters.priority?.length) params.append('priority', filters.priority.join(','));
        if (filters.planType?.length) params.append('planType', filters.planType.join(','));
        if (filters.submittedBy?.length) params.append('submittedBy', filters.submittedBy.join(','));
        if (filters.assignedToMe) params.append('assignedToMe', 'true');
        if (filters.dueWithinDays) params.append('dueWithinDays', filters.dueWithinDays.toString());
        if (filters.tags?.length) params.append('tags', filters.tags.join(','));
        if (filters.dateRange) {
          params.append('startDate', filters.dateRange.start);
          params.append('endDate', filters.dateRange.end);
        }
      }

      const response = await apiClient.get(`${this.baseUrl}?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching approval workflows:', error);
      throw new Error('Failed to fetch approval workflows');
    }
  }

  async getWorkflow(workflowId: string): Promise<ApprovalWorkflow> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${workflowId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching approval workflow:', error);
      throw new Error('Failed to fetch approval workflow details');
    }
  }

  async createWorkflow(request: CreateApprovalWorkflowRequest): Promise<ApprovalWorkflow> {
    try {
      const response = await apiClient.post(this.baseUrl, request);
      return response.data;
    } catch (error) {
      console.error('Error creating approval workflow:', error);
      throw new Error('Failed to create approval workflow');
    }
  }

  async updateWorkflow(
    workflowId: string, 
    updates: UpdateApprovalWorkflowRequest
  ): Promise<ApprovalWorkflow> {
    try {
      const response = await apiClient.put(`${this.baseUrl}/${workflowId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating approval workflow:', error);
      throw new Error('Failed to update approval workflow');
    }
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    try {
      await apiClient.delete(`${this.baseUrl}/${workflowId}`);
    } catch (error) {
      console.error('Error deleting approval workflow:', error);
      throw new Error('Failed to delete approval workflow');
    }
  }

  // Workflow Actions
  async submitForApproval(workflowId: string): Promise<ApprovalWorkflow> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${workflowId}/submit`);
      return response.data;
    } catch (error) {
      console.error('Error submitting workflow for approval:', error);
      throw new Error('Failed to submit workflow for approval');
    }
  }

  async cancelWorkflow(workflowId: string, reason: string): Promise<ApprovalWorkflow> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${workflowId}/cancel`, { reason });
      return response.data;
    } catch (error) {
      console.error('Error cancelling workflow:', error);
      throw new Error('Failed to cancel workflow');
    }
  }

  async withdrawWorkflow(workflowId: string, reason: string): Promise<ApprovalWorkflow> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${workflowId}/withdraw`, { reason });
      return response.data;
    } catch (error) {
      console.error('Error withdrawing workflow:', error);
      throw new Error('Failed to withdraw workflow');
    }
  }

  // Decision Management
  async submitDecision(
    workflowId: string, 
    decision: SubmitApprovalDecisionRequest
  ): Promise<ApprovalWorkflow> {
    try {
      const formData = new FormData();
      formData.append('stageId', decision.stageId);
      formData.append('decision', decision.decision);
      formData.append('comments', decision.comments);
      
      if (decision.reasoning) {
        formData.append('reasoning', decision.reasoning);
      }
      
      if (decision.conditions) {
        formData.append('conditions', JSON.stringify(decision.conditions));
      }
      
      if (decision.attachments) {
        decision.attachments.forEach((file, index) => {
          formData.append(`attachment_${index}`, file);
        });
      }

      const response = await apiClient.post(
        `${this.baseUrl}/${workflowId}/decisions`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error submitting decision:', error);
      throw new Error('Failed to submit decision');
    }
  }

  async delegateApproval(
    workflowId: string, 
    stageId: string, 
    delegateToUserId: string, 
    reason: string
  ): Promise<ApprovalWorkflow> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${workflowId}/delegate`, {
        stageId,
        delegateToUserId,
        reason,
      });
      return response.data;
    } catch (error) {
      console.error('Error delegating approval:', error);
      throw new Error('Failed to delegate approval');
    }
  }

  // Comment Management
  async getComments(workflowId: string): Promise<ApprovalComment[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${workflowId}/comments`);
      return response.data;
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw new Error('Failed to fetch comments');
    }
  }

  async addComment(
    workflowId: string, 
    comment: AddApprovalCommentRequest
  ): Promise<ApprovalComment> {
    try {
      const formData = new FormData();
      formData.append('content', comment.content);
      formData.append('type', comment.type);
      
      if (comment.stageId) formData.append('stageId', comment.stageId);
      if (comment.parentId) formData.append('parentId', comment.parentId);
      if (comment.mentionedUsers) {
        formData.append('mentionedUsers', JSON.stringify(comment.mentionedUsers));
      }
      if (comment.isPrivate !== undefined) {
        formData.append('isPrivate', comment.isPrivate.toString());
      }
      
      if (comment.attachments) {
        comment.attachments.forEach((file, index) => {
          formData.append(`attachment_${index}`, file);
        });
      }

      const response = await apiClient.post(
        `${this.baseUrl}/${workflowId}/comments`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw new Error('Failed to add comment');
    }
  }

  async updateComment(
    workflowId: string, 
    commentId: string, 
    content: string
  ): Promise<ApprovalComment> {
    try {
      const response = await apiClient.put(
        `${this.baseUrl}/${workflowId}/comments/${commentId}`,
        { content }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating comment:', error);
      throw new Error('Failed to update comment');
    }
  }

  async deleteComment(workflowId: string, commentId: string): Promise<void> {
    try {
      await apiClient.delete(`${this.baseUrl}/${workflowId}/comments/${commentId}`);
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw new Error('Failed to delete comment');
    }
  }

  async resolveComment(workflowId: string, commentId: string): Promise<ApprovalComment> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${workflowId}/comments/${commentId}/resolve`);
      return response.data;
    } catch (error) {
      console.error('Error resolving comment:', error);
      throw new Error('Failed to resolve comment');
    }
  }

  async addReaction(
    workflowId: string, 
    commentId: string, 
    reactionType: 'like' | 'agree' | 'disagree' | 'heart' | 'laugh' | 'concern'
  ): Promise<ApprovalComment> {
    try {
      const response = await apiClient.post(
        `${this.baseUrl}/${workflowId}/comments/${commentId}/reactions`,
        { type: reactionType }
      );
      return response.data;
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw new Error('Failed to add reaction');
    }
  }

  // History and Audit Trail
  async getWorkflowHistory(workflowId: string): Promise<ApprovalHistoryEntry[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${workflowId}/history`);
      return response.data;
    } catch (error) {
      console.error('Error fetching workflow history:', error);
      throw new Error('Failed to fetch workflow history');
    }
  }

  // Template Management
  async getTemplates(): Promise<ApprovalTemplate[]> {
    try {
      const response = await apiClient.get(this.templatesUrl);
      return response.data;
    } catch (error) {
      console.error('Error fetching approval templates:', error);
      throw new Error('Failed to fetch approval templates');
    }
  }

  async getTemplate(templateId: string): Promise<ApprovalTemplate> {
    try {
      const response = await apiClient.get(`${this.templatesUrl}/${templateId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching approval template:', error);
      throw new Error('Failed to fetch approval template details');
    }
  }

  // Notification Management
  async getNotifications(userId?: string): Promise<ApprovalNotification[]> {
    try {
      const params = userId ? `?userId=${userId}` : '';
      const response = await apiClient.get(`${this.notificationsUrl}${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw new Error('Failed to fetch notifications');
    }
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    try {
      await apiClient.post(`${this.notificationsUrl}/${notificationId}/read`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }

  async getMyPendingApprovals(): Promise<ApprovalWorkflow[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/my-pending`);
      return response.data;
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      throw new Error('Failed to fetch pending approvals');
    }
  }

  // Statistics and Analytics
  async getStatistics(userId?: string): Promise<ApprovalStatistics> {
    try {
      const params = userId ? `?userId=${userId}` : '';
      const response = await apiClient.get(`${this.baseUrl}/statistics${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching approval statistics:', error);
      throw new Error('Failed to fetch approval statistics');
    }
  }

  async getWorkflowsByStatus(status: ApprovalStatus): Promise<ApprovalWorkflow[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}?status=${status}`);
      return response.data.workflows;
    } catch (error) {
      console.error('Error fetching workflows by status:', error);
      throw new Error('Failed to fetch workflows by status');
    }
  }

  // Bulk Operations
  async bulkApprove(workflowIds: string[], comments?: string): Promise<void> {
    try {
      await apiClient.post(`${this.baseUrl}/bulk/approve`, {
        workflowIds,
        comments,
      });
    } catch (error) {
      console.error('Error bulk approving workflows:', error);
      throw new Error('Failed to bulk approve workflows');
    }
  }

  async bulkReject(workflowIds: string[], reason: string): Promise<void> {
    try {
      await apiClient.post(`${this.baseUrl}/bulk/reject`, {
        workflowIds,
        reason,
      });
    } catch (error) {
      console.error('Error bulk rejecting workflows:', error);
      throw new Error('Failed to bulk reject workflows');
    }
  }

  async bulkCancel(workflowIds: string[], reason: string): Promise<void> {
    try {
      await apiClient.post(`${this.baseUrl}/bulk/cancel`, {
        workflowIds,
        reason,
      });
    } catch (error) {
      console.error('Error bulk cancelling workflows:', error);
      throw new Error('Failed to bulk cancel workflows');
    }
  }

  // Search and Discovery
  async searchWorkflows(query: string, filters?: Partial<ApprovalFilters>): Promise<ApprovalWorkflow[]> {
    try {
      const params = new URLSearchParams({ search: query });
      
      if (filters) {
        if (filters.status?.length) params.append('status', filters.status.join(','));
        if (filters.priority?.length) params.append('priority', filters.priority.join(','));
        if (filters.planType?.length) params.append('planType', filters.planType.join(','));
      }

      const response = await apiClient.get(`${this.baseUrl}/search?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error searching workflows:', error);
      throw new Error('Failed to search workflows');
    }
  }

  // Export and Reporting
  async exportWorkflowData(workflowId: string, format: 'pdf' | 'excel'): Promise<Blob> {
    try {
      const response = await apiClient.get(
        `${this.baseUrl}/${workflowId}/export?format=${format}`,
        { responseType: 'blob' }
      );
      return response.data;
    } catch (error) {
      console.error('Error exporting workflow data:', error);
      throw new Error('Failed to export workflow data');
    }
  }

  async generateApprovalReport(
    filters?: ApprovalFilters, 
    format: 'pdf' | 'excel' = 'excel'
  ): Promise<Blob> {
    try {
      const params = new URLSearchParams({ format });
      
      if (filters) {
        if (filters.status?.length) params.append('status', filters.status.join(','));
        if (filters.dateRange) {
          params.append('startDate', filters.dateRange.start);
          params.append('endDate', filters.dateRange.end);
        }
      }

      const response = await apiClient.get(
        `${this.baseUrl}/reports?${params}`,
        { responseType: 'blob' }
      );
      return response.data;
    } catch (error) {
      console.error('Error generating approval report:', error);
      throw new Error('Failed to generate approval report');
    }
  }

  // Real-time Updates
  async subscribeToWorkflowUpdates(
    workflowId: string, 
    callback: (update: any) => void
  ): Promise<() => void> {
    // Implementation would depend on WebSocket or Server-Sent Events setup
    // For now, return a mock unsubscribe function
    console.log(`Subscribing to updates for workflow ${workflowId}`);
    
    return () => {
      console.log(`Unsubscribed from workflow ${workflowId} updates`);
    };
  }
}

export const approvalService = new ApprovalService();