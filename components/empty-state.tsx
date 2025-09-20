import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  message?: string;
}

export function EmptyState({ message = "記事はまだありません" }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-center text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}