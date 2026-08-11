import type { Customer } from "../api";
import { Button } from "@/components/ui/button";

interface Props {
  customer: Customer | null;
  authLoading: boolean;
  onNavigate: (target: "search" | "guided" | "myBookings") => void;
  onLogin: () => void;
  onLogout: () => void;
}

export function Nav({
  customer,
  authLoading,
  onNavigate,
  onLogin,
  onLogout,
}: Props) {
  return (
    <nav className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onNavigate("search")}
        >
          Search availability
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onNavigate("guided")}
        >
          Start booking
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onNavigate("myBookings")}
        >
          My bookings
        </Button>
      </div>

      {authLoading ? (
        <span className="text-sm text-muted-foreground">
          Checking session...
        </span>
      ) : customer ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Signed in as {customer.name}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={onLogout}>
            Log out
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={onLogin}>
          Log in
        </Button>
      )}
    </nav>
  );
}
