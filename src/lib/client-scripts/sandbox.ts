export type ScriptEvent = 'onLoad' | 'onFieldChange' | 'beforeSaveClientValidation';

export type ScriptOperator = 'equals' | 'not_equals' | 'in' | 'not_in' | 'is_set' | 'is_not_set';

export type ScriptActionType =
  | 'setValue'
  | 'setRequired'
  | 'setReadOnly'
  | 'setVisible'
  | 'showMessage'
  | 'validateRequired'
  | 'computeTemplateValue';

export interface ScriptAction {
  type: ScriptActionType;
  field?: string;
  value?: unknown;
  level?: 'info' | 'warning' | 'error';
  message?: string;
}

export interface ScriptRule {
  when?: {
    field?: string;
    operator?: ScriptOperator;
    value?: unknown;
  };
  actions: ScriptAction[];
}

export interface ClientScriptBody {
  rules: ScriptRule[];
}

export interface ScriptEvaluationContext {
  event: ScriptEvent;
  formValues: Record<string, unknown>;
  changedField?: string;
  doctypeKey: string;
  fieldMeta: Map<string, { fieldname: string; fieldtype: string; label: string; is_required: boolean; is_hidden: boolean; is_readonly: boolean }>;
}

export interface EvaluatedAction {
  type: ScriptActionType;
  field?: string;
  value?: unknown;
  level?: 'info' | 'warning' | 'error';
  message?: string;
}

export interface ScriptEvaluationResult {
  actions: EvaluatedAction[];
  validationErrors: Record<string, string>;
  messages: Array<{ level: string; message: string }>;
}

const UNSAFE_FIELDS = new Set(['docstatus', 'workflow_state', 'created_by', 'created_at', 'updated_at']);

function evaluateCondition(rule: ScriptRule, ctx: ScriptEvaluationContext): boolean {
  if (!rule.when) return true;

  const { field, operator = 'equals', value } = rule.when;
  const currentValue = field ? ctx.formValues[field] : undefined;

  switch (operator) {
    case 'equals':
      return currentValue === value;
    case 'not_equals':
      return currentValue !== value;
    case 'in':
      return Array.isArray(value) && value.includes(currentValue);
    case 'not_in':
      return Array.isArray(value) && !value.includes(currentValue);
    case 'is_set':
      return currentValue !== undefined && currentValue !== null && currentValue !== '';
    case 'is_not_set':
      return currentValue === undefined || currentValue === null || currentValue === '';
    default:
      return false;
  }
}

function validateAction(action: ScriptAction): string | null {
  const allowedTypes: ScriptActionType[] = [
    'setValue', 'setRequired', 'setReadOnly', 'setVisible',
    'showMessage', 'validateRequired', 'computeTemplateValue',
  ];
  if (!allowedTypes.includes(action.type)) {
    return `Unsupported action type: ${action.type}`;
  }
  if (action.field && UNSAFE_FIELDS.has(action.field)) {
    return `Cannot modify field: ${action.field}`;
  }
  return null;
}

function evaluateActions(actions: ScriptAction[]): EvaluatedAction[] {
  const result: EvaluatedAction[] = [];
  for (const action of actions) {
    const error = validateAction(action);
    if (error) {
      result.push({ type: 'showMessage', level: 'error', message: `Script error: ${error}` });
      continue;
    }
    result.push({ ...action });
  }
  return result;
}

export function evaluateScripts(
  scripts: { script_body: ClientScriptBody; event_name: ScriptEvent }[],
  ctx: ScriptEvaluationContext,
): ScriptEvaluationResult {
  const actions: EvaluatedAction[] = [];
  const validationErrors: Record<string, string> = {};
  const messages: Array<{ level: string; message: string }> = [];

  if (!scripts || scripts.length === 0) {
    return { actions, validationErrors, messages };
  }

  for (const script of scripts) {
    if (script.event_name !== ctx.event) continue;

    const body = script.script_body;
    if (!body || !Array.isArray(body.rules)) continue;

    for (const rule of body.rules) {
      if (!rule.actions || rule.actions.length === 0) continue;

      if (ctx.event === 'onFieldChange' && rule.when?.field) {
        if (rule.when.field !== ctx.changedField) continue;
      }

      if (!evaluateCondition(rule, ctx)) continue;

      const evaluated = evaluateActions(rule.actions);

      for (const act of evaluated) {
        if (act.type === 'validateRequired' || act.type === 'setRequired') {
          if (act.value === true && act.field) {
            const fieldValue = ctx.formValues[act.field];
            if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
              const fieldLabel = ctx.fieldMeta.get(act.field)?.label ?? act.field;
              validationErrors[act.field] = `${fieldLabel} is required.`;
            }
          }
        }
        if (act.type === 'showMessage' && act.message) {
          messages.push({ level: act.level ?? 'info', message: act.message });
        }
      }

      actions.push(...evaluated);
    }
  }

  return { actions, validationErrors, messages };
}
