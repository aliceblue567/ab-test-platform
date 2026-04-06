"use client";

import { createContext, useContext } from "react";

const WorkspaceBaseContext = createContext<string>("/admin");

export function WorkspaceBaseProvider({
  basePath,
  children,
}: {
  basePath: string;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceBaseContext.Provider value={basePath}>
      {children}
    </WorkspaceBaseContext.Provider>
  );
}

export function useWorkspaceBasePath() {
  return useContext(WorkspaceBaseContext);
}
