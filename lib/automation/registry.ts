import type { TriggerDef, ConditionDef, ActionDef, Operator, ConfigField } from './types';

// ============================================================================
// TRIGGER REGISTRY
// ============================================================================

export const TRIGGER_REGISTRY: TriggerDef[] = [
  {
    key: 'new_visitor',
    label: 'New Visitor',
    description: 'Triggered when a new visitor is created',
    eventType: 'visitor.created',
    configFields: [],
  },
  {
    key: 'new_member',
    label: 'New Member',
    description: 'Triggered when a contact becomes a member',
    eventType: 'member.created',
    configFields: [],
  },
  {
    key: 'event_registration',
    label: 'Event Registration',
    description: 'Triggered when someone registers for an event',
    eventType: 'event.registration.created',
    configFields: [
      {
        key: 'event_id',
        label: 'Specific Event (optional)',
        type: 'text',
        required: false,
        placeholder: 'Any event',
      },
    ],
  },
  {
    key: 'attendance_event',
    label: 'Attendance Recorded',
    description: 'Triggered when an attendance record is created',
    eventType: 'attendance.recorded',
    configFields: [],
  },
  {
    key: 'birthday',
    label: 'Birthday',
    description: 'Triggered on a member\'s birthday (scheduled)',
    eventType: 'member.birthday',
    configFields: [],
  },
  {
    key: 'followup_overdue',
    label: 'Follow-Up Overdue',
    description: 'Triggered when a follow-up becomes overdue',
    eventType: 'followup.overdue',
    configFields: [],
  },
  {
    key: 'payment_successful',
    label: 'Payment Successful',
    description: 'Triggered when a giving transaction is marked successful',
    eventType: 'payment.successful',
    configFields: [
      {
        key: 'category_id',
        label: 'Giving Category (optional)',
        type: 'text',
        required: false,
        placeholder: 'Any category',
      },
    ],
  },
  {
    key: 'payment_failed',
    label: 'Payment Failed',
    description: 'Triggered when a giving transaction fails',
    eventType: 'payment.failed',
    configFields: [],
  },
  {
    key: 'tag_added',
    label: 'Tag Added',
    description: 'Triggered when a tag is added to a member or contact',
    eventType: 'tag.added',
    configFields: [
      {
        key: 'tag_id',
        label: 'Specific Tag (optional)',
        type: 'tag',
        required: false,
      },
    ],
  },
  {
    key: 'pipeline_stage_changed',
    label: 'Pipeline Stage Change',
    description: 'Triggered when a contact moves between pipeline stages',
    eventType: 'pipeline.stage.changed',
    configFields: [
      {
        key: 'from_stage_id',
        label: 'From Stage (optional)',
        type: 'pipeline_stage',
        required: false,
      },
      {
        key: 'to_stage_id',
        label: 'To Stage (optional)',
        type: 'pipeline_stage',
        required: false,
      },
    ],
  },
];

// ============================================================================
// CONDITION REGISTRY
// ============================================================================

const equalityOperators: Operator[] = ['equals', 'not_equals'];
const textOperators: Operator[] = ['equals', 'not_equals', 'contains', 'not_contains'];
const numericOperators: Operator[] = ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_than_equal', 'less_than_equal'];

export const CONDITION_REGISTRY: ConditionDef[] = [
  {
    key: 'membership_status',
    label: 'Membership Status',
    description: 'Check the member\'s current membership status',
    operators: equalityOperators,
    configFields: [
      {
        key: 'value',
        label: 'Status',
        type: 'membership_status',
        required: true,
      },
    ],
  },
  {
    key: 'tag',
    label: 'Tag',
    description: 'Check if the member/contact has a specific tag',
    operators: ['contains', 'not_contains'],
    configFields: [
      {
        key: 'tag_id',
        label: 'Tag',
        type: 'tag',
        required: true,
      },
    ],
  },
  {
    key: 'department',
    label: 'Department',
    description: 'Check if the member belongs to a department',
    operators: equalityOperators,
    configFields: [
      {
        key: 'department_id',
        label: 'Department',
        type: 'department',
        required: true,
      },
    ],
  },
  {
    key: 'group',
    label: 'Group',
    description: 'Check if the member belongs to a group',
    operators: equalityOperators,
    configFields: [
      {
        key: 'group_id',
        label: 'Group',
        type: 'group',
        required: true,
      },
    ],
  },
  {
    key: 'pipeline_stage',
    label: 'Pipeline Stage',
    description: 'Check the contact\'s current pipeline stage',
    operators: equalityOperators,
    configFields: [
      {
        key: 'stage_id',
        label: 'Stage',
        type: 'pipeline_stage',
        required: true,
      },
    ],
  },
  {
    key: 'attendance_percentage',
    label: 'Attendance Percentage',
    description: 'Check the member\'s attendance percentage',
    operators: numericOperators,
    configFields: [
      {
        key: 'value',
        label: 'Percentage',
        type: 'number',
        required: true,
        placeholder: 'e.g. 75',
      },
    ],
  },
  {
    key: 'payment_status',
    label: 'Payment Status',
    description: 'Check the payment transaction status',
    operators: equalityOperators,
    configFields: [
      {
        key: 'value',
        label: 'Status',
        type: 'select',
        required: true,
        options: [
          { value: 'pending', label: 'Pending' },
          { value: 'successful', label: 'Successful' },
          { value: 'verified', label: 'Verified' },
          { value: 'failed', label: 'Failed' },
          { value: 'refunded', label: 'Refunded' },
        ],
      },
    ],
  },
];

