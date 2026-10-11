import { Link } from "@tanstack/react-router";
import { Logo } from "./brand";
import { SearchBar } from "./SearchBar";

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 md:px-6">
        <Logo />
        <SearchBar />
        <nav className="flex shrink-0 items-center gap-1 text-sm">
          <Link to="/plan" className="rounded-full px-4 py-2.5 hover:bg-paper-deep" activeProps={{ className: "bg-paper-deep font-medium" }}>
            Planner
          </Link>
          <Link to="/meals" className="rounded-full px-4 py-2.5 hover:bg-paper-deep" activeProps={{ className: "bg-paper-deep font-medium" }}>
            Meals
          </Link>
          <Link to="/snap" className="rounded-full px-4 py-2.5 hover:bg-paper-deep" activeProps={{ className: "bg-paper-deep font-medium" }}>
            Food stamps
          </Link>
          <Link to="/report" className="rounded-full px-4 py-2.5 hover:bg-paper-deep" activeProps={{ className: "bg-paper-deep font-medium" }}>
            Report
          </Link>
          <Link to="/sources" className="rounded-full px-4 py-2.5 hover:bg-paper-deep" activeProps={{ className: "bg-paper-deep font-medium" }}>
            Sources
          </Link>
          {children}
        </nav>
      </div>
    </header>
  );
}
