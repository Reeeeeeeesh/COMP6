/**
 * Approval Workflow Viewer - Detailed interface for reviewing and acting on approval workflows
 * Features stage progression, decision making, comment threads, and collaboration tools
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Grid,
  Stack,
  Chip,
  Button,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Avatar,
  AvatarGroup,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  Tooltip,
  Badge,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Snackbar,
} from '@mui/material';
// Timeline components live in @mui/lab, not @mui/material
// Removed dependency on @mui/lab to avoid requiring extra package in dev
import {
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Schedule as PendingIcon,
  Assignment as InReviewIcon,
  Person as PersonIcon,
  Comment as CommentIcon,
  History as HistoryIcon,
  Attachment as AttachmentIcon,
  Send as SendIcon,
  Reply as ReplyIcon,
  ExpandMore as ExpandIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Flag as PriorityIcon,
  AccessTime as TimeIcon,
  Group as GroupIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  AddReaction as ReactionIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Share as ShareIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';

import { useUser } from '../../contexts/UserContext';
import { approvalService } from '../../services/approvalService';
import {
  ApprovalWorkflow,
  ApprovalStage,
  ApprovalComment,
  ApprovalHistoryEntry,
  ApprovalDecision,
  SubmitApprovalDecisionRequest,
  AddApprovalCommentRequest,
} from '../../types/approvalTypes';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`workflow-tabpanel-${index}`}
      aria-labelledby={`workflow-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export const ApprovalWorkflowViewer: React.FC = () => {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const { user } = useUser();

  // State Management
  const [workflow, setWorkflow] = useState<ApprovalWorkflow | null>(null);
  const [comments, setComments] = useState<ApprovalComment[]>([]);
  const [history, setHistory] = useState<ApprovalHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  
  // Decision Making
  const [showDecisionDialog, setShowDecisionDialog] = useState(false);
  const [selectedStage, setSelectedStage] = useState<ApprovalStage | null>(null);
  const [decisionType, setDecisionType] = useState<'approve' | 'reject' | 'request_changes'>('approve');
  const [decisionComments, setDecisionComments] = useState('');
  const [decisionReasoning, setDecisionReasoning] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);
  
  // Comments
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<'general' | 'question' | 'suggestion' | 'concern'>('general');
  const [replyToComment, setReplyToComment] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  
  // UI State
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  } | null>(null);

  // Load workflow data
  useEffect(() => {
    if (workflowId) {
      loadWorkflowData();
    }
  }, [workflowId]);

  const loadWorkflowData = async () => {
    if (!workflowId) return;
    
    try {
      setLoading(true);
      setError(null);

      // Load workflow details
      const workflowData = await approvalService.getWorkflow(workflowId);
      setWorkflow(workflowData);

      // Load comments
      const commentsData = await approvalService.getComments(workflowId);
      setComments(commentsData);

      // Load history
      const historyData = await approvalService.getWorkflowHistory(workflowId);
      setHistory(historyData);
    } catch (err) {
      setError(`Failed to load workflow: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDecision = async () => {
    if (!workflow || !selectedStage || !user) return;

    try {
      setSubmittingDecision(true);
      
      const decisionRequest: SubmitApprovalDecisionRequest = {
        stageId: selectedStage.id,
        decision: decisionType,
        comments: decisionComments,
        reasoning: decisionReasoning || undefined,
      };

      const updatedWorkflow = await approvalService.submitDecision(workflow.id, decisionRequest);
      setWorkflow(updatedWorkflow);
      
      setNotification({
        message: `Decision submitted successfully: ${decisionType}`,
        type: 'success',
      });
      
      setShowDecisionDialog(false);
      setDecisionComments('');
      setDecisionReasoning('');
      
      // Reload data to get updated state
      await loadWorkflowData();
    } catch (err) {
      setNotification({
        message: `Failed to submit decision: ${err}`,
        type: 'error',
      });
    } finally {
      setSubmittingDecision(false);
    }
  };

  const handleAddComment = async () => {
    if (!workflow || !newComment.trim()) return;

    try {
      setSubmittingComment(true);
      
      const commentRequest: AddApprovalCommentRequest = {
        content: newComment,
        type: commentType,
        parentId: replyToComment || undefined,
      };

      const newCommentData = await approvalService.addComment(workflow.id, commentRequest);
      setComments(prev => [...prev, newCommentData]);
      
      setNewComment('');
      setCommentType('general');
      setReplyToComment(null);
      
      setNotification({
        message: 'Comment added successfully',
        type: 'success',
      });
    } catch (err) {
      setNotification({
        message: `Failed to add comment: ${err}`,
        type: 'error',
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReaction = async (commentId: string, reactionType: 'like' | 'agree' | 'disagree') => {
    if (!workflow) return;
    
    try {
      const updatedComment = await approvalService.addReaction(workflow.id, commentId, reactionType);
      setComments(prev => 
        prev.map(comment => comment.id === commentId ? updatedComment : comment)
      );
    } catch (err) {
      setNotification({
        message: `Failed to add reaction: ${err}`,
        type: 'error',
      });
    }
  };

  const canUserApprove = (stage: ApprovalStage) => {
    if (!user) return false;
    return stage.approvers.some(approver => 
      approver.userId === user.id && approver.status === 'pending'
    );
  };

  const getStageStatus = (stage: ApprovalStage) => {
    if (stage.status === 'completed') return 'completed';
    if (stage.status === 'in_progress') return 'active';
    return 'pending';
  };

  const getStageIcon = (stage: ApprovalStage) => {
    switch (stage.status) {
      case 'completed': return <ApprovedIcon color="success" />;
      case 'in_progress': return <InReviewIcon color="primary" />;
      default: return <PendingIcon color="disabled" />;
    }
  };

  const getCommentTypeColor = (type: string) => {
    switch (type) {
      case 'question': return 'info';
      case 'suggestion': return 'success';
      case 'concern': return 'warning';
      default: return 'default';
    }
  };

  const organizedComments = useMemo(() => {
    const rootComments = comments.filter(comment => !comment.parentId);
    const commentMap = new Map(comments.map(comment => [comment.id, comment]));
    
    return rootComments.map(comment => ({
      ...comment,
      replies: comments.filter(reply => reply.parentId === comment.id),
    }));
  }, [comments]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography>Loading workflow details...</Typography>
      </Box>
    );
  }

  if (error || !workflow) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || 'Workflow not found'}</Alert>
        <Button onClick={() => navigate('/approvals')} sx={{ mt: 2 }}>
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="h4" gutterBottom>
              {workflow.planName}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={2} mb={1}>
              <Chip
                label={workflow.status}
                color={workflow.status === 'approved' ? 'success' : 
                       workflow.status === 'rejected' ? 'error' : 'primary'}
              />
              <Chip
                icon={<PriorityIcon />}
                label={workflow.priority}
                variant="outlined"
              />
              <Typography variant="body2" color="text.secondary">
                Stage {workflow.currentStage} of {workflow.totalStages}
              </Typography>
            </Stack>
          </Box>
          
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<DownloadIcon />}>
              Export
            </Button>
            <Button variant="outlined" startIcon={<ShareIcon />}>
              Share
            </Button>
            <Button variant="outlined" startIcon={<PrintIcon />}>
              Print
            </Button>
          </Stack>
        </Stack>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                <strong>Submitted by:</strong> {workflow.submitterName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Submitted:</strong> {new Date(workflow.submittedAt).toLocaleString()}
              </Typography>
              {workflow.dueDate && (
                <Typography variant="body2" color="text.secondary">
                  <strong>Due:</strong> {new Date(workflow.dueDate).toLocaleString()}
                </Typography>
              )}
            </Stack>
          </Grid>
          
          <Grid item xs={12} md={6}>
            {workflow.businessJustification && (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Business Justification:</strong>
                </Typography>
                <Typography variant="body2">
                  {workflow.businessJustification}
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab 
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <span>Workflow Stages</span>
                <Badge badgeContent={workflow.stages.length} color="primary" />
              </Stack>
            } 
          />
          <Tab 
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <span>Comments</span>
                <Badge badgeContent={comments.length} color="info" />
              </Stack>
            } 
          />
          <Tab 
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <span>History</span>
                <Badge badgeContent={history.length} color="secondary" />
              </Stack>
            } 
          />
        </Tabs>
      </Paper>

      {/* Workflow Stages */}
      <TabPanel value={activeTab} index={0}>
        <Stepper orientation="vertical">
          {workflow.stages.map((stage, index) => (
            <Step key={stage.id} active={getStageStatus(stage) === 'active'} completed={stage.status === 'completed'}>
              <StepLabel icon={getStageIcon(stage)}>
                <Typography variant="h6">{stage.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {stage.description}
                </Typography>
              </StepLabel>
              
              <StepContent>
                <Card sx={{ mt: 2 }}>
                  <CardContent>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Approvers ({stage.decisions.length}/{stage.requiredApprovals})
                        </Typography>
                        <List dense>
                          {stage.approvers.map((approver) => {
                            const decision = stage.decisions.find(d => d.participantId === approver.userId);
                            return (
                              <ListItem key={approver.userId}>
                                <ListItemAvatar>
                                  <Avatar sx={{ width: 32, height: 32 }}>
                                    {approver.userName.charAt(0)}
                                  </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                  primary={approver.userName}
                                  secondary={`${approver.userRole} • ${approver.status}`}
                                />
                                <ListItemSecondaryAction>
                                  {decision ? (
                                    <Chip
                                      label={decision.decision}
                                      color={decision.decision === 'approve' ? 'success' : 'error'}
                                      size="small"
                                    />
                                  ) : (
                                    <Chip label="Pending" color="default" size="small" />
                                  )}
                                </ListItemSecondaryAction>
                              </ListItem>
                            );
                          })}
                        </List>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        {stage.instructions && (
                          <Box mb={2}>
                            <Typography variant="subtitle2" gutterBottom>
                              Instructions
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {stage.instructions}
                            </Typography>
                          </Box>
                        )}
                        
                        {stage.startedAt && (
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            <strong>Started:</strong> {new Date(stage.startedAt).toLocaleString()}
                          </Typography>
                        )}
                        
                        {stage.dueDate && (
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            <strong>Due:</strong> {new Date(stage.dueDate).toLocaleString()}
                          </Typography>
                        )}
                      </Grid>
                    </Grid>
                    
                    {/* Decisions */}
                    {stage.decisions.length > 0 && (
                      <Box mt={2}>
                        <Typography variant="subtitle2" gutterBottom>
                          Decisions
                        </Typography>
                        <Stack spacing={1}>
                          {stage.decisions.map((decision) => (
                            <Card key={decision.id} variant="outlined">
                              <CardContent sx={{ py: 1 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Stack direction="row" alignItems="center" spacing={2}>
                                    <Avatar sx={{ width: 32, height: 32 }}>
                                      {decision.participantName.charAt(0)}
                                    </Avatar>
                                    <Box>
                                      <Typography variant="body2">
                                        {decision.participantName}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {new Date(decision.decidedAt).toLocaleString()}
                                      </Typography>
                                    </Box>
                                  </Stack>
                                  <Chip
                                    label={decision.decision}
                                    color={decision.decision === 'approve' ? 'success' : 'error'}
                                    size="small"
                                  />
                                </Stack>
                                {decision.comments && (
                                  <Typography variant="body2" sx={{ mt: 1, ml: 6 }}>
                                    {decision.comments}
                                  </Typography>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </CardContent>
                  
                  {canUserApprove(stage) && (
                    <CardActions>
                      <Button
                        variant="contained"
                        color="success"
                        onClick={() => {
                          setSelectedStage(stage);
                          setDecisionType('approve');
                          setShowDecisionDialog(true);
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        onClick={() => {
                          setSelectedStage(stage);
                          setDecisionType('reject');
                          setShowDecisionDialog(true);
                        }}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          setSelectedStage(stage);
                          setDecisionType('request_changes');
                          setShowDecisionDialog(true);
                        }}
                      >
                        Request Changes
                      </Button>
                    </CardActions>
                  )}
                </Card>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </TabPanel>

      {/* Comments */}
      <TabPanel value={activeTab} index={1}>
        {/* Add Comment */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Add Comment
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Comment Type</InputLabel>
                <Select
                  value={commentType}
                  onChange={(e) => setCommentType(e.target.value as any)}
                  label="Comment Type"
                >
                  <MenuItem value="general">General</MenuItem>
                  <MenuItem value="question">Question</MenuItem>
                  <MenuItem value="suggestion">Suggestion</MenuItem>
                  <MenuItem value="concern">Concern</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={9}>
              <Stack direction="row" spacing={1}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Add your comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  size="small"
                />
                <Button
                  variant="contained"
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || submittingComment}
                  startIcon={<SendIcon />}
                >
                  {submittingComment ? 'Sending...' : 'Send'}
                </Button>
              </Stack>
            </Grid>
          </Grid>
          
          {replyToComment && (
            <Alert 
              severity="info" 
              sx={{ mt: 2 }}
              action={
                <IconButton size="small" onClick={() => setReplyToComment(null)}>
                  <CloseIcon />
                </IconButton>
              }
            >
              Replying to comment
            </Alert>
          )}
        </Paper>

        {/* Comments List */}
        <Stack spacing={2}>
          {organizedComments.map((comment) => (
            <Card key={comment.id} variant="outlined">
              <CardContent>
                <Stack direction="row" alignItems="flex-start" spacing={2}>
                  <Avatar sx={{ width: 40, height: 40 }}>
                    {comment.authorName.charAt(0)}
                  </Avatar>
                  
                  <Box sx={{ flexGrow: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                      <Typography variant="subtitle2">
                        {comment.authorName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {comment.authorRole}
                      </Typography>
                      <Chip
                        label={comment.type}
                        color={getCommentTypeColor(comment.type) as any}
                        size="small"
                        variant="outlined"
                      />
                      <Typography variant="caption" color="text.secondary">
                        {new Date(comment.createdAt).toLocaleString()}
                      </Typography>
                    </Stack>
                    
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {comment.content}
                    </Typography>
                    
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <IconButton size="small" onClick={() => handleReaction(comment.id, 'like')}>
                        <ThumbUpIcon fontSize="small" />
                      </IconButton>
                      <Typography variant="caption">
                        {comment.reactions.filter(r => r.type === 'like').length}
                      </Typography>
                      
                      <IconButton size="small" onClick={() => handleReaction(comment.id, 'disagree')}>
                        <ThumbDownIcon fontSize="small" />
                      </IconButton>
                      <Typography variant="caption">
                        {comment.reactions.filter(r => r.type === 'disagree').length}
                      </Typography>
                      
                      <Button
                        size="small"
                        startIcon={<ReplyIcon />}
                        onClick={() => setReplyToComment(comment.id)}
                      >
                        Reply
                      </Button>
                    </Stack>
                    
                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <Box sx={{ ml: 2, mt: 2, borderLeft: 2, borderColor: 'divider', pl: 2 }}>
                        <Stack spacing={2}>
                          {comment.replies.map((reply) => (
                            <Box key={reply.id}>
                              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                                <Avatar sx={{ width: 24, height: 24 }}>
                                  {reply.authorName.charAt(0)}
                                </Avatar>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {reply.authorName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(reply.createdAt).toLocaleString()}
                                </Typography>
                              </Stack>
                              <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                                {reply.content}
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>

        {comments.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No comments yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Be the first to add a comment to this workflow
            </Typography>
          </Box>
        )}
      </TabPanel>

      {/* History */}
      <TabPanel value={activeTab} index={2}>
        <Stack spacing={2}>
          {history.map((entry) => {
            const color = entry.action === 'approve' ? 'success.main'
              : entry.action === 'reject' ? 'error.main'
              : 'primary.main';

            return (
              <Box key={entry.id} display="flex" alignItems="flex-start">
                <Box mr={2} minWidth={200} textAlign="right">
                  <Typography variant="body2" color="text.secondary">
                    {new Date(entry.timestamp).toLocaleString()}
                  </Typography>
                </Box>
                <Box mr={2} mt={0.5}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
                </Box>
                <Box>
                  <Typography variant="h6" component="span">
                    {entry.action.charAt(0).toUpperCase() + entry.action.slice(1)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    by {entry.actionByName}
                  </Typography>
                  {entry.reason && (
                    <Typography variant="body2">{entry.reason}</Typography>
                  )}
                  {entry.stageName && (
                    <Typography variant="caption" color="text.secondary">
                      Stage: {entry.stageName}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}
        </Stack>
      </TabPanel>

      {/* Decision Dialog */}
      <Dialog open={showDecisionDialog} onClose={() => setShowDecisionDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Submit Decision: {decisionType.charAt(0).toUpperCase() + decisionType.slice(1)}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Comments"
              multiline
              rows={4}
              value={decisionComments}
              onChange={(e) => setDecisionComments(e.target.value)}
              placeholder="Please provide comments for your decision..."
              required
              fullWidth
            />
            
            <TextField
              label="Reasoning (Optional)"
              multiline
              rows={3}
              value={decisionReasoning}
              onChange={(e) => setDecisionReasoning(e.target.value)}
              placeholder="Additional reasoning or conditions..."
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDecisionDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSubmitDecision}
            variant="contained"
            disabled={!decisionComments.trim() || submittingDecision}
            color={decisionType === 'approve' ? 'success' : 'error'}
          >
            {submittingDecision ? 'Submitting...' : `Submit ${decisionType}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification */}
      <Snackbar
        open={Boolean(notification)}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
        message={notification?.message}
      />
    </Box>
  );
};

export default ApprovalWorkflowViewer;
