import React from "react";

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-4">404 - Not Found</h1>
        <p className="text-muted-foreground">The page you are looking for does not exist.</p>
      </div>
    </div>
  );
}