// ============================================================================
// ACTION REGISTRY
// ============================================================================

export const ACTION_REGISTRY: ActionDef[] = [
  {
    key: 'add_tag',
    label: 'Add Tag',
    description: 'Add a tag to the member or contact',
    configFields: [
      {
        key: 'tag_id',
        label: 'Tag',
        type: 'tag',
        required: true,
      },
    ],
  },
  {
    key: 'remove_tag',
    label: 'Remove Tag',
    description: 'Remove a tag from the member or contact',
    configFields: [
      {
        key: 'tag_id',
        label: 'Tag',
        type: 'tag',
        required: true,
      },
    ],
  },
  {
    key: 'create_tag',
    label: 'Create Tag',
    description: 'Create a new tag if it does not exist',
    configFields: [
      {
        key: 'tag_name',
        label: 'Tag Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. First Time Visitor',
      },
    ],
  },
  {
    key: 'assign_user',
    label: 'Assign User',
    description: 'Assign the contact or follow-up to a user',
    configFields: [
      {
        key: 'user_id',
        label: 'User',
        type: 'user',
        required: true,
      },
    ],
  },
  {
    key: 'move_pipeline_stage',
    label: 'Move Pipeline Stage',
    description: 'Move the contact to a pipeline stage',
    configFields: [
      {
        key: 'stage_id',
        label: 'Target Stage',
        type: 'pipeline_stage',
        required: true,
      },
    ],
  },
  {
    key: 'send_notification',
    label: 'Send Notification',
    description: 'Send an in-app notification',
    configFields: [
      {
        key: 'title',
        label: 'Title',
        type: 'text',
        required: true,
        placeholder: 'Notification title',
      },
      {
        key: 'body',
        label: 'Message',
        type: 'text',
        required: true,
        placeholder: 'Notification message',
      },
    ],
  },
  {
    key: 'send_email',
    label: 'Send Email',
    description: 'Send an email using a communication template',
    configFields: [
      {
        key: 'template_id',
        label: 'Template',
        type: 'template',
        required: true,
      },
    ],
  },
  {
    key: 'send_sms',
    label: 'Send SMS',
    description: 'Send an SMS using a communication template',
    configFields: [
      {
        key: 'template_id',
        label: 'Template',
        type: 'template',
        required: true,
      },
    ],
  },
  {
    key: 'create_followup',
    label: 'Create Follow-Up',
    description: 'Create a follow-up in the CRM system',
    configFields: [
      {
        key: 'type',
        label: 'Follow-Up Type',
        type: 'select',
        required: true,
        options: [
          { value: 'welcome_call', label: 'Welcome Call' },
          { value: 'first_time_visitor', label: 'First Time Visitor' },
          { value: 'second_visit', label: 'Second Visit' },
          { value: 'membership', label: 'Membership' },
          { value: 'pastoral', label: 'Pastoral' },
          { value: 'general', label: 'General' },
        ],
      },
      {
        key: 'priority',
        label: 'Priority',
        type: 'select',
        required: true,
        options: [
          { value: 'low', label: 'Low' },
          { value: 'normal', label: 'Normal' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
          { value: 'urgent', label: 'Urgent' },
        ],
      },
      {
        key: 'assigned_to',
        label: 'Assign To (optional)',
        type: 'user',
        required: false,
      },
    ],
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getTriggerDef(key: string): TriggerDef | undefined {
  return TRIGGER_REGISTRY.find((t) => t.key === key);
}

export function getConditionDef(key: string): ConditionDef | undefined {
  return CONDITION_REGISTRY.find((c) => c.key === key);
}

export function getActionDef(key: string): ActionDef | undefined {
  return ACTION_REGISTRY.find((a) => a.key === key);
}

export function getTriggerByEventType(eventType: string): TriggerDef | undefined {
  return TRIGGER_REGISTRY.find((t) => t.eventType === eventType);
}
