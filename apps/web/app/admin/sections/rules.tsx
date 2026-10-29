import type { RuleState } from "@smart-rounding/contracts";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { priorityLabels, priorityTone } from "@/lib/status";
import { KeywordToggle, Panel, PanelHeading } from "./ui";

/**
 * Rule management: the V1 rule catalogue with each rule's condition and the
 * priority a match contributes. Clinical rules can be switched off; the
 * regulatory compliance rules cannot. New rule types are out of scope for V1.
 */
export function RulesSection({
  rules,
  onToggle,
}: Readonly<{
  rules: readonly RuleState[];
  onToggle: (rule: RuleState) => void;
}>) {
  return (
    <Panel>
      <PanelHeading
        title="Rule management"
        description="Switch clinical rules on or off. Regulatory visit rules always apply. Thresholds are edited on the Thresholds page."
      />
      <Table className="mt-4">
        <TableHeader>
          <TableRow className="border-0">
            <TableHead>Rule name</TableHead>
            <TableHead>Condition</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => (
            <TableRow key={rule.id}>
              <TableCell className="min-w-[200px]">
                <strong>{rule.name}</strong>
                <span className="mt-0.5 block text-[0.78rem] text-muted-foreground">
                  {rule.category}
                </span>
              </TableCell>
              <TableCell className="min-w-[260px] text-[0.88rem]">
                {rule.condition}
              </TableCell>
              <TableCell>
                <Badge tone={priorityTone(rule.priority)} dot>
                  {priorityLabels[rule.priority]}
                </Badge>
              </TableCell>
              <TableCell className="min-w-[150px]">
                {rule.locked ? (
                  <span className="text-[0.82rem] font-semibold text-muted-foreground">
                    Always active (regulatory)
                  </span>
                ) : (
                  <span className="flex items-center gap-2.5">
                    <KeywordToggle
                      active={rule.active}
                      label={rule.name}
                      onToggle={() => onToggle(rule)}
                    />
                    <span className="text-[0.82rem]">
                      {rule.active ? "Active" : "Inactive"}
                    </span>
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Panel>
  );
}
