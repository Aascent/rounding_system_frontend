import type { KeywordEntry } from "@smart-rounding/contracts";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddButton, Panel, PanelHeading } from "./ui";

export function KeywordsSection({
  keywords,
  onAddKeyword,
  onToggle,
}: Readonly<{
  keywords: KeywordEntry[];
  onAddKeyword: () => void;
  onToggle: (id: string) => void;
}>) {
  return (
    <Panel>
      <PanelHeading
        title="Keyword library"
        description="Illustrative entries only. The approved clinical catalog is pending."
        action={<AddButton label="Add keyword" onClick={onAddKeyword} />}
      />
      <Table className="mt-4">
        <TableHeader>
          <TableRow className="border-0">
            <TableHead>Keyword</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Matches</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {keywords.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <strong>{item.keyword}</strong>
              </TableCell>
              <TableCell>{item.category}</TableCell>
              <TableCell>{item.matches}</TableCell>
              <TableCell>
                <Button
                  type="button"
                  size="sm"
                  variant={item.active ? "default" : "outline"}
                  onClick={() => onToggle(item.id)}
                >
                  {item.active ? "Active" : "Inactive"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Panel>
  );
}
