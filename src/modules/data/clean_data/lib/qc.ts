import type {
  FileRegistry,
  Lineage,
  PipelineState,
  QcIssue,
  Severity,
  StepName,
} from '../interface/clean-data.types';

export interface IssueInput {
  rule: string;
  message: string;
  severity?: Severity;
  lineage?: Lineage;
  sheet?: string;
  row_no?: number;
  column_name?: string;
  raw_value?: string | null;
  suggestion?: string;
  fatal?: boolean;
}

export const rowKey = (sheet: string, row: number) => `${sheet}#${row}`;

/**
 * Collects QC issues for one file within one step. Starts from the issues
 * of earlier steps so the list is cumulative
 */
export class QcCollector {
  readonly issues: QcIssue[];

  constructor(
    private readonly step: StepName,
    private readonly file: FileRegistry,
    previous: QcIssue[] = [],
  ) {
    this.issues = [...previous];
  }

  add(input: IssueInput): void {
    const issue: QcIssue = {
      step: this.step,
      severity: input.severity ?? 'error',
      rule: input.rule,
      message: input.message,
      source_file: this.file.file_name,
    };
    const sheet = input.lineage?.source_sheet ?? input.sheet;
    const row = input.lineage?.source_row ?? input.row_no;
    if (sheet !== undefined) issue.sheet = sheet;
    if (row !== undefined) issue.row_no = row;
    if (input.column_name !== undefined) issue.column_name = input.column_name;
    if (input.raw_value !== undefined) issue.raw_value = input.raw_value;
    if (input.suggestion !== undefined) issue.suggestion = input.suggestion;
    if (input.fatal) issue.fatal = true;
    this.issues.push(issue);
  }

  error(input: Omit<IssueInput, 'severity'>): void {
    this.add({ ...input, severity: 'error' });
  }

  warn(input: Omit<IssueInput, 'severity'>): void {
    this.add({ ...input, severity: 'warn' });
  }

  hasFatal(): boolean {
    return this.issues.some((i) => i.fatal);
  }

  state<T>(data: T): PipelineState<T> {
    return { step: this.step, file: this.file, issues: this.issues, data };
  }
}

export function issuesByRow(issues: QcIssue[]): Map<string, QcIssue[]> {
  const map = new Map<string, QcIssue[]>();
  for (const issue of issues) {
    if (issue.sheet === undefined || issue.row_no === undefined) continue;
    const key = rowKey(issue.sheet, issue.row_no);
    map.set(key, [...(map.get(key) ?? []), issue]);
  }
  return map;
}
