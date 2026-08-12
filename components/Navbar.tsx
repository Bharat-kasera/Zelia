"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookOpen, LogOut, Target, ScrollText, CalendarDays, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace("/");
  };

  if (!user) return null;

  const initials = user.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* Logo + App Name + Nav */}
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
              <BookOpen className="size-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Zelia
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              href="/dashboard"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted ${
                pathname === "/dashboard"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Subjects
            </Link>
            <Link
              href="/objectives"
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted ${
                pathname === "/objectives"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <Target className="size-3.5" />
              Objectives
            </Link>
            <Link
              href="/rules"
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted ${
                pathname === "/rules"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <ScrollText className="size-3.5" />
              Rules
            </Link>
            <Link
              href="/plan"
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted ${
                pathname === "/plan"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <CalendarDays className="size-3.5" />
              Plan
            </Link>
            <Link
              href="/tests"
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted ${
                pathname === "/tests"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <ClipboardCheck className="size-3.5" />
              Tests
            </Link>
          </nav>
        </div>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            id="user-menu-trigger"
            className="flex items-center gap-2.5 rounded-full p-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user.displayName}
            </span>
            <Avatar className="size-8 border border-border">
              <AvatarImage
                src={user.photoURL ?? undefined}
                alt={user.displayName ?? "User"}
              />
              <AvatarFallback className="text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium leading-none">
                  {user.displayName}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              id="sign-out-button"
              onClick={handleSignOut}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
