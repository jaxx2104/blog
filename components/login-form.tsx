"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GoogleIcon } from "@/components/ui/google-icon";
import { useGoogleAuth } from "@/hooks/use-google-auth";
import { AUTH_MESSAGES, UI_MESSAGES } from "@/lib/constants/messages";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const { signInWithGoogle, error, isLoading } = useGoogleAuth();

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{UI_MESSAGES.LOGIN}</CardTitle>
          <CardDescription>
            {UI_MESSAGES.LOGIN_DESCRIPTION}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              type="button"
              className="w-full"
              onClick={signInWithGoogle}
              disabled={isLoading}
            >
              <GoogleIcon className="mr-2 h-4 w-4" />
              {isLoading ? AUTH_MESSAGES.LOGGING_IN : AUTH_MESSAGES.LOGIN_WITH_GOOGLE}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
